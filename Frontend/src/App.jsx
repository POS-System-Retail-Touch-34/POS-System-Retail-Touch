import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import AppRouter from './routes/AppRouter'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  const darkMode = useSelector(s => s.ui.darkMode)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  )
}

export default App
