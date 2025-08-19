#!/usr/bin/env node

console.log(`
==============================================
🏋️  ATLAS FITNESS LOCAL TEST INSTRUCTIONS  🏋️
==============================================

Your local server is running at: http://localhost:3001

TEST CREDENTIALS:
-----------------
Email: samschofield90@hotmail.co.uk
Password: [Use your existing password]

HOW TO TEST:
------------
1. Open your browser to: http://localhost:3001
2. Click "Login" 
3. Enter the test credentials above
4. You should be redirected to /dashboard-direct

TROUBLESHOOTING:
----------------
If login fails:
- Check console for errors (press F12 in browser)
- Make sure you're using the correct password
- Try clearing browser cache/cookies

If you get stuck on loading:
- The app will now redirect to /dashboard-direct (simplified dashboard)
- This dashboard doesn't make problematic API calls
- All navigation links work from there

DIRECT LINKS FOR TESTING:
-------------------------
Login Page: http://localhost:3001/login
Dashboard: http://localhost:3001/dashboard-direct
Signup: http://localhost:3001/signup
Landing: http://localhost:3001/landing

==============================================
`);