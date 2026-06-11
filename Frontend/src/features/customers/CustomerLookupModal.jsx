import { useState, useEffect } from 'react'
import { X, Search, User, Clock } from 'lucide-react'
import * as customerService from '../../services/customerService'
import useDebounce from '../../hooks/useDebounce'

export default function CustomerLookupModal({ onSelect, onClose }) {
    const [q, setQ] = useState('')
    const debouncedQ = useDebounce(q, 300)
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchCustomers = async () => {
            setLoading(true)
            try {
                const data = await customerService.searchCustomers(debouncedQ)
                setResults(data)
                setError(null)
            } catch (err) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchCustomers()
    }, [debouncedQ])

    const tierColor = { Platinum: 'badge-primary', Gold: 'badge-warning', Silver: 'badge-gray', Bronze: 'badge-danger' }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold dark:text-white">Select Customer</h2>
                    <button className="btn-ghost p-2" onClick={onClose}><X className="w-5 h-5" /></button>
                </div>

                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        className="input pl-9"
                        placeholder="Search by name, phone, email…"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        autoFocus
                    />
                </div>

                {loading && <div className="text-center py-8 text-gray-400">Searching…</div>}
                {error && <div className="text-center py-8 text-red-500">{error}</div>}

                {!loading && !error && (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                        {results.length > 0 ? results.map(c => (
                            <button
                                key={c.id}
                                className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-200 dark:hover:border-primary-700 transition-all text-left"
                                onClick={() => onSelect(c)}
                            >
                                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                                    {c.name[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm dark:text-white">{c.name}</div>
                                    <div className="text-xs text-gray-400">{c.phone}</div>
                                </div>
                                <div className="text-right">
                                    <span className={`badge ${tierColor[c.tier] || 'badge-gray'}`}>{c.tier}</span>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.loyaltyPoints} pts</div>
                                </div>
                            </button>
                        )) : (
                            <div className="text-center py-8 text-gray-400">
                                <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                No customer found
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}