import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:8080'

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

api.interceptors.request.use((config) => {
    const stored = localStorage.getItem('auth')
    if (stored) {
        try {
            const parsed = JSON.parse(stored)
            if (parsed.accessToken) {
                config.headers.Authorization = `Bearer ${parsed.accessToken}`
            }
        } catch (e) {
            console.error('Error parsing auth token from localStorage', e)
        }
    }
    return config
}, (error) => Promise.reject(error))

api.interceptors.response.use((response) => response, (error) => {
    const status = error?.response?.status
    const message = error?.response?.data?.message || error?.message || 'Request failed'

    if (status >= 500) {
        console.error('[API] Server error', { status, message, url: error?.config?.url })
    } else if (status >= 400) {
        console.warn('[API] Client error', { status, message, url: error?.config?.url })
    }

    error.userMessage = message

    if (status === 401) {
        console.warn('Session expired or unauthorized. Redirecting to login.')
        localStorage.removeItem('auth')
        if (window.location.pathname !== '/login') {
            window.location.replace('/login')
        }
    }

    return Promise.reject(error)
})

export default api