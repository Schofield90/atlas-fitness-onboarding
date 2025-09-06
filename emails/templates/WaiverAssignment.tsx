import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Heading,
  Button,
  Hr,
  Img,
} from '@react-email/components'

interface WaiverAssignmentProps {
  customerName: string
  waiverTitle: string
  waiverType: string
  organizationName: string
  signingUrl: string
  expiresAt?: string
  customMessage?: string
  isReminder?: boolean
  reminderCount?: number
}

export default function WaiverAssignment({
  customerName,
  waiverTitle,
  waiverType,
  organizationName,
  signingUrl,
  expiresAt,
  customMessage,
  isReminder = false,
  reminderCount = 0,
}: WaiverAssignmentProps) {
  const formatWaiverType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff' }}>
          {/* Header */}
          <Section style={{ backgroundColor: '#3b82f6', padding: '20px', textAlign: 'center' }}>
            <Heading style={{ color: '#ffffff', margin: '0', fontSize: '24px' }}>
              {organizationName}
            </Heading>
          </Section>

          {/* Main Content */}
          <Section style={{ padding: '30px 20px' }}>
            <Heading style={{ fontSize: '20px', color: '#1f2937', marginBottom: '20px' }}>
              Hello {customerName},
            </Heading>

            {isReminder ? (
              <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#4b5563', marginBottom: '20px' }}>
                <strong>This is {reminderCount > 1 ? `reminder #${reminderCount}` : 'a reminder'}</strong> that you have a waiver that requires your signature.
              </Text>
            ) : (
              <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#4b5563', marginBottom: '20px' }}>
                You have been assigned a waiver that requires your signature.
              </Text>
            )}

            {/* Waiver Details */}
            <Section style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '20px', 
              borderRadius: '8px',
              borderLeft: '4px solid #3b82f6',
              marginBottom: '20px'
            }}>
              <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', marginBottom: '10px' }}>
                {waiverTitle}
              </Text>
              <Text style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>
                <strong>Type:</strong> {formatWaiverType(waiverType)}
              </Text>
              {expiresAt && (
                <Text style={{ fontSize: '14px', color: '#6b7280' }}>
                  <strong>Expires:</strong> {formatDate(expiresAt)}
                </Text>
              )}
            </Section>

            {/* Custom Message */}
            {customMessage && (
              <Section style={{ 
                backgroundColor: '#f0f9ff', 
                padding: '15px', 
                borderRadius: '8px',
                borderLeft: '4px solid #0ea5e9',
                marginBottom: '20px'
              }}>
                <Text style={{ fontSize: '14px', fontWeight: 'bold', color: '#0c4a6e', marginBottom: '5px' }}>
                  Additional Message:
                </Text>
                <Text style={{ fontSize: '14px', color: '#0c4a6e', margin: '0' }}>
                  {customMessage}
                </Text>
              </Section>
            )}

            <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#4b5563', marginBottom: '30px' }}>
              Please click the button below to review and sign the waiver:
            </Text>

            {/* Sign Button */}
            <Section style={{ textAlign: 'center', marginBottom: '30px' }}>
              <Button
                href={signingUrl}
                style={{
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  display: 'inline-block',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                Sign Waiver
              </Button>
            </Section>

            {/* Additional Info */}
            <Text style={{ fontSize: '14px', lineHeight: '1.6', color: '#6b7280', marginBottom: '20px' }}>
              If you have any questions, please contact us. We're here to help!
            </Text>

            <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#4b5563' }}>
              Thank you!
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />
          <Section style={{ padding: '20px', backgroundColor: '#f9fafb' }}>
            <Text style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginBottom: '10px' }}>
              This email was sent by {organizationName}.
            </Text>
            <Text style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginBottom: '5px' }}>
              If you cannot click the button above, copy and paste this link into your browser:
            </Text>
            <Text style={{ 
              fontSize: '11px', 
              color: '#3b82f6', 
              textAlign: 'center',
              wordBreak: 'break-all',
              margin: '0'
            }}>
              {signingUrl}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}