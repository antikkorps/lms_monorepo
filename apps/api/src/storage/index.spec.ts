import { describe, it, expect } from 'vitest';
import { validateFile } from './storage.interface.js';

describe('validateFile', () => {
  it('should validate image files correctly', () => {
    const validImage = { mimetype: 'image/jpeg', size: 1024, originalname: 'test.jpg' };
    expect(validateFile(validImage, 'image').valid).toBe(true);

    const invalidType = { mimetype: 'application/pdf', size: 1024, originalname: 'test.pdf' };
    expect(validateFile(invalidType, 'image').valid).toBe(false);

    const tooLarge = { mimetype: 'image/jpeg', size: 20 * 1024 * 1024, originalname: 'test.jpg' };
    expect(validateFile(tooLarge, 'image').valid).toBe(false);
  });

  it('should validate video files correctly', () => {
    const validVideo = { mimetype: 'video/mp4', size: 100 * 1024 * 1024, originalname: 'test.mp4' };
    expect(validateFile(validVideo, 'video').valid).toBe(true);

    const invalidType = { mimetype: 'image/jpeg', size: 1024, originalname: 'test.jpg' };
    expect(validateFile(invalidType, 'video').valid).toBe(false);

    // Video can be up to 2GB
    const largeVideo = { mimetype: 'video/mp4', size: 1.5 * 1024 * 1024 * 1024, originalname: 'test.mp4' };
    expect(validateFile(largeVideo, 'video').valid).toBe(true);

    // Over 2GB should fail
    const tooLarge = { mimetype: 'video/mp4', size: 3 * 1024 * 1024 * 1024, originalname: 'test.mp4' };
    expect(validateFile(tooLarge, 'video').valid).toBe(false);
  });

  it('should validate document files correctly', () => {
    const validDoc = { mimetype: 'application/pdf', size: 5 * 1024 * 1024, originalname: 'test.pdf' };
    expect(validateFile(validDoc, 'document').valid).toBe(true);

    const pptx = {
      mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      size: 10 * 1024 * 1024,
      originalname: 'test.pptx',
    };
    expect(validateFile(pptx, 'document').valid).toBe(true);

    const docx = {
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 5 * 1024 * 1024,
      originalname: 'test.docx',
    };
    expect(validateFile(docx, 'document').valid).toBe(true);
  });

  it('should return error message for invalid files', () => {
    const result = validateFile(
      { mimetype: 'text/plain', size: 1024, originalname: 'test.txt' },
      'image'
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid file type');
  });

  it('should return error for oversized files', () => {
    const result = validateFile(
      { mimetype: 'image/png', size: 50 * 1024 * 1024, originalname: 'huge.png' },
      'image'
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain('too large');
  });
});
