import React, { useRef, useState, useCallback } from 'react';

/**
 * Drag-and-drop file upload component with preview support.
 * @property {(files: File[]) => void} onUpload - Callback with selected files
 * @property {string} [accept] - Accepted file types (e.g. 'image/*,.pdf')
 * @property {boolean} [multiple=false] - Allow multiple files
 * @property {number} [maxSizeMB=10] - Maximum file size in megabytes
 * @property {string} [label='Upload files'] - Label text
 */
interface FileUploadProps {
  onUpload: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  label?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  accept,
  multiple = false,
  maxSizeMB = 10,
  label = 'Upload files',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(
    (fileList: File[]): File[] => {
      const maxBytes = maxSizeMB * 1024 * 1024;
      const valid: File[] = [];
      for (const f of fileList) {
        if (f.size > maxBytes) {
          setError(`"${f.name}" exceeds ${maxSizeMB}MB limit`);
          continue;
        }
        valid.push(f);
      }
      return valid;
    },
    [maxSizeMB]
  );

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      setError(null);
      const arr = Array.from(fileList);
      const valid = validate(arr);
      if (valid.length > 0) {
        setFiles(valid);
        onUpload(valid);
      }
    },
    [validate, onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={styles.container}>
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        style={{
          ...styles.dropzone,
          ...(isDragging ? styles.dragging : {}),
        }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ marginBottom: '8px' }}>
          <path d="M20 6V26M20 6L14 12M20 6L26 12" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 26V30C6 32.2091 7.79086 34 10 34H30C32.2091 34 34 32.2091 34 30V26" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p style={styles.dropText}>
          <strong>Click to upload</strong> or drag and drop
        </p>
        <p style={styles.hint}>
          {accept ? `Accepted: ${accept}` : 'Any file type'} &middot; Max {maxSizeMB}MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          style={{ display: 'none' }}
          aria-hidden="true"
        />
      </div>

      {error && (
        <p role="alert" style={styles.error}>{error}</p>
      )}

      {files.length > 0 && (
        <ul style={styles.fileList}>
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} style={styles.fileItem}>
              <div style={styles.fileInfo}>
                <span style={styles.fileName}>{f.name}</span>
                <span style={styles.fileSize}>{formatSize(f.size)}</span>
              </div>
              <button
                onClick={() => removeFile(i)}
                aria-label={`Remove ${f.name}`}
                style={styles.removeBtn}
              >
                &#x2715;
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { width: '100%' },
  dropzone: {
    border: '2px dashed var(--border-color, #d1d5db)', borderRadius: '12px',
    padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
    transition: 'all 0.2s', background: 'var(--upload-bg, #fafafa)',
  },
  dragging: {
    borderColor: 'var(--primary, #3b82f6)', background: 'rgba(59,130,246,0.05)',
  },
  dropText: { margin: '0 0 4px', fontSize: '14px', color: 'var(--text-primary, #374151)' },
  hint: { margin: 0, fontSize: '12px', color: 'var(--text-tertiary, #9ca3af)' },
  error: { marginTop: '8px', fontSize: '13px', color: '#dc2626' },
  fileList: { listStyle: 'none', padding: 0, marginTop: '12px' },
  fileItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 14px', borderRadius: '8px', marginBottom: '6px',
    background: 'var(--file-bg, #f9fafb)', border: '1px solid var(--border-color, #e5e7eb)',
  },
  fileInfo: { display: 'flex', flexDirection: 'column', gap: '2px' },
  fileName: { fontSize: '14px', fontWeight: 500, color: 'var(--text-primary, #111827)' },
  fileSize: { fontSize: '12px', color: 'var(--text-tertiary, #9ca3af)' },
  removeBtn: {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px',
    color: '#9ca3af', padding: '4px',
  },
};

export default FileUpload;
