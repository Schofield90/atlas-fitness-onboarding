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

interface WelcomeLeadEmailProps {
  leadName: string
  gymName: string
  gymLogo?: string
  tourBookingUrl: string
  contactPhone: string
  contactEmail: string
  gymAddress: string
  socialLinks?: {
    facebook?: string
    instagram?: string
    twitter?: string
  }
}

export const WelcomeLeadEmail = ({
  leadName = 'Friend',
  gymName = 'Atlas Fitness',
  gymLogo = 'https://via.placeholder.com/150x50?text=GYM+LOGO',
  tourBookingUrl = '#',
  contactPhone = '(555) 123-4567',
  contactEmail = 'info@gym.com',
  gymAddress = '123 Fitness Street, Gym City, GC 12345',
  socialLinks = {},
}: WelcomeLeadEmailProps) => {
  const previewText = `Welcome to ${gymName}! Book your free tour today.`

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
            <Heading style={h1}>Welcome to {gymName}!</Heading>
            
            <Text style={paragraph}>Hi {leadName},</Text>
            
            <Text style={paragraph}>
              Thank you for your interest in {gymName}! We're thrilled that you're considering 
              joining our fitness community. We believe that fitness is not just about working out – 
              it's about building a healthier, happier lifestyle.
            </Text>

            <Section style={featureSection}>
              <Heading as="h2" style={h2}>
                Why Choose {gymName}?
              </Heading>
              
              <Row style={featureRow}>
                <Column style={featureColumn}>
                  <div style={featureIcon}>💪</div>
                  <Text style={featureTitle}>State-of-the-Art Equipment</Text>
                  <Text style={featureText}>
                    Latest machines and free weights for all fitness levels
                  </Text>
                </Column>
                <Column style={featureColumn}>
                  <div style={featureIcon}>👥</div>
                  <Text style={featureTitle}>Expert Trainers</Text>
                  <Text style={featureText}>
                    Certified professionals to guide your fitness journey
                  </Text>
                </Column>
              </Row>
              
              <Row style={featureRow}>
                <Column style={featureColumn}>
                  <div style={featureIcon}>📅</div>
                  <Text style={featureTitle}>Flexible Classes</Text>
                  <Text style={featureText}>
                    50+ classes per week from HIIT to Yoga
                  </Text>
                </Column>
                <Column style={featureColumn}>
                  <div style={featureIcon}>🌟</div>
                  <Text style={featureTitle}>Amazing Community</Text>
                  <Text style={featureText}>
                    Join thousands of members achieving their goals
                  </Text>
                </Column>
              </Row>
            </Section>

            <Hr style={hr} />

            {/* Call to Action */}
            <Section style={ctaSection}>
              <Heading as="h2" style={h2}>
                Ready to Get Started?
              </Heading>
              <Text style={paragraph}>
                Book your FREE tour today and see why {gymName} is the perfect place 
                for your fitness journey. Our team will show you around, answer all your 
                questions, and help you find the perfect membership plan.
              </Text>
              
              <Row>
                <Column align="center">
                  <Button
                    style={primaryButton}
                    href={tourBookingUrl}
                  >
                    Book Your Free Tour
                  </Button>
                </Column>
              </Row>
              
              <Text style={smallText}>
                No commitment required • Tours available 7 days a week
              </Text>
            </Section>

            <Hr style={hr} />

            {/* Special Offer */}
            <Section style={offerSection}>
              <div style={offerBadge}>LIMITED TIME OFFER</div>
              <Heading as="h3" style={h3}>
                Join This Week and Save 20%!
              </Heading>
              <Text style={paragraph}>
                Sign up during your tour and get 20% off your first 3 months. 
                Plus, we'll waive the enrollment fee!
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Row>
              <Column align="center">
                <Text style={footerTitle}>Visit Us</Text>
                <Text style={footerText}>{gymAddress}</Text>
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

            <Text style={copyright}>
              © {new Date().getFullYear()} {gymName}. All rights reserved.
            </Text>
            
            <Text style={unsubscribe}>
              You received this email because you expressed interest in {gymName}.
              <br />
              <Link href="#" style={unsubscribeLink}>
                Unsubscribe
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
  fontSize: '20px',
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

const featureSection = {
  margin: '32px 0',
}

const featureRow = {
  marginBottom: '24px',
}

const featureColumn = {
  width: '50%',
  paddingRight: '12px',
  paddingLeft: '12px',
  verticalAlign: 'top' as const,
}

const featureIcon = {
  fontSize: '32px',
  textAlign: 'center' as const,
  marginBottom: '8px',
}

const featureTitle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#333',
  margin: '8px 0 4px',
  textAlign: 'center' as const,
}

const featureText = {
  fontSize: '14px',
  color: '#666',
  margin: '0',
  textAlign: 'center' as const,
  lineHeight: '20px',
}

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const primaryButton = {
  backgroundColor: '#f97316',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '18px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  padding: '16px 32px',
  margin: '16px 0',
  display: 'inline-block',
}

const smallText = {
  color: '#999',
  fontSize: '14px',
  margin: '8px 0 0',
  textAlign: 'center' as const,
}

const offerSection = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '24px',
  margin: '32px 0',
  textAlign: 'center' as const,
}

const offerBadge = {
  backgroundColor: '#f59e0b',
  color: '#fff',
  fontSize: '12px',
  fontWeight: '700',
  letterSpacing: '0.5px',
  padding: '4px 12px',
  borderRadius: '4px',
  display: 'inline-block',
  marginBottom: '12px',
}

const footer = {
  backgroundColor: '#f9fafb',
  padding: '32px 20px',
  marginTop: '32px',
}

const footerTitle = {
  fontSize: '14px',
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

const copyright = {
  color: '#999',
  fontSize: '12px',
  margin: '24px 0 8px',
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

export default WelcomeLeadEmail