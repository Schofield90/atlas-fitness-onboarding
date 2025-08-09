import EmailSettings from '@/app/components/email/EmailSettings';

export default function EmailSettingsPage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Email Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure and test your email service settings
        </p>
      </div>
      
      <EmailSettings />
    </div>
  );
}