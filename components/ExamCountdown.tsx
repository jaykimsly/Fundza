'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ExamRow {
  id: string;
  exam_date: string;
  start_time: string;
  duration_minutes: number;
  session: 'first' | 'second';
  subject_name: string;
  paper: string;
  exam_type: string;
  source_name: string | null;
  verified_at: string | null;
  timezone: string | null;
}

interface StudentSubjectRow {
  subject_id: string;
  subjects_catalog: { name: string; code: string } | null;
}

function startDate(exam: ExamRow) {
  const offset = exam.timezone === 'Africa/Johannesburg' || !exam.timezone ? '+02:00' : 'Z';
  return new Date(`${exam.exam_date}T${exam.start_time}${offset}`);
}

function normalise(value: string) {
  return value.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function canonical(value: string) {
  const name = normalise(value);
  if (name.includes('english fal') || name.includes('english first additional language')) return 'english first additional language';
  if (name.includes('english hl') || name.includes('english home language')) return 'english home language';
  if (name.includes('afrikaans fal') || name.includes('afrikaans first additional language')) return 'afrikaans first additional language';
  if (name.includes('afrikaans sal') || name.includes('afrikaans second additional language')) return 'afrikaans second additional language';
  if (name.includes('afrikaans hl') || name.includes('afrikaans home language')) return 'afrikaans home language';
  if (name === 'cat' || name.includes('computer applications technology')) return 'computer applications technology';
  if (name === 'it' || name.includes('information technology')) return 'information technology';
  if (name === 'lo' || name.includes('life orientation')) return 'life orientation';
  return name;
}

function matchesSubject(examName: string, catalogName: string) {
  const exam = canonical(examName);
  const subject = canonical(catalogName);
  return exam === subject || exam.includes(subject) || subject.includes(exam);
}

function getTimeLeft(target: Date, now: Date) {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function ExamCountdown() {
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [studentSubjects, setStudentSubjects] = useState<StudentSubjectRow[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const { data: student } = await supabase.from('students').select('id, grades(grade_number)').eq('auth_user_id', session.user.id).maybeSingle();
      const gradeNumber = (student as { grades?: { grade_number?: number } | null } | null)?.grades?.grade_number;
      if (!student || gradeNumber !== 12) { setLoading(false); return; }

      const [{ data: timetable }, { data: subjects }] = await Promise.all([
        supabase.from('exam_timetable').select('id, exam_date, start_time, duration_minutes, session, subject_name, paper, exam_type, source_name, verified_at, timezone').eq('grade_number', 12).eq('exam_type', 'preparatory').order('exam_date').order('start_time'),
        supabase.from('student_subjects').select('subject_id, subjects_catalog(name, code)').eq('student_id', student.id),
      ]);
      setExams((timetable || []) as ExamRow[]);
      setStudentSubjects((subjects || []) as unknown as StudentSubjectRow[]);
      setLoading(false);
    };
    void load();
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const upcoming = useMemo(() => {
    const enrolled = studentSubjects.map(s => s.subjects_catalog).filter(Boolean) as { name: string; code: string }[];
    return exams.filter(exam => startDate(exam).getTime() > now.getTime()).filter(exam => enrolled.some(subject => matchesSubject(exam.subject_name, subject.name))).slice(0, 5);
  }, [exams, studentSubjects, now]);

  if (loading || upcoming.length === 0) return null;
  const next = upcoming[0];
  const nextTime = getTimeLeft(startDate(next), now);

  return (
    <section className="fd-card fd-countdown-shell" aria-label="Upcoming exams">
      <div className="fd-countdown-title"><div><p className="fd-kicker">NEXT EXAM</p><h2>Stay ahead of the timetable</h2></div><span className="fd-chip fd-chip-warning">Grade 12</span></div>
      <p className="fd-page-subtitle">Your next preparatory paper for an enrolled subject.</p>
      <div className="fd-countdown-wrap" style={{ marginTop: '1rem' }}>
        <div className="fd-countdown-item"><strong className="fd-countdown-number">{nextTime.days}</strong><span className="fd-countdown-label">Days</span></div>
        <div className="fd-countdown-item"><strong className="fd-countdown-number">{nextTime.hours}</strong><span className="fd-countdown-label">Hours</span></div>
        <div className="fd-countdown-item"><strong className="fd-countdown-number">{nextTime.minutes}</strong><span className="fd-countdown-label">Minutes</span></div>
        <div className="fd-countdown-item"><strong className="fd-countdown-number">{nextTime.seconds}</strong><span className="fd-countdown-label">Seconds</span></div>
      </div>
      <div className="fd-status-row" style={{ marginTop: '.8rem', borderBottom: 0, paddingBottom: 0 }}>
        <span><strong>{next.subject_name}</strong> · {next.paper}</span>
        <span>{next.exam_date} · {next.start_time.slice(0, 5)} · {next.duration_minutes} min</span>
      </div>
      {upcoming.length > 1 ? <details style={{ marginTop: '.7rem' }}><summary style={{ cursor: 'pointer', color: 'var(--fd-brand-strong)', fontSize: '.72rem', fontWeight: 800 }}>View next {upcoming.length - 1} papers</summary><div style={{ marginTop: '.55rem' }}>{upcoming.slice(1).map(exam => <div className="fd-status-row" key={exam.id}><span>{exam.subject_name} · {exam.paper}</span><span>{exam.exam_date}</span></div>)}</div></details> : null}
    </section>
  );
}
