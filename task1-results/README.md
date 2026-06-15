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

## Additional test samples

These are extra English audio tests for Slack review. The `*-clip.wav` files are short, normalized WAV clips generated from the downloaded source files.

| Sample | Audio file | Result file | Source |
| --- | --- | --- | --- |
| North Wind and Sun voice sample | `audio-samples/bismarck71-north-wind-sun-clip.wav` | `transcripts/bismarck71-north-wind-sun-result.json` | https://commons.wikimedia.org/wiki/File:Bismarck71_English_Voice_Sample_(North_Wind_%26_Sun).ogg |
| Supportive housing public remarks | `audio-samples/michelle-wu-supportive-housing-clip.wav` | `transcripts/michelle-wu-supportive-housing-result.json` | https://commons.wikimedia.org/wiki/File:Michelle_Wu_at_Supportive_Housing_Grant_Announcement.flac |
| VOA American Stories excerpt | `audio-samples/voa-owl-creek-clip.wav` | `transcripts/voa-owl-creek-result.json` | https://archive.org/details/AmericanStories |

Recreate the short clips:

```powershell
.\.task1-whisper-env\Scripts\python.exe scripts\task1-prepare-audio-samples.py
```

Run all three Task 1 tests:

```powershell
$samples = @('bismarck71-north-wind-sun','michelle-wu-supportive-housing','voa-owl-creek')
foreach ($name in $samples) {
  .\.task1-whisper-env\Scripts\python.exe scripts\task1-transcribe-local.py --input "task1-results\audio-samples\$name-clip.wav" --output "task1-results\transcripts\$name-result.json" --model small --language en
}
```

All three test files completed with `model: small`, `status: COMPLETED`, and `language: en`.
