describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES', camera: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show welcome screen on first launch', async () => {
    await expect(element(by.text('Welcome to Atlas Fitness'))).toBeVisible();
    await expect(element(by.text('Get Started'))).toBeVisible();
  });

  it('should navigate to sign in screen', async () => {
    await element(by.text('Get Started')).tap();
    await expect(element(by.text('Sign In'))).toBeVisible();
    await expect(element(by.label('Email'))).toBeVisible();
  });

  it('should send magic link with valid email', async () => {
    await element(by.text('Get Started')).tap();
    await element(by.label('Email')).typeText('test@example.com');
    await element(by.text('Send Magic Link')).tap();
    
    await waitFor(element(by.text('Verify Email')))
      .toBeVisible()
      .withTimeout(5000);
    
    await expect(element(by.text('test@example.com'))).toBeVisible();
  });

  it('should show error for invalid email', async () => {
    await element(by.text('Get Started')).tap();
    await element(by.label('Email')).typeText('invalid-email');
    await element(by.text('Send Magic Link')).tap();
    
    await expect(element(by.text('Please enter a valid email address'))).toBeVisible();
  });

  it('should verify OTP and navigate to organization selector', async () => {
    // Navigate to OTP screen
    await element(by.text('Get Started')).tap();
    await element(by.label('Email')).typeText('test@example.com');
    await element(by.text('Send Magic Link')).tap();
    
    // Enter OTP
    await element(by.id('otp-input-0')).typeText('1');
    await element(by.id('otp-input-1')).typeText('2');
    await element(by.id('otp-input-2')).typeText('3');
    await element(by.id('otp-input-3')).typeText('4');
    await element(by.id('otp-input-4')).typeText('5');
    await element(by.id('otp-input-5')).typeText('6');
    
    await waitFor(element(by.text('Select Your Gym')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should allow resending OTP after timer expires', async () => {
    await element(by.text('Get Started')).tap();
    await element(by.label('Email')).typeText('test@example.com');
    await element(by.text('Send Magic Link')).tap();
    
    // Wait for timer to expire (in test mode, this should be faster)
    await waitFor(element(by.text('Resend')))
      .toBeVisible()
      .withTimeout(3000);
    
    await element(by.text('Resend')).tap();
    await expect(element(by.text(/Resend in \d+s/))).toBeVisible();
  });

  it('should complete full authentication flow', async () => {
    // Sign in
    await element(by.text('Get Started')).tap();
    await element(by.label('Email')).typeText('test@example.com');
    await element(by.text('Send Magic Link')).tap();
    
    // Verify OTP
    await element(by.id('otp-input-0')).typeText('123456');
    
    // Select organization
    await waitFor(element(by.text('Select Your Gym'))).toBeVisible();
    await element(by.text('Atlas Fitness Downtown')).tap();
    
    // Should navigate to home screen
    await waitFor(element(by.text('Check In')))
      .toBeVisible()
      .withTimeout(5000);
  });
});