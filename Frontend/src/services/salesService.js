import api from './api';

const BASE = '/api/sales';

export async function createSale(saleRequest) {
    const res = await api.post(BASE, saleRequest);
    return res.data.data;
}

export async function createRazorpayOrder(amount, method) {
    const res = await api.post(`${BASE}/payments/razorpay/order`, { amount, method });
    return res.data.data;
}

export async function verifyRazorpaySignature(payload) {
    const res = await api.post(`${BASE}/payments/razorpay/verify`, payload);
    return res.data.data;
}

export async function getTransaction(id) {
    const res = await api.get(`${BASE}/${id}`);
    return res.data.data;
}

export async function getTransactionByInvoiceNumber(invoiceNumber) {
    const res = await api.get(`${BASE}/invoice/${encodeURIComponent(invoiceNumber)}`);
    return res.data.data;
}

/**
 * Returns the 10 most recent COMPLETED transactions —
 * used to pre-populate the Refund Dashboard.
 */
export async function getRecentTransactions() {
    const res = await api.get(`${BASE}/recent`);
    return res.data.data ?? [];
}

/**
 * Returns all COMPLETED transactions for a given customer —
 * used by the Customer purchase history modal.
 */
export async function getCustomerTransactions(customerId) {
    const res = await api.get(`${BASE}/customer/${encodeURIComponent(customerId)}`);
    return res.data.data ?? [];
}

export async function refundTransaction(refundRequest) {
    const res = await api.post(`${BASE}/refund`, refundRequest);
    return res.data.data;
}

export async function createRefundRequest(refundRequest) {
    const res = await api.post(`${BASE}/refund-requests`, refundRequest);
    return res.data.data;
}

export async function getPendingRefundRequests() {
    const res = await api.get(`${BASE}/refund-requests/pending`);
    return res.data.data ?? [];
}

export async function approveRefundRequest(id, payload = {}) {
    const res = await api.post(`${BASE}/refund-requests/${encodeURIComponent(id)}/approve`, payload);
    return res.data.data;
}

export async function rejectRefundRequest(id, payload = {}) {
    const res = await api.post(`${BASE}/refund-requests/${encodeURIComponent(id)}/reject`, payload);
    return res.data.data;
}

export async function getDailySummary(date) {
    let url = `${BASE}/daily-summary`;
    if (date) url += `?date=${date}`;
    const res = await api.get(url);
    return res.data.data;
}

export async function getZReport(date) {
    let url = `${BASE}/z-report`;
    if (date) url += `?date=${date}`;
    const res = await api.get(url);
    return res.data.data;
}
