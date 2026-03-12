const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'sample-data');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const transactions = [
    { date: '2026-02-01', amount: 1500.00, ref: 'REF001', description: 'Payment from ACME Corp' },
    { date: '2026-02-03', amount: 2750.50, ref: 'REF002', description: 'Payment from Beta Ltd' },
    { date: '2026-02-05', amount: 980.00, ref: 'REF003', description: 'Payment from Gamma Inc' },
    { date: '2026-02-07', amount: 3200.75, ref: 'REF004', description: 'Payment from Delta LLC' },
    { date: '2026-02-10', amount: 450.00, ref: 'REF005', description: 'Subscription renewal Basic' },
    { date: '2026-02-11', amount: 1200.00, ref: 'REF006', description: 'Payment from Epsilon Co' },
    { date: '2026-02-13', amount: 8750.00, ref: 'REF007', description: 'Enterprise contract Q1' },
    { date: '2026-02-15', amount: 320.25, ref: 'REF008', description: 'Payment from Zeta Corp' },
    { date: '2026-02-17', amount: 670.00, ref: 'REF009', description: 'Payment from Eta Ltd' },
    { date: '2026-02-19', amount: 2100.00, ref: 'REF010', description: 'Monthly retainer ClientX' },
    { date: '2026-02-21', amount: 550.50, ref: 'REF011', description: 'Payment from Theta Inc' },
    { date: '2026-02-23', amount: 4300.00, ref: 'REF012', description: 'Project milestone Phase 2' },
    { date: '2026-02-25', amount: 890.00, ref: 'REF013', description: 'Payment from Iota LLC' },
    { date: '2026-02-26', amount: 1750.00, ref: 'REF014', description: 'Payment from Kappa Co' },
    { date: '2026-02-28', amount: 3600.00, ref: 'REF015', description: 'End of month settlement' },
];

const total = transactions.reduce((s, t) => s + t.amount, 0);

function fmt(n) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generatePDF(filePath, buildFn) {
    return new Promise((resolve, reject) => {
        // compress:false produces standard cross-reference tables that pdf-parse can read
        const doc = new PDFDocument({ margin: 0, size: 'A4', compress: false });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        buildFn(doc);
        doc.end();
        stream.on('finish', () => { console.log('✅ Created:', filePath); resolve(); });
        stream.on('error', reject);
    });
}

const BLUE_DARK = '#1e3a5f';
const BLUE_MED = '#2563eb';
const BLUE_LIGHT = '#eff6ff';
const GRAY_BG = '#f8fafc';
const GRAY_BORD = '#e2e8f0';
const TEXT_DARK = '#1e293b';
const TEXT_MID = '#475569';
const GREEN = '#16a34a';

function header(doc, title, subtitle, meta) {
    const W = doc.page.width;
    doc.rect(0, 0, W, 120).fill(BLUE_DARK);
    doc.rect(50, 30, 36, 36).fill(BLUE_MED);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(20).text(title[0], 56, 38);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(18).text(title, 96, 32);
    doc.fillColor('#93c5fd').font('Helvetica').fontSize(10).text(subtitle, 96, 56);
    doc.fillColor('#cbd5e1').font('Helvetica').fontSize(8);
    meta.forEach((line, i) => doc.text(line, W - 220, 28 + i * 14, { width: 180, align: 'right' }));
    doc.rect(0, 120, W, 3).fill(BLUE_MED);
    doc.y = 135;
}

function summaryCards(doc, cards) {
    const W = doc.page.width;
    const cardW = (W - 80) / cards.length;
    const y = doc.y;
    const h = 64;
    cards.forEach((c, i) => {
        const x = 40 + i * cardW;
        doc.rect(x, y, cardW - 10, h).fill(BLUE_LIGHT).stroke(GRAY_BORD);
        doc.rect(x, y, cardW - 10, 3).fill(BLUE_MED);
        doc.fillColor(TEXT_MID).font('Helvetica').fontSize(8).text(c.label, x + 10, y + 12, { width: cardW - 30 });
        doc.fillColor(BLUE_DARK).font('Helvetica-Bold').fontSize(14).text(c.value, x + 10, y + 28, { width: cardW - 30 });
        if (c.sub) doc.fillColor(GREEN).font('Helvetica').fontSize(8).text(c.sub, x + 10, y + 48, { width: cardW - 30 });
    });
    doc.y = y + h + 20;
}

function sectionTitle(doc, text) {
    const y = doc.y;
    doc.rect(40, y, 4, 18).fill(BLUE_MED);
    doc.fillColor(BLUE_DARK).font('Helvetica-Bold').fontSize(12).text(text, 52, y + 2);
    doc.moveDown(0.5);
}

function tableHeader(doc, cols) {
    const W = doc.page.width;
    const y = doc.y;
    doc.rect(40, y, W - 80, 22).fill(BLUE_MED);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(8.5);
    cols.forEach(c => doc.text(c.label, c.x, y + 7, { width: c.w, align: c.align || 'left' }));
    doc.y = y + 22;
}

function tableRows(doc, rows, cols) {
    rows.forEach((row, i) => {
        const y = doc.y;
        const W = doc.page.width;
        doc.rect(40, y, W - 80, 20).fill(i % 2 === 0 ? GRAY_BG : 'white').stroke(GRAY_BORD);
        doc.fillColor(TEXT_DARK).font('Helvetica').fontSize(8.5);
        cols.forEach(c => doc.text(String(row[c.key] ?? ''), c.x, y + 6, { width: c.w, align: c.align || 'left' }));
        doc.y = y + 20;
    });
}

function totalRow(doc, cols, labelKey, amountKey, totalLabel, totalVal) {
    const W = doc.page.width;
    const y = doc.y;
    doc.rect(40, y, W - 80, 24).fill(BLUE_LIGHT).stroke(BLUE_MED);
    const labelCol = cols.find(c => c.key === labelKey);
    const amtCol = cols.find(c => c.key === amountKey);
    doc.fillColor(BLUE_DARK).font('Helvetica-Bold').fontSize(9.5);
    if (labelCol) doc.text(totalLabel, labelCol.x, y + 7, { width: labelCol.w });
    if (amtCol) doc.text(totalVal, amtCol.x, y + 7, { width: amtCol.w, align: 'right' });
    doc.y = y + 24;
}

function footer(doc) {
    const W = doc.page.width;
    const H = doc.page.height;
    doc.rect(0, H - 44, W, 44).fill(BLUE_DARK);
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(7.5)
        .text('CONFIDENTIAL - Generated for reconciliation testing. ReconPay 2026', 40, H - 30, { width: W - 80, align: 'center' });
}

// ─── Bank Statement ────────────────────────────────────────────
async function makeBankStatement() {
    await generatePDF(path.join(outputDir, 'bank_statement.pdf'), doc => {
        header(doc, 'First National Bank', 'Account Statement  |  February 2026', [
            'ReconPay Business Account',
            'Account No: **** **** 4821',
            'Sort Code: 12-34-56',
            'Statement: 01 Feb - 28 Feb 2026',
        ]);
        summaryCards(doc, [
            { label: 'Opening Balance', value: '$12,450.00' },
            { label: 'Total Credits', value: fmt(total), sub: `${transactions.length} transactions` },
            { label: 'Total Debits', value: '$0.00' },
            { label: 'Closing Balance', value: fmt(12450 + total) },
        ]);
        sectionTitle(doc, 'Transaction History');
        const cols = [
            { key: 'date', label: 'Date', x: 45, w: 76 },
            { key: 'ref', label: 'Reference', x: 126, w: 72 },
            { key: 'desc', label: 'Description', x: 203, w: 202 },
            { key: 'type', label: 'Type', x: 410, w: 58 },
            { key: 'amt', label: 'Amount (USD)', x: 473, w: 82, align: 'right' },
        ];
        tableHeader(doc, cols);
        tableRows(doc, transactions.map((t, i) => {
            const isFailed = i === 3 || i === 10; // 2 failed transactions
            return {
                date: t.date,
                ref: t.ref,
                desc: isFailed ? t.description + ' (Failed)' : t.description,
                type: isFailed ? 'FAILED' : 'CREDIT',
                amt: isFailed ? '$0.00' : fmt(t.amount)
            };
        }), cols);
        const actualTotal = transactions.reduce((sum, t, i) => sum + (i === 3 || i === 10 ? 0 : t.amount), 0);
        totalRow(doc, cols, 'desc', 'amt', 'TOTAL CREDITS', fmt(actualTotal));
        footer(doc);
    });
}

// ─── Payment Gateway ──────────────────────────────────────────
async function makePaymentGateway() {
    const txnIds = ['TXN-7A1B2C', 'TXN-8D3E4F', 'TXN-9G5H6I', 'TXN-0J7K8L', 'TXN-1M9N0O', 'TXN-2P1Q2R', 'TXN-3S3T4U', 'TXN-4V5W6X', 'TXN-5Y7Z8A', 'TXN-6B9C0D', 'TXN-7E1F2G', 'TXN-8H3I4J', 'TXN-9K5L6M', 'TXN-0N7O8P', 'TXN-1Q9R0S'];
    const merchants = ['ACME Corp Online Pay', 'Beta Ltd Card Charge', 'Gamma Inc Wallet', 'Delta LLC Card Pay', 'Subscription Basic Plan', 'Epsilon Co Web Pay', 'Enterprise Q1 Contract', 'Zeta Corp Card Charge', 'Eta Ltd Online Pay', 'ClientX Monthly Retainer', 'Theta Inc Wallet Pay', 'Phase 2 Milestone', 'Iota LLC Card Charge', 'Kappa Co Online Pay', 'Month-End Settlement'];

    await generatePDF(path.join(outputDir, 'payment_gateway.pdf'), doc => {
        header(doc, 'PayFlow Gateway', 'Settlement Report  |  February 2026', [
            'ReconPay Merchant Account',
            'Merchant ID: MER-88472-PF',
            'Gateway: PayFlow Pro v3',
            'Period: 01 Feb - 28 Feb 2026',
        ]);
        summaryCards(doc, [
            { label: 'Total Transactions', value: String(transactions.length) },
            { label: 'Gross Volume', value: fmt(total) },
            { label: 'Processing Fees', value: '$0.00' },
            { label: 'Net Settlement', value: fmt(total), sub: 'Fully settled' },
        ]);
        sectionTitle(doc, 'Transaction Log');
        const cols = [
            { key: 'date', label: 'Date', x: 45, w: 76 },
            { key: 'txnId', label: 'Transaction ID', x: 126, w: 96 },
            { key: 'merchant', label: 'Merchant / Desc', x: 227, w: 178 },
            { key: 'status', label: 'Status', x: 410, w: 58 },
            { key: 'amt', label: 'Amount (USD)', x: 473, w: 82, align: 'right' },
        ];
        tableHeader(doc, cols);
        tableRows(doc, transactions.map((t, i) => {
            const isFailed = i === 3 || i === 10; // 2 failed transactions
            return {
                date: t.date,
                txnId: txnIds[i],
                merchant: isFailed ? merchants[i] + ' - Failed' : merchants[i],
                status: isFailed ? 'FAILED' : 'SETTLED',
                amt: fmt(t.amount)
            };
        }), cols);
        totalRow(doc, cols, 'merchant', 'amt', 'NET SETTLEMENT TOTAL', fmt(total));
        footer(doc);
    });
}

(async () => {
    await makeBankStatement();
    await makePaymentGateway();
    // Verify pdfExtract can read both files
    const extractPDFText = require('./lib/pdfExtract');
    for (const name of ['bank_statement.pdf', 'payment_gateway.pdf']) {
        try {
            const buf = fs.readFileSync(path.join(outputDir, name));
            const { text } = await extractPDFText(buf);
            const lines = text.split('\n').filter(l => l.trim()).length;
            console.log(`✅ pdfExtract OK: ${name} — ${lines} text lines (including headers)`);
        } catch (e) {
            console.error(`❌ pdfExtract FAIL: ${name} — ${e.message}`);
        }
    }
})();
