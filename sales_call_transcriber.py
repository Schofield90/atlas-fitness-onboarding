#!/usr/bin/env python3
"""
Sales Call Transcription Tool
Transcribes audio files from sales calls for AI training purposes
"""

import os
import json
import glob
from datetime import datetime
from pathlib import Path
import assemblyai as aai

class SalesCallTranscriber:
    def __init__(self, api_key):
        aai.settings.api_key = api_key
        self.config = aai.TranscriptionConfig(
            speech_model=aai.SpeechModel.best,
            speaker_labels=True,  # Enable speaker diarization
            auto_chapters=True,   # Automatically detect topics/chapters
            punctuate=True,       # Add punctuation
            format_text=True      # Format the text properly
        )
        self.transcriber = aai.Transcriber(config=self.config)
    
    def transcribe_file(self, audio_file_path):
        """Transcribe a single audio file"""
        print(f"Transcribing: {audio_file_path}")
        
        try:
            transcript = self.transcriber.transcribe(audio_file_path)
            
            if transcript.status == "error":
                raise RuntimeError(f"Transcription failed: {transcript.error}")
            
            return self.format_transcript(transcript, audio_file_path)
            
        except Exception as e:
            print(f"Error transcribing {audio_file_path}: {str(e)}")
            return None
    
    def format_transcript(self, transcript, audio_file_path):
        """Format transcript data for AI training"""
        file_name = Path(audio_file_path).stem
        
        result = {
            "metadata": {
                "file_name": file_name,
                "transcription_date": datetime.now().isoformat(),
                "duration_ms": getattr(transcript, 'audio_duration', None),
                "confidence": transcript.confidence if hasattr(transcript, 'confidence') else None
            },
            "full_transcript": transcript.text,
            "speakers": [],
            "chapters": []
        }
        
        # Add speaker-separated dialogue
        if hasattr(transcript, 'utterances') and transcript.utterances:
            for utterance in transcript.utterances:
                speaker_data = {
                    "speaker": utterance.speaker,
                    "text": utterance.text,
                    "confidence": utterance.confidence,
                    "start_time": utterance.start,
                    "end_time": utterance.end
                }
                result["speakers"].append(speaker_data)
        
        # Add chapter information if available
        if hasattr(transcript, 'chapters') and transcript.chapters:
            for chapter in transcript.chapters:
                chapter_data = {
                    "summary": chapter.summary,
                    "headline": chapter.headline,
                    "start_time": chapter.start,
                    "end_time": chapter.end
                }
                result["chapters"].append(chapter_data)
        
        return result
    
    def transcribe_directory(self, directory_path, output_dir="transcripts"):
        """Transcribe all audio files in a directory"""
        # Supported audio formats
        audio_extensions = ['*.mp3', '*.wav', '*.m4a', '*.mp4', '*.flac', '*.aac']
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        audio_files = []
        for extension in audio_extensions:
            audio_files.extend(glob.glob(os.path.join(directory_path, extension)))
            audio_files.extend(glob.glob(os.path.join(directory_path, "**", extension), recursive=True))
        
        if not audio_files:
            print(f"No audio files found in {directory_path}")
            return
        
        print(f"Found {len(audio_files)} audio files to transcribe")
        
        results = []
        for audio_file in audio_files:
            result = self.transcribe_file(audio_file)
            if result:
                results.append(result)
                
                # Save individual transcript
                output_file = os.path.join(output_dir, f"{result['metadata']['file_name']}_transcript.json")
                with open(output_file, 'w') as f:
                    json.dump(result, f, indent=2)
                
                print(f"Saved transcript: {output_file}")
        
        # Save combined results for training
        combined_file = os.path.join(output_dir, "all_sales_calls_training_data.json")
        with open(combined_file, 'w') as f:
            json.dump({
                "transcription_batch_date": datetime.now().isoformat(),
                "total_calls": len(results),
                "transcripts": results
            }, f, indent=2)
        
        print(f"\nCompleted! Transcribed {len(results)} files")
        print(f"Combined training data saved to: {combined_file}")
        
        return results

def main():
    # Your API key
    API_KEY = "12674e1a84204500872ec6743d89b13c"
    
    transcriber = SalesCallTranscriber(API_KEY)
    
    # Example usage:
    # 1. Transcribe a single file
    # result = transcriber.transcribe_file("path/to/your/sales_call.mp3")
    
    # 2. Transcribe all files in a directory
    # transcriber.transcribe_directory("path/to/your/audio/files")
    
    print("Sales Call Transcriber ready!")
    print("\nUsage examples:")
    print("1. Single file: transcriber.transcribe_file('call.mp3')")
    print("2. Directory: transcriber.transcribe_directory('audio_files/')")
    print("\nPlace your audio files in a folder and run transcribe_directory()")

if __name__ == "__main__":
    main()