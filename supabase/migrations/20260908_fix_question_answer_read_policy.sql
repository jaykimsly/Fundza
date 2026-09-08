-- Learner practice queries join questions to question_answers.
-- Without a SELECT policy on question_answers, Supabase RLS returns no
-- answer rows to authenticated learners. Quiz.tsx then filters every live
-- question because correctAnswer is empty, making the 253-question bank
-- appear empty in the Study Partner / Practice UI.
create policy "Authenticated users can read question answers"
on public.question_answers
for select
to authenticated
using (true);
