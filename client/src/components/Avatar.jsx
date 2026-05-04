import { useState, useRef, useEffect } from 'react';

const FALLBACK_EMOJI = '🌸';

export default function Avatar({ src, alt, className = '', size = 40, onError }) {
  const [imgState, setImgState] = useState('loading');
  const [retryCount, setRetryCount] = useState(0);
  const timeoutRef = useRef(null);
  const MAX_RETRIES = 2;
  const LOAD_TIMEOUT = 10000;

  const srcWithBuster = src ? (src.includes('?') ? `${src}&_t=${Date.now()}` : `${src}?_t=${Date.now()}`) : null;

  const resetState = () => {
    setImgState('loading');
    setRetryCount(0);
  };

  useEffect(() => {
    if (src) resetState();
  }, [src]);

  useEffect(() => {
    if (imgState === 'loading' && srcWithBuster) {
      timeoutRef.current = setTimeout(() => {
        if (retryCount < MAX_RETRIES) {
          setRetryCount(c => c + 1);
          setImgState('retrying');
          timeoutRef.current = setTimeout(() => setImgState('error'), 500);
        } else {
          setImgState('error');
        }
      }, LOAD_TIMEOUT);
      return () => clearTimeout(timeoutRef.current);
    }
  }, [imgState, retryCount, srcWithBuster]);

  const handleImgError = () => {
    clearTimeout(timeoutRef.current);
    if (retryCount < MAX_RETRIES) {
      setRetryCount(c => c + 1);
      setImgState('retrying');
      setTimeout(() => setImgState('retrying'), 300);
    } else {
      setImgState('error');
      if (onError) onError();
    }
  };

  const handleImgLoad = () => {
    clearTimeout(timeoutRef.current);
    setImgState('loaded');
  };

  if (!src || imgState === 'error') {
    return <span className={`avatar-fallback ${className}`} style={{ fontSize: size * 0.55 }}>{FALLBACK_EMOJI}</span>;
  }

  return (
    <>
      {(imgState === 'loading' || imgState === 'retrying') && (
        <span className={`avatar-fallback ${className}`} style={{ fontSize: size * 0.55 }}>{FALLBACK_EMOJI}</span>
      )}
      <img
        src={srcWithBuster}
        alt={alt || 'avatar'}
        className={className}
        style={{ display: imgState === 'loaded' ? 'block' : 'none' }}
        onError={handleImgError}
        onLoad={handleImgLoad}
      />
    </>
  );
}
