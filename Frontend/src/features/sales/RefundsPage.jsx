import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    Search,
    RotateCcw,
    PackageSearch,
    MailWarning,
    Clock,
    Loader2,
    CheckCircle2,
    XCircle,
} from 'lucide-react'
import {
    approveRefundRequest,
    createRefundRequest,
    getPendingRefundRequests,
    getRecentTransactions,
    getTransaction,
    refundTransaction,
    rejectRefundRequest,
} from '../../services/salesService'
import toast from 'react-hot-toast'
import useRole from '../../hooks/useRole'
import { formatCurrency } from '../../utils/currency'
import ConfirmModal from '../../components/ConfirmModal'
import { addNotification } from '../notifications/notificationsSlice'

function lineRefundAmount(item, qty) {
    const quantity = Number(item?.quantity || 0)
    const unitPrice = Number(item?.unitPrice || 0)
    const taxAmount = Number(item?.taxAmount || 0)
    const perUnitTax = quantity > 0 ? taxAmount / quantity : 0
    return (unitPrice * qty) + (perUnitTax * qty)
}

export default function RefundsPage() {
    const dispatch = useDispatch()
    const queryClient = useQueryClient()
    const { user } = useSelector(s => s.auth)
    const { canProcessRefund, canRequestRefund } = useRole()

    const [searchQ, setSearchQ] = useState('')
    const [invoice, setInvoice] = useState(null)
    const [reason, setReason] = useState('')
    const [searching, setSearching] = useState(false)
    const [recentList, setRecentList] = useState([])
    const [loadingRecent, setLoadingRecent] = useState(true)
    const [selection, setSelection] = useState({})
    const [confirmAction, setConfirmAction] = useState(null)
    const pendingPayloadRef = useRef(null)

    const pendingRequestsQuery = useQuery({
        queryKey: ['refund-requests', 'pending'],
        queryFn: getPendingRefundRequests,
        enabled: canProcessRefund,
    })

    const reloadRecent = async () => {
        try {
            const data = await getRecentTransactions()
            setRecentList(data ?? [])
        } catch {
            setRecentList([])
        }
    }

    useEffect(() => {
        reloadRecent().finally(() => setLoadingRecent(false))
    }, [])

    const selectableItems = useMemo(() => {
        if (!invoice?.items) return []
        return invoice.items.map((item, idx) => {
            const refundedQuantity = Number(item.refundedQuantity || 0)
            const purchasedQty = Number(item.quantity || 0)
            const remainingQty = Math.max(0, purchasedQty - refundedQuantity)
            return {
                key: item.productId || `${item.productName}-${idx}`,
                item,
                refundedQuantity,
                purchasedQty,
                remainingQty,
            }
        })
    }, [invoice])

    useEffect(() => {
        if (!invoice) {
            setSelection({})
            return
        }
        const next = {}
        for (const line of selectableItems) {
            next[line.key] = {
                selected: false,
                qty: line.remainingQty > 0 ? 1 : 0,
            }
        }
        setSelection(next)
    }, [invoice, selectableItems])

    const selectedLines = useMemo(() => {
        return selectableItems
            .filter(line => {
                const current = selection[line.key]
                return current?.selected && current.qty > 0
            })
            .map(line => ({
                ...line,
                qty: Math.min(Number(selection[line.key]?.qty || 0), line.remainingQty),
            }))
    }, [selectableItems, selection])

    const selectedRefundAmount = useMemo(() => {
        return selectedLines.reduce((sum, line) => sum + lineRefundAmount(line.item, line.qty), 0)
    }, [selectedLines])

    const selectedRefundItemsPayload = useMemo(() => {
        return selectedLines.map(line => ({
            productId: line.item.productId,
            quantity: line.qty,
        }))
    }, [selectedLines])

    const searchInvoice = async () => {
        if (!searchQ.trim()) return
        setSearching(true)
        try {
            const data = await getTransaction(searchQ.trim())
            if (data) {
                setInvoice(data)
                setReason('')
                toast.success('Invoice found')
            } else {
                setInvoice(null)
                toast.error('Invoice not found')
            }
        } catch {
            setInvoice(null)
            toast.error('Transaction not found or an error occurred')
        } finally {
            setSearching(false)
        }
    }

    const refundMut = useMutation({
        mutationFn: refundTransaction,
        onSuccess: () => {
            const amount = pendingPayloadRef.current?.amount || 0
            toast.success(`Refund of ${formatCurrency(amount)} processed successfully`)
            setInvoice(null)
            setSearchQ('')
            setReason('')
            pendingPayloadRef.current = null
            reloadRecent()
            queryClient.invalidateQueries({ queryKey: ['refund-requests', 'pending'] })
        },

        onError: (err) => {
            toast.error(err.response?.data?.message || err.message || 'Failed to process refund')
        },
    })

    const refundRequestMut = useMutation({
        mutationFn: createRefundRequest,
        onSuccess: (record) => {
            const payload = pendingPayloadRef.current
            dispatch(addNotification({
                type: 'REFUND_REQUEST',
                title: 'Refund Request Submitted',
                message: `Refund requested for invoice ${invoice?.invoiceNumber || invoice?.id} (${formatCurrency(payload?.amount || 0)})`,
                senderName: user?.username || 'Unknown',
                senderRole: user?.role || 'CASHIER',
                referenceId: `RR-${record?.id || Date.now()}`,
                targetRoles: ['STORE_MANAGER'],
                data: {
                    transactionId: invoice?.id,
                    reason: payload?.reason,
                    items: payload?.items || [],
                },
            }))
            toast.success('Refund request sent to Manager for approval')
            setInvoice(null)
            setSearchQ('')
            setReason('')
            pendingPayloadRef.current = null
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || err.message || 'Failed to submit refund request')
        },
    })

    const approveMut = useMutation({
        mutationFn: (requestId) => approveRefundRequest(requestId, {}),

        onSuccess: () => {
            toast.success('Refund request approved')
            queryClient.invalidateQueries({ queryKey: ['refund-requests', 'pending'] })
            reloadRecent()
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || err.message || 'Failed to approve refund request')
        },
    })

    const rejectMut = useMutation({
        mutationFn: (requestId) => rejectRefundRequest(requestId, {}),
        onSuccess: () => {
            toast.success('Refund request rejected')
            queryClient.invalidateQueries({ queryKey: ['refund-requests', 'pending'] })
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || err.message || 'Failed to reject refund request')
        },
    })

    const beginRefundFlow = () => {
        if (!invoice) return
        if (invoice.status === 'REFUNDED') {
            toast.error('This invoice is already fully refunded')
            return
        }
        if (!reason.trim()) {
            toast.error('Please provide a reason for the refund')
            return
        }
        if (selectedRefundItemsPayload.length === 0) {
            toast.error('Select at least one item for refund')
            return
        }

        pendingPayloadRef.current = {
            transactionId: invoice.id,
            reason,
            refundedBy: user?.username || 'manager',
            items: selectedRefundItemsPayload,
            amount: selectedRefundAmount,
        }
        setConfirmAction({ type: 'SUBMIT_REFUND' })
    }

    const executeConfirmAction = async () => {
        const action = confirmAction
        setConfirmAction(null)
        if (!action) return

        if (action.type === 'SUBMIT_REFUND') {
            const payload = pendingPayloadRef.current
            if (!payload) return
            if (canProcessRefund) {
                refundMut.mutate(payload)
            } else {
                refundRequestMut.mutate({
                    transactionId: payload.transactionId,
                    reason: payload.reason,
                    items: payload.items,
                })
            }
            return
        }

        if (action.type === 'APPROVE_REQUEST' && action.requestId) {
            approveMut.mutate(action.requestId)
            return
        }

        if (action.type === 'REJECT_REQUEST' && action.requestId) {
            rejectMut.mutate(action.requestId)
        }
    }

    if (!canRequestRefund) {
        return (
            <div className="p-10 text-center text-gray-400">
                You do not have permission to access refunds.
            </div>
        )
    }

    const pendingRequests = pendingRequestsQuery.data || []

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold dark:text-white">Refund Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                    Search by invoice ID or pick from the recent completed/partially refunded sales.
                </p>
            </div>

            {canProcessRefund && (
                <section className="card p-5 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <Clock className="w-4 h-4" /> Pending Refund Requests
                    </div>
                    {pendingRequestsQuery.isLoading ? (
                        <div className="flex items-center text-gray-400"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading requests...</div>
                    ) : pendingRequests.length === 0 ? (
                        <div className="text-sm text-gray-500">No pending refund requests.</div>
                    ) : (
                        <div className="space-y-3">
                            {pendingRequests.map(req => (
                                <div key={req.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="font-semibold text-sm dark:text-white">Request {req.id}</div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                Invoice/Txn: {req.transactionId} | By: {req.requestedBy} | {new Date(req.requestedAt).toLocaleString()}
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">{req.reason}</div>
                                            <div className="text-xs text-gray-500 mt-2">
                                                Items: {(req.items || []).map(i => `${i.productId} x${i.quantity}`).join(', ')}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                className="btn-primary btn text-xs gap-1"
                                                onClick={() => setConfirmAction({ type: 'APPROVE_REQUEST', requestId: req.id })}
                                                disabled={approveMut.isPending || rejectMut.isPending}
                                            >
                                                <CheckCircle2 className="w-4 h-4" /> Approve
                                            </button>
                                            <button
                                                className="btn-danger btn text-xs gap-1"
                                                onClick={() => setConfirmAction({ type: 'REJECT_REQUEST', requestId: req.id })}
                                                disabled={approveMut.isPending || rejectMut.isPending}
                                            >
                                                <XCircle className="w-4 h-4" /> Reject
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            <form onSubmit={(e) => { e.preventDefault(); searchInvoice() }} className="card p-4 border border-gray-100 dark:border-gray-700/50">
                <div className="flex gap-4 max-w-2xl relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by Invoice ID or Transaction ID"
                        className="input pl-12 h-12 text-lg w-full"
                        value={searchQ}
                        onChange={e => setSearchQ(e.target.value)}
                    />
                    <button type="submit" disabled={searching} className="btn btn-primary h-12 px-6">
                        {searching ? 'Searching...' : 'Search'}
                    </button>
                </div>
            </form>

            {!invoice && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <Clock className="w-4 h-4" /> Recent Invoices
                    </div>
                    {loadingRecent ? (
                        <div className="flex items-center justify-center py-10 text-gray-400">
                            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading recent invoices...
                        </div>
                    ) : recentList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <PackageSearch className="w-12 h-12 opacity-20 mb-3" />
                            <p>No recent refundable invoices found.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {recentList.map(txn => (
                                <button
                                    key={txn.id}
                                    onClick={() => { setInvoice(txn); setReason('') }}
                                    className="card-hover p-4 text-left border border-gray-100 dark:border-gray-700/50"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-mono font-semibold text-sm dark:text-white">
                                                {txn.invoiceNumber || txn.id}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                {new Date(txn.timestamp).toLocaleString()}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5">Status: {txn.status}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-primary-600 dark:text-primary-400">
                                                {formatCurrency(txn.total)}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                {txn.items?.length ?? 0} item(s)
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {invoice && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="card p-5">
                            <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700/50 pb-4 mb-4">
                                <div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Invoice</div>
                                    <h3 className="text-xl font-bold font-mono text-gray-900 dark:text-white">
                                        {invoice.invoiceNumber || invoice.id}
                                    </h3>
                                    {invoice.status === 'REFUNDED' && (
                                        <div className="badge badge-warning mt-2">FULLY REFUNDED</div>
                                    )}
                                    {invoice.status === 'PARTIALLY_REFUNDED' && (
                                        <div className="badge badge-primary mt-2">PARTIALLY REFUNDED</div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-semibold dark:text-gray-300">
                                        {new Date(invoice.timestamp || invoice.createdAt).toLocaleString()}
                                    </div>
                                    <button
                                        className="text-xs text-gray-400 hover:text-gray-600 mt-1"
                                        onClick={() => { setInvoice(null); setReason('') }}
                                    >
                                        Back to list
                                    </button>
                                </div>
                            </div>

                            <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-3 text-sm uppercase tracking-wider">
                                Select Items to Refund
                            </h4>
                            <div className="space-y-2">
                                {selectableItems.map(line => {
                                    const current = selection[line.key] || { selected: false, qty: 1 }
                                    return (
                                        <div key={line.key} className="p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={!!current.selected}
                                                    disabled={line.remainingQty <= 0 || invoice.status === 'REFUNDED'}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked
                                                        setSelection(prev => ({
                                                            ...prev,
                                                            [line.key]: {
                                                                selected: checked,
                                                                qty: checked ? Math.min(prev[line.key]?.qty || 1, line.remainingQty) : prev[line.key]?.qty || 1,
                                                            },
                                                        }))
                                                    }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium dark:text-white truncate">{line.item.productName}</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                        Purchased: {line.purchasedQty} | Refunded: {line.refundedQuantity} | Remaining: {line.remainingQty}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                        {formatCurrency(Number(line.item.unitPrice || 0))} per unit
                                                    </div>
                                                </div>
                                                <div className="w-24">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={line.remainingQty}
                                                        className="input h-8 text-sm"
                                                        value={current.qty || ''}
                                                        disabled={!current.selected || line.remainingQty <= 0 || invoice.status === 'REFUNDED'}
                                                        onChange={(e) => {
                                                            let qty = Math.floor(Number(e.target.value))
                                                            if (!Number.isFinite(qty) || qty <= 0) qty = 1
                                                            if (qty > line.remainingQty) qty = line.remainingQty
                                                            setSelection(prev => ({
                                                                ...prev,
                                                                [line.key]: {
                                                                    ...(prev[line.key] || {}),
                                                                    qty,
                                                                },
                                                            }))
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            {current.selected && line.remainingQty > 0 && (
                                                <div className="text-xs text-primary-600 mt-2">
                                                    Refund line amount: {formatCurrency(lineRefundAmount(line.item, current.qty))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700/50 flex justify-between items-center font-bold text-lg dark:text-white">
                                <span>Total Paid</span>
                                <span>{formatCurrency(invoice.total)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="card p-5">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-4">Refund Summary</h3>
                            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-lg text-sm mb-4">
                                Selected refund amount: <strong>{formatCurrency(selectedRefundAmount)}</strong>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="label">Refund Reason</label>
                                    <textarea
                                        className="input min-h-[100px] resize-none"
                                        placeholder="Enter detailed reason for return"
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        disabled={invoice.status === 'REFUNDED'}
                                    />
                                </div>

                                <button
                                    className={`${canProcessRefund ? 'btn-danger' : 'btn-primary'} w-full btn-lg gap-2`}
                                    onClick={beginRefundFlow}
                                    disabled={
                                        !reason.trim() ||
                                        invoice.status === 'REFUNDED' ||
                                        selectedRefundItemsPayload.length === 0 ||
                                        refundMut.isPending ||
                                        refundRequestMut.isPending
                                    }
                                >
                                    {canProcessRefund ? <RotateCcw className="w-5 h-5" /> : <MailWarning className="w-5 h-5" />}
                                    {refundMut.isPending || refundRequestMut.isPending
                                        ? 'Submitting...'
                                        : canProcessRefund
                                            ? 'Approve and Process Refund'
                                            : 'Request Manager Approval'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={!!confirmAction}
                onCancel={() => setConfirmAction(null)}
                onConfirm={executeConfirmAction}
                loading={refundMut.isPending || refundRequestMut.isPending || approveMut.isPending || rejectMut.isPending}
            />
        </div>
    )
}
