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


const GENERATION_REQUIREMENTS = {
  depth: '根据代码复杂度自然展开，不要为了凑字数写废话，也不要省略关键步骤。',
  code: '按教学需要展示关键代码片段，并给出一个完整可运行的安全版。',
  logic: '围绕“怎么上手、先做什么、然后做什么、为什么这样写、怎么避坑”来讲；代码短就讲清楚，代码长就按模块拆清楚。',
  variety: '每次都根据代码主题自由组织标题、章节顺序、解释方式和排版组件，不要套固定模板。'
};

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
        'warning-note', 'inline-code', 'footer-meta', 'code-block', 'hljs', 'language-*'
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
- ${generationOptions.depth}
- ${generationOptions.code}
- ${generationOptions.logic}
- ${generationOptions.variety}
- 用基础词汇讲复杂概念，但保持专业准确。
- 段落要短，列表要清晰，像现代教程博客一样好读。
- 讲解顺序必须体现“先做什么 -> 然后做什么 -> 最后得到什么”。
- 不要堆抽象术语；如果必须出现术语，先用生活化比喻解释。
- 不要编造代码里没有的业务背景；可以补充必要的运行环境、依赖安装和安全改写。
- 所有真实密钥、token、密码、连接串必须替换成 &lt;YOUR_API_KEY&gt;、&lt;YOUR_TOKEN&gt;、&lt;YOUR_PASSWORD&gt; 或 &lt;YOUR_DATABASE_URL&gt;。

HTML 组件规则：
- 根节点必须是 <article class="ai-article-template">，除此之外不要固定同一种结构。
- 可以自由组合 header、section、div、h1/h2/h3、p、ul/ol、table、pre/code、hr。
- 可以使用这些 class 获得好看的样式：blog-header、badge、subhead、info-note、warning-note、inline-code、footer-meta、code-block。
- 不要求每篇都用同样的章节标题；请根据代码主题改写标题，比如“先跑起来”“核心流程”“关键对象”“改成安全版”“常见坑”“还能怎么改”。
- 不要求每篇都按同样顺序；但必须让读者能顺着逻辑读懂。
- 可以使用信息卡片、警告卡片、流程列表、对比表、概念表、步骤清单，但不要每篇都机械重复同一套。

建议但不固定的内容模块：
- 一个有吸引力的标题和简短副标题。
- 适合人群 / 学习收益，可以用 info-note，也可以融入开头段落。
- 代码要做什么、整体流程、关键代码拆解、安全可运行版本、常见坑、总结。
- 如果代码不适合某个模块，就不要硬写；换成更适合该代码的讲法。

代码规则：
- 所有生成结果必须是 HTML；不要把代码块写成 Markdown 三反引号。
- 行内代码必须用 <code class="inline-code">...</code>。
- 代码块必须用 <pre class="code-block"><code class="language-${(language || 'code').toLowerCase()}">...</code></pre>，前端会用 highlight.js 渲染成接近 VS Code 深色主题的高亮效果。
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

请先阅读代码，再自动判断主题。文章要有现代 HTML 教程的质感：标题清楚、层次好看、代码块突出、重点提醒醒目、逻辑顺序自然。不要照搬固定章节模板，每次都根据代码内容重新组织讲法，让排版和章节看起来像为这段代码专门写的。

必须做到：
- 只输出 HTML 片段，根节点必须是 <article class="ai-article-template">。
- 不要输出 Markdown，不要输出完整 HTML 页面，不要输出 style/script/body/head。
- 不允许使用 Markdown 代码围栏；所有代码都必须放在 <pre class="code-block"><code class="language-${(language || 'code').toLowerCase()}">...</code></pre> 中。
- 必须展示关键代码片段和完整安全版代码，但代码块数量由内容需要决定。
- 根据内容自由决定是否使用 info-note、warning-note、table、列表、流程说明和 footer-meta，不要每篇机械重复同一套。
- 如果使用表格，表格必须真的能帮助理解关键概念、参数、流程或常见坑。
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
    const generationOptions = GENERATION_REQUIREMENTS;

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
    const generationOptions = GENERATION_REQUIREMENTS;
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
