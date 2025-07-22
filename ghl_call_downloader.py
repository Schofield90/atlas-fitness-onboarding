#!/usr/bin/env python3
"""
GoHighLevel Call Recording Downloader
Downloads all call recordings from GHL CRM using their API
"""

import os
import json
import time
import requests
from datetime import datetime
from urllib.parse import urlparse, parse_qs
import re
from pathlib import Path

class GHLCallDownloader:
    def __init__(self, api_key, location_id):
        self.api_key = api_key
        self.location_id = location_id
        self.base_url = "https://services.leadconnectorhq.com"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Version": "2021-07-28",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
        # Create output directory
        self.output_dir = "ghl_call_recordings"
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Track downloaded files to enable resume
        self.downloaded_files = set()
        self.load_downloaded_files()
        
        # Will be set by test_connection
        self.calls_endpoint = f"/locations/{self.location_id}/calls"
    
    def load_downloaded_files(self):
        """Load list of already downloaded files"""
        downloaded_log = os.path.join(self.output_dir, "downloaded_files.txt")
        if os.path.exists(downloaded_log):
            with open(downloaded_log, 'r') as f:
                self.downloaded_files = set(line.strip() for line in f)
    
    def save_downloaded_file(self, filename):
        """Save filename to downloaded log"""
        downloaded_log = os.path.join(self.output_dir, "downloaded_files.txt")
        with open(downloaded_log, 'a') as f:
            f.write(f"{filename}\n")
        self.downloaded_files.add(filename)
    
    def sanitize_filename(self, filename):
        """Remove invalid characters from filename"""
        # Remove invalid characters
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        # Remove extra spaces and dots
        filename = re.sub(r'\.+', '.', filename)
        filename = re.sub(r'\s+', ' ', filename)
        return filename.strip()
    
    def test_connection(self):
        """Test API connection"""
        print("Testing API connection...")
        print(f"API Key: {self.api_key[:10]}...")
        print(f"Location ID: {self.location_id}")
        
        # Try different endpoint patterns and base URLs
        base_urls_to_try = [
            "https://services.leadconnectorhq.com",
            "https://rest.gohighlevel.com/v1",
            "https://rest.gohighlevel.com"
        ]
        
        endpoints_to_try = [
            f"/locations/{self.location_id}/calls",
            f"/calls",
            f"/locations/{self.location_id}/phone/calls",
            f"/phone/calls",
            f"/locations/{self.location_id}/recording/calls",
            f"/recording/calls"
        ]
        
        for base_url in base_urls_to_try:
            print(f"\nTrying base URL: {base_url}")
            for endpoint in endpoints_to_try:
                try:
                    url = f"{base_url}{endpoint}"
                    print(f"  Trying: {url}")
                    
                    # Create temporary session with different base URL
                    temp_session = requests.Session()
                    temp_headers = self.headers.copy()
                    temp_session.headers.update(temp_headers)
                    
                    response = temp_session.get(url, params={"limit": 1})
                    
                    print(f"  Status code: {response.status_code}")
                    if response.status_code == 200:
                        print("✅ API connection successful!")
                        print(f"Working base URL: {base_url}")
                        print(f"Working endpoint: {endpoint}")
                        # Update the working endpoint and base URL
                        self.base_url = base_url
                        self.calls_endpoint = endpoint
                        return True
                    elif response.status_code != 404:
                        print(f"  Response: {response.text[:200]}")
                        
                except requests.exceptions.RequestException as e:
                    print(f"  Error: {e}")
                    continue
        
        print("❌ API connection failed with all endpoints")
        return False
    
    def get_all_calls(self):
        """Fetch all calls with recordings using pagination"""
        print("Fetching all calls with recordings...")
        all_calls = []
        skip = 0
        limit = 100
        
        while True:
            print(f"Fetching calls {skip + 1}-{skip + limit}...")
            try:
                response = self.session.get(
                    f"{self.base_url}{self.calls_endpoint}",
                    params={
                        "limit": limit,
                        "skip": skip,
                        "hasRecording": True
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                calls = data.get("calls", [])
                if not calls:
                    break
                
                all_calls.extend(calls)
                print(f"Found {len(calls)} calls in this batch")
                
                # Check if we got fewer than limit (last page)
                if len(calls) < limit:
                    break
                
                skip += limit
                time.sleep(0.5)  # Rate limiting
                
            except requests.exceptions.RequestException as e:
                print(f"Error fetching calls: {e}")
                break
        
        print(f"Total calls with recordings found: {len(all_calls)}")
        return all_calls
    
    def generate_filename(self, call):
        """Generate descriptive filename for call recording"""
        # Get date
        date_added = call.get("dateAdded", "")
        if date_added:
            try:
                date_obj = datetime.fromisoformat(date_added.replace('Z', '+00:00'))
                date_str = date_obj.strftime("%Y-%m-%d")
            except:
                date_str = "unknown_date"
        else:
            date_str = "unknown_date"
        
        # Get contact name
        contact_name = call.get("contactName", "").strip()
        if not contact_name:
            contact_name = call.get("from", "").strip()
        if not contact_name:
            contact_name = "unknown_contact"
        
        # Get call ID
        call_id = call.get("id", "unknown_id")
        
        # Get file extension from recording URL
        recording_url = call.get("recordingUrl", "")
        extension = "mp3"  # default
        if recording_url:
            parsed = urlparse(recording_url)
            path = parsed.path
            if path:
                ext = os.path.splitext(path)[1].lower()
                if ext in ['.mp3', '.wav', '.m4a', '.mp4']:
                    extension = ext[1:]  # remove dot
        
        # Create filename
        filename = f"{date_str}_{contact_name}_{call_id}.{extension}"
        return self.sanitize_filename(filename)
    
    def download_recording(self, call):
        """Download a single recording"""
        recording_url = call.get("recordingUrl")
        if not recording_url:
            return False, "No recording URL"
        
        filename = self.generate_filename(call)
        filepath = os.path.join(self.output_dir, filename)
        
        # Skip if already downloaded
        if filename in self.downloaded_files:
            return True, f"Already downloaded: {filename}"
        
        try:
            print(f"Downloading: {filename}")
            response = requests.get(recording_url, stream=True, timeout=30)
            response.raise_for_status()
            
            # Get file size for progress
            total_size = int(response.headers.get('content-length', 0))
            downloaded_size = 0
            
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded_size += len(chunk)
                        
                        # Show progress for large files
                        if total_size > 0:
                            progress = (downloaded_size / total_size) * 100
                            if progress % 10 < 1:  # Show every 10%
                                print(f"  Progress: {progress:.1f}%")
            
            # Save to downloaded log
            self.save_downloaded_file(filename)
            return True, f"Downloaded: {filename}"
            
        except requests.exceptions.RequestException as e:
            return False, f"Download failed: {e}"
        except Exception as e:
            return False, f"Error: {e}"
    
    def download_all_recordings(self):
        """Download all call recordings"""
        # Test connection first
        if not self.test_connection():
            return
        
        # Get all calls
        calls = self.get_all_calls()
        if not calls:
            print("No calls found!")
            return
        
        # Download each recording
        successful_downloads = 0
        failed_downloads = 0
        skipped_downloads = 0
        
        print(f"\nStarting download of {len(calls)} recordings...")
        print("=" * 50)
        
        for i, call in enumerate(calls, 1):
            print(f"\n[{i}/{len(calls)}] Processing call...")
            
            success, message = self.download_recording(call)
            
            if success:
                if "Already downloaded" in message:
                    skipped_downloads += 1
                    print(f"  ⏭️  {message}")
                else:
                    successful_downloads += 1
                    print(f"  ✅ {message}")
            else:
                failed_downloads += 1
                print(f"  ❌ {message}")
            
            # Rate limiting
            time.sleep(0.5)
        
        # Final summary
        print("\n" + "=" * 50)
        print("DOWNLOAD SUMMARY")
        print("=" * 50)
        print(f"Total calls processed: {len(calls)}")
        print(f"Successful downloads: {successful_downloads}")
        print(f"Skipped (already downloaded): {skipped_downloads}")
        print(f"Failed downloads: {failed_downloads}")
        print(f"Files saved to: {os.path.abspath(self.output_dir)}")
        
        # Save summary report
        summary = {
            "download_date": datetime.now().isoformat(),
            "total_calls": len(calls),
            "successful_downloads": successful_downloads,
            "skipped_downloads": skipped_downloads,
            "failed_downloads": failed_downloads,
            "output_directory": os.path.abspath(self.output_dir)
        }
        
        with open(os.path.join(self.output_dir, "download_summary.json"), 'w') as f:
            json.dump(summary, f, indent=2)
        
        print(f"\nDownload summary saved to: download_summary.json")

def main():
    # Your GHL API credentials
    API_KEY = "pit-7ac049a7-6478-411c-9bda-fb5c28f1e2f3"  # Updated private integration token
    LOCATION_ID = "KcbX6Rp7obaoXXEzVc7w"
    
    # Create downloader instance
    downloader = GHLCallDownloader(API_KEY, LOCATION_ID)
    
    # Start download process
    downloader.download_all_recordings()

if __name__ == "__main__":
    main()