const API_BASE = '/api';

async function request(url, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };
  const res = await fetch(`${API_BASE}${url}`, config);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || err.message || 'Request failed');
  }
  return res.json();
}

export const api = {
  getUser: () => request('/auth/user'),
  updateUser: (data) => request('/auth/user', { method: 'PUT', body: JSON.stringify(data) }),

  getPosts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/posts${qs ? '?' + qs : ''}`);
  },
  getPost: (id) => request(`/posts/${id}`),
  createPost: (data) => request('/posts', { method: 'POST', body: JSON.stringify(data) }),
  updatePost: (id, data) => request(`/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePost: (id) => request(`/posts/${id}`, { method: 'DELETE' }),
  updatePostSort: (id, sort_order) => request(`/posts/${id}/sort`, { method: 'PUT', body: JSON.stringify({ sort_order }) }),
  reorderPosts: (orders) => request('/posts/reorder', { method: 'POST', body: JSON.stringify({ orders }) }),

  getCategories: () => request('/categories'),
  getCategory: (id) => request(`/categories/${id}`),
  createCategory: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  getTags: () => request('/tags'),
  deleteTag: (id) => request(`/tags/${id}`, { method: 'DELETE' }),

  getFiles: () => request('/files'),
  getFileUrl: (id) => `${API_BASE}/files/${id}`,
  getFileDownloadUrl: (id) => `${API_BASE}/files/${id}/download`,
  deleteFile: (id) => request(`/files/${id}`, { method: 'DELETE' }),

  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/files/upload`, { method: 'POST', body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Upload failed');
    }
    return res.json();
  },

  generateBlog: (data) => request('/ai/generate', { method: 'POST', body: JSON.stringify(data) }),
  generateFromText: (data) => request('/ai/generate-from-text', { method: 'POST', body: JSON.stringify(data) }),

  search: (q, page = 1) => request(`/search?q=${encodeURIComponent(q)}&page=${page}`),
};

export default api;
