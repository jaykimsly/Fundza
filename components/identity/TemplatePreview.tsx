import Image from 'next/image';

type TemplatePreviewProps = { src?: string; alt: string; fallbackLabel: string; tone: 'light' | 'dark' };

export default function TemplatePreview({ src, alt, fallbackLabel, tone }: TemplatePreviewProps) {
  return (
    <div className={`fd-photo-art fd-photo-art-${tone}`}>
      {src ? (
        <Image className="fd-template-image" src={src} alt={alt} fill sizes="(max-width: 820px) 100vw, 50vw" priority />
      ) : (
        <div className="fd-template-character" aria-hidden="true"><span>{fallbackLabel}</span></div>
      )}
      <div className="fd-photo-vignette" aria-hidden="true" />
    </div>
  );
}
