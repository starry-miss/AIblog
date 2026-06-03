import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import hljs from 'highlight.js';
import SEO from '../components/SEO';
import { useFetch } from '../hooks/useFetch';
import api from '../utils/api';
import '../styles/blog-detail.css';
import '../styles/code-block.css';

function renderMarkdown(content) {
  if (!content) return '';
  const renderer = new marked.Renderer();
  renderer.code = function({ text, lang }) {
    const language = lang || '';
    let highlighted;
    try {
      if (language && hljs.getLanguage(language)) {
        highlighted = hljs.highlight(text, { language }).value;
      } else {
        highlighted = hljs.highlightAuto(text).value;
      }
    } catch (e) {
      highlighted = escapeHtml(text);
    }
    return `<div class="code-block-wrapper"><div class="code-block-header"><span class="code-lang">${language || 'code'}</span><button class="copy-btn" onclick="var t=this.parentElement.parentElement.querySelector('code');var r=t?t.textContent:'';navigator.clipboard.writeText(r).then(function(){this.textContent='✓ 已复制';setTimeout(function(){this.textContent='📋 复制'}.bind(this),2000)}.bind(this))">📋 复制</button></div><pre class="code-block-pre"><code class="hljs language-${language}">${highlighted}</code></pre></div>`;
  };
  return marked(content, { renderer, breaks: true });
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function isHtmlContent(content) {
  return /<\s*(article|section|div|header|h1|h2|p|pre|table)\b/i.test(content || '');
}

function renderContent(content) {
  return isHtmlContent(content) ? content : renderMarkdown(content);
}

export default function BlogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: post, loading, error } = useFetch(() => api.getPost(id), [id]);

  const formatDate = (d) => new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = post?.title || '';

  useEffect(() => {
    if (post?.content && isHtmlContent(post.content)) {
      document.querySelectorAll('.article-content pre code').forEach(block => {
        const language = Array.from(block.classList).find(cls => cls.startsWith('language-'))?.replace('language-', '');
        if (language && hljs.getLanguage(language)) {
          block.innerHTML = hljs.highlight(block.textContent, { language }).value;
          block.classList.add('hljs');
        } else {
          hljs.highlightElement(block);
        }
      });
    }
  }, [post]);

  const handleDelete = async () => {
    if (window.confirm('确定要删除这篇文章吗？')) {
      await api.deletePost(post.id);
      navigate('/blog');
    }
  };

  if (loading) return (
    <div className="blog-detail-page container">
      <div className="skeleton" style={{ height: 60, marginBottom: 24 }}></div>
      <div className="skeleton" style={{ height: 400 }}></div>
    </div>
  );

  if (error || !post) return (
    <div className="blog-detail-page container">
      <div className="empty-state card">
        <span className="empty-icon">⚠️</span>
        <p>{error || '文章不存在'}</p>
        <Link to="/blog" className="btn btn-secondary">返回博客列表</Link>
      </div>
    </div>
  );

  return (
    <div className="blog-detail-page container fade-in-up">
      <SEO
        title={post.title}
        description={post.summary || post.title}
        image={post.cover_image}
        type="article"
        url={shareUrl}
      />

      <article className="blog-article card">
        <div className="article-header">
          <Link to="/blog" className="back-link">← 返回博客</Link>
          <div className="article-meta">
            <span className="article-date">{formatDate(post.created_at)}</span>
            <span className="article-views">👁 {post.view_count} 阅读</span>
            {post.status === 'draft' && <span className="badge draft-badge">草稿</span>}
          </div>
          <h1 className="article-title">{post.title}</h1>
          {post.summary && <p className="article-summary">{post.summary}</p>}

          <div className="article-categories">
            {post.categories?.map(cat => (
              <Link key={cat.id} to={`/blog?category=${cat.id}`} className="badge" style={{ background: cat.color + '20', color: cat.color, borderColor: cat.color + '40' }}>
                {cat.name}
              </Link>
            ))}
          </div>

          {post.tags?.length > 0 && (
            <div className="article-tags">
              {post.tags.map(tag => (
                <span key={tag.id} className="badge">{tag.name}</span>
              ))}
            </div>
          )}
        </div>

        {post.cover_image && (
          <div className="article-cover">
            <img src={post.cover_image} alt={post.title} />
          </div>
        )}

        <div
          className="article-content"
          dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
        />

        <div className="article-actions">
          <div className="share-buttons">
            <span className="share-label">分享：</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank')}
            >
              🐦 Twitter
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigator.clipboard.writeText(shareUrl).then(() => alert('链接已复制！'))}
            >
              📋 复制链接
            </button>
          </div>
          <div className="admin-actions">
            <Link to={`/blog/${post.id}/edit`} className="btn btn-secondary btn-sm">✏️ 编辑</Link>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>🗑️ 删除</button>
          </div>
        </div>
      </article>
    </div>
  );
}
