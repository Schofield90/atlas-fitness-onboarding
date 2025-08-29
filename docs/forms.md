# Forms & Documents Guide

The forms module provides comprehensive form building capabilities with AI-powered generation, category-based organization, and document upload functionality.

## Quick Start

Navigate to `/forms` to access form management with AI builders, manual form creation, and document categories.

## Form Builders

### AI Document Builder
- **Activation**: Purple "AI Document Builder" button in header
- **Input**: Natural language form description via textarea
- **Process**: Sends description to `/api/ai/generate-form` endpoint
- **Output**: Complete form schema with appropriate fields and validation

#### Pre-built Templates
- **Liability Waiver**: Comprehensive gym waiver with emergency contacts and liability release
- **Health Assessment**: Medical history, medications, injuries, and fitness goals
- **Membership Agreement**: Terms, payment, renewal, and cancellation policies
- **Personal Training**: PT-specific agreement and health screening forms

#### AI Generation Process
```typescript
const response = await fetch('/api/ai/generate-form', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ description: formDescription }),
});
```

### Manual Form Builder
- **Activation**: Green "Manual Form Builder" button
- **Starting Template**: Basic form with full name field
- **Customization**: Add/remove fields, change types, set validation
- **Field Types**: Text, email, phone, number, date, select, checkbox, textarea, signature

#### Field Management
- **Add Fields**: Dynamic field addition with unique IDs
- **Remove Fields**: Single-click deletion with confirmation
- **Field Types**: 9 different input types supported
- **Validation**: Required field toggles and placeholder text
- **Options**: Comma-separated options for select fields

### Form Preview System
- **Real-time Editing**: Live preview of form structure
- **Field Editor**: Grid-based field configuration interface
- **Save Options**: Save as draft or publish immediately
- **Version Control**: Edit existing forms with change tracking

## Category Organization

### Category System
Forms are organized into four expandable categories with chevron indicators:

#### Waivers (Orange)
- **Icon**: Document icon
- **Purpose**: Liability and injury waivers
- **Count Display**: Shows number of waiver forms created
- **Expandable**: Click to view/manage waiver documents

#### Contracts (Blue) 
- **Icon**: Contract/copy icon
- **Purpose**: Membership agreements and legal contracts
- **Count Display**: Shows number of contract forms created
- **Expandable**: Click to view/manage contract documents

#### Health Forms (Green)
- **Icon**: Clipboard icon  
- **Purpose**: Medical assessments and health screenings
- **Count Display**: Shows number of health forms created
- **Expandable**: Click to view/manage health documents

#### Policies (Purple)
- **Icon**: Book/policies icon
- **Purpose**: Gym policies and member handbooks
- **Count Display**: Shows number of policy documents created
- **Expandable**: Click to view/manage policy documents

### Category Expansion Logic
```typescript
const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({
  waivers: false,
  contracts: false, 
  health: false,
  policies: false
})
```

### Category Content Display
- **Empty State**: Shows "No [category] forms created yet" with CTA to create
- **Populated State**: Lists all forms in category with view/edit actions
- **Form Actions**: View (blue) and Edit (gray) buttons per form
- **Smooth Animation**: ChevronUp/ChevronDown icons indicate state

## Upload Stub Implementation

### Upload Modal Features
- **Trigger**: Orange "+ Upload Document" button
- **Modal Layout**: Full-screen overlay with centered upload area
- **Drag & Drop Zone**: Dashed border area for file dropping
- **File Browser**: Hidden input with label-triggered browse functionality

### Current Implementation (Stub)
```typescript
onChange={(e) => {
  alert('File upload functionality will be implemented soon!')
  setShowUploadModal(false)
}}
```

### Expected Upload Flow
1. **File Selection**: Via drag-drop or browse button
2. **File Validation**: Type, size, and format checking
3. **Progress Tracking**: Upload progress bar
4. **Metadata Input**: Document type, title, and description
5. **Storage Integration**: File saved to designated storage service
6. **Database Record**: Form record created in database
7. **Category Assignment**: Automatic or manual category placement

### Upload Modal UI Elements
- **Visual Drop Zone**: Large upload area with cloud upload icon
- **Instructions**: "Drag and drop your file here, or click to browse"
- **File Input**: Hidden file input with orange "Select File" button
- **Cancel Button**: Close modal without action

## Lead Capture Integration

### Lead Forms Section
- **Dedicated Section**: Separate area for marketing/lead forms
- **Form Types**: Free trial, contact, and class interest forms
- **Visual Cards**: Icon-based cards showing form counts
- **Navigation**: Direct routing to `/lead-forms` page

### Lead Form Categories
- **Free Trial Forms**: Blue user icon, captures trial signups
- **Contact Forms**: Green document icon, general enquiries  
- **Class Interest**: Purple info icon, specific class signups
- **Count Tracking**: Shows "0 forms created" for each type

## What to Expect

### Form Creation Experience
- **AI-Powered**: Natural language to form conversion
- **Template Library**: Pre-built forms for common use cases
- **Real-time Preview**: Live form editing and preview
- **Field Validation**: Built-in validation rules and requirements
- **Save States**: Draft and published form states

### Document Management
- **Category Organization**: Logical grouping by document type
- **Search & Filter**: Find documents by type, status, or title
- **Version Control**: Track changes and maintain form history
- **Access Control**: Manage who can view/edit specific forms

### Integration Features
- **Lead Capture**: Connect forms to lead generation workflows
- **Member Onboarding**: Required forms for new member signup
- **Legal Compliance**: Proper waiver and liability documentation
- **Health Screening**: Medical clearance and assessment forms

## Feature Flags

### `formsUploadDocument`
- **Default**: `false`
- **Purpose**: Controls document upload functionality
- **Alternative**: Shows "coming soon" message in upload stub

## Troubleshooting

### AI Form Generation Failing
1. Check `/api/ai/generate-form` endpoint availability
2. Verify form description is not empty
3. Ensure AI service is properly configured
4. Check console for specific error messages
5. Try with simpler form descriptions

### Category Expansion Not Working
1. Verify `expandedCategories` state is properly initialized
2. Check click handlers on category cards
3. Ensure ChevronUp/ChevronDown icons are rendering
4. Confirm cursor pointer styling is applied

### Form Preview Modal Issues
1. Check `showFormPreview` state management
2. Verify `generatedForm` data structure
3. Ensure modal backdrop and z-index are correct
4. Confirm field editor functions are working

### Upload Stub Not Triggering
1. Verify file input element exists and is hidden
2. Check label-to-input association
3. Ensure onChange handler is attached
4. Confirm modal state management is working

### Form Saving Errors
1. Check API endpoints (`/api/forms/save`, `/api/forms/update`)
2. Verify form data structure matches expected schema
3. Ensure organization context is properly set
4. Check database connectivity and permissions
5. Validate required fields are populated