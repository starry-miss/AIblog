import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useFetch } from '../hooks/useFetch';
import api from '../utils/api';
import '../styles/file-manager.css';

export default function FileManager() {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const { data: files, loading, refetch } = useFetch(() => api.getFiles());

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadFile(file);
      refetch();
      fileInputRef.current.value = '';
    } catch (err) {
      alert('上传失败: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm('确定要删除这个文件吗？')) return;
    await api.deleteFile(file.id);
    refetch();
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="file-manager-page container fade-in-up">
      <SEO title="File Manager" />

      <div className="fm-header">
        <h1>📁 文件管理</h1>
        <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? '上传中...' : '📤 上传文件'}
        </button>
        <input ref={fileInputRef} type="file" hidden onChange={handleUpload}
          accept=".js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.go,.rs,.rb,.php,.swift,.kt,.scala,.cs,.sql,.sh,.yml,.yaml,.json,.xml,.html,.css,.scss,.vue,.svelte,.md,.txt,.m,.mm,.jpg,.jpeg,.png,.gif,.webp,.svg" />
      </div>

      {loading ? (
        <div className="fm-skeleton">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 64 }}></div>)}
        </div>
      ) : !files || files.length === 0 ? (
        <div className="empty-state card">
          <span className="empty-icon">📂</span>
          <p>还没有上传文件</p>
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>上传第一个文件 →</button>
        </div>
      ) : (
        <div className="file-list">
          {files.map(file => (
            <div key={file.id} className="file-item card">
              <div className="file-info">
                <span className="file-type-icon">{file.file_type === 'code' ? '📄' : '🖼️'}</span>
                <div className="file-details">
                  <span className="file-name-text">{file.original_name}</span>
                  <span className="file-meta">
                    {file.file_type} · {formatSize(file.file_size)} · {new Date(file.uploaded_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
              <div className="file-actions">
                <Link to={`/files/${file.id}/preview`} className="btn btn-ghost btn-sm">👁 预览</Link>
                <a href={api.getFileDownloadUrl(file.id)} className="btn btn-secondary btn-sm">📥 下载</a>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(file)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
