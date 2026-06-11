import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { X, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { addNotification } from '../notifications/notificationsSlice'

export default function LowStockReportModal({ products = [], onClose }) {
    const dispatch = useDispatch()
    const user = useSelector(s => s.auth.user)
    const [productId, setProductId] = useState(products[0]?.id || '')
    const [requestedQty, setRequestedQty] = useState('')
    const [notes, setNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const selected = products.find(p => String(p.id) === String(productId))

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!selected) {
            toast.error('Please select a product')
            return
        }
        const requested = Math.floor(Number(requestedQty))
        if (!Number.isFinite(requested) || requested <= 0) {
            toast.error('Requested quantity must be a positive number')
            return
        }

        setSubmitting(true)
        dispatch(addNotification({
            type: 'LOW_STOCK_REPORT',
            title: 'Low Stock Report',
            message: `${selected.name} is low on stock. Requested qty: ${requested}. Notes: ${notes || 'None'}`,
            senderName: user?.username || 'Unknown',
            senderRole: user?.role || 'CASHIER',
            referenceId: `LSR-${Date.now()}`,
            targetRoles: ['STORE_MANAGER'],
            data: {
                productId: selected.id,
                productName: selected.name,
                requestedQty: requested,
                currentStock: selected.currentStock ?? selected.stock ?? 0,
                notes,
            },
        }))
        toast.success('Low stock report sent to Manager')
        setSubmitting(false)
        onClose()
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Report Low Stock
                    </h2>
                    <button className="btn-ghost p-2" onClick={onClose}><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Product</label>
                        <select
                            className="input"
                            value={productId}
                            onChange={e => setProductId(e.target.value)}
                        >
                            {products.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.currentStock ?? p.stock ?? 0} in stock)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="label">Requested Quantity</label>
                        <input
                            type="number"
                            min="1"
                            className="input"
                            value={requestedQty}
                            onChange={e => setRequestedQty(e.target.value)}
                            placeholder="Enter quantity needed"
                        />
                    </div>

                    <div>
                        <label className="label">Notes</label>
                        <textarea
                            className="input min-h-[80px] resize-none"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Optional details"
                        />
                    </div>

                    <button type="submit" className="btn-primary btn w-full" disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Send Report'}
                    </button>
                </form>
            </div>
        </div>
    )
}
