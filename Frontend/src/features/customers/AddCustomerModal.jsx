import { useFormik } from 'formik'
import * as Yup from 'yup'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import * as customerService from '../../services/customerService'  // import service

const phoneRegex = /^[6-9]\d{9}$/
const nameRegex = /^[a-zA-Z\s]{2,50}$/

const schema = Yup.object({
    name: Yup.string()
        .matches(nameRegex, 'Name can only contain alphabets and spaces (2-50 chars)')
        .required('Name is required'),
    phone: Yup.string()
        .matches(phoneRegex, 'Enter a valid 10-digit Indian phone number starting with 6-9')
        .required('Phone is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    address: Yup.string().required('Address is required'),
})

export default function AddCustomerModal({ onClose, onAdded }) {
    const formik = useFormik({
        initialValues: { name: '', phone: '', email: '', address: '' },
        validationSchema: schema,
        onSubmit: async (values, { setSubmitting }) => {
            try {
                const newCustomer = {
                    ...values,
                    loyaltyPoints: 0,
                    tier: 'Bronze',
                }
                const created = await customerService.addCustomer(newCustomer)
                toast.success(`${created.name} added!`)
                onAdded(created) // notify parent to update customer list
                onClose()
            } catch (err) {
                toast.error(err?.response?.data?.message || err?.message || 'Failed to add customer')
            } finally {
                setSubmitting(false)
            }
        },
    })

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold dark:text-white">Add New Customer</h2>
                    <button className="btn-ghost p-2" onClick={onClose}><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={formik.handleSubmit} className="space-y-4">
                    {[
                        { name: 'name', label: 'Full Name', placeholder: 'Aarav Sharma' },
                        { name: 'phone', label: 'Phone', placeholder: '9876543210' },
                        { name: 'email', label: 'Email', placeholder: 'aarav@example.com' },
                        { name: 'address', label: 'Address', placeholder: '123 MG Road, Mumbai' },
                    ].map(f => (
                        <div key={f.name}>
                            <label className="label">{f.label}</label>
                            <input
                                name={f.name}
                                className={`input ${formik.touched[f.name] && formik.errors[f.name] ? 'input-error' : ''}`}
                                placeholder={f.placeholder}
                                value={formik.values[f.name]}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                            />
                            {formik.touched[f.name] && formik.errors[f.name] && (
                                <p className="text-red-500 text-xs mt-1">{formik.errors[f.name]}</p>
                            )}
                        </div>
                    ))}
                    <div className="flex gap-3 pt-2">
                        <button type="button" className="btn-secondary btn flex-1" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary btn flex-1" disabled={formik.isSubmitting}>
                            {formik.isSubmitting ? 'Adding...' : 'Add Customer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
