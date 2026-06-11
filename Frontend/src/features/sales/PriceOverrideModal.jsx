import { useState } from 'react'
import { X, DollarSign, ShieldAlert } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { updateItemPrice } from './cartSlice'
import toast from 'react-hot-toast'
import { logAuditEvent } from '../../services/settingsService'

export default function PriceOverrideModal({ item, onClose }) {
    const dispatch = useDispatch()
    const [newPrice, setNewPrice] = useState(item.price.toString())
    const [reason, setReason] = useState('')

    const handleSave = async () => {
        const parsed = parseFloat(newPrice)
        if (isNaN(parsed) || parsed < 0) return toast.error('Invalid price')
        if (!reason.trim()) return toast.error('Reason required for price override')

        dispatch(updateItemPrice({ id: item.id, price: parsed }))
        try {
            await logAuditEvent({
                action: 'PRICE_OVERRIDE',
                module: 'SALES',
                oldValue: JSON.stringify({ productId: item.id, price: item.price }),
                newValue: JSON.stringify({ productId: item.id, price: parsed, reason }),
                changedBy: 'frontend',
                role: 'STORE_MANAGER_OR_ADMIN',
            })
        } catch {
            // Do not block the override if audit logging is unavailable.
        }
        toast.success(`Price updated to INR ${parsed.toFixed(2)}`)
        onClose()
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box max-w-sm p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-orange-500" /> Price Override
                    </h2>
                    <button className="btn-ghost p-2" onClick={onClose}><X className="w-5 h-5" /></button>
                </div>

                <div className="p-3 mb-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl flex items-start gap-3 text-sm">
                    <ShieldAlert className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="text-orange-800 dark:text-orange-300">
                        <strong>Manager Override</strong>
                        <p className="mt-1">You are changing the price of <strong>{item.name}</strong> from its default of INR {item.price.toFixed(2)}.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="label">New Price (INR)</label>
                        <input
                            type="number"
                            className="input text-lg font-bold"
                            value={newPrice}
                            onChange={e => setNewPrice(e.target.value)}
                            step="0.01"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="label">Reason for Override</label>
                        <textarea
                            className="input resize-none h-20"
                            placeholder="e.g. Price match, damaged packaging..."
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                        />
                    </div>

                    <button className="btn-primary w-full btn-lg bg-orange-500 hover:bg-orange-600 border-none" onClick={handleSave}>
                        Confirm Override
                    </button>
                </div>
            </div>
        </div>
    )
}