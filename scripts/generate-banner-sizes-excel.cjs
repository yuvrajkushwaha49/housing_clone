const fs = require('fs');

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sheetXml(sheetName, rows) {
  const headers = Object.keys(rows[0]);
  const headerCells = headers
    .map((h) => `<Cell><Data ss:Type="String">${xmlEscape(h)}</Data></Cell>`)
    .join('');
  const bodyRows = rows
    .map((row) => {
      const cells = headers
        .map((key) => {
          const raw = row[key];
          const isNumber = typeof raw === 'number' && Number.isFinite(raw);
          const type = isNumber ? 'Number' : 'String';
          const text = isNumber ? String(raw) : xmlEscape(raw ?? '');
          return `<Cell><Data ss:Type="${type}">${text}</Data></Cell>`;
        })
        .join('');
      return `<Row>${cells}</Row>`;
    })
    .join('');
  return `<Worksheet ss:Name="${xmlEscape(sheetName)}"><Table><Row>${headerCells}</Row>${bodyRows}</Table></Worksheet>`;
}

const heroRows = [
  {
    Category: 'Hero Banner',
    Tab: 'Buy',
    File: 'buy_hero_bg.png',
    Source_Width_px: 2880,
    Source_Height_px: 972,
    File_Size_KB: 859,
    Aspect_Ratio: 'Approx 3:1',
    Desktop_Display: 'Full viewport width x ~544-560px tall (header 64px + hero min-height 480px)',
    Mobile_Display: 'Full width x ~340-400px tall; background-position more to the right (78%)',
    Notes: 'Active Buy tab masthead background (header + hero)',
  },
  {
    Category: 'Hero Banner',
    Tab: 'Rent',
    File: 'rent_bg_hero.png',
    Source_Width_px: 2880,
    Source_Height_px: 972,
    File_Size_KB: 735,
    Aspect_Ratio: 'Approx 3:1',
    Desktop_Display: 'Full viewport width x ~544-560px tall',
    Mobile_Display: 'Full width x ~340-400px tall',
    Notes: 'Rent tab masthead background',
  },
  {
    Category: 'Hero Banner',
    Tab: 'Commercial',
    File: 'commercial_hero_section.png',
    Source_Width_px: 2880,
    Source_Height_px: 1020,
    File_Size_KB: 847,
    Aspect_Ratio: 'Approx 2.8:1',
    Desktop_Display: 'Full viewport width x ~544-560px tall',
    Mobile_Display: 'Full width x ~340-400px tall',
    Notes: 'Commercial tab masthead background',
  },
  {
    Category: 'Hero Banner',
    Tab: 'PG/Co-Living',
    File: 'pg_hero_bg.png',
    Source_Width_px: 2880,
    Source_Height_px: 1326,
    File_Size_KB: 917,
    Aspect_Ratio: 'Approx 2.2:1',
    Desktop_Display: 'Full viewport width x ~544-560px tall',
    Mobile_Display: 'Full width x ~340-400px tall',
    Notes: 'PG tab masthead background (taller source)',
  },
  {
    Category: 'Hero Banner',
    Tab: 'Plots',
    File: 'plots_hero_bg.png',
    Source_Width_px: 2880,
    Source_Height_px: 972,
    File_Size_KB: 2616,
    Aspect_Ratio: 'Approx 3:1',
    Desktop_Display: 'Full viewport width x ~544-560px tall',
    Mobile_Display: 'Full width x ~340-400px tall',
    Notes: 'Plots tab masthead background',
  },
  {
    Category: 'Unused / Legacy',
    Tab: '—',
    File: 'hero_bg.png',
    Source_Width_px: 2880,
    Source_Height_px: 972,
    File_Size_KB: 859,
    Aspect_Ratio: 'Approx 3:1',
    Desktop_Display: 'Not used on home currently',
    Mobile_Display: 'Not used on home currently',
    Notes: 'Replaced by buy_hero_bg.png for Buy tab',
  },
  {
    Category: 'Unused / Legacy',
    Tab: '—',
    File: 'hero.png',
    Source_Width_px: 343,
    Source_Height_px: 361,
    File_Size_KB: 13,
    Aspect_Ratio: 'Approx 1:1',
    Desktop_Display: 'Not used on home currently',
    Mobile_Display: 'Not used on home currently',
    Notes: 'Old asset; not wired to current hero',
  },
];

const brandRows = [
  {
    Category: 'Brand Logo',
    Place: 'Header (housing)',
    File: 'w_logo.png',
    Source_Width_px: 911,
    Source_Height_px: 247,
    File_Size_KB: 71,
    Desktop_Display: 'Height 46px, max-width ~210px',
    Mobile_Display: 'Height 38px, max-width ~168px / 42vw',
    Notes: 'Workians Realty wordmark',
  },
  {
    Category: 'Brand Logo',
    Place: 'Panel / Sidebar expanded',
    File: 'w_logo.png',
    Source_Width_px: 911,
    Source_Height_px: 247,
    File_Size_KB: 71,
    Desktop_Display: 'Height 40px, max-width ~190px',
    Mobile_Display: 'Same',
    Notes: '',
  },
  {
    Category: 'Brand Logo',
    Place: 'Auth pages',
    File: 'w_logo.png',
    Source_Width_px: 911,
    Source_Height_px: 247,
    File_Size_KB: 71,
    Desktop_Display: 'Height 52px, max-width ~240px',
    Mobile_Display: 'Scales with viewport',
    Notes: '',
  },
  {
    Category: 'Brand Logo',
    Place: 'Footer',
    File: 'w_logo.png',
    Source_Width_px: 911,
    Source_Height_px: 247,
    File_Size_KB: 71,
    Desktop_Display: 'Height 36px, max-width ~160px',
    Mobile_Display: 'Same',
    Notes: '',
  },
  {
    Category: 'Brand Icon',
    Place: 'Favicon / apple-touch',
    File: 'w_icon.png',
    Source_Width_px: 32,
    Source_Height_px: 32,
    File_Size_KB: 2,
    Desktop_Display: 'Browser default (16-32px)',
    Mobile_Display: 'Browser / home screen icon',
    Notes: 'Also copied to public/favicon.png',
  },
  {
    Category: 'Brand Icon',
    Place: 'UI default',
    File: 'w_icon.png',
    Source_Width_px: 32,
    Source_Height_px: 32,
    File_Size_KB: 2,
    Desktop_Display: '34 x 34 px',
    Mobile_Display: '34 x 34 px',
    Notes: '',
  },
  {
    Category: 'Brand Icon',
    Place: 'Sidebar collapsed',
    File: 'w_icon.png',
    Source_Width_px: 32,
    Source_Height_px: 32,
    File_Size_KB: 2,
    Desktop_Display: '40 x 40 px',
    Mobile_Display: '40 x 40 px',
    Notes: '',
  },
  {
    Category: 'Brand Icon',
    Place: 'Verify email (large)',
    File: 'w_icon.png',
    Source_Width_px: 32,
    Source_Height_px: 32,
    File_Size_KB: 2,
    Desktop_Display: '48 x 48 px',
    Mobile_Display: '48 x 48 px',
    Notes: '',
  },
];

const sectionRows = [
  {
    Category: 'Dynamic Section Image',
    Section: 'Top picks main',
    Source: 'API project primaryImage',
    Desktop_Display: 'Height ~420px (up to ~720px on large screens)',
    Mobile_Display: 'Responsive height within carousel',
    Aspect_Ratio: 'Cover / object-fit cover',
    Notes: 'Not a static asset file',
  },
  {
    Category: 'Dynamic Section Image',
    Section: 'Property / Project cards',
    Source: 'API listing/project images',
    Desktop_Display: '16:10 card image; ~4 columns grid',
    Mobile_Display: '16:10; horizontal scroll cards ~78% width, max ~300px',
    Aspect_Ratio: '16:10',
    Notes: 'Not a static asset file',
  },
];

const guideRows = [
  {
    Topic: 'Recommended hero banner export',
    Detail: '2880 x 972 px (approx 3:1). Keep focal subject on the RIGHT; left side calmer for headline + search.',
  },
  {
    Topic: 'Recommended logo export',
    Detail: 'About 900 x 250 px wide lockup. Displayed at 38-46px tall in header.',
  },
  {
    Topic: 'Recommended icon export',
    Detail: 'Square; source ideally 128 x 128 (or at least 64 x 64). Shown at 32-48px.',
  },
  {
    Topic: 'Hero display behavior',
    Detail: 'background-size: cover — fills width; top/bottom may crop. Height is fluid (min-height), not a fixed crop box.',
  },
  {
    Topic: 'Desktop hero area',
    Detail: 'Full viewport width x roughly 544-560px (64px header + ~480px hero).',
  },
  {
    Topic: 'Mobile hero area',
    Detail: 'Full width x roughly 340-400px; background shifts toward right.',
  },
];

const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
${sheetXml('Hero Banners', heroRows)}
${sheetXml('Brand Logo Icon', brandRows)}
${sheetXml('Dynamic Sections', sectionRows)}
${sheetXml('Design Guide', guideRows)}
</Workbook>`;

const out = 'd:/Yuvi/React_App/hous/Workians_Home_Banners_Images.xls';
fs.writeFileSync(out, xml, 'utf8');
console.log('Wrote', out);
