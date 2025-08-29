# Customers & Conversations Guide

The customers and conversations modules work together to manage customer relationships with intelligent empty states and conversation starters.

## Quick Start

Navigate to `/customers` to manage your customer database or `/conversations` to view message threads.

## Empty State Rules

### Conversations Empty States

#### No Contacts Available
- **Condition**: When `contactsCount === 0`
- **State**: "New Conversation" button disabled with grey styling
- **Message**: "Add contacts first to start conversations"
- **Tooltip**: Hover tooltip explains the requirement
- **Action**: Redirects users to add contacts before starting conversations

#### No Conversations Yet
- **Condition**: When contacts exist but no message history found
- **State**: MessageSquare icon with "No conversations yet" message
- **Context**: Encourages users to start first conversation
- **Functionality**: "New Conversation" button remains enabled

#### Search Results Empty
- **Condition**: When search term returns no matches
- **State**: "No conversations found matching your search"
- **Recovery**: Clear search or modify search terms
- **Maintains**: All functionality while showing filtered results

### Customers Empty States

#### Loading State
- **Display**: "Loading conversations..." with centered text
- **Duration**: Shows while API calls are in progress
- **Fallback**: Graceful error handling if fetch fails

#### No Message History
- **Condition**: Customer has no SMS, WhatsApp, or email logs
- **Behavior**: Customer not included in conversations list
- **Logic**: Skips customers without communication history
- **Performance**: Optimizes by filtering during fetch

## Conversation Starters

### Enhanced View Integration
- **Primary Interface**: Defaults to EnhancedChatInterface
- **Toggle Option**: Switch between Classic and Enhanced views
- **State Management**: `useEnhanced` controls interface selection
- **Database Integration**: Real-time contact selection for new conversations

### "New Conversation" Button Logic

#### Feature Flag Control
```typescript
isFeatureEnabled('conversationsNewButton') && contactsCount > 0
```

#### Enabled State
- **Style**: Green button with MessageSquare icon
- **Action**: Switches to EnhancedChatInterface for conversation creation
- **Integration**: Connects with contact database for recipient selection

#### Disabled State  
- **Visual**: Grey button with reduced opacity and cursor-not-allowed
- **Tooltip**: Explains why feature is disabled
- **Recovery**: Guides user to add contacts first

### Contact Integration

#### Contact Validation
- **Requirements**: Customer must have email OR phone number
- **Phone Normalization**: Handles UK numbers with +44 formatting
- **Database Queries**: Checks SMS, WhatsApp, and email logs
- **Performance**: Concurrent queries for message type detection

#### Message Type Priority
1. **Most Recent**: Compares timestamps across all message types
2. **Email**: Checked via email_logs table
3. **SMS**: Checked via sms_logs table  
4. **WhatsApp**: Checked via whatsapp_logs table
5. **Fallback**: Defaults to SMS if multiple types exist

## What to Expect

### Conversation Flow
1. **Contact Creation**: Add customers to contact database
2. **Message History**: System tracks all communication automatically
3. **Conversation View**: Aggregates messages by customer
4. **New Conversations**: Create new threads via enhanced interface

### Customer Experience
- **Unified View**: All customer communications in one place
- **Contact Context**: Full customer details with message history
- **Search Capability**: Find conversations by name, email, phone, or content
- **Real-time Updates**: Live message synchronization

### Performance Features
- **Lazy Loading**: Loads 50 most recent customers initially
- **Optimized Queries**: Concurrent API calls for better performance
- **Smart Filtering**: Client-side search with server-side optimization
- **Error Recovery**: Graceful handling of API failures

## Feature Flags

### `conversationsNewButton`
- **Default**: `true`
- **Purpose**: Controls "New Conversation" button visibility
- **Logic**: Gates functionality based on contact availability

### `contactsExportFeedback` 
- **Default**: `true`
- **Purpose**: Shows toast notifications for export operations
- **Integration**: Works with customer export functionality

## Troubleshooting

### "New Conversation" Button Disabled
1. **Check Contacts**: Verify you have contacts in your database
2. **Contact Details**: Ensure contacts have email or phone numbers
3. **Organization Access**: Verify proper organization permissions
4. **Feature Flags**: Check if feature is enabled in settings

### No Conversations Showing
1. **Message History**: Verify customers have sent/received messages
2. **Database Logs**: Check SMS, WhatsApp, and email log tables
3. **Phone Format**: Ensure phone numbers are properly formatted
4. **Organization Isolation**: Verify correct organization context

### Search Not Working
1. **Search Fields**: Searches name, email, phone, and message content
2. **Case Sensitivity**: Search is case-insensitive
3. **Special Characters**: Handles phone number formatting variations
4. **Real-time**: Updates as you type with client-side filtering

### Enhanced Interface Issues
1. **Toggle Options**: Use view switcher if enhanced view fails
2. **Contact Selection**: Ensure contact database is populated
3. **Browser Compatibility**: Check for JavaScript errors in console
4. **Network Connectivity**: Verify API endpoints are accessible