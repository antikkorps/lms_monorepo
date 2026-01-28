/**
 * Certificate PDF Generator
 *
 * Generates completion certificates for courses using PDFKit
 */

import PDFDocument from 'pdfkit';

export interface CertificateData {
  // Recipient
  recipientName: string;

  // Course info
  courseName: string;
  courseDescription?: string;

  // Completion details
  completionDate: Date;
  score?: number; // Optional: quiz score percentage

  // Certificate metadata
  certificateId: string;
  issuerName?: string;
  issuerTitle?: string;
}

export interface CertificateOptions {
  /** Page orientation */
  orientation?: 'landscape' | 'portrait';
  /** Primary color (hex) */
  primaryColor?: string;
  /** Include QR code for verification */
  includeVerificationUrl?: boolean;
  /** Base URL for verification */
  verificationBaseUrl?: string;
}

const DEFAULT_OPTIONS: CertificateOptions = {
  orientation: 'landscape',
  primaryColor: '#6366f1', // Indigo
  includeVerificationUrl: false,
  verificationBaseUrl: 'https://lms-platform.com/verify',
};

/**
 * Generate a PDF certificate
 * Returns a Buffer containing the PDF data
 */
export async function generateCertificate(
  data: CertificateData,
  options: CertificateOptions = {}
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    try {
      const chunks: Buffer[] = [];

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        layout: opts.orientation,
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `Certificate - ${data.courseName}`,
          Author: 'LMS Platform',
          Subject: `Course Completion Certificate for ${data.recipientName}`,
          Keywords: 'certificate, course, completion',
          Creator: 'LMS Platform',
        },
      });

      // Collect chunks
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Get page dimensions
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const centerX = pageWidth / 2;

      // Draw decorative border
      drawBorder(doc, pageWidth, pageHeight, opts.primaryColor!);

      // Header decoration
      drawHeaderDecoration(doc, pageWidth, opts.primaryColor!);

      // Certificate title
      doc
        .font('Helvetica-Bold')
        .fontSize(36)
        .fillColor(opts.primaryColor!)
        .text('CERTIFICATE', 0, 80, { align: 'center', width: pageWidth });

      doc
        .font('Helvetica')
        .fontSize(18)
        .fillColor('#64748b')
        .text('OF COMPLETION', 0, 125, { align: 'center', width: pageWidth });

      // Decorative line
      doc
        .moveTo(centerX - 100, 160)
        .lineTo(centerX + 100, 160)
        .strokeColor(opts.primaryColor!)
        .lineWidth(2)
        .stroke();

      // "This is to certify that"
      doc
        .font('Helvetica')
        .fontSize(14)
        .fillColor('#64748b')
        .text('This is to certify that', 0, 190, { align: 'center', width: pageWidth });

      // Recipient name
      doc
        .font('Helvetica-Bold')
        .fontSize(32)
        .fillColor('#1e293b')
        .text(data.recipientName, 0, 220, { align: 'center', width: pageWidth });

      // Decorative line under name
      const nameWidth = doc.widthOfString(data.recipientName);
      doc
        .moveTo(centerX - nameWidth / 2 - 20, 260)
        .lineTo(centerX + nameWidth / 2 + 20, 260)
        .strokeColor('#cbd5e1')
        .lineWidth(1)
        .stroke();

      // "has successfully completed"
      doc
        .font('Helvetica')
        .fontSize(14)
        .fillColor('#64748b')
        .text('has successfully completed the course', 0, 280, { align: 'center', width: pageWidth });

      // Course name
      doc
        .font('Helvetica-Bold')
        .fontSize(24)
        .fillColor(opts.primaryColor!)
        .text(data.courseName, 50, 310, { align: 'center', width: pageWidth - 100 });

      // Score (if provided)
      if (data.score !== undefined) {
        doc
          .font('Helvetica')
          .fontSize(14)
          .fillColor('#64748b')
          .text(`with a score of ${data.score}%`, 0, 350, { align: 'center', width: pageWidth });
      }

      // Completion date
      const formattedDate = formatDate(data.completionDate);
      doc
        .font('Helvetica')
        .fontSize(12)
        .fillColor('#64748b')
        .text(`Completed on ${formattedDate}`, 0, 380, { align: 'center', width: pageWidth });

      // Footer section with signatures
      const footerY = pageHeight - 120;

      // Left signature (Issuer)
      if (data.issuerName) {
        doc
          .font('Helvetica-Bold')
          .fontSize(12)
          .fillColor('#1e293b')
          .text(data.issuerName, 80, footerY, { width: 200, align: 'center' });

        doc
          .moveTo(80, footerY - 5)
          .lineTo(280, footerY - 5)
          .strokeColor('#cbd5e1')
          .lineWidth(1)
          .stroke();

        if (data.issuerTitle) {
          doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor('#64748b')
            .text(data.issuerTitle, 80, footerY + 15, { width: 200, align: 'center' });
        }
      }

      // Right side - Certificate ID
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#94a3b8')
        .text(`Certificate ID: ${data.certificateId}`, pageWidth - 280, footerY, {
          width: 200,
          align: 'center',
        });

      // Platform branding
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#94a3b8')
        .text('LMS Platform', pageWidth - 280, footerY + 15, { width: 200, align: 'center' });

      // Verification URL (if enabled)
      if (opts.includeVerificationUrl && opts.verificationBaseUrl) {
        const verifyUrl = `${opts.verificationBaseUrl}/${data.certificateId}`;
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor('#94a3b8')
          .text(`Verify at: ${verifyUrl}`, 0, pageHeight - 40, { align: 'center', width: pageWidth });
      }

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Draw decorative border around the certificate
 */
function drawBorder(doc: PDFKit.PDFDocument, width: number, height: number, color: string): void {
  const margin = 30;
  const borderWidth = 3;

  // Outer border
  doc
    .rect(margin, margin, width - margin * 2, height - margin * 2)
    .strokeColor(color)
    .lineWidth(borderWidth)
    .stroke();

  // Inner border (thinner)
  doc
    .rect(margin + 10, margin + 10, width - margin * 2 - 20, height - margin * 2 - 20)
    .strokeColor(color)
    .lineWidth(1)
    .stroke();
}

/**
 * Draw decorative header element
 */
function drawHeaderDecoration(doc: PDFKit.PDFDocument, width: number, color: string): void {
  const centerX = width / 2;

  // Draw a simple decorative element (circle pattern)
  doc.circle(centerX, 50, 20).fillColor(color).fill();
  doc.circle(centerX - 35, 50, 8).fillColor(color).fill();
  doc.circle(centerX + 35, 50, 8).fillColor(color).fill();
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default { generateCertificate };
