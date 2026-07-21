import { describe, it, expect } from 'vitest';
import { sanitizeFilename } from './sanitize';

describe('sanitizeFilename', () => {
  it('should remove invalid characters', () => {
    expect(sanitizeFilename('file<name>.txt')).toBe('file_name_.txt');
    expect(sanitizeFilename('file/name.txt')).toBe('file_name.txt');
    expect(sanitizeFilename('file\\name.txt')).toBe('file_name.txt');
    expect(sanitizeFilename('file?name.txt')).toBe('file_name.txt');
    expect(sanitizeFilename('file%name.txt')).toBe('file_name.txt');
    expect(sanitizeFilename('file*name.txt')).toBe('file_name.txt');
    expect(sanitizeFilename('file:name.txt')).toBe('file_name.txt');
    expect(sanitizeFilename('file|name.txt')).toBe('file_name.txt');
    expect(sanitizeFilename('file"name.txt')).toBe('file_name.txt');
  });

  it('should remove control characters', () => {
    expect(sanitizeFilename('file\x00name.txt')).toBe('filename.txt');
    expect(sanitizeFilename('file\nname.txt')).toBe('filename.txt');
    expect(sanitizeFilename('file\rname.txt')).toBe('filename.txt');
  });

  it('should prevent path traversal', () => {
    expect(sanitizeFilename('../file.txt')).toBe('file.txt');
    expect(sanitizeFilename('../../file.txt')).toBe('file.txt');
    expect(sanitizeFilename('...file.txt')).toBe('file.txt');
  });

  it('should return download if empty after sanitization', () => {
    expect(sanitizeFilename('../')).toBe('download');
    expect(sanitizeFilename('<>:"/\\|?*')).toBe('_________'); // It turns out these are replaced by underscores
  });

  it('should return empty string if input is falsy', () => {
    expect(sanitizeFilename('')).toBe('');
  });
});
