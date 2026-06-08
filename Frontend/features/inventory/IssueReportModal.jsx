import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { addNotification } from '../notifications/notificationsSlice'
import { X, AlertOctagon } from 'lucide-react'
import toast from 'react-hot-toast'

export default function IssueReportModal({ product, onClose }) {
    const dispatch = useDispatch()
    const user = useSelector(s => s.auth.user)
    const [issueType, setIssueType] = useState('Low stock')
    const [notes, setNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = (e) => {
        e.preventDefault()
        setSubmitting(true)
        const senderRole = user?.role || 'CASHIER'
        const targetRoles = senderRole === 'STORE_MANAGER' ? ['ADMIN'] : ['STORE_MANAGER']
        const referenceId = `LSR-${Date.now()}`

        dispatch(addNotification({
            type: issueType === 'Low stock' || issueType === 'Out of stock' ? 'LOW_STOCK_REPORT' : 'ITEM_ISSUE_REPORT',
            title: `Issue Reported: ${product.name}`,
            message: `Type: ${issueType}. Notes: ${notes || 'None'}`,
            senderName: user?.username || 'Unknown',
            senderRole,
            referenceId,
            targetRoles,
            data: { productId: product.id, issueType, notes }
        }))

        toast.success('Issue reported successfully')
        setSubmitting(false)
        onClose()
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box max-w-sm p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                        <AlertOctagon className="w-5 h-5 text-red-500" />
                        Report Issue
                    </h2>
                    <button className="btn-ghost p-2" onClick={onClose}><X className="w-5 h-5" /></button>
                </div>

                <div className="mb-4 p-3 bg-gray-50 dark:bg-dark-900/50 rounded-lg text-sm">
                    <div className="font-semibold text-gray-800 dark:text-gray-200">{product.name}</div>
                    <div className="text-gray-500 text-xs mt-1">SKU: {product.sku}</div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Issue Type</label>
                        <select
                            className="input"
                            value={issueType}
                            onChange={e => setIssueType(e.target.value)}
                        >
                            <option value="Low stock">Low stock</option>
                            <option value="Out of stock">Out of stock</option>
                            <option value="Damaged item">Damaged item</option>
                        </select>
                    </div>
                    <div>
                        <label className="label">Additional Notes</label>
                        <textarea
                            className="input min-h-[80px] resize-none"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Describe the issue..."
                        />
                    </div>

                    <button type="submit" className="btn-danger btn w-full mt-2" disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                </form>
            </div>
        </div>
    )
}
