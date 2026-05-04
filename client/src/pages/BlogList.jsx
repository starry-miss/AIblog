import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SEO from '../components/SEO';
import api from '../utils/api';
import '../styles/blog-list.css';

function DraggablePost({ post, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: post.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    boxShadow: isDragging ? '0 8px 32px var(--shadow-pink-strong)' : undefined,
    borderColor: isDragging ? 'var(--primary)' : undefined,
    zIndex: isDragging ? 100 : undefined,
    position: 'relative',
  };
  const formatDate = (d) => new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div ref={setNodeRef} style={style} className={`post-list-item card ${isDragging ? 'dragging' : ''}`}>
      <button className="drag-handle" {...attributes} {...listeners} aria-label="拖拽排序">
        <span className="drag-dots">⋮⋮</span>
      </button>
      <Link to={`/blog/${post.slug || post.id}`} className="post-list-link">
        <div className="post-list-content">
          <div className="post-list-main">
            <h3 className="post-list-title">
              {post.title}
              {post.status === 'draft' && <span className="badge draft-badge">草稿</span>}
            </h3>
            {post.summary && <p className="post-list-summary">{post.summary}</p>}
            <div className="post-list-categories">
              {post.categories?.map(cat => (
                <span key={cat.id} className="badge" style={{ background: cat.color + '20', color: cat.color, borderColor: cat.color + '40' }}>
                  {cat.name}
                </span>
              ))}
            </div>
          </div>
          <div className="post-list-meta">
            <span className="post-meta-date">{formatDate(post.created_at)}</span>
            <span className="post-meta-views">👁 {post.view_count || 0}</span>
          </div>
        </div>
      </Link>
      <div className="post-list-actions">
        <Link to={`/blog/${post.id}/edit`} className="btn btn-ghost btn-sm" title="编辑">✏️</Link>
        <button className="btn btn-ghost btn-sm" title="删除"
          onClick={(e) => { e.preventDefault(); onDelete(post); }}
          style={{ color: 'var(--danger)' }}>🗑️</button>
      </div>
    </div>
  );
}

function DragOverlayPost({ post }) {
  if (!post) return null;
  return (
    <div className="post-list-item card drag-overlay-card">
      <span className="drag-handle"><span className="drag-dots">⋮⋮</span></span>
      <div className="post-list-content">
        <div className="post-list-main">
          <h3 className="post-list-title">{post.title}</h3>
          {post.summary && <p className="post-list-summary">{post.summary}</p>}
        </div>
        <div className="post-list-meta">
          <span className="post-meta-views">👁 {post.view_count || 0}</span>
        </div>
      </div>
    </div>
  );
}

export default function BlogList() {
  const [searchParams] = useSearchParams();
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [allPosts, setAllPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDragId, setActiveDragId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const allPostsRef = useRef([]);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.getPosts({ sort: 'custom', limit: '50', status: 'published' }),
      api.getCategories()
    ]).then(([postsData, catData]) => {
      const posts = postsData.posts || [];
      allPostsRef.current = posts;
      setAllPosts(posts);
      setCategories(catData || []);
    }).catch(err => {
      console.error('加载失败:', err);
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  const filteredPosts = useMemo(() => {
    let posts = allPosts;
    if (categoryFilter) {
      posts = posts.filter(p => p.categories?.some(c => c.id === parseInt(categoryFilter)));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      posts = posts.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.summary || '').toLowerCase().includes(q)
      );
    }
    return posts;
  }, [allPosts, categoryFilter, searchQuery]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const postIds = useMemo(() => filteredPosts.map(p => p.id), [filteredPosts]);
  const activePost = filteredPosts.find(p => p.id === activeDragId);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = filteredPosts.findIndex(i => i.id === active.id);
    const newIndex = filteredPosts.findIndex(i => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const current = allPostsRef.current;
    const reorderedAll = [...current];
    const [moved] = reorderedAll.splice(oldIndex, 1);
    reorderedAll.splice(newIndex, 0, moved);

    setAllPosts(reorderedAll);
    allPostsRef.current = reorderedAll;

    setSaving(true);
    setSaveMessage('');

    const orders = reorderedAll.map((p, i) => ({ id: p.id, sort_order: i }));
    api.reorderPosts(orders)
      .then(() => {
        setSaving(false);
        setSaveMessage('✅ 排序已保存');
        setTimeout(() => setSaveMessage(''), 2500);
      })
      .catch(() => {
        setSaveMessage('❌ 保存失败，请重试');
        setTimeout(() => setSaveMessage(''), 3000);
        loadData();
        setSaving(false);
      });
  };

  const handleDelete = async (post) => {
    if (!window.confirm('确定要删除这篇文章吗？')) return;
    try {
      await api.deletePost(post.id);
      loadData();
    } catch (err) {
      alert('删除失败: ' + err.message);
    }
  };

  return (
    <div className="blog-list-page container fade-in-up">
      <SEO title="Blog" description="Explore all technical blog posts" />

      <div className="blog-list-header">
        <div className="blog-list-title-row">
          <h1>📝 博客文章</h1>
          <div className="title-row-actions">
            {saving && <span className="saving-badge badge">💾 保存中...</span>}
            {saveMessage && (
              <span className={`saving-badge badge ${saveMessage.includes('✅') ? 'save-ok' : 'save-err'}`}>
                {saveMessage}
              </span>
            )}
            <Link to="/blog/new" className="btn btn-primary">写文章</Link>
          </div>
        </div>
        <div className="blog-filters">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="搜索文章..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <div className="filter-controls">
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="">全部分类</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name} ({cat.post_count})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="skeleton-list">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="card skeleton" style={{ height: 72 }}></div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="empty-state card">
          <span className="empty-icon">📭</span>
          <p>{searchQuery ? '没有找到匹配的文章' : '还没有发布文章'}</p>
          <Link to="/ai-generator" className="btn btn-primary">用 AI 创建 →</Link>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(e) => setActiveDragId(e.active.id)}
          onDragEnd={handleDragEnd}
        >
          <div className="sort-hint">
            <span>💡 拖拽左侧 <strong>⋮⋮</strong> 图标调整顺序，松手自动保存</span>
          </div>
          <SortableContext items={postIds} strategy={verticalListSortingStrategy}>
            <div className="post-list">
              {filteredPosts.map(post => (
                <DraggablePost key={post.id} post={post} onDelete={handleDelete} />
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activePost && <DragOverlayPost post={activePost} />}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
