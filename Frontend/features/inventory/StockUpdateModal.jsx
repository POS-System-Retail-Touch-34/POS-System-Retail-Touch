import { useState } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

const REASONS = ['Restock', 'Damaged/Expired', 'Manual Count', 'Return', 'Transfer']

export default function StockUpdateModal({ product, onUpdate, onClose, loading = false }) {
    const [type, setType] = useState('add')
    const [qty, setQty] = useState('')
    const [reason, setReason] = useState(REASONS[0])

    const handle = () => {
        const n = parseInt(qty, 10)
        if (!n || n <= 0) return toast.error('Enter a valid quantity')
        const delta = type === 'add' ? n : -n
        if (type === 'remove' && product.stock + delta < 0) return toast.error('Stock cannot go below 0')
        onUpdate(delta, reason)
        toast.success(`Stock ${type === 'add' ? 'increased' : 'decreased'} by ${n}`)
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box max-w-sm p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-xl dark:text-white">Update Stock</h2>
                    <button className="btn-ghost p-2" onClick={onClose} disabled={loading}><X className="w-5 h-5" /></button>
                </div>
                <div className="mb-4 p-3 bg-gray-50 dark:bg-dark-900/50 rounded-xl text-sm">
                    <div className="font-semibold dark:text-white">{product.name}</div>
                    <div className="text-gray-400">Current stock: <span className="font-bold text-gray-700 dark:text-gray-200">{product.stock}</span></div>
                </div>
                <div className="space-y-4">
                    <div className="flex gap-2">
                        {['add', 'remove'].map(t => (
                            <button
                                key={t}
                                onClick={() => setType(t)}
                                className={`flex-1 btn ${type === t ? 'btn-primary' : 'btn-secondary'} capitalize`}
                                disabled={loading}
                            >
                                {t === 'add' ? '+ Add Stock' : '- Remove Stock'}
                            </button>
                        ))}
                    </div>
                    <div>
                        <label className="label">Quantity</label>
                        <input
                            type="number"
                            min="1"
                            className="input"
                            value={qty}
                            onChange={e => setQty(e.target.value)}
                            autoFocus
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <label className="label">Reason</label>
                        <select className="input" value={reason} onChange={e => setReason(e.target.value)} disabled={loading}>
                            {REASONS.map(r => <option key={r}>{r}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-3">
                        <button className="btn-secondary btn flex-1" onClick={onClose} disabled={loading}>Cancel</button>
                        <button className={`btn flex-1 ${type === 'add' ? 'btn-success' : 'btn-danger'}`} onClick={handle} disabled={loading}>
                            {loading ? 'Updating...' : type === 'add' ? 'Add Stock' : 'Remove Stock'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
