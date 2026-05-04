import '../styles/footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">🌸 xkstarry</span>
          <p className="footer-desc">AI-Powered Personal Tech Blog</p>
        </div>
        <div className="footer-links">
          <a href="/blog" className="footer-link">博客</a>
          <a href="/ai-generator" className="footer-link">AI 写作</a>
          <a href="/categories" className="footer-link">分类</a>
          <a href="/api/sitemap/sitemap.xml" target="_blank" className="footer-link">Sitemap</a>
        </div>
        <div className="footer-copy">
          &copy; {new Date().getFullYear()} xkstarry. Powered by AI & React.
        </div>
      </div>
    </footer>
  );
}
