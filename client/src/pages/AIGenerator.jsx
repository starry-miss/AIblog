import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import SEO from '../components/SEO';
import api from '../utils/api';
import '../styles/ai-generator.css';

export default function AIGenerator() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [codeContent, setCodeContent] = useState('');
  const [language, setLanguage] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      const reader = new FileReader();
      reader.onload = (ev) => setCodeContent(ev.target.result);
      reader.readAsText(f);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await api.generateFromText({
        code_content: codeContent,
        language: language || 'code',
        custom_prompt: customPrompt || undefined
      });
      setResult(res);
      setStep(3);
    } catch (err) {
      setError('AI 生成失败: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleExportMarkdown = () => {
    const blob = new Blob([result.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blog-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveAsPost = async () => {
    const lines = result.markdown.split('\n');
    const title = lines.find(l => l.startsWith('# '))?.replace('# ', '') || 'AI Generated Post';
    const content = result.markdown;
    const summary = content.split('\n').slice(1, 4).join(' ').substring(0, 200);
    try {
      const post = await api.createPost({ title, content, summary, status: 'draft' });
      navigate(`/blog/${post.id}/edit`);
    } catch (err) {
      alert('保存失败: ' + err.message);
    }
  };

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setCodeContent('');
    setLanguage('');
    setCustomPrompt('');
    setResult(null);
    setError('');
  };

  return (
    <div className="ai-generator-page container fade-in-up">
      <SEO title="AI Writing" description="Generate technical blog posts from code with AI" />

      <h1 className="page-title">✨ AI 博客生成器</h1>
      <p className="page-subtitle">上传代码文件，让 AI 帮你生成技术博客文章</p>

      <div className="generator-steps">
        <div className={`step-indicator ${step >= 1 ? 'active' : ''}`}><span>1</span>上传代码</div>
        <div className="step-line"></div>
        <div className={`step-indicator ${step >= 3 ? 'active' : ''}`}><span>2</span>查看结果</div>
      </div>

      {error && <div className="error-message card">⚠️ {error}</div>}

      {step === 1 && (
        <div className="card generator-card fade-in-up">
          <h3>📂 上传代码文件</h3>
          <p className="card-desc">代码仅在浏览器内存中处理，不会上传到服务器，完成生成后可选择是否保存为博文</p>

          <div
            className="upload-dropzone"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.go,.rs,.rb,.php,.swift,.kt,.scala,.cs,.sql,.sh,.bash,.yml,.yaml,.json,.xml,.html,.css,.scss,.vue,.svelte,.md,.txt,.m,.mm"
              onChange={handleFileSelect}
              hidden
            />
            {file ? (
              <div className="file-selected">
                <span className="file-icon">📄</span>
                <span className="file-name">{file.name}</span>
                <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            ) : (
              <div className="dropzone-placeholder">
                <span className="dropzone-icon">📁</span>
                <p>点击选择代码文件</p>
              </div>
            )}
          </div>

          {codeContent && (
            <div className="code-preview">
              <h4>代码预览</h4>
              <pre><code>{codeContent.substring(0, 2000)}{codeContent.length > 2000 ? '\n... (内容已截断)' : ''}</code></pre>
            </div>
          )}

          <div className="form-group" style={{ marginTop: 24 }}>
            <label>自定义要求（可选）</label>
            <textarea
              placeholder="例如：重点分析算法复杂度、加入性能优化建议、编写一个适合初学者的教程..."
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              rows={3}
            />
          </div>

          <div className="card-actions">
            <button
              className="btn btn-primary btn-lg"
              onClick={handleGenerate}
              disabled={!codeContent || generating}
            >
              {generating ? <><span className="spinner" style={{ width: 20, height: 20 }}></span> 生成中...</> : '✨ 开始生成'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className="result-section fade-in-up">
          <div className="card result-card">
            <div className="result-header">
              <h3>📝 生成结果</h3>
              <div className="result-actions">
                <button className="btn btn-secondary btn-sm" onClick={handleExportMarkdown}>📥 导出 Markdown</button>
                <button className="btn btn-primary btn-sm" onClick={handleSaveAsPost}>💾 保存为文章</button>
                <button className="btn btn-ghost btn-sm" onClick={handleReset}>🔄 重新生成</button>
              </div>
            </div>

            <div className="result-tabs">
              <button className="tab active">📖 预览</button>
              <button className="tab" onClick={() => {
                const mdWin = window.open('', '_blank');
                mdWin.document.write(`<pre style="padding:20px;font-family:monospace;font-size:14px;line-height:1.6;white-space:pre-wrap;word-wrap:break-word">${escapeHtml(result.markdown)}</pre>`);
              }}>📝 查看源码</button>
            </div>

            <div
              className="result-content article-content"
              dangerouslySetInnerHTML={{ __html: result.html }}
            />

            <div className="export-bar">
              <p>💡 满意这个结果吗？你可以：</p>
              <div className="export-actions">
                <button className="btn btn-secondary" onClick={handleExportMarkdown}>📥 下载 Markdown 文件</button>
                <button className="btn btn-primary" onClick={handleSaveAsPost}>💾 保存到博客</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {generating && (
        <div className="generating-overlay fade-in-up">
          <div className="card" style={{ padding: 60, textAlign: 'center' }}>
            <div className="spinner" style={{ width: 48, height: 48, margin: '0 auto 20px' }}></div>
            <h3>🤖 AI 正在分析代码...</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>正在生成高质量技术博客文章，请稍候</p>
          </div>
        </div>
      )}
    </div>
  );
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
