import argparse
from pathlib import Path

import av


SAMPLES = [
    {
        "source": "task1-results/audio-samples/bismarck71-north-wind-sun.ogg",
        "output": "task1-results/audio-samples/bismarck71-north-wind-sun-clip.wav",
        "start": 0.0,
        "duration": 35.0,
    },
    {
        "source": "task1-results/audio-samples/michelle-wu-supportive-housing.flac",
        "output": "task1-results/audio-samples/michelle-wu-supportive-housing-clip.wav",
        "start": 0.0,
        "duration": 37.0,
    },
    {
        "source": "task1-results/audio-samples/voa-owl-creek-source.mp3",
        "output": "task1-results/audio-samples/voa-owl-creek-clip.wav",
        "start": 15.0,
        "duration": 35.0,
    },
]


def seconds(frame) -> float:
    if frame.pts is None or frame.time_base is None:
        return 0.0
    return float(frame.pts * frame.time_base)


def make_clip(source: Path, output: Path, start: float, duration: float) -> None:
    if not source.exists():
        raise FileNotFoundError(source)

    output.parent.mkdir(parents=True, exist_ok=True)
    end = start + duration
    resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)

    with av.open(str(source)) as input_container, av.open(str(output), mode="w") as output_container:
        output_stream = output_container.add_stream("pcm_s16le", rate=16000)
        output_stream.layout = "mono"

        for frame in input_container.decode(audio=0):
            frame_start = seconds(frame)
            if frame_start < start:
                continue
            if frame_start > end:
                break

            for resampled in resampler.resample(frame):
                for packet in output_stream.encode(resampled):
                    output_container.mux(packet)

        for packet in output_stream.encode(None):
            output_container.mux(packet)


def main() -> None:
    parser = argparse.ArgumentParser(description="Create short WAV clips for Task 1 transcription testing.")
    parser.add_argument("--sample", choices=["all", "bismarck71", "michelle-wu", "voa"], default="all")
    args = parser.parse_args()

    selected = SAMPLES
    if args.sample != "all":
        selected = [sample for sample in SAMPLES if sample["output"].split("/")[-1].startswith(args.sample)]

    for sample in selected:
        make_clip(
            Path(sample["source"]),
            Path(sample["output"]),
            start=sample["start"],
            duration=sample["duration"],
        )
        print(sample["output"])


if __name__ == "__main__":
    main()
