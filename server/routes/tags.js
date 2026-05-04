const express = require('express');
const router = express.Router();
const { query } = require('../db');

router.get('/', async (req, res) => {
  try {
    const tags = await query(
      'SELECT t.*, COUNT(pt.post_id) as post_count FROM tags t LEFT JOIN post_tags pt ON t.id = pt.tag_id LEFT JOIN posts p ON pt.post_id = p.id AND p.status = "published" GROUP BY t.id ORDER BY post_count DESC'
    );
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM tags WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
