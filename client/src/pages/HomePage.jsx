import { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import Avatar from '../components/Avatar';
import BlogCard from '../components/BlogCard';
import { useUser } from '../hooks/useUser';
import { useFetch } from '../hooks/useFetch';
import api from '../utils/api';
import '../styles/home.css';

export default function HomePage() {
  const { user, loading: userLoading } = useUser();
  const { data, loading } = useFetch(() => api.getPosts({ status: 'published', limit: 6, sort: 'custom' }));
  const [activeFilter, setActiveFilter] = useState('latest');

  const posts = data?.posts || [];

  const containerStyle = {
    '--bg-color': user?.bg_color || '#FFF5F7',
    '--theme-color': user?.theme_color || '#FF6B8A',
  };

  return (
    <div className="home-page" style={containerStyle}>
      <SEO title="Home" description={`${user?.nickname || 'xkstarry'}'s personal blog - AI-powered tech insights`} />

      <section className="hero-section">
        <div className="container hero-inner">
          <div className="hero-content fade-in-up">
            <div className="hero-avatar-wrapper">
              <div className="hero-avatar">
                <Avatar
                  src={user?.avatar}
                  alt={user?.nickname}
                  size={130}
                  className="hero-avatar-img"
                />
              </div>
            </div>
            <h1 className="hero-name">{user?.nickname || 'xkstarry'}</h1>
            <p className="hero-bio">{user?.bio || 'AI-Powered Personal Tech Blog'}</p>
            <div className="hero-socials">
              {user?.github && (
                <a href={user.github} target="_blank" rel="noopener noreferrer" className="social-link">
                  <span className="social-icon">🐙</span> GitHub
                </a>
              )}
              {user?.twitter && (
                <a href={user.twitter} target="_blank" rel="noopener noreferrer" className="social-link">
                  <span className="social-icon">🐦</span> Twitter
                </a>
              )}
              {user?.website && (
                <a href={user.website} target="_blank" rel="noopener noreferrer" className="social-link">
                  <span className="social-icon">🌐</span> Website
                </a>
              )}
            </div>
          </div>
          <div className="hero-decoration fade-in-up">
            <div className="deco-circle c1"></div>
            <div className="deco-circle c2"></div>
            <div className="deco-circle c3"></div>
          </div>
        </div>
      </section>

      <section className="posts-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">📝 最新文章</h2>
            <Link to="/blog" className="btn btn-secondary btn-sm">查看全部 →</Link>
          </div>

          {loading ? (
            <div className="posts-grid">
              {[1, 2, 3].map(i => (
                <div key={i} className="card" style={{ height: 300 }}>
                  <div className="skeleton" style={{ height: '100%' }}></div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-state card">
              <span className="empty-icon">📭</span>
              <p>还没有发布文章</p>
              <Link to="/ai-generator" className="btn btn-primary">用 AI 写一篇 →</Link>
            </div>
          ) : (
            <div className="posts-grid">
              {posts.map((post, i) => (
                <BlogCard key={post.id} post={post} style={{ '--i': i }} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
