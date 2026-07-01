# AlgoHub build-spec compliance notes

This note compares the current implemented scope against the teacher-facing sources we are using now.

## Priority rule

1. Weekly assignments and meeting notes are the highest priority because they are the latest live requirements.
2. `AlgoHub_Build_Specification.md` is the second priority and is treated as the baseline architecture/design guide.
3. Big-spec features not requested by the current weekly assignment or meeting notes stay deferred.

## Current scope: Task 1-5

| Area | Big-spec expectation | Current decision |
| --- | --- | --- |
| Task 1 transcription | Run local/open-source Whisper, not hosted model APIs. | Compliant after local/self-hosted Task 1 path. Hosted Hugging Face ASR is removed. |
| Task 2 impact classification | Use local fine-tuned RoBERTa or local zero-shot BART/DeBERTa-style classifier. | Partially compliant. Current path runs local DeBERTa zero-shot when the Python model environment exists, with JS rules as fallback. Fine-tune is deferred until labeled review data exists. |
| Task 3 theme detection | Use local BART. | Compliant when local Python model environment exists, with JS theme rules as fallback. |
| Task 4 entity extraction | Use spaCy. | Compliant when local Python model environment exists; JS extraction remains a degraded fallback. |
| Task 5 keyword extraction | Use KeyBERT. | Compliant when local Python model environment exists; JS keyword extraction remains a degraded fallback. |
| Python dependencies | Provide the 4.14 `requirements.txt` stack for local ML service work. | Compliant. Root `requirements.txt` now includes openai-whisper, torch, transformers, sentence-transformers, spaCy, KeyBERT, BERTopic, HDBSCAN, scikit-learn, datasets, and service infrastructure packages. |
| External ML APIs | Run as much as possible locally; external APIs only for explicitly requested advanced generation. | Hosted model API calls are no longer part of Task 1-5. Self-hosted worker endpoints remain allowed. |
| Fine-tuning | Train periodically from facilitator corrections, admin moderation decisions, and manually labeled seed data. | Deferred. The required labeled review workflow is not in the current weekly scope. |
| Quick Test text limit | Demo limit is 12,000 characters for analysis. | Longer input is accepted and truncated for Task 2-5 analysis instead of failing with a query-length error. |
| Video upload | Use the audio track for transcription. | Supported through the Task 1 media path. |

## Current scope: UI/design

| Area | Big-spec expectation | Current decision |
| --- | --- | --- |
| Brand colors | Preserve gold/amber around `#D4A017` and dark around `#1a1a2e`. | Brand tokens are defined in Tailwind. Public pages already use the amber/dark visual system. |
| Impact colors | High red, medium amber/yellow, low green. | Compliant in algorithm/testimony impact badges. |
| Admin UI | Admin should support moderation and management workflows. | Slate/white admin UI is kept because it is clearer for repeated admin work and does not conflict with current meeting notes. |

## Deferred from the big spec

Task 6 algorithm linking, Task 7 summarization, silence detection, briefings, and full facilitator review/fine-tune workflows remain deferred until a weekly assignment or meeting note explicitly brings them back into scope.
