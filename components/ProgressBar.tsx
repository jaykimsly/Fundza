interface Props {
  current: number;
  target: number;
  color?: string;
}

export default function ProgressBar({ current, target, color = '#2563eb' }: Props) {
  const max = Math.max(target, 100);
  const currentWidth = (current / max) * 100;
  const targetWidth = (target / max) * 100;
  
  return (
    <div style={{ position: 'relative', margin: '0.5rem 0' }}>
      <div className="progress-bar-bg">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${currentWidth}%`, background: color }}
        />
      </div>
      <div 
        style={{ 
          position: 'absolute', 
          top: '-3px', 
          left: `${targetWidth}%`, 
          width: '2px', 
          height: '16px', 
          background: '#0f172a',
          borderRadius: '2px'
        }} 
        title={`Target: ${target}%`}
      />
    </div>
  );
}
