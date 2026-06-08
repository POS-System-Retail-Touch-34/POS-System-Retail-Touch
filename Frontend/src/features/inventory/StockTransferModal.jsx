import { useState } from 'react'
import { X, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

const LOCATIONS = ['Main Store', 'Warehouse A', 'Warehouse B', 'Back Room']

export default function StockTransferModal({ products, onTransfer, onClose }) {
    const [from, setFrom] = useState(LOCATIONS[0])
    const [to, setTo] = useState(LOCATIONS[1])
    const [product, setProduct] = useState(products[0]?.id || '')
    const [qty, setQty] = useState('')

    const handle = () => {
        if (from === to) return toast.error('Source and destination must be different')
        if (!qty || parseInt(qty) <= 0) return toast.error('Enter a valid quantity')
        onTransfer(from, to, parseInt(qty))
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-bold text-xl dark:text-white">Stock Transfer</h2>
                    <button className="btn-ghost p-2" onClick={onClose}><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 items-center">
                        <div>
                            <label className="label">From Location</label>
                            <select className="input" value={from} onChange={e => setFrom(e.target.value)}>
                                {LOCATIONS.map(l => <option key={l}>{l}</option>)}
                            </select>
                        </div>
                        <div className="flex justify-center pt-5"><ArrowRight className="w-5 h-5 text-gray-400" /></div>
                        <div>
                            <label className="label">To Location</label>
                            <select className="input" value={to} onChange={e => setTo(e.target.value)}>
                                {LOCATIONS.map(l => <option key={l}>{l}</option>)}
                            </select>
                        </div>
                        <div />
                    </div>
                    <div>
                        <label className="label">Product</label>
                        <select className="input" value={product} onChange={e => setProduct(e.target.value)}>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label">Quantity</label>
                        <input type="number" min="1" className="input" value={qty} onChange={e => setQty(e.target.value)} />
                    </div>
                    <div className="flex gap-3">
                        <button className="btn-secondary btn flex-1" onClick={onClose}>Cancel</button>
                        <button className="btn-primary btn flex-1" onClick={handle}>Transfer Stock</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
