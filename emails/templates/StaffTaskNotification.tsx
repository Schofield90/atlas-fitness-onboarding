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

interface StaffTaskNotificationEmailProps {
  staffName: string
  taskTitle: string
  taskDescription: string
  taskPriority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate: string
  assignedBy: string
  relatedTo: {
    type: 'lead' | 'client' | 'general'
    name?: string
  }
  taskUrl: string
  gymName: string
  gymLogo?: string
  dashboardUrl: string
}

export const StaffTaskNotificationEmail = ({
  staffName = 'Team Member',
  taskTitle = 'New Task Assigned',
  taskDescription = 'You have been assigned a new task.',
  taskPriority = 'medium',
  dueDate = 'Tomorrow',
  assignedBy = 'Manager',
  relatedTo = { type: 'general' },
  taskUrl = '#',
  gymName = 'Atlas Fitness',
  gymLogo = 'https://via.placeholder.com/150x50?text=GYM+LOGO',
  dashboardUrl = '#',
}: StaffTaskNotificationEmailProps) => {
  const previewText = `New ${taskPriority} priority task: ${taskTitle}`

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#dc2626' // red
      case 'high':
        return '#f97316' // orange
      case 'medium':
        return '#3b82f6' // blue
      case 'low':
        return '#10b981' // green
      default:
        return '#6b7280' // gray
    }
  }

  const getPriorityEmoji = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '🚨'
      case 'high':
        return '⚡'
      case 'medium':
        return '📌'
      case 'low':
        return '✓'
      default:
        return '📋'
    }
  }

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Row>
              <Column align="center">
                <Img
                  src={gymLogo}
                  width="120"
                  height="40"
                  alt={gymName}
                  style={logo}
                />
              </Column>
            </Row>
          </Section>

          {/* Priority Badge */}
          <Section style={content}>
            <Row>
              <Column align="center">
                <div
                  style={{
                    ...priorityBadge,
                    backgroundColor: getPriorityColor(taskPriority),
                  }}
                >
                  {getPriorityEmoji(taskPriority)} {taskPriority.toUpperCase()} PRIORITY
                </div>
              </Column>
            </Row>

            {/* Main Content */}
            <Heading style={h1}>New Task Assigned</Heading>
            
            <Text style={greeting}>Hi {staffName},</Text>
            
            <Text style={paragraph}>
              {assignedBy} has assigned you a new task that requires your attention.
            </Text>

            {/* Task Details Card */}
            <Section style={taskCard}>
              <Heading as="h2" style={taskCardTitle}>
                {taskTitle}
              </Heading>
              
              <Text style={taskDescriptionText}>
                {taskDescription}
              </Text>
              
              <Hr style={taskDivider} />
              
              <Row style={taskDetailRow}>
                <Column style={taskDetailColumn}>
                  <Text style={taskDetailLabel}>Due Date</Text>
                  <Text style={taskDetailValue}>
                    <span style={dueDateHighlight}>{dueDate}</span>
                  </Text>
                </Column>
                <Column style={taskDetailColumn}>
                  <Text style={taskDetailLabel}>Assigned By</Text>
                  <Text style={taskDetailValue}>{assignedBy}</Text>
                </Column>
              </Row>
              
              {relatedTo.name && (
                <Row style={taskDetailRow}>
                  <Column>
                    <Text style={taskDetailLabel}>
                      Related {relatedTo.type === 'lead' ? 'Lead' : 'Client'}
                    </Text>
                    <Text style={taskDetailValue}>{relatedTo.name}</Text>
                  </Column>
                </Row>
              )}
              
              <Row style={{ marginTop: '24px' }}>
                <Column align="center">
                  <Button
                    style={primaryButton}
                    href={taskUrl}
                  >
                    View Task Details
                  </Button>
                </Column>
              </Row>
            </Section>

            {/* Quick Actions */}
            <Section style={quickActionsSection}>
              <Heading as="h3" style={h3}>
                Quick Actions
              </Heading>
              
              <Row>
                <Column style={actionColumn}>
                  <Link href={taskUrl} style={actionLink}>
                    ✅ Mark as Complete
                  </Link>
                </Column>
                <Column style={actionColumn}>
                  <Link href={dashboardUrl} style={actionLink}>
                    📋 View All Tasks
                  </Link>
                </Column>
              </Row>
            </Section>

            {/* Tips Section */}
            {taskPriority === 'urgent' && (
              <Section style={urgentNotice}>
                <Text style={urgentTitle}>
                  ⏰ This is an urgent task
                </Text>
                <Text style={urgentText}>
                  Please prioritize this task as it requires immediate attention. 
                  If you need assistance or cannot complete it by the due date, 
                  please contact {assignedBy} right away.
                </Text>
              </Section>
            )}

            <Hr style={hr} />

            {/* Task Management Tips */}
            <Section>
              <Heading as="h3" style={h3}>
                Task Management Tips
              </Heading>
              <ul style={tipsList}>
                <li style={tipItem}>
                  Break down complex tasks into smaller, manageable steps
                </li>
                <li style={tipItem}>
                  Update task status regularly to keep everyone informed
                </li>
                <li style={tipItem}>
                  Add notes or comments if you encounter any issues
                </li>
              </ul>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This is an automated notification from {gymName} task management system.
            </Text>
            
            <Row style={footerLinks}>
              <Column align="center">
                <Link href={dashboardUrl} style={footerLink}>
                  Dashboard
                </Link>
                <Text style={footerSeparator}>•</Text>
                <Link href="#" style={footerLink}>
                  Settings
                </Link>
                <Text style={footerSeparator}>•</Text>
                <Link href="#" style={footerLink}>
                  Help
                </Link>
              </Column>
            </Row>
            
            <Text style={copyright}>
              © {new Date().getFullYear()} {gymName}. All rights reserved.
            </Text>
            
            <Text style={unsubscribe}>
              <Link href="#" style={unsubscribeLink}>
                Manage notification preferences
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
  padding: '24px 20px',
  backgroundColor: '#1f2937',
}

const logo = {
  margin: '0 auto',
}

const content = {
  padding: '20px 20px 0',
}

const priorityBadge = {
  display: 'inline-block',
  padding: '6px 16px',
  borderRadius: '20px',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: '700',
  letterSpacing: '0.5px',
  marginBottom: '24px',
}

const h1 = {
  color: '#333',
  fontSize: '28px',
  fontWeight: '700',
  margin: '24px 0 8px',
  padding: '0',
  lineHeight: '36px',
  textAlign: 'center' as const,
}

const h3 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: '600',
  margin: '24px 0 12px',
  padding: '0',
}

const greeting = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0 8px',
}

const paragraph = {
  color: '#666',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '8px 0 24px',
}

const taskCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  border: '1px solid #e5e7eb',
}

const taskCardTitle = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0 0 12px',
}

const taskDescriptionText = {
  fontSize: '16px',
  color: '#4b5563',
  lineHeight: '24px',
  margin: '0 0 16px',
}

const taskDivider = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
}

const taskDetailRow = {
  marginBottom: '16px',
}

const taskDetailColumn = {
  width: '50%',
  verticalAlign: 'top' as const,
}

const taskDetailLabel = {
  fontSize: '12px',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px',
  fontWeight: '600',
}

const taskDetailValue = {
  fontSize: '16px',
  color: '#1f2937',
  margin: '0',
  fontWeight: '500',
}

const dueDateHighlight = {
  color: '#f97316',
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
  padding: '12px 32px',
  display: 'inline-block',
}

const quickActionsSection = {
  marginTop: '32px',
}

const actionColumn = {
  width: '50%',
  padding: '0 8px',
  textAlign: 'center' as const,
}

const actionLink = {
  color: '#f97316',
  fontSize: '14px',
  textDecoration: 'none',
  fontWeight: '500',
}

const urgentNotice = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
  border: '1px solid #fecaca',
}

const urgentTitle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#dc2626',
  margin: '0 0 8px',
}

const urgentText = {
  fontSize: '14px',
  color: '#7f1d1d',
  margin: '0',
  lineHeight: '20px',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 0',
}

const tipsList = {
  margin: '12px 0',
  paddingLeft: '20px',
}

const tipItem = {
  fontSize: '14px',
  color: '#6b7280',
  marginBottom: '8px',
  lineHeight: '20px',
}

const footer = {
  padding: '32px 20px',
}

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 16px',
  textAlign: 'center' as const,
}

const footerLinks = {
  marginBottom: '16px',
}

const footerLink = {
  color: '#6b7280',
  fontSize: '14px',
  textDecoration: 'none',
}

const footerSeparator = {
  color: '#d1d5db',
  margin: '0 8px',
  display: 'inline',
}

const copyright = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '16px 0 8px',
  textAlign: 'center' as const,
}

const unsubscribe = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '0',
  textAlign: 'center' as const,
}

const unsubscribeLink = {
  color: '#9ca3af',
  fontSize: '12px',
  textDecoration: 'underline',
}

export default StaffTaskNotificationEmail