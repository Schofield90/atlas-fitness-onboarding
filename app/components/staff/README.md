# Staff Calendar System

A comprehensive React component system for managing staff schedules, bookings, and availability in the Atlas Fitness platform.

## Components

### SharedStaffCalendar

The main calendar component that provides a full-featured staff scheduling interface.

#### Features

- **Multi-view Support**: Day, Week, and Month views
- **Real-time Updates**: Live synchronization using Supabase subscriptions
- **Drag & Drop**: Visual booking rescheduling (coming soon)
- **Conflict Detection**: Automatic detection of scheduling conflicts
- **Color Coding**: Different colors for booking types and staff members
- **Advanced Filtering**: Filter by staff members and booking types
- **Mobile Responsive**: Optimized for all screen sizes
- **Keyboard Navigation**: Full keyboard shortcut support
- **Booking Management**: Create, edit, and delete bookings
- **Capacity Tracking**: Visual indicators for group class capacity

#### Props

```typescript
interface SharedStaffCalendarProps {
  organizationId: string;        // Required: Organization ID
  currentUserId?: string;        // Optional: Current user ID for permissions
  initialView?: 'day' | 'week' | 'month'; // Default view on load
}
```

#### Usage

```tsx
import SharedStaffCalendar from '@/app/components/staff/SharedStaffCalendar';

export default function CalendarPage() {
  return (
    <SharedStaffCalendar
      organizationId="your-org-id"
      currentUserId="current-user-id"
      initialView="week"
    />
  );
}
```

### StaffCalendarPage

A complete page component that includes the calendar with statistics and additional UI elements.

#### Features

- Calendar statistics dashboard
- Usage tips and keyboard shortcuts
- Error handling and loading states
- Responsive layout

#### Usage

```tsx
import StaffCalendarPage from '@/app/components/staff/StaffCalendarPage';

export default function StaffCalendar() {
  return (
    <StaffCalendarPage
      organizationId="your-org-id"
      currentUserId="current-user-id"
    />
  );
}
```

## Database Schema

The calendar system uses several database tables:

### staff_calendar_bookings

Main booking table with the following key fields:

- `id`: Unique booking ID
- `organization_id`: Organization reference
- `title`: Booking title
- `booking_type`: Type of booking (enum)
- `start_time` / `end_time`: Time range
- `assigned_staff_id`: Staff member assigned
- `max_capacity` / `current_bookings`: Capacity tracking
- `status`: Booking status
- `color_hex`: Custom color

### staff_calendar_colors

Color configuration for booking types and staff members:

- `booking_type`: Associated booking type
- `staff_id`: Associated staff member
- `hex_color`: Color value
- `is_default_for_type`: Default color flag

### staff_profiles

Staff member information:

- `first_name` / `last_name`: Staff name
- `job_position`: Role/position
- `avatar_url`: Profile picture
- `organization_id`: Organization reference

## Booking Types

The system supports 10 different booking types:

1. **PT Session (1-2-1)** - Personal training sessions
2. **Group Class** - Group fitness classes
3. **Gym Floor Time** - General gym floor availability
4. **Staff Meeting** - Administrative meetings
5. **Consultation** - Member consultations
6. **Equipment Maintenance** - Equipment servicing
7. **Facility Cleaning** - Cleaning schedules
8. **Private Event** - Private gym hire
9. **Break Time** - Staff break periods
10. **Training Session** - Staff training

Each type has its own default color and icon.

## Real-time Features

The calendar uses Supabase real-time subscriptions to provide:

- Live booking updates across all connected clients
- Instant conflict detection
- Real-time capacity updates
- Automatic refresh when bookings change

## Keyboard Shortcuts

- `D` - Switch to Day view
- `W` - Switch to Week view
- `M` - Switch to Month view
- `T` - Go to Today
- `N` - Create new booking
- `F` - Toggle filters
- `←` / `→` - Navigate previous/next
- `Esc` - Close modals/panels

## Filtering & Search

### Staff Member Filter

Filter bookings by specific staff members:

```typescript
const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
// Pass to calendar component
```

### Booking Type Filter

Filter by specific booking types:

```typescript
const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
// Pass to calendar component
```

### Date Range Filtering

The calendar automatically filters bookings based on the current view and date range.

## Conflict Detection

The system includes automatic conflict detection:

1. **Database Function**: `check_staff_calendar_conflicts()`
2. **Real-time Validation**: Conflicts shown in booking modal
3. **Visual Warnings**: Red indicators for conflicts
4. **Prevention**: Optional conflict prevention

## API Integration

### Creating Bookings

```typescript
const { error } = await supabase
  .from('staff_calendar_bookings')
  .insert({
    organization_id: orgId,
    title: 'New Booking',
    booking_type: 'pt_session_121',
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    assigned_staff_id: staffId,
    created_by_staff_id: currentStaffId
  });
```

### Updating Bookings

```typescript
const { error } = await supabase
  .from('staff_calendar_bookings')
  .update(updateData)
  .eq('id', bookingId);
```

### Fetching Bookings

```typescript
const { data, error } = await supabase
  .from('staff_calendar_bookings_view')
  .select('*')
  .eq('organization_id', orgId)
  .gte('start_time', startDate.toISOString())
  .lte('end_time', endDate.toISOString())
  .order('start_time');
```

## Styling & Theming

The calendar uses Tailwind CSS with a dark theme:

- **Background**: Gray-800/900 palette
- **Borders**: Gray-700
- **Text**: White/Gray-300 hierarchy
- **Accent**: Blue-500/600 for primary actions
- **Status Colors**: 
  - Green: Confirmed bookings
  - Yellow: Tentative bookings
  - Red: Conflicts/errors
  - Purple: Special events

## Mobile Responsiveness

The calendar adapts to different screen sizes:

- **Desktop**: Full grid layout with all features
- **Tablet**: Responsive grid with collapsible filters
- **Mobile**: Stacked layout with swipe navigation

## Performance Optimizations

1. **Memoized Filtering**: Efficient bookmark filtering
2. **Virtual Scrolling**: For large datasets (month view)
3. **Debounced Search**: Prevents excessive API calls
4. **Optimistic Updates**: Immediate UI feedback
5. **Subscription Management**: Proper cleanup to prevent memory leaks

## Error Handling

The system includes comprehensive error handling:

- **Network Errors**: Retry mechanisms with user feedback
- **Validation Errors**: Form validation with clear messages
- **Permission Errors**: Graceful fallbacks
- **Conflict Errors**: Clear warnings with resolution options

## Testing

The calendar components are designed to be testable:

```typescript
// Example test
import { render, screen, fireEvent } from '@testing-library/react';
import SharedStaffCalendar from './SharedStaffCalendar';

test('creates new booking when clicking empty slot', () => {
  render(<SharedStaffCalendar organizationId="test-org" />);
  
  const emptySlot = screen.getByTestId('time-slot-0-0');
  fireEvent.click(emptySlot);
  
  expect(screen.getByText('New Booking')).toBeInTheDocument();
});
```

## Future Enhancements

- **Drag & Drop**: Visual booking rescheduling
- **Recurring Bookings**: Support for repeating appointments
- **Resource Management**: Room and equipment booking
- **Advanced Reporting**: Calendar analytics and insights
- **Mobile App**: React Native implementation
- **AI Scheduling**: Intelligent scheduling suggestions

## Support

For questions or issues with the staff calendar system, please refer to:

1. Component documentation (this file)
2. Database migration files in `/supabase/migrations/`
3. Type definitions in `/app/lib/types/staff.ts`
4. Example usage in `/app/staff/calendar/page.tsx`