import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from faster_whisper import WhisperModel


def transcribe_audio(input_file: Path, model_name: str, language: str | None) -> dict:
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        str(input_file),
        language=language,
        beam_size=5,
        vad_filter=True,
    )

    segment_results = []
    transcript_parts = []
    for segment in segments:
        text = segment.text.strip()
        if not text:
            continue
        transcript_parts.append(text)
        segment_results.append(
            {
                "start": round(segment.start, 2),
                "end": round(segment.end, 2),
                "text": text,
            }
        )

    transcript = " ".join(transcript_parts).strip()
    return {
        "task": "Task 1: audio transcription",
        "inputKind": "audio",
        "inputFile": str(input_file),
        "provider": "local-faster-whisper",
        "model": model_name,
        "status": "COMPLETED" if transcript else "EMPTY",
        "language": info.language,
        "languageProbability": round(info.language_probability, 4),
        "durationSeconds": round(info.duration, 2),
        "transcript": transcript,
        "segments": segment_results,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "reviewNote": "Real Task 1 sample result generated from the local audio file. This can be used to show that the transcription file is ready for review.",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run local faster-whisper transcription for ML Task 1.")
    parser.add_argument("--input", default="../voice test.mp3", help="Audio file to transcribe.")
    parser.add_argument("--output", default="task1-results/task1-sample-transcription-result.json", help="JSON output path.")
    parser.add_argument("--model", default="tiny", help="Whisper model name. Use tiny/base for quick CPU tests.")
    parser.add_argument("--language", default=None, help="Optional language hint, for example en or zh.")
    args = parser.parse_args()

    input_file = Path(args.input).resolve()
    output_file = Path(args.output).resolve()
    if not input_file.exists():
        raise FileNotFoundError(f"Audio file not found: {input_file}")

    result = transcribe_audio(input_file, args.model, args.language)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(output_file)
    print(f"status={result['status']} language={result['language']} duration={result['durationSeconds']}s")


if __name__ == "__main__":
    main()
