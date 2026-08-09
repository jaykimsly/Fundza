import { Subject } from '@/types';
import ProgressBar from './ProgressBar';

interface Props {
  subject: Subject;
}

export default function SubjectCard({ subject }: Props) {
  const priorityClass = `priority-${subject.priority}`;
  
  return (
    <div className="card" style={{ borderLeft: `4px solid ${subject.color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ fontSize: '1.05rem' }}>{subject.name}</h3>
        <span className={priorityClass} style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          {subject.priority}
        </span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
        <span>Current: <strong>{subject.currentPercentage}%</strong></span>
        <span>Target: <strong>{subject.targetPercentage}%</strong></span>
      </div>
      
      <ProgressBar current={subject.currentPercentage} target={subject.targetPercentage} color={subject.color} />
      
      <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
        Gap: {subject.targetPercentage - subject.currentPercentage} points
      </div>
    </div>
  );
}
