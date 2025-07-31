interface SettingsHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export default function SettingsHeader({ title, description, action }: SettingsHeaderProps) {
  return (
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {description && (
          <p className="text-gray-400 mt-1">{description}</p>
        )}
      </div>
      {action && (
        <div>{action}</div>
      )}
    </div>
  )
}