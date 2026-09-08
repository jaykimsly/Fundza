# Exams ingestion

Fundza's historical exam catalogue is driven by the student's existing `student_subjects` enrolment. Historical papers are global catalogue records linked to `subjects_catalog`, not student-specific `exams` timetable rows.

## Source

The first source adapter is the South African Department of Basic Education (DBE) NSC past-paper catalogue:

https://www.education.gov.za/Examinations/NSCPastExaminationpapers/tabid/593/Default.aspx

Fundza stores the official paper and memo URLs plus provenance and verification metadata. It does not assume the DBE site is an API.

## Ingestion endpoint

`POST /api/admin/exams/ingest`

This endpoint is server-only and requires `EXAMS_INGEST_KEY` in the request header `x-fundza-ingest-key` or as a Bearer token. Never put this key in browser code.

The endpoint accepts normalized paper data:

```json
{
  "source": "DBE",
  "papers": [
    {
      "subjectCode": "MATH",
      "gradeNumber": 12,
      "year": 2025,
      "examType": "NSC",
      "session": "may-june",
      "paperNumber": 1,
      "language": "English",
      "title": "Mathematics Paper 1",
      "paperUrl": "https://www.education.gov.za/...pdf",
      "memoUrl": "https://www.education.gov.za/...memo.pdf",
      "sourcePageUrl": "https://www.education.gov.za/...",
      "durationMinutes": 180,
      "questions": [
        {
          "questionNumber": "1.1",
          "order": 1,
          "questionText": "...",
          "marks": 2,
          "memoAnswer": "...",
          "memoExplanation": "...",
          "memoSteps": ["..."],
          "sourcePage": 2
        }
      ]
    }
  ]
}
```

A stable `source_key` makes repeated ingestion idempotent. Existing questions for a paper and question number are updated rather than duplicated.

## Flow

`student_subjects → subjects_catalog → papers → questions → question_answers → exam_attempts → exam_attempt_answers`

`question_answers` is the authoritative marking reference. Student-facing APIs do not expose that table directly. Server routes use the service-role client after verifying the authenticated student's ownership of the attempt, then store deterministic marking results. The explanation endpoint sends the question, learner answer, and memo reference to the existing Fundza explanation layer so generated feedback stays grounded.

## DBE discovery helper

`GET /api/admin/exams/dbe` fetches the official DBE catalogue page and extracts downloadable links. It is intentionally a discovery adapter, not a claim that the DBE site provides a stable machine-readable API.

The remaining extraction step should convert each downloaded paper and memo into the normalized ingestion payload above. This keeps PDF parsing replaceable and prevents source-specific parsing logic from leaking into the learner-facing Exams application.
