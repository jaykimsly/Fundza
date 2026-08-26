'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface SubjectExtracted {
  name: string;
  percentage: number;
  level: number;
  comment?: string;
  weak_topics?: string[];
  strong_topics?: string[];
}

interface Props {
  analysis: {
    student_name: string;
    school_name: string;
    grade: number;
    term: string;
    overall_summary: string;
    overall_average: number;
    subjects_passed: number;
    subjects_failed: number;
    subjects: SubjectExtracted[];
    overall_recommendations: string[];
    aps_estimate: number;
    pass_type: string;
  } | null;
  studentId?: string;
}

export default function AnalysisResults({ analysis, studentId }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!analysis) return null;

  const saveToProfile = async () => {
    if (!studentId || !analysis.subjects?.length) return;
    setSaving(true);

    try {
      // Try to match extracted subjects to catalog
      const { data: catalog } = await supabase.from('subjects_catalog').select('*');
      
      const updates = analysis.subjects.map((subj: SubjectExtracted) => {
        const match = catalog?.find((c: any) => 
          c.name.toLowerCase().includes(subj.name.toLowerCase()) ||
          subj.name.toLowerCase().includes(c.name.toLowerCase())
        );
        return {
          student_id: studentId,
          subject_id: match?.id || null,
          current_percentage: subj.percentage || 0,
          target_percentage: Math.min(100, (subj.percentage || 0) + 15),
          priority: (subj.percentage || 0) < 50 ? 'critical' : (subj.percentage || 0) < 60 ? 'high' : 'medium',
        };
      }).filter((u: any) => u.subject_id);

      if (updates.length > 0) {
        await supabase.from('student_subjects').upsert(updates);
      }

      setSaved(true);
      setTimeout(() => router.push('/'), 1500);
    } catch (err) {
      alert('Error saving: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ background: '#0f172a', color: 'white' }}>
        <h2 style={{ color: '#fbbf24', marginBottom: '0.75rem' }}>AI Analysis Results</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
          {analysis.student_name && `${analysis.student_name} • `}
          {analysis.school_name && `${analysis.school_name} • `}
          Grade {analysis.grade || '?'} • {analysis.term || 'Unknown term'}
        </p>
        
        <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Average</p>
            <p style={{ fontSize: '2rem', fontWeight: 700 }}>{analysis.overall_average || '?'}%</p>
          </div>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>APS Estimate</p>
            <p style={{ fontSize: '2rem', fontWeight: 700 }}>{analysis.aps_estimate || '?'}</p>
          </div>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Pass Type</p>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: analysis.pass_type?.includes('Bachelor') ? '#059669' : '#ca8a04' }}>
              {analysis.pass_type || 'Unknown'}
            </p>
          </div>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Passed/Failed</p>
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>
              <span style={{ color: '#059669' }}>{analysis.subjects_passed || 0} ✓</span>
              <span style={{ color: '#64748b', margin: '0 0.25rem' }}>/</span>
              <span style={{ color: '#dc2626' }}>{analysis.subjects_failed || 0} ✗</span>
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Summary</h3>
        <p style={{ color: '#475569', lineHeight: 1.6 }}>{analysis.overall_summary}</p>
      </div>

      <h2 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>Extracted Subjects</h2>
      {analysis.subjects?.map((subj: SubjectExtracted, i: number) => (
        <div key={i} className="card" style={{ borderLeft: `4px solid ${(subj.percentage || 0) >= 50 ? '#059669' : '#dc2626'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>{subj.name}</h3>
            <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>
              {subj.percentage || '?'}% <span style={{ color: '#64748b', fontSize: '0.875rem' }}>(Level {subj.level || '?'})</span>
            </span>
          </div>
          {subj.comment && <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>{subj.comment}</p>}
          
          {subj.weak_topics && subj.weak_topics.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>🔴 Weak areas:</span>
              <span style={{ fontSize: '0.875rem', color: '#475569', marginLeft: '0.5rem' }}>{subj.weak_topics.join(', ')}</span>
            </div>
          )}
          {subj.strong_topics && subj.strong_topics.length > 0 && (
            <div style={{ marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>🟢 Strong areas:</span>
              <span style={{ fontSize: '0.875rem', color: '#475569', marginLeft: '0.5rem' }}>{subj.strong_topics.join(', ')}</span>
            </div>
          )}
        </div>
      ))}

      {analysis.overall_recommendations?.length > 0 && (
        <div className="card" style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
          <h3 style={{ color: '#9a3412' }}>AI Recommendations</h3>
          <ol style={{ paddingLeft: '1.25rem', marginTop: '0.75rem', color: '#7c2d12', lineHeight: 1.8 }}>
            {analysis.overall_recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
          </ol>
        </div>
      )}

      {studentId && analysis.subjects?.length > 0 && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: '0.875rem' }}>
            Save these extracted marks to your profile to update your study plan.
          </p>
          <button
            onClick={saveToProfile}
            disabled={saving || saved}
            className="btn btn-success"
            style={{ width: '100%' }}
          >
            {saved ? '✓ Saved! Redirecting...' : saving ? 'Saving...' : '💾 Save Marks to My Profile'}
          </button>
        </div>
      )}
    </div>
  );
}
