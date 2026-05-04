import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, image, url, type = 'website' }) {
  const siteName = 'xkstarry Blog';
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const siteUrl = window.location.origin;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description || 'AI-Powered Personal Tech Blog - Technical insights and development notes'} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description || 'AI-Powered Personal Tech Blog'} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url || siteUrl} />
      {image && <meta property="og:image" content={image} />}
      <meta property="og:site_name" content={siteName} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description || 'AI-Powered Personal Tech Blog'} />
      {image && <meta name="twitter:image" content={image} />}
      <link rel="canonical" href={url || siteUrl} />
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': type === 'article' ? 'BlogPosting' : 'WebSite',
          name: fullTitle,
          description: description,
          url: url || siteUrl,
          ...(type === 'article' ? {
            headline: title,
            author: { '@type': 'Person', name: 'xkstarry' },
            datePublished: new Date().toISOString()
          } : {})
        })}
      </script>
    </Helmet>
  );
}
