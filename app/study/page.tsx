'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AiQuizGenerator from '@/components/AiQuizGenerator';
import AppLoader from '@/components/AppLoader';
import { getCurrentStudent, StudentSubjectWithCatalog } from '@/lib/student-data';

interface TopicRow {
  id: string;
  subject_id: string;
  name: string;
  paper: string | null;
  grade_number: number | null;
  term_number: number | null;
  topic_number: number | null;
  content: string | null;
}

function topicOrder(topic: TopicRow) {
  return [
    topic.term_number ?? Number.MAX_SAFE_INTEGER,
    topic.topic_number ?? Number.MAX_SAFE_INTEGER,
    topic.name.toLowerCase(),
  ];
}

export default function StudyPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<StudentSubjectWithCatalog[]>([]);
  const [selected, setSelected] = useState<StudentSubjectWithCatalog | null>(null);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentStudent().then(({ session, student, subjects: savedSubjects }) => {
      if (!session) { router.push('/login'); return; }
      if (!student) { router.push('/setup'); return; }
      setSubjects(savedSubjects);
      setSelected(savedSubjects[0] || null);
      setLoading(false);
    }).catch(error => {
      console.error(error);
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    if (!selected?.subject_id) {
      setTopics([]);
      setSelectedTopic(null);
      return;
    }

    let cancelled = false;
    setTopicsLoading(true);
    setTopicError(null);

    const loadTopics = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data, error } = await supabase
          .from('topics')
          .select('id, subject_id, name, paper, grade_number, term_number, topic_number, content')
          .eq('subject_id', selected.subject_id)
          .order('term_number', { ascending: true, nullsFirst: false })
          .order('topic_number', { ascending: true, nullsFirst: false })
          .order('name');

        if (error) throw error;
        if (cancelled) return;

        const loadedTopics = (data ?? []) as TopicRow[];
        loadedTopics.sort((a, b) => {
          const [aTerm, aNumber, aName] = topicOrder(a);
          const [bTerm, bNumber, bName] = topicOrder(b);
          return aTerm - bTerm || aNumber - bNumber || String(aName).localeCompare(String(bName));
        });
        setTopics(loadedTopics);
        setSelectedTopic(loadedTopics[0] || null);
      } catch (error) {
        if (cancelled) return;
        console.error('Study topics load error:', error);
        setTopics([]);
        setSelectedTopic(null);
        setTopicError('Topics could not be loaded right now. You can still use AI practice for this subject.');
      } finally {
        if (!cancelled) setTopicsLoading(false);
      }
    };

    void loadTopics();
    return () => { cancelled = true; };
  }, [selected?.subject_id]);

  const topicGroups = useMemo(() => {
    const groups = new Map<string, TopicRow[]>();
    for (const topic of topics) {
      const key = topic.term_number ? `Term ${topic.term_number}` : topic.paper || 'Topics';
      const group = groups.get(key) || [];
      group.push(topic);
      groups.set(key, group);
    }
    return Array.from(groups.entries());
  }, [topics]);

  if (loading) return <AppLoader message="Loading your study space..." />;

  return (
    <main className="container">
      <h1>Study</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
        Choose a subject, select a curriculum topic, learn the material, then practise what you learned.
      </p>

      <div className="card">
        <h2>My Subjects</h2>
        <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1rem' }}>
          {subjects.map(subject => (
            <button
              key={subject.id}
              onClick={() => setSelected(subject)}
              className={selected?.id === subject.id ? 'btn' : 'btn btn-secondary'}
              style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}
            >
              <span>{subject.subjects_catalog?.name}</span>
              <span>{subject.current_percentage}% → {subject.target_percentage}%</span>
            </button>
          ))}
        </div>
      </div>

      {!subjects.length && (
        <div className="card">
          <p>No subjects are saved yet. Complete your profile first.</p>
          <Link href="/profile/edit" className="btn">Set Up Subjects</Link>
        </div>
      )}

      {selected && (
        <>
          <section className="card" aria-labelledby="topics-heading">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Subject</p>
                <h2 id="topics-heading" style={{ marginBottom: '0.25rem' }}>{selected.subjects_catalog?.name}</h2>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                  Current {selected.current_percentage}% · Target {selected.target_percentage}% · Priority {selected.priority}
                </p>
              </div>
              <Link href={`/quiz?subject=${encodeURIComponent(selected.subjects_catalog?.code || '')}`} className="btn btn-secondary">
                Practice Subject
              </Link>
            </div>

            {topicsLoading && <p style={{ color: '#64748b', marginTop: '1rem' }}>Loading curriculum topics...</p>}
            {topicError && <div className="warning-box" style={{ marginTop: '1rem' }}>{topicError}</div>}

            {!topicsLoading && !topics.length && !topicError && (
              <div className="empty-state" style={{ marginTop: '1rem' }}>
                <h3>No curriculum topics yet</h3>
                <p>This subject is available for AI practice, but its topic material has not been loaded yet.</p>
              </div>
            )}

            {topicGroups.length > 0 && (
              <div style={{ display: 'grid', gap: '1rem', marginTop: '1.25rem' }}>
                {topicGroups.map(([groupName, groupTopics]) => (
                  <div key={groupName}>
                    <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>{groupName}</h3>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      {groupTopics.map(topic => (
                        <button
                          key={topic.id}
                          onClick={() => setSelectedTopic(topic)}
                          className={selectedTopic?.id === topic.id ? 'btn' : 'btn btn-secondary'}
                          style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}
                        >
                          <span>{topic.topic_number ? `${topic.topic_number}. ` : ''}{topic.name}</span>
                          <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{topic.paper || 'Study'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {selectedTopic && (
            <section className="card" aria-labelledby="topic-heading">
              <p style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Learning objective
              </p>
              <h2 id="topic-heading">{selectedTopic.name}</h2>
              <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {selectedTopic.paper || 'Curriculum topic'}{selectedTopic.term_number ? ` · Term ${selectedTopic.term_number}` : ''}
              </p>

              {selectedTopic.content ? (
                <div style={{ lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{selectedTopic.content}</div>
              ) : (
                <div className="empty-state">
                  <h3>Study material is not loaded yet</h3>
                  <p>The topic is in the curriculum, but detailed material has not been added yet. Use AI practice below while the knowledge base is being populated.</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
                <Link href={`/quiz?topic=${encodeURIComponent(selectedTopic.id)}`} className="btn">
                  Practise This Topic
                </Link>
                <Link href={`/quiz?subject=${encodeURIComponent(selected.subjects_catalog?.code || '')}`} className="btn btn-secondary">
                  Practise Subject
                </Link>
              </div>
            </section>
          )}

          <section className="card">
            <h2>AI Practice</h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Generate practice questions at your current level for {selected.subjects_catalog?.name}.
            </p>
            <AiQuizGenerator
              topic={selectedTopic?.name || selected.subjects_catalog?.name || 'General revision'}
              subject={selected.subjects_catalog?.name || 'Subject'}
              studentLevel={Number(selected.current_percentage || 0)}
            />
          </section>
        </>
      )}

      <div style={{ marginTop: '2rem' }}>
        <Link href="/quiz" className="btn">Practice</Link>
        <Link href="/upload" className="btn btn-secondary" style={{ marginLeft: '0.5rem' }}>Review Report</Link>
      </div>

      <nav className="nav">
        <Link href="/">Home</Link><Link href="/profile">Profile</Link><Link href="/quiz">Practice</Link><Link href="/exams">Exams</Link><Link href="/progress">Progress</Link>
      </nav>
    </main>
  );
}
