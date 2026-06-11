import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAllProducts, searchProductsByName, createProduct, updateProduct, deleteProduct, adjustStock } from '../../services/inventoryService'
import useDebounce from '../../hooks/useDebounce'
import { Search, Plus, Edit, Trash2, AlertTriangle, Package, ArrowLeftRight } from 'lucide-react'
import toast from 'react-hot-toast'
import ProductFormModal from './ProductFormModal'
import StockUpdateModal from './StockUpdateModal'
import StockTransferModal from './StockTransferModal'
import ProductRequestModal from './ProductRequestModal'
import IssueReportModal from './IssueReportModal'
import clsx from 'clsx'
import useRole from '../../hooks/useRole'
import ConfirmModal from '../../components/ConfirmModal'

const CATEGORIES = ['All', 'Beverages', 'Snacks', 'Dairy', 'Bakery', 'Candy', 'Cleaning', 'Frozen', 'Electronics', 'Personal Care']

export default function InventoryPage() {
    const { canEditInventory } = useRole()
    const queryClient = useQueryClient()

    const [q, setQ] = useState('')
    const debouncedQ = useDebounce(q, 300)
    const [category, setCategory] = useState('All')
    const [stockFilter, setStockFilter] = useState('All')

    const { data: products = [], isLoading, isError } = useQuery({
        queryKey: ['products', debouncedQ],
        queryFn: () => debouncedQ ? searchProductsByName(debouncedQ) : getAllProducts()
    })

    const normalizedProducts = products.map(p => ({
        ...p,
        stock: p.currentStock ?? p.stock ?? 0,
        minStock: p.lowStockThreshold ?? p.minStock ?? 10,
        category: p.categoryName ?? p.category ?? 'Uncategorized',
        cost: p.costPrice ?? p.cost ?? 0,
    }))
    const [showForm, setShowForm] = useState(false)
    const [editProduct, setEditProduct] = useState(null)
    const [stockModal, setStockModal] = useState(null)
    const [showTransfer, setShowTransfer] = useState(false)
    const [showProductRequest, setShowProductRequest] = useState(false)
    const [issueProduct, setIssueProduct] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)

    const createMutation = useMutation({
        mutationFn: createProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
            toast.success('Product added!')
            setShowForm(false)
        },
        onError: () => toast.error('Failed to add product')
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateProduct(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
            toast.success('Product updated!')
            setShowForm(false)
            setEditProduct(null)
        },
        onError: () => toast.error('Failed to update product')
    })

    const deleteMutation = useMutation({
        mutationFn: deleteProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
            toast.success('Product deleted')
        },
        onError: (error) => toast.error(error?.response?.data?.message || 'Failed to delete product')
    })

    const adjustStockMutation = useMutation({
        mutationFn: ({ productId, delta, reason }) => adjustStock(productId, delta, reason || 'Manual adjustment'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
            toast.success('Stock updated')
        },
        onError: (error) => toast.error(error?.response?.data?.message || 'Failed to update stock')
    })

    const filtered = normalizedProducts.filter(p => {
        const matchCat = category === 'All' || p.category === category

        let matchStock = true
        if (stockFilter === 'In Stock') matchStock = p.stock > p.minStock
        if (stockFilter === 'Low Stock') matchStock = p.stock > 0 && p.stock <= p.minStock
        if (stockFilter === 'Out of Stock') matchStock = p.stock === 0

        return matchCat && matchStock
    })

    const lowStock = normalizedProducts.filter(p => p.stock <= p.minStock).length

    const handleSave = (data) => {
        const payload = {
            name: data.name,
            sku: data.sku,
            categoryName: data.category,
            categoryId: data.category?.toLowerCase().replace(/\s+/g, '-'),
            price: Number(data.price),
            costPrice: Number(data.cost),
            currentStock: Number(data.stock),
            lowStockThreshold: Number(data.minStock),
            active: true,
        }
        if (editProduct) {
            updateMutation.mutate({ id: editProduct.id, data: payload })
        } else {
            createMutation.mutate(payload)
        }
    }

    const handleDelete = (id) => {
        setDeleteTarget(id)
    }

    const handleDeleteConfirm = () => {
        if (!deleteTarget) return
        deleteMutation.mutate(deleteTarget, {
            onSettled: () => setDeleteTarget(null),
        })
    }

    const handleStockUpdate = (id, delta, reason) => {
        console.debug('Updating stock', { productId: id, delta, reason })
        adjustStockMutation.mutate({ productId: id, delta, reason })
    }

    if (isLoading) {
        return <div className="p-10 text-center text-gray-500">Loading inventory...</div>
    }

    if (isError) {
        return <div className="p-10 text-center text-red-500">Failed to load inventory</div>
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">Inventory</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{products.length} products</p>
                </div>
                <div className="flex gap-3">
                    {canEditInventory ? (
                        <>
                            <button className="btn-secondary btn gap-2" onClick={() => setShowTransfer(true)}>
                                <ArrowLeftRight className="w-4 h-4" /> Stock Transfer
                            </button>
                            <button
                                className="btn-primary btn gap-2"
                                onClick={() => { setEditProduct(null); setShowForm(true) }}
                                disabled={createMutation.isPending || updateMutation.isPending}
                            >
                                <Plus className="w-4 h-4" /> Add Product
                            </button>
                        </>
                    ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">View-only access</span>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total Products', value: normalizedProducts.length, color: 'text-primary-600' },
                    { label: 'Low Stock', value: lowStock, color: 'text-red-500' },
                    { label: 'Out of Stock', value: normalizedProducts.filter(p => p.stock === 0).length, color: 'text-orange-500' },
                    { label: 'Categories', value: CATEGORIES.length - 1, color: 'text-emerald-500' },
                ].map(s => (
                    <div key={s.label} className="card p-4">
                        <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Low stock alert */}
            {lowStock > 0 && (
                <div className="flex items-center gap-3 p-3 mb-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-sm text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span><strong>{lowStock} product{lowStock > 1 ? 's' : ''}</strong> below minimum stock threshold.</span>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input className="input pl-9 w-64" placeholder="Search products…" value={q} onChange={e => setQ(e.target.value)} />
                </div>
                <select
                    className="input w-44"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <select
                    className="input w-40"
                    value={stockFilter}
                    onChange={e => setStockFilter(e.target.value)}
                >
                    <option value="All">All Stock</option>
                    <option value="In Stock">In Stock</option>
                    <option value="Low Stock">Low Stock</option>
                    <option value="Out of Stock">Out of Stock</option>
                </select>
            </div>

            {/* Table */}
            <section className="card p-5 space-y-2">
                <div className="max-h-[60vh] overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-lg">
                <table className="table">
                    <thead>
                        <tr>
                            <th>SKU</th><th>Product Name</th><th>Category</th>
                            <th>Price</th><th>Cost</th><th>Stock</th><th>Status</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(p => {
                            const isLow = p.stock <= p.minStock
                            const isOut = p.stock === 0
                            return (
                                <tr key={p.id}>
                                    <td className="font-mono text-xs text-gray-400">{p.sku}</td>
                                    <td className="font-semibold dark:text-white max-w-[180px]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-primary-50 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Package className="w-4 h-4 text-primary-500" />
                                            </div>
                                            <span className="truncate">{p.name}</span>
                                        </div>
                                    </td>
                                    <td><span className="badge badge-gray">{p.category}</span></td>
                                    <td className="font-semibold text-primary-600 dark:text-primary-400">₹{p.price.toFixed(2)}</td>
                                    <td className="text-gray-500">₹{p.cost.toFixed(2)}</td>
                                    <td>
                                        <button
                                            className={clsx('font-bold', canEditInventory ? 'hover:underline' : 'cursor-default', isOut ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-gray-700 dark:text-gray-200')}
                                            onClick={() => canEditInventory && setStockModal(p)}
                                            disabled={!canEditInventory}
                                        >
                                            {p.stock}
                                        </button>
                                        <span className="text-gray-400 text-xs ml-1">/ {p.minStock}</span>
                                    </td>
                                    <td>
                                        {isOut
                                            ? <span className="badge badge-danger">Out of Stock</span>
                                            : isLow
                                                ? <span className="badge badge-warning">Low Stock</span>
                                                : <span className="badge badge-success">In Stock</span>
                                        }
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-1">
                                            {canEditInventory ? (
                                                <>
                                                    <button
                                                        className="btn-ghost btn-sm btn"
                                                        onClick={() => { setEditProduct(p); setShowForm(true) }}
                                                        disabled={deleteMutation.isPending}
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        className="btn-ghost btn-sm btn hover:text-red-500"
                                                        onClick={() => handleDelete(p.id)}
                                                        disabled={deleteMutation.isPending}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    className="btn-ghost btn-sm btn hover:text-red-500 flex items-center gap-1"
                                                    onClick={() => setIssueProduct(p)}
                                                    title="Report Issue"
                                                >
                                                    <AlertTriangle className="w-3.5 h-3.5" /> <span className="text-xs">Report</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="text-center py-14 text-gray-400">
                        <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        No products found
                    </div>
                )}
            </div>
            </section>

            {showForm && (
                <ProductFormModal
                    product={editProduct}
                    onSave={handleSave}
                    saving={createMutation.isPending || updateMutation.isPending}
                    onClose={() => { setShowForm(false); setEditProduct(null) }}
                />
            )}
            {stockModal && (
                <StockUpdateModal
                    product={stockModal}
                    loading={adjustStockMutation.isPending}
                    onUpdate={(delta, reason) => { handleStockUpdate(stockModal.id, delta, reason); setStockModal(null) }}
                    onClose={() => setStockModal(null)}
                />
            )}
            {showTransfer && <StockTransferModal products={normalizedProducts} onTransfer={() => {
                toast.success(`Stock transfer recorded`)
                setShowTransfer(false)
            }} onClose={() => setShowTransfer(false)} />}

            {showProductRequest && <ProductRequestModal onClose={() => setShowProductRequest(false)} />}
            {issueProduct && <IssueReportModal product={issueProduct} onClose={() => setIssueProduct(null)} />}
            <ConfirmModal
                open={!!deleteTarget}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDeleteConfirm}
                loading={deleteMutation.isPending}
            />
        </div>
    )
}
