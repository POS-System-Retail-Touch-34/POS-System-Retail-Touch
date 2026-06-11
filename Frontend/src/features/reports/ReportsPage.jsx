import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { Download, FileText, TrendingUp, CreditCard, Package, Clock, Loader2 } from 'lucide-react'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import { formatCurrency, parseCurrency } from '../../utils/currency'
import RegisterReadModal from './RegisterReadModal'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    getDashboardMetrics,
    getPaymentBreakdown,
    getProductsReport,
    getSalesTrend,
} from '../../services/reportService'

const COLORS = ['#6272f8', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-gray-600 rounded-xl p-3 shadow-xl text-xs">
            <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">{label}</p>
            {payload.map(p => (
                <div key={p.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-gray-500 dark:text-gray-400">{p.name}:</span>
                    <span className="font-bold text-gray-800 dark:text-gray-100">
                        {typeof p.value === 'number' ? formatCurrency(p.value) : p.value}
                    </span>
                </div>
            ))}
        </div>
    )
}

export default function ReportsPage() {
    const [readModal, setReadModal] = useState(null)

    const dashboardQuery = useQuery({
        queryKey: ['reports', 'dashboard'],
        queryFn: () => getDashboardMetrics(30),
    })

    const trendQuery = useQuery({
        queryKey: ['reports', 'trend'],
        queryFn: () => getSalesTrend(30),
    })

    const paymentQuery = useQuery({
        queryKey: ['reports', 'payments'],
        queryFn: () => getPaymentBreakdown(30),
    })

    const productsQuery = useQuery({
        queryKey: ['reports', 'products'],
        queryFn: () => getProductsReport(8),
    })

    const loading = dashboardQuery.isLoading || trendQuery.isLoading || paymentQuery.isLoading || productsQuery.isLoading
    const error = dashboardQuery.isError || trendQuery.isError || paymentQuery.isError || productsQuery.isError

    const salesTrend = useMemo(() => (trendQuery.data || []).map(row => ({
        date: dayjs(row.date).format('MMM DD'),
        sales: Number(row.sales || 0),
        orders: Number(row.orders || 0),
    })), [trendQuery.data])

    const paymentBreakdown = useMemo(() => (paymentQuery.data || []).map((row, i) => ({
        name: row.method,
        value: Number(row.percentage || 0),
        amount: Number(row.amount || 0),
        color: COLORS[i % COLORS.length],
    })), [paymentQuery.data])

    const topProducts = useMemo(() => (productsQuery.data || []).map(row => ({
        name: row.productName,
        revenue: Number(row.totalRevenue || 0),
    })), [productsQuery.data])

    const busyHours = useMemo(() => {
        const grouped = new Map()
        for (const row of salesTrend) {
            if (!grouped.has(row.date)) grouped.set(row.date, 0)
            grouped.set(row.date, grouped.get(row.date) + Number(row.orders || 0))
        }
        return Array.from(grouped.entries()).slice(-12).map(([hour, transactions]) => ({ hour, transactions }))
    }, [salesTrend])

    const totalSalesVal = Number(dashboardQuery.data?.totalSales || salesTrend.reduce((s, d) => s + d.sales, 0))
    const totalOrdersVal = Number(dashboardQuery.data?.totalOrders || salesTrend.reduce((s, d) => s + d.orders, 0))

    const summary = [
        { label: '30-Day Revenue', value: formatCurrency(totalSalesVal), icon: TrendingUp, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/20' },
        { label: 'Total Orders', value: totalOrdersVal.toLocaleString(), icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
        { label: 'Avg Order Value', value: formatCurrency(totalOrdersVal ? totalSalesVal / totalOrdersVal : 0), icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        { label: 'Peak Day', value: salesTrend.reduce((best, cur) => cur.orders > (best.orders || 0) ? cur : best, {}).date || '-', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    ]

    const exportCSV = async () => {
        try {
            const Papa = (await import('papaparse')).default
            const rows = salesTrend.map(d => ({
                Date: d.date,
                Sales: d.sales.toFixed(2),
                Orders: d.orders,
            }))
            const csv = Papa.unparse(rows)
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `retailtouch-report-${dayjs().format('YYYY-MM-DD')}.csv`
            a.click()
            URL.revokeObjectURL(url)
            toast.success('CSV downloaded')
        } catch {
            toast.error('Failed to generate CSV report')
        }
    }

    const exportPDF = async () => {
        try {
            const [{ jsPDF }, autoTableModule] = await Promise.all([
                import('jspdf'),
                import('jspdf-autotable'),
            ])
            const doc = new jsPDF()
            const autoTable = autoTableModule.default

            doc.setFontSize(20)
            doc.setTextColor(66, 64, 210)
            doc.text('RetailTouch POS - Sales Report', 14, 20)

            doc.setFontSize(10)
            doc.setTextColor(100, 100, 100)
            doc.text(`Generated: ${dayjs().format('DD MMM YYYY, HH:mm')}`, 14, 28)

            doc.setFontSize(12)
            doc.setTextColor(40, 40, 40)
            doc.text(`Total Sales (30 days): ${parseCurrency(totalSalesVal)}`, 14, 40)
            doc.text(`Total Orders: ${totalOrdersVal}`, 14, 48)
            doc.text(`Avg Order Value: ${parseCurrency(totalOrdersVal ? totalSalesVal / totalOrdersVal : 0)}`, 14, 56)

            doc.setFontSize(13)
            doc.setTextColor(66, 64, 210)
            doc.text('Daily Sales Trend', 14, 68)

            autoTable(doc, {
                startY: 72,
                head: [['Date', 'Sales (INR)', 'Orders']],
                body: salesTrend.map(d => [d.date, parseCurrency(d.sales), d.orders]),
                headStyles: { fillColor: [66, 64, 210] },
                alternateRowStyles: { fillColor: [245, 247, 255] },
                styles: { fontSize: 8 },
                margin: { left: 14, right: 14 },
            })

            const y2 = doc.lastAutoTable.finalY + 12
            doc.setFontSize(13)
            doc.setTextColor(66, 64, 210)
            doc.text('Top Products', 14, y2)

            autoTable(doc, {
                startY: y2 + 4,
                head: [['Product', 'Revenue (INR)']],
                body: topProducts.map(p => [p.name, parseCurrency(p.revenue)]),
                headStyles: { fillColor: [66, 64, 210] },
                alternateRowStyles: { fillColor: [245, 247, 255] },
                styles: { fontSize: 9 },
                margin: { left: 14, right: 14 },
            })

            const y3 = doc.lastAutoTable.finalY + 12
            doc.setFontSize(13)
            doc.setTextColor(66, 64, 210)
            doc.text('Payment Breakdown', 14, y3)

            autoTable(doc, {
                startY: y3 + 4,
                head: [['Method', 'Amount', 'Share (%)']],
                body: paymentBreakdown.map(p => [p.name, parseCurrency(p.amount), `${p.value}%`]),
                headStyles: { fillColor: [66, 64, 210] },
                styles: { fontSize: 9 },
                margin: { left: 14, right: 14 },
            })

            doc.save(`retailtouch-report-${dayjs().format('YYYY-MM-DD')}.pdf`)
            toast.success('PDF downloaded')
        } catch {
            toast.error('Failed to generate PDF report')
        }
    }

    if (loading) {
        return (
            <div className="p-10 text-center text-gray-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading reports...
            </div>
        )
    }

    if (error) {
        return <div className="p-10 text-center text-red-500">Failed to load report data</div>
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">Reports and Analytics</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Last 30 days performance</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary btn px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-900/30" onClick={() => setReadModal('X')}>
                        X-Read
                    </button>
                    <button className="btn-secondary btn px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/30 mr-2" onClick={() => setReadModal('Z')}>
                        Z-Read
                    </button>
                    <button className="btn-secondary btn gap-2" onClick={exportCSV}>
                        <Download className="w-4 h-4" /> CSV
                    </button>
                    <button className="btn-primary btn gap-2" onClick={exportPDF}>
                        <FileText className="w-4 h-4" /> PDF
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {summary.map(s => (
                    <div key={s.label} className="card p-5 flex items-center gap-4">
                        <div className={`w-11 h-11 ${s.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                            <s.icon className={`w-5 h-5 ${s.color}`} />
                        </div>
                        <div>
                            <div className="text-xl font-bold dark:text-white">{s.value}</div>
                            <div className="text-xs text-gray-400">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card p-5">
                <h2 className="font-semibold text-gray-800 dark:text-white mb-4">Sales Trend (Last 30 Days)</h2>
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={salesTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} interval={4} />
                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey="sales" name="Sales" stroke="#6272f8" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="orders" name="Orders" stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="card p-5">
                    <h2 className="font-semibold text-gray-800 dark:text-white mb-4">Payment Breakdown</h2>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={paymentBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                                {paymentBreakdown.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(v) => `${v}%`} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="card p-5 lg:col-span-2">
                    <h2 className="font-semibold text-gray-800 dark:text-white mb-4">Top Products by Revenue</h2>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={topProducts} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(150,150,150,0.1)" />
                            <XAxis type="number" tick={{ fontSize: 10 }} />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={160} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="revenue" name="Revenue" fill="#6272f8" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="card p-5">
                <h2 className="font-semibold text-gray-800 dark:text-white mb-4">Busy Windows - Transaction Volume</h2>
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={busyHours}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" />
                        <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="transactions" name="Transactions" radius={[4, 4, 0, 0]}>
                            {busyHours.map((entry, i) => (
                                <Cell key={i} fill={entry.transactions >= 80 ? '#6272f8' : entry.transactions >= 50 ? '#a5bafd' : '#e0eaff'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {readModal && <RegisterReadModal type={readModal} onClose={() => setReadModal(null)} />}
        </div>
    )
}