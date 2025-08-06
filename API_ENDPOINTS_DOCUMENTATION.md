# New API Endpoints for Trigger Types

This document describes the 5 new API endpoints created for supporting various automation trigger types.

## Authentication

All endpoints require authentication via Bearer token:
```
Authorization: Bearer <your_jwt_token>
```

All endpoints are organization-scoped and will only return data for the authenticated user's organization.

## Endpoints

### 1. GET /api/contacts/tags

Fetches all contact tags with usage counts for the organization.

**Response:**
```json
{
  "data": {
    "tags": [
      {
        "id": "uuid",
        "name": "Hot Lead",
        "description": "Highly interested prospect",
        "color": "#FF5722",
        "category": "status",
        "usage_count": 25,
        "contact_count": 25,
        "last_used_at": "2025-08-06T10:30:00Z",
        "created_at": "2025-08-01T10:00:00Z",
        "updated_at": "2025-08-06T10:30:00Z"
      }
    ],
    "total": 1
  }
}
```

### 2. GET /api/contacts/birthdays

Fetches contacts with upcoming birthdays.

**Query Parameters:**
- `days_ahead` (optional): Number of days to look ahead (default: 30)
- `include_past` (optional): Include past birthdays from last 7 days (default: false)

**Response:**
```json
{
  "data": {
    "contacts": [
      {
        "id": "uuid",
        "reminder_id": "uuid",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "phone": "+44123456789",
        "birth_date": "1990-08-15",
        "birth_year": 1990,
        "next_birthday": "2025-08-15",
        "days_until_birthday": 9,
        "age_turning": 35,
        "custom_message": "Happy birthday! 🎉",
        "reminder_days_before": 1,
        "last_reminder_sent": null,
        "lead_id": "uuid",
        "client_id": null,
        "type": "lead"
      }
    ],
    "total": 1,
    "date_range": {
      "start_date": "2025-08-06",
      "end_date": "2025-09-05",
      "days_ahead": 30
    }
  }
}
```

### 3. Webhook Endpoints Management

#### GET /api/webhooks/endpoints
Fetches all webhook endpoints for the organization.

**Response:**
```json
{
  "data": {
    "webhooks": [
      {
        "id": "uuid",
        "name": "Lead Capture",
        "endpoint_url": "/webhook/lead-capture",
        "description": "Captures leads from external forms",
        "is_active": true,
        "allowed_methods": ["POST"],
        "response_format": "json",
        "total_requests": 150,
        "successful_requests": 145,
        "failed_requests": 5,
        "last_request_at": "2025-08-06T10:30:00Z",
        "created_at": "2025-08-01T10:00:00Z",
        "updated_at": "2025-08-06T10:30:00Z"
      }
    ],
    "total": 1
  }
}
```

#### POST /api/webhooks/endpoints
Creates a new webhook endpoint.

**Request Body:**
```json
{
  "name": "Lead Capture",
  "endpoint_url": "/webhook/lead-capture",
  "description": "Captures leads from external forms",
  "is_active": true,
  "allowed_methods": ["POST"],
  "expected_headers": {},
  "response_format": "json",
  "success_response": {"status": "success"},
  "error_response": {"status": "error"},
  "payload_mapping": {}
}
```

#### PUT /api/webhooks/endpoints
Updates an existing webhook endpoint.

**Request Body:**
```json
{
  "id": "uuid",
  "name": "Updated Lead Capture",
  "is_active": false
}
```

#### DELETE /api/webhooks/endpoints?id=uuid
Deletes a webhook endpoint.

### 4. GET /api/appointments/types

Fetches all appointment/program types for the organization.

**Response:**
```json
{
  "data": {
    "appointment_types": [
      {
        "id": "uuid",
        "name": "Personal Training",
        "description": "One-on-one training session",
        "duration_weeks": null,
        "price": {
          "amount": 5000,
          "currency": "GBP",
          "formatted": "£50.00"
        },
        "max_participants": 1,
        "program_type": "ongoing",
        "session_count": 25,
        "is_active": true,
        "created_at": "2025-08-01T10:00:00Z",
        "updated_at": "2025-08-06T10:30:00Z"
      }
    ],
    "grouped_by_type": {
      "ongoing": [...],
      "challenge": [...]
    },
    "total": 1,
    "summary": {
      "by_type": [
        {"type": "ongoing", "count": 3},
        {"type": "challenge", "count": 2}
      ]
    }
  }
}
```

### 5. GET /api/appointments/staff

Fetches all staff members for appointments/bookings.

**Query Parameters:**
- `include_availability` (optional): Include upcoming appointments (default: false)
- `role` (optional): Filter by staff role
- `is_available` (optional): Filter by availability status

**Response:**
```json
{
  "data": {
    "staff": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "email": "trainer@example.com",
        "phone_number": "+44123456789",
        "role": "trainer",
        "is_available": true,
        "communication_preferences": {
          "receives_calls": true,
          "receives_sms": true,
          "receives_whatsapp": true,
          "receives_emails": true
        },
        "routing_priority": 100,
        "user_details": {
          "id": "uuid",
          "name": "Jane Smith",
          "avatar_url": "https://example.com/avatar.jpg"
        },
        "upcoming_appointments": [
          {
            "id": "uuid",
            "name": "Morning Class",
            "start_time": "2025-08-07T09:00:00Z",
            "end_time": "2025-08-07T10:00:00Z",
            "current_bookings": 8,
            "max_capacity": 12
          }
        ],
        "appointment_count": 1,
        "availability_status": "busy",
        "created_at": "2025-08-01T10:00:00Z",
        "updated_at": "2025-08-06T10:30:00Z"
      }
    ],
    "grouped_by_role": {
      "trainer": [...],
      "staff": [...]
    },
    "total": 1,
    "summary": {
      "available_count": 5,
      "by_role": [
        {"role": "trainer", "count": 3, "available_count": 2},
        {"role": "staff", "count": 2, "available_count": 2}
      ]
    }
  }
}
```

## Error Handling

All endpoints return errors in the following format:
```json
{
  "error": "Error message describing what went wrong",
  "timestamp": "2025-08-06T10:30:00Z"
}
```

Common HTTP status codes:
- 200: Success
- 400: Bad Request (validation errors)
- 401: Unauthorized (missing or invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Internal Server Error

## Usage in Automation Workflows

These endpoints can be used as data sources in automation workflows:

1. **Contacts/Tags**: Filter contacts by specific tags for targeted campaigns
2. **Contacts/Birthdays**: Trigger birthday greetings and special offers
3. **Webhook Endpoints**: Manage inbound triggers from external systems
4. **Appointment Types**: Trigger actions based on specific service bookings
5. **Staff**: Route communications and assignments based on staff availability

Each endpoint supports the organization-level filtering required for multi-tenant automation systems.