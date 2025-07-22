#!/usr/bin/env python3
"""
Discover GoHighLevel API Structure
Try to find what endpoints are actually available
"""

import requests

def discover_api():
    api_key = "pit-7ac049a7-6478-411c-9bda-fb5c28f1e2f3"
    location_id = "KcbX6Rp7obaoXXEzVc7w"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    # Try basic discovery endpoints
    discovery_urls = [
        "https://services.leadconnectorhq.com",
        "https://services.leadconnectorhq.com/",
        f"https://services.leadconnectorhq.com/locations/{location_id}",
        "https://services.leadconnectorhq.com/locations",
        "https://services.leadconnectorhq.com/v1",
        "https://services.leadconnectorhq.com/v2",
        "https://rest.gohighlevel.com/v1",
        "https://rest.gohighlevel.com/v1/locations",
    ]
    
    print("🔍 Discovering GHL API endpoints...")
    
    for url in discovery_urls:
        try:
            print(f"\nTesting: {url}")
            response = requests.get(url, headers=headers, timeout=10)
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ SUCCESS!")
                print(f"Response: {response.text[:500]}")
                return
            elif response.status_code == 401:
                print("❌ 401 - Unauthorized")
            elif response.status_code == 403:
                print("❌ 403 - Forbidden")
            elif response.status_code == 404:
                print("❌ 404 - Not Found")
            elif response.status_code in [301, 302]:
                print(f"↪️  Redirect to: {response.headers.get('Location', 'Unknown')}")
            else:
                print(f"Status {response.status_code}")
                if response.text:
                    print(f"Response: {response.text[:200]}")
                    
        except Exception as e:
            print(f"Error: {e}")
    
    print("\n" + "="*50)
    print("🤔 API Discovery Results:")
    print("All tested endpoints returned 404 or auth errors.")
    print("\nThis suggests:")
    print("1. The API might use a different base URL")
    print("2. Different authentication method required")
    print("3. API access needs additional configuration")
    print("4. Call recordings might use a separate API")
    
    print("\n💡 Next steps:")
    print("1. Check GHL docs for the exact API base URL")
    print("2. Look for call recording specific endpoints")
    print("3. Verify private integration permissions")
    print("4. Try the GHL marketplace/integration docs")

if __name__ == "__main__":
    discover_api()