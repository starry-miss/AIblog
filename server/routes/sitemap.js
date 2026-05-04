const express = require('express');
const router = express.Router();
const { query } = require('../db');

router.get('/sitemap.xml', async (req, res) => {
  try {
    const siteUrl = process.env.SITE_URL || 'http://localhost:9464';
    const posts = await query('SELECT slug, updated_at FROM posts WHERE status = "published" ORDER BY updated_at DESC');
    const categories = await query('SELECT slug, updated_at FROM categories ORDER BY updated_at DESC');

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    xml += `  <url>\n    <loc>${siteUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${siteUrl}/blog</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;

    for (const post of posts) {
      xml += `  <url>\n    <loc>${siteUrl}/blog/${post.slug}</loc>\n    <lastmod>${new Date(post.updated_at).toISOString()}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    }

    for (const cat of categories) {
      xml += `  <url>\n    <loc>${siteUrl}/blog?category=${cat.slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
    }

    xml += '</urlset>';

    res.setHeader('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
