const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../db');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedCodeExts = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala', '.cs', '.vb', '.sql', '.sh', '.bash', '.yml', '.yaml', '.json', '.xml', '.html', '.css', '.scss', '.less', '.vue', '.svelte', '.md', '.txt', '.r', '.m', '.mm'];
  const allowedImageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if ([...allowedCodeExts, ...allowedImageExts].includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type'));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

router.get('/', async (req, res) => {
  try {
    const files = await query('SELECT * FROM files ORDER BY uploaded_at DESC');
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const files = await query('SELECT * FROM files WHERE id = ?', [req.params.id]);
    if (files.length === 0) return res.status(404).json({ error: 'File not found' });
    const file = files[0];
    const fullPath = path.join(__dirname, '..', file.file_path);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File not found on disk' });
    const ext = path.extname(file.original_name).toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
    if (imageExts.includes(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      res.setHeader('Pragma', 'cache');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
    res.sendFile(fullPath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/download', async (req, res) => {
  try {
    const files = await query('SELECT * FROM files WHERE id = ?', [req.params.id]);
    if (files.length === 0) return res.status(404).json({ error: 'File not found' });
    const file = files[0];
    const fullPath = path.join(__dirname, '..', file.file_path);
    res.download(fullPath, file.original_name);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const ext = path.extname(req.file.originalname).toLowerCase();
    const codeExts = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala', '.cs', '.vb', '.sql', '.sh', '.bash', '.yml', '.yaml', '.json', '.xml', '.html', '.css', '.scss', '.less', '.vue', '.svelte', '.md', '.txt', '.r', '.m', '.mm'];
    const fileType = codeExts.includes(ext) ? 'code' : 'image';
    const result = await query(
      'INSERT INTO files (original_name, stored_name, file_path, file_type, file_size, mime_type) VALUES (?, ?, ?, ?, ?, ?)',
      [req.file.originalname, req.file.filename, 'uploads/' + req.file.filename, fileType, req.file.size, req.file.mimetype || '']
    );
    const [file] = await query('SELECT * FROM files WHERE id = ?', [result.insertId]);
    res.status(201).json(file);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const files = await query('SELECT * FROM files WHERE id = ?', [req.params.id]);
    if (files.length > 0) {
      const fullPath = path.join(__dirname, '..', files[0].file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    await query('DELETE FROM files WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
