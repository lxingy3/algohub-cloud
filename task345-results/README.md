# Task 3-5 Story Insights

Task 3-5 adds three outputs from each story's `narrativeText`:

- Task 3 theme detection -> `aiThemes`
- Task 4 entity extraction -> `aiExtractedExperiences.entities`
- Task 5 keyword extraction -> `aiExtractedExperiences.keywords`

Run the local test:

```powershell
.\.task2-deberta-env\Scripts\python.exe scripts\task345-story-insights-local.py
```

The script writes `task345-results/task345-story-insights-results.json`.
