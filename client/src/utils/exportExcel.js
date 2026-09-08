/** Escape a value for SpreadsheetML / Excel XML. */
function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build and download an Excel-compatible .xls file (SpreadsheetML).
 * No third-party dependency — opens in Microsoft Excel / LibreOffice.
 */
export function downloadExcel(filename, rows, sheetName = 'Sheet1') {
  if (!rows?.length) return;

  const headers = Object.keys(rows[0]);
  const headerCells = headers
    .map((h) => `<Cell><Data ss:Type="String">${xmlEscape(h)}</Data></Cell>`)
    .join('');

  const bodyRows = rows
    .map((row) => {
      const cells = headers
        .map((key) => {
          const raw = row[key];
          const isNumber =
            typeof raw === 'number' && Number.isFinite(raw);
          const type = isNumber ? 'Number' : 'String';
          const text = isNumber ? String(raw) : xmlEscape(raw ?? '');
          return `<Cell><Data ss:Type="${type}">${text}</Data></Cell>`;
        })
        .join('');
      return `<Row>${cells}</Row>`;
    })
    .join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="${xmlEscape(sheetName)}">
  <Table>
   <Row>${headerCells}</Row>
   ${bodyRows}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  link.href = url;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
