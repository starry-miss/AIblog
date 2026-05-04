import { Link } from 'react-router-dom';
import '../styles/blog-card.css';

export default function BlogCard({ post }) {
  const formatDate = (d) => {
    return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <article className="blog-card fade-in-up">
      <Link to={`/blog/${post.slug || post.id}`} className="blog-card-link">
        {post.cover_image && (
          <div className="blog-card-image">
            <img src={post.cover_image} alt={post.title} loading="lazy" />
          </div>
        )}
        <div className="blog-card-body">
          <div className="blog-card-meta">
            <span className="blog-card-date">{formatDate(post.created_at)}</span>
            {post.status === 'draft' && <span className="badge draft-badge">草稿</span>}
          </div>
          <h3 className="blog-card-title">{post.title}</h3>
          {post.summary && <p className="blog-card-summary">{post.summary}</p>}
          <div className="blog-card-footer">
            <div className="blog-card-categories">
              {post.categories?.map(cat => (
                <span key={cat.id} className="badge" style={{ background: cat.color + '20', color: cat.color, borderColor: cat.color + '40' }}>
                  {cat.name}
                </span>
              ))}
            </div>
            <span className="blog-card-views">👁 {post.view_count || 0} 阅读</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
