import api from './api'

const BASE = '/api/reports'

export async function getXRead(date) {
    const query = date ? `?date=${encodeURIComponent(date)}` : ''
    const res = await api.get(`${BASE}/x-read${query}`)
    return res.data.data
}

export async function getZRead(date) {
    const query = date ? `?date=${encodeURIComponent(date)}` : ''
    const res = await api.get(`${BASE}/z-read${query}`)
    return res.data.data
}

export async function getProductsReport(limit = 10, date) {
    const params = new URLSearchParams()
    if (limit) params.set('limit', String(limit))
    if (date) params.set('date', date)
    const suffix = params.toString() ? `?${params.toString()}` : ''
    const res = await api.get(`${BASE}/products${suffix}`)
    return res.data.data ?? []
}

export async function getDashboardMetrics(days = 30) {
    const res = await api.get(`${BASE}/dashboard?days=${days}`)
    return res.data.data
}

export async function getSalesTrend(days = 30) {
    const res = await api.get(`${BASE}/sales-trend?days=${days}`)
    return res.data.data ?? []
}

export async function getTopProducts(limit = 10) {
    const res = await api.get(`${BASE}/top-products?limit=${limit}`)
    return res.data.data ?? []
}

export async function getPaymentBreakdown(days = 30) {
    const res = await api.get(`${BASE}/payment-breakdown?days=${days}`)
    return res.data.data ?? []
}

export async function getHourlyBreakdown(date) {
    const query = date ? `?date=${encodeURIComponent(date)}` : ''
    const res = await api.get(`${BASE}/hourly${query}`)
    return res.data.data ?? []
}

export async function exportReport(type, params) {
    let url = `${BASE}/export/${type}`
    const query = new URLSearchParams(params).toString()
    if (query) url += `?${query}`

    const res = await api.get(url, { responseType: 'blob' })
    return res.data
}