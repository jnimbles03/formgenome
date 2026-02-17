import { describe, it, expect } from 'vitest';
import { isSafeHttpUrl, isHttpsOrLocalhost } from '../../src/shared/url-validation';

describe('isSafeHttpUrl', () => {
  it('accepts https URLs', () => {
    expect(isSafeHttpUrl('https://example.com/form.pdf')).toBe(true);
  });

  it('accepts http URLs to non-internal hosts', () => {
    expect(isSafeHttpUrl('http://example.com/form.pdf')).toBe(true);
  });

  it('rejects file:// URLs', () => {
    expect(isSafeHttpUrl('file:///etc/passwd')).toBe(false);
  });

  it('rejects javascript: URLs', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects data: URLs', () => {
    expect(isSafeHttpUrl('data:text/html,<h1>hi</h1>')).toBe(false);
  });

  it('rejects chrome-extension: URLs', () => {
    expect(isSafeHttpUrl('chrome-extension://abc123/page.html')).toBe(false);
  });

  it('rejects localhost', () => {
    expect(isSafeHttpUrl('http://localhost:8080/api')).toBe(false);
  });

  it('rejects 127.0.0.1', () => {
    expect(isSafeHttpUrl('http://127.0.0.1/secret')).toBe(false);
  });

  it('rejects private 10.x.x.x ranges', () => {
    expect(isSafeHttpUrl('http://10.0.0.1/admin')).toBe(false);
  });

  it('rejects private 192.168.x.x ranges', () => {
    expect(isSafeHttpUrl('http://192.168.1.1/router')).toBe(false);
  });

  it('rejects private 172.16-31.x.x ranges', () => {
    expect(isSafeHttpUrl('http://172.16.0.1/internal')).toBe(false);
  });

  it('rejects AWS metadata endpoint', () => {
    expect(isSafeHttpUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
  });

  it('rejects GCP metadata hostname', () => {
    expect(isSafeHttpUrl('http://metadata.google.internal/computeMetadata')).toBe(false);
  });

  it('rejects invalid URLs', () => {
    expect(isSafeHttpUrl('not-a-url')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isSafeHttpUrl('')).toBe(false);
  });
});

describe('isHttpsOrLocalhost', () => {
  it('accepts https URLs', () => {
    expect(isHttpsOrLocalhost('https://example.com')).toBe(true);
  });

  it('accepts http://localhost', () => {
    expect(isHttpsOrLocalhost('http://localhost:8080')).toBe(true);
  });

  it('rejects plain http to non-localhost', () => {
    expect(isHttpsOrLocalhost('http://example.com')).toBe(false);
  });

  it('rejects file: URLs', () => {
    expect(isHttpsOrLocalhost('file:///etc/hosts')).toBe(false);
  });
});
