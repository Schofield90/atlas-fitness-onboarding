# Booking Links Guide

The booking links module provides comprehensive management of shareable booking links with routing corrections and toast notification feedback.

## Quick Start

Navigate to `/booking-links` to manage your booking links or `/booking-links/create` to create new ones.

## Fixed Routing Issues

### Corrected Navigation Paths
- **"Create Booking Link"** now correctly routes to `/booking-links/create` 
- **"Manage Links"** now correctly routes to `/booking-links` main page
- Fixed from incorrect routing: `/calendar?tab=booking-links` (old) → `/booking-links` (new)

### Where Routes Lead
- **From Booking Page**: Links in quick stats tile direct to `/booking-links`
- **From Empty State**: "Create Booking Link" button routes to `/booking-links/create` 
- **From Calendar**: Booking Links navigation corrected to proper page
- **From Dashboard**: Quick action buttons use direct routing instead of modal parameters

## Toast Notifications

### Copy to Clipboard Feedback
- **Success State**: Shows green checkmark icon for 2 seconds after copying
- **Visual Confirmation**: Icon changes from copy symbol to check mark
- **URL Format**: `{origin}/book/{slug}` copied to clipboard

### Save Operations
- **Creation Success**: Toast confirmation when new booking link created
- **Update Success**: Toast feedback for successful edits
- **Deletion Confirmation**: Alert dialog before deletion with success feedback
- **Error Handling**: Toast notifications for API failures with actionable messages

## Features Overview

### Booking Link Management
- **Create Links**: Drag-and-drop interface for new booking links
- **Edit Links**: Inline editing with real-time validation
- **Delete Links**: Confirmation dialog with permanent deletion warning
- **Copy URLs**: One-click clipboard copy with visual feedback

### Link Types
- **Individual**: Single staff member booking
- **Team**: Any available team member
- **Round Robin**: Even distribution among staff
- **Collective**: Group appointments

### Stats and Analytics
- **Total Bookings**: Lifetime booking count per link
- **Monthly Performance**: Current month booking statistics
- **Conversion Rates**: View-to-booking conversion tracking
- **Link Activity**: Active vs inactive link monitoring

## Configuration Options

### Link Settings
- **Auto-confirm**: Automatic booking confirmation (green indicator)
- **Manual Approval**: Requires admin approval (yellow indicator)  
- **Email Notifications**: Enabled/disabled with status indicators
- **Payment Collection**: Optional or required payment settings
- **Cancellation Policy**: Allow/disallow cancellations

### Visual Indicators
- **Status Badges**: Active (green), Inactive (gray), Private (yellow)
- **Type Icons**: Different icons for individual, team, round-robin bookings
- **Settings Dots**: Color-coded status indicators for quick configuration view

## What to Expect

### Navigation Experience
- **Direct Routing**: All buttons navigate directly to intended pages
- **No Modal Interference**: Removed problematic modal parameter routing
- **Breadcrumb Clarity**: Clear navigation path between booking and calendar sections
- **Consistent URLs**: Predictable URL structure across all booking-related pages

### User Feedback
- **Immediate Response**: Toast notifications appear instantly after actions
- **Visual Confirmation**: Icon state changes provide immediate feedback
- **Error Recovery**: Clear error messages with suggested next steps
- **Success States**: Positive feedback for all successful operations

### Performance
- **Fast Loading**: Optimized API calls with concurrent stats fetching
- **Real-time Updates**: Live stats updates without page refresh
- **Cached Analytics**: Performance optimization for frequently accessed metrics

## Troubleshooting

### "Create Booking Link" Not Working
1. Verify you're on the correct `/booking-links` page
2. Ensure proper authentication and organization access
3. Check for JavaScript errors in browser console
4. Try refreshing the page and attempt again

### Copy to Clipboard Failing
1. Ensure browser supports clipboard API
2. Check for HTTPS requirement on clipboard access
3. Verify popup blockers aren't interfering
4. Try manual copy from the displayed URL

### Routing Issues
1. Clear browser cache and cookies
2. Verify URL structure matches `/booking-links/action` pattern
3. Check for middleware authentication redirects
4. Ensure proper organization context is set

### Missing Toast Notifications
1. Verify toast provider is properly initialized
2. Check for client-side rendering issues
3. Ensure proper import of toast utilities
4. Verify network connectivity for API calls