'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AiQuizGenerator from '@/components/AiQuizGenerator';
import AppLoader from '@/components/AppLoader';
import { FundzaBadge, FundzaButton, FundzaCard } from '@/components/Phase14Primitives';
import { getCurrentStudent, StudentSubjectWithCatalog } from '@/lib/student-data';
import { supabase } from '@/lib/supabase';

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

function topicOrder(topic: TopicRow): [number, number, string] {
  const term = typeof topic.term_number === 'number' ? topic.term_number : Number.MAX_SAFE_INTEGER;
  const number = typeof topic.topic_number === 'number' ? topic.topic_number : Number.MAX_SAFE_INTEGER;
  return [term, number, topic.name.toLowerCase()];
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
      console.error('Study profile load error:', error);
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    if (!selected?.subject_id) return;
    let cancelled = false;
    setTopicsLoading(true);
    const loadTopics = async () => {
      try {
        const { data, error } = await supabase.from('topics').select('id, subject_id, name, paper, grade_number, term_number, topic_number, content').eq('subject_id', selected.subject_id).order('term_number', { ascending: true, nullsFirst: false }).order('topic_number', { ascending: true, nullsFirst: false }).order('name');
        if (error) throw error;
        if (cancelled) return;
        const loadedTopics = (data ?? []) as TopicRow[];
        loadedTopics.sort((a, b) => {
          const [aTerm, aNumber, aName] = topicOrder(a);
          const [bTerm, bNumber, bName] = topicOrder(b);
          return aTerm - bTerm || aNumber - bNumber || aName.localeCompare(bName);
        });
        setTopics(loadedTopics);
        setSelectedTopic(loadedTopics[0] || null);
        setTopicError(null);
      } catch (error) {
        if (cancelled) return;
        console.error('Study topics load error:', error);
        setTopics([]);
        setSelectedTopic(null);
        setTopicError('Topics could not be loaded right now. Practice for this subject is still available.');
      } finally {
        if (!cancelled) setTopicsLoading(false);
      }
    };
    void loadTopics();
    return () => { cancelled = true; };
  }, [selected?.subject_id]);

  const activeTopics = useMemo(() => selected ? topics.filter(topic => topic.subject_id === selected.subject_id) : [], [selected, topics]);
  const activeTopic = selectedTopic?.subject_id === selected?.subject_id ? selectedTopic : null;
  const topicGroups = useMemo(() => {
    const groups = new Map<string, TopicRow[]>();
    activeTopics.forEach(topic => {
      const key = topic.term_number ? `Term ${topic.term_number}` : topic.paper || 'Topics';
      groups.set(key, [...(groups.get(key) || []), topic]);
    });
    return Array.from(groups.entries());
  }, [activeTopics]);

  if (loading) return <AppLoader message="Loading your study space..." />;

  return (
    <main className="fd-learning-page">
      <header className="fd-page-hero">
        <div className="fd-page-hero-copy"><p className="fd-kicker">STUDY ARENA</p><h1 className="fd-page-title">Learn the topic, then put it under pressure.</h1><p className="fd-page-subtitle">Move from curriculum material to targeted practice without losing your place. Your subject target stays visible so the work has a reason.</p></div>
        <FundzaButton href="/quiz">Quick practice</FundzaButton>
      </header>

      <FundzaCard className="fd-panel fd-soft-panel">
        <div className="fd-panel-heading"><div><p className="fd-kicker">MY SUBJECTS</p><h2>Choose your focus</h2><p>Current mark and target travel with the subject.</p></div><FundzaBadge tone="brand">{subjects.length} enrolled</FundzaBadge></div>
        {subjects.length ? <div className="fd-subject-switcher" role="group" aria-label="My subjects">{subjects.map(subject => <button key={subject.id} type="button" className={`fd-subject-pill${selected?.id === subject.id ? ' is-active' : ''}`} onClick={() => setSelected(subject)} aria-pressed={selected?.id === subject.id}><span>{subject.subjects_catalog?.name}</span><small>{subject.current_percentage}% → {subject.target_percentage}%</small></button>)}</div> : <div className="fd-empty-card"><h3>No subjects saved</h3><p>Complete your learner profile before starting curriculum study.</p><div style={{ marginTop: '.8rem' }}><FundzaButton href="/profile/edit">Set up subjects</FundzaButton></div></div>}
      </FundzaCard>

      {selected ? <>
        <section className="fd-topic-layout">
          <FundzaCard className="fd-panel">
            <div className="fd-panel-heading"><div><p className="fd-kicker">CURRICULUM</p><h2>{selected.subjects_catalog?.name}</h2><p>Current {selected.current_percentage}% · target {selected.target_percentage}% · {selected.priority} priority</p></div></div>
            {topicsLoading ? <div className="fd-empty-card"><h3>Loading topics…</h3><p>Preparing your curriculum map.</p></div> : null}
            {topicError ? <div className="fd-media-error" role="alert">{topicError}</div> : null}
            {!topicsLoading && !topicError && !topicGroups.length ? <div className="fd-empty-card"><h3>No curriculum topics yet</h3><p>The subject is available for practice, but detailed curriculum material has not been loaded yet.</p></div> : null}
            {topicGroups.length ? <div className="fd-topic-list">{topicGroups.map(([groupName, groupTopics]) => <div key={groupName}><p className="fd-topic-group-label">{groupName}</p>{groupTopics.map(topic => <button type="button" key={topic.id} className={`fd-topic-button${activeTopic?.id === topic.id ? ' is-active' : ''}`} onClick={() => setSelectedTopic(topic)} aria-pressed={activeTopic?.id === topic.id}><span className="fd-topic-title">{topic.topic_number ? `${topic.topic_number}. ` : ''}{topic.name}</span><span className="fd-topic-meta">{topic.paper || 'Study'}</span></button>)}</div>)}</div> : null}
          </FundzaCard>

          <FundzaCard className="fd-panel fd-topic-content">
            {activeTopic ? <><p className="fd-kicker">LEARNING OBJECTIVE</p><h2 className="fd-section-title">{activeTopic.name}</h2><p className="fd-page-subtitle">{activeTopic.paper || 'Curriculum topic'}{activeTopic.term_number ? ` · Term ${activeTopic.term_number}` : ''}</p><div style={{ marginTop: '1rem' }}>{activeTopic.content ? <div className="fd-topic-content-text">{activeTopic.content}</div> : <div className="fd-empty-card"><h3>Study material is not loaded yet</h3><p>This topic exists in the curriculum, but detailed notes are not available yet. Use targeted practice while the knowledge base is populated.</p></div>}</div><div className="fd-action-row"><FundzaButton href={`/quiz?topic=${encodeURIComponent(activeTopic.id)}`}>Practise this topic</FundzaButton><FundzaButton href={`/quiz?subject=${encodeURIComponent(selected.subjects_catalog?.code || '')}`} variant="secondary">Practise subject</FundzaButton></div></> : <div className="fd-empty-card"><h3>Select a topic</h3><p>Your selected subject will show curriculum material here.</p></div>}
          </FundzaCard>
        </section>

        <FundzaCard className="fd-panel">
          <div className="fd-panel-heading"><div><p className="fd-kicker">ADAPTIVE PRACTICE</p><h2>Generate questions for your current level</h2><p>Practice the active topic or the whole subject, then use Progress to see what changed.</p></div><FundzaBadge tone="warning">AI assisted</FundzaBadge></div>
          <AiQuizGenerator topic={activeTopic?.name || selected.subjects_catalog?.name || 'General revision'} subject={selected.subjects_catalog?.name || 'Subject'} studentLevel={Number(selected.current_percentage || 0)} />
        </FundzaCard>
      </> : null}

      <div className="fd-action-row"><FundzaButton href="/quiz">Practice</FundzaButton><FundzaButton href="/upload" variant="secondary">Review a report</FundzaButton><Link href="/progress" className="fd-button fd-button-ghost">View progress →</Link></div>
    </main>
  );
}
