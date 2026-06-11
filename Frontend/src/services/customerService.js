import api from './api';

/** Fetch all customers (for customers page list) */
export async function getCustomers() {
    const res = await api.get('/api/customers');
    return res.data.data ?? [];
}

/** Add new customer */
export async function addCustomer(customer) {
    const res = await api.post('/api/customers', customer);
    return res.data.data;
}

/** Update customer */
export async function updateCustomer(id, customer) {
    const res = await api.put(`/api/customers/${id}`, customer);
    return res.data.data;
}

export async function deleteCustomer(id) {
    const res = await api.delete(`/api/customers/${id}`);
    return res.data;
}

/**
 * Get purchase history for a customer.
 * Calls the sales-service endpoint (not the customer-service).
 */
export async function getPurchaseHistory(customerId) {
    const res = await api.get(`/api/sales/customer/${encodeURIComponent(customerId)}`);
    return res.data.data ?? [];
}

/** Redeem loyalty points */
export async function redeemLoyaltyPoints(id, points) {
    const res = await api.post(`/api/customers/${id}/loyalty/redeem?points=${points}`);
    return res.data.data;
}

/**
 * Search customers by name or phone.
 * Empty query → returns top 10 most recent customers (handled by backend).
 */
export async function searchCustomers(query) {
    const res = await api.get(`/api/customers/search?name=${encodeURIComponent(query || '')}`);
    return res.data.data ?? [];
}

/** Find customer by exact phone number */
export async function getCustomerByPhone(phone) {
    const res = await api.get(`/api/customers/phone/${encodeURIComponent(phone)}`);
    return res.data.data;
}
