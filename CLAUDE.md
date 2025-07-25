# Atlas Fitness Onboarding - Development Notes

## Project Status (July 24, 2025)

### 🚀 Recent Achievements

#### 1. **GoTeamUp-Style Booking System (Completed Today - July 24)**
- ✅ Complete class booking system with calendar view
- ✅ Automated waitlist management (like GoTeamUp)
- ✅ Real-time capacity tracking
- ✅ 24-hour cancellation policy enforcement
- ✅ Customer booking history and management
- ✅ Database schema with 6 new tables (programs, class_sessions, bookings, waitlist, memberships, class_credits)
- ✅ Full RLS (Row Level Security) policies
- ✅ API endpoints for all booking operations
- ✅ React components with react-big-calendar integration
- ✅ SMS notifications for bookings and waitlist updates

#### 2. **WhatsApp & SMS Integration (Completed July 23)**
- ✅ Full Twilio integration for WhatsApp and SMS messaging
- ✅ Test page at `/test-whatsapp` for sending messages
- ✅ API endpoints: `/api/whatsapp/send` and `/api/sms/send`
- ✅ Webhook handler at `/api/webhooks/twilio` for receiving messages
- ✅ Auto-responses for keywords (STOP, START, HELP, RENEW)
- ✅ Database tables: `sms_logs`, `whatsapp_logs`, `contacts`
- ✅ Integration with automation system (SendWhatsAppAction, SendSMSAction)

#### 3. **Automation System Fixes**
- ✅ Fixed dynamic routing for automation builder (`/automations/builder/[id]`)
- ✅ Updated Workflow types to match the comprehensive automation interface
- ✅ TypeScript errors resolved for Next.js 15 compatibility

#### 4. **Dashboard Updates**
- ✅ WhatsApp button now navigates to test page (was showing "coming soon")
- ✅ All integrations accessible from dashboard

### 🔧 Environment Variables Required

Add these to your Vercel project settings:

```env
# Twilio (Required for WhatsApp/SMS)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886  # Must include whatsapp: prefix!
TWILIO_SMS_FROM=+1234567890

# Existing variables you should already have:
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-key
# ... other existing vars
```

### 📱 WhatsApp Setup Instructions

1. **Join Twilio Sandbox** (Required for testing):
   - Send `join [your-sandbox-word]` to `+14155238886` via WhatsApp
   - Get your sandbox word from Twilio Console → Messaging → Try it out
   - Wait for confirmation before sending test messages

2. **Configure Webhook** (for receiving messages):
   - In Twilio Console, set webhook URL to: `https://atlas-fitness-onboarding.vercel.app/api/webhooks/twilio`
   - Method: POST

3. **Production Setup** (when ready):
   - Get dedicated WhatsApp Business number from Twilio
   - Complete WhatsApp Business verification
   - Update `TWILIO_WHATSAPP_FROM` with your business number

### 🏗️ Project Structure

```
/app
├── /api
│   ├── /booking              # Booking system endpoints
│   │   ├── /classes/[organizationId]  # Get available classes
│   │   ├── /book             # Create new booking
│   │   ├── /[bookingId]      # Cancel booking
│   │   ├── /customer/[customerId]/bookings  # Get customer bookings
│   │   └── /attendance/[bookingId]  # Mark attendance
│   ├── /sms/send              # SMS sending endpoint
│   ├── /whatsapp/send         # WhatsApp sending endpoint
│   └── /webhooks/twilio       # Incoming message handler
├── /automations
│   ├── page.tsx               # Automation dashboard
│   ├── /builder
│   │   ├── page.tsx          # New workflow creation
│   │   └── /[id]/page.tsx    # Edit existing workflow
│   └── /templates            # Pre-built automation templates
├── /booking                  # Booking system UI
│   └── page.tsx             # Main booking page
├── /components/booking       # Booking components
│   ├── BookingCalendar.tsx  # Calendar view for classes
│   ├── BookingCalendar.css  # Calendar styling
│   ├── ClassBookingModal.tsx # Class details and booking modal
│   └── CustomerBookings.tsx # Customer booking history
├── /test-whatsapp            # WhatsApp/SMS testing interface
└── /lib
    ├── /services
    │   ├── booking.ts        # Booking service implementation
    │   └── twilio.ts         # Twilio service implementation
    └── /automation/actions   # Automation actions (SMS, WhatsApp, etc.)
```

### 🐛 Known Issues & Solutions

1. **"Invalid From and To pair" Error**:
   - Ensure `TWILIO_WHATSAPP_FROM` includes `whatsapp:` prefix
   - Phone numbers need country code (e.g., +1234567890)
   - Must join sandbox before sending WhatsApp messages

2. **Vercel Deployment Not Triggering**:
   - Check Vercel dashboard for any paused deployments
   - Ensure GitHub integration is active
   - Production branch should be set to `main`

### 📱 Booking System Setup Instructions

1. **Run Database Migration**:
   ```bash
   # Apply the booking system migration to your Supabase database
   supabase migration up
   ```

2. **Seed Sample Data** (optional):
   - Create some test programs and class sessions in Supabase dashboard
   - Or create an admin interface to manage programs and sessions

3. **Test the Booking Flow**:
   - Navigate to `/booking` in the app
   - View available classes on the calendar
   - Click a class to book it
   - Check "My Bookings" tab to see your bookings
   - Test cancellation (24+ hours before class)

### 📋 Next Steps When Resuming

1. **Enhance Booking System**:
   - [ ] Add admin interface for managing programs and class sessions
   - [ ] Implement recurring class sessions
   - [ ] Add payment processing with Stripe
   - [ ] Create public booking pages for non-authenticated users
   - [ ] Add check-in functionality for attendance
   - [ ] Implement membership and credit system
   - [ ] Add reporting for class attendance and revenue

2. **Complete Automation System**:
   - [ ] Implement actual workflow execution engine
   - [ ] Add more trigger types (webhook, schedule, event)
   - [ ] Create visual workflow builder UI
   - [ ] Add workflow templates for common gym scenarios

3. **Enhance WhatsApp Features**:
   - [ ] Add WhatsApp template messages (requires Facebook Business verification)
   - [ ] Implement broadcast messaging
   - [ ] Add media message support (images, PDFs)
   - [ ] Create conversation threading

4. **Lead Management**:
   - [ ] Complete lead scoring system
   - [ ] Add lead assignment to staff
   - [ ] Implement lead nurturing workflows
   - [ ] Add conversion tracking

5. **Integrations to Add**:
   - [ ] Stripe for payment processing
   - [ ] Calendar booking system completion
   - [ ] Email marketing integration
   - [ ] Gym management software APIs

6. **Database Migrations**:
   - [ ] Run pending migrations for messaging tables
   - [ ] Add indexes for performance
   - [ ] Set up proper RLS policies

### 🚀 Deployment Info

- **Production URL**: https://atlas-fitness-onboarding.vercel.app
- **GitHub Repo**: https://github.com/Schofield90/atlas-fitness-onboarding
- **Main Branch**: All features are now on `main`
- **Vercel Project**: Auto-deploys on push to main

### 💡 Quick Commands

```bash
# Local development
npm run dev

# Build check
npm run build

# Lint check
npm run lint

# Manual Vercel deployment
vercel --prod
```

### 📝 Testing Checklist

- [ ] WhatsApp message sending works (join sandbox first!)
- [ ] SMS message sending works
- [ ] Automation builder loads without 404
- [ ] Dashboard buttons navigate correctly
- [ ] Webhook receives incoming messages
- [ ] Database tables created successfully
- [ ] Booking calendar displays available classes
- [ ] Class booking creates successful booking
- [ ] Waitlist functionality works when class is full
- [ ] Cancellation respects 24-hour policy
- [ ] Customer bookings display correctly
- [ ] SMS notifications sent for bookings

### 🔐 Security Notes

- Never commit `.env.local` file
- Webhook signature validation implemented for production
- All messaging is logged for audit trail
- Opt-out management implemented (STOP/START keywords)

---

**Last Updated**: July 24, 2025 (4:30 PM)
**Last Commit**: Fixed force-create-data endpoint and improved error reporting

### 🚨 Current Status - BOOKING SYSTEM ISSUES

The booking system is built but experiencing data creation issues:

1. **Organization exists**: Atlas Fitness (ID: 63589490-8f55-4157-bd3a-e141594b740e) ✅
2. **Database tables exist**: programs, class_sessions, bookings, etc. ✅
3. **Test inserts work**: Individual program inserts succeed ✅
4. **Bulk creation fails**: force-create-data endpoint returns 0 programs/sessions ❌

### Debug Progress Today:
- Fixed TypeScript build errors with .catch() → try-catch
- Fixed UUID type errors (removed explicit IDs)
- Created multiple debug endpoints:
  - `/api/debug/test-supabase` - Tests connection and permissions
  - `/api/debug/test-insert` - Tests individual inserts (WORKS!)
  - `/api/debug/force-create-data` - Bulk creation (FAILS)

### Key URLs When Resuming:
1. **Debug Page**: https://atlas-fitness-onboarding.vercel.app/booking-debug
   - Orange button "Test Insert" - This WORKS (3/3 tests pass)
   - Green button "Create Fresh Sessions" - This FAILS (0 created)
   
2. **Live Booking**: https://atlas-fitness-onboarding.vercel.app/booking-live
   - Shows "No Classes Available" because no data exists

### Next Steps to Fix:
1. The test insert proves the database accepts data
2. The bulk creation is failing silently - need to add more logging
3. Possible issues:
   - Transaction rollback?
   - Batch insert vs individual inserts?
   - Missing required fields?

### Working Code Reference:
The test insert that WORKS uses this pattern:
```typescript
const { data, error } = await supabase
  .from('programs')
  .insert({
    organization_id: organizationId,
    name: 'Test Program',
    price_pennies: 1000,
    is_active: true
  })
  .select();
```

**Last Working Commit**: caeda19

---

## 🤖 WhatsApp AI Integration (July 25, 2025)

### Overview
Integrated Anthropic's Claude AI (claude-3-5-sonnet-20241022) to handle WhatsApp conversations automatically. The AI uses a knowledge base stored in Supabase to provide consistent, sales-focused responses.

### What Was Done

1. **Installed Anthropic SDK**
   ```bash
   npm install @anthropic-ai/sdk
   ```

2. **Created AI System Components**
   - `/app/lib/ai/anthropic.ts` - Claude AI integration
   - `/app/lib/knowledge.ts` - Knowledge base management
   - `/supabase/knowledge-table.sql` - Database schema and initial data

3. **Updated WhatsApp Webhook**
   - Modified `/app/api/webhooks/twilio/route.ts` to use AI for responses
   - AI handles all messages except keywords (STOP, START, HELP, RENEW)

4. **Knowledge Base Structure**
   - **SOPs**: Lead management, booking process, objection handling
   - **FAQs**: Hours, pricing, personal training, membership freezing
   - **Pricing**: Membership tiers and class packages
   - **Policies**: Cancellation and guest policies
   - **Quiz Content**: Interactive fitness questionnaires
   - **Style Guide**: Communication tone and sales approach
   - **Schedule**: Peak hours and class highlights

### Setup Instructions

1. **Add Environment Variable**
   ```env
   ANTHROPIC_API_KEY=your-api-key-from-console.anthropic.com
   ```

2. **Create Knowledge Table**
   - Run `/supabase/knowledge-table.sql` in Supabase SQL Editor

3. **Deploy to Vercel**
   - Add ANTHROPIC_API_KEY to Vercel environment variables
   - Redeploy for changes to take effect

### How It Works

1. Customer sends WhatsApp message
2. Webhook receives message
3. System fetches relevant knowledge from database
4. Claude AI generates contextual response
5. Response sent back via WhatsApp

### Key Features

- **Contextual Responses**: AI uses gym-specific knowledge
- **Sales Focus**: Guides conversations toward bookings
- **Booking Detection**: Flags when customers show interest
- **Info Extraction**: Captures emails and contact details
- **Fallback Handling**: Graceful errors with human handoff

### Customization

To update the AI's knowledge:
1. Modify entries in the `knowledge` table
2. Add new SOPs, FAQs, or policies as needed
3. The AI automatically uses updated information

### Testing

1. Send a WhatsApp message to your business number
2. Ask about gym hours, pricing, or membership
3. The AI should respond with relevant information
4. Responses are kept concise for WhatsApp (under 300 chars)

### Debug Endpoints

- `/api/whatsapp/debug-send` - Detailed error information
- `/api/whatsapp/test-template` - Template message testing

**Note**: WhatsApp Business API requires customer-initiated conversations or approved templates for business-initiated messages.

---

## 🎯 AI Configuration Interface (July 25, 2025)

### What Was Built

Created a comprehensive AI training and management system at `/ai-config` with 5 tabs:

#### 1. **Training Tab**
- Add/edit/delete knowledge entries
- Types: FAQ, SOP, Pricing, Policies, Services, Schedule, Style
- Real-time knowledge base management
- Current entries displayed with type badges

#### 2. **Flows Tab** ✅ 
- Editable conversation flows
- Lead Qualification Flow
- Objection Handling Flow
- Add/remove/edit steps inline
- Visual step-by-step flow display

#### 3. **Interview Tab** ✅
- AI asks questions about your gym
- Smart question generation based on missing info
- Avoids duplicate questions
- Auto-saves answers to knowledge base
- Progress tracking
- 10 categories: Basic Info, Pricing, Services, Facilities, etc.

#### 4. **Test Tab**
- Live chat interface to test AI responses
- See exactly how AI will respond to customers
- Real-time message testing

#### 5. **Analytics Tab**
- Response rate metrics
- Booking conversion tracking
- Common topics analysis
- Performance visualization

### 🐛 Current Issue: AI Not Using Real Data

**Problem**: AI is responding with generic placeholder data instead of actual gym information from the knowledge base.

**Debugging Added**:
1. `/api/debug/knowledge` - Check what's in the knowledge base
2. `/api/test-ai-knowledge` - Test AI responses with specific messages
3. Enhanced logging in WhatsApp webhook
4. Fixed server-side Supabase client usage

**Next Steps to Fix**:
1. Verify knowledge base has data using debug endpoint
2. Check if knowledge is being fetched properly
3. Ensure AI prompt is using the provided context
4. Test with the test-ai-knowledge endpoint

### 📝 Pending Tasks

1. **Fix AI Knowledge Usage** (High Priority)
   - AI should use actual gym data from knowledge base
   - Not generic placeholders

2. **Save Flow Configurations** (Medium Priority)
   - Create endpoint to persist flow changes
   - Load saved flows on page load

3. **Enhanced Analytics** (Low Priority)
   - Connect to real message data
   - Track actual conversion metrics

### 🔧 Technical Details

**Components Created**:
- `/app/ai-config/page.tsx` - Main configuration interface
- `/app/ai-config/components.tsx` - UI components (Card, Tabs)
- `/app/ai-config/FlowStep.tsx` - Editable flow step component
- `/app/ai-config/InterviewAnswer.tsx` - Interview answer input

**API Endpoints**:
- `/api/ai/test-chat` - Test AI responses
- `/api/ai/interview-question` - Generate interview questions
- `/api/debug/knowledge` - Debug knowledge base
- `/api/test-ai-knowledge` - Test AI with knowledge

**Key Features**:
- Fixed input focus issues with local state management
- Smart question generation avoiding duplicates
- Relevance scoring for knowledge retrieval
- Comprehensive logging for debugging

### 🎮 How to Use When Resuming

1. **Check Knowledge Base**:
   ```
   GET https://atlas-fitness-onboarding.vercel.app/api/debug/knowledge
   ```

2. **Test AI Response**:
   ```bash
   curl -X POST https://atlas-fitness-onboarding.vercel.app/api/test-ai-knowledge \
     -H "Content-Type: application/json" \
     -d '{"message": "where is the gym located"}'
   ```

3. **Check Vercel Logs** for detailed debug output

4. **Continue Training** via the Interview tab or Training tab

**Last Updated**: July 25, 2025 (7:00 PM)
**Status**: AI configuration interface complete, debugging knowledge retrieval issue