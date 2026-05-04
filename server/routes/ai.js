const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { query } = require('../db');

const openai = new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_BASE_URL
});

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

async function callAIWithRetry(messages, retries = 0) {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-5.5',
      messages,
      max_tokens: 4096,
      temperature: 0.7
    });
    return response.choices[0].message.content;
  } catch (err) {
    if (retries < MAX_RETRIES) {
      console.log(`AI call failed, retrying (${retries + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retries + 1)));
      return callAIWithRetry(messages, retries + 1);
    }
    throw err;
  }
}

function detectLanguage(filename) {
  const ext = path.extname(filename).toLowerCase();
  const map = {
    '.js': 'JavaScript', '.jsx': 'React JSX', '.ts': 'TypeScript', '.tsx': 'React TSX',
    '.py': 'Python', '.java': 'Java', '.c': 'C', '.cpp': 'C++', '.h': 'C/C++ Header',
    '.go': 'Go', '.rs': 'Rust', '.rb': 'Ruby', '.php': 'PHP', '.swift': 'Swift',
    '.kt': 'Kotlin', '.scala': 'Scala', '.cs': 'C#', '.sql': 'SQL',
    '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS', '.vue': 'Vue.js',
    '.json': 'JSON', '.xml': 'XML', '.yml': 'YAML', '.yaml': 'YAML',
    '.sh': 'Shell', '.bash': 'Bash', '.md': 'Markdown', '.r': 'R',
    '.m': 'Objective-C', '.mm': 'Objective-C++'
  };
  return map[ext] || 'Unknown';
}

router.post('/generate', async (req, res) => {
  try {
    const { file_id, custom_prompt } = req.body;

    if (!file_id) {
      return res.status(400).json({ error: 'file_id is required' });
    }

    const files = await query('SELECT * FROM files WHERE id = ?', [file_id]);
    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[0];
    const fullPath = path.join(__dirname, '..', file.file_path);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    const codeContent = fs.readFileSync(fullPath, 'utf-8');
    const language = detectLanguage(file.original_name);

    const systemPrompt = `You are an expert technical blogger and senior software engineer. Your task is to analyze code files and create comprehensive, well-structured technical blog posts in Chinese (Simplified).

The blog post MUST follow this structure:
1. Title: An engaging Chinese title that reflects the code's purpose
2. Overview: Brief introduction of what the code does
3. Core Logic Analysis: Detailed breakdown of the key algorithms, data structures, and design patterns
4. Code Walkthrough: Step-by-step explanation of important code sections (use markdown code blocks with proper language tags)
5. Key Takeaways: Important lessons and insights developers can learn
6. Potential Improvements: Suggestions for optimization or extension
7. Summary: Brief conclusion

Format requirements:
- Use proper Markdown formatting
- All explanatory text in Chinese
- Code blocks must specify the language
- Include practical examples and analogies
- Make it educational and engaging`;

    const userPrompt = custom_prompt
      ? `Analyze the following ${language} code from file "${file.original_name}" and create a technical blog post. Additional requirements: ${custom_prompt}\n\n\`\`\`${language.toLowerCase()}\n${codeContent}\n\`\`\``
      : `Analyze the following ${language} code from file "${file.original_name}" and create a technical blog post.\n\n\`\`\`${language.toLowerCase()}\n${codeContent}\n\`\`\``;

    const generatedContent = await callAIWithRetry([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    const renderedHtml = marked(generatedContent);

    res.json({
      success: true,
      file_name: file.original_name,
      language,
      markdown: generatedContent,
      html: renderedHtml
    });
  } catch (err) {
    console.error('AI generation error:', err);
    res.status(500).json({ error: 'AI generation failed', message: err.message });
  }
});

router.post('/generate-from-text', async (req, res) => {
  try {
    const { code_content, language, custom_prompt } = req.body;

    if (!code_content) {
      return res.status(400).json({ error: 'code_content is required' });
    }

    const systemPrompt = `You are an expert technical blogger and senior software engineer. Your task is to analyze code and create comprehensive, well-structured technical blog posts in Chinese (Simplified). Follow the same structure as the generate endpoint. Use proper Markdown formatting with language-tagged code blocks.`;

    const userPrompt = custom_prompt
      ? `Analyze the following ${language || 'code'} and create a technical blog post. Additional requirements: ${custom_prompt}\n\n\`\`\`${(language || '').toLowerCase()}\n${code_content}\n\`\`\``
      : `Analyze the following ${language || 'code'} and create a technical blog post.\n\n\`\`\`${(language || '').toLowerCase()}\n${code_content}\n\`\`\``;

    const generatedContent = await callAIWithRetry([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    const renderedHtml = marked(generatedContent);

    res.json({
      success: true,
      markdown: generatedContent,
      html: renderedHtml
    });
  } catch (err) {
    console.error('AI generation error:', err);
    res.status(500).json({ error: 'AI generation failed', message: err.message });
  }
});

router.post('/export-markdown', (req, res) => {
  try {
    const { content, filename } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });

    const safeName = (filename || 'blog-post').replace(/[^a-z0-9\u4e00-\u9fa5_-]/gi, '_');
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.md"`);
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
