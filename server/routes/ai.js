const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const { query } = require('../db');

const AI_API_KEY = 'sk-6d73565751544d97bf06d17a9fa63f5f';
const AI_BASE_URL = 'https://api.deepseek.com';
const AI_MODEL = 'deepseek-v4-flash';

const openai = new OpenAI({
  apiKey: AI_API_KEY,
  baseURL: AI_BASE_URL
});

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

async function callAIWithRetry(messages, options = {}, retries = 0) {
  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages,
      temperature: options.temperature ?? 0.35
    });
    return response.choices[0].message.content;
  } catch (err) {
    if (retries < MAX_RETRIES) {
      console.log(`AI call failed, retrying (${retries + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retries + 1)));
      return callAIWithRetry(messages, options, retries + 1);
    }
    throw err;
  }
}


function getGenerationOptions(content) {
  const lineCount = content.split(/\r?\n/).filter(line => line.trim()).length;
  const charCount = content.length;

  if (lineCount <= 60 || charCount <= 2000) {
    return {
      wordRange: '900-1300 字',
      codeBlockRange: '3-4 个代码块',
      detailLevel: '短代码也要写成完整上手教程：讲清目标、环境、关键代码、可运行安全版和避坑。'
    };
  }

  if (lineCount <= 180 || charCount <= 6000) {
    return {
      wordRange: '1400-2200 字',
      codeBlockRange: '4-6 个代码块',
      detailLevel: '中等代码要按步骤拆解，重点解释执行顺序、关键对象、参数作用和可迁移用法。'
    };
  }

  return {
    wordRange: '2200-3200 字',
    codeBlockRange: '5-8 个代码块',
    detailLevel: '长代码要按模块讲，但每一段都围绕“怎么上手、怎么改、怎么避坑”。'
  };
}

function redactSensitiveContent(content) {
  return content
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, '$1<YOUR_TOKEN>')
    .replace(/sk-ant-[A-Za-z0-9._-]+/gi, '<YOUR_API_KEY>')
    .replace(/sk-[A-Za-z0-9._-]{8,}/gi, '<YOUR_API_KEY>')
    .replace(/([?&](?:token|key|api_key|apikey|access_token|secret|password|pwd)=)[^\s&"'`<>]+/gi, '$1<REDACTED>')
    .replace(/\b([a-z][a-z0-9+.-]*:\/\/)([^\s:@/]+):([^\s@/]+)@/gi, '$1<USER>:<YOUR_PASSWORD>@')
    .replace(/\b((?:api[_-]?key|apikey|secret|token|access[_-]?token|auth[_-]?token|password|passwd|pwd)\s*[:=]\s*)(["'`]?)([^"'`\s,;}\]]{4,})(\2)/gi, (match, prefix, quote, value, closingQuote) => {
      const lower = prefix.toLowerCase();
      let placeholder = '<YOUR_TOKEN>';
      if (lower.includes('password') || lower.includes('passwd') || lower.includes('pwd')) placeholder = '<YOUR_PASSWORD>';
      if (lower.includes('key')) placeholder = '<YOUR_API_KEY>';
      if (lower.includes('secret')) placeholder = '<YOUR_SECRET>';
      return `${prefix}${quote}${placeholder}${closingQuote}`;
    });
}

function sanitizeGeneratedHtml(html) {
  return sanitizeHtml(html, {
    allowedTags: [
      'article', 'section', 'div', 'header', 'footer', 'span', 'p', 'br', 'hr',
      'h1', 'h2', 'h3', 'h4', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote'
    ],
    allowedAttributes: {
      '*': ['class'],
      code: ['class'],
      pre: ['class']
    },
    allowedClasses: {
      '*': [
        'ai-article-template', 'blog-header', 'badge', 'subhead', 'info-note',
        'warning-note', 'inline-code', 'footer-meta', 'code-block', 'language-*'
      ]
    },
    disallowedTagsMode: 'discard',
    allowedSchemes: []
  });
}

function buildSystemPrompt(language, generationOptions) {
  return `你是一名擅长写“初学者实战教程”的技术作者和前端排版设计师。读者会一点基础语法，知道变量、函数、import，但对框架和工程实践不熟。你的目标是让读者看完能照着运行、知道代码先做什么再做什么，并能改出自己的版本。

必须输出 HTML 片段，不要输出 Markdown，不要输出完整 <!DOCTYPE html>、html、head、body、style、script、iframe、svg、form、input、button、img、a 标签，也不要输出任何 onclick/onerror 等事件属性。

整体要求：
- 总长度：${generationOptions.wordRange}。
- 代码展示：${generationOptions.codeBlockRange}，每个代码块要短而有用，必须给出一个完整可运行的安全版。
- ${generationOptions.detailLevel}
- 用基础词汇讲复杂概念，但保持专业准确。
- 段落要短，列表要清晰，像现代教程博客一样好读。
- 讲解顺序必须体现“先做什么 -> 然后做什么 -> 最后得到什么”。
- 不要堆抽象术语；如果必须出现术语，先用生活化比喻解释。
- 不要编造代码里没有的业务背景；可以补充必要的运行环境、依赖安装和安全改写。
- 所有真实密钥、token、密码、连接串必须替换成 &lt;YOUR_API_KEY&gt;、&lt;YOUR_TOKEN&gt;、&lt;YOUR_PASSWORD&gt; 或 &lt;YOUR_DATABASE_URL&gt;。

必须严格使用这种 HTML 结构和类名：
<article class="ai-article-template">
  <header class="blog-header">
    <div class="badge">🔧 实战 · 快速入门</div>
    <h1>具体、有吸引力的教程标题</h1>
    <p class="subhead">一句话说明这篇教程能帮读者做到什么</p>
  </header>

  <p>亲切开场，说明这段代码适合谁、要解决什么问题。</p>

  <div class="info-note">
    📌 <strong>目标读者</strong>：...<br>
    🎯 <strong>学习收益</strong>：...
  </div>

  <h2>🧠 先理解大局：我们要干什么？</h2>
  <p>用 2-4 句话讲清目标，并给出 3-5 步整体流程。</p>

  <h2>🔍 解析原始代码：一步一步背后的“为什么”</h2>
  <h3>🔹 步骤 1：...</h3>
  <p>解释这段代码做什么，以及为什么要这样写。</p>
  <pre class="code-block"><code class="language-${(language || 'code').toLowerCase()}">短代码片段</code></pre>

  <h2>🧩 完整逻辑流程图（一眼看懂）</h2>
  <div class="info-note">用文字箭头描述数据流，例如：输入 → 模型 → 解析器 → 输出。</div>

  <h2>🛠️ 动手改进：写出安全可运行版本</h2>
  <pre class="code-block"><code class="language-${(language || 'code').toLowerCase()}">完整安全版代码</code></pre>

  <h2>💡 常见疑问与避坑指南</h2>
  <table>...</table>

  <div class="warning-note">🔐 <strong>重要提醒</strong>：强调密钥、环境变量、base_url 或运行坑。</div>

  <h2>🎯 总结：核心逻辑就几句话</h2>
  <ol>...</ol>

  <hr>
  <div class="footer-meta">推荐下一步学习内容。</div>
</article>

代码规则：
- 行内代码必须用 <code class="inline-code">...</code>。
- 代码块必须用 <pre class="code-block"><code class="language-${(language || 'code').toLowerCase()}">...</code></pre>。
- 代码块里的 <、>、& 必须转义为 &amp;lt;、&amp;gt;、&amp;amp;，避免破坏 HTML。
- 不要在 HTML 里写 style 属性，样式由前端 CSS 提供。

特别要求：
- 如果代码和 LangChain / AI 调用有关，必须讲清模型客户端、SystemMessage/HumanMessage、StrOutputParser、pipe/链式调用、环境变量安全配置。
- 不要让文章变成 API 文档，要像老师带读者做小项目一样讲。`;
}

function buildUserPrompt({ language, filename, codeContent, custom_prompt }) {
  const source = filename ? `文件 "${filename}"` : '下面这段代码';
  const extra = custom_prompt ? `\n\n额外要求：${custom_prompt}` : '';

  return `请根据${source}写一篇现代 HTML 排版的初学者实战教程。${extra}

请先阅读代码，再自动判断主题。文章要完全接近这种风格：顶部 badge + 大标题 + 副标题 + 信息卡片 + 分步骤讲解 + 深色代码块 + 表格 + 警告卡片 + 总结。读者看完要知道先做什么、然后做什么、最后得到什么。

必须做到：
- 只输出 HTML 片段，根节点必须是 <article class="ai-article-template">。
- 不要输出 Markdown，不要输出完整 HTML 页面，不要输出 style/script/body/head。
- 必须展示关键代码片段和完整安全版代码。
- 必须包含“目标读者/学习收益”的 info-note。
- 必须包含一个 HTML table 解释关键概念、参数或变量。
- 必须包含 warning-note 说明最容易踩的坑。
- 如果出现 API Key、token、密码或连接串，必须只显示占位符。
- 如果代码涉及 LangChain、OpenAI 兼容接口或 DeepSeek，重点讲清 ChatOpenAI、SystemMessage/HumanMessage、StrOutputParser、pipe/链式调用和环境变量。

原始代码：
<pre><code class="language-${(language || 'code').toLowerCase()}">
${codeContent}
</code></pre>`;
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

    const codeContent = redactSensitiveContent(fs.readFileSync(fullPath, 'utf-8'));
    const language = detectLanguage(file.original_name);
    const generationOptions = getGenerationOptions(codeContent);

    const systemPrompt = buildSystemPrompt(language, generationOptions);
    const userPrompt = buildUserPrompt({
      language,
      filename: file.original_name,
      codeContent,
      custom_prompt
    });

    const generatedContent = sanitizeGeneratedHtml(redactSensitiveContent(await callAIWithRetry([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], generationOptions)));

    res.json({
      success: true,
      file_name: file.original_name,
      language,
      markdown: generatedContent,
      html: generatedContent
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

    const safeCodeContent = redactSensitiveContent(code_content);
    const generationOptions = getGenerationOptions(safeCodeContent);
    const selectedLanguage = language || 'code';

    const systemPrompt = buildSystemPrompt(selectedLanguage, generationOptions);
    const userPrompt = buildUserPrompt({
      language: selectedLanguage,
      codeContent: safeCodeContent,
      custom_prompt
    });

    const generatedContent = sanitizeGeneratedHtml(redactSensitiveContent(await callAIWithRetry([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], generationOptions)));

    res.json({
      success: true,
      markdown: generatedContent,
      html: generatedContent
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
