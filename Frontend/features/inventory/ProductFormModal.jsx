import { useFormik } from 'formik'
import * as Yup from 'yup'
import { X } from 'lucide-react'

const schema = Yup.object({
    name: Yup.string().required('Required'),
    sku: Yup.string().required('Required'),
    category: Yup.string().required('Required'),
    price: Yup.number().positive('Must be positive').required('Required'),
    cost: Yup.number().positive('Must be positive').required('Required'),
    stock: Yup.number().min(0).required('Required'),
    minStock: Yup.number().min(0).required('Required'),
})

const CATEGORIES = ['Beverages', 'Snacks', 'Dairy', 'Bakery', 'Candy', 'Cleaning', 'Frozen', 'Electronics', 'Personal Care']

export default function ProductFormModal({ product, onSave, onClose, saving = false }) {
    const formik = useFormik({
        initialValues: product
            ? { name: product.name, sku: product.sku, category: product.category, price: product.price, cost: product.cost, stock: product.stock, minStock: product.minStock }
            : { name: '', sku: '', category: 'Beverages', price: '', cost: '', stock: '', minStock: 10 },
        validationSchema: schema,
        onSubmit: (values) => onSave(values),
    })

    const field = (name, label, type = 'text', opts = {}) => (
        <div key={name}>
            <label className="label">{label}</label>
            {opts.select ? (
                <select name={name} className="input" value={formik.values[name]} onChange={formik.handleChange}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
            ) : (
                <input name={name} type={type} className={`input ${formik.touched[name] && formik.errors[name] ? 'input-error' : ''}`}
                    value={formik.values[name]} onChange={formik.handleChange} onBlur={formik.handleBlur} />
            )}
            {formik.touched[name] && formik.errors[name] && (
                <p className="text-red-500 text-xs mt-1">{formik.errors[name]}</p>
            )}
        </div>
    )

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box max-w-lg p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold dark:text-white">{product ? 'Edit Product' : 'Add Product'}</h2>
                    <button className="btn-ghost p-2" onClick={onClose}><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={formik.handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {field('name', 'Product Name')}
                        {field('sku', 'SKU')}
                        {field('category', 'Category', 'text', { select: true })}
                        {field('price', 'Price (₹)', 'number')}
                        {field('cost', 'Cost (₹)', 'number')}
                        {field('stock', 'Current Stock', 'number')}
                        {field('minStock', 'Min Stock Threshold', 'number')}
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" className="btn-secondary btn flex-1" onClick={onClose} disabled={saving}>Cancel</button>
                        <button type="submit" className="btn-primary btn flex-1" disabled={saving}>
                            {saving ? 'Saving...' : product ? 'Update' : 'Add Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
