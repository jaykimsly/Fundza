-- ============================================================
-- FUNDZA: SCHOOL DIRECTORY + STUDENT SCHOOL/GRADE PROFILE
-- Ehlanzeni-ready school catalogue
-- ============================================================

-- Enable trigram search for fast school-name searching
create extension if not exists pg_trgm;

-- ============================================================
-- SCHOOLS
-- ============================================================

create table if not exists schools (
  id uuid default gen_random_uuid() primary key,

  -- Official DBE identifier
  emis_number text unique,

  name text not null,

  province text not null default 'Mpumalanga',
  district text not null default 'Ehlanzeni',

  municipality text,
  circuit text,
  area text,

  phase text,

  -- Example: Public, Independent, etc.
  sector text,

  -- Grades offered by the school.
  -- Example: {8,9,10,11,12}
  grades_offered integer[] not null default '{}',

  address text,
  phone text,
  email text,

  latitude numeric,
  longitude numeric,

  active boolean not null default true,

  data_source text,
  data_source_date date,

  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),

  constraint schools_grade_range_check
    check (
      grades_offered <@ array[
        0,1,2,3,4,5,6,7,8,9,10,11,12
      ]::integer[]
    )
);

-- ============================================================
-- STUDENT PROFILE EXTENSIONS
-- ============================================================

alter table students
  add column if not exists school_id uuid
    references schools(id) on delete set null;

alter table students
  add column if not exists grade integer;

alter table students
  add column if not exists profile_completed boolean
    not null default false;

alter table students
  add column if not exists updated_at timestamptz
    not null default timezone('utc'::text, now());

alter table students
  drop constraint if exists students_grade_check;

alter table students
  add constraint students_grade_check
  check (grade is null or grade between 10 and 12);

-- ============================================================
-- SEARCH INDEXES
-- ============================================================

create index if not exists schools_name_trgm_idx
  on schools using gin (name gin_trgm_ops);

create index if not exists schools_emis_idx
  on schools (emis_number);

create index if not exists schools_district_idx
  on schools (district);

create index if not exists schools_active_idx
  on schools (active);

create index if not exists schools_grades_idx
  on schools using gin (grades_offered);

create index if not exists schools_municipality_idx
  on schools (municipality);

-- ============================================================
-- RLS
-- ============================================================

alter table schools enable row level security;

-- Students may search/read the school catalogue.
create policy "Anyone can view active schools"
on schools
for select
using (active = true);

-- School catalogue is NOT writable by normal users.
-- Imports/admin operations should use the service role.
-- ============================================================

-- ============================================================
-- SCHOOL SEARCH FUNCTION
-- ============================================================

create or replace function search_schools(
  search_term text,
  selected_grade integer default null,
  result_limit integer default 20
)
returns setof schools
language sql
stable
as $$
  select *
  from schools
  where active = true
    and district = 'Ehlanzeni'
    and (
      search_term is null
      or search_term = ''
      or name ilike '%' || search_term || '%'
      or emis_number ilike '%' || search_term || '%'
      or coalesce(area, '') ilike '%' || search_term || '%'
      or coalesce(municipality, '') ilike '%' || search_term || '%'
    )
    and (
      selected_grade is null
      or selected_grade = any(grades_offered)
    )
  order by
    case
      when lower(name) = lower(search_term) then 0
      when lower(name) like lower(search_term) || '%' then 1
      else 2
    end,
    name
  limit greatest(1, least(result_limit, 50));
$$;

-- ============================================================
-- HELPER VIEW FOR GRADE 10-12 SCHOOLS
-- ============================================================

create or replace view ehlanzeni_secondary_schools as
select
  id,
  emis_number,
  name,
  municipality,
  circuit,
  area,
  phase,
  sector,
  grades_offered,
  address,
  phone,
  email,
  latitude,
  longitude
from schools
where active = true
  and district = 'Ehlanzeni'
  and (
    10 = any(grades_offered)
    or 11 = any(grades_offered)
    or 12 = any(grades_offered)
  );

-- ============================================================
-- COMMENTS
-- ============================================================

comment on table schools is
  'School directory. Official EMIS-backed records, initially focused on Ehlanzeni District.';

comment on column schools.emis_number is
  'Official National EMIS school identifier.';

comment on column schools.grades_offered is
  'Array of grades offered by the school.';

comment on column students.school_id is
  'Selected school from the Fundza school directory.';

comment on column students.grade is
  'Current Grade 10, 11 or 12 of the student.';
