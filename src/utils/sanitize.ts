export const sanitizeFilename = (filename: string): string => {
  if (!filename) return '';

  // Remove control characters
  let sanitized = filename.replace(/[\x00-\x1F\x7F]/g, '');

  // Prevent path traversal attempts by removing relative path components
  // Replace ../ or ./ entirely rather than just the slash
  sanitized = sanitized.replace(/\.{1,2}\//g, '');
  sanitized = sanitized.replace(/\.{1,2}\\/g, '');

  // Replace characters that are invalid in Windows/Linux filenames
  // Also replace some potentially problematic characters
  sanitized = sanitized.replace(/[/\\?%*:|"<>]/g, '_');

  // Prevent path traversal attempts (leading dots)
  sanitized = sanitized.replace(/^\.+/, '');

  // Ensure the filename is not empty after sanitization
  if (!sanitized) {
    return 'download';
  }

  return sanitized;
};
