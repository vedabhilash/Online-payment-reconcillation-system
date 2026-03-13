import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Upload as UploadIcon, FileSpreadsheet, FileText, Check, ArrowRight, Loader2, Eye, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Source = "bank_statement" | "invoice" | "payment_gateway" | "order";

const sourceLabels: Record<Source, string> = {
  bank_statement: "Bank Statement",
  invoice: "Invoice",
  payment_gateway: "Payment Gateway",
  order: "Order Records",
};

const REQUIRED_FIELDS = ["amount", "date"] as const;
const OPTIONAL_FIELDS = ["reference_id", "description", "currency"] as const;

type ParsedRow = {
  amount: number;
  transaction_date: string;
  reference_id?: string | null;
  description?: string | null;
  currency?: string;
};

export default function UploadPage() {
  const { user } = useAuth();
  const [source, setSource] = useState<Source>("bank_statement");
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState<"csv" | "pdf" | null>(null);

  // CSV state
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string[][] | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // PDF state
  const [pdfRows, setPdfRows] = useState<ParsedRow[]>([]);

  const [step, setStep] = useState<"upload" | "map" | "preview" | "done">("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const reset = () => {
    setFileName(""); setFileType(null);
    setCsvHeaders([]); setCsvData(null); setMapping({});
    setPdfRows([]);
    setStep("upload");
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isCSV = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";

    if (!isPDF && !isCSV) {
      toast({ title: "Unsupported file", description: "Please upload a CSV or PDF file.", variant: "destructive" });
      return;
    }

    setFileName(file.name);
    setFileType(isPDF ? "pdf" : "csv");
    setIsParsing(true);

    try {
      const result = await api.parseFile(file);

      if (result.type === "pdf") {
        const rows = (result.rows as ParsedRow[]) || [];
        if (rows.length === 0) {
          toast({ title: "No rows detected", description: "Could not extract transaction rows from this PDF.", variant: "destructive" });
          reset();
          return;
        }
        setPdfRows(rows);
        setStep("preview");
      } else {
        // CSV
        if (!result.headers || !result.data || result.data.length === 0) {
          toast({ title: "Invalid CSV", description: "File must have a header row and at least one data row.", variant: "destructive" });
          reset();
          return;
        }
        setCsvHeaders(result.headers);
        setCsvData(result.data);
        setStep("map");
      }
    } catch (err: unknown) {
      toast({ title: "Parse failed", description: (err as Error).message, variant: "destructive" });
      reset();
    } finally {
      setIsParsing(false);
    }
  }, []);

  // Build final transactions array from CSV mapping
  const buildCsvTransactions = (): ParsedRow[] => {
    if (!csvData) return [];
    const amountIdx = csvHeaders.indexOf(mapping["amount"]);
    const dateIdx = csvHeaders.indexOf(mapping["date"]);
    const refIdx = mapping["reference_id"] ? csvHeaders.indexOf(mapping["reference_id"]) : -1;
    const descIdx = mapping["description"] ? csvHeaders.indexOf(mapping["description"]) : -1;
    const curIdx = mapping["currency"] ? csvHeaders.indexOf(mapping["currency"]) : -1;

    return csvData.map((row) => ({
      amount: parseFloat(row[amountIdx]?.replace(/[^0-9.-]/g, "")) || 0,
      transaction_date: row[dateIdx],
      reference_id: refIdx >= 0 ? row[refIdx] : null,
      description: descIdx >= 0 ? row[descIdx] : null,
      currency: curIdx >= 0 ? row[curIdx] : "USD",
    }));
  };

  const handleCSVPreview = () => {
    const amountCol = mapping["amount"];
    const dateCol = mapping["date"];
    if (!amountCol || !dateCol) {
      toast({ title: "Missing mapping", description: "Amount and Date columns are required.", variant: "destructive" });
      return;
    }
    setStep("preview");
  };

  const handleImport = async () => {
    if (!user) return;
    setIsProcessing(true);

    const transactions = fileType === "pdf" ? pdfRows : buildCsvTransactions();

    try {
      await api.uploadTransactions({ fileName, source, transactions, columnMapping: mapping });
      toast({ title: "Import successful", description: `${transactions.length} transactions imported.` });
      setStep("done");
    } catch (err: unknown) {
      toast({ title: "Import failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurge = async () => {
    if (!window.confirm("This will permanently delete ALL imported transactions and reconciliation history. Continue?")) return;
    try {
      await api.purgeData();
      toast({ title: "System reset", description: "All data has been cleared." });
      reset();
    } catch (err: unknown) {
      toast({ title: "Clear failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  const previewRows = fileType === "pdf" ? pdfRows : buildCsvTransactions();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Upload Data</h1>
          <p className="text-sm text-muted-foreground">Import CSV or PDF files for reconciliation</p>
        </div>
        <Button variant="outline" size="sm" onClick={handlePurge} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="mr-2 h-4 w-4" /> Clear All Data
        </Button>
      </div>

      {/* ── Step 1: File Select ── */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Source & File</CardTitle>
            <CardDescription>Choose the data type and upload a CSV or PDF file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Data Source</Label>
              <Select value={source} onValueChange={(v) => setSource(v as Source)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(sourceLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-10 transition-colors hover:border-primary/50 hover:bg-muted/50 ${isParsing ? "opacity-50 pointer-events-none" : ""}`}>
              {isParsing ? (
                <>
                  <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm font-medium">Parsing file…</span>
                </>
              ) : (
                <>
                  <div className="mb-3 flex gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                    <UploadIcon className="h-8 w-8 text-muted-foreground" />
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium">Click to upload CSV or PDF</span>
                  <span className="mt-1 text-xs text-muted-foreground">Supported formats: .csv · .pdf (up to 20 MB)</span>
                </>
              )}
              <input type="file" accept=".csv,.pdf,application/pdf,text/csv" className="hidden" onChange={handleFileSelect} disabled={isParsing} />
            </label>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: CSV Column Mapping ── */}
      {step === "map" && fileType === "csv" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              Map CSV Columns — <span className="font-normal text-muted-foreground">{fileName}</span>
            </CardTitle>
            <CardDescription>Map your CSV columns to the required transaction fields</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {REQUIRED_FIELDS.map((field) => (
              <div key={field} className="space-y-1">
                <Label className="capitalize">{field} <span className="text-destructive">*</span></Label>
                <Select value={mapping[field] || ""} onValueChange={(v) => setMapping((m) => ({ ...m, [field]: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                  <SelectContent>{csvHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
            {OPTIONAL_FIELDS.map((field) => (
              <div key={field} className="space-y-1">
                <Label className="capitalize text-muted-foreground">{field.replace("_", " ")}</Label>
                <Select value={mapping[field] || ""} onValueChange={(v) => setMapping((m) => ({ ...m, [field]: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select column (optional)" /></SelectTrigger>
                  <SelectContent>{csvHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">{csvData?.length} rows detected in file</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset} className="flex-1">Back</Button>
              <Button onClick={handleCSVPreview} className="flex-1">
                <Eye className="mr-2 h-4 w-4" /> Preview Data <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Preview (both CSV & PDF) ── */}
      {step === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {fileType === "pdf" ? <FileText className="h-4 w-4 text-red-500" /> : <FileSpreadsheet className="h-4 w-4 text-primary" />}
              Preview — <span className="font-normal text-muted-foreground">{fileName}</span>
              <Badge variant="outline" className="ml-auto">{previewRows.length} rows</Badge>
            </CardTitle>
            <CardDescription>
              {fileType === "pdf"
                ? "Transactions automatically extracted from your PDF. Review before importing."
                : "Verify the parsed transactions before importing."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-80 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.slice(0, 50).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm whitespace-nowrap">{row.transaction_date}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{Number(row.amount).toFixed(2)}</TableCell>
                      <TableCell className="text-sm">{row.currency || "USD"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.reference_id || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{row.description || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {previewRows.length > 50 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-2">
                        … and {previewRows.length - 50} more rows
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => fileType === "pdf" ? reset() : setStep("map")} className="flex-1">
                Back
              </Button>
              <Button onClick={handleImport} disabled={isProcessing} className="flex-1">
                {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing…</> : <><Check className="mr-2 h-4 w-4" /> Import {previewRows.length} Transactions</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Done ── */}
      {step === "done" && (
        <Card>
          <CardContent className="flex flex-col items-center py-14">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h2 className="font-display text-xl font-semibold">Import Complete</h2>
            <p className="mb-6 mt-1 text-sm text-muted-foreground">
              {(fileType === "pdf" ? pdfRows : csvData)?.length} transactions imported from <span className="font-medium">{fileName}</span>.
            </p>
            <Button onClick={reset}>Upload Another File</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
