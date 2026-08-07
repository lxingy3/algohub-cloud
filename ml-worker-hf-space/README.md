---
title: AlgoStories ML Worker
colorFrom: yellow
colorTo: gray
sdk: docker
app_port: 7860
---

# AlgoStories ML Worker

Self-hosted API worker for AlgoStories Tasks 1 through 5.

## Endpoints

- `GET /health`
- `POST /transcribe`
- `POST /impact-classification`
- `POST /bart-themes`
- `POST /spacy-entities`
- `POST /keybert-keywords`

The transcription endpoint accepts a media file. The other POST endpoints accept JSON. Set `ML_WORKER_TOKEN` to require `Authorization: Bearer <token>` on every model request.

Task 6 sentence-transformer linking and Task 7 Llama 3.1/Ollama summarization are not part of this worker.
