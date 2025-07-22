#!/usr/bin/env python3
"""
Example usage of the Sales Call Transcriber
"""

from sales_call_transcriber import SalesCallTranscriber

# Initialize with your API key
API_KEY = "12674e1a84204500872ec6743d89b13c"
transcriber = SalesCallTranscriber(API_KEY)

# Example 1: Transcribe a single file
# result = transcriber.transcribe_file("my_sales_call.mp3")
# print("Transcript:", result["full_transcript"])

# Example 2: Transcribe all audio files in a directory
# This will process all .mp3, .wav, .m4a, .mp4, .flac, .aac files
transcriber.transcribe_directory("audio_files", output_dir="transcripts")

# The output will include:
# - Individual JSON files for each call
# - A combined training data file with all transcripts
# - Speaker identification (who said what)
# - Automatic chapter detection for call topics
# - Timestamps for each section