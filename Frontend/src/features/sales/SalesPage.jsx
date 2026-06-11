import { useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import { getAllProducts, getProductByBarcode, searchProductsByName } from '../../services/inventoryService'
import useDebounce from '../../hooks/useDebounce'
import {
    addToCart, setDiscount, holdTransaction,
    resumeTransaction, deleteHeld, clearCart,
    selectSubtotal, selectDiscountAmount, selectTotal, selectTaxInfo, selectLoyaltyDiscount, setLoyaltyPointsUsed
} from './cartSlice'
import { formatCurrency } from '../../utils/currency'
import toast from 'react-hot-toast'
import { Search, Scan, Plus, Tag, Trash2, Clock, CheckCircle, RefreshCcw, ShoppingBag, X, Pause, Play, Loader2 } from 'lucide-react'
import CartPanel from './CartPanel'
import PaymentModal from './PaymentModal'
import CustomerLookupModal from '../customers/CustomerLookupModal'
import QuickAddModal from './QuickAddModal'
import RecentSalesModal from './RecentSalesModal'
import ProductRequestModal from '../inventory/ProductRequestModal'
import LowStockReportModal from './LowStockReportModal'
import clsx from 'clsx'
import useRole from '../../hooks/useRole'

export default function SalesPage() {
    const dispatch = useDispatch()
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search, 300)
    const [barcodeInput, setBarcodeInput] = useState('')
    const [showPayment, setShowPayment] = useState(false)
    const [showHeld, setShowHeld] = useState(false)
    const [showCustomer, setShowCustomer] = useState(false)
    const [showQuickAdd, setShowQuickAdd] = useState(false)
    const [showRecent, setShowRecent] = useState(false)
    const [stockWarningProductId, setStockWarningProductId] = useState(null)
    const [showProductRequest, setShowProductRequest] = useState(false)
    const [showLowStockReport, setShowLowStockReport] = useState(false)
    const { canOverridePrice, isCashier } = useRole()

    const { data: products = [], isLoading } = useQuery({
        queryKey: ['products', debouncedSearch],
        queryFn: () => debouncedSearch ? searchProductsByName(debouncedSearch) : getAllProducts()
    })

    const cart = useSelector(s => s.cart)
    const loyaltyConversionRate = useSelector(s => s.settings?.loyaltyConversionRate || 1)
    const subtotal = useSelector(selectSubtotal)
    const discountAmount = useSelector(selectDiscountAmount)
    const taxInfo = useSelector(selectTaxInfo)
    const loyaltyDiscount = useSelector(selectLoyaltyDiscount)
    const total = useSelector(selectTotal)
    const effectiveLoyaltyRate = loyaltyConversionRate > 0 ? loyaltyConversionRate : 1

    // With server-side search, `products` is already filtered. We just slice it to not overwhelm UI.
    const filtered = products.slice(0, 12)

    const handleAdd = useCallback((product) => {
        const stock = product.currentStock ?? product.stock ?? 0
        if (stock <= 0) {
            toast.error('Out of stock!')
            return
        }
        const existing = cart.items.find(i => i.id === product.id)
        const nextQty = existing ? existing.qty + 1 : 1
        if (nextQty > stock) {
            setStockWarningProductId(product.id)
            toast.error('Insufficient stock available')
            return
        }
        setStockWarningProductId(null)
        dispatch(addToCart(product))
        toast.success(`${product.name} added`, { duration: 1500 })
    }, [cart.items, dispatch])

    const handleBarcode = async (e) => {
        if (e.key === 'Enter') {
            const code = barcodeInput.trim()
            if (!code) return
            try {
                const product = await getProductByBarcode(code)
                handleAdd(product)
                setBarcodeInput('')
            } catch {
                const fallback = products.find(p => p.sku === code || p.barcode === code)
                if (fallback) {
                    handleAdd(fallback)
                    setBarcodeInput('')
                } else {
                    toast.error(`Product not found: ${code}`)
                }
            }
        }
    }

    return (
        <div className="flex h-full" style={{ minHeight: 'calc(100vh - 64px)' }}>
            {/* LEFT: Product area */}
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
                {/* Search + Barcode row */}
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            className="input pl-9"
                            placeholder="Search products by name, SKU, category…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="relative w-52">
                        <Scan className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            className="input pl-9"
                            placeholder="Scan barcode…"
                            value={barcodeInput}
                            onChange={e => setBarcodeInput(e.target.value)}
                            onKeyDown={handleBarcode}
                            autoFocus
                        />
                    </div>
                </div>

                {/* Customer badge */}
                {cart.activeCustomer && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-xl text-sm">
                        <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {cart.activeCustomer.name[0]}
                        </div>
                        <span className="text-primary-700 dark:text-primary-300 font-medium">{cart.activeCustomer.name}</span>
                        <span className="badge badge-primary ml-1">{cart.activeCustomer.loyaltyPoints} pts</span>
                        <button
                            className="ml-auto btn-ghost p-1"
                            onClick={() => dispatch({ type: 'cart/setActiveCustomer', payload: null })}
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}

                {/* Category filter chips */}
                <div className="flex gap-2 overflow-x-auto pb-1 flex-shrink-0">
                    {['All', 'Beverages', 'Snacks', 'Dairy', 'Bakery', 'Candy', 'Cleaning', 'Frozen', 'Electronics', 'Personal Care'].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSearch(cat === 'All' ? '' : cat)}
                            className={clsx(
                                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                                search === (cat === 'All' ? '' : cat)
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-white dark:bg-dark-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600'
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Product grid */}
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-4" />
                        <p>Loading products from backend...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <ShoppingBag className="w-10 h-10 mb-2 opacity-30" />
                        <p>No products found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filtered.map(product => (
                            <button
                                key={product.id}
                                onClick={() => handleAdd(product)}
                                disabled={(product.currentStock ?? product.stock ?? 0) <= 0}
                                className={clsx(
                                    'card-hover p-4 text-left flex flex-col gap-2 transition-all active:scale-95',
                                    (product.currentStock ?? product.stock ?? 0) <= 0 && 'opacity-50 cursor-not-allowed',
                                    stockWarningProductId === product.id && 'ring-2 ring-red-400 border-red-400'
                                )}
                            >
                                {/* Category pill */}
                                <span className="badge badge-gray text-[10px] self-start">{product.categoryName || product.category}</span>
                                <div className="w-full h-16 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl flex items-center justify-center">
                                    <ShoppingBag className="w-8 h-8 text-primary-400" />
                                </div>
                                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight line-clamp-2">{product.name}</div>
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-primary-600 dark:text-primary-400 font-bold text-base">{formatCurrency(product.price)}</span>
                                    {(product.currentStock ?? product.stock ?? 0) <= 10
                                        ? <span className="badge badge-danger">{product.currentStock ?? product.stock ?? 0} left</span>
                                        : <span className="badge badge-success">{product.currentStock ?? product.stock ?? 0}</span>
                                    }
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Hold/Customer quick action bar */}
                <div className="flex gap-2 mt-auto">
                    <button
                        className="btn-secondary btn flex-1 gap-2"
                        onClick={() => setShowQuickAdd(true)}
                    >
                        <Plus className="w-4 h-4" /> Quick Add
                    </button>
                    <button
                        className="btn-secondary btn flex-1 gap-2"
                        onClick={() => setShowCustomer(true)}
                    >
                        <Tag className="w-4 h-4" /> {cart.activeCustomer ? 'Change Customer' : 'Add Customer'}
                    </button>
                    <button
                        className="btn-secondary btn flex-1 gap-2"
                        onClick={() => {
                            if (cart.items.length === 0) return toast.error('Cart is empty')
                            dispatch(holdTransaction())
                            toast('Transaction held')
                        }}
                    >
                        <Pause className="w-4 h-4" /> Hold
                    </button>
                    {isCashier && (
                        <>
                            <button
                                className="btn-secondary btn gap-2"
                                onClick={() => setShowProductRequest(true)}
                            >
                                <Plus className="w-4 h-4" /> Request Product
                            </button>
                            <button
                                className="btn-secondary btn gap-2"
                                onClick={() => setShowLowStockReport(true)}
                            >
                                <Tag className="w-4 h-4" /> Report Low Stock
                            </button>
                        </>
                    )}
                    {cart.heldTransactions.length > 0 && (
                        <button
                            className="btn-secondary btn gap-2"
                            onClick={() => setShowHeld(true)}
                        >
                            <Play className="w-4 h-4" />
                            Resume ({cart.heldTransactions.length})
                        </button>
                    )}
                </div>
            </div>

            {/* RIGHT: Cart */}
            <div className="w-80 xl:w-96 flex-shrink-0 border-l border-gray-100 dark:border-gray-700/50 bg-white dark:bg-dark-800 flex flex-col">
                <CartPanel />
                {/* Summary + Checkout */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700/50 space-y-3">
                    {/* Discount */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 w-20 flex-shrink-0">Discount %</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                className="input text-sm h-8 px-2"
                                value={cart.discount}
                                onChange={e => dispatch(setDiscount(Number(e.target.value)))}
                                disabled={!canOverridePrice}
                                title={!canOverridePrice ? "Discount overrides require Manager/Admin access" : "Apply discount percentage"}
                            />
                        </div>
                        {cart.activeCustomer && (
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-blue-500 w-20 flex-shrink-0">Points</label>
                                <div className="flex-1">
                                    <div className="text-[11px] text-blue-600 mb-1">
                                        Available points: {cart.activeCustomer.loyaltyPoints || 0}
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        max={Math.min(
                                            cart.activeCustomer.loyaltyPoints || 0,
                                            Math.floor(Math.max(0, subtotal - discountAmount + taxInfo.totalTax) / effectiveLoyaltyRate)
                                        )}
                                        className="input text-sm h-8 px-2 border-blue-200 focus:border-blue-500"
                                        value={cart.loyaltyPointsUsed || ''}
                                        onChange={e => {
                                            let val = Math.floor(Number(e.target.value))
                                            if (!Number.isFinite(val) || val < 0) val = 0

                                            const availablePoints = cart.activeCustomer.loyaltyPoints || 0
                                            const maxByBill = Math.floor(Math.max(0, subtotal - discountAmount + taxInfo.totalTax) / effectiveLoyaltyRate)
                                            if (val > availablePoints) {
                                                toast.error('Cannot exceed available points')
                                                val = availablePoints
                                            }
                                            if (val > maxByBill) {
                                                toast.error('Cannot exceed bill amount')
                                                val = maxByBill
                                            }

                                            dispatch(setLoyaltyPointsUsed(val))
                                        }}
                                        placeholder="Enter points to redeem"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Totals */}
                    <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                            <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
                        </div>
                        {cart.discount > 0 && (
                            <div className="flex justify-between text-emerald-600">
                                <span>Discount ({cart.discount}%)</span>
                                <span>-{formatCurrency(discountAmount)}</span>
                            </div>
                        )}
                        {loyaltyDiscount > 0 && (
                            <div className="flex justify-between text-blue-600">
                                <span>Loyalty Discount</span>
                                <span>-{formatCurrency(loyaltyDiscount)}</span>
                            </div>
                        )}
                        {taxInfo.igst.amount > 0 ? (
                            <div className="flex justify-between text-gray-500 dark:text-gray-400 text-xs">
                                <span>IGST ({taxInfo.igst.rate}%)</span>
                                <span>{formatCurrency(taxInfo.igst.amount)}</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between text-gray-500 dark:text-gray-400 text-xs">
                                    <span>CGST ({taxInfo.cgst.rate}%)</span>
                                    <span>{formatCurrency(taxInfo.cgst.amount)}</span>
                                </div>
                                <div className="flex justify-between text-gray-500 dark:text-gray-400 text-xs">
                                    <span>SGST ({taxInfo.sgst.rate}%)</span>
                                    <span>{formatCurrency(taxInfo.sgst.amount)}</span>
                                </div>
                            </>
                        )}
                        <div className="flex justify-between text-gray-600 dark:text-gray-300 font-medium pt-1 mt-1 border-t border-gray-100 dark:border-gray-700/50">
                            <span>Total Tax</span>
                            <span>{formatCurrency(taxInfo.totalTax)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-700">
                            <span>Total</span><span className="text-primary-600 dark:text-primary-400">{formatCurrency(total)}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            className="btn-secondary btn px-2 text-xs gap-1"
                            onClick={() => setShowRecent(true)}
                            title="Recent Sales"
                        >
                            <RefreshCcw className="w-3.5 h-3.5" /> Recent
                        </button>
                        <button
                            className="btn-danger btn gap-1 text-xs px-2"
                            onClick={() => { dispatch(clearCart()); toast('Cart cleared') }}
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Clear
                        </button>
                        <button className="btn-secondary btn gap-1 text-xs px-2" onClick={() => setShowHeld(true)}>
                            <Clock className="w-3.5 h-3.5" /> Hold
                            {cart.heldTransactions.length > 0 && (
                                <span className="badge badge-primary scale-75 origin-left ml-1">{cart.heldTransactions.length}</span>
                            )}
                        </button>
                    </div>
                    <button
                        className="btn-primary btn gap-1 btn-lg py-3 text-sm w-full"
                        onClick={() => {
                            if (cart.items.length === 0) return toast.error('Add items to cart first')
                            setShowPayment(true)
                        }}
                    >
                        Pay {formatCurrency(total)}
                    </button>
                </div>
            </div>

            {/* Modals */}
            {showPayment && <PaymentModal total={total} onClose={() => setShowPayment(false)} />}

            {showQuickAdd && <QuickAddModal onClose={() => setShowQuickAdd(false)} />}
            {showRecent && <RecentSalesModal onClose={() => setShowRecent(false)} />}
            {showProductRequest && <ProductRequestModal onClose={() => setShowProductRequest(false)} />}
            {showLowStockReport && <LowStockReportModal products={products} onClose={() => setShowLowStockReport(false)} />}

            {showCustomer && (
                <CustomerLookupModal
                    onSelect={(c) => {
                        dispatch({ type: 'cart/setActiveCustomer', payload: c })
                        setShowCustomer(false)
                        toast.success(`${c.name} added to transaction`)
                    }}
                    onClose={() => setShowCustomer(false)}
                />
            )}

            {showHeld && (
                <div className="modal-overlay" onClick={() => setShowHeld(false)}>
                    <div className="modal-box max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold dark:text-white">Held Transactions ({cart.heldTransactions.length})</h2>
                            <button className="btn-ghost p-2" onClick={() => setShowHeld(false)}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-3">
                            {cart.heldTransactions.map(t => (
                                <div key={t.id} className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 flex items-center justify-between gap-3">
                                    <div>
                                        <div className="font-semibold text-sm dark:text-white">{t.items.length} item(s)</div>
                                        <div className="text-xs text-gray-400">{new Date(t.heldAt).toLocaleTimeString()}</div>
                                        {t.customer && <div className="text-xs text-primary-500 mt-0.5">{t.customer.name}</div>}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            className="btn-primary btn-sm btn gap-1"
                                            onClick={() => { dispatch(resumeTransaction(t.id)); setShowHeld(false) }}
                                        >
                                            <Play className="w-3 h-3" /> Resume
                                        </button>
                                        <button
                                            className="btn-danger btn-sm btn p-1.5"
                                            onClick={() => dispatch(deleteHeld(t.id))}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}



