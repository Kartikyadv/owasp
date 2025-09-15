import * as React from "react"
import { cn } from "../../lib/utils"

interface ToastProps {
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  onClose?: () => void
}

const Toast: React.FC<ToastProps> = ({ title, description, variant = 'default', onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.()
    }, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  const variantStyles = {
    default: 'bg-background border',
    destructive: 'bg-destructive text-destructive-foreground',
    success: 'bg-green-500 text-white'
  }

  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg max-w-sm",
      variantStyles[variant]
    )}>
      {title && <div className="font-semibold">{title}</div>}
      {description && <div className="text-sm mt-1">{description}</div>}
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 text-sm opacity-70 hover:opacity-100"
      >
        ×
      </button>
    </div>
  )
}

interface ToastContextType {
  toast: (props: ToastProps) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<(ToastProps & { id: string })[]>([])

  const toast = React.useCallback((props: ToastProps) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { ...props, id }])
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.map(({ id, ...toastProps }) => (
        <Toast
          key={id}
          {...toastProps}
          onClose={() => removeToast(id)}
        />
      ))}
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
