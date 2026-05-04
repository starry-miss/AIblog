import { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useFetch } from '../hooks/useFetch';
import api from '../utils/api';
import '../styles/category-manager.css';

export default function CategoryManager() {
  const { data: categories, loading, refetch } = useFetch(() => api.getCategories());
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', color: '#FF6B8A', sort_order: 0 });
  const [showForm, setShowForm] = useState(false);

  const resetForm = () => {
    setForm({ name: '', description: '', color: '#FF6B8A', sort_order: 0 });
    setEditing(null);
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return alert('请输入分类名称');
    await api.createCategory(form);
    resetForm();
    refetch();
  };

  const handleUpdate = async () => {
    if (!form.name.trim()) return alert('请输入分类名称');
    await api.updateCategory(editing.id, form);
    resetForm();
    refetch();
  };

  const handleEdit = (cat) => {
    setForm({ name: cat.name, description: cat.description || '', color: cat.color || '#FF6B8A', sort_order: cat.sort_order || 0 });
    setEditing(cat);
    setShowForm(true);
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`确定要删除分类"${cat.name}"吗？`)) return;
    await api.deleteCategory(cat.id);
    refetch();
  };

  const colorPresets = ['#FF6B8A', '#FF8FA3', '#FFB3C6', '#FF9A8B', '#FEC89A', '#A8DEE0', '#7BC89C', '#A29BFE', '#FD79A8', '#74B9FF'];

  return (
    <div className="category-manager-page container fade-in-up">
      <SEO title="Category Management" />

      <div className="cm-header">
        <h1>📂 分类管理</h1>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ 新建分类</button>
        )}
      </div>

      {showForm && (
        <div className="card category-form">
          <h3>{editing ? '✏️ 编辑分类' : '✨ 新建分类'}</h3>
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label>名称 *</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="分类名称" />
            </div>
            <div className="form-group">
              <label>排序</label>
              <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="form-group">
            <label>描述</label>
            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="分类描述（可选）" />
          </div>
          <div className="form-group">
            <label>颜色</label>
            <div className="color-presets">
              {colorPresets.map(c => (
                <button key={c} className={`color-dot ${form.color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setForm({ ...form, color: c })} />
              ))}
              <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="color-picker" />
            </div>
          </div>
          <div className="card-actions">
            <button className="btn btn-ghost" onClick={resetForm}>取消</button>
            <button className="btn btn-primary" onClick={editing ? handleUpdate : handleCreate}>
              {editing ? '保存修改' : '创建分类'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="cm-skeleton">
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80 }}></div>)}
        </div>
      ) : !categories || categories.length === 0 ? (
        <div className="empty-state card">
          <span className="empty-icon">📂</span>
          <p>还没有创建分类</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>创建第一个分类 →</button>
        </div>
      ) : (
        <div className="category-list">
          {categories.map(cat => (
            <div key={cat.id} className="category-item card">
              <div className="category-info">
                <div className="category-color-bar" style={{ background: cat.color }}></div>
                <div className="category-details">
                  <div className="category-name-row">
                    <span className="category-name">{cat.name}</span>
                    <span className="category-count">{cat.post_count || 0} 篇文章</span>
                  </div>
                  {cat.description && <span className="category-desc">{cat.description}</span>}
                </div>
              </div>
              <div className="category-actions">
                <Link to={`/blog?category=${cat.id}`} className="btn btn-ghost btn-sm">🔍 查看</Link>
                <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(cat)}>✏️</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(cat)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
