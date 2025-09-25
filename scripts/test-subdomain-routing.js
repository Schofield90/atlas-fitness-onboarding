#!/usr/bin/env node

console.log(`
🔍 Testing Subdomain Routing for Atlas Fitness
================================================

PRODUCTION URLS:
- Gym Owners Portal: https://login.gymleadhub.co.uk
- Members Portal: https://members.gymleadhub.co.uk  
- Admin Portal: https://admin.gymleadhub.co.uk

LOCALHOST TESTING:
Since localhost doesn't support true subdomains, you have two options:

Option 1: Use /etc/hosts file (Recommended)
--------------------------------------------
Add these lines to your /etc/hosts file:
127.0.0.1 login.localhost
127.0.0.1 members.localhost
127.0.0.1 admin.localhost

Then access:
- Gym Owners: http://login.localhost:3000
- Members: http://members.localhost:3000
- Admin: http://admin.localhost:3000

Option 2: Use direct paths
---------------------------
- Gym Owners: http://localhost:3000/owner-login
- Members: http://localhost:3000/simple-login
- Admin: http://localhost:3000/signin

CURRENT SEPARATION RULES:
-------------------------
✅ members.gymleadhub.co.uk - ONLY for gym members/clients
   - Blocks gym owners (like sam@atlas-gyms.co.uk)
   - Uses OTP or simple password login
   - Redirects to /client/dashboard after login

✅ login.gymleadhub.co.uk - ONLY for gym owners/staff
   - For accounts like sam@atlas-gyms.co.uk
   - Uses Google OAuth or password login
   - Redirects to /dashboard after login

✅ admin.gymleadhub.co.uk - ONLY for super admin
   - Only sam@gymleadhub.co.uk has access
   - Platform administration only

To test the separation:
------------------------
1. Try logging in as sam@atlas-gyms.co.uk on members.gymleadhub.co.uk
   ❌ Should be BLOCKED with message: "This login is for gym members only"

2. Try logging in as a client on login.gymleadhub.co.uk  
   ❌ Should redirect to members portal

3. Each portal should maintain its own session independently
`);