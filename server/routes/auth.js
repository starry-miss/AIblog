const express = require('express');
const router = express.Router();
const { query } = require('../db');

router.get('/user', async (req, res) => {
  try {
    const users = await query('SELECT id, username, nickname, bio, avatar, github, twitter, website, theme_color, bg_color FROM users WHERE username = ?', ['xkstarry']);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(users[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/user', async (req, res) => {
  try {
    const { nickname, bio, avatar, github, twitter, website, theme_color, bg_color } = req.body;
    const fields = [];
    const values = [];
    if (nickname !== undefined) { fields.push('nickname = ?'); values.push(nickname); }
    if (bio !== undefined) { fields.push('bio = ?'); values.push(bio); }
    if (avatar !== undefined) { fields.push('avatar = ?'); values.push(avatar); }
    if (github !== undefined) { fields.push('github = ?'); values.push(github); }
    if (twitter !== undefined) { fields.push('twitter = ?'); values.push(twitter); }
    if (website !== undefined) { fields.push('website = ?'); values.push(website); }
    if (theme_color !== undefined) { fields.push('theme_color = ?'); values.push(theme_color); }
    if (bg_color !== undefined) { fields.push('bg_color = ?'); values.push(bg_color); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push('xkstarry');
    await query(`UPDATE users SET ${fields.join(', ')} WHERE username = ?`, values);
    const updated = await query('SELECT id, username, nickname, bio, avatar, github, twitter, website, theme_color, bg_color FROM users WHERE username = ?', ['xkstarry']);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
