#!/usr/bin/env python3
"""
Complete Demo Account Setup for Atlas Fitness CRM
Creates test user and 50 demo clients with full data
"""

import os
import random
import json
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import execute_values, Json
import hashlib

# Database connection
# Using URL-encoded password
import urllib.parse
password = urllib.parse.quote("@Aa80236661", safe='')
DB_URL = f"postgresql://postgres:{password}@db.lzlrojoaxrqvmhempnkn.supabase.co:5432/postgres"
ORG_ID = "c762845b-34fc-41ea-9e01-f70b81c44ff7"

# Mock data
FIRST_NAMES = ['James', 'Emma', 'Oliver', 'Sophia', 'William', 'Ava', 'Noah', 'Isabella',
  'Liam', 'Mia', 'Mason', 'Charlotte', 'Ethan', 'Amelia', 'Lucas', 'Harper',
  'Logan', 'Evelyn', 'Alexander', 'Abigail', 'Jacob', 'Emily', 'Michael', 'Elizabeth',
  'Benjamin', 'Sofia', 'Elijah', 'Avery', 'Daniel', 'Ella', 'Matthew', 'Scarlett',
  'Henry', 'Grace', 'Jackson', 'Chloe', 'Sebastian', 'Victoria', 'Aiden', 'Riley',
  'Samuel', 'Aria', 'David', 'Lily', 'Joseph', 'Aubrey', 'Carter', 'Zoey', 'Owen', 'Penelope']

LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris',
  'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen',
  'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
  'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Phillips']

INSTRUCTORS = ['Sarah Johnson', 'Mike Chen', 'Emma Wilson', 'Tom Davies', 'Lisa Martinez']

def create_test_user(conn):
    """Create test@test.co.uk user"""
    print("\n👤 Creating test user...")

    # Generate password hash (bcrypt format expected by Supabase)
    # For simplicity, we'll let Supabase handle this via their API or create a simpler way
    # For now, let's just insert the user records assuming the auth user exists

    # Note: We'll need to manually create the auth user via Supabase Dashboard
    # or use their admin API. For now, we'll create the organization links.

    cursor = conn.cursor()

    # First check if user exists in auth.users
    cursor.execute("SELECT id FROM auth.users WHERE email = 'test@test.co.uk' LIMIT 1")
    user_result = cursor.fetchone()

    if user_result:
        user_id = user_result[0]
        print(f"✅ Found existing user: {user_id}")
    else:
        print("⚠️  User not found in auth.users - you'll need to create via Supabase Dashboard:")
        print("   Email: test@test.co.uk")
        print("   Password: Test123")
        print("\n   Skipping user creation...")
        return None

    # Link to organization
    cursor.execute("""
        INSERT INTO user_organizations (user_id, organization_id, role)
        VALUES (%s, %s, 'admin')
        ON CONFLICT DO NOTHING
    """, (user_id, ORG_ID))

    # Create staff record
    cursor.execute("""
        INSERT INTO organization_staff (user_id, organization_id, name, email, phone_number, role)
        VALUES (%s, %s, 'Test User', 'test@test.co.uk', '07123456789', 'owner')
        ON CONFLICT (organization_id, email) DO NOTHING
    """, (user_id, ORG_ID))

    conn.commit()
    print("✅ User linked to organization")
    return user_id

def create_clients(conn):
    """Create 50 demo clients"""
    print("\n👥 Creating 50 demo clients...")

    cursor = conn.cursor()
    clients_data = []
    now = datetime.now()

    for i in range(50):
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        email = f"{first_name.lower()}.{last_name.lower()}{random.randint(1,999)}@gmail.com"
        phone = f"07{random.randint(100000000, 999999999)}"

        # Status distribution: 85% active, 10% paused, 5% cancelled
        rand = random.random()
        if rand < 0.85:
            status = 'active'
            lead_score = random.randint(60, 95)
        elif rand < 0.95:
            status = 'paused'
            lead_score = random.randint(30, 60)
        else:
            status = 'cancelled'
            lead_score = random.randint(10, 40)

        tags = ['member', 'active'] if status == 'active' else ['lead']
        engagement = 'high' if lead_score > 70 else 'medium' if lead_score > 40 else 'low'
        joined_date = now - timedelta(days=random.randint(0, 365))

        metadata = {
            'lead_score': lead_score,
            'engagement_level': engagement,
            'joined_date': joined_date.strftime('%Y-%m-%d'),
            'demo_account': True
        }

        clients_data.append((
            ORG_ID, first_name, last_name, email, phone, status, 'demo_data',
            Json(tags), Json(metadata)
        ))

    # Bulk insert
    execute_values(cursor, """
        INSERT INTO clients (org_id, first_name, last_name, email, phone, status, source, tags, metadata)
        VALUES %s
        RETURNING id, status
    """, clients_data)

    clients = cursor.fetchall()
    conn.commit()

    print(f"✅ Created {len(clients)} clients")
    return clients

def assign_memberships(conn, clients):
    """Assign memberships to active clients"""
    print("\n🎫 Assigning memberships...")

    cursor = conn.cursor()

    # Get membership plans
    cursor.execute("SELECT id, name FROM membership_plans WHERE organization_id = %s", (ORG_ID,))
    plans = {name: plan_id for plan_id, name in cursor.fetchall()}

    # Only active clients get memberships
    active_clients = [c for c in clients if c[1] == 'active']

    memberships_data = []
    for client_id, status in active_clients:
        # Weighted distribution
        rand = random.random()
        if rand < 0.10:
            plan_name = 'Trial Pass'
        elif rand < 0.40:
            plan_name = 'Basic Monthly'
        elif rand < 0.80:
            plan_name = 'Premium Monthly'
        elif rand < 0.95:
            plan_name = 'Elite Unlimited'
        else:
            plan_name = 'VIP Annual'

        plan_id = plans.get(plan_name)
        if not plan_id:
            continue

        billing_period = 'yearly' if plan_name == 'VIP Annual' else 'monthly'
        start_date = datetime.now() - timedelta(days=random.randint(30, 180))
        mem_status = 'cancelled' if random.random() < 0.05 else 'active'

        memberships_data.append((
            ORG_ID, client_id, plan_id, mem_status, start_date.date(), billing_period, 'stripe'
        ))

    execute_values(cursor, """
        INSERT INTO customer_memberships (organization_id, client_id, plan_id, status, start_date, billing_period, payment_provider)
        VALUES %s
        ON CONFLICT DO NOTHING
        RETURNING id, client_id, plan_id
    """, memberships_data)

    memberships = cursor.fetchall()
    conn.commit()

    print(f"✅ Assigned {len(memberships)} memberships")
    return memberships

def create_class_schedule(conn):
    """Create 4 weeks of class schedule"""
    print("\n📅 Creating class schedule...")

    cursor = conn.cursor()

    # Get class types
    cursor.execute("SELECT id, name, duration_minutes, default_capacity FROM class_types WHERE organization_id = %s", (ORG_ID,))
    class_types = cursor.fetchall()

    if not class_types:
        print("⚠️  No class types found - skipping schedule creation")
        return []

    sessions_data = []
    now = datetime.now()

    # Create 4 weeks of sessions (past week + next 3 weeks)
    for day_offset in range(-7, 22):
        session_date = now + timedelta(days=day_offset)

        # Skip Sundays
        if session_date.weekday() == 6:
            continue

        # 5 classes per day
        for hour in [6, 9, 12, 17, 19]:
            class_type = random.choice(class_types)
            ct_id, ct_name, duration, capacity = class_type

            start_time = session_date.replace(hour=hour, minute=0, second=0, microsecond=0)
            end_time = start_time + timedelta(minutes=duration)
            instructor = random.choice(INSTRUCTORS)
            session_status = 'completed' if start_time < now else 'scheduled'

            sessions_data.append((
                ORG_ID, ct_name, f"{ct_name} with {instructor}", start_time, end_time,
                instructor, 'Main Studio', capacity, duration, session_status
            ))

    execute_values(cursor, """
        INSERT INTO class_sessions (
            organization_id, name, description, start_time, end_time,
            instructor_name, location, max_capacity, duration_minutes, session_status
        )
        VALUES %s
        RETURNING id, start_time, session_status
    """, sessions_data)

    sessions = cursor.fetchall()
    conn.commit()

    print(f"✅ Created {len(sessions)} class sessions")
    return sessions

def create_bookings(conn, clients, sessions):
    """Create bookings and attendance"""
    print("\n📝 Creating bookings and attendance...")

    cursor = conn.cursor()
    active_clients = [c[0] for c in clients if c[1] == 'active']

    bookings_data = []
    now = datetime.now()

    # Only book sessions within 7 days (past or future)
    relevant_sessions = [s for s in sessions if abs((s[1] - now).days) <= 7]

    for session_id, session_time, session_status in relevant_sessions:
        # 60-80% capacity
        num_bookings = random.randint(5, min(15, len(active_clients)))
        selected_clients = random.sample(active_clients, num_bookings)

        for client_id in selected_clients:
            # Determine booking status
            if session_status == 'completed':
                rand = random.random()
                if rand < 0.80:
                    booking_status = 'attended'
                elif rand < 0.85:
                    booking_status = 'no_show'
                else:
                    booking_status = 'cancelled'
            else:
                booking_status = 'confirmed'

            booking_date = session_time - timedelta(days=1)

            bookings_data.append((
                ORG_ID, client_id, session_id, booking_status, booking_date
            ))

    if bookings_data:
        execute_values(cursor, """
            INSERT INTO class_bookings (organization_id, client_id, class_session_id, booking_status, booking_date)
            VALUES %s
            ON CONFLICT DO NOTHING
        """, bookings_data)

        conn.commit()

    print(f"✅ Created {len(bookings_data)} bookings")

    # Count stats
    attended = sum(1 for b in bookings_data if b[3] == 'attended')
    no_shows = sum(1 for b in bookings_data if b[3] == 'no_show')
    cancelled = sum(1 for b in bookings_data if b[3] == 'cancelled')
    print(f"   - Attended: {attended}")
    print(f"   - No-shows: {no_shows}")
    print(f"   - Cancelled: {cancelled}")

def create_payments(conn, memberships):
    """Create 6 months of payment history"""
    print("\n💰 Creating payment history...")

    cursor = conn.cursor()

    # Get plan prices
    cursor.execute("SELECT id, price FROM membership_plans WHERE organization_id = %s", (ORG_ID,))
    plan_prices = dict(cursor.fetchall())

    payments_data = []
    now = datetime.now()

    for membership_id, client_id, plan_id in memberships:
        price = plan_prices.get(plan_id, 50)

        # Determine if client has payment issues (10%)
        has_issues = random.random() < 0.10

        # Create 3-6 months of payments
        num_payments = random.randint(3, 6)

        for i in range(num_payments):
            payment_date = now - timedelta(days=30 * (num_payments - i))

            # Determine status
            if i == num_payments - 1 and has_issues:
                status = 'failed'
            elif has_issues and random.random() < 0.3:
                status = 'failed'
            else:
                status = 'paid_out'

            provider_id = f"demo_{random.randint(100000, 999999)}"

            payments_data.append((
                ORG_ID, client_id, price, 'GBP', status, payment_date.date(),
                'stripe', provider_id, 'Monthly membership payment',
                Json({"membership_id": str(membership_id), "demo_data": True})
            ))

    if payments_data:
        execute_values(cursor, """
            INSERT INTO payments (
                organization_id, client_id, amount, currency, payment_status, payment_date,
                payment_provider, provider_payment_id, description, metadata
            )
            VALUES %s
            ON CONFLICT DO NOTHING
        """, payments_data)

        conn.commit()

    print(f"✅ Created {len(payments_data)} payments")

    successful = sum(1 for p in payments_data if p[4] == 'paid_out')
    failed = sum(1 for p in payments_data if p[4] == 'failed')
    print(f"   - Successful: {successful}")
    print(f"   - Failed: {failed}")

def main():
    print("🚀 Starting demo account setup...")
    print("=" * 60)

    # Connect to database
    conn = psycopg2.connect(DB_URL)

    try:
        # Run setup
        user_id = create_test_user(conn)
        clients = create_clients(conn)
        memberships = assign_memberships(conn, clients)
        sessions = create_class_schedule(conn)
        create_bookings(conn, clients, sessions)
        create_payments(conn, memberships)

        print("\n" + "=" * 60)
        print("✅ DEMO ACCOUNT SETUP COMPLETE!")
        print("=" * 60)
        print("\n📊 Summary:")
        print(f"   Organization: Demo Fitness Studio")
        print(f"   Clients: {len(clients)} ({len([c for c in clients if c[1] == 'active'])} active)")
        print(f"   Memberships: {len(memberships)}")
        print(f"   Class Sessions: {len(sessions)}")
        print("\n🔐 Login Details:")
        print("   URL: https://login.gymleadhub.co.uk")
        print("   Email: test@test.co.uk")
        print("   Password: Test123")
        print("\n💡 Features:")
        print("   ✓ Realistic client profiles with lead scores")
        print("   ✓ Multiple membership tiers")
        print("   ✓ 4 weeks of class schedule")
        print("   ✓ Bookings with attendance tracking")
        print("   ✓ 6 months of payment history")
        print("   ✓ Failed payments for testing")
        print("   ✓ No-show tracking")
        print("")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    main()
