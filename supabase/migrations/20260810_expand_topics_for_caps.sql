alter table topics
  add column if not exists grade_number integer,
  add column if not exists term_number integer,
  add column if not exists topic_number integer,
  add column if not exists content text,
  add column if not exists source_document text;

create index if not exists idx_topics_subject_grade
  on topics(subject_id, grade_number);

create index if not exists idx_topics_subject_grade_term
  on topics(subject_id, grade_number, term_number);
