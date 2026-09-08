'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { FundzaBadge, FundzaButton, FundzaCard } from '@/components/Phase14Primitives';

export type ProfileMediaKind = 'avatar' | 'background';
type Props = { studentId: string; initialAvatarUrl?: string | null; initialBackgroundUrl?: string | null };
type CropState = { kind: ProfileMediaKind; objectUrl: string; image: HTMLImageElement; zoom: number; x: number; y: number };

const BUCKET = 'student-identity';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const CROP_WIDTH = 1000;
const ASPECT: Record<ProfileMediaKind, number> = { avatar: 1, background: 16 / 6 };
const OUTPUT: Record<ProfileMediaKind, { width: number; height: number }> = { avatar: { width: 800, height: 800 }, background: { width: 1600, height: 600 } };

function revoke(url?: string) { if (url) URL.revokeObjectURL(url); }
async function readImage(file: File) { const objectUrl = URL.createObjectURL(file); const image = new Image(); image.decoding = 'async'; image.src = objectUrl; await image.decode(); return { objectUrl, image }; }
function geometry(kind: ProfileMediaKind, image: HTMLImageElement, zoom: number) { const cropHeight = CROP_WIDTH / ASPECT[kind]; const scale = Math.max(CROP_WIDTH / image.naturalWidth, cropHeight / image.naturalHeight) * zoom; const width = image.naturalWidth * scale; const height = image.naturalHeight * scale; return { cropHeight, width, height, maxX: Math.max(0, (width - CROP_WIDTH) / 2), maxY: Math.max(0, (height - cropHeight) / 2), scale }; }
async function cropToBlob(state: CropState) {
  const { cropHeight, width, height, scale } = geometry(state.kind, state.image, state.zoom);
  const baseX = (CROP_WIDTH - width) / 2 + state.x; const baseY = (cropHeight - height) / 2 + state.y;
  const sourceWidth = Math.min(state.image.naturalWidth, CROP_WIDTH / scale); const sourceHeight = Math.min(state.image.naturalHeight, cropHeight / scale);
  const sourceX = Math.max(0, Math.min(state.image.naturalWidth - sourceWidth, -baseX / scale)); const sourceY = Math.max(0, Math.min(state.image.naturalHeight - sourceHeight, -baseY / scale));
  const output = OUTPUT[state.kind]; const canvas = document.createElement('canvas'); canvas.width = output.width; canvas.height = output.height;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Your browser could not create the image editor.');
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(state.image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, output.width, output.height);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.9)); if (!blob) throw new Error('Could not prepare the cropped image.');
  return { blob, previewUrl: URL.createObjectURL(blob) };
}

export default function ProfileMediaUploader({ studentId, initialAvatarUrl, initialBackgroundUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null); const dragOrigin = useRef({ x: 0, y: 0, cropX: 0, cropY: 0 });
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || ''); const [backgroundUrl, setBackgroundUrl] = useState(initialBackgroundUrl || '');
  const [crop, setCrop] = useState<CropState | null>(null); const [preview, setPreview] = useState(''); const [dragging, setDragging] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState('');

  useEffect(() => () => { revoke(crop?.objectUrl); }, [crop?.objectUrl]);
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.key === 'Escape' && crop && !saving) setCrop(null); }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, [crop, saving]);
  useEffect(() => { if (!crop) return; let cancelled = false; cropToBlob(crop).then(({ previewUrl }) => { if (cancelled) { revoke(previewUrl); return; } setPreview(current => { revoke(current); return previewUrl; }); }).catch(console.error); return () => { cancelled = true; }; }, [crop]);

  const title = useMemo(() => crop?.kind === 'avatar' ? 'Adjust profile photo' : 'Adjust profile background', [crop]);
  const openPicker = (kind: ProfileMediaKind) => { setError(''); if (!inputRef.current) return; inputRef.current.dataset.kind = kind; inputRef.current.value = ''; inputRef.current.click(); };
  const onFile = async (file?: File) => { if (!file) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Please choose a JPG, PNG or WebP image.'); return; } if (file.size > MAX_FILE_BYTES) { setError('Images must be 10 MB or smaller.'); return; } try { const kind = (inputRef.current?.dataset.kind || 'avatar') as ProfileMediaKind; const { objectUrl, image } = await readImage(file); setPreview(current => { revoke(current); return ''; }); setCrop({ kind, objectUrl, image, zoom: 1, x: 0, y: 0 }); } catch (err) { console.error(err); setError('That image could not be opened. Try another file.'); } };
  const updateCrop = (changes: Partial<CropState>) => setCrop(current => current ? { ...current, ...changes } : current);
  const dragStart = (event: PointerEvent<HTMLDivElement>) => { if (!crop) return; event.currentTarget.setPointerCapture(event.pointerId); dragOrigin.current = { x: event.clientX, y: event.clientY, cropX: crop.x, cropY: crop.y }; setDragging(true); };
  const dragMove = (event: PointerEvent<HTMLDivElement>) => { if (!crop || !dragging) return; const rect = event.currentTarget.getBoundingClientRect(); const { maxX, maxY, cropHeight } = geometry(crop.kind, crop.image, crop.zoom); const dx = (event.clientX - dragOrigin.current.x) * (CROP_WIDTH / rect.width); const dy = (event.clientY - dragOrigin.current.y) * (cropHeight / rect.height); updateCrop({ x: Math.max(-maxX, Math.min(maxX, dragOrigin.current.cropX + dx)), y: Math.max(-maxY, Math.min(maxY, dragOrigin.current.cropY + dy)) }); };

  const saveCrop = async () => {
    if (!crop) return; setSaving(true); setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error('Your session has expired. Please sign in again.');
      const { blob, previewUrl } = await cropToBlob(crop); revoke(previewUrl);
      const path = `${user.id}/profile/${crop.kind}.webp`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' });
      if (uploadError) throw uploadError;
      const { data: existing } = await supabase.from('student_profile_media').select('avatar_path, background_path').eq('student_id', studentId).maybeSingle();
      const payload = { student_id: studentId, avatar_path: crop.kind === 'avatar' ? path : (existing?.avatar_path || null), background_path: crop.kind === 'background' ? path : (existing?.background_path || null) };
      const { error: dbError } = await supabase.from('student_profile_media').upsert(payload, { onConflict: 'student_id' }); if (dbError) throw dbError;
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
      if (crop.kind === 'avatar') setAvatarUrl(signed?.signedUrl || ''); else setBackgroundUrl(signed?.signedUrl || '');
      setPreview(current => { revoke(current); return ''; }); revoke(crop.objectUrl); setCrop(null);
    } catch (err) { console.error(err); setError(err instanceof Error ? err.message : 'Could not save this image.'); } finally { setSaving(false); }
  };

  const previewGeometry = crop ? geometry(crop.kind, crop.image, crop.zoom) : null;
  const renderCrop = crop && previewGeometry ? { width: `${previewGeometry.width / CROP_WIDTH * 100}%`, height: `${previewGeometry.height / previewGeometry.cropHeight * 100}%`, left: '50%', top: '50%', transform: `translate(-50%, -50%) translate(${crop.x / previewGeometry.width * 100}%, ${crop.y / previewGeometry.height * 100}%)` } : undefined;

  return <>
    <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void onFile(event.target.files?.[0])} />
    <FundzaCard className="fd-media-card"><div className="fd-media-heading"><div><p className="fd-section-label">PERSONALISE YOUR SPACE</p><h2 className="fd-section-title">Profile photos & background</h2><p className="fd-media-help">Choose a profile image and a wide background. Preview, zoom and crop before saving.</p></div><FundzaBadge tone="brand">JPG · PNG · WebP</FundzaBadge></div><div className="fd-media-grid"><article className="fd-media-slot"><div className="fd-media-preview fd-media-preview-avatar">{avatarUrl ? <img src={avatarUrl} alt="Profile preview" /> : <span className="fd-media-placeholder">A</span>}</div><div className="fd-media-copy"><strong>Profile image</strong><span>Square crop · 800 × 800</span></div><FundzaButton variant="secondary" onClick={() => openPicker('avatar')}>{avatarUrl ? 'Change photo' : 'Add photo'}</FundzaButton></article><article className="fd-media-slot fd-media-slot-wide"><div className="fd-media-preview fd-media-preview-background">{backgroundUrl ? <img src={backgroundUrl} alt="Background preview" /> : <span className="fd-media-placeholder">Add a study vibe</span>}</div><div className="fd-media-copy"><strong>Profile background</strong><span>Wide crop · 1600 × 600</span></div><FundzaButton variant="secondary" onClick={() => openPicker('background')}>{backgroundUrl ? 'Change background' : 'Add background'}</FundzaButton></article></div>{error ? <p className="fd-media-error" role="alert">{error}</p> : null}</FundzaCard>
    {crop ? <div className="fd-crop-backdrop"><section className="fd-crop-modal" role="dialog" aria-modal="true" aria-labelledby="crop-title"><div className="fd-crop-header"><div><p className="fd-section-label">IMAGE EDITOR</p><h2 id="crop-title">{title}</h2></div><button type="button" className="fd-crop-close" onClick={() => setCrop(null)} aria-label="Close image editor">×</button></div><div className={`fd-crop-stage fd-crop-stage-${crop.kind} ${dragging ? 'is-dragging' : ''}`} onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)}><img src={crop.objectUrl} alt="Crop preview" style={renderCrop} /><div className="fd-crop-window" aria-hidden="true" /><div className="fd-crop-grip">Drag image to reposition</div></div><div className="fd-crop-controls"><label>Zoom <input type="range" min="1" max="3" step="0.01" value={crop.zoom} onChange={event => updateCrop({ zoom: Number(event.target.value), x: 0, y: 0 })} /></label><FundzaButton variant="ghost" onClick={() => updateCrop({ zoom: 1, x: 0, y: 0 })}>Reset</FundzaButton></div><div className="fd-crop-preview-row"><div><p className="fd-section-label">FINAL PREVIEW</p><div className={`fd-crop-result fd-crop-result-${crop.kind}`}>{preview ? <img src={preview} alt="Final cropped preview" /> : null}</div></div><p className="fd-crop-note">Your original file remains local until you save. Fundza stores the cropped WebP in the private student media area.</p></div><div className="fd-crop-actions"><FundzaButton variant="ghost" onClick={() => setCrop(null)} disabled={saving}>Cancel</FundzaButton><FundzaButton onClick={saveCrop} disabled={saving}>{saving ? 'Saving…' : 'Use this crop'}</FundzaButton></div></section></div> : null}
  </>;
}
