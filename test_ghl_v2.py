#!/usr/bin/env python3
"""
Test GoHighLevel API with latest format
"""

import requests

def test_latest_ghl_api():
    # Try the new private integration token
    api_keys = [
        "pit-7ac049a7-6478-411c-9bda-fb5c28f1e2f3"
    ]
    location_id = "KcbX6Rp7obaoXXEzVc7w"
    
    # Test different base URLs and versions for private integrations
    test_urls = [
        # Latest GHL API structure for private integrations
        f"https://services.leadconnectorhq.com/locations/{location_id}/calls",
        f"https://services.leadconnectorhq.com/locations/{location_id}/conversations",
        f"https://services.leadconnectorhq.com/locations/{location_id}/phone-calls",
        f"https://services.leadconnectorhq.com/locations/{location_id}/phone/calls",
        
        # Try v2 API
        f"https://services.leadconnectorhq.com/v2/locations/{location_id}/calls",
        f"https://services.leadconnectorhq.com/v2/calls",
        
        # Try conversations API
        f"https://services.leadconnectorhq.com/conversations",
        f"https://services.leadconnectorhq.com/conversations/calls",
        
        # Alternative structures
        "https://services.leadconnectorhq.com/calls",
        "https://services.leadconnectorhq.com/phone-calls",
        
        # Legacy endpoints
        f"https://rest.gohighlevel.com/v1/locations/{location_id}/calls",
        
        # Alternative base URLs
        f"https://api.leadconnectorhq.com/locations/{location_id}/calls",
        f"https://api.gohighlevel.com/v1/locations/{location_id}/calls",
    ]
    
    for api_key in api_keys:
        print(f"\n=== Testing API Key: {api_key[:10]}... ===")
        
        # Try the latest GHL API format
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        for url in test_urls:
            print(f"\nTesting: {url}")
            try:
                # Test with location header too
                headers_with_location = headers.copy()
                headers_with_location["Location-Id"] = location_id
                
                response = requests.get(url, headers=headers_with_location, params={"limit": 1})
                print(f"Status: {response.status_code}")
                
                if response.status_code == 200:
                    print("✅ SUCCESS! Found working endpoint")
                    print(f"API Key: {api_key}")
                    print(f"URL: {url}")
                    print(f"Response preview: {response.text[:200]}")
                    return url, headers_with_location, api_key
                elif response.status_code == 401:
                    print("❌ 401 - Authentication failed")
                elif response.status_code == 403:
                    print("❌ 403 - Forbidden/insufficient permissions")  
                elif response.status_code == 404:
                    print("❌ 404 - Endpoint not found")
                else:
                    print(f"Status {response.status_code}: {response.text[:200]}")
                    
            except Exception as e:
                print(f"Error: {e}")
    
    print("\n❌ No working endpoints found")
    print("\nTo troubleshoot:")
    print("1. Check if API access is enabled in your GHL account")
    print("2. Verify the API key has the right permissions")
    print("3. Check if you need a different API key type")
    print("4. Contact GHL support for current API documentation")
    
    return None, None, None

if __name__ == "__main__":
    test_latest_ghl_api()