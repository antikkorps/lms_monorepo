import PDFDocument from 'pdfkit';
import type { Readable } from 'stream';

interface PdfInput {
  rows: string[];
  type: string;
  period: string;
}

const COLORS = {
  primary: '#1e40af',
  header: '#1e293b',
  text: '#334155',
  lightGray: '#f1f5f9',
  border: '#cbd5e1',
} as const;

export function generateAnalyticsPdf(input: PdfInput): Readable {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  // Header
  doc.fontSize(22).fillColor(COLORS.primary).text('Analytics Report', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor(COLORS.text)
    .text(`Type: ${input.type.charAt(0).toUpperCase() + input.type.slice(1)}  |  Period: ${input.period}  |  Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.moveDown(1);

  // Draw separator
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(COLORS.border).stroke();
  doc.moveDown(1);

  if (input.rows.length === 0) {
    doc.fontSize(12).fillColor(COLORS.text).text('No data available for this period.');
    doc.end();
    return doc as unknown as Readable;
  }

  // Parse CSV rows into table
  const headers = input.rows[0].split(',');
  const dataRows = input.rows.slice(1).map((r) => r.split(','));

  // Table layout
  const tableLeft = 50;
  const tableWidth = 495;
  const colWidth = tableWidth / headers.length;
  const rowHeight = 24;

  // Table header
  doc.rect(tableLeft, doc.y, tableWidth, rowHeight).fill(COLORS.primary);
  const headerY = doc.y + 7;
  headers.forEach((h, i) => {
    doc.fontSize(9).fillColor('#ffffff')
      .text(h.trim(), tableLeft + i * colWidth + 5, headerY, {
        width: colWidth - 10,
        align: i === 0 ? 'left' : 'right',
      });
  });
  doc.y = headerY - 7 + rowHeight;

  // Table rows
  dataRows.forEach((row, rowIndex) => {
    // Check page break
    if (doc.y + rowHeight > doc.page.height - 60) {
      doc.addPage();
    }

    const y = doc.y;
    if (rowIndex % 2 === 0) {
      doc.rect(tableLeft, y, tableWidth, rowHeight).fill(COLORS.lightGray);
    }

    row.forEach((cell, i) => {
      doc.fontSize(9).fillColor(COLORS.text)
        .text(cell.trim(), tableLeft + i * colWidth + 5, y + 7, {
          width: colWidth - 10,
          align: i === 0 ? 'left' : 'right',
        });
    });

    doc.y = y + rowHeight;
  });

  // Footer
  doc.moveDown(2);
  doc.fontSize(8).fillColor(COLORS.border)
    .text(`Total rows: ${dataRows.length}`, { align: 'right' });

  doc.end();
  return doc as unknown as Readable;
}
