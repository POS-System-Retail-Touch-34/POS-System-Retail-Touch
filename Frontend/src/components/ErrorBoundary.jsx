import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

export default class ErrorBoundary extends Component {
    state = { hasError: false, error: null }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-900 p-8">
                    <div className="card max-w-md w-full p-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Something went wrong</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{this.state.error?.message}</p>
                        <button className="btn-primary btn w-full" onClick={() => window.location.reload()}>
                            Reload Page
                        </button>
                    </div>
                </div>
            )
        }
        return this.props.children
    }
}
