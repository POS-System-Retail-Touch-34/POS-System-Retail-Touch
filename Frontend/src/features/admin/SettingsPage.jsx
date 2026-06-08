import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    Settings,
    ShieldAlert,
    Save,
    Shield,
    Receipt,
    CreditCard,
    Server,
    Database,
    RefreshCw,
    Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useRole from '../../hooks/useRole'
import {
    backupDatabase,
    clearCache,
    getAuditLogs,
    getPaymentSettings,
    getSecuritySettings,
    getSystemSettings,
    getTaxGstSettings,
    restoreDatabase,
    updatePaymentSettings,
    updateSystemSettings,
    updateTaxGstSettings,
    verifySettingsPassword,
} from '../../services/settingsService'
import { useDispatch } from 'react-redux'
import { updateGstRates, updateLoyaltyConversionRate } from '../settings/settingsSlice'
import ConfirmModal from '../../components/ConfirmModal'

function readError(err, fallback) {
    const data = err?.response?.data
    if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        const first = Object.values(data.data)[0]
        if (first) return String(first)
    }
    return data?.message || err?.message || fallback
}

export default function SettingsPage() {
    const { isAdmin } = useRole()
    const queryClient = useQueryClient()
    const dispatch = useDispatch()

    const [taxForm, setTaxForm] = useState({
        cgstPercent: 9,
        sgstPercent: 9,
        igstPercent: 18,
        taxInclusive: false,
        defaultGstPercent: 18,
        hsnCodeRequired: false,
    })
    const [paymentForm, setPaymentForm] = useState({
        razorpayKeyId: '',
        razorpaySecret: '',
        razorpayEnabled: true,
        cashEnabled: true,
        upiEnabled: true,
        cardEnabled: true,
        walletEnabled: false,
        password: '',
    })
    const [systemForm, setSystemForm] = useState({
        maintenanceMode: false,
        idleTimeoutMinutes: 15,
        systemVersion: '1.0.0',
        loyaltyConversionRate: 1,
    })

    const [confirmAction, setConfirmAction] = useState(null)
    const [taxPassword, setTaxPassword] = useState('')

    const securityQuery = useQuery({ queryKey: ['settings', 'security'], queryFn: getSecuritySettings, enabled: isAdmin })
    const taxQuery = useQuery({ queryKey: ['settings', 'tax'], queryFn: getTaxGstSettings, enabled: isAdmin })
    const paymentQuery = useQuery({ queryKey: ['settings', 'payment'], queryFn: getPaymentSettings, enabled: isAdmin })
    const systemQuery = useQuery({ queryKey: ['settings', 'system'], queryFn: getSystemSettings, enabled: isAdmin })
    const auditQuery = useQuery({ queryKey: ['settings', 'audit'], queryFn: getAuditLogs, enabled: isAdmin })

    useEffect(() => {
        if (taxQuery.data) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTaxForm({
                cgstPercent: Number(taxQuery.data.cgstPercent || 0),
                sgstPercent: Number(taxQuery.data.sgstPercent || 0),
                igstPercent: Number(taxQuery.data.igstPercent || 0),
                taxInclusive: !!taxQuery.data.taxInclusive,
                defaultGstPercent: Number(taxQuery.data.defaultGstPercent || 0),
                hsnCodeRequired: !!taxQuery.data.hsnCodeRequired,
            })
        }
    }, [taxQuery.data])

    useEffect(() => {
        if (paymentQuery.data) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPaymentForm(prev => ({
                ...prev,
                razorpayKeyId: paymentQuery.data.razorpayKeyId || '',
                razorpaySecret: '',
                razorpayEnabled: !!paymentQuery.data.razorpayEnabled,
                cashEnabled: !!paymentQuery.data.cashEnabled,
                upiEnabled: !!paymentQuery.data.upiEnabled,
                cardEnabled: !!paymentQuery.data.cardEnabled,
                walletEnabled: !!paymentQuery.data.walletEnabled,
                password: '',
            }))
        }
    }, [paymentQuery.data])

    useEffect(() => {
        if (systemQuery.data) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSystemForm({
                maintenanceMode: !!systemQuery.data.maintenanceMode,
                idleTimeoutMinutes: Number(systemQuery.data.idleTimeoutMinutes || 15),
                systemVersion: systemQuery.data.systemVersion || '1.0.0',
                loyaltyConversionRate: Number(systemQuery.data.loyaltyConversionRate || 1),
            })
            dispatch(updateLoyaltyConversionRate(Number(systemQuery.data.loyaltyConversionRate || 1)))
        }
    }, [dispatch, systemQuery.data])

    const refetchAll = () => {
        queryClient.invalidateQueries({ queryKey: ['settings'] })
    }

    const taxMutation = useMutation({
        mutationFn: updateTaxGstSettings,
        onSuccess: (data) => {
            toast.success('GST settings updated')
            dispatch(updateGstRates({
                cgst: Number(data.cgstPercent || 0),
                sgst: Number(data.sgstPercent || 0),
                igst: Number(data.igstPercent || 0),
            }))
            setTaxPassword('')
            refetchAll()
        },
        onError: (err) => toast.error(readError(err, 'Failed to update GST settings')),
    })

    const paymentMutation = useMutation({
        mutationFn: updatePaymentSettings,
        onSuccess: () => {
            toast.success('Payment settings updated')
            setPaymentForm(prev => ({ ...prev, password: '', razorpaySecret: '' }))
            refetchAll()
        },
        onError: (err) => toast.error(readError(err, 'Failed to update payment settings')),
    })

    const systemMutation = useMutation({
        mutationFn: updateSystemSettings,
        onSuccess: (data) => {
            toast.success('System settings updated')
            dispatch(updateLoyaltyConversionRate(Number(data?.loyaltyConversionRate || systemForm.loyaltyConversionRate || 1)))
            refetchAll()
        },
        onError: (err) => toast.error(readError(err, 'Failed to update system settings')),
    })

    const backupMutation = useMutation({
        mutationFn: backupDatabase,
        onSuccess: () => {
            toast.success('Backup request submitted')
            refetchAll()
        },
        onError: (err) => toast.error(readError(err, 'Backup failed')),
    })

    const restoreMutation = useMutation({
        mutationFn: restoreDatabase,
        onSuccess: () => {
            toast.success('Restore request submitted')
            refetchAll()
        },
        onError: (err) => toast.error(readError(err, 'Restore failed')),
    })

    const clearCacheMutation = useMutation({
        mutationFn: clearCache,
        onSuccess: () => {
            toast.success('Cache cleared')
            refetchAll()
        },
        onError: (err) => toast.error(readError(err, 'Cache clear failed')),
    })

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                <ShieldAlert className="w-16 h-16 opacity-30 text-red-500" />
                <h2 className="text-xl font-bold">Admin Access Required</h2>
                <p>You do not have permission to view or manage system settings.</p>
            </div>
        )
    }

    const handleTaxSubmit = () => setConfirmAction({ type: 'TAX' })

    const confirmTaxChange = async () => {
        if (!taxPassword.trim()) {
            toast.error('Admin password is required')
            return
        }
        try {
            const verified = await verifySettingsPassword(taxPassword)
            if (!verified?.valid) {
                toast.error('Password verification failed')
                return
            }
            await taxMutation.mutateAsync({ ...taxForm, password: taxPassword })
        } catch (err) {
            toast.error(readError(err, 'Password verification failed'))
        }
    }

    const savePayment = () => {
        paymentMutation.mutate({ ...paymentForm })
    }

    const saveSystem = () => {
        systemMutation.mutate({
            maintenanceMode: systemForm.maintenanceMode,
            idleTimeoutMinutes: systemForm.idleTimeoutMinutes,
            loyaltyConversionRate: Number(systemForm.loyaltyConversionRate || 1),
        })
    }

    const handleConfirmAction = async () => {
        const action = confirmAction
        setConfirmAction(null)
        if (!action) return

        if (action.type === 'TAX') {
            await confirmTaxChange()
            return
        }
        if (action.type === 'PAYMENT') {
            savePayment()
            return
        }
        if (action.type === 'SYSTEM') {
            saveSystem()
            return
        }
        if (action.type === 'CLEAR_CACHE') {
            clearCacheMutation.mutate()
            return
        }
        if (action.type === 'MAINTENANCE_TOGGLE') {
            setSystemForm(prev => ({ ...prev, maintenanceMode: !!action.value }))
        }
    }

    const securityData = securityQuery.data || {}
    const auditLogs = auditQuery.data || []
    const loading =
        securityQuery.isLoading ||
        taxQuery.isLoading ||
        paymentQuery.isLoading ||
        systemQuery.isLoading ||
        auditQuery.isLoading
    const hasError =
        securityQuery.isError ||
        taxQuery.isError ||
        paymentQuery.isError ||
        systemQuery.isError ||
        auditQuery.isError

    if (loading) {
        return <div className="p-10 text-center text-gray-500">Loading settings...</div>
    }

    if (hasError) {
        return (
            <div className="p-10 text-center text-red-500 space-y-3">
                <div>Failed to load settings</div>
                <button className="btn-secondary btn" onClick={refetchAll}>Retry</button>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white flex items-center gap-3">
                        <Settings className="w-6 h-6 text-gray-400" /> Admin Settings
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Enterprise security, tax, payment and system controls</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="card p-6 space-y-4">
                    <h2 className="font-bold text-lg dark:text-white flex items-center gap-2"><Shield className="w-5 h-5 text-red-500" /> SECURITY</h2>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        <div>Idle Timeout: <strong>{securityData.idleTimeoutMinutes ?? '-'}</strong> minutes</div>
                        <div>
                            GST Compliance: <strong>{securityData.complianceStatus?.gstConfigured ? 'Configured' : 'Not configured'}</strong>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="text-sm font-semibold">Recent Security Alerts</div>
                        <div className="max-h-36 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-lg p-2 text-xs">
                            {(securityData.recentSecurityAlerts || []).slice(0, 8).map(item => (
                                <div key={item.id} className="py-1 border-b last:border-b-0 border-gray-100 dark:border-gray-700">
                                    <strong>{item.action}</strong> by {item.changedBy} ({item.ipAddress || 'n/a'})
                                </div>
                            ))}
                            {!securityData.recentSecurityAlerts?.length && <div className="text-gray-400">No alerts</div>}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="text-sm font-semibold">Failed Login Attempts</div>
                        <div className="max-h-32 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-lg p-2 text-xs">
                            {(securityData.failedLoginAttempts || []).slice(0, 8).map(item => (
                                <div key={item.id} className="py-1 border-b last:border-b-0 border-gray-100 dark:border-gray-700">
                                    {item.changedBy} at {item.timestamp}
                                </div>
                            ))}
                            {!securityData.failedLoginAttempts?.length && <div className="text-gray-400">No failed attempts</div>}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="text-sm font-semibold">Suspicious Activity</div>
                        <div className="max-h-32 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-lg p-2 text-xs">
                            {(securityData.suspiciousActivityLog || []).slice(0, 8).map(item => (
                                <div key={item.id} className="py-1 border-b last:border-b-0 border-gray-100 dark:border-gray-700">
                                    {item.newValue || item.action}
                                </div>
                            ))}
                            {!securityData.suspiciousActivityLog?.length && <div className="text-gray-400">No suspicious events</div>}
                        </div>
                    </div>
                </section>

                <section className="card p-6 space-y-4">
                    <h2 className="font-bold text-lg dark:text-white flex items-center gap-2"><Receipt className="w-5 h-5 text-emerald-500" /> TAX and GST SETTINGS</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">CGST %</label>
                            <input className="input" type="number" value={taxForm.cgstPercent} onChange={e => setTaxForm(prev => ({ ...prev, cgstPercent: Number(e.target.value) }))} />
                        </div>
                        <div>
                            <label className="label">SGST %</label>
                            <input className="input" type="number" value={taxForm.sgstPercent} onChange={e => setTaxForm(prev => ({ ...prev, sgstPercent: Number(e.target.value) }))} />
                        </div>
                        <div>
                            <label className="label">IGST %</label>
                            <input className="input" type="number" value={taxForm.igstPercent} onChange={e => setTaxForm(prev => ({ ...prev, igstPercent: Number(e.target.value) }))} />
                        </div>
                        <div>
                            <label className="label">Default GST %</label>
                            <input className="input" type="number" value={taxForm.defaultGstPercent} onChange={e => setTaxForm(prev => ({ ...prev, defaultGstPercent: Number(e.target.value) }))} />
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={taxForm.taxInclusive} onChange={e => setTaxForm(prev => ({ ...prev, taxInclusive: e.target.checked }))} />
                        Tax Inclusive Pricing
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={taxForm.hsnCodeRequired} onChange={e => setTaxForm(prev => ({ ...prev, hsnCodeRequired: e.target.checked }))} />
                        Require HSN Code
                    </label>
                    <div>
                        <label className="label">Admin Password</label>
                        <input
                            className="input"
                            type="password"
                            value={taxPassword}
                            onChange={e => setTaxPassword(e.target.value)}
                            placeholder="Required to save GST"
                        />
                    </div>
                    <button className="btn-primary btn gap-2" onClick={handleTaxSubmit} disabled={taxMutation.isPending}>
                        <Save className="w-4 h-4" /> Save Tax Settings
                    </button>
                </section>

                <section className="card p-6 space-y-4">
                    <h2 className="font-bold text-lg dark:text-white flex items-center gap-2"><CreditCard className="w-5 h-5 text-blue-500" /> PAYMENT SETTINGS</h2>
                    <div>
                        <label className="label">Razorpay Key ID</label>
                        <input className="input" value={paymentForm.razorpayKeyId} onChange={e => setPaymentForm(prev => ({ ...prev, razorpayKeyId: e.target.value }))} />
                    </div>
                    <div>
                        <label className="label">Razorpay Secret (new value optional)</label>
                        <input className="input" type="password" value={paymentForm.razorpaySecret} onChange={e => setPaymentForm(prev => ({ ...prev, razorpaySecret: e.target.value }))} placeholder={paymentQuery.data?.razorpaySecret || '****'} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        {[
                            ['razorpayEnabled', 'Enable Razorpay'],
                            ['cashEnabled', 'Enable Cash'],
                            ['upiEnabled', 'Enable UPI'],
                            ['cardEnabled', 'Enable Card'],
                            ['walletEnabled', 'Enable Wallet'],
                        ].map(([key, label]) => (
                            <label key={key} className="flex items-center gap-2">
                                <input type="checkbox" checked={!!paymentForm[key]} onChange={e => setPaymentForm(prev => ({ ...prev, [key]: e.target.checked }))} />
                                {label}
                            </label>
                        ))}
                    </div>
                    <div>
                        <label className="label">Admin Password</label>
                        <input className="input" type="password" value={paymentForm.password} onChange={e => setPaymentForm(prev => ({ ...prev, password: e.target.value }))} />
                    </div>
                    <button
                        className="btn-primary btn"
                        onClick={() => setConfirmAction({ type: 'PAYMENT' })}
                        disabled={paymentMutation.isPending}
                    >
                        {paymentMutation.isPending ? 'Saving...' : 'Save Payment Settings'}
                    </button>
                </section>

                <section className="card p-6 space-y-4">
                    <h2 className="font-bold text-lg dark:text-white flex items-center gap-2"><Server className="w-5 h-5 text-purple-500" /> SYSTEM SETTINGS</h2>
                    <div className="text-sm text-gray-500">System Version: <strong>{systemForm.systemVersion}</strong></div>
                    <div>
                        <label className="label">Idle Timeout (minutes)</label>
                        <input className="input" type="number" min="1" value={systemForm.idleTimeoutMinutes} onChange={e => setSystemForm(prev => ({ ...prev, idleTimeoutMinutes: Number(e.target.value) }))} />
                    </div>
                    <div>
                        <label className="label">Loyalty Conversion (currency per point)</label>
                        <input
                            className="input"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={systemForm.loyaltyConversionRate}
                            onChange={e => setSystemForm(prev => ({ ...prev, loyaltyConversionRate: Number(e.target.value) }))}
                        />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={systemForm.maintenanceMode}
                            onChange={e => setConfirmAction({ type: 'MAINTENANCE_TOGGLE', value: e.target.checked })}
                        />
                        Maintenance Mode (blocks non-admin APIs)
                    </label>
                    <div className="flex flex-wrap gap-2">
                        <button className="btn-secondary btn gap-2" onClick={() => backupMutation.mutate()} disabled={backupMutation.isPending}><Database className="w-4 h-4" /> Backup Database</button>
                        <button className="btn-secondary btn gap-2" onClick={() => restoreMutation.mutate()} disabled={restoreMutation.isPending}><RefreshCw className="w-4 h-4" /> Restore Database</button>
                        <button
                            className="btn-secondary btn gap-2"
                            onClick={() => setConfirmAction({ type: 'CLEAR_CACHE' })}
                            disabled={clearCacheMutation.isPending}
                        >
                            <Trash2 className="w-4 h-4" /> {clearCacheMutation.isPending ? 'Clearing...' : 'Clear Cache'}
                        </button>
                    </div>
                    <button
                        className="btn-primary btn"
                        onClick={() => setConfirmAction({ type: 'SYSTEM' })}
                        disabled={systemMutation.isPending}
                    >
                        {systemMutation.isPending ? 'Saving...' : 'Save System Settings'}
                    </button>
                </section>
            </div>

            <section className="card p-6 space-y-3">
                <h2 className="font-bold text-lg dark:text-white">Audit Log Viewer</h2>
                <div className="max-h-72 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-lg">
                    <table className="table text-xs">
                        <thead>
                            <tr>
                                <th>Action</th>
                                <th>Module</th>
                                <th>Changed By</th>
                                <th>Role</th>
                                <th>Timestamp</th>
                                <th>IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {auditLogs.map(log => (
                                <tr key={log.id}>
                                    <td>{log.action}</td>
                                    <td>{log.module}</td>
                                    <td>{log.changedBy}</td>
                                    <td>{log.role}</td>
                                    <td>{log.timestamp}</td>
                                    <td>{log.ipAddress}</td>
                                </tr>
                            ))}
                            {auditLogs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-4 text-gray-400">No audit logs yet</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <ConfirmModal
                open={!!confirmAction}
                onCancel={() => setConfirmAction(null)}
                onConfirm={handleConfirmAction}
                loading={
                    taxMutation.isPending ||
                    paymentMutation.isPending ||
                    systemMutation.isPending ||
                    clearCacheMutation.isPending
                }
            />
        </div>
    )
}
