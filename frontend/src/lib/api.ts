const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getToken() {
    return localStorage.getItem('token');
}

async function request(path: string, options: RequestInit = {}) {
    const token = getToken();
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

export const api = {
    // Auth
    signup: (email: string, password: string, role?: string) =>
        request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, role }) }),

    login: (email: string, password: string, role?: string) =>
        request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, role }) }),

    me: () => request('/auth/me'),

    // Transactions
    // File parsing (CSV or PDF)
    parseFile: async (file: File): Promise<{ type: string; headers?: string[]; data?: string[][]; rows?: object[] }> => {
        const token = getToken();
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(`${BASE}/transactions/parse-file`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: form,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'File parse failed');
        return data;
    },

    getTransactions: (params?: { source?: string; status?: string; batchId?: string | string[]; runId?: string }) => {
        const q = new URLSearchParams();
        if (params?.source) q.set('source', params.source);
        if (params?.status) q.set('status', params.status);
        if (params?.runId) q.set('runId', params.runId);
        if (params?.batchId) {
            if (Array.isArray(params.batchId)) {
                params.batchId.forEach(id => q.append('batchId', id));
            } else {
                q.set('batchId', params.batchId);
            }
        }
        return request(`/transactions?${q}`);
    },

    adjustTransaction: (id: string, payload: { 
        status: string; 
        classification: string; 
        adjustmentNotes?: string 
    }) => request(`/transactions/${id}/adjust`, { 
        method: 'PATCH', 
        body: JSON.stringify(payload) 
    }),

    getStats: () => request('/transactions/stats'),

    // Dashboards
    getAdminDashboardStats: () => request('/reports/dashboard'),
    getCustomerDashboardStats: () => request('/reports/customer-dashboard'),

    uploadTransactions: (payload: {
        fileName: string;
        source: string;
        transactions: object[];
        columnMapping: object;
    }) => request('/transactions/upload', { method: 'POST', body: JSON.stringify(payload) }),

    purgeData: () => request('/transactions/purge', { method: 'DELETE' }),

    // Reconciliation
    getRuns: () => request('/reconciliation/runs'),
    getRunSummary: (id: string) => request(`/reconciliation/runs/${id}/summary`),

    runReconciliation: (payload: {
        sourceA: string;
        sourceB: string;
        dateTolerance: number;
        amountTolerance: number;
    }) => request('/reconciliation/run', { method: 'POST', body: JSON.stringify(payload) }),

    // Matches
    getMatches: (params?: { runId?: string }) => {
        const q = new URLSearchParams();
        if (params?.runId) q.set('runId', params.runId);
        return request(`/matches?${q}`);
    },

    updateMatch: (id: string, action: 'approved' | 'rejected', notes?: string) =>
        request(`/matches/${id}`, { method: 'PATCH', body: JSON.stringify({ action, notes }) }),

    bulkApprove: () => request('/matches/bulk-approve', { method: 'POST' }),

    // Audit
    getAuditLogs: () => request('/audit'),

    // Settings
    getSettings: () => request('/settings'),

    saveSettings: (payload: {
        dateTolerance?: number;
        amountTolerance?: number;
        defaultCurrency?: string;
        displayName?: string;
    }) => request('/settings', { method: 'PUT', body: JSON.stringify(payload) }),

    // ERP & Advanced Accounting
    // Accounts
    getAccounts: () => request('/accounts'),
    createAccount: (payload: any) => request('/accounts', { method: 'POST', body: JSON.stringify(payload) }),

    // Journal
    getJournalEntries: () => request('/journal'),
    createJournalEntry: (payload: any) => request('/journal', { method: 'POST', body: JSON.stringify(payload) }),

    // Customers
    getCustomers: () => request('/customers'),
    createCustomer: (payload: any) => request('/customers', { method: 'POST', body: JSON.stringify(payload) }),

    // Invoices
    getInvoices: () => request('/invoices'),
    getInvoiceByNumber: (num: string) => request(`/invoices/by-number/${num}`),
    sendInvoiceReminder: (id: string) => request(`/invoices/${id}/remind`, { method: 'POST' }),
    getCustomerInvoices: () => request('/invoices/customer'),
    createInvoice: (payload: any) => request('/invoices', { method: 'POST', body: JSON.stringify(payload) }),

    // Payments
    createCheckoutSession: (invoiceId: string) => request('/payments/create-checkout-session', { method: 'POST', body: JSON.stringify({ invoiceId }) }),
    verifyPayment: (sessionId: string, invoiceId: string) => request('/payments/verify', { method: 'POST', body: JSON.stringify({ sessionId, invoiceId }) }),
};
