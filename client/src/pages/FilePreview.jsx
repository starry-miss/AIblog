import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import SEO from '../components/SEO';
import { useFetch } from '../hooks/useFetch';
import api from '../utils/api';
import '../styles/file-preview.css';

function detectLanguage(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', java: 'java', c: 'c', cpp: 'cpp', h: 'c',
    go: 'go', rs: 'rust', rb: 'ruby', php: 'php', swift: 'swift',
    kt: 'kotlin', scala: 'scala', cs: 'csharp', sql: 'sql',
    html: 'html', css: 'css', scss: 'scss', less: 'less',
    vue: 'html', svelte: 'html', json: 'json', xml: 'xml',
    yml: 'yaml', yaml: 'yaml', sh: 'bash', bash: 'bash',
    md: 'markdown', txt: 'plaintext', r: 'r', m: 'objectivec', mm: 'objectivec'
  };
  return map[ext] || 'plaintext';
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];

function isImage(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

export default function FilePreview() {
  const { id } = useParams();
  const [fileContent, setFileContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const { data: files } = useFetch(() => api.getFiles());
  const file = files?.find(f => f.id === parseInt(id));

  useEffect(() => {
    const findFileAndFetch = async () => {
      try {
        const fileList = await api.getFiles();
        const found = fileList.find(f => f.id === parseInt(id));
        if (!found) {
          setError('文件不存在');
          setLoading(false);
          return;
        }
        if (isImage(found.original_name)) {
          setFileContent({ type: 'image', url: api.getFileUrl(found.id), name: found.original_name, meta: found });
        } else {
          const url = api.getFileUrl(found.id);
          const res = await fetch(url);
          if (!res.ok) throw new Error('Failed to load file');
          const text = await res.text();
          const lang = detectLanguage(found.original_name);
          setFileContent({ type: 'code', content: text, language: lang, name: found.original_name, meta: found });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    findFileAndFetch();
  }, [id]);

  const formatSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleCopy = async () => {
    if (!fileContent?.content) return;
    try {
      await navigator.clipboard.writeText(fileContent.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = fileContent.content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (file?.id) {
      window.open(api.getFileDownloadUrl(file.id), '_blank');
    }
  };

  if (loading) {
    return (
      <div className="file-preview-page container fade-in-up">
        <div className="skeleton" style={{ height: 60, marginBottom: 24 }}></div>
        <div className="skeleton" style={{ height: 500 }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="file-preview-page container fade-in-up">
        <div className="empty-state card">
          <span className="empty-icon">⚠️</span>
          <p>{error}</p>
          <Link to="/files" className="btn btn-secondary">返回文件管理</Link>
        </div>
      </div>
    );
  }

  const meta = file || fileContent?.meta;

  return (
    <div className="file-preview-page container fade-in-up">
      <SEO title={`Preview: ${meta?.original_name || 'File'}`} />

      <div className="preview-header-bar">
        <Link to="/files" className="back-link">← 返回文件管理</Link>
        <div className="preview-title-section">
          <span className="preview-file-icon">{isImage(meta?.original_name) ? '🖼️' : '📄'}</span>
          <div className="preview-title-info">
            <h1 className="preview-file-name">{meta?.original_name}</h1>
            <span className="preview-file-meta">
              {meta?.file_type} · {formatSize(meta?.file_size)} · {new Date(meta?.uploaded_at).toLocaleDateString('zh-CN')}
            </span>
          </div>
        </div>
        <div className="preview-header-actions">
          {fileContent?.type === 'code' && (
            <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
              {copied ? '✓ 已复制' : '📋 复制内容'}
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={handleDownload}>📥 下载</button>
        </div>
      </div>

      <div className="preview-content-card card">
        {fileContent?.type === 'image' ? (
          <div className="image-preview-container">
            <img src={fileContent.url} alt={fileContent.name} className="image-preview-img" />
          </div>
        ) : fileContent?.type === 'code' ? (
          <div className="code-preview-container">
            <div className="code-preview-header">
              <span className="code-lang-badge">{fileContent.language}</span>
              <span className="code-line-hint">{fileContent.content.split('\n').length} 行</span>
            </div>
            <pre className="code-preview-body">
              <code
                className={`language-${fileContent.language}`}
                dangerouslySetInnerHTML={{
                  __html: hljs.highlight(fileContent.content, { language: fileContent.language }).value
                }}
              />
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
