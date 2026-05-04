import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useUser } from '../hooks/useUser';
import Avatar from './Avatar';
import '../styles/header.css';

export default function Header() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useUser();

  const navItems = [
    { path: '/', label: '主页', icon: '🏠' },
    { path: '/blog', label: '博客', icon: '📝' },
    { path: '/ai-generator', label: 'AI 写作', icon: '✨' },
    { path: '/categories', label: '分类', icon: '📂' },
    { path: '/settings', label: '设置', icon: '⚙️' },
  ];

  return (
    <header className="site-header">
      <div className="header-inner container">
        <Link to="/" className="header-logo" onClick={() => setMenuOpen(false)}>
          <div className="header-avatar-wrapper">
            <Avatar
              src={user?.avatar}
              alt={user?.nickname || 'xkstarry'}
              className="header-avatar-img"
              size={36}
            />
          </div>
          <span className="logo-text">{user?.nickname || 'xkstarry'}</span>
        </Link>

        <button
          className={`menu-toggle ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span></span><span></span><span></span>
        </button>

        <nav className={`header-nav ${menuOpen ? 'open' : ''}`}>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
