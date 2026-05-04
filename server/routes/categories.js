const express = require('express');
const router = express.Router();
const { query } = require('../db');

router.get('/', async (req, res) => {
  try {
    const categories = await query('SELECT c.*, (SELECT COUNT(*) FROM post_categories pc JOIN posts p ON pc.post_id = p.id WHERE pc.category_id = c.id AND p.status = "published") as post_count FROM categories c ORDER BY c.sort_order ASC');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const cats = await query('SELECT * FROM categories WHERE id = ? OR slug = ?', [req.params.id, req.params.id]);
    if (cats.length === 0) return res.status(404).json({ error: 'Category not found' });
    res.json(cats[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, color, sort_order } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '');
    const result = await query(
      'INSERT INTO categories (name, slug, description, color, sort_order) VALUES (?, ?, ?, ?, ?)',
      [name, slug, description || '', color || '#FF6B8A', sort_order || 0]
    );
    const [cat] = await query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    res.status(201).json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, color, sort_order } = req.body;
    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }
    if (color !== undefined) { fields.push('color = ?'); values.push(color); }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); values.push(sort_order); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(req.params.id);
    await query(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);
    const [cat] = await query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
