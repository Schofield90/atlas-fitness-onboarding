import SettingsSidebar from '@/app/components/settings/SettingsSidebar'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="flex h-full">
        {/* Settings Sidebar */}
        <SettingsSidebar />
        
        {/* Main Content */}
        <div className="flex-1 ml-64">
          <div className="p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}