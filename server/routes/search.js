const express = require('express');
const router = express.Router();
const { query, getConnection } = require('../db');

router.get('/', async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q || q.trim() === '') {
      return res.json({ posts: [], total: 0, query: '' });
    }

    const searchTerm = q.trim();
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const posts = await query(
      `SELECT p.*,
        MATCH(p.title, p.content, p.summary) AGAINST(? IN BOOLEAN MODE) as relevance
      FROM posts p
      WHERE p.status = 'published'
        AND MATCH(p.title, p.content, p.summary) AGAINST(? IN BOOLEAN MODE)
      ORDER BY relevance DESC
      LIMIT ? OFFSET ?`,
      [searchTerm, searchTerm, parseInt(limit), offset]
    );

    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM posts p
      WHERE p.status = 'published'
        AND MATCH(p.title, p.content, p.summary) AGAINST(? IN BOOLEAN MODE)`,
      [searchTerm]
    );

    for (const post of posts) {
      const cats = await query(
        'SELECT c.* FROM categories c JOIN post_categories pc ON c.id = pc.category_id WHERE pc.post_id = ?',
        [post.id]
      );
      const tags = await query(
        'SELECT t.* FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?',
        [post.id]
      );
      post.categories = cats;
      post.tags = tags;
    }

    res.json({
      posts,
      total: countResult.total,
      page: parseInt(page),
      totalPages: Math.ceil(countResult.total / parseInt(limit)),
      query: searchTerm
    });
  } catch (err) {
    if (err.code === 'ER_PARSE_ERROR' && err.message.includes('FULLTEXT')) {
      try {
        const { q, page = 1, limit = 10 } = req.query;
        const searchTerm = `%${q.trim()}%`;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const posts = await query(
          `SELECT * FROM posts WHERE status = 'published'
            AND (title LIKE ? OR content LIKE ? OR summary LIKE ?)
          ORDER BY created_at DESC LIMIT ? OFFSET ?`,
          [searchTerm, searchTerm, searchTerm, parseInt(limit), offset]
        );
        const [countResult] = await query(
          `SELECT COUNT(*) as total FROM posts WHERE status = 'published'
            AND (title LIKE ? OR content LIKE ? OR summary LIKE ?)`,
          [searchTerm, searchTerm, searchTerm]
        );
        for (const post of posts) {
          const cats = await query('SELECT c.* FROM categories c JOIN post_categories pc ON c.id = pc.category_id WHERE pc.post_id = ?', [post.id]);
          const tags = await query('SELECT t.* FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?', [post.id]);
          post.categories = cats;
          post.tags = tags;
        }
        return res.json({
          posts, total: countResult.total, page: parseInt(page),
          totalPages: Math.ceil(countResult.total / parseInt(limit)), query: q
        });
      } catch (fallbackErr) {
        return res.status(500).json({ error: fallbackErr.message });
      }
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
