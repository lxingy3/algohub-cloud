---
title: AlgoStories ML Worker
colorFrom: yellow
colorTo: gray
sdk: docker
app_port: 7860
---

# AlgoStories ML Worker

Small API worker for the ML tools required by the AlgoStories Task 4 and Task 5 plan.

## Endpoints

- `POST /spacy-entities`
- `POST /keybert-keywords`
- `GET /health`

Both POST endpoints accept JSON with a `text` field. Set `ML_WORKER_TOKEN` if the caller should send `Authorization: Bearer <token>`.
