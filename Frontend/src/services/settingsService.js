import api from './api'

const BASE = '/api/settings'

export async function getSecuritySettings() {
    const res = await api.get(`${BASE}/security`)
    return res.data.data
}

export async function getTaxGstSettings() {
    const res = await api.get(`${BASE}/tax-gst`)
    return res.data.data
}

export async function updateTaxGstSettings(payload) {
    const res = await api.put(`${BASE}/tax-gst`, payload)
    return res.data.data
}

export async function verifySettingsPassword(password) {
    const res = await api.post(`${BASE}/verify-password`, { password })
    return res.data.data
}

export async function getPaymentSettings() {
    const res = await api.get(`${BASE}/payment`)
    return res.data.data
}

export async function updatePaymentSettings(payload) {
    const res = await api.put(`${BASE}/payment`, payload)
    return res.data.data
}

export async function getSystemSettings() {
    const res = await api.get(`${BASE}/system`)
    return res.data.data
}

export async function updateSystemSettings(payload) {
    const res = await api.put(`${BASE}/system`, payload)
    return res.data.data
}

export async function backupDatabase() {
    const res = await api.post(`${BASE}/system/backup`)
    return res.data.data
}

export async function restoreDatabase() {
    const res = await api.post(`${BASE}/system/restore`)
    return res.data.data
}

export async function clearCache() {
    const res = await api.post(`${BASE}/system/clear-cache`)
    return res.data.data
}

export async function getAuditLogs() {
    const res = await api.get(`${BASE}/audit`)
    return res.data.data ?? []
}

export async function logAuditEvent(event) {
    await api.post('/auth/internal/audit', event)
}
