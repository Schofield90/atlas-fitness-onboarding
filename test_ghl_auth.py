#!/usr/bin/env python3
"""
Test GoHighLevel API Authentication
"""

import requests

def test_auth():
    api_key = "f4caf947-2634-457c-891c-bca2d6914ec0"
    location_id = "KcbX6Rp7obaoXXEzVc7w"
    
    # Try different authentication methods
    auth_methods = [
        {
            "name": "Bearer Token",
            "headers": {
                "Authorization": f"Bearer {api_key}",
                "Version": "2021-07-28",
                "Content-Type": "application/json"
            }
        },
        {
            "name": "API Key Header",
            "headers": {
                "X-API-Key": api_key,
                "Version": "2021-07-28",
                "Content-Type": "application/json"
            }
        },
        {
            "name": "Authorization Header",
            "headers": {
                "Authorization": api_key,
                "Version": "2021-07-28", 
                "Content-Type": "application/json"
            }
        }
    ]
    
    # Test basic endpoints
    test_endpoints = [
        f"https://services.leadconnectorhq.com/locations/{location_id}",
        f"https://rest.gohighlevel.com/v1/locations/{location_id}",
    ]
    
    for auth_method in auth_methods:
        print(f"\n=== Testing {auth_method['name']} ===")
        headers = auth_method['headers']
        
        for url in test_endpoints:
            try:
                print(f"\nTesting: {url}")
                response = requests.get(url, headers=headers)
                print(f"Status: {response.status_code}")
                
                if response.status_code == 401:
                    print("❌ Authentication failed - check API key")
                elif response.status_code == 403:
                    print("❌ Forbidden - check permissions")
                elif response.status_code == 200:
                    print("✅ Success!")
                    print(f"Response: {response.text[:300]}")
                    return  # Found working auth method
                else:
                    print(f"Response: {response.text[:300]}")
                    
            except Exception as e:
                print(f"Error: {e}")
        
    print("\n❌ No working authentication method found")

if __name__ == "__main__":
    test_auth()