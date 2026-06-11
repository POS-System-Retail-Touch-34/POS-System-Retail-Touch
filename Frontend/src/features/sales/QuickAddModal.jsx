import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { addToCart } from './cartSlice'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function QuickAddModal({ onClose }) {
    const dispatch = useDispatch()
    const [name, setName] = useState('')
    const [price, setPrice] = useState('')
    const [qty, setQty] = useState(1)

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!name.trim()) return toast.error('Product name is required')
        if (!price || isNaN(price) || Number(price) <= 0) return toast.error('Valid price is required')
        if (!qty || isNaN(qty) || Number(qty) <= 0) return toast.error('Valid quantity is required')

        const manualItem = {
            id: `manual-${Date.now()}`, // Temporary ID
            name: `${name.trim()} (Manual)`,
            price: Number(price),
            stock: 9999, // infinite for manual
            sku: 'MANUAL',
            category: 'Custom',
            isManual: true,
        }

        // Add to cart with specific quantity. since addToCart defaults to qty=1 if it doesn't exist,
        // we might just add it, then immediately update the qty if it's > 1.
        // Wait, addToCart only adds 1... let's check cartSlice handle for custom add or dispatch addToCart N times?
        // Let's modify manual product to inject into cart. Since it's a unique ID every time, it will be added as new.
        // Actually addToCart only pushes 1 qty. 
        // We will dispatch addToCart, then updateQty.
        dispatch(addToCart(manualItem))
        if (Number(qty) > 1) {
            dispatch({ type: 'cart/updateQty', payload: { id: manualItem.id, qty: Number(qty) } })
        }

        toast.success(`Added ${name} manually`)
        onClose()
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box max-w-sm p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold dark:text-white">Quick Add Item</h2>
                    <button className="btn-ghost p-2" onClick={onClose}><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Item Name <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            className="input"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Loose Rice"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="label">Price (₹) <span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            step="0.01"
                            className="input"
                            value={price}
                            onChange={e => setPrice(e.target.value)}
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="label">Quantity</label>
                        <input
                            type="number"
                            className="input"
                            value={qty}
                            onChange={e => setQty(e.target.value)}
                            min="1"
                        />
                    </div>
                    <button type="submit" className="btn-primary btn w-full mt-2">Add to Cart</button>
                </form>
            </div>
        </div>
    )
}
