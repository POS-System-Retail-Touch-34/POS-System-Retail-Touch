import { useSelector } from 'react-redux'

export default function useRole() {
    const { user } = useSelector(state => state.auth)
    const role = user?.role || 'CASHIER'

    const isCashier = role === 'CASHIER'
    const isManager = role === 'STORE_MANAGER'
    const isAdmin = role === 'ADMIN'

    return {
        role,
        isCashier,
        isManager,
        isAdmin,
        canViewInventory: isManager || isAdmin,
        canEditInventory: isAdmin,
        canViewCustomers: true,
        canViewReports: isManager || isAdmin, // Manager+
        canProcessRefund: isManager || isAdmin, // Manager+
        canRequestRefund: true, // Everyone
        canOverridePrice: isManager || isAdmin, // Manager+
        canManageUsers: isAdmin,
        canManageSettings: isAdmin,
    }
}
