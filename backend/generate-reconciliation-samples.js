const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'sample-data');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// 10 Common transactions (Matches)
const common = [
    { date: '2026-03-01', amount: 120.50, ref: 'MCH-001', desc: 'Customer Payment - INV-1001' },
    { date: '2026-03-02', amount: 450.00, ref: 'MCH-002', desc: 'SaaS Subscription - Monthly' },
    { date: '2026-03-05', amount: 89.99,  ref: 'MCH-003', desc: 'Add-on Purchase' },
    { date: '2026-03-07', amount: 1500.00,ref: 'MCH-004', desc: 'Enterprise License - Q1' },
    { date: '2026-03-10', amount: 325.40, ref: 'MCH-005', desc: 'Consulting Session' },
    { date: '2026-03-12', amount: 12.00,  ref: 'MCH-006', desc: 'Support Fee' },
    { date: '2026-03-15', amount: 2100.00,ref: 'MCH-007', desc: 'Bulk Order #5542' },
    { date: '2026-03-18', amount: 75.00,  ref: 'MCH-008', desc: 'Late Payment Fee' },
    { date: '2026-03-20', amount: 640.00, ref: 'MCH-009', desc: 'Project Beta Milestone' },
    { date: '2026-03-22', amount: 110.00, ref: 'MCH-010', desc: 'Hardware Upgrade' },
];

// 5 Bank Only (Unmatched in Bank)
const bankOnly = [
    { date: '2026-03-03', amount: 55.00,  ref: 'BNK-UN1', desc: 'Direct Deposit - Unrecognized' },
    { date: '2026-03-08', amount: 1200.00,ref: 'BNK-UN2', desc: 'Anonymous Transfer' },
    { date: '2026-03-14', amount: 42.50,  ref: 'BNK-UN3', desc: 'Interest Earned' },
    { date: '2026-03-19', amount: 980.00, ref: 'BNK-UN4', desc: 'Unknown Bank Credit' },
    { date: '2026-03-25', amount: 5.00,   ref: 'BNK-UN5', desc: 'Rounding Adjustment' },
];

// 5 Gateway Only (Unmatched in Gateway)
const gatewayOnly = [
    { date: '2026-03-04', amount: 15.00,  ref: 'GW-UN1', desc: 'Card Verification - Refunded' },
    { date: '2026-03-09', amount: 250.00, ref: 'GW-UN2', desc: 'Gift Card Sale' },
    { date: '2026-03-16', amount: 18.25,  ref: 'GW-UN3', desc: 'Pre-auth - Expired' },
    { date: '2026-03-21', amount: 330.00, ref: 'GW-UN4', desc: 'Partial Refund - Reversal' },
    { date: '2026-03-26', amount: 1.00,   ref: 'GW-UN5', desc: 'Active Card Check' },
];

const bankTransactions = [...common, ...bankOnly].sort((a,b) => new Date(a.date) - new Date(b.date));
const gatewayTransactions = [...common, ...gatewayOnly].sort((a,b) => new Date(a.date) - new Date(b.date));

function fmt(n) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generatePDF(fileName, title, subtitle, meta, txns, type) {
    const filePath = path.join(outputDir, fileName);
    const doc = new PDFDocument({ margin: 40, size: 'A4', compress: false });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Color definitions
    const BLUE_DARK = '#1e3a5f';
    const BLUE_MED = '#2563eb';
    const GRAY_BG = '#f8fafc';
    const TEXT_DARK = '#1e293b';

    // Header
    doc.rect(0, 0, doc.page.width, 100).fill(BLUE_DARK);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(22).text(title, 50, 30);
    doc.fillColor('#93c5fd').font('Helvetica').fontSize(11).text(subtitle, 50, 60);
    
    doc.fillColor('#cbd5e1').font('Helvetica').fontSize(9);
    meta.forEach((line, i) => doc.text(line, doc.page.width - 250, 25 + i * 15, { width: 200, align: 'right' }));

    doc.y = 120;

    // Table Header
    const y = doc.y;
    doc.rect(40, y, doc.page.width - 80, 25).fill(BLUE_MED);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(10);
    
    if (type === 'bank') {
        doc.text('Date', 50, y + 8);
        doc.text('Reference', 140, y + 8);
        doc.text('Description', 240, y + 8);
        doc.text('Amount', 460, y + 8, { width: 80, align: 'right' });
    } else {
        doc.text('Date', 50, y + 8);
        doc.text('Transaction ID', 140, y + 8);
        doc.text('Description', 260, y + 8);
        doc.text('Gross Amount', 460, y + 8, { width: 80, align: 'right' });
    }

    doc.y = y + 25;

    // Table Rows
    txns.forEach((t, i) => {
        const rowY = doc.y;
        if (i % 2 === 0) {
            doc.rect(40, rowY, doc.page.width - 80, 22).fill(GRAY_BG);
        }
        doc.fillColor(TEXT_DARK).font('Helvetica').fontSize(9);
        
        doc.text(t.date, 50, rowY + 7);
        doc.text(t.ref, 140, rowY + 7);
        doc.text(t.desc, type === 'bank' ? 240 : 260, rowY + 7, { width: 200, truncate: true });
        doc.text(fmt(t.amount), 460, rowY + 7, { width: 80, align: 'right' });
        
        doc.y = rowY + 22;
    });

    // Footer
    const total = txns.reduce((s, t) => s + t.amount, 0);
    doc.moveDown();
    doc.rect(40, doc.y, doc.page.width - 80, 30).fill('#eff6ff');
    doc.fillColor(BLUE_DARK).font('Helvetica-Bold').fontSize(12);
    doc.text('TOTAL VOLUME', 50, doc.y + 10);
    doc.text(fmt(total), 440, doc.y - 12, { width: 100, align: 'right' });

    doc.end();
    return new Promise((resolve) => stream.on('finish', () => {
        console.log(`✅ Created: ${fileName}`);
        resolve();
    }));
}

async function run() {
    await generatePDF(
        'reconcile_bank_15.pdf',
        'Global Bank Corp',
        'Monthly Business Statement',
        ['Account: 99228811', 'Period: March 2026', 'Currency: USD'],
        bankTransactions,
        'bank'
    );

    await generatePDF(
        'reconcile_gateway_15.pdf',
        'Stripe Payments',
        'Settlement Report',
        ['Merchant: ReconPay', 'Report ID: SET-2026-03', 'Currency: USD'],
        gatewayTransactions,
        'gateway'
    );
}

run();
