import { X, RefreshCcw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getRecentTransactions } from '../../services/salesService'
import { formatCurrency } from '../../utils/currency'

export default function RecentSalesModal({ onClose }) {
    const { data: recentOrders = [] } = useQuery({
        queryKey: ['recent-sales-modal'],
        queryFn: getRecentTransactions,
    })

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box max-w-lg p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                        <RefreshCcw className="w-5 h-5 text-primary-500" />
                        Recent Sales
                    </h2>
                    <button className="btn-ghost p-2" onClick={onClose}><X className="w-5 h-5" /></button>
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {recentOrders.map(order => (
                        <div key={order.id} className="p-4 border rounded-xl dark:border-gray-700/50 flex justify-between items-center transition-all hover:border-primary-300 dark:hover:border-primary-500/50">
                            <div>
                                <div className="font-bold text-gray-800 dark:text-white">
                                    {order.invoiceNumber || order.id}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {new Date(order.timestamp || order.createdAt).toLocaleString()}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-emerald-600">
                                    {formatCurrency(order.total)}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                    {(order.items || []).length} items
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
