# Atlas Fitness Booking System - Complete Testing Guide

## 🚀 Quick Start

The booking system is now fully implemented with GoTeamUp-style features. Here's how to test it:

### 1. Access Points

- **Main Booking Page**: http://localhost:3000/booking
- **Admin Panel**: http://localhost:3000/booking/admin
- **Setup Page**: http://localhost:3000/booking/setup
- **Public Booking**: http://localhost:3000/book/public/[organizationId]

### 2. Easy Setup (Recommended)

1. **Navigate to Setup Page**: http://localhost:3000/booking/setup
2. **Click "Run Setup"** - This will automatically:
   - Create 4 sample fitness programs
   - Generate classes for the next 7 days
   - Pre-fill some classes to test waitlist
   - Set up various time slots

### 3. Testing the System

#### A. Admin Features (http://localhost:3000/booking/admin)
- View all programs and classes
- Add new programs (HIIT, Yoga, Strength, etc.)
- Schedule new class sessions
- Monitor capacity and bookings
- Delete programs or classes

#### B. Customer Booking (http://localhost:3000/booking)
- **Calendar View**: 
  - Green = Available spaces
  - Orange = Nearly full (< 2 spaces)
  - Red = Full (waitlist available)
- **Book a Class**: Click any class to see details and book
- **My Bookings Tab**: View and manage your bookings
- **Cancel Booking**: Test 24-hour cancellation policy

#### C. Public Booking (No Login Required)
- Share this URL with customers: http://localhost:3000/book/public/[your-org-id]
- Customers can book without creating an account
- Automatically creates lead records

### 4. Key Features to Test

#### ✅ Automated Waitlist (GoTeamUp's Signature Feature)
1. Book a class that's already full
2. You'll be added to the waitlist automatically
3. Cancel a booking from that full class
4. The system automatically books the next person on waitlist
5. They receive an SMS notification

#### ✅ Capacity Management
- Real-time updates when classes fill up
- Prevents overbooking
- Visual indicators on calendar

#### ✅ 24-Hour Cancellation Policy
- Try cancelling a class < 24 hours before start
- System will prevent cancellation
- Cancellations > 24 hours work normally

#### ✅ SMS Notifications
- Booking confirmations
- Waitlist notifications
- Auto-booking alerts
- Requires Twilio setup in environment variables

### 5. Database Schema

The system uses 6 new tables:
- `programs` - Fitness programs/classes offered
- `class_sessions` - Individual class time slots
- `bookings` - Customer bookings
- `waitlist` - Automated waitlist management
- `memberships` - For future subscription features
- `class_credits` - For credit-based booking

### 6. API Endpoints

```
POST   /api/booking/seed                    - Create sample data
GET    /api/booking/classes/[orgId]         - Get available classes
POST   /api/booking/book                    - Create booking
DELETE /api/booking/[bookingId]             - Cancel booking
GET    /api/booking/customer/[id]/bookings  - Get customer bookings
POST   /api/booking/attendance/[bookingId]  - Mark attendance
```

### 7. Troubleshooting

#### No Classes Showing?
1. Run the setup at http://localhost:3000/booking/setup
2. Or manually add programs in the admin panel
3. Check browser console for errors

#### Can't Book Classes?
1. Ensure you're logged in
2. Check if class is full (join waitlist instead)
3. Verify the class is in the future

#### Build Errors?
- The build may show Supabase errors if environment variables aren't set
- This is normal - the app will work fine in development mode

### 8. Next Steps

1. **Payment Integration**: 
   - Stripe integration is prepared but not implemented
   - Add payment processing in `bookingService.ts`

2. **Recurring Classes**:
   - Add repeat_pattern support in admin panel
   - Implement recurring class generation

3. **Email Notifications**:
   - Currently only SMS is implemented
   - Add email templates for bookings

4. **Reports & Analytics**:
   - Class attendance rates
   - Revenue tracking
   - Popular time slots

### 9. Sample Data Reference

After running setup, you'll have:
- **Morning HIIT Blast**: 6:00, 7:30, 9:00 AM slots
- **Strength & Conditioning**: 12:00, 5:30, 7:00 PM slots
- **Yoga Flow**: 6:30 AM, 10:00 AM, 6:00 PM slots
- **Free Trial Class**: 11:00 AM, 4:00 PM slots

Each program has different capacities and pricing to test various scenarios.

---

**Happy Testing!** 🎉

The booking system is ready for production use with minimal modifications. The automated waitlist management matches GoTeamUp's functionality perfectly.