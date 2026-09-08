'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FundzaBadge, FundzaButton, FundzaCard } from '@/components/Phase14Primitives';

export type ProfileMediaKind = 'avatar' | 'background';

type Props = {
  studentId: string;
  initialAvatarUrl?: string | null;
  initialBackgroundUrl?: string | null;
};

type CropState = {
  file: File;
  kind: ProfileMediaKind;
  objectUrl: string;
  image: HTMLImageElement;
  zoom: number;
  x: number;
  y: number;
};

const BUCKET = 'student-identity';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ASPECT: Record<ProfileMediaKind, number> = { avatar: 1, background: 16 / 6 };
const OUTPUT: Record<ProfileMediaKind, { width: number; height: number }> = {
  avatar: { width: 800, height: 800 },
  background: { width: 1600, height: 600 },
};

function revoke(url?: string) {
  if (url) URL.revokeObjectURL(url);
}

async function readImage(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = objectUrl;
  await image.decode();
  return { objectUrl, image };
}

async function cropToBlob(state: CropState) {
  const cropWidth = 1000;
  const cropHeight = cropWidth / ASPECT[state.kind];
  const scale = Math.max(cropWidth / state.image.naturalWidth, cropHeight / state.image.naturalHeight) * state.zoom;
  const renderedWidth = state.image.naturalWidth * scale;
  const renderedHeight = state.image.naturalHeight * scale;
  const baseX = (cropWidth - renderedWidth) / 2 + state.x;
  const baseY = (cropHeight - renderedHeight) / 2 + state.y;
  const sourceX = Math.max(0, Math.min(state.image.naturalWidth - cropWidth / scale, -baseX / scale));
  const sourceY = Math.max(0, Math.min(state.image.naturalHeight - cropHeight / scale, -baseY / scale));
  const sourceWidth = Math.min(state.image.naturalWidth, cropWidth / scale);
  const sourceHeight = Math.min(state.image.naturalHeight, cropHeight / scale);
  const output = OUTPUT[state.kind];
  const canvas = document.createElement('canvas');
  canvas.width = output.width;
  canvas.height = output.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not create the image editor.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(state.image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, output.width, output.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
  if (!blob) throw new Error('Could not prepare the cropped image.');
  return { blob, previewUrl: canvas.toDataURL('image/webp', 0.9) };
}

export default function ProfileMediaUploader({ studentId, initialAvatarUrl, initialBackgroundUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || '');
  const [backgroundUrl, setBackgroundUrl] = useState(initialBackgroundUrl || '');
  const [crop, setCrop] = useState<CropState | null>(null);
  const [preview, setPreview] = useState('');
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dragOrigin = useRef({ x: 0, y: 0, cropX: 0, cropY: 0 });

  useEffect(() => {
    setAvatarUrl(initialAvatarUrl || '');
    setBackgroundUrl(initialBackgroundUrl || '');
  }, [initialAvatarUrl, initialBackgroundUrl]);

  useEffect(() => () => revoke(crop?.objectUrl), [crop?.objectUrl]);

  const title = useMemo(() => crop?.kind === 'avatar' ? 'Adjust profile photo' : 'Adjust profile background', [crop]);

  const openPicker = (kind: ProfileMediaKind) => {
    setError('');
    setPreview('');
    if (inputRef.current) {
      inputRef.current.dataset.kind = kind;
      inputRef.current.value = '';
      inputRef.current.click();
    }
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose a JPG, PNG or WebP image.'); return; }
    if (file.size > MAX_FILE_BYTES) { setError('Images must be 10 MB or smaller.'); return; }
    try {
      const kind = (inputRef.current?.dataset.kind || 'avatar') as ProfileMediaKind;
      const { objectUrl, image } = await readImage(file);
      setCrop({ file, kind, objectUrl, image, zoom: 1, x: 0, y: 0 });
    } catch (err) {
      console.error(err);
      setError('That image could not be opened. Try another file.');
    }
  };

  useEffect(() => {
    if (!crop) return;
    cropToBlob(crop).then(({ previewUrl }) => setPreview(previewUrl)).catch((err) => console.error(err));
  }, [crop]);

  const dragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!crop) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragOrigin.current = { x: event.clientX, y: event.clientY, cropX: crop.x, cropY: crop.y };
    setDragging(true);
  };

  const dragMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!crop || !dragging) return;
    const maxX = Math.max(0, ((crop.image.naturalWidth * Math.max(1000 / crop.image.naturalWidth, (1000 / ASPECT[crop.kind]) / crop.image.naturalHeight) * crop.zoom) - 1000) / 2);
    const maxY = Math.max(0, ((crop.image.naturalHeight * Math.max(1000 / crop.image.naturalWidth, (1000 / ASPECT[crop.kind]) / crop.image.naturalHeight) * crop.zoom) - (1000 / ASPECT[crop.kind])) / 2);
    const nextX = Math.max(-maxX, Math.min(maxX, dragOrigin.current.cropX + event.clientX - dragOrigin.current.x));
    const nextY = Math.max(-maxY, Math.min(maxY, dragOrigin.current.cropY + event.clientY - dragOrigin.current.y));
    setCrop((current) => current ? { ...current, x: nextX, y: nextY } : current);
  };

  const saveCrop = async () => {
    if (!crop) return;
    setSaving(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Your session has expired. Please sign in again.');
      const { blob, previewUrl } = await cropToBlob(crop);
      const path = `${user.id}/profile/${crop.kind}.webp`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' });
      if (uploadError) throw uploadError;

      const current = { avatar_path: avatarUrl ? null : null, background_path: backgroundUrl ? null : null };
      const { data: existing } = await supabase.from('student_profile_media').select('avatar_path, background_path').eq('student_id', studentId).maybeSingle();
      const payload = {
        student_id: studentId,
        avatar_path: crop.kind === 'avatar' ? path : (existing?.avatar_path || null),
        background_path: crop.kind === 'background' ? path : (existing?.background_path || null),
      };
      void current;
      const { error: dbError } = await supabase.from('student_profile_media').upsert(payload, { onConflict: 'student_id' });
      if (dbError) throw dbError;

      if (crop.kind === 'avatar') setAvatarUrl(previewUrl);
      else setBackgroundUrl(previewUrl);
      revoke(crop.objectUrl);
      setCrop(null);
      setPreview('');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Could not save this image.');
    } finally {
      setSaving(false);
    }
  };

  const displayed = crop ? crop.objectUrl : '';

  return (
    <>
      <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onFile(event.target.files?.[0])} />
      <FundzaCard className="fd-media-card">
        <div className="fd-media-heading">
          <div>
            <p className="fd-section-label">PERSONALISE YOUR SPACE</p>
            <h2 className="fd-section-title">Profile photos & background</h2>
            <p className="fd-media-help">Choose a profile image and a wide background. You can preview, zoom and crop before anything is saved.</p>
          </div>
          <FundzaBadge tone="brand">JPG · PNG · WebP</FundzaBadge>
        </div>
        <div className="fd-media-grid">
          <article className="fd-media-slot">
            <div className="fd-media-preview fd-media-preview-avatar">{avatarUrl ? <img src={avatarUrl} alt="Profile preview" /> : <span className="fd-media-placeholder">A</span>}</div>
            <div className="fd-media-copy"><strong>Profile image</strong><span>Square crop · 800 × 800</span></div>
            <FundzaButton variant="secondary" onClick={() => openPicker('avatar')}>{avatarUrl ? 'Change photo' : 'Add photo'}</FundzaButton>
          </article>
          <article className="fd-media-slot fd-media-slot-wide">
            <div className="fd-media-preview fd-media-preview-background">{backgroundUrl ? <img src={backgroundUrl} alt="Background preview" /> : <span className="fd-media-placeholder">Add a study vibe</span>}</div>
            <div className="fd-media-copy"><strong>Profile background</strong><span>Wide crop · 1600 × 600</span></div>
            <FundzaButton variant="secondary" onClick={() => openPicker('background')}>{backgroundUrl ? 'Change background' : 'Add background'}</FundzaButton>
          </article>
        </div>
        {error ? <p className="fd-media-error" role="alert">{error}</p> : null}
      </FundzaCard>

      {crop ? (
        <div className="fd-crop-backdrop" role="presentation">
          <section className="fd-crop-modal" role="dialog" aria-modal="true" aria-labelledby="crop-title">
            <div className="fd-crop-header"><div><p className="fd-section-label">IMAGE EDITOR</p><h2 id="crop-title">{title}</h2></div><button type="button" className="fd-crop-close" onClick={() => setCrop(null)} aria-label="Close image editor">×</button></div>
            <div className={`fd-crop-stage fd-crop-stage-${crop.kind}`} onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)}>
              <img src={displayed} alt="Crop preview" style={{ transform: (() => { const scale = Math.max(1000 / crop.image.naturalWidth, (1000 / ASPECT[crop.kind]) / crop.image.naturalHeight) * crop.zoom; const renderedWidth = crop.image.naturalWidth * scale; const renderedHeight = crop.image.naturalHeight * scale; const x = ((1000 - renderedWidth) / 2 + crop.x) / 1000 * 100; const y = (((1000 / ASPECT[crop.kind]) - renderedHeight) / 2 + crop.y) / (1000 / ASPECT[crop.kind]) * 100; const sx = renderedWidth / 1000 * 100; const sy = renderedHeight / (1000 / ASPECT[crop.kind]) * 100; return `translate(calc(${x}% + 0px), calc(${y}% + 0px)) scale(${sx / 100}, ${sy / 100})`; })(), transformOrigin: 'top left' }} />
              <div className="fd-crop-window" aria-hidden="true" />
              <div className="fd-crop-grip">Drag image to reposition</div>
            </div>
            <div className="fd-crop-controls">
              <label>Zoom <input type="range" min="1" max="3" step="0.01" value={crop.zoom} onChange={(event) => setCrop({ ...crop, zoom: Number(event.target.value), x: 0, y: 0 })} /></label>
              <FundzaButton variant="ghost" onClick={() => setCrop({ ...crop, zoom: 1, x: 0, y: 0 })}>Reset</FundzaButton>
            </div>
            <div className="fd-crop-preview-row"><div><p className="fd-section-label">FINAL PREVIEW</p><div className={`fd-crop-result fd-crop-result-${crop.kind}`}>{preview ? <img src={preview} alt="Final cropped preview" /> : null}</div></div><p className="fd-crop-note">Your original file stays on your device until you press Save. Fundza stores the cropped WebP in your private student media area.</p></div>
            <div className="fd-crop-actions"><FundzaButton variant="ghost" onClick={() => setCrop(null)} disabled={saving}>Cancel</FundzaButton><FundzaButton onClick={saveCrop} disabled={saving}>{saving ? 'Saving…' : 'Use this crop'}</FundzaButton></div>
          </section>
        </div>
      ) : null}
    </>
  );
}
