import { AlertTriangle } from 'lucide-react'

export default function ConfirmModal({
    open,
    title = 'Confirm Action',
    message = 'Are you sure? This action cannot be undone.',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    loading = false,
    onConfirm,
    onCancel,
}) {
    if (!open) return null

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-box max-w-sm p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold dark:text-white">{title}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{message}</p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button className="btn-secondary btn" onClick={onCancel} disabled={loading}>{cancelText}</button>
                    <button className="btn-danger btn" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Please wait...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
