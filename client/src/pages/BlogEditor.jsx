import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import SEO from '../components/SEO';
import CodeBlock from '../components/CodeBlock';
import { useFetch } from '../hooks/useFetch';
import api from '../utils/api';
import '../styles/blog-editor.css';

export default function BlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [form, setForm] = useState({
    title: '', content: '', summary: '', cover_image: '', status: 'draft',
    category_ids: [], tag_names: ''
  });
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: catData } = useFetch(() => api.getCategories());
  const categories = catData || [];

  useEffect(() => {
    if (isEditing) {
      api.getPost(id).then(post => {
        setForm({
          title: post.title || '',
          content: post.content || '',
          summary: post.summary || '',
          cover_image: post.cover_image || '',
          status: post.status || 'draft',
          category_ids: post.categories?.map(c => c.id) || [],
          tag_names: post.tags?.map(t => t.name).join(', ') || ''
        });
      });
    }
  }, [id, isEditing]);

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleCategoryToggle = (catId) => {
    setForm(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(catId)
        ? prev.category_ids.filter(c => c !== catId)
        : [...prev.category_ids, catId]
    }));
  };

  const handleSubmit = async (status) => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        status,
        tag_names: form.tag_names ? form.tag_names.split(',').map(t => t.trim()).filter(Boolean) : []
      };
      if (isEditing) {
        await api.updatePost(id, payload);
      } else {
        const post = await api.createPost(payload);
        navigate(`/blog/${post.id}`);
        return;
      }
      navigate(`/blog/${id}`);
    } catch (err) {
      alert('保存失败: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="blog-editor-page container fade-in-up">
      <SEO title={isEditing ? 'Edit Post' : 'New Post'} />

      <div className="editor-header">
        <h1>{isEditing ? '✏️ 编辑文章' : '📝 写文章'}</h1>
        <div className="editor-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setPreview(!preview)}>
            {preview ? '📝 编辑' : '👁 预览'}
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleSubmit('draft')}
            disabled={saving}
          >
            💾 保存草稿
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => handleSubmit('published')}
            disabled={saving}
          >
            🚀 发布
          </button>
        </div>
      </div>

      {preview ? (
        <div className="card preview-panel">
          <div className="preview-header">
            <h2>{form.title || '（无标题）'}</h2>
            {form.summary && <p className="preview-summary">{form.summary}</p>}
          </div>
          <div
            className="preview-content article-content"
            dangerouslySetInnerHTML={{ __html: marked(form.content || '') }}
          />
        </div>
      ) : (
        <div className="editor-form">
          <div className="form-group">
            <label>标题 *</label>
            <input
              type="text"
              placeholder="输入文章标题..."
              value={form.title}
              onChange={handleChange('title')}
            />
          </div>

          <div className="form-group">
            <label>摘要</label>
            <textarea
              placeholder="简短描述文章内容..."
              value={form.summary}
              onChange={handleChange('summary')}
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>封面图 URL</label>
              <input
                type="text"
                placeholder="https://..."
                value={form.cover_image}
                onChange={handleChange('cover_image')}
              />
            </div>
            <div className="form-group">
              <label>标签（逗号分隔）</label>
              <input
                type="text"
                placeholder="React, Node.js, AI"
                value={form.tag_names}
                onChange={handleChange('tag_names')}
              />
            </div>
          </div>

          <div className="form-group">
            <label>分类</label>
            <div className="category-options">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className={`category-chip ${form.category_ids.includes(cat.id) ? 'active' : ''}`}
                  style={{ '--cat-color': cat.color }}
                  onClick={() => handleCategoryToggle(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>内容（Markdown）</label>
            <textarea
              className="content-editor"
              placeholder="使用 Markdown 撰写文章内容..."
              value={form.content}
              onChange={handleChange('content')}
              rows={20}
            />
          </div>
        </div>
      )}
    </div>
  );
}
