import { useState, useRef, useEffect, createElement } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
    ShoppingCart, Package, Users, BarChart3,
    LogOut, Menu, X, Moon, Sun, Store, Bell, CheckCircle2, Info
} from 'lucide-react'
import { logout } from '../features/auth/authSlice'
import { toggleDarkMode } from '../app/uiSlice'
import { addNotification, isNotificationVisibleToUser, markAsRead, updateNotificationStatus } from '../features/notifications/notificationsSlice'
import useRole from '../hooks/useRole'
import clsx from 'clsx'
import ConfirmModal from '../components/ConfirmModal'
import toast from 'react-hot-toast'

function RoleBadge({ role }) {
    if (role === 'ADMIN') return <span className="badge bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Admin</span>
    if (role === 'STORE_MANAGER') return <span className="badge bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">Manager</span>
    return <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Cashier</span>
}

export default function MainLayout() {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { user } = useSelector(s => s.auth)
    const darkMode = useSelector(s => s.ui.darkMode)
    const cartCount = useSelector(s => s.cart.items.reduce((a, i) => a + i.qty, 0))
    const notifications = useSelector(s => s.notifications.list)

    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [showNotifications, setShowNotifications] = useState(false)
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
    const notifRef = useRef(null)

    const roleState = useRole()
    const username = user?.username || 'guest'

    const visibleNotifications = notifications.filter(n => isNotificationVisibleToUser(n, user))
    const unreadCount = visibleNotifications.filter(n => !n.readBy.includes(username)).length

    const handleForwardProductRequest = (notification) => {
        const originalReference = notification.referenceId || notification.id
        dispatch(addNotification({
            type: 'PRODUCT_REQUEST_FORWARDED',
            title: 'Product Request Forwarded',
            message: notification.message,
            senderName: username,
            senderRole: roleState.role,
            referenceId: `FWD-${originalReference}`,
            targetRoles: ['ADMIN'],
            data: {
                originalNotificationId: notification.id,
                originalReferenceId: originalReference,
                forwardedFrom: notification.senderName,
            },
        }))
        dispatch(updateNotificationStatus({ id: notification.id, status: 'FORWARDED' }))
        toast.success('Product request forwarded to Admin')
    }

    useEffect(() => {
        function handleClickOutside(event) {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleLogout = () => {
        dispatch(logout())
        navigate('/login')
    }

    const navList = [
        { path: '/pos', icon: ShoppingCart, label: 'Sales Register', perm: 'always' },
        { path: '/refunds', icon: Store, label: 'Refunds', perm: 'canRequestRefund' },
        { path: '/inventory', icon: Package, label: 'Inventory', perm: 'canViewInventory' },
        { path: '/customers', icon: Users, label: 'Customers', perm: 'canViewCustomers' },
        { path: '/reports', icon: BarChart3, label: 'Reports', perm: 'canViewReports' },
        { path: '/users', icon: Users, label: 'Users', perm: 'canManageUsers' },
        { path: '/settings', icon: Menu, label: 'Settings', perm: 'canManageSettings' },
    ]

    const visibleNav = navList.filter(n => n.perm === 'always' || roleState[n.perm])

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-dark-900 transition-colors duration-200">
            {/* Sidebar */}
            <aside className={clsx(
                'flex flex-col bg-white dark:bg-dark-800 border-r border-gray-100 dark:border-gray-700/50 transition-all duration-300 z-30',
                sidebarOpen ? 'w-60' : 'w-16'
            )}>
                {/* Logo */}
                <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100 dark:border-gray-700/50">
                    <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/30">
                        <Store className="w-5 h-5 text-white" />
                    </div>
                    {sidebarOpen && (
                        <div>
                            <div className="font-bold text-gray-900 dark:text-white text-sm leading-tight">RetailTouch</div>
                            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">POS System</div>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                    {visibleNav.map(({ path, icon, label }) => (
                        <NavLink
                            key={path}
                            to={path}
                            className={({ isActive }) => clsx(
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative',
                                isActive
                                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                            )}
                            title={!sidebarOpen ? label : undefined}
                        >
                            {createElement(icon, { className: 'w-5 h-5 flex-shrink-0' })}
                            {sidebarOpen && <span>{label}</span>}
                            {path === '/pos' && cartCount > 0 && sidebarOpen && (
                                <span className="ml-auto badge badge-primary">{cartCount}</span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* User + Logout */}
                <div className="px-2 py-3 border-t border-gray-100 dark:border-gray-700/50 space-y-1">
                    {sidebarOpen && (
                        <div className="flex items-center gap-3 px-3 py-2 mb-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {user?.avatar || 'U'}
                            </div>
                            <div className="min-w-0 flex flex-col items-start">
                                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{user?.username}</div>
                                <div className="mt-0.5"><RoleBadge role={roleState.role} /></div>
                            </div>
                        </div>
                    )}
                    <button
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all"
                        onClick={() => setShowLogoutConfirm(true)}
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        {sidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Topbar */}
                <header className="h-16 bg-white dark:bg-dark-800 border-b border-gray-100 dark:border-gray-700/50 flex items-center px-4 gap-4 flex-shrink-0">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="btn-ghost p-2 rounded-xl"
                    >
                        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>

                    <div className="flex-1" />

                    {/* Role Badge inline for compact screens */}
                    {!sidebarOpen && <RoleBadge role={roleState.role} />}

                    {/* Notifications */}
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={clsx(
                                "btn-secondary p-2 rounded-xl relative transition-all",
                                showNotifications && "bg-gray-200 dark:bg-gray-700"
                            )}
                            title="Notifications"
                        >
                            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-dark-800">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 mt-3 w-80 max-h-96 overflow-y-auto bg-white dark:bg-dark-800 border border-gray-100 dark:border-gray-700 shadow-xl rounded-2xl z-50 flex flex-col">
                                <div className="p-4 border-b border-gray-100 dark:border-gray-700/50 flex justify-between items-center sticky top-0 bg-white/95 dark:bg-dark-800/95 backdrop-blur-sm">
                                    <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
                                    {unreadCount > 0 && <span className="badge badge-danger text-xs">{unreadCount} unread</span>}
                                </div>
                                <div className="p-2 space-y-1">
                                    {visibleNotifications.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-gray-500">No new notifications</div>
                                    ) : (
                                        visibleNotifications.map(n => {
                                            const isUnread = !n.readBy.includes(username)
                                            const canForwardToAdmin =
                                                roleState.isManager &&
                                                n.type === 'PRODUCT_REQUEST' &&
                                                n.senderRole === 'CASHIER' &&
                                                n.status !== 'FORWARDED'
                                            return (
                                                <div
                                                    key={n.id}
                                                    className={clsx(
                                                        "w-full text-left p-3 rounded-xl transition-all",
                                                        isUnread ? "bg-primary-50 dark:bg-primary-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                                    )}
                                                >
                                                    <button
                                                        onClick={() => dispatch(markAsRead({ id: n.id, username }))}
                                                        className="w-full text-left"
                                                    >
                                                        <div className="flex gap-3">
                                                            <div className="flex-shrink-0 mt-0.5">
                                                                {n.type === 'REFUND_REQUEST' ? <CheckCircle2 className="w-4 h-4 text-orange-500" /> : <Info className="w-4 h-4 text-blue-500" />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className={clsx("text-sm font-semibold", isUnread ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300")}>
                                                                    {n.title}
                                                                </div>
                                                                <div className="text-xs text-gray-500 mt-1 line-clamp-2">{n.message}</div>
                                                                <div className="text-[10px] text-gray-400 mt-1.5">
                                                                    From: {n.senderName} ({n.senderRole}) | Ref: {n.referenceId}
                                                                </div>
                                                                <div className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                                                            </div>
                                                        </div>
                                                    </button>
                                                    {canForwardToAdmin && (
                                                        <div className="mt-2 flex justify-end">
                                                            <button
                                                                className="btn-secondary btn text-xs"
                                                                onClick={() => handleForwardProductRequest(n)}
                                                            >
                                                                Forward to Admin
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Dark mode toggle */}
                    <button
                        onClick={() => dispatch(toggleDarkMode())}
                        className="btn-secondary p-2 rounded-xl"
                        title="Toggle dark mode"
                    >
                        {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
                    </button>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
            <ConfirmModal
                open={showLogoutConfirm}
                title="Confirm Logout"
                message="Are you sure you want to logout?"
                confirmText="Logout"
                onCancel={() => setShowLogoutConfirm(false)}
                onConfirm={() => {
                    setShowLogoutConfirm(false)
                    handleLogout()
                }}
            />
        </div>
    )
}
