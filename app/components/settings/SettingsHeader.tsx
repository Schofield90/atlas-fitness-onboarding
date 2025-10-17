'use client'

interface SettingsHeaderProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
}

export default function SettingsHeader({ title, description, icon, action }: SettingsHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {description && (
            <p className="text-gray-400 mt-1">{description}</p>
          )}
        </div>
      </div>
      {action && (
        <div>{action}</div>
      )}
    </div>
  )
}