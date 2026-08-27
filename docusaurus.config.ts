import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

// The canonical, public URL the site is served from. Used for canonical tags,
// sitemap.xml, robots.txt and Open Graph / structured-data URLs. Keep this in
// sync with the domain that actually serves the site in Vercel.
//
// ⚠️ SEO NOTE: if you ever move to a custom domain (e.g. docs.photongrid.dev),
// update this immediately AND add a redirect from the old Vercel domain, or
// you will split link equity and create duplicate-content issues.
const SITE_URL = 'https://photon-grid-docs.vercel.app';

// Paste the token from Google Search Console → "HTML tag" verification here
// (just the content value). This is now the single source of truth for the
// verification tag — it used to also be hardcoded in themeConfig.metadata,
// which meant two conflicting <meta name="google-site-verification"> tags
// could ship at once. Never duplicate this elsewhere.
const GOOGLE_SITE_VERIFICATION = 'ZPEag-Qaae5HpUIk7ee7dowgHVtKVBv-3_FgLOY6w8A';

// Absolute canonical share image, used for both og:image and twitter:image.
// SVG is NOT reliably rendered by social crawlers (Facebook/LinkedIn/Slack/X
// mostly ignore SVG og:images). Use a real raster image at the recommended
// 1200x630 social-card size. Replace the file at static/img/social-card.png
// with your actual artwork; the URL below just needs to keep pointing at it.
const SOCIAL_CARD_IMAGE = `${SITE_URL}/img/social-card.png`;

const config: Config = {
  title: 'Photon Grid',
  titleDelimiter: '|',
  tagline: 'The high-performance JavaScript data grid for React, Angular, Vue and vanilla JS — sorting, filtering, grouping, editing, charting and theming.',
  favicon: 'img/logo.svg',

  // Brand webfont (Inter) for the docs theme. Falls back to system-ui offline.
  stylesheets: [
    {href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap', rel: 'stylesheet'},
  ],

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: SITE_URL,
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // Emit URLs without a trailing slash so canonicals, sitemap and the URLs
  // Google indexes all agree (avoids duplicate-content ambiguity on Vercel).
  trailingSlash: false,

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'photon-grid', // Usually your GitHub org/user name.
  projectName: 'photon-grid-docs', // Usually your repo name.

  // SEO: broken internal links (bad hrefs, dead anchors) hurt both crawl
  // budget and user trust signals. 'warn' lets them silently ship to prod.
  // Now that the footer/navbar links below have been fixed, fail the build
  // instead of shipping broken links.
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',

  // Runs early on the client. Debounces ResizeObserver callbacks to a frame so
  // the benign "ResizeObserver loop" warning never fires (webpack-dev-server
  // otherwise shows it as a red error overlay).
  clientModules: ['./src/client/resize-observer-fix.ts'],

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  // <head> injections for SEO: structured data (JSON-LD) so Google can show a
  // rich result for "Photon Grid", plus Search Console verification.
  headTags: [
    {
      tagName: 'script',
      attributes: {type: 'application/ld+json'},
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Photon Grid',
        alternateName: 'Photon Grid — JavaScript Data Grid',
        url: SITE_URL,
        description:
          'Photon Grid is a fast, feature-rich JavaScript data grid for React, Angular, Vue and vanilla JS with sorting, filtering, grouping, editing, integrated charts and theming.',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/docs?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      }),
    },
    {
      tagName: 'script',
      attributes: {type: 'application/ld+json'},
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Photon Grid',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Web, Windows, macOS, Linux',
        description:
          'A high-performance, zero-dependency JavaScript data grid with virtual scrolling, sorting, filtering, grouping, cell editing, pagination, integrated charts, sparklines and theming. Official wrappers for React, Angular and Vue.',
        url: SITE_URL,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        softwareVersion: '2.0.1',
        author: {
          '@type': 'Person',
          name: 'Abdul Wahid',
        },
      }),
    },
    // New: Organization schema. Helps Google associate the logo with the
    // brand for knowledge-panel / sitelinks-searchbox eligibility.
    {
      tagName: 'script',
      attributes: {type: 'application/ld+json'},
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Photon Grid',
        url: SITE_URL,
        logo: `${SITE_URL}/img/logo.svg`,
      }),
    },
    // Google Search Console verification — single source of truth, driven by
    // the GOOGLE_SITE_VERIFICATION constant above.
    ...(GOOGLE_SITE_VERIFICATION
      ? [
          {
            tagName: 'meta',
            attributes: {
              name: 'google-site-verification',
              content: GOOGLE_SITE_VERIFICATION,
            },
          },
        ]
      : []),
    // Explicit robots directive at the head level (belt-and-suspenders with
    // static/robots.txt — see note at bottom of file).
    {
      tagName: 'meta',
      attributes: {
        name: 'robots',
        content: 'index, follow, max-image-preview:large',
      },
    },
  ],

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
          showLastUpdateTime: true,
          // Lets crawlers/users jump straight to the source on GitHub —
          // also a mild trust/E-E-A-T signal. Point this at your real repo.
          editUrl: 'https://github.com/photon-grid/photon-grid-docs/edit/main/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**', '/search'],
          filename: 'sitemap.xml',
        },
        // Generates a Google-Analytics-friendly, SEO-correct gtag setup only
        // if you actually have an ID — no-op otherwise. Uncomment and set a
        // real measurement ID if/when you add analytics.
        // gtag: {
        //   trackingID: 'G-XXXXXXXXXX',
        //   anonymizeIP: true,
        // },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Social/share card (og:image, twitter image). Use a real PNG, not SVG —
    // most social crawlers won't render SVG previews. See SOCIAL_CARD_IMAGE.
    image: 'img/social-card.png',
    metadata: [
      {
        name: 'keywords',
        content:
          'photon grid, photongrid, javascript data grid, js data grid, react data grid, angular data grid, vue data grid, data table, sorting, filtering, grouping, cell editing, pagination, integrated charts, sparklines, theming, virtual scrolling, ag grid alternative',
      },
      {
        name: 'description',
        content:
          'Photon Grid is a fast, feature-rich JavaScript data grid for React, Angular, Vue and vanilla JS with sorting, filtering, grouping, editing, selection, pagination, integrated charts, sparklines and theming.',
      },
      {name: 'author', content: 'Abdul Wahid'},

      // Open Graph — was missing image dimensions and locale, both of which
      // Facebook/LinkedIn use to pick the right crop and avoid a slow
      // "fetching preview" delay.
      {property: 'og:type', content: 'website'},
      {property: 'og:site_name', content: 'Photon Grid'},
      {property: 'og:title', content: 'Photon Grid — JavaScript Data Grid for React, Angular & Vue'},
      {
        property: 'og:description',
        content:
          'Fast, zero-dependency JavaScript data grid with sorting, filtering, grouping, editing, integrated charts and theming. Official React, Angular and Vue wrappers.',
      },
      {property: 'og:url', content: SITE_URL},
      {property: 'og:image', content: SOCIAL_CARD_IMAGE},
      {property: 'og:image:width', content: '1200'},
      {property: 'og:image:height', content: '630'},
      {property: 'og:image:alt', content: 'Photon Grid — JavaScript data grid'},
      {property: 'og:locale', content: 'en_US'},

      // Twitter/X card — previously only twitter:card was set, so X fell
      // back to whatever og: tags happened to match, which is unreliable.
      {name: 'twitter:card', content: 'summary_large_image'},
      {name: 'twitter:title', content: 'Photon Grid — JavaScript Data Grid'},
      {
        name: 'twitter:description',
        content:
          'Fast, feature-rich JavaScript data grid for React, Angular, Vue and vanilla JS.',
      },
      {name: 'twitter:image', content: SOCIAL_CARD_IMAGE},

      // Note: the old hardcoded google-site-verification meta entry was
      // removed from here — it's now emitted once, from headTags above,
      // driven by the GOOGLE_SITE_VERIFICATION constant.
    ],
    colorMode: {
      respectPrefersColorScheme: true,
    },
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
    },
    navbar: {
      title: 'Photon Grid',
      logo: {
        alt: 'Photon Grid Logo',
        src: 'img/logo.svg',
      },
      items: [
        {to: '/demos', label: 'Demos', position: 'left'},
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {to: '/api', label: 'API', position: 'left'},
        {to: '/blog', label: 'Blog', position: 'left'},
        {to: '/contact', label: 'Contact Us', position: 'left'},
        {
          href: 'https://www.npmjs.com/package/photon-grid-core',
          label: 'npm',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Quick Start',
              to: '/docs/getting-started/introduction',
            },
            {
              label: 'Columns',
              to: '/docs/columns/column-headers',
            },
            {
              label: 'Charting',
              to: '/docs/charting/overview',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'npm package',
              href: 'https://www.npmjs.com/package/photon-grid-core',
            },
            {
              label: 'Blog',
              to: '/blog',
            },
            // Fixed: these two previously pointed at /blog instead of the
            // actual pages. Mislabeled internal links confuse both users
            // and crawlers about page purpose/anchor-text relevance.
            {
              label: 'API',
              to: '/api',
            },
            {
              label: 'Contact',
              to: '/contact',
            },
          ],
        },
        {
          title: 'Sites',
          items: [
            // Fixed: was pointing at the npm URL under a "Github" label —
            // wrong destination for the anchor text, which is both a UX
            // problem and a minor relevance/trust signal issue for crawlers.
            // Replace with your real GitHub org/repo URL.
            {
              label: 'Github',
              href: 'https://github.com/photon-grid/photon-grid-core',
            },
            {
              label: 'LinkedIn',
              href: 'https://www.linkedin.com/company/photon-grid',
            },
            // Fixed: Youtube, Facebook and X previously linked to /blog,
            // which is a broken/misleading destination for those labels.
            // They're removed here rather than left dangling — add them
            // back with real profile URLs once those accounts exist.
            // {label: 'Youtube', href: 'https://youtube.com/@photon-grid'},
            // {label: 'Facebook', href: 'https://facebook.com/photon-grid'},
            // {label: 'X', href: 'https://x.com/photon_grid'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Photon Grid.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

// ─────────────────────────────────────────────────────────────────────────
// ONE THING THIS FILE CAN'T FIX: static/robots.txt
// Docusaurus's classic-preset `sitemap` option only emits sitemap.xml — it
// does NOT generate a robots.txt. Make sure you have a
// `static/robots.txt` containing at least:
//
//   User-agent: *
//   Allow: /
//   Sitemap: https://photon-grid-docs.vercel.app/sitemap.xml
//
// Without it, crawlers have no explicit pointer to your sitemap and no
// explicit "allow all" — most will still crawl fine, but this is a standard
// checklist item for a 10/10 technical-SEO audit. Also confirm
// static/img/social-card.png (1200x630 PNG) actually exists — it's
// referenced above but wasn't in the original config.
// ─────────────────────────────────────────────────────────────────────────