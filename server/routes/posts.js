const express = require('express');
const router = express.Router();
const { query } = require('../db');

router.get('/', async (req, res) => {
  try {
    const { category, tag, status, sort, page = 1, limit = 10 } = req.query;
    let sql = 'SELECT DISTINCT p.* FROM posts p';
    const params = [];
    const conditions = [];

    if (category) {
      sql += ' JOIN post_categories pc ON p.id = pc.post_id';
      conditions.push('pc.category_id = ?');
      params.push(category);
    }
    if (tag) {
      if (!sql.includes('post_tags')) sql += ' JOIN post_tags pt ON p.id = pt.post_id';
      conditions.push('pt.tag_id = ?');
      params.push(tag);
    }
    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    if (sort === 'views') {
      sql += ' ORDER BY p.view_count DESC';
    } else if (sort === 'oldest') {
      sql += ' ORDER BY p.created_at ASC';
    } else {
      sql += ' ORDER BY p.sort_order ASC, p.created_at DESC';
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const posts = await query(sql, params);

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

    let countSql = 'SELECT COUNT(DISTINCT p.id) as total FROM posts p';
    if (category) countSql += ' JOIN post_categories pc ON p.id = pc.post_id';
    if (tag && !countSql.includes('post_tags')) countSql += ' JOIN post_tags pt ON p.id = pt.post_id';
    if (conditions.length > 0) {
      const countConditions = conditions.map(c => c.replace('p.', 'p.').replace('pc.', 'pc.').replace('pt.', 'pt.'));
      countSql += ' WHERE ' + countConditions.join(' AND ');
    }
    const [countResult] = await query(countSql, params.slice(0, -2));
    const total = countResult.total;

    res.json({ posts, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const posts = await query('SELECT * FROM posts WHERE id = ? OR slug = ?', [req.params.id, req.params.id]);
    if (posts.length === 0) return res.status(404).json({ error: 'Post not found' });

    const post = posts[0];
    await query('UPDATE posts SET view_count = view_count + 1 WHERE id = ?', [post.id]);
    post.view_count += 1;

    const cats = await query('SELECT c.* FROM categories c JOIN post_categories pc ON c.id = pc.category_id WHERE pc.post_id = ?', [post.id]);
    const tags = await query('SELECT t.* FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?', [post.id]);
    post.categories = cats;
    post.tags = tags;

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, content, summary, cover_image, status, category_ids, tag_names } = req.body;
    const slug = title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();

    const result = await query(
      'INSERT INTO posts (title, slug, content, summary, cover_image, status) VALUES (?, ?, ?, ?, ?, ?)',
      [title, slug, content || '', summary || '', cover_image || '', status || 'draft']
    );
    const postId = result.insertId;

    if (category_ids && category_ids.length > 0) {
      const values = category_ids.map(cid => [postId, cid]);
      for (const v of values) {
        await query('INSERT INTO post_categories (post_id, category_id) VALUES (?, ?)', v);
      }
    }

    if (tag_names && tag_names.length > 0) {
      for (const name of tag_names) {
        const tagSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        let tags = await query('SELECT id FROM tags WHERE slug = ?', [tagSlug]);
        let tagId;
        if (tags.length === 0) {
          const r = await query('INSERT INTO tags (name, slug) VALUES (?, ?)', [name, tagSlug]);
          tagId = r.insertId;
        } else {
          tagId = tags[0].id;
        }
        await query('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)', [postId, tagId]);
      }
    }

    const [post] = await query('SELECT * FROM posts WHERE id = ?', [postId]);
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, content, summary, cover_image, status, category_ids, tag_names } = req.body;
    const postId = req.params.id;

    const fields = [];
    const values = [];
    if (title !== undefined) {
      fields.push('title = ?'); values.push(title);
      const slug = title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();
      fields.push('slug = ?'); values.push(slug);
    }
    if (content !== undefined) { fields.push('content = ?'); values.push(content); }
    if (summary !== undefined) { fields.push('summary = ?'); values.push(summary); }
    if (cover_image !== undefined) { fields.push('cover_image = ?'); values.push(cover_image); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }

    if (fields.length > 0) {
      values.push(postId);
      await query(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    if (category_ids !== undefined) {
      await query('DELETE FROM post_categories WHERE post_id = ?', [postId]);
      for (const cid of category_ids) {
        await query('INSERT INTO post_categories (post_id, category_id) VALUES (?, ?)', [postId, cid]);
      }
    }

    if (tag_names !== undefined) {
      await query('DELETE FROM post_tags WHERE post_id = ?', [postId]);
      for (const name of tag_names) {
        const tagSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        let tags = await query('SELECT id FROM tags WHERE slug = ?', [tagSlug]);
        let tagId;
        if (tags.length === 0) {
          const r = await query('INSERT INTO tags (name, slug) VALUES (?, ?)', [name, tagSlug]);
          tagId = r.insertId;
        } else {
          tagId = tags[0].id;
        }
        await query('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)', [postId, tagId]);
      }
    }

    const [post] = await query('SELECT * FROM posts WHERE id = ?', [postId]);
    const cats = await query('SELECT c.* FROM categories c JOIN post_categories pc ON c.id = pc.category_id WHERE pc.post_id = ?', [postId]);
    const tags = await query('SELECT t.* FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?', [postId]);
    post.categories = cats;
    post.tags = tags;

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/sort', async (req, res) => {
  try {
    const { sort_order } = req.body;
    await query('UPDATE posts SET sort_order = ? WHERE id = ?', [sort_order, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reorder', async (req, res) => {
  try {
    const { orders } = req.body;
    for (const item of orders) {
      await query('UPDATE posts SET sort_order = ? WHERE id = ?', [item.sort_order, item.id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
