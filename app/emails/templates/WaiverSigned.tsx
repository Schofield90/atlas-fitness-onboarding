import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Heading,
  Hr,
} from '@react-email/components'

interface WaiverSignedProps {
  customerName: string
  waiverTitle: string
  waiverType: string
  organizationName: string
  signedAt: string
  witnessName?: string
  witnessEmail?: string
}

export default function WaiverSigned({
  customerName,
  waiverTitle,
  waiverType,
  organizationName,
  signedAt,
  witnessName,
  witnessEmail,
}: WaiverSignedProps) {
  const formatWaiverType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff' }}>
          {/* Header */}
          <Section style={{ backgroundColor: '#10b981', padding: '20px', textAlign: 'center' }}>
            <Heading style={{ color: '#ffffff', margin: '0', fontSize: '24px' }}>
              {organizationName}
            </Heading>
          </Section>

          {/* Main Content */}
          <Section style={{ padding: '30px 20px' }}>
            <Heading style={{ fontSize: '20px', color: '#1f2937', marginBottom: '20px' }}>
              Hello {customerName},
            </Heading>

            <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#4b5563', marginBottom: '20px' }}>
              Thank you for signing your waiver! We have successfully received and processed your digital signature.
            </Text>

            {/* Waiver Details */}
            <Section style={{ 
              backgroundColor: '#f0fdf4', 
              padding: '20px', 
              borderRadius: '8px',
              borderLeft: '4px solid #10b981',
              marginBottom: '20px'
            }}>
              <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', marginBottom: '10px' }}>
                ✅ {waiverTitle}
              </Text>
              <Text style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>
                <strong>Type:</strong> {formatWaiverType(waiverType)}
              </Text>
              <Text style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>
                <strong>Signed on:</strong> {formatDateTime(signedAt)}
              </Text>
              {witnessName && (
                <Text style={{ fontSize: '14px', color: '#6b7280' }}>
                  <strong>Witnessed by:</strong> {witnessName}
                  {witnessEmail && ` (${witnessEmail})`}
                </Text>
              )}
            </Section>

            {/* Next Steps */}
            <Section style={{ 
              backgroundColor: '#fef3c7', 
              padding: '15px', 
              borderRadius: '8px',
              borderLeft: '4px solid #f59e0b',
              marginBottom: '20px'
            }}>
              <Text style={{ fontSize: '16px', fontWeight: 'bold', color: '#92400e', marginBottom: '10px' }}>
                What happens next?
              </Text>
              <Text style={{ fontSize: '14px', color: '#92400e', lineHeight: '1.5' }}>
                • Your signed waiver has been securely stored in our system<br/>
                • You can now participate in activities covered by this waiver<br/>
                • A copy of this confirmation has been sent to our staff<br/>
                • You may be contacted if any additional information is needed
              </Text>
            </Section>

            <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#4b5563', marginBottom: '20px' }}>
              If you have any questions about your waiver or our services, please don't hesitate to contact us.
            </Text>

            <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#4b5563' }}>
              We look forward to seeing you soon!
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />
          <Section style={{ padding: '20px', backgroundColor: '#f9fafb' }}>
            <Text style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginBottom: '5px' }}>
              This confirmation was sent by {organizationName}.
            </Text>
            <Text style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
              Your waiver is digitally signed and legally binding.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}