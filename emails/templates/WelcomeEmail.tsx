import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface WelcomeEmailProps {
  customerName: string
  organizationName: string
  email: string
  temporaryPassword: string
  loginUrl: string
}

export const WelcomeEmail = ({
  customerName = 'Member',
  organizationName = 'Atlas Fitness',
  email = '',
  temporaryPassword = '',
  loginUrl = 'https://atlas-fitness-onboarding.vercel.app/portal/login',
}: WelcomeEmailProps) => {
  const previewText = `Welcome to ${organizationName} - Your account is ready!`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Heading style={h1}>{organizationName}</Heading>
          </Section>
          
          <Heading style={h2}>Welcome to {organizationName}! 🎉</Heading>
          
          <Text style={text}>Hi {customerName},</Text>
          
          <Text style={text}>
            We're excited to have you as a member! Your account has been created and you can now access our member portal to:
          </Text>
          
          <Section style={featuresSection}>
            <Text style={featureItem}>✓ Book classes and sessions</Text>
            <Text style={featureItem}>✓ View your membership details</Text>
            <Text style={featureItem}>✓ Track your fitness progress</Text>
            <Text style={featureItem}>✓ Access exclusive member content</Text>
            <Text style={featureItem}>✓ Manage your account settings</Text>
          </Section>

          <Section style={credentialsSection}>
            <Heading style={h3}>Your Login Details</Heading>
            <Text style={credentialLabel}>Email:</Text>
            <Text style={credentialValue}>{email}</Text>
            
            <Text style={credentialLabel}>Temporary Password:</Text>
            <Text style={credentialValue}>{temporaryPassword}</Text>
            
            <Text style={warningText}>
              ⚠️ Please change your password after your first login for security.
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button
              style={button}
              href={loginUrl}
            >
              Login to Your Account
            </Button>
          </Section>

          <Text style={text}>
            If you have any questions or need assistance, don't hesitate to reach out to our team. We're here to help you achieve your fitness goals!
          </Text>

          <Hr style={hr} />

          <Section style={footerSection}>
            <Text style={footerText}>
              Best regards,<br />
              The {organizationName} Team
            </Text>
            
            <Text style={footerLinks}>
              <Link href={loginUrl} style={link}>
                Member Portal
              </Link>
              {' • '}
              <Link href="#" style={link}>
                Contact Support
              </Link>
              {' • '}
              <Link href="#" style={link}>
                Terms & Conditions
              </Link>
            </Text>
          </Section>

          <Text style={securityNote}>
            This email contains confidential information. If you received this email by mistake, please delete it and notify us immediately.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
}

const logoContainer = {
  padding: '20px 48px',
  backgroundColor: '#f97316',
  borderRadius: '8px 8px 0 0',
}

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0',
  padding: '0',
  textAlign: 'center' as const,
}

const h2 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '600',
  padding: '0 48px',
  margin: '30px 0 20px',
}

const h3 = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 15px',
}

const text = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 48px',
  margin: '0 0 16px',
}

const featuresSection = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 48px',
}

const featureItem = {
  color: '#059669',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
}

const credentialsSection = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '24px',
  margin: '20px 48px',
  border: '1px solid #fcd34d',
}

const credentialLabel = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 4px',
}

const credentialValue = {
  color: '#1f2937',
  fontSize: '16px',
  fontFamily: 'monospace',
  backgroundColor: '#ffffff',
  padding: '8px 12px',
  borderRadius: '4px',
  margin: '0 0 16px',
}

const warningText = {
  color: '#dc2626',
  fontSize: '14px',
  fontWeight: '500',
  margin: '16px 0 0',
}

const buttonContainer = {
  padding: '20px 48px',
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: '#f97316',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 48px',
}

const footerSection = {
  padding: '0 48px',
}

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0 0 16px',
}

const footerLinks = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '20px',
  textAlign: 'center' as const,
  margin: '16px 0',
}

const link = {
  color: '#f97316',
  textDecoration: 'underline',
}

const securityNote = {
  color: '#9ca3af',
  fontSize: '11px',
  lineHeight: '16px',
  textAlign: 'center' as const,
  padding: '0 48px',
  margin: '32px 0 0',
}

export default WelcomeEmail