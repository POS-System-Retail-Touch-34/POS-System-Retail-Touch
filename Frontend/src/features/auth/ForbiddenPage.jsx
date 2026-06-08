import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ForbiddenPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-dark-900">
            <div className="max-w-md w-full card p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto flex items-center justify-center">
                    <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h1 className="text-2xl font-bold dark:text-white">403 Forbidden</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    You do not have permission to access this page.
                </p>
                <Link to="/pos" className="btn-primary btn w-full">
                    Back to Sales
                </Link>
            </div>
        </div>
    )
}
