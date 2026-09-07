'use client';

import { useState } from 'react';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIN_DIMENSION = 320;

type PhotoUploaderProps = {
  slot: number;
  value: string | null;
  onChange: (file: File | null, previewUrl: string | null) => void;
};

export default function PhotoUploader({ slot, value, onChange }: PhotoUploaderProps) {
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith('image/')) return setError('Choose an image file.');
    if (file.size > MAX_FILE_SIZE) return setError('Image must be 10 MB or smaller.');

    const previewUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = previewUrl;
      await image.decode();
      if (image.width < MIN_DIMENSION || image.height < MIN_DIMENSION) {
        URL.revokeObjectURL(previewUrl);
        setError(`Image must be at least ${MIN_DIMENSION} × ${MIN_DIMENSION}px.`);
        return;
      }
      onChange(file, previewUrl);
    } catch {
      URL.revokeObjectURL(previewUrl);
      setError('The image could not be read. Try another file.');
    }
  };

  return (
    <div className="fd-photo-uploader">
      <label className="fd-upload-control">
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleFile(event.target.files?.[0])} />
        <span>{value ? `Replace photo ${slot}` : `Upload photo ${slot}`}</span>
      </label>
      {error && <p role="alert" className="fd-upload-error">{error}</p>}
    </div>
  );
}
