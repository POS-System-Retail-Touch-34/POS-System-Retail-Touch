import { Component, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Search, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import useRole from '../../hooks/useRole'
import UserFormModal from './UserFormModal'
import ConfirmModal from '../../components/ConfirmModal'
import { createUser, deleteUser, getUsers, updateUser } from '../../services/authService'
import { useSelector } from 'react-redux'

function parseApiError(error, fallback) {
    const data = error?.response?.data
    if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        const first = Object.values(data.data)[0]
        if (first) return String(first)
    }
    return data?.message || error?.message || fallback
}

class ModalErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError() {
        return { hasError: true }
    }

    componentDidUpdate(prevProps) {
        if (!prevProps.open && this.props.open && this.state.hasError) {
            this.setState({ hasError: false })
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="modal-overlay" onClick={this.props.onClose}>
                    <div className="modal-box max-w-sm p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold dark:text-white">Failed to load form</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Please close and try again.</p>
                        <div className="flex justify-end mt-4">
                            <button className="btn-primary btn" onClick={this.props.onClose}>Close</button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

function roleBadge(role) {
    if (role === 'ADMIN') return <span className="badge bg-red-100 text-red-700">Admin</span>
    if (role === 'STORE_MANAGER') return <span className="badge bg-orange-100 text-orange-700">Manager</span>
    return <span className="badge bg-blue-100 text-blue-700">Cashier</span>
}

export default function UsersPage() {
    const queryClient = useQueryClient()
    const { isAdmin } = useRole()
    const currentUser = useSelector(s => s.auth.user)

    const [q, setQ] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [editUser, setEditUser] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [statusTargetId, setStatusTargetId] = useState(null)

    const { data: users = [], isLoading, isError } = useQuery({
        queryKey: ['users'],
        queryFn: getUsers,
    })

    const createUserMutation = useMutation({
        mutationFn: createUser,
        onSuccess: () => {
            toast.success('User created successfully')
            queryClient.invalidateQueries({ queryKey: ['users'] })
        },
        onError: (error) => {
            toast.error(parseApiError(error, 'Failed to create user'))
        },
    })

    const updateUserMutation = useMutation({
        mutationFn: ({ id, payload }) => updateUser(id, payload),
        onSuccess: () => {
            toast.success('User updated successfully')
            queryClient.invalidateQueries({ queryKey: ['users'] })
        },
        onError: (error) => {
            toast.error(parseApiError(error, 'Failed to update user'))
        },
    })

    const deleteUserMutation = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => {
            toast.success('User removed successfully')
            queryClient.invalidateQueries({ queryKey: ['users'] })
        },
        onError: (error) => {
            toast.error(parseApiError(error, 'Failed to delete user'))
        },
    })

    const filtered = useMemo(() => {
        const query = q.trim().toLowerCase()
        if (!query) return users
        return users.filter(u =>
            u.username?.toLowerCase().includes(query) ||
            u.email?.toLowerCase().includes(query) ||
            u.role?.toLowerCase().includes(query)
        )
    }, [q, users])

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                <ShieldAlert className="w-16 h-16 opacity-30 text-red-500" />
                <h2 className="text-xl font-bold">Admin Access Required</h2>
                <p>You do not have permission to view or manage users.</p>
            </div>
        )
    }

    const handleSave = async (formData) => {
        if (editUser) {
            await updateUserMutation.mutateAsync({ id: editUser.id, payload: formData })
        } else {
            await createUserMutation.mutateAsync(formData)
        }
        setShowForm(false)
        setEditUser(null)
    }

    const handleToggleStatus = async (user) => {
        if (user.username === currentUser?.username) {
            toast.error('You cannot deactivate your own account')
            return
        }
        setStatusTargetId(user.id)
        try {
            await updateUserMutation.mutateAsync({
                id: user.id,
                payload: {
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    active: !user.active,
                },
            })
        } finally {
            setStatusTargetId(null)
        }
    }

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return

        if (deleteTarget.username === currentUser?.username) {
            toast.error('You cannot delete your own account')
            setDeleteTarget(null)
            return
        }

        await deleteUserMutation.mutateAsync(deleteTarget.id)
        setDeleteTarget(null)
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">User Management</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Manage employee access and roles</p>
                </div>
                <button className="btn-primary btn gap-2" onClick={() => { setEditUser(null); setShowForm(true) }}>
                    <Plus className="w-4 h-4" /> Add User
                </button>
            </div>

            <div className="card p-5">
                <div className="flex justify-between items-center mb-6">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            className="input pl-9 w-full"
                            placeholder="Search users..."
                            value={q}
                            onChange={e => setQ(e.target.value)}
                        />
                    </div>
                </div>

                {isLoading && <div className="text-sm text-gray-500">Loading users...</div>}
                {isError && <div className="text-sm text-red-500">Failed to load users</div>}

                {!isLoading && !isError && (
                    <div className="max-h-72 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-lg">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(u => (
                                    <tr key={u.id} className={!u.active ? 'opacity-60' : ''}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center font-bold text-gray-700 dark:text-gray-300">
                                                    {u.username?.slice(0, 2)?.toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <div className="font-bold dark:text-gray-100">{u.username}</div>
                                                    <div className="text-xs text-gray-500">{u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{roleBadge(u.role)}</td>
                                        <td>
                                            <button
                                                onClick={() => handleToggleStatus(u)}
                                                disabled={updateUserMutation.isPending}
                                                className={`badge cursor-pointer hover:opacity-80 transition-opacity ${u.active ? 'badge-success' : 'badge-danger'}`}
                                            >
                                                {statusTargetId === u.id && updateUserMutation.isPending
                                                    ? 'Updating...'
                                                    : u.active
                                                        ? 'Active'
                                                        : 'Inactive'}
                                            </button>
                                        </td>
                                        <td>
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    className="btn-ghost btn-sm btn"
                                                    onClick={() => { setEditUser({ ...u }); setShowForm(true) }}
                                                    disabled={updateUserMutation.isPending || deleteUserMutation.isPending}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    className="btn-ghost btn-sm btn hover:text-red-500 font-semibold"
                                                    onClick={() => setDeleteTarget(u)}
                                                    disabled={updateUserMutation.isPending || deleteUserMutation.isPending}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-8 text-gray-400">No users found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ModalErrorBoundary open={showForm} onClose={() => setShowForm(false)}>
                {showForm && (
                    <UserFormModal
                        user={editUser}
                        onSave={handleSave}
                        onClose={() => {
                            setShowForm(false)
                            setEditUser(null)
                        }}
                        saving={createUserMutation.isPending || updateUserMutation.isPending}
                    />
                )}
            </ModalErrorBoundary>

            <ConfirmModal
                open={!!deleteTarget}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDeleteConfirm}
                loading={deleteUserMutation.isPending}
            />
        </div>
    )
}
