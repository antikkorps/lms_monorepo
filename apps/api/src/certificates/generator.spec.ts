import { describe, it, expect } from 'vitest';
import { generateCertificate, type CertificateData } from './generator.js';

describe('Certificate Generator', () => {
  const mockCertificateData: CertificateData = {
    recipientName: 'John Doe',
    courseName: 'Introduction to Web Development',
    courseDescription: 'Learn the basics of HTML, CSS, and JavaScript',
    completionDate: new Date('2026-01-15'),
    score: 92,
    certificateId: 'CERT-ABC123',
    issuerName: 'Jane Smith',
    issuerTitle: 'Head of Education',
  };

  it('should generate a PDF buffer', async () => {
    const result = await generateCertificate(mockCertificateData);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should generate a valid PDF', async () => {
    const result = await generateCertificate(mockCertificateData);

    // PDF files start with %PDF-
    const pdfHeader = result.slice(0, 5).toString('utf-8');
    expect(pdfHeader).toBe('%PDF-');
  });

  it('should generate PDF without optional fields', async () => {
    const minimalData: CertificateData = {
      recipientName: 'Jane Doe',
      courseName: 'Basic Course',
      completionDate: new Date(),
      certificateId: 'CERT-XYZ789',
    };

    const result = await generateCertificate(minimalData);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should respect custom options', async () => {
    const result = await generateCertificate(mockCertificateData, {
      orientation: 'portrait',
      primaryColor: '#10b981',
      includeVerificationUrl: true,
      verificationBaseUrl: 'https://example.com/verify',
    });

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should generate different PDFs for different data', async () => {
    const data1: CertificateData = {
      ...mockCertificateData,
      recipientName: 'Alice',
    };

    const data2: CertificateData = {
      ...mockCertificateData,
      recipientName: 'Bob',
    };

    const pdf1 = await generateCertificate(data1);
    const pdf2 = await generateCertificate(data2);

    // PDFs should be different (different content)
    expect(pdf1.equals(pdf2)).toBe(false);
  });

  it('should handle long course names', async () => {
    const longNameData: CertificateData = {
      ...mockCertificateData,
      courseName:
        'Advanced Full-Stack Web Development with React, Node.js, PostgreSQL, and Cloud Deployment Strategies',
    };

    const result = await generateCertificate(longNameData);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle special characters in names', async () => {
    const specialCharsData: CertificateData = {
      ...mockCertificateData,
      recipientName: "François O'Brien-Müller",
      courseName: 'Développement Web & APIs',
    };

    const result = await generateCertificate(specialCharsData);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });
});
