import { useRef, useState } from 'react';
import { FiUploadCloud, FiX, FiLoader } from 'react-icons/fi';
import api, { API_ENABLED } from '../utils/api';
import { resolveMediaUrl } from '../utils/media';

export default function MediaUpload({ label, accept, files = [], onChange, type = 'image' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const getFileUrl = (f) => (typeof f === 'string' ? f : f?.url || '');
  const getFileName = (f) => (typeof f === 'string' ? f.split('/').pop() || 'media' : f?.name || 'media');

  const handleFiles = async (fileList) => {
    const selected = Array.from(fileList || []);
    if (!selected.length) return;
    setUploadError('');
    setUploading(true);

    try {
      if (API_ENABLED) {
        const next = await Promise.all(selected.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          const { data } = await api.post(`/uploads/${type}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          return data.data;
        }));
        onChange([...(files || []), ...next]);
      } else {
        onChange([...(files || []), ...selected.map((file) => ({ name: file.name, url: URL.createObjectURL(file) }))]);
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || err.message || 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (idx) => onChange((files || []).filter((_, i) => i !== idx));

  return (
    <div>
      <label className="label">{label}</label>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={(e) => {
          e.preventDefault();
          if (!uploading) handleFiles(e.dataTransfer.files);
        }}
        onDragOver={(e) => e.preventDefault()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl2 border-2 border-dashed border-black/10 bg-surface px-6 py-10 text-center transition hover:border-primary hover:bg-primary-50 dark:border-white/10 dark:bg-slate-800 ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        {uploading ? (
          <FiLoader size={28} className="animate-spin text-primary" />
        ) : (
          <FiUploadCloud size={28} className="text-primary" />
        )}
        <p className="text-sm font-medium">{uploading ? 'Uploading...' : 'Click or drag files to upload'}</p>
        <p className="text-xs text-ink/40">Uploads empty until you add your own {type === 'video' ? 'videos' : 'photos'}</p>
        <input ref={inputRef} type="file" accept={accept} multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {uploadError && (
        <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">{uploadError}</p>
      )}

      {Array.isArray(files) && files.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {files.map((f, i) => {
            const fileUrl = getFileUrl(f);
            const fileName = getFileName(f);
            return (
              <div key={i} className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-surface dark:bg-slate-800">
                {type === 'video' ? (
                  <video src={resolveMediaUrl(fileUrl)} className="h-full w-full object-cover" muted />
                ) : (
                  <img src={resolveMediaUrl(fileUrl)} alt={fileName} className="h-full w-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                >
                  <FiX size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
