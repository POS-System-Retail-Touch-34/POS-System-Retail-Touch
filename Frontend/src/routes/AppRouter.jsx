import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

const LoginPage = lazy(() => import('../features/auth/LoginPage'))
const ForbiddenPage = lazy(() => import('../features/auth/ForbiddenPage'))
const MainLayout = lazy(() => import('../layouts/MainLayout'))
const SalesPage = lazy(() => import('../features/sales/SalesPage'))
const InventoryPage = lazy(() => import('../features/inventory/InventoryPage'))
const CustomersPage = lazy(() => import('../features/customers/CustomersPage'))
const ReportsPage = lazy(() => import('../features/reports/ReportsPage'))
const RefundsPage = lazy(() => import('../features/sales/RefundsPage'))
const UsersPage = lazy(() => import('../features/admin/UsersPage'))
const SettingsPage = lazy(() => import('../features/admin/SettingsPage'))

function RouteLoader() {
    return (
        <div className="min-h-screen flex items-center justify-center text-gray-500 dark:text-gray-400">
            Loading...
        </div>
    )
}

function ProtectedRoute({ children, allowedRoles }) {
    const { isAuthenticated, user } = useSelector(s => s.auth)
    if (!isAuthenticated) return <Navigate to="/login" replace />
    if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/403" replace />
    return children
}

export default function AppRouter() {
    const { isAuthenticated } = useSelector(s => s.auth)
    return (
        <Suspense fallback={<RouteLoader />}>
            <Routes>
                <Route
                    path="/login"
                    element={isAuthenticated ? <Navigate to="/pos" replace /> : <LoginPage />}
                />
                <Route
                    path="/403"
                    element={isAuthenticated ? <ForbiddenPage /> : <Navigate to="/login" replace />}
                />
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <MainLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Navigate to="/pos" replace />} />
                    <Route path="pos" element={<SalesPage />} />
                    <Route
                        path="inventory"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'STORE_MANAGER']}>
                                <InventoryPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="customers" element={<CustomersPage />} />
                    <Route
                        path="reports"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'STORE_MANAGER']}>
                                <ReportsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="refunds"
                        element={
                            <ProtectedRoute>
                                <RefundsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="users"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN']}>
                                <UsersPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="settings"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN']}>
                                <SettingsPage />
                            </ProtectedRoute>
                        }
                    />
                </Route>
                <Route path="*" element={<Navigate to="/pos" replace />} />
            </Routes>
        </Suspense>
    )
}
