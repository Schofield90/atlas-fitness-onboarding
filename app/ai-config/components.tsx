// Card Components
export const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-lg shadow-md ${className}`}>
    {children}
  </div>
)

export const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="px-6 py-4 border-b border-gray-200">
    {children}
  </div>
)

export const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-lg font-semibold text-gray-900">
    {children}
  </h3>
)

export const CardDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-1 text-sm text-gray-600">
    {children}
  </p>
)

export const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-6 py-4 ${className}`}>
    {children}
  </div>
)

// Tabs Components
export const Tabs = ({ 
  children, 
  value, 
  onValueChange 
}: { 
  children: React.ReactNode; 
  value: string; 
  onValueChange: (value: string) => void 
}) => {
  return (
    <div>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { currentValue: value, onValueChange })
        }
        return child
      })}
    </div>
  )
}

export const TabsList = ({ 
  children, 
  className = '',
  currentValue,
  onValueChange
}: { 
  children: React.ReactNode; 
  className?: string;
  currentValue?: string;
  onValueChange?: (value: string) => void;
}) => (
  <div className={`flex space-x-1 bg-gray-100 p-1 rounded-lg ${className}`}>
    {React.Children.map(children, child => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child as React.ReactElement<any>, { currentValue, onValueChange })
      }
      return child
    })}
  </div>
)

export const TabsTrigger = ({ 
  children, 
  value,
  className = '',
  currentValue,
  onValueChange
}: { 
  children: React.ReactNode; 
  value: string;
  className?: string;
  currentValue?: string;
  onValueChange?: (value: string) => void;
}) => (
  <button
    onClick={() => onValueChange?.(value)}
    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
      currentValue === value
        ? 'bg-white text-gray-900 shadow-sm'
        : 'text-gray-600 hover:text-gray-900'
    } ${className}`}
  >
    {children}
  </button>
)

export const TabsContent = ({ 
  children, 
  value,
  currentValue
}: { 
  children: React.ReactNode; 
  value: string;
  currentValue?: string;
}) => {
  if (currentValue !== value) return null
  return <div className="mt-6">{children}</div>
}