// ==============================================
// Wix Content Scraper
// ==============================================
// - Supports index sitemaps (Wix standard)
// - Extracts headings, paragraphs, lists, images
// - Downloads images locally
// - Scrapes blog RSS if present
// - Automatically creates output directories
// ==============================================

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const sanitize = require("sanitize-filename");
const { parseStringPromise } = require("xml2js");

// ------------------------------------------------------------
// CONFIG
// ------------------------------------------------------------
const BASE_URL = "https://YOUR-WIX-SITE.com"; // Replace before running
const SITEMAP_URL = `${BASE_URL}/sitemap.xml`;
const BLOG_RSS = `${BASE_URL}/blog-feed.xml`;

// ------------------------------------------------------------
// Directory utilities
// ------------------------------------------------------------
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
}

// Output structure
const OUTPUT_DIR = path.join(__dirname, "output");
const PAGE_DIR = path.join(OUTPUT_DIR, "pages");
const IMG_DIR = path.join(OUTPUT_DIR, "images");
const BLOG_DIR = path.join(OUTPUT_DIR, "blog");

// Create directories on launch
ensureDir(OUTPUT_DIR);
ensureDir(PAGE_DIR);
ensureDir(IMG_DIR);
ensureDir(BLOG_DIR);

// ------------------------------------------------------------
// Download remote image
// ------------------------------------------------------------
async function downloadImage(url, filename) {
    try {
        const res = await axios.get(url, { responseType: "arraybuffer" });
        const dest = path.join(IMG_DIR, filename);
        fs.writeFileSync(dest, res.data);
        return `/images/${filename}`;
    } catch (err) {
        console.error(`Failed to download image: ${url}`);
        return null;
    }
}

// ------------------------------------------------------------
// Remove Wix-specific repeated wrapper elements
// ------------------------------------------------------------
function cleanHtml($) {
    const selectors = [
        "[class*='wixui']",
        "[id*='comp-']",
        "noscript",
        "script",
        "style",
        "svg",
        "iframe",
        "[data-mesh-id]",
        "[data-testid]",
        "[data-hook]"
    ];
    selectors.forEach(sel => $(sel).remove());
}

// ------------------------------------------------------------
// Parse page into structured content
// ------------------------------------------------------------
async function extractContent(url, html) {
    const $ = cheerio.load(html);
    cleanHtml($);

    const title =
        $("h1").first().text().trim() ||
        $("title").text().trim() ||
        "Untitled Page";

    const body = $("body");
    const sections = [];

    for (const el of body.find("h1, h2, h3, h4, p, li, img").toArray()) {
        const tag = el.tagName.toLowerCase();
        const node = $(el);

        if (["h1", "h2", "h3", "h4"].includes(tag)) {
            const text = node.text().trim();
            if (text) {
                sections.push({
                    type: "heading",
                    level: Number(tag.replace("h", "")),
                    text
                });
            }
        }

        if (tag === "p") {
            const text = node.text().trim();
            if (text) {
                sections.push({
                    type: "paragraph",
                    text
                });
            }
        }

        if (tag === "li") {
            const text = node.text().trim();
            if (text) {
                sections.push({
                    type: "list-item",
                    text
                });
            }
        }

        if (tag === "img") {
            let src = node.attr("src");
            const alt = node.attr("alt") || "";

            if (src && src.startsWith("//")) {
                src = "https:" + src;
            }

            if (src) {
                const cleanName = sanitize(path.basename(src.split("?")[0]));
                const localPath = await downloadImage(src, cleanName);

                sections.push({
                    type: "image",
                    src: localPath,
                    alt
                });
            }
        }
    }

    return { title, sections };
}

// ------------------------------------------------------------
// Save to JSON
// ------------------------------------------------------------
function saveStructuredJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Saved: ${filePath}`);
}

// ------------------------------------------------------------
// Sitemap loader (handles both urlset + sitemapindex)
// ------------------------------------------------------------
async function getSitemapUrls() {
    const xml = (await axios.get(SITEMAP_URL)).data;
    const parsed = await parseStringPromise(xml);
    const allUrls = [];

    if (parsed.urlset && parsed.urlset.url) {
        return parsed.urlset.url.map(u => u.loc[0]);
    }

    if (parsed.sitemapindex && parsed.sitemapindex.sitemap) {
        const submaps = parsed.sitemapindex.sitemap.map(s => s.loc[0]);

        for (const sm of submaps) {
            console.log(`Fetching sub-sitemap: ${sm}`);
            const subXml = (await axios.get(sm)).data;
            const subParsed = await parseStringPromise(subXml);

            if (subParsed.urlset && subParsed.urlset.url) {
                allUrls.push(...subParsed.urlset.url.map(u => u.loc[0]));
            }
        }
        return allUrls;
    }

    throw new Error("No valid sitemap format detected.");
}

// ------------------------------------------------------------
// Scrape a single page
// ------------------------------------------------------------
async function scrapePage(url) {
    try {
        const html = (await axios.get(url)).data;
        const { title, sections } = await extractContent(url, html);

        const slug = sanitize(
            url.replace(BASE_URL, "").replace(/^\/|\/$/g, "") || "home"
        );

        saveStructuredJSON(path.join(PAGE_DIR, `${slug}.json`), {
            url,
            slug,
            title,
            sections
        });
    } catch (err) {
        console.error(`Error scraping ${url}: ${err.message}`);
    }
}

// ------------------------------------------------------------
// Attempt to scrape blog RSS (ignore if missing)
// ------------------------------------------------------------
async function scrapeBlog() {
    try {
        const rss = (await axios.get(BLOG_RSS)).data;
        const parsed = await parseStringPromise(rss);

        if (!parsed.rss || !parsed.rss.channel) {
            throw new Error("Invalid RSS format");
        }

        const posts = parsed.rss.channel[0].item || [];

        for (const post of posts) {
            const title = post.title[0];
            const url = post.link[0];
            const description = post.description ? post.description[0] : "";
            const pubDate = post.pubDate ? post.pubDate[0] : "";

            const slug = sanitize(title.toLowerCase().replace(/\s+/g, "-"));

            saveStructuredJSON(path.join(BLOG_DIR, `${slug}.json`), {
                title,
                url,
                description,
                pubDate
            });
        }

        console.log("Blog scraped successfully.");
    } catch {
        console.log("No blog detected. Skipping blog scraping.");
    }
}

// ------------------------------------------------------------
// MAIN
// ------------------------------------------------------------
async function run() {
    console.log("Loading sitemap...");

    const urls = await getSitemapUrls();
    console.log(`Found ${urls.length} URLs`);

    for (const url of urls) {
        console.log(`Scraping: ${url}`);
        await scrapePage(url);
        await new Promise(r => setTimeout(r, 250));
    }

    console.log("Checking for blog...");
    await scrapeBlog();

    console.log("Scraping complete. Check the output folder.");
}

run();
