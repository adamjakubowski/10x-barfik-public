import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, X } from 'lucide-react'

type ErrorMessage = {
  id: string
  title: string
  message: string
}

type ErrorContextType = {
  showError: (message: string, title?: string) => void
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined)

export function useErrorHandler() {
  const context = useContext(ErrorContext)
  if (!context) {
    throw new Error('useErrorHandler must be used within ErrorProvider')
  }
  return context
}

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<ErrorMessage[]>([])

  const showError = useCallback((message: string, title = 'Błąd') => {
    const id = Date.now().toString()
    setErrors((prev) => [...prev, { id, title, message }])

    // Automatyczne zamknięcie po 5 sekundach
    setTimeout(() => {
      setErrors((prev) => prev.filter((err) => err.id !== id))
    }, 5000)
  }, [])

  const removeError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((err) => err.id !== id))
  }, [])

  return (
    <ErrorContext.Provider value={{ showError }}>
      {children}
      
      {/* Fixed error container */}
      <div className="fixed top-4 right-4 z-50 w-full max-w-md space-y-2">
        {errors.map((error) => (
          <Alert key={error.id} variant="destructive" className="shadow-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="flex items-center justify-between">
              {error.title}
              <button
                onClick={() => removeError(error.id)}
                className="ml-auto rounded-sm opacity-70 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ))}
      </div>
    </ErrorContext.Provider>
  )
}
