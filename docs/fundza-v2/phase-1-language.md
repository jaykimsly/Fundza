# Fundza V2 Phase 1: Product Language

Status: Complete on `develop-v2`

## Purpose

Phase 1 reframes learner-facing terminology around learning rather than implementation technology. The underlying APIs, database schema, authentication and automated services remain unchanged.

## Learner terminology

| V1 wording | V2 wording |
| --- | --- |
| AI Quiz | Practice |
| Generate AI Quiz | Create Practice |
| Quiz navigation | Practice |
| AI Analysis Results | Review Results |
| AI Recommendations | Recommendations |
| Analyze Report | Review My Report |
| AI report reader/service status | Report review status |
| Analyze navigation | Review |

## Implementation boundary

The following remain intentionally unchanged during Phase 1:

- `/api/generate-quiz`
- `/api/analyze`
- AI/provider implementation
- Supabase schema and migrations
- Authentication
- Storage infrastructure
- Internal component names such as `AiQuizGenerator`

Technical implementation terminology may remain in source code where it is not exposed to learners.

## Transparency

Fundza must not misrepresent automated processing as human work. Technical/provider details may remain available in privacy, legal, support and other transparency contexts where appropriate.

## Verification checklist

- [x] Primary dashboard terminology updated
- [x] Practice experience terminology updated
- [x] Report review terminology updated
- [x] Desktop navigation updated
- [x] Mobile navigation updated
- [x] Learner-facing status/error wording updated
- [x] Backend API names preserved
- [x] Database untouched
- [x] Authentication untouched
- [x] Provider architecture untouched
- [x] CI lint/typecheck/build pipeline added for `develop-v2`

Phase 1 is complete when the V2 staging deployment passes the CI pipeline and browser verification without learner-facing regressions.
