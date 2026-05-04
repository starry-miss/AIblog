import { useState, useEffect, useRef } from 'react';
import SEO from '../components/SEO';
import Avatar from '../components/Avatar';
import { useUser } from '../hooks/useUser';
import api from '../utils/api';
import '../styles/settings.css';

export default function Settings() {
  const { user, loading, updateUser } = useUser();
  const avatarInputRef = useRef(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user && !form) {
      setForm({
        nickname: user.nickname || '',
        bio: user.bio || '',
        github: user.github || '',
        twitter: user.twitter || '',
        website: user.website || '',
        theme_color: user.theme_color || '#FF6B8A',
        bg_color: user.bg_color || '#FFF5F7',
      });
    }
  }, [user, form]);

  if (loading || !form || !user) {
    return (
      <div className="settings-page container">
        <div className="skeleton" style={{ height: 400 }}></div>
      </div>
    );
  }

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await updateUser(form);
      setMessage('✅ 设置已保存');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ 保存失败: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const uploaded = await api.uploadFile(file);
      const avatarUrl = api.getFileUrl(uploaded.id);
      await updateUser({ avatar: avatarUrl });
    } catch (err) {
      alert('头像上传失败: ' + err.message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const themeColors = ['#FF6B8A', '#FF8FA3', '#FFB3C6', '#FF9A8B', '#FD79A8', '#E17055', '#FDCB6E', '#00B894', '#0984E3', '#6C5CE7', '#A29BFE', '#2D3436'];
  const bgColors = ['#FFF5F7', '#FFFAFB', '#FFF0F3', '#FFFFFF', '#F8F0FF', '#F0F8FF', '#F5FFF5', '#FFFFF5', '#1a1a2e', '#2d2d3f'];

  return (
    <div className="settings-page container fade-in-up">
      <SEO title="Settings" />

      <h1 className="settings-title">⚙️ 账号设置</h1>

      {message && (
        <div className={`settings-message ${message.startsWith('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="settings-card card">
        <h3>👤 头像</h3>
        <div className="avatar-section">
          <div className="avatar-preview">
            <Avatar src={user.avatar} alt="Avatar" size={80} />
          </div>
          <div className="avatar-actions">
            <button className="btn btn-secondary" onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading}>
              {avatarUploading ? '上传中...' : '📷 更换头像'}
            </button>
            <span className="avatar-hint">支持 JPG/PNG/GIF，建议正方形图片</span>
          </div>
          <input ref={avatarInputRef} type="file" hidden accept="image/*" onChange={handleAvatarUpload} />
        </div>
      </div>

      <div className="settings-card card">
        <h3>📋 基本信息</h3>
        <div className="form-group">
          <label>用户名</label>
          <input type="text" value="xkstarry" disabled className="disabled-input" />
          <span className="field-hint">用户名不可修改</span>
        </div>
        <div className="form-group">
          <label>昵称</label>
          <input type="text" value={form.nickname} onChange={handleChange('nickname')} placeholder="设置你的昵称" />
        </div>
        <div className="form-group">
          <label>个人简介</label>
          <textarea value={form.bio} onChange={handleChange('bio')} placeholder="介绍一下自己..." rows={4} />
        </div>
      </div>

      <div className="settings-card card">
        <h3>🔗 社交链接</h3>
        <div className="form-group">
          <label>GitHub</label>
          <input type="text" value={form.github} onChange={handleChange('github')} placeholder="https://github.com/..." />
        </div>
        <div className="form-group">
          <label>Twitter</label>
          <input type="text" value={form.twitter} onChange={handleChange('twitter')} placeholder="https://twitter.com/..." />
        </div>
        <div className="form-group">
          <label>个人网站</label>
          <input type="text" value={form.website} onChange={handleChange('website')} placeholder="https://..." />
        </div>
      </div>

      <div className="settings-card card">
        <h3>🎨 主题设置</h3>
        <div className="form-group">
          <label>主题色</label>
          <div className="theme-color-grid">
            {themeColors.map(c => (
              <button key={c} className={`theme-color-dot ${form.theme_color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => handleChange('theme_color')({ target: { value: c } })} />
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>背景色</label>
          <div className="bg-color-grid">
            {bgColors.map(c => (
              <button key={c} className={`bg-color-dot ${form.bg_color === c ? 'active' : ''}`} style={{ background: c, border: c === '#FFFFFF' ? '2px solid #e0c8d0' : 'none' }} onClick={() => handleChange('bg_color')({ target: { value: c } })} />
            ))}
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '💾 保存设置'}
        </button>
      </div>
    </div>
  );
}
