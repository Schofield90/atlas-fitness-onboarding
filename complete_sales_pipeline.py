#!/usr/bin/env python3
"""
Complete Sales Call Pipeline
1. Downloads all call recordings from GoHighLevel
2. Transcribes them using AssemblyAI
3. Creates training data for AI analysis
"""

import os
import sys
from ghl_call_downloader import GHLCallDownloader
from sales_call_transcriber import SalesCallTranscriber

def main():
    print("🚀 SALES CALL PROCESSING PIPELINE")
    print("=" * 50)
    
    # Configuration
    GHL_API_KEY = "f4caf947-2634-457c-891c-bca2d6914ec0"
    GHL_LOCATION_ID = "KcbX6Rp7obaoXXEzVc7w"
    ASSEMBLYAI_API_KEY = "12674e1a84204500872ec6743d89b13c"
    
    # Step 1: Download recordings from GHL
    print("\n📥 STEP 1: Downloading call recordings from GoHighLevel...")
    downloader = GHLCallDownloader(GHL_API_KEY, GHL_LOCATION_ID)
    downloader.download_all_recordings()
    
    # Step 2: Transcribe downloaded recordings
    print("\n🎙️  STEP 2: Transcribing call recordings...")
    transcriber = SalesCallTranscriber(ASSEMBLYAI_API_KEY)
    
    # Check if we have downloaded recordings
    recordings_dir = "ghl_call_recordings"
    if not os.path.exists(recordings_dir):
        print("❌ No recordings directory found!")
        return
    
    # Transcribe all downloaded recordings
    results = transcriber.transcribe_directory(
        directory_path=recordings_dir,
        output_dir="sales_call_transcripts"
    )
    
    print("\n✅ PIPELINE COMPLETE!")
    print("=" * 50)
    print("Your sales calls have been:")
    print("1. Downloaded from GoHighLevel")
    print("2. Transcribed with speaker identification")
    print("3. Formatted for AI training")
    print("\nFiles location:")
    print(f"- Recordings: {os.path.abspath(recordings_dir)}")
    print(f"- Transcripts: {os.path.abspath('sales_call_transcripts')}")

if __name__ == "__main__":
    main()