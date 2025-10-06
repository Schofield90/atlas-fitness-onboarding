import {
  Body,
  Button,
  Container,
  Column,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface ClientWelcomeEmailProps {
  memberName: string
  membershipType: string
  membershipStartDate: string
  membershipId: string
  gymName: string
  gymLogo?: string
  dashboardUrl: string
  classScheduleUrl: string
  contactPhone: string
  contactEmail: string
  gymAddress: string
  socialLinks?: {
    facebook?: string
    instagram?: string
    twitter?: string
  }
}

export const ClientWelcomeEmail = ({
  memberName = 'Member',
  membershipType = 'Premium Monthly',
  membershipStartDate = 'January 1, 2024',
  membershipId = 'MEM-123456',
  gymName = 'Atlas Fitness',
  gymLogo = 'https://via.placeholder.com/150x50?text=GYM+LOGO',
  dashboardUrl = '#',
  classScheduleUrl = '#',
  contactPhone = '(555) 123-4567',
  contactEmail = 'info@gym.com',
  gymAddress = '123 Fitness Street, Gym City, GC 12345',
  socialLinks = {},
}: ClientWelcomeEmailProps) => {
  const previewText = `Welcome to the ${gymName} family! Your fitness journey starts now.`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with Logo */}
          <Section style={header}>
            <Row>
              <Column align="center">
                <Img
                  src={gymLogo}
                  width="150"
                  height="50"
                  alt={gymName}
                  style={logo}
                />
              </Column>
            </Row>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h1}>
              Welcome to the {gymName} Family! 🎉
            </Heading>
            
            <Text style={paragraph}>Dear {memberName},</Text>
            
            <Text style={paragraph}>
              Congratulations on taking the first step towards a healthier, stronger you! 
              We're absolutely thrilled to have you as part of our fitness community. 
              Your journey to achieving your fitness goals starts right here, right now.
            </Text>

            {/* Membership Details Card */}
            <Section style={membershipCard}>
              <Heading as="h2" style={cardTitle}>
                Your Membership Details
              </Heading>
              <div style={detailRow}>
                <Text style={detailLabel}>Membership Type:</Text>
                <Text style={detailValue}>{membershipType}</Text>
              </div>
              <div style={detailRow}>
                <Text style={detailLabel}>Start Date:</Text>
                <Text style={detailValue}>{membershipStartDate}</Text>
              </div>
              <div style={detailRow}>
                <Text style={detailLabel}>Member ID:</Text>
                <Text style={detailValue}>{membershipId}</Text>
              </div>
              
              <Row style={{ marginTop: '20px' }}>
                <Column align="center">
                  <Button
                    style={secondaryButton}
                    href={dashboardUrl}
                  >
                    Access Your Dashboard
                  </Button>
                </Column>
              </Row>
            </Section>

            <Hr style={hr} />

            {/* Getting Started Checklist */}
            <Section>
              <Heading as="h2" style={h2}>
                Your First Week Checklist ✓
              </Heading>
              
              <div style={checklistItem}>
                <span style={checkmark}>□</span>
                <div style={checklistContent}>
                  <Text style={checklistTitle}>Complete Your Health Assessment</Text>
                  <Text style={checklistText}>
                    Visit the front desk to fill out your health questionnaire
                  </Text>
                </div>
              </div>
              
              <div style={checklistItem}>
                <span style={checkmark}>□</span>
                <div style={checklistContent}>
                  <Text style={checklistTitle}>Schedule Your Free Fitness Consultation</Text>
                  <Text style={checklistText}>
                    Meet with a trainer to discuss your goals and create a plan
                  </Text>
                </div>
              </div>
              
              <div style={checklistItem}>
                <span style={checkmark}>□</span>
                <div style={checklistContent}>
                  <Text style={checklistTitle}>Try 3 Different Classes</Text>
                  <Text style={checklistText}>
                    Explore our variety - from HIIT to Yoga to find your favorites
                  </Text>
                </div>
              </div>
              
              <div style={checklistItem}>
                <span style={checkmark}>□</span>
                <div style={checklistContent}>
                  <Text style={checklistTitle}>Download Our Mobile App</Text>
                  <Text style={checklistText}>
                    Book classes, track workouts, and connect with other members
                  </Text>
                </div>
              </div>
            </Section>

            <Hr style={hr} />

            {/* Important Policies */}
            <Section>
              <Heading as="h2" style={h2}>
                Important Information
              </Heading>
              
              <div style={policySection}>
                <Heading as="h3" style={h3}>
                  🏃‍♂️ Gym Etiquette
                </Heading>
                <ul style={policyList}>
                  <li style={policyItem}>Please wipe down equipment after use</li>
                  <li style={policyItem}>Return weights to their proper place</li>
                  <li style={policyItem}>Respect others' personal space and workout time</li>
                  <li style={policyItem}>Bring a towel and water bottle</li>
                </ul>
              </div>
              
              <div style={policySection}>
                <Heading as="h3" style={h3}>
                  📅 Class Bookings
                </Heading>
                <ul style={policyList}>
                  <li style={policyItem}>Book classes up to 7 days in advance</li>
                  <li style={policyItem}>Cancel at least 2 hours before class starts</li>
                  <li style={policyItem}>Arrive 5 minutes early to secure your spot</li>
                </ul>
                
                <Row>
                  <Column align="center">
                    <Button
                      style={primaryButton}
                      href={classScheduleUrl}
                    >
                      View Class Schedule
                    </Button>
                  </Column>
                </Row>
              </div>
            </Section>

            <Hr style={hr} />

            {/* Welcome Gift */}
            <Section style={giftSection}>
              <div style={giftIcon}>🎁</div>
              <Heading as="h3" style={h3}>
                Your Welcome Gift
              </Heading>
              <Text style={paragraph}>
                As a new member, enjoy a complimentary personal training session! 
                Book it within your first 30 days to unlock your full potential.
              </Text>
              <Text style={smallText}>
                *Valid for new members only. Must be redeemed within 30 days of joining.
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Row>
              <Column align="center">
                <Text style={footerTitle}>Need Help?</Text>
                <Text style={footerText}>
                  Our team is here to support you every step of the way
                </Text>
              </Column>
            </Row>
            
            <Row style={contactRow}>
              <Column align="center">
                <Link href={`tel:${contactPhone}`} style={footerLink}>
                  {contactPhone}
                </Link>
                <Text style={footerSeparator}>•</Text>
                <Link href={`mailto:${contactEmail}`} style={footerLink}>
                  {contactEmail}
                </Link>
              </Column>
            </Row>
            
            <Row>
              <Column align="center">
                <Text style={footerText}>{gymAddress}</Text>
              </Column>
            </Row>

            {/* Social Links */}
            {Object.keys(socialLinks).length > 0 && (
              <Row style={socialRow}>
                <Column align="center">
                  {socialLinks.facebook && (
                    <Link href={socialLinks.facebook} style={socialLink}>
                      <Img
                        src="https://img.icons8.com/ios-filled/50/000000/facebook-new.png"
                        width="24"
                        height="24"
                        alt="Facebook"
                        style={socialIcon}
                      />
                    </Link>
                  )}
                  {socialLinks.instagram && (
                    <Link href={socialLinks.instagram} style={socialLink}>
                      <Img
                        src="https://img.icons8.com/ios-filled/50/000000/instagram-new.png"
                        width="24"
                        height="24"
                        alt="Instagram"
                        style={socialIcon}
                      />
                    </Link>
                  )}
                  {socialLinks.twitter && (
                    <Link href={socialLinks.twitter} style={socialLink}>
                      <Img
                        src="https://img.icons8.com/ios-filled/50/000000/twitter.png"
                        width="24"
                        height="24"
                        alt="Twitter"
                        style={socialIcon}
                      />
                    </Link>
                  )}
                </Column>
              </Row>
            )}

            <Text style={motivationalQuote}>
              "The only bad workout is the one that didn't happen"
            </Text>

            <Text style={copyright}>
              © {new Date().getFullYear()} {gymName}. All rights reserved.
            </Text>
            
            <Text style={unsubscribe}>
              You received this email because you're a member of {gymName}.
              <br />
              <Link href="#" style={unsubscribeLink}>
                Manage email preferences
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
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
  maxWidth: '600px',
}

const header = {
  padding: '32px 20px',
  backgroundColor: '#f97316',
}

const logo = {
  margin: '0 auto',
}

const content = {
  padding: '0 20px',
}

const h1 = {
  color: '#333',
  fontSize: '32px',
  fontWeight: '700',
  margin: '40px 0 16px',
  padding: '0',
  lineHeight: '42px',
  textAlign: 'center' as const,
}

const h2 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: '600',
  margin: '32px 0 16px',
  padding: '0',
  lineHeight: '32px',
  textAlign: 'center' as const,
}

const h3 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: '600',
  margin: '16px 0 12px',
  padding: '0',
  textAlign: 'center' as const,
}

const paragraph = {
  color: '#666',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 0',
}

const membershipCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  border: '1px solid #e5e7eb',
}

const cardTitle = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#333',
  margin: '0 0 16px',
  textAlign: 'center' as const,
}

const detailRow = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: '1px solid #e5e7eb',
}

const detailLabel = {
  fontSize: '14px',
  color: '#666',
  margin: '0',
  fontWeight: '500',
}

const detailValue = {
  fontSize: '14px',
  color: '#333',
  margin: '0',
  fontWeight: '600',
}

const primaryButton = {
  backgroundColor: '#f97316',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  padding: '12px 24px',
  margin: '16px 0',
  display: 'inline-block',
}

const secondaryButton = {
  backgroundColor: '#374151',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  padding: '12px 24px',
  display: 'inline-block',
}

const checklistItem = {
  display: 'flex',
  alignItems: 'flex-start',
  marginBottom: '20px',
}

const checkmark = {
  fontSize: '20px',
  marginRight: '12px',
  color: '#d1d5db',
  lineHeight: '1',
}

const checklistContent = {
  flex: '1',
}

const checklistTitle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#333',
  margin: '0 0 4px',
}

const checklistText = {
  fontSize: '14px',
  color: '#666',
  margin: '0',
  lineHeight: '20px',
}

const policySection = {
  marginBottom: '24px',
}

const policyList = {
  margin: '12px 0',
  paddingLeft: '20px',
}

const policyItem = {
  fontSize: '14px',
  color: '#666',
  marginBottom: '8px',
  lineHeight: '20px',
}

const giftSection = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '24px',
  margin: '32px 0',
  textAlign: 'center' as const,
}

const giftIcon = {
  fontSize: '48px',
  marginBottom: '12px',
}

const smallText = {
  color: '#999',
  fontSize: '12px',
  margin: '8px 0 0',
  textAlign: 'center' as const,
  fontStyle: 'italic',
}

const footer = {
  backgroundColor: '#f9fafb',
  padding: '32px 20px',
  marginTop: '32px',
}

const footerTitle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#333',
  margin: '0 0 4px',
  textAlign: 'center' as const,
}

const footerText = {
  fontSize: '14px',
  color: '#666',
  margin: '0 0 16px',
  textAlign: 'center' as const,
}

const contactRow = {
  marginBottom: '16px',
}

const footerLink = {
  color: '#f97316',
  fontSize: '14px',
  textDecoration: 'none',
}

const footerSeparator = {
  color: '#999',
  margin: '0 8px',
  display: 'inline',
}

const socialRow = {
  marginBottom: '24px',
}

const socialLink = {
  display: 'inline-block',
  margin: '0 8px',
}

const socialIcon = {
  filter: 'grayscale(100%)',
  opacity: 0.6,
}

const motivationalQuote = {
  color: '#f97316',
  fontSize: '16px',
  fontStyle: 'italic',
  margin: '24px 0 16px',
  textAlign: 'center' as const,
  fontWeight: '500',
}

const copyright = {
  color: '#999',
  fontSize: '12px',
  margin: '16px 0 8px',
  textAlign: 'center' as const,
}

const unsubscribe = {
  color: '#999',
  fontSize: '12px',
  margin: '0',
  textAlign: 'center' as const,
  lineHeight: '20px',
}

const unsubscribeLink = {
  color: '#999',
  fontSize: '12px',
  textDecoration: 'underline',
}

export default ClientWelcomeEmail