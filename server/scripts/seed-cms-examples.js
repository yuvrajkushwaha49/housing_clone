/**
 * One-off / repeatable seed: example News & Guides (blogs) + news with cover images.
 * Usage: node scripts/seed-cms-examples.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const uploadRoot = path.resolve(__dirname, '../../uploads');
const cmsDir = path.join(uploadRoot, 'cms');

const EXAMPLES = [
  {
    kind: 'blog',
    slug: 'first-time-home-buyer-checklist',
    title: 'First-time home buyer checklist',
    excerpt: 'Documents, budget tips, and site-visit questions before you book a flat.',
    body: `<p>Buying your first home is exciting — and easier with a clear checklist.</p>
<ul>
<li><strong>Budget</strong> — fix an all-in budget including stamp duty, registration, and interiors.</li>
<li><strong>Loan pre-approval</strong> — get a sanction letter so negotiations are realistic.</li>
<li><strong>Documents</strong> — ask for title deed, approvals, and occupancy certificate where applicable.</li>
<li><strong>Site visit</strong> — check light, ventilation, parking, water pressure, and neighbourhood noise.</li>
<li><strong>Compare</strong> — shortlist 3 options on Workians before you pay a token.</li>
</ul>
<p>Ready to explore? Start with verified listings in your city on Workians.</p>`,
    colors: ['#3b2d7e', '#7c6bc4'],
    label: 'Buyer Guide',
  },
  {
    kind: 'blog',
    slug: 'how-to-verify-a-builder-project',
    title: 'How to verify a builder project',
    excerpt: 'RERA, amenities, delivery timelines — what to check before you invest.',
    body: `<p>Before you book a under-construction or ready project, verify these basics:</p>
<ol>
<li><strong>RERA registration</strong> — confirm the project ID and promoter details.</li>
<li><strong>Approvals</strong> — layout plans, fire NOC, and environmental clearances where required.</li>
<li><strong>Delivery track record</strong> — past projects of the same builder.</li>
<li><strong>Amenities vs maintenance</strong> — clubhouse and pool look great; ask for monthly costs.</li>
<li><strong>Unit inventory</strong> — carpet area, facing, floor plan, and parking allotment.</li>
</ol>
<p>On Workians, open the project page, review galleries and units, then contact the seller with confidence.</p>`,
    colors: ['#1f4e5f', '#4aa3a8'],
    label: 'Project Tips',
  },
  {
    kind: 'blog',
    slug: 'renting-vs-buying-in-2026',
    title: 'Renting vs buying in 2026',
    excerpt: 'A practical comparison so you can choose what fits your city and career stage.',
    body: `<p>There is no one answer — it depends on how long you will stay, interest rates, and local rents.</p>
<p><strong>Rent if</strong> you may relocate in 2–3 years, or you need flexibility while you save a larger down payment.</p>
<p><strong>Buy if</strong> you have stable income, a city you plan to stay in, and EMI is comfortable after essentials.</p>
<p>Use Workians to compare sale and rent listings side by side in the same locality before you decide.</p>`,
    colors: ['#5a2d3a', '#c4785a'],
    label: 'Market Guide',
  },
  {
    kind: 'news',
    slug: 'workians-news-guides-live',
    title: 'News & Guides is live on Workians',
    excerpt: 'Tips for buyers, sellers, and investors — now on the home page and /blog.',
    body: `<p>Workians now publishes News &amp; Guides to help you make clearer property decisions.</p>
<p>Find short checklists, market explainers, and how-tos on the home page and at <strong>/blog</strong>. Operators can add more from the CMS panel anytime.</p>`,
    colors: ['#2d235f', '#5d519b'],
    label: 'Announcement',
  },
];

function uuid() {
  return crypto.randomUUID();
}

async function makeCover({ slug, title, colors, label }) {
  fs.mkdirSync(cmsDir, { recursive: true });
  const filename = `${Date.now()}-${slug}.webp`;
  const outPath = path.join(cmsDir, filename);
  const [c1, c2] = colors;
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const svg = `
<svg width="1200" height="750" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="750" fill="url(#g)"/>
  <circle cx="980" cy="120" r="180" fill="rgba(255,255,255,0.08)"/>
  <circle cx="180" cy="620" r="220" fill="rgba(0,0,0,0.12)"/>
  <text x="72" y="120" fill="rgba(255,255,255,0.85)" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="600">${label}</text>
  <text x="72" y="360" fill="#ffffff" font-family="Georgia, serif" font-size="54" font-weight="700">${safeTitle}</text>
  <text x="72" y="680" fill="rgba(255,255,255,0.75)" font-family="Segoe UI, Arial, sans-serif" font-size="26">Workians</text>
</svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile(outPath);
  return `cms/${filename}`;
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hous_db',
  });

  const [authors] = await connection.query(
    `SELECT id FROM users WHERE deleted_at IS NULL ORDER BY id ASC LIMIT 1`
  );
  const authorId = authors[0]?.id || null;

  let created = 0;
  for (const item of EXAMPLES) {
    const table = item.kind === 'news' ? 'news' : 'blogs';
    const [existing] = await connection.query(
      `SELECT id FROM ${table} WHERE slug = ? AND deleted_at IS NULL LIMIT 1`,
      [item.slug]
    );
    if (existing.length) {
      console.log(`skip  ${item.slug} (already exists)`);
      continue;
    }
    const cover = await makeCover(item);
    await connection.query(
      `INSERT INTO ${table}
        (uuid, slug, title, excerpt, body, cover_image, author_id, status, meta_title, meta_description, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, NOW())`,
      [
        uuid(),
        item.slug,
        item.title,
        item.excerpt,
        item.body,
        cover,
        authorId,
        `${item.title} | Workians`,
        item.excerpt,
      ]
    );
    created += 1;
    console.log(`added ${item.kind}  ${item.slug}`);
  }

  await connection.end();
  console.log(`Done. Created ${created} item(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
