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
}

interface StudentSubjectRow {
  subject_id: string;
  subjects_catalog: { name: string; code: string } | null;
}

function startDate(exam: ExamRow) {
  return new Date(`${exam.exam_date}T${exam.start_time}+02:00`);
}

function normalise(value: string) {
  return value.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function matchesSubject(examName: string, catalogName: string) {
  const exam = normalise(examName);
  const subject = normalise(catalogName);
  if (exam === subject || exam.includes(subject) || subject.includes(exam)) return true;
  const aliases: Record<string, string[]> = {
    'english home language': ['english hl'],
    'english first additional language': ['english fal'],
    'afrikaans home language': ['afrikaans hl'],
    'afrikaans first additional language': ['afrikaans fal'],
    'afrikaans second additional language': ['afrikaans sal'],
    'computer applications technology': ['cat'],
    'information technology': ['it'],
    'life orientation': ['lo'],
  };
  return (aliases[subject] || []).some(alias => exam.includes(normalise(alias)));
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

      const { data: student } = await supabase
        .from('students')
        .select('id, grades(grade_number)')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

      const gradeNumber = (student as any)?.grades?.grade_number;
      if (!student || gradeNumber !== 12) { setLoading(false); return; }

      const [{ data: timetable }, { data: subjects }] = await Promise.all([
        supabase.from('exam_timetable')
          .select('id, exam_date, start_time, duration_minutes, session, subject_name, paper, exam_type')
          .eq('grade_number', 12).eq('exam_type', 'preparatory')
          .order('exam_date').order('start_time'),
        supabase.from('student_subjects')
          .select('subject_id, subjects_catalog(name, code)')
          .eq('student_id', student.id),
      ]);

      setExams(timetable || []);
      setStudentSubjects((subjects || []) as unknown as StudentSubjectRow[]);
      setLoading(false);
    };

    load();
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const upcoming = useMemo(() => {
    const enrolled = studentSubjects.map(s => s.subjects_catalog).filter(Boolean) as { name: string; code: string }[];
    return exams
      .filter(exam => startDate(exam).getTime() > now.getTime())
      .filter(exam => enrolled.some(subject => matchesSubject(exam.subject_name, subject.name)))
      .slice(0, 5);
  }, [exams, studentSubjects, now]);

  if (loading || upcoming.length === 0) return null;

  const next = upcoming[0];
  const nextTime = getTimeLeft(startDate(next), now);

  return (
    <section className="card" aria-label="Upcoming exams">
      <h2>Upcoming Exams</h2>
      <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
        Your next Grade 12 preparatory exam based on the subjects in your Fundza profile.
      </p>
      <div className="countdown" style={{ marginTop: '1rem' }}>
        <div className="countdown-item"><div className="countdown-number">{nextTime.days}</div><div className="countdown-label">Days</div></div>
        <div className="countdown-item"><div className="countdown-number">{nextTime.hours}</div><div className="countdown-label">Hours</div></div>
        <div className="countdown-item"><div className="countdown-number">{nextTime.minutes}</div><div className="countdown-label">Mins</div></div>
        <div className="countdown-item"><div className="countdown-number">{nextTime.seconds}</div><div className="countdown-label">Secs</div></div>
      </div>
      <div style={{ marginTop: '1rem', padding: '0.875rem', background: '#f8fafc', borderRadius: '8px' }}>
        <strong>{next.subject_name}</strong>
        <div style={{ color: '#475569', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {next.paper} • {next.exam_date} • {next.start_time.slice(0, 5)} • {next.duration_minutes} min
        </div>
      </div>
      {upcoming.length > 1 && (
        <div style={{ marginTop: '0.75rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Next after this</p>
          {upcoming.slice(1).map(exam => (
            <div key={exam.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.45rem 0', fontSize: '0.8rem', borderBottom: '1px solid #e2e8f0' }}>
              <span>{exam.subject_name} {exam.paper}</span><span style={{ color: '#64748b' }}>{exam.exam_date}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
