'use client';

import { useEffect, useState } from 'react';
import Badge from '@/components/ui/Badge';
import PhotoUploader from './PhotoUploader';
import TemplatePreview from './TemplatePreview';

type PhotoIdentityCardProps = {
  slot: number;
  name: string;
  subtitle: string;
  tone: 'light' | 'dark';
  templateSrc?: string;
  fallbackLabel: string;
  initialPreview?: string | null;
  onFileChange?: (file: File | null, previewUrl: string | null) => void;
};

export default function PhotoIdentityCard({ slot, name, subtitle, tone, templateSrc, fallbackLabel, initialPreview = null, onFileChange }: PhotoIdentityCardProps) {
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const preview = selectedPreview ?? initialPreview;

  useEffect(() => () => {
    if (selectedPreview?.startsWith('blob:')) URL.revokeObjectURL(selectedPreview);
  }, [selectedPreview]);

  const handleChange = (file: File | null, nextPreview: string | null) => {
    if (selectedPreview?.startsWith('blob:') && selectedPreview !== nextPreview) URL.revokeObjectURL(selectedPreview);
    setFileName(file?.name ?? null);
    setSelectedPreview(nextPreview);
    onFileChange?.(file, nextPreview);
  };

  return (
    <article className={`fd-photo-card fd-photo-card-${tone}`}>
      <div className="fd-photo-frame">
        {preview ? (
          <div className="fd-photo-art">
            <img src={preview} alt={`Your uploaded photo ${slot}`} />
            <div className="fd-photo-vignette" aria-hidden="true" />
          </div>
        ) : (
          <TemplatePreview src={templateSrc} alt={`${name} template`} fallbackLabel={fallbackLabel} tone={tone} />
        )}
        <div className="fd-photo-copy">
          <div className="fd-photo-title">{name}</div>
          <div className="fd-photo-subtitle">{subtitle}</div>
        </div>
        {!fileName && !initialPreview && <Badge className="fd-template-badge">TEMPLATE</Badge>}
      </div>
      <PhotoUploader slot={slot} value={preview} onChange={handleChange} />
      {fileName && <p className="fd-photo-file" title={fileName}>{fileName}</p>}
    </article>
  );
}
