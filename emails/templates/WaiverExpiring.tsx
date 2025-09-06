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
} from '@react-email/components'

interface WaiverExpiringProps {
  customerName: string
  waiverTitle: string
  waiverType: string
  organizationName: string
  expiresAt: string
  daysUntilExpiry: number
  renewalUrl?: string
}

export default function WaiverExpiring({
  customerName,
  waiverTitle,
  waiverType,
  organizationName,
  expiresAt,
  daysUntilExpiry,
  renewalUrl,
}: WaiverExpiringProps) {
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

  const getUrgencyColor = (days: number) => {
    if (days <= 1) return '#dc2626' // Red
    if (days <= 3) return '#ea580c' // Orange
    return '#d97706' // Amber
  }

  const urgencyColor = getUrgencyColor(daysUntilExpiry)

  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff' }}>
          {/* Header */}
          <Section style={{ backgroundColor: urgencyColor, padding: '20px', textAlign: 'center' }}>
            <Heading style={{ color: '#ffffff', margin: '0', fontSize: '24px' }}>
              {organizationName}
            </Heading>
          </Section>

          {/* Main Content */}
          <Section style={{ padding: '30px 20px' }}>
            <Heading style={{ fontSize: '20px', color: '#1f2937', marginBottom: '20px' }}>
              Hello {customerName},
            </Heading>

            {/* Urgency Message */}
            <Section style={{ 
              backgroundColor: daysUntilExpiry <= 1 ? '#fef2f2' : '#fffbeb', 
              padding: '20px', 
              borderRadius: '8px',
              borderLeft: `4px solid ${urgencyColor}`,
              marginBottom: '20px'
            }}>
              <Text style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: urgencyColor, 
                marginBottom: '10px' 
              }}>
                ⚠️ Waiver Expiring {daysUntilExpiry <= 1 ? 'Soon' : `in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`}
              </Text>
              <Text style={{ fontSize: '16px', color: '#4b5563', lineHeight: '1.5' }}>
                {daysUntilExpiry <= 0 
                  ? 'Your waiver has expired and needs to be renewed immediately.'
                  : daysUntilExpiry === 1 
                    ? 'Your waiver expires tomorrow. Please renew it as soon as possible.'
                    : `Your waiver will expire in ${daysUntilExpiry} days. We recommend renewing it soon to avoid any interruption.`
                }
              </Text>
            </Section>

            {/* Waiver Details */}
            <Section style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '20px', 
              borderRadius: '8px',
              borderLeft: '4px solid #6b7280',
              marginBottom: '20px'
            }}>
              <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', marginBottom: '10px' }}>
                {waiverTitle}
              </Text>
              <Text style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>
                <strong>Type:</strong> {formatWaiverType(waiverType)}
              </Text>
              <Text style={{ fontSize: '14px', color: '#6b7280' }}>
                <strong>Expires:</strong> {formatDate(expiresAt)}
              </Text>
            </Section>

            {/* Action Required */}
            <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#4b5563', marginBottom: '20px' }}>
              To continue participating in activities covered by this waiver, you'll need to:
            </Text>

            <Section style={{ marginBottom: '20px' }}>
              <Text style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6' }}>
                • <strong>Contact us</strong> to renew your waiver<br/>
                • <strong>Review</strong> any updated terms and conditions<br/>
                • <strong>Sign</strong> the new waiver digitally<br/>
                • <strong>Continue</strong> enjoying our services without interruption
              </Text>
            </Section>

            {/* Renewal Button */}
            {renewalUrl && (
              <Section style={{ textAlign: 'center', marginBottom: '30px' }}>
                <Button
                  href={renewalUrl}
                  style={{
                    backgroundColor: urgencyColor,
                    color: '#ffffff',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    display: 'inline-block',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  Renew Waiver Now
                </Button>
              </Section>
            )}

            {/* Contact Information */}
            <Section style={{ 
              backgroundColor: '#f0f9ff', 
              padding: '15px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <Text style={{ fontSize: '14px', fontWeight: 'bold', color: '#0c4a6e', marginBottom: '5px' }}>
                Need Help?
              </Text>
              <Text style={{ fontSize: '14px', color: '#0c4a6e', lineHeight: '1.5' }}>
                If you have any questions about renewing your waiver or need assistance, please contact us. We're here to help make the process as smooth as possible.
              </Text>
            </Section>

            <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#4b5563' }}>
              Thank you for your attention to this matter!
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />
          <Section style={{ padding: '20px', backgroundColor: '#f9fafb' }}>
            <Text style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginBottom: '10px' }}>
              This notification was sent by {organizationName}.
            </Text>
            <Text style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
              Please ensure your waiver is up to date to continue participating in our activities.
            </Text>
            {renewalUrl && (
              <Text style={{ 
                fontSize: '11px', 
                color: '#3b82f6', 
                textAlign: 'center',
                wordBreak: 'break-all',
                marginTop: '10px'
              }}>
                {renewalUrl}
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  )
}