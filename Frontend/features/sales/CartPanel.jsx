import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { removeFromCart, updateQty } from './cartSlice'
import { Minus, Plus, Trash2, ShoppingCart, Edit2 } from 'lucide-react'
import useRole from '../../hooks/useRole'
import PriceOverrideModal from './PriceOverrideModal'
import { formatCurrency } from '../../utils/currency'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function CartPanel() {
    const dispatch = useDispatch()
    const { canOverridePrice } = useRole()
    const items = useSelector(s => s.cart.items)
    const [overrideItem, setOverrideItem] = useState(null)
    const [stockWarningId, setStockWarningId] = useState(null)

    const setQtyWithValidation = (item, nextQty) => {
        const normalized = Math.floor(Number(nextQty))
        if (!Number.isFinite(normalized) || normalized <= 0) {
            toast.error('Quantity must be a positive number')
            return
        }
        if (!item.isManual && normalized > item.stock) {
            setStockWarningId(item.id)
            toast.error('Insufficient stock available')
            return
        }
        setStockWarningId(null)
        dispatch(updateQty({ id: item.id, qty: normalized }))
    }

    if (items.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 dark:text-gray-500 p-8">
                <ShoppingCart className="w-12 h-12 opacity-30" />
                <div className="text-center">
                    <div className="font-semibold">Cart is empty</div>
                    <div className="text-xs mt-1">Click a product to add it</div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="px-1 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <ShoppingCart className="w-3.5 h-3.5" />
                Cart ({items.length} item{items.length !== 1 ? 's' : ''})
            </div>
            {/* Flat item shape: { id, name, sku, price, qty, taxRate, stock } */}
            {items.map((item) => (
                <div
                    key={item.id}
                    className={clsx(
                        'flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-900/50 border border-gray-100 dark:border-gray-700/50 group',
                        stockWarningId === item.id && 'border-red-400 ring-1 ring-red-300'
                    )}
                >
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{item.name}</div>
                        <div className="text-xs text-gray-400">{formatCurrency(item.price)} each</div>
                    </div>
                    {/* Qty stepper */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                            className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-primary-100 dark:hover:bg-primary-900/40 hover:text-primary-600 transition-colors"
                            onClick={() => dispatch(updateQty({ id: item.id, qty: item.qty - 1 }))}
                        >
                            <Minus className="w-3 h-3" />
                        </button>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.qty}
                            onChange={(e) => setQtyWithValidation(item, e.target.value)}
                            className="w-14 text-center input h-7 px-1 text-xs font-semibold"
                            title={!item.isManual ? `Available stock: ${item.stock}` : 'Manual item quantity'}
                        />
                        <button
                            className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-primary-100 dark:hover:bg-primary-900/40 hover:text-primary-600 transition-colors"
                            onClick={() => setQtyWithValidation(item, item.qty + 1)}
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                    {/* Line total */}
                    <div className="text-sm font-bold text-primary-600 dark:text-primary-400 w-[72px] text-right flex-shrink-0">
                        {formatCurrency(item.price * item.qty)}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        {canOverridePrice && (
                            <button
                                className="text-gray-400 hover:text-orange-500 p-1"
                                onClick={() => setOverrideItem(item)}
                                title="Override Price"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            className="text-gray-400 hover:text-red-500 p-1"
                            onClick={() => dispatch(removeFromCart(item.id))}
                            title="Remove"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
            {overrideItem && <PriceOverrideModal item={overrideItem} onClose={() => setOverrideItem(null)} />}
        </div>
    )
}
