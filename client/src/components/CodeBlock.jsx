import { useEffect, useRef, useState } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import '../styles/code-block.css';

export default function CodeBlock({ code, language, showCopy = true }) {
  const codeRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const detectedLang = language || '';

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [code, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-lang">{detectedLang}</span>
        {showCopy && (
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? '✓ 已复制' : '📋 复制'}
          </button>
        )}
      </div>
      <pre className="code-block-pre">
        <code ref={codeRef} className={`language-${detectedLang}`}>
          {code}
        </code>
      </pre>
    </div>
  );
}
