# User Guide - Critical Features & Fixes

**Atlas Fitness CRM Platform - v1.2.0**  
**Updated**: August 25, 2025

---

## 🎯 Overview

This guide covers the newly fixed and enhanced features in Atlas Fitness CRM. All features are now fully operational and ready for production use.

---

## 📅 Public Booking System

### What's New
✅ **FIXED**: Customers can now access booking pages without logging in  
✅ **IMPROVED**: Better error handling for invalid booking links  
✅ **ENHANCED**: Mobile-optimized interface  

### How to Use Public Booking

#### For Gym Owners/Managers

1. **Find Your Booking Link**
   - Go to **Dashboard → Booking Settings**  
   - Your public booking URL format: 
     ```
     https://atlas-fitness-onboarding.vercel.app/book/public/YOUR-ORG-ID
     ```

2. **Share Your Booking Link**
   - Add to your website
   - Include in social media posts
   - Send via email/SMS to customers
   - Add to business cards and flyers

3. **Customize Booking Experience**
   - **Settings → Booking → General Settings**
   - Set available time slots
   - Configure class types
   - Set booking restrictions
   - Enable/disable features

#### For Customers

1. **Access Booking Page**
   - Click the booking link provided by your gym
   - No account creation required
   - Works on mobile and desktop

2. **Make a Booking**
   - Select your preferred date and time
   - Choose class type or personal training
   - Enter your contact details  
   - Confirm booking

3. **Receive Confirmation**
   - Email confirmation sent automatically
   - SMS reminder (if configured)
   - Calendar invite included

### Example Public Booking URLs
```
https://atlas-fitness-onboarding.vercel.app/book/public/atlas-fitness-york
https://atlas-fitness-onboarding.vercel.app/book/public/powerhouse-gym-london
https://atlas-fitness-onboarding.vercel.app/book/public/63589490-8f55-4157-bd3a-e141594b748e
```

### Troubleshooting
- **"Invalid Booking Link" error**: Check that your organization ID is correct
- **Page not loading**: Ensure the URL is exactly as provided
- **Booking not working**: Contact your gym to verify their settings

---

## 👥 Staff Management System

### What's Fixed
✅ **RESOLVED**: "Failed to fetch staff members" error  
✅ **IMPROVED**: Faster loading times  
✅ **ENHANCED**: Better error messages  

### How to Manage Staff

#### Accessing Staff Management
1. **Login to Dashboard**
2. **Navigate**: **Dashboard → Staff Management**
3. **View**: All staff members displayed in tabs

#### Staff Management Features

**View Staff List**
- See all team members
- View roles and permissions
- Access contact information
- Check online/offline status

**Staff Roles Available**
- **Owner**: Full platform access
- **Admin**: Management capabilities  
- **Coach**: Training and client management
- **Staff**: Basic operational access

#### Managing Staff Members

1. **Add New Staff**
   - Click **"Add Staff Member"**
   - Enter email address
   - Select role level
   - Send invitation

2. **Edit Staff Details**
   - Click on staff member name
   - Update role or permissions
   - Modify contact information
   - Save changes

3. **Remove Staff**
   - Select staff member
   - Click **"Remove Access"**  
   - Confirm action

### Staff Permissions by Role

| Feature | Owner | Admin | Coach | Staff |
|---------|-------|-------|-------|-------|
| Manage Staff | ✅ | ✅ | ❌ | ❌ |
| View Customers | ✅ | ✅ | ✅ | ✅ |
| Book Sessions | ✅ | ✅ | ✅ | ✅ |
| Access Reports | ✅ | ✅ | ➖ | ❌ |
| Billing Access | ✅ | ✅ | ❌ | ❌ |
| Integration Settings | ✅ | ❌ | ❌ | ❌ |

### Troubleshooting Staff Issues
- **Staff member can't login**: Check their email invitation status
- **Wrong permissions**: Verify their role assignment  
- **Not receiving invites**: Check spam folder, resend invitation

---

## 👤 Customer Creation & Management

### What's New
✅ **ADDED**: Complete customer creation system  
✅ **IMPROVED**: Comprehensive customer profiles  
✅ **ENHANCED**: Emergency contact tracking  

### How to Create Customers

#### Step-by-Step Process

1. **Access Customer Creation**
   - **Dashboard → Customers → Add New Customer**

2. **Fill Basic Information**
   ```
   ✅ First Name (required)
   ✅ Last Name (required)  
   ✅ Email (required)
   📱 Phone Number
   📅 Date of Birth
   ```

3. **Add Address Details**
   ```
   🏠 Address Line 1
   🏠 Address Line 2  
   🏙️ City
   📮 Postal Code
   🌍 Country (defaults to UK)
   ```

4. **Emergency Contact Information**
   ```
   👤 Emergency Contact Name
   📞 Emergency Contact Phone
   👥 Relationship (spouse, parent, friend, etc.)
   ```

5. **Additional Details**
   ```
   🏥 Medical Conditions/Notes
   📝 General Notes
   📢 Referral Source
   ✅ Marketing Consent
   ```

6. **Save Customer Record**
   - Click **"Create Customer"**
   - Customer added to your database
   - Available for booking and management

### Customer Profile Features

#### Complete Customer View
- **Personal Information**: All contact details
- **Membership History**: Past and current memberships
- **Booking History**: All past sessions
- **Payment History**: Financial records
- **Communication Log**: All interactions
- **Documents**: Waivers, contracts, photos

#### Customer Communication
- **Send Email**: Direct from customer profile
- **Send SMS**: Quick text messages
- **WhatsApp**: If configured
- **Voice Call**: If phone system enabled
- **Activity Timeline**: See all interactions

### Lead to Customer Conversion

#### Automatic Conversion
When you create a customer from an existing lead:
- ✅ Lead status automatically updated
- ✅ All lead information transferred
- ✅ Communication history preserved
- ✅ Tags and notes maintained

#### Manual Conversion Process
1. **Go to Leads section**
2. **Select qualified lead**
3. **Click "Convert to Customer"**
4. **Review and complete profile**
5. **Save as new customer**

---

## 🔄 Automation Workflow Builder

### What's Fixed
✅ **RESOLVED**: Adding nodes no longer deletes existing ones  
✅ **FIXED**: Clicking nodes opens configuration (not delete)  
✅ **IMPROVED**: Workflow testing with feedback  
✅ **ENHANCED**: Better error handling  

### How to Use the Workflow Builder

#### Creating Your First Workflow

1. **Access Workflow Builder**
   - **Dashboard → Automations → Create Workflow**

2. **Choose Workflow Type**
   - **Lead Nurturing**: Follow up with new leads
   - **Booking Reminders**: Automated session reminders  
   - **Membership Renewal**: Subscription notifications
   - **Custom Workflow**: Build from scratch

#### Building Workflows - Step by Step

**1. Add Trigger Node**
- Drag **"Trigger"** from left panel
- Choose trigger type:
  - New Lead Created
  - Booking Made
  - Payment Received
  - Date/Time Based
  - Custom Webhook

**2. Add Action Nodes**
- Drag actions from left panel:
  - **Send Email**: Automated email messages
  - **Send SMS**: Text message notifications
  - **Send WhatsApp**: WhatsApp messages  
  - **Wait**: Delays between actions
  - **Condition**: If/then logic
  - **Update Lead**: Change lead status

**3. Connect Nodes**
- Click and drag between node connection points
- Create logical flow from trigger to actions
- Add branches for different scenarios

**4. Configure Each Node**
- **Single click** on node to open configuration
- Set up message content
- Configure timing and conditions
- Test individual components

#### Testing Workflows

**Built-in Testing Features**
1. **Click "Test Workflow"**
2. **Review Test Results**:
   - ✅ Trigger validation
   - ✅ Node configuration check  
   - ✅ Flow logic verification
   - ✅ Timing simulation

**Manual Testing Process**
1. **Save workflow as "Draft"**
2. **Create test trigger event**
3. **Monitor execution in real-time**  
4. **Check all actions completed**
5. **Activate workflow when satisfied**

#### Workflow Management

**Activate/Deactivate**
- **Toggle switch** in workflow list
- ✅ Active workflows run automatically
- ⏸️ Inactive workflows are paused

**Monitor Performance**  
- **Dashboard → Automations → Analytics**
- See execution rates
- Monitor success/failure rates
- Track customer engagement

### Pre-built Workflow Templates

#### Lead Nurturing Sequence
```
Trigger: New Lead Created
↓
Action: Send Welcome Email
↓  
Wait: 1 hour
↓
Action: Send SMS with booking link
↓
Wait: 24 hours  
↓
Action: Follow-up email with offer
```

#### Booking Reminder Sequence
```
Trigger: Booking Created
↓
Wait: 24 hours before session
↓
Action: Email reminder
↓
Wait: 2 hours before session
↓  
Action: SMS reminder
```

---

## 💳 Billing & Subscription Management

### What's Fixed
✅ **RESOLVED**: "Upgrade to Pro" button now works  
✅ **IMPROVED**: Navigation to billing section  

### How to Manage Your Subscription

#### Accessing Billing
1. **Dashboard → Billing** (or click "Upgrade to Pro")
2. **View Current Plan Details**
3. **Manage Payment Methods**
4. **Update Subscription**

#### Available Plans
- **Free Plan**: Basic features for small gyms
- **Professional**: Advanced features and integrations  
- **Enterprise**: Full platform with white-label options

#### Upgrading Your Plan
1. **Click "Upgrade Plan"**
2. **Select desired tier**
3. **Enter payment information**
4. **Confirm upgrade**
5. **Access activated immediately**

---

## 🚨 Troubleshooting Common Issues

### Public Booking Problems
**Issue**: Booking page shows "Invalid Booking Link"  
**Solution**: Check organization ID in URL, contact support if needed

**Issue**: Customers can't complete booking  
**Solution**: Verify booking settings, check availability rules

### Staff Management Problems  
**Issue**: Staff list not loading  
**Solution**: Refresh page, check internet connection, contact support

**Issue**: Staff member permissions not working  
**Solution**: Verify role assignment, re-save staff member settings

### Customer Creation Problems
**Issue**: Form not saving  
**Solution**: Check required fields (name, email), verify internet connection

**Issue**: Customer not appearing in list  
**Solution**: Refresh customers page, check filters

### Automation Builder Problems
**Issue**: Nodes disappearing when adding new ones  
**Solution**: This has been fixed - try again, contact support if persists

**Issue**: Workflow not executing  
**Solution**: Check trigger configuration, verify workflow is active

---

## 📞 Getting Help

### Self-Service Options
- **Help Documentation**: Available in platform
- **Video Tutorials**: Step-by-step guides
- **FAQ Section**: Common questions answered

### Contact Support  
- **In-App Support**: Help button in bottom-right  
- **Email**: Contact via platform messaging
- **Urgent Issues**: Use priority support channel

### Training Resources
- **Onboarding Checklist**: Complete setup guide
- **Feature Walkthroughs**: Interactive tutorials  
- **Best Practices**: Optimization guides
- **Webinar Schedule**: Live training sessions

---

**All these features are now fully operational and ready to help you manage your fitness business more effectively. Take advantage of the improved functionality to streamline your operations and provide better service to your customers.**