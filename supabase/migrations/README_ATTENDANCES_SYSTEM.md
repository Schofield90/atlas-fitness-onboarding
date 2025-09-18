# Attendances Reporting System Migration

## Overview

This migration (`20250917_attendances_reporting_system.sql`) creates a comprehensive database schema for tracking class attendances and generating detailed reports. It's designed to work seamlessly with the existing Atlas Fitness CRM schema.

## Tables Created/Enhanced

### 1. **venues**

- **Purpose**: Physical locations where classes take place
- **Key Fields**: `id`, `organization_id`, `name`, `address`, `capacity`
- **Relationships**: Referenced by `classes` table

### 2. **instructors**

- **Purpose**: Instructors who can teach classes
- **Key Fields**: `id`, `organization_id`, `user_id`, `name`, `email`, `specializations`
- **Relationships**: Referenced by `classes.instructor_ids` array

### 3. **class_types** (Enhanced)

- **Purpose**: Types of classes offered (Yoga, HIIT, etc.)
- **Enhancements**: Added `duration_min`, `organization_id`, `metadata` columns
- **Relationships**: Referenced by `classes` table

### 4. **classes**

- **Purpose**: Individual class sessions with specific date/time
- **Key Fields**: `id`, `organization_id`, `class_type_id`, `venue_id`, `start_at`, `instructor_ids[]`
- **Note**: Uses instructor_ids array to support team-taught classes

### 5. **memberships**

- **Purpose**: Membership plan definitions
- **Key Fields**: `id`, `organization_id`, `name`, `price_pennies`, `class_limit`
- **Relationships**: Referenced by `customer_memberships`

### 6. **customer_memberships** (Enhanced)

- **Purpose**: Links customers to their membership plans
- **Enhancements**: Added `membership_id`, `active`, `started_at`, `ended_at`
- **Note**: Works with existing `clients` table (customers)

### 7. **bookings**

- **Purpose**: Individual class bookings and attendance records
- **Key Fields**: `id`, `organization_id`, `class_id`, `customer_id`, `status`
- **Status Options**: `registered`, `attended`, `late_cancelled`, `no_show`
- **Method Options**: `membership`, `drop_in`, `free`, `package`
- **Source Options**: `web`, `kiosk`, `mobile_app`, `staff`, `api`

## Key Features

### Enum Types

- **booking_status**: Tracks attendance outcomes
- **booking_method**: How the booking was paid for
- **booking_source**: Where the booking originated

### Comprehensive View: `all_attendances`

A powerful view that joins all related tables to provide:

- Complete class information (type, venue, instructors)
- Customer details and membership status
- Attendance tracking with calculated fields
- Performance metrics (late arrivals, etc.)

### Helper Function: `get_attendance_stats()`

Returns attendance statistics for a date range:

- Total bookings, attended, no-shows, cancellations
- Attendance rate percentage
- Average class size

### Performance Optimizations

- Strategic indexes on frequently queried columns
- Composite indexes for multi-column lookups
- GIN index for instructor_ids array searches

## Multi-Tenant Security

### Row Level Security (RLS)

- All tables have RLS enabled
- Policies ensure organization-level data isolation
- Works with both `organization_members` and `user_organizations` tables

### Access Patterns

- Users can only see data from their organization(s)
- Supports multiple organization membership
- Secure by default approach

## Usage Examples

### Basic Attendance Query

```sql
SELECT
    first_name,
    last_name,
    class_type_name,
    class_start_at,
    attendance_status,
    was_late
FROM all_attendances
WHERE organization_id = 'your-org-id'
AND DATE(class_start_at) = CURRENT_DATE;
```

### Attendance Statistics

```sql
SELECT * FROM get_attendance_stats(
    'your-org-id',
    '2024-01-01'::DATE,
    CURRENT_DATE
);
```

### Class Capacity Analysis

```sql
SELECT
    class_type_name,
    venue_name,
    COUNT(*) as total_bookings,
    COUNT(*) FILTER (WHERE attended = true) as total_attended,
    ROUND(AVG(CASE WHEN attended THEN 1.0 ELSE 0.0 END) * 100, 2) as attendance_rate
FROM all_attendances
WHERE organization_id = 'your-org-id'
AND class_start_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY class_type_name, venue_name
ORDER BY attendance_rate DESC;
```

### Late Arrival Analysis

```sql
SELECT
    first_name,
    last_name,
    class_type_name,
    minutes_late
FROM all_attendances
WHERE organization_id = 'your-org-id'
AND was_late = true
AND class_start_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY minutes_late DESC;
```

## Integration with Existing Schema

### Compatibility

- Uses existing `clients` table as customers
- Works with existing `organizations` table
- Enhances existing `class_types` table
- Compatible with both `organization_members` and `user_organizations`

### Data Migration

- Safe to run on existing databases
- Uses conditional column additions
- Preserves existing data
- Includes sample data for testing

## API Integration Points

### Frontend Components

- Attendance tracking dashboard
- Class booking interface
- Instructor schedule management
- Membership management

### Reporting Endpoints

- Daily/weekly/monthly attendance reports
- Customer attendance history
- Instructor performance metrics
- Revenue tracking by booking method

## Monitoring & Analytics

### Key Metrics

- **Attendance Rate**: Percentage of bookings that result in attendance
- **No-Show Rate**: Percentage of bookings that are no-shows
- **Class Utilization**: Average capacity usage per class
- **Peak Hours**: Most popular class times
- **Customer Engagement**: Frequency of bookings per customer

### Business Intelligence

- Identify most/least popular classes
- Track instructor performance
- Optimize class scheduling
- Improve retention strategies

## Future Enhancements

### Potential Additions

1. **Waitlist Management**: Track waitlisted customers
2. **Class Packages**: Multi-class booking packages
3. **Recurring Bookings**: Automated repeat bookings
4. **Instructor Ratings**: Customer feedback system
5. **Equipment Tracking**: Link classes to required equipment

### Performance Optimizations

1. **Partitioning**: Partition bookings by date for large datasets
2. **Materialized Views**: Pre-calculated attendance statistics
3. **Archival Strategy**: Archive old booking data

## Troubleshooting

### Common Issues

1. **Missing organization_id**: Ensure all records have organization_id
2. **RLS Policy Conflicts**: Check user organization membership
3. **Performance**: Add indexes for custom query patterns

### Migration Rollback

If needed, the migration can be rolled back by dropping the created tables in reverse order and removing the added columns from enhanced tables.

## Support

For questions about this migration or the attendances system:

1. Check existing migrations for related functionality
2. Review RLS policies for access issues
3. Monitor query performance with EXPLAIN ANALYZE
4. Consider materialized views for complex reporting queries
