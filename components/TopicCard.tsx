import { Topic } from '@/types';
import Link from 'next/link';

interface Props {
  topic: Topic;
}

const masteryEmoji = {
  'not-mastered': '🔴',
  'developing': '🟠',
  'almost-there': '🟡',
  'mastered': '🟢',
};

const masteryLabel = {
  'not-mastered': 'Not mastered',
  'developing': 'Developing',
  'almost-there': 'Almost there',
  'mastered': 'Mastered',
};

const masteryColor = {
  'not-mastered': '#dc2626',
  'developing': '#ea580c',
  'almost-there': '#ca8a04',
  'mastered': '#059669',
};

export default function TopicCard({ topic }: Props) {
  return (
    <Link href={`/quiz?topic=${topic.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="card" style={{ cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.2s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{topic.name}</h3>
          <span style={{ fontSize: '1.25rem' }}>{masteryEmoji[topic.masteryLevel]}</span>
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
          {masteryLabel[topic.masteryLevel]} • {topic.masteryPercentage}%
        </div>
        <div className="progress-bar-bg" style={{ marginTop: '0.5rem', height: '6px' }}>
          <div 
            className="progress-bar-fill" 
            style={{ width: `${topic.masteryPercentage}%`, background: masteryColor[topic.masteryLevel] }} 
          />
        </div>
      </div>
    </Link>
  );
}
