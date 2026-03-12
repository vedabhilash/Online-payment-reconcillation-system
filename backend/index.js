require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({ 
    origin: true, // Allow all origins during setup/debug
    credentials: true 
}));

// Webhooks MUST come before body-parser because Stripe requires raw body
app.use('/api/webhooks', require('./routes/webhooks'));

app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/reconciliation', require('./routes/reconciliation'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/reports', require('./routes/reports'));

// Advanced Accounting ERP Routes
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/journal', require('./routes/journal'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/payments', require('./routes/payments'));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Serve sample PDFs and CSVs for download
app.use('/samples', express.static(path.join(__dirname, 'sample-data')));
app.get('/api/samples', (_, res) => {
    const dir = path.join(__dirname, 'sample-data');
    const files = require('fs').readdirSync(dir).map(f => ({ name: f, url: `/samples/${f}` }));
    res.json(files);
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB connected');
        app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });
