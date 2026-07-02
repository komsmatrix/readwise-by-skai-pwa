// middleware.js — place this at the PROJECT ROOT (same level as package.json)
// Vercel Edge Middleware — injects correct meta tags for /tesda before redirect

export const config = {
  matcher: ['/tesda', '/tesda/'],
}

export default function middleware(request) {
  const url = new URL(request.url)

  // Only handle /tesda path
  if (url.pathname === '/tesda' || url.pathname === '/tesda/') {
    // Fetch the original index.html and inject TESDA meta tags
    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0d1530" />
    <meta name="description" content="Ang Ultimate Hub para sa TESDA NC II Reviewer. Cookery, Caregiving, Housekeeping, Welding, Automotive at marami pa. Full HTML reviewers, video lessons, at infographics. ₱99 lang — lifetime access." />
    <title>TESDA NC II Reviewer Hub — Readwise by Skai</title>

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://readwisebyskai.com/tesda" />
    <meta property="og:title" content="TESDA NC II Reviewer Hub — Readwise by Skai" />
    <meta property="og:description" content="Ang Ultimate Hub para sa TESDA NC II Reviewer. 10+ qualifications — Cookery, Caregiving, Housekeeping, Welding, Automotive at marami pa. ₱99 lang. Lifetime access." />
    <meta property="og:image" content="https://readwisebyskai.com/og-image-tesda.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:locale" content="fil_PH" />
    <meta property="og:site_name" content="Readwise by Skai" />

    <!-- Twitter / X -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="TESDA NC II Reviewer Hub — Readwise by Skai" />
    <meta name="twitter:description" content="Full HTML reviewers, video lessons, at infographics para sa 10+ TESDA NC II qualifications. ₱99 lang — lifetime access." />
    <meta name="twitter:image" content="https://readwisebyskai.com/og-image-tesda.png" />

    <!-- SEO -->
    <meta name="keywords" content="TESDA reviewer, TESDA NC II, Cookery NC II reviewer, Caregiving NC II reviewer, Housekeeping NC II reviewer, TESDA assessment reviewer Philippines, TESDA NC II bundle" />
    <meta name="author" content="Readwise by Skai" />
    <meta name="robots" content="index, follow" />

    <!-- PWA -->
    <link rel="icon" type="image/png" href="/icon-192.png" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <link rel="manifest" href="/manifest.json" />

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,800;1,400&family=Inter:wght@300;400;500;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`

    return new Response(html, {
      headers: {
        'content-type': 'text/html;charset=UTF-8',
        'cache-control': 'public, max-age=3600',
      },
    })
  }
}
