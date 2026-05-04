import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';

const UserContext = createContext(null);
const USER_CACHE_KEY = 'aiblog_user_cache';
const REFRESH_INTERVAL = 5 * 60 * 1000;

function getCachedUser() {
  try {
    const cached = localStorage.getItem(USER_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.username) return parsed;
    }
  } catch (e) { /* ignore */ }
  return null;
}

function setCachedUser(user) {
  try {
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify({
        ...user,
        _cachedAt: Date.now()
      }));
    }
  } catch (e) { /* ignore */ }
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => getCachedUser());
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef(null);

  useEffect(() => {
    const fetchUser = () => {
      api.getUser()
        .then(u => {
          setUser(prev => {
            const merged = { ...prev };
            if (u.nickname !== undefined) merged.nickname = u.nickname;
            if (u.bio !== undefined) merged.bio = u.bio;
            if (u.github !== undefined) merged.github = u.github;
            if (u.twitter !== undefined) merged.twitter = u.twitter;
            if (u.website !== undefined) merged.website = u.website;
            if (u.theme_color !== undefined) merged.theme_color = u.theme_color;
            if (u.bg_color !== undefined) merged.bg_color = u.bg_color;
            if (u.avatar !== undefined && u.avatar !== null && u.avatar !== '') {
              merged.avatar = u.avatar;
            }
            merged.username = u.username;
            setCachedUser(merged);
            return merged;
          });
        })
        .catch(err => {
          if (!getCachedUser()) {
            console.warn('Failed to load user:', err.message);
          }
        })
        .finally(() => setLoading(false));
    };

    fetchUser();

    refreshTimerRef.current = setInterval(fetchUser, REFRESH_INTERVAL);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, []);

  const updateUser = useCallback(async (data) => {
    const updated = await api.updateUser(data);
    setUser(updated);
    setCachedUser(updated);
    return updated;
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
