# Wix Scraper

A Node.js-based scraper for extracting structured content from Wix websites, including:

- Headings (H1–H4)
- Paragraphs
- List items
- Images (downloaded locally)
- Page metadata
- Blog RSS content (auto-detected)

This tool is useful for website migrations, SEO cleanup, content audits, and rebuilding websites in Astro, SvelteKit, Next.js, Hugo, Eleventy, or other static frameworks.

## Features

- Automatically discovers URLs using `sitemap.xml` (supports Wix multi-sitemap format)
- Cleans Wix-specific markup for readable content extraction
- Downloads images and rewrites their references to local paths
- Extracts structured sections including headings, images, lists, and paragraphs
- Skips blog scraping gracefully if no Wix Blog exists
- Automatically creates the required output directories
- Lightweight, dependency-minimal, and easy to extend

## Requirements

- Node.js 18+
- npm or pnpm
- Basic terminal usage

## Installation

Clone the repository:

```bash
git clone https://github.com/gkennedy87/wix-scraper
cd wix-scraper
```

Install dependencies using either npm or pnpm.

### Option A — Using npm

```bash
npm install
```

### Option B — Using pnpm

Install pnpm if you don't have it:

```bash
npm install -g pnpm
```

Then install:

```bash
pnpm install
```

## Configuration

Open `scrape.js` and replace the placeholder:

```js
const BASE_URL = "https://YOUR-WIX-SITE.com";
```

The scraper will automatically:

- Load and parse the sitemap
- Follow nested sitemaps (Wix uses these frequently)
- Discover all public pages
- Attempt to scrape blog content via RSS (if present)

## Usage

Run the scraper:

```bash
node scrape.js
```

**Optional:** Add a scrape script to `package.json`

```json
{
  "scripts": {
    "scrape": "node scrape.js"
  }
}
```

Then run:

```bash
npm run scrape
```

or:

```bash
pnpm run scrape
```

## Output Structure

After running, the scraper writes structured JSON and images to the `output/` directory:

```
output/
  pages/
    home.json
    services.json
    about.json
    contact.json
  images/
    hero.webp
    lawn1.jpg
    team-photo.png
  blog/
    example-post.json   (only present if a Wix Blog exists)
```

### Example page JSON

```json
{
  "url": "https://example.com/services",
  "slug": "services",
  "title": "Our Services",
  "sections": [
    { "type": "heading", "level": 2, "text": "Lawn Care" },
    { "type": "paragraph", "text": "We provide weekly lawn mowing..." },
    { "type": "image", "src": "/images/lawn1.jpg", "alt": "Freshly cut lawn" }
  ]
}
```

## Common Use Cases

### Developers

- Migrating client sites off Wix
- Creating Markdown/MDX content collections
- Preparing data for static site rebuilds
- Integrating scraped data into Astro/Next/SvelteKit

### Marketers & SEOs

- Content inventories for rewrite projects
- SEO audits and cleanup
- Reorganizing site architecture
- Migrating content into a CMS

## Troubleshooting

### Sitemap not found

Check: `https://YOUR-WIX-SITE.com/sitemap.xml`

If rate-limited, try again.

### Blog skipped

If the site does not use Wix Blog, this is expected.

### Images missing

Wix CDN may rate-limit requests. Retry or use a VPN if necessary.

## Converting JSON to MDX (optional)

You can convert scraped JSON to MDX:

```bash
node scripts/json-to-mdx.js
```

*(This script is not included.)*

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Pull requests are welcome, especially for:

- MDX output support
- CLI flags (e.g., `--url`, `--mdx`, `--images-only`)
- URL filtering
- Performance improvements

## Support

If you discover bugs or need help, please [open an issue](https://github.com/gkennedy87/wix-scraper/issues).