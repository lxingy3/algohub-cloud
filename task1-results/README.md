# Task 1 Transcription Results

This folder is for review artifacts from ML Task 1: audio transcription.

Use the local faster-whisper runner for a real sample result. This matches the PPT Task 1 requirement: Whisper small, audio input, transcript output.

```powershell
python -m venv .task1-whisper-env
.\.task1-whisper-env\Scripts\python.exe -m pip install -r task1-results\requirements-task1.txt
.\.task1-whisper-env\Scripts\python.exe scripts\task1-transcribe-local.py --input "..\voice test.mp3"
```

Use `scripts/task1-transcription-result.mjs` only when another open-source worker has already returned a transcript:

```powershell
$env:TASK1_AUDIO_FILE = "..\voice test.mp3"
$env:TASK1_TRANSCRIPT_TEXT = "transcript text from the worker"
node scripts/task1-transcription-result.mjs
```

The generated JSON file is the result file to show in the meeting after testing Task 1. It includes model, language detection, duration, transcript text, and timestamped segments.
