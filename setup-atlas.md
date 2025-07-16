# Atlas Fitness Live Setup Guide

## 🎯 Goal
Set up Atlas Fitness as your live test gym to validate the CRM with real leads and get actual ROI data.

## 📋 Prerequisites
- [ ] Supabase account with database
- [ ] Facebook Business Manager account
- [ ] Twilio account for SMS
- [ ] Your gym's phone number
- [ ] Vercel deployment

## 🚀 Setup Steps

### 1. Database Setup
```bash
# 1. Go to your Supabase dashboard
# 2. Navigate to SQL Editor
# 3. Run the atlas-setup.sql file
# 4. Note down your user ID from Auth > Users
```

### 2. Environment Variables
```bash
# Copy env.example to .env.local
cp env.example .env.local

# Fill in your real values:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - META_ACCESS_TOKEN (from Facebook Business)
# - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
# - OWNER_TEST_PHONE (your actual mobile)
```

### 3. Facebook Lead Forms
1. Go to Facebook Business Manager
2. Create a Lead Form with fields:
   - Full Name
   - Email
   - Phone Number
   - Interest (PT/Membership/Classes)
3. Set webhook URL: `https://your-domain.vercel.app/api/webhooks/meta`
4. Use verify token from your .env.local

### 4. Test Your Setup
Visit: `https://your-domain.vercel.app/atlas-setup`

Run these tests:
- [ ] SMS to your phone
- [ ] Meta webhook simulation
- [ ] Create test lead
- [ ] Check automations are active

### 5. Launch Your First Ad
```bash
# Create a simple Facebook ad:
# - Campaign: Lead Generation
# - Budget: £5/day (minimum)
# - Audience: Local to your area
# - Creative: "Free Personal Training Session"
# - Lead Form: Use the one you created
```

### 6. Monitor Results
Visit: `https://your-domain.vercel.app/atlas-results`

Track:
- [ ] Leads coming in
- [ ] Response times
- [ ] Conversion rates
- [ ] Actual ROI

## 🎯 Success Metrics

### Week 1 Goals:
- [ ] 5+ test leads created
- [ ] Average response time < 5 minutes
- [ ] SMS system working reliably
- [ ] At least 1 real lead from Facebook

### Week 2 Goals:
- [ ] 10+ real leads from ads
- [ ] 2+ leads convert to trials/members
- [ ] Positive ROI calculation
- [ ] Refined automation messages

### Week 3 Goals:
- [ ] Consistent lead flow
- [ ] Conversion rate > 15%
- [ ] £500+ revenue generated
- [ ] Case study data collected

## 📊 Expected Results

Based on typical gym metrics:
- **Lead Cost**: £15-25 per lead
- **Conversion Rate**: 20-30% (with fast response)
- **Average Deal Value**: £500-1000
- **Monthly ROI**: 300-500%

## 🔧 Troubleshooting

### SMS Not Working?
1. Check Twilio credentials
2. Verify phone number format (+44...)
3. Test with `/atlas-setup` page

### Facebook Webhook Not Triggering?
1. Verify webhook URL is correct
2. Check verify token matches
3. Test with webhook tester tool

### Leads Not Converting?
1. Review SMS message templates
2. Check response timing
3. Analyze lead quality from ads

## 🎉 Going Live Checklist

- [ ] Database set up with Atlas Fitness organization
- [ ] Environment variables configured
- [ ] Facebook lead forms connected
- [ ] SMS system tested and working
- [ ] Automation templates customized
- [ ] First Facebook ad launched
- [ ] Monitoring dashboard accessible
- [ ] Your phone number ready for lead notifications

## 📞 Support
If you need help:
1. Check the `/help` page
2. Review setup logs in Vercel
3. Test individual components in `/atlas-setup`

---

## 💡 Pro Tips

1. **Start Small**: £5/day ad budget is enough to test
2. **Test Everything**: Use your own phone number as test leads
3. **Monitor Closely**: Check response times daily
4. **Iterate Fast**: Adjust SMS messages based on responses
5. **Track Everything**: Real ROI data is your best sales tool

Once Atlas Fitness is running smoothly, you have:
- ✅ Proven system that works
- ✅ Real ROI data
- ✅ Case study for other gyms
- ✅ Confidence to sell to competitors

**You're not just building software - you're solving your own problem first!**