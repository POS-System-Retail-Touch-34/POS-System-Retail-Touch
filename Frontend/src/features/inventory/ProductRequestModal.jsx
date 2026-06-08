import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { addNotification } from '../notifications/notificationsSlice'
import { X, PackagePlus } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProductRequestModal({ onClose }) {
    const dispatch = useDispatch()
    const user = useSelector(s => s.auth.user)
    const [name, setName] = useState('')
    const [reason, setReason] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!name.trim() || !reason.trim()) {
            return toast.error('Please fill in all fields')
        }
        setSubmitting(true)
        const senderRole = user?.role || 'CASHIER'
        const targetRoles = senderRole === 'STORE_MANAGER' ? ['ADMIN'] : ['STORE_MANAGER']
        const referenceId = `PRD-${Date.now()}`

        dispatch(addNotification({
            type: 'PRODUCT_REQUEST',
            title: 'New Product Request',
            message: `Request to add: ${name}. Reason: ${reason}`,
            senderName: user?.username || 'Unknown',
            senderRole,
            referenceId,
            targetRoles,
            data: { productName: name, reason }
        }))

        toast.success(targetRoles[0] === 'ADMIN'
            ? 'Product request forwarded to Admin'
            : 'Product addition request sent to Manager')
        setSubmitting(false)
        onClose()
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box max-w-sm p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                        <PackagePlus className="w-5 h-5 text-primary-500" />
                        Request Product
                    </h2>
                    <button className="btn-ghost p-2" onClick={onClose}><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Product Name <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            className="input"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Exact name of the product"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="label">Reason <span className="text-red-500">*</span></label>
                        <textarea
                            className="input min-h-[80px] resize-none"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Why is this product needed?"
                        />
                    </div>

                    <button type="submit" className="btn-primary btn w-full mt-2" disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                    <div className="text-xs text-center text-gray-500 mt-2">
                        Managers and Admins will review this request.
                    </div>
                </form>
            </div>
        </div>
    )
}
