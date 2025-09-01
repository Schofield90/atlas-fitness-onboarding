/**
 * Client-side emergency auth check
 */
export function checkEmergencyAuthClient() {
  // Check localStorage for emergency auth flag
  const emergencyAuth = localStorage.getItem('emergency_auth');
  
  if (emergencyAuth) {
    try {
      const data = JSON.parse(emergencyAuth);
      
      // Check expiry
      if (data.expires && data.expires < Date.now()) {
        localStorage.removeItem('emergency_auth');
        return null;
      }
      
      return data;
    } catch (e) {
      console.error('Invalid emergency auth data:', e);
      localStorage.removeItem('emergency_auth');
    }
  }
  
  return null;
}

/**
 * Set emergency auth in localStorage for client-side checks
 */
export function setEmergencyAuthClient(userData: any) {
  localStorage.setItem('emergency_auth', JSON.stringify({
    ...userData,
    expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  }));
}