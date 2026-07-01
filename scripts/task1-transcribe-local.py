import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import whisper


TERMINAL_PUNCTUATION = (".", "?", "!")
CONTINUATION_WORDS = {
    "and",
    "but",
    "or",
    "for",
    "nor",
    "so",
    "yet",
    "because",
    "while",
    "when",
    "where",
    "which",
    "who",
    "whose",
    "that",
    "than",
    "then",
    "to",
    "of",
    "in",
    "on",
    "at",
    "by",
    "from",
    "with",
    "between",
    "around",
    "under",
    "over",
    "into",
    "through",
    "as",
}


def should_continue(current_text: str, next_text: str | None) -> bool:
    text = current_text.strip()
    if not text:
        return True
    if text.endswith(TERMINAL_PUNCTUATION):
        return False
    if text.endswith((",", ";", ":", "-", "—")):
        return True
    if not next_text:
        return False
    first_word_raw = next_text.strip().split(" ", 1)[0].strip("\"'“”‘’()[]{}")
    first_word = first_word_raw.lower()
    return first_word in CONTINUATION_WORDS or (first_word_raw[:1].islower() and first_word != "i")


def sentence_case(text: str) -> str:
    stripped = text.strip()
    if not stripped:
        return stripped
    return stripped[0].upper() + stripped[1:]


def build_readable_output(raw_segments: list[dict]) -> tuple[str, list[dict]]:
    sentence_segments = []
    current_parts: list[str] = []
    current_start = None
    current_end = None

    for index, segment in enumerate(raw_segments):
        text = segment["text"].strip()
        if not text:
            continue
        next_text = raw_segments[index + 1]["text"] if index + 1 < len(raw_segments) else None
        if current_start is None:
            current_start = segment["start"]

        current_parts.append(text)
        current_end = segment["end"]

        if should_continue(text, next_text):
            continue

        sentence_text = " ".join(current_parts).strip()
        if not sentence_text.endswith(TERMINAL_PUNCTUATION):
            sentence_text = f"{sentence_text}."
        sentence_segments.append(
            {
                "start": current_start,
                "end": current_end,
                "text": sentence_case(sentence_text),
            }
        )
        current_parts = []
        current_start = None
        current_end = None

    if current_parts:
        sentence_text = " ".join(current_parts).strip()
        if not sentence_text.endswith(TERMINAL_PUNCTUATION):
            sentence_text = f"{sentence_text}."
        sentence_segments.append(
            {
                "start": current_start,
                "end": current_end,
                "text": sentence_case(sentence_text),
            }
        )

    readable_transcript = " ".join(segment["text"] for segment in sentence_segments).strip()
    return readable_transcript, sentence_segments


def transcribe_audio(input_file: Path, model_name: str, language: str | None) -> dict:
    model = whisper.load_model(model_name)
    result = model.transcribe(str(input_file), language=language, fp16=False, verbose=False)

    segment_results = []
    transcript_parts = []
    for segment in result.get("segments", []):
        text = str(segment.get("text", "")).strip()
        if not text:
            continue
        transcript_parts.append(text)
        segment_results.append(
            {
                "start": round(float(segment.get("start") or 0), 2),
                "end": round(float(segment.get("end") or 0), 2),
                "text": text,
            }
        )

    raw_transcript = " ".join(transcript_parts).strip() or str(result.get("text", "")).strip()
    readable_transcript, sentence_segments = build_readable_output(segment_results)
    duration = segment_results[-1]["end"] if segment_results else 0
    return {
        "task": "Task 1: audio transcription",
        "inputKind": "audio",
        "inputFile": str(input_file),
        "provider": "local-openai-whisper",
        "model": model_name,
        "status": "COMPLETED" if raw_transcript else "EMPTY",
        "language": result.get("language"),
        "languageProbability": None,
        "durationSeconds": round(duration, 2),
        "transcript": readable_transcript or raw_transcript,
        "rawTranscript": raw_transcript,
        "sentenceSegments": sentence_segments,
        "rawSegments": segment_results,
        "segments": sentence_segments,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run local openai-whisper transcription for ML Task 1.")
    parser.add_argument("--input", default="../voice test.mp3", help="Audio file to transcribe.")
    parser.add_argument("--output", default="task1-results/task1-sample-transcription-result.json", help="JSON output path.")
    parser.add_argument("--model", default="small", help="Whisper model name. PPT Task 1 uses small; use tiny/base only for quick CPU smoke tests.")
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
