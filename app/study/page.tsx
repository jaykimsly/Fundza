'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AiQuizGenerator from '@/components/AiQuizGenerator';
import AppIcon from '@/components/AppIcon';
import AppLoader from '@/components/AppLoader';
import { FundzaBadge, FundzaButton, FundzaCard } from '@/components/Phase14Primitives';
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

function topicOrder(topic: TopicRow): [number, number, string] {
  const term = typeof topic.term_number === 'number' ? topic.term_number : Number.MAX_SAFE_INTEGER;
  const number = typeof topic.topic_number === 'number' ? topic.topic_number : Number.MAX_SAFE_INTEGER;
  return [term, number, topic.name.toLowerCase()];
}

function priorityTone(priority?: string) {
  if (priority === 'critical' || priority === 'high') return 'danger' as const;
  if (priority === 'medium') return 'warning' as const;
  return 'success' as const;
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
    const loadTopics = async () => {
      setTopicsLoading(true);
      setTopicError(null);
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
          return aTerm - bTerm || aNumber - bNumber || aName.localeCompare(bName);
        });
        setTopics(loadedTopics);
        setSelectedTopic(loadedTopics[0] || null);
      } catch (error) {
        if (cancelled) return;
        console.error('Study topics load error:', error);
        setTopics([]);
        setSelectedTopic(null);
        setTopicError('Topics could not be loaded right now. You can still practise this subject.');
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
    for (const topic of activeTopics) {
      const key = topic.term_number ? `Term ${topic.term_number}` : topic.paper || 'Topics';
      groups.set(key, [...(groups.get(key) || []), topic]);
    }
    return Array.from(groups.entries());
  }, [activeTopics]);

  if (loading) return <AppLoader message="Loading your study space..." />;

  return (
    <main className="fd-shell-content fd-dashboard">
      <header className="fd-dashboard-head">
        <div>
          <p className="fd-dashboard-kicker">Learn · practise · improve</p>
          <h1 className="fd-dashboard-title">Study</h1>
          <p className="fd-dashboard-subtitle">Choose a subject, work through the curriculum, then practise what you learned.</p>
        </div>
        <div className="fd-dashboard-actions">
          <FundzaButton href="/quiz" variant="secondary"><AppIcon name="quiz" size={16} /> Practice</FundzaButton>
          <FundzaButton href="/progress" variant="ghost"><AppIcon name="progress" size={16} /> Progress</FundzaButton>
        </div>
      </header>

      <div className="fd-dashboard-grid">
        <div className="fd-dashboard-grid-main">
          <FundzaCard className="fd-dashboard-section">
            <div className="fd-dashboard-section-head"><div><p className="fd-section-label">My subjects</p><h2 className="fd-section-title">Choose where to study</h2></div><FundzaBadge>{subjects.length} selected</FundzaBadge></div>
            {subjects.length ? <div className="fd-quick-actions">
              {subjects.map(subject => {
                const active = selected?.id === subject.id;
                return <button key={subject.id} type="button" onClick={() => setSelected(subject)} className={`fd-quick-action ${active ? 'fd-study-selected' : ''}`} aria-pressed={active}>
                  <AppIcon name="book" size={18} /><span>{subject.subjects_catalog?.name}</span><span className="fd-study-subject-mark">{subject.current_percentage}% → {subject.target_percentage}%</span>
                </button>;
              })}
            </div> : <div className="fd-empty">No subjects are saved yet. Complete your profile first.<div className="fd-dashboard-cta-row"><FundzaButton href="/profile/edit">Set up subjects</FundzaButton></div></div>}
          </FundzaCard>

          {selected && <>
            <FundzaCard className="fd-dashboard-section" aria-label="Curriculum topics">
              <div className="fd-dashboard-section-head">
                <div><p className="fd-section-label">Curriculum</p><h2 className="fd-section-title">{selected.subjects_catalog?.name}</h2><p>Current {selected.current_percentage}% · Target {selected.target_percentage}%</p></div>
                <FundzaBadge tone={priorityTone(selected.priority)}>{selected.priority || 'focus'}</FundzaBadge>
              </div>
              {topicsLoading && <div className="fd-empty" role="status">Loading curriculum topics...</div>}
              {topicError && <div className="warning-box" role="alert">{topicError}</div>}
              {!topicsLoading && !activeTopics.length && !topicError && <div className="fd-empty"><strong>No curriculum topics yet</strong><p>This subject is available for practice, but its topic material has not been loaded yet.</p></div>}
              {topicGroups.length > 0 && <div className="fd-topic-groups">{topicGroups.map(([groupName, groupTopics]) => <section key={groupName} aria-labelledby={`group-${groupName}`}><h3 id={`group-${groupName}`}>{groupName}</h3><div className="fd-topic-list" role="group" aria-label={`${groupName} topics`}>{groupTopics.map(topic => <button type="button" key={topic.id} onClick={() => setSelectedTopic(topic)} className={`fd-topic ${activeTopic?.id === topic.id ? 'is-active' : ''}`} aria-pressed={activeTopic?.id === topic.id}><span>{topic.topic_number ? `${topic.topic_number}. ` : ''}{topic.name}</span><span>{topic.paper || 'Study'}</span></button>)}</div></section>)}</div>}
            </FundzaCard>

            {activeTopic && <FundzaCard className="fd-dashboard-section" aria-labelledby="topic-heading">
              <div className="fd-dashboard-section-head"><div><p className="fd-section-label">Learning objective</p><h2 id="topic-heading" className="fd-section-title">{activeTopic.name}</h2><p>{activeTopic.paper || 'Curriculum topic'}{activeTopic.term_number ? ` · Term ${activeTopic.term_number}` : ''}</p></div></div>
              {activeTopic.content ? <div className="fd-study-content">{activeTopic.content}</div> : <div className="fd-empty"><strong>Study material is not loaded yet</strong><p>The topic is in the curriculum, but detailed material has not been added yet.</p></div>}
              <div className="fd-dashboard-cta-row"><FundzaButton href={`/quiz?topic=${encodeURIComponent(activeTopic.id)}`}>Practise topic</FundzaButton><FundzaButton href={`/quiz?subject=${encodeURIComponent(selected.subjects_catalog?.code || '')}`} variant="secondary">Practise subject</FundzaButton></div>
            </FundzaCard>}

            <FundzaCard className="fd-dashboard-section">
              <div className="fd-dashboard-section-head"><div><p className="fd-section-label">AI practice</p><h2 className="fd-section-title">Practise at your level</h2></div></div>
              <p className="fd-dashboard-subtitle">Generate questions for {selected.subjects_catalog?.name}, focused on {activeTopic?.name || 'your current subject'}.</p>
              <AiQuizGenerator topic={activeTopic?.name || selected.subjects_catalog?.name || 'General revision'} subject={selected.subjects_catalog?.name || 'Subject'} studentLevel={Number(selected.current_percentage || 0)} />
            </FundzaCard>
          </>}
        </div>

        <aside className="fd-dashboard-side">
          <FundzaCard className="fd-dashboard-section">
            <div className="fd-dashboard-section-head"><div><p className="fd-section-label">Study workflow</p><h2 className="fd-section-title">A simple loop</h2></div></div>
            <div className="fd-study-workflow"><div><strong>1</strong><span>Learn the topic</span></div><div><strong>2</strong><span>Practise questions</span></div><div><strong>3</strong><span>Review mistakes</span></div><div><strong>4</strong><span>Track progress</span></div></div>
          </FundzaCard>
          <FundzaCard className="fd-dashboard-section">
            <div className="fd-dashboard-section-head"><div><p className="fd-section-label">More practice</p><h2 className="fd-section-title">Keep moving</h2></div></div>
            <div className="fd-dashboard-cta-row" style={{ marginTop: 0 }}><FundzaButton href="/quiz">Practice</FundzaButton><FundzaButton href="/exams" variant="secondary">Past papers</FundzaButton></div>
          </FundzaCard>
        </aside>
      </div>
    </main>
  );
}
