# SOPs & Payroll Guide

This guide covers the Standard Operating Procedures (SOPs) management system and the upcoming payroll functionality with clear explanations and CTAs.

## Quick Start

Navigate to `/sops` to access the comprehensive SOP management system or `/payroll` for payroll information and early access.

## SOPs List Management

### Main Interface Features
The SOPs system provides comprehensive document management with AI-powered assistance:

#### View Modes
- **List View**: Browse all SOPs with filtering and search capabilities
- **Create Mode**: Build new SOPs with AI document analysis
- **Edit Mode**: Modify existing procedures with version control
- **View Mode**: Display SOPs with tabs for content, analysis, and assistant

#### Tab Navigation System
When viewing SOPs, three tabs provide organized access:

```typescript
const [activeTab, setActiveTab] = useState<'content' | 'analysis' | 'assistant'>('content')
```

- **Content Tab**: Full SOP document display with editing capabilities
- **AI Analysis Tab**: Machine-learning insights and suggestions (indicated by orange dot when available)
- **Ask Assistant Tab**: Interactive AI chat for SOP-related questions

### AI Document Analysis
The system includes powerful AI features for SOP creation and management:

#### Document Upload & Analysis
```typescript
const handleAnalyze = async (file: File, metadata: any) => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', metadata.title)
    formData.append('category', metadata.category)
    formData.append('description', metadata.description || '')
    formData.append('trainingRequired', metadata.training_required?.toString() || 'false')
    formData.append('saveAsNew', 'true')
    formData.append('generateQuiz', 'true')

    const response = await fetch('/api/sops/analyze', {
      method: 'POST',
      body: formData
    })

    const data = await response.json()
    
    if (data.sop) {
      setSelectedSOP(data.sop)
      setViewMode('view')
      setActiveTab('analysis')
    }
  } catch (error) {
    console.error('Error analyzing document:', error)
    throw error
  }
}
```

#### AI Analysis Features
- **Document Processing**: Upload PDFs, Word docs, or text files for automatic SOP creation
- **Content Extraction**: AI reads and structures document content into proper SOP format
- **Quiz Generation**: Automatically creates training quizzes based on SOP content
- **Category Classification**: Smart categorization based on document content
- **Training Requirements**: AI determines if training is required for the procedure

### SOP Assistant Integration

#### Global Assistant Access
The system includes a floating assistant button for system-wide SOP help:

```typescript
{/* Global Assistant Toggle */}
<div className="fixed bottom-6 right-6 z-50">
  <Button
    onClick={() => setShowAssistant(!showAssistant)}
    className="rounded-full w-14 h-14 bg-orange-600 hover:bg-orange-700 shadow-lg"
    title="SOP Assistant"
  >
    <MessageIcon className="h-6 w-6" />
  </Button>
</div>
```

#### Assistant Capabilities
- **Context-Aware Responses**: Provides answers based on currently selected SOP
- **Cross-SOP Navigation**: Can suggest related procedures and help find specific SOPs
- **Training Guidance**: Explains training requirements and completion steps
- **Compliance Checking**: Reviews SOPs for completeness and compliance requirements

### Quick Stats Dashboard

#### Statistics Tracking
The sidebar provides real-time SOP management metrics:

- **Total SOPs**: Complete count of all procedures in system
- **Approved**: Count of finalized, ready-to-use procedures (green indicator)
- **Drafts**: Work-in-progress procedures requiring completion (yellow indicator)  
- **Require Training**: Procedures that mandate staff training (purple indicator)

#### Recent Activity Feed
- **Real-time Updates**: Live feed of SOP creation, updates, and training completion
- **Color-coded Events**: Blue (new), Green (training completed), Yellow (updates)
- **Timestamp Tracking**: Shows when activities occurred with relative time

#### Training Overview
- **Completion Rate**: Visual progress bar showing overall training completion percentage
- **Pending Training**: Count of training sessions awaiting completion
- **Overdue Training**: Count of overdue training requirements (red indicator)
- **Completed Training**: Total successful training completions (green indicator)

## Payroll System Explainer

### Current Status: Coming Soon
The payroll page provides clear communication about the upcoming payroll functionality:

#### Launch Information
```typescript
<div className="bg-blue-900 bg-opacity-30 border border-blue-800 rounded-lg p-4">
  <p className="text-blue-300 text-sm">
    <span className="font-semibold">Expected Launch:</span> Q2 2025
  </p>
  <p className="text-blue-200 text-xs mt-1">
    We'll notify you as soon as this feature is available
  </p>
</div>
```

### Planned Features Preview

#### Core Payroll Capabilities
- **Time Tracking**: Automated timesheet management and shift tracking
- **Commission Calculation**: Automatic commission and bonus calculations  
- **Payslip Generation**: Digital payslips and tax documentation
- **Staff Hourly Rates**: Salary and hourly rate management
- **PT Commission Tracking**: Personal trainer commission calculations
- **Class Instructor Payments**: Group class instructor payment processing
- **Bonus Management**: Incentive and performance bonus tracking
- **Accounting Integration**: Connection with accounting software

### Current Alternatives & CTAs

#### Interim Solutions
While payroll is in development, the system provides clear alternatives:

##### Staff Management Integration
```typescript
<a href="/staff" className="block p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
  <div className="flex items-center gap-3">
    <Users className="h-5 w-5 text-orange-500" />
    <div>
      <p className="text-white font-medium">Staff Management</p>
      <p className="text-gray-400 text-sm">Track staff schedules and availability</p>
    </div>
  </div>
</a>
```

##### Reports Integration  
```typescript
<a href="/reports" className="block p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
  <div className="flex items-center gap-3">
    <FileText className="h-5 w-5 text-blue-500" />
    <div>
      <p className="text-white font-medium">Reports</p>
      <p className="text-gray-400 text-sm">Export staff activity and performance data</p>
    </div>
  </div>
</a>
```

## What to Expect

### SOPs System Features
- **Comprehensive Document Management**: Full lifecycle SOP management from creation to retirement
- **AI-Powered Analysis**: Intelligent document processing and content suggestions
- **Training Integration**: Automated training requirement tracking and completion monitoring
- **Assistant Support**: Contextual AI help for SOP-related questions and guidance
- **Real-time Statistics**: Live dashboards showing SOP and training metrics

### Payroll System Timeline
- **Q2 2025 Launch**: Expected availability for full payroll functionality
- **Staff Integration**: Will connect with existing staff management features
- **Accounting Software**: Integration with popular accounting platforms
- **Tax Compliance**: Automated tax calculations and documentation
- **Commission Tracking**: Specialized features for fitness industry compensation models

### Professional Communication
Both systems maintain professional messaging that:
- **Sets Clear Expectations**: Users understand what's available now vs. coming soon
- **Provides Value**: Current alternatives offer immediate utility while waiting for full features
- **Maintains Engagement**: Regular updates and progress indicators keep users informed
- **Professional Appearance**: High-quality UI suggests robust, enterprise-grade solutions coming

## Feature Integration

### Cross-System Connections
- **Staff Management**: SOPs can be assigned to specific staff roles and positions
- **Training Records**: Payroll system will integrate with SOP training completion data
- **Reporting**: Both systems contribute data to comprehensive business reporting
- **AI Intelligence**: Both leverage AI for document analysis and process optimization

### Notification Systems
- **SOP Updates**: Staff receive notifications when procedures are updated or new training is required
- **Payroll Alerts**: Users will be notified when payroll features become available
- **Training Reminders**: Automated reminders for overdue or upcoming training requirements

## Troubleshooting

### SOPs System Issues

#### AI Analysis Not Working
1. Verify document is in supported format (PDF, DOC, DOCX, TXT)
2. Check file size is under system limits
3. Ensure document contains readable text (not scanned images)
4. Try refreshing page and uploading again

#### Assistant Not Responding  
1. Check internet connection for API access
2. Verify SOP is properly selected for context
3. Try refreshing the page and reopening assistant
4. Check browser console for JavaScript errors

#### Stats Not Loading
1. Verify user has proper permissions to view SOP statistics
2. Check if organization data is properly configured
3. Ensure API endpoints are accessible
4. Try refreshing the page to reload stats

### Payroll System Preparation
1. Review current staff management setup to ensure readiness
2. Organize existing staff pay rates and commission structures
3. Consider accounting software integration requirements
4. Document current payroll processes for smooth transition