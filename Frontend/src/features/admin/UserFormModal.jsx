import { useFormik } from 'formik'
import * as Yup from 'yup'
import { X, UserPlus, Save, Edit } from 'lucide-react'

export default function UserFormModal({ user, onSave, onClose, saving = false }) {
    const isEdit = !!user

    const formik = useFormik({
        initialValues: {
            username: user?.username || '',
            email: user?.email || '',
            role: user?.role || 'CASHIER',
            password: '',
            active: user?.active ?? true,
        },
        enableReinitialize: true,
        validationSchema: Yup.object({
            username: Yup.string()
                .matches(/^[a-zA-Z0-9_.-]{3,50}$/, 'Username can only contain letters, digits, _ . - (3-50 chars)')
                .required('Required'),
            email: Yup.string().email('Invalid email').required('Required'),
            role: Yup.string().oneOf(['ADMIN', 'STORE_MANAGER', 'CASHIER']).required('Required'),
            password: isEdit ? Yup.string() : Yup.string().required('Required').min(6, 'Min 6 chars'),
        }),
        onSubmit: async (values) => {
            // In a real app, you'd only send password if changed
            const data = { ...values }
            if (isEdit && !data.password) {
                delete data.password
            }
            await onSave(data)
        }
    })

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box max-w-lg p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between flex-row items-center mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                        {isEdit ? <Edit className="w-5 h-5 text-primary-500" /> : <UserPlus className="w-5 h-5 text-primary-500" />}
                        {isEdit ? 'Edit User' : 'Add New User'}
                    </h2>
                    <button className="btn-ghost p-2" onClick={onClose}><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={formik.handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="label">Username</label>
                            <input
                                name="username"
                                className={`input ${formik.touched.username && formik.errors.username ? 'border-red-500' : ''}`}
                                {...formik.getFieldProps('username')}
                                placeholder="john.doe"
                            />
                            {formik.touched.username && formik.errors.username && <p className="text-red-500 text-xs">{formik.errors.username}</p>}
                        </div>
                        <div className="space-y-1">
                            <label className="label">Email Address</label>
                            <input
                                name="email"
                                type="email"
                                className={`input ${formik.touched.email && formik.errors.email ? 'border-red-500' : ''}`}
                                {...formik.getFieldProps('email')}
                                placeholder="john@retailtouch.com"
                            />
                            {formik.touched.email && formik.errors.email && <p className="text-red-500 text-xs">{formik.errors.email}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="label">System Role</label>
                            <select
                                name="role"
                                className={`input ${formik.touched.role && formik.errors.role ? 'border-red-500' : ''}`}
                                {...formik.getFieldProps('role')}
                            >
                                <option value="CASHIER">Cashier</option>
                                <option value="STORE_MANAGER">Manager</option>
                                <option value="ADMIN">Administrator</option>
                            </select>
                            {formik.touched.role && formik.errors.role && <p className="text-red-500 text-xs">{formik.errors.role}</p>}
                        </div>
                        <div className="space-y-1">
                            <label className="label">{isEdit ? 'New Password (Optional)' : 'Initial Password'}</label>
                            <input
                                name="password"
                                type="password"
                                className={`input ${formik.touched.password && formik.errors.password ? 'border-red-500' : ''}`}
                                {...formik.getFieldProps('password')}
                                placeholder={isEdit ? "Leave blank to keep current" : "Min 6 chars"}
                            />
                            {formik.touched.password && formik.errors.password && <p className="text-red-500 text-xs">{formik.errors.password}</p>}
                        </div>
                    </div>

                    {isEdit && (
                        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <input
                                name="active"
                                type="checkbox"
                                checked={formik.values.active}
                                onChange={formik.handleChange}
                            />
                            Active account
                        </label>
                    )}

                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800 mt-6">
                        <button type="button" className="btn-ghost btn" onClick={onClose} disabled={saving}>Cancel</button>
                        <button type="submit" className="btn-primary btn gap-2" disabled={saving}>
                            {isEdit ? <Save className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
