# Fundza V2 Blueprint

## Status

Phase 0 is approved and the architecture is frozen for the initial V2 migration.

## Product North Star

> Fundza helps learners understand where they are, decide where they need to go, and take the next step themselves.

## Product Principle

> Learn it. Practise it. Prove it. Improve it.

## Learning Loop

1. Know your position
2. Set a goal
3. Study
4. Practise
5. Check yourself
6. Review
7. Improve
8. Repeat

## Primary Areas

- Home: What should I do today?
- Study: What am I learning?
- Practice: Can I actually do this?
- Progress: Am I getting better?
- Exams: What am I preparing for?
- People: Who can help me?
- Study Support: Contextual guidance that supports learning without replacing learner reasoning or legitimate human support.

## Architecture Boundary

The initial V2 migration keeps the existing Next.js, Supabase, authentication, API, examination infrastructure, hosting and automated-service foundations. Provider migration is explicitly deferred until Study Support requirements are benchmarked.

## Migration Rules

- Do not create duplicate database entities where V1 already provides an equivalent foundation.
- Do not migrate providers before Phase 10 evaluation.
- Do not change production directly while V2 is under development.
- Develop V2 on `develop-v2`.
- Keep production on `main`.
- Commit each meaningful change independently.
- Verify each phase before proceeding.

## Phase Order

0. Blueprint and architecture freeze
1. Product language
2. Learner-first Home
3. Study experience
4. Practice engine
5. Progress and mastery
6. Examination intelligence
7. Curriculum foundation
8. Knowledge and documents
9. People
10. Study Support infrastructure
11. Intelligence refinement
12. Learner profile
13. Security
14. Accessibility and UX quality
15. Performance and reliability
16. Testing
17. Analytics
18. Data quality
19. Observability
20. V2 release candidate

## Success Criteria

Fundza V2 should improve learning outcomes rather than simply increase automated-assistance usage. Key outcomes include practice completion, improvement between attempts, topic mastery, target achievement, examination preparation, study consistency, independent performance, retention and meaningful human learning interactions.
