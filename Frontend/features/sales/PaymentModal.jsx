import { useState, createElement } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useMutation } from '@tanstack/react-query'
import { createRazorpayOrder, createSale } from '../../services/salesService'
import { clearCart, selectTaxInfo, selectTotal } from './cartSlice'
import toast from 'react-hot-toast'
import { X, CreditCard, Smartphone, Banknote, CheckCircle, Printer } from 'lucide-react'
import ReceiptModal from './ReceiptModal'
import { formatCurrency } from '../../utils/currency'

const PAYMENT_METHODS = [
    { id: 'cash', label: 'Cash', icon: Banknote, color: 'text-emerald-500' },
    { id: 'upi', label: 'UPI', icon: Smartphone, color: 'text-purple-500' },
    { id: 'card', label: 'Card', icon: CreditCard, color: 'text-blue-500' },
    { id: 'netbanking', label: 'Netbanking', icon: CreditCard, color: 'text-indigo-500' },
]

function parseApiError(err, fallback) {
    const data = err?.response?.data
    if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        const first = Object.values(data.data)[0]
        if (first) return String(first)
    }
    return data?.message || err?.message || fallback
}

export default function PaymentModal({ onClose }) {
    const dispatch = useDispatch()
    const total = useSelector(selectTotal)
    const taxInfo = useSelector(selectTaxInfo)
    const cart = useSelector(s => s.cart)
    const interstate = useSelector(s => s.settings?.interstate || false)
    const loyaltyConversionRate = useSelector(s => s.settings?.loyaltyConversionRate || 1)

    const [method, setMethod] = useState('cash')
    const [tendered, setTendered] = useState('')
    const [processing, setProcessing] = useState(false)
    const [done, setDone] = useState(false)
    const [showReceipt, setShowReceipt] = useState(false)
    const [receiptData, setReceiptData] = useState(null)

    const change = method === 'cash' ? Math.max(0, parseFloat(tendered || 0) - total) : 0
    const canPay = method !== 'cash' || parseFloat(tendered || 0) >= total

    const quickAmounts = [
        Math.ceil(total),
        Math.ceil(total / 5) * 5,
        Math.ceil(total / 10) * 10,
        Math.ceil(total / 20) * 20,
    ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4)

    const saleMutation = useMutation({
        mutationFn: createSale,
        onSuccess: (responseData) => {
            setProcessing(false)
            setDone(true)

            const subtotal = Number(responseData?.subtotal ?? cart.items.reduce((s, i) => s + i.price * i.qty, 0))
            const discountAmount = Number(responseData?.discount ?? (subtotal * (cart.discount || 0)) / 100)
            const cgstAmount = Number(responseData?.cgstAmount ?? taxInfo.cgst.amount ?? 0)
            const sgstAmount = Number(responseData?.sgstAmount ?? taxInfo.sgst.amount ?? 0)
            const igstAmount = Number(responseData?.igstAmount ?? taxInfo.igst.amount ?? 0)
            const totalTax = Number(responseData?.totalTax ?? responseData?.tax ?? cgstAmount + sgstAmount + igstAmount)

            const receipt = {
                id: responseData?.invoiceNumber || responseData?.id || 'RCT-' + Date.now(),
                date: responseData?.timestamp ? new Date(responseData.timestamp).toLocaleString() : new Date().toLocaleString(),
                items: (responseData?.items || cart.items).map(item => ({
                    name: item.productName || item.name,
                    qty: item.quantity || item.qty,
                    price: Number(item.unitPrice || item.price || 0),
                })),
                subtotal,
                discountAmount,
                discountPercent: cart.discount,
                cgstRate: Number(taxInfo.cgst.rate || 0),
                sgstRate: Number(taxInfo.sgst.rate || 0),
                igstRate: Number(taxInfo.igst.rate || 0),
                cgstAmount,
                sgstAmount,
                igstAmount,
                totalTax,
                total: Number(responseData?.total ?? total),
                method,
                tendered: method === 'cash' ? parseFloat(tendered || 0) : total,
                change: method === 'cash' ? change : 0,
                customer: cart.activeCustomer,
            }
            setReceiptData(receipt)
            dispatch(clearCart())
            toast.success('Payment successful')
        },
        onError: (err) => {
            setProcessing(false)
            toast.error(parseApiError(err, 'Failed to process sale. Try again.'))
            console.error('Sale Error:', err)
        }
    })

    const processReceipt = (payMethod, paymentMeta = null) => {
        setProcessing(true)

        let cashierId = 'unknown'
        try {
            const authStr = localStorage.getItem('auth')
            if (authStr) {
                const parsed = JSON.parse(authStr)
                cashierId = parsed?.user?.username || parsed?.user?.id || 'unknown'
            }
        } catch (e) {
            console.warn('Could not parse auth from localStorage', e)
        }

        const subtotal = cart.items.reduce((s, i) => s + i.price * i.qty, 0)
        const discountAmount = (subtotal * (cart.discount || 0)) / 100

        const paymentPayload = payMethod === 'cash'
            ? {
                method: 'CASH',
                amount: total,
                referenceNumber: null,
                gateway: 'OFFLINE',
            }
            : {
                method: payMethod.toUpperCase(),
                amount: total,
                referenceNumber: paymentMeta?.paymentId || null,
                gateway: paymentMeta?.gateway || 'RAZORPAY',
                orderId: paymentMeta?.orderId || null,
                paymentId: paymentMeta?.paymentId || null,
                signature: paymentMeta?.signature || null,
            }

        const saleRequest = {
            customerId: cart.activeCustomer ? String(cart.activeCustomer.id) : null,
            cashierId,
            discount: discountAmount,
            redeemPoints: cart.loyaltyPointsUsed || 0,
            loyaltyConversionRate,
            interstate,
            items: cart.items.map(item => ({
                productId: String(item.id),
                productName: item.name,
                sku: item.sku || '',
                categoryName: item.categoryName || null,
                quantity: item.qty,
                unitPrice: item.price,
                taxRate: item.taxRate || 0,
                manualItem: !!item.isManual,
            })),
            payments: [paymentPayload],
        }

        saleMutation.mutate(saleRequest)
    }

    const handleRazorpay = async (payMethod) => {
        if (!window.Razorpay) {
            toast.error('Razorpay SDK failed to load. Are you online?')
            return
        }

        try {
            setProcessing(true)
            const order = await createRazorpayOrder(total, payMethod.toUpperCase())
            const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || order.key
            if (!keyId) {
                throw new Error('Razorpay key_id is missing')
            }

            const isUpi = payMethod === 'upi'
            const isCard = payMethod === 'card'
            const isNetbanking = payMethod === 'netbanking'

            const options = {
                key: keyId,
                amount: order.amount,
                currency: order.currency || 'INR',
                order_id: order.orderId,
                name: 'RetailTouch POS',
                description: 'Transaction Checkout',
                method: {
                    upi: isUpi,
                    card: isCard,
                    netbanking: isNetbanking,
                    wallet: false,
                },
                retry: {
                    enabled: true,
                    max_count: 2,
                },
                handler: function (response) {
                    toast.success(`Payment ID: ${response.razorpay_payment_id}`)
                    processReceipt(payMethod, {
                        gateway: 'RAZORPAY',
                        orderId: response.razorpay_order_id || order.orderId,
                        paymentId: response.razorpay_payment_id,
                        signature: response.razorpay_signature,
                    })
                },
                prefill: {
                    name: cart.activeCustomer?.name || 'Walk-in Customer',
                    contact: cart.activeCustomer?.phone || '9999999999',
                },
                theme: { color: '#0ea5e9' },
                modal: {
                    ondismiss: function () {
                        setProcessing(false)
                        toast('Payment cancelled', { icon: 'i' })
                    }
                }
            }

            if (isUpi) {
                options.upi = { flow: 'qr' }
                options.config = {
                    display: {
                        blocks: {
                            upi: {
                                name: 'UPI QR',
                                instruments: [{ method: 'upi' }],
                            },
                        },
                        sequence: ['block.upi'],
                        preferences: {
                            show_default_blocks: false,
                        },
                    },
                }
            }

            const rzp = new window.Razorpay(options)

            rzp.on('payment.failed', function (response) {
                toast.error(response.error.description)
                setProcessing(false)
            })

            rzp.open()
        } catch (err) {
            setProcessing(false)
            toast.error(parseApiError(err, 'Failed to initialize Razorpay payment'))
        }
    }

    const handlePay = () => {
        if (method === 'cash') {
            if (!canPay) return toast.error('Tendered amount is less than total')
            processReceipt('cash')
        } else {
            handleRazorpay(method)
        }
    }

    if (done && !showReceipt) {
        return (
            <div className="modal-overlay">
                <div className="modal-box max-w-sm p-8 text-center space-y-4">
                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-12 h-12 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold dark:text-white">Payment Complete</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Total paid: <span className="font-bold text-gray-800 dark:text-gray-100">{formatCurrency(receiptData?.total ?? 0)}</span></p>
                    {change > 0 && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-3">
                            <div className="text-sm text-emerald-700 dark:text-emerald-300">Change: <span className="font-bold text-xl">{formatCurrency(change)}</span></div>
                        </div>
                    )}
                    <div className="flex gap-3">
                        <button className="btn-secondary btn flex-1 gap-2" onClick={() => setShowReceipt(true)}>
                            <Printer className="w-4 h-4" /> Receipt
                        </button>
                        <button className="btn-primary btn flex-1" onClick={onClose}>New Sale</button>
                    </div>
                </div>
            </div>
        )
    }

    if (showReceipt && receiptData) {
        return <ReceiptModal receipt={receiptData} onClose={onClose} />
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold dark:text-white">Payment</h2>
                    <button className="btn-ghost p-2" onClick={onClose}><X className="w-5 h-5" /></button>
                </div>

                <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-2xl p-4 text-center mb-5">
                    <div className="text-sm text-primary-600 dark:text-primary-400 font-medium">Amount Due</div>
                    <div className="text-4xl font-bold text-primary-700 dark:text-primary-300">{formatCurrency(total)}</div>
                </div>

                <div className="flex gap-2 mb-5">
                    {PAYMENT_METHODS.map(({ id, label, icon, color }) => (
                        <button
                            key={id}
                            onClick={() => { setMethod(id); setTendered('') }}
                            className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all text-sm font-semibold ${method === id
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                                : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                                }`}
                        >
                            {createElement(icon, { className: `w-5 h-5 ${method === id ? color : ''}` })}
                            {label}
                        </button>
                    ))}
                </div>

                {method === 'cash' && (
                    <div className="space-y-3 mb-5">
                        <div>
                            <label className="label">Tendered Amount (INR)</label>
                            <input
                                type="number"
                                className="input text-lg font-bold"
                                placeholder="0.00"
                                value={tendered}
                                onChange={e => setTendered(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {quickAmounts.map(amt => (
                                <button
                                    key={amt}
                                    className="btn-secondary btn text-sm font-semibold"
                                    onClick={() => setTendered(String(amt))}
                                >
                                    {formatCurrency(amt)}
                                </button>
                            ))}
                        </div>
                        {tendered && parseFloat(tendered) >= total && (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-3 text-center">
                                <div className="text-sm text-emerald-600 dark:text-emerald-400">Change</div>
                                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(change)}</div>
                            </div>
                        )}
                    </div>
                )}

                {method !== 'cash' && (
                    <div className="mb-5 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl text-center text-sm text-blue-600 dark:text-blue-400">
                        {method === 'card'
                            ? 'Swipe, tap or insert card to complete payment'
                            : method === 'netbanking'
                                ? 'Choose bank and authorize payment in Razorpay secure flow'
                                : 'Scan QR and pay via UPI app'}
                    </div>
                )}

                <button
                    className="btn-primary btn w-full btn-lg"
                    onClick={handlePay}
                    disabled={processing || (method === 'cash' && !canPay)}
                >
                    {processing ? 'Processing...' : `Confirm ${PAYMENT_METHODS.find(m => m.id === method)?.label} Payment`}
                </button>
            </div>
        </div>
    )
}
