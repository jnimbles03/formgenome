import { describe, it, expect, beforeEach } from 'vitest';
import { initConfig, getConfig, setApiMode } from '../../src/shared/config';

describe('config', () => {
  beforeEach(async () => {
    // Reset config to defaults
    await chrome.storage.local.set({ apiPreference: undefined });
  });

  describe('initConfig', () => {
    it('defaults to cloud mode', async () => {
      const config = await initConfig();
      expect(config.isLocal).toBe(false);
      expect(config.apiBaseUrl).toContain('form-genome-api');
    });

    it('respects stored local preference', async () => {
      await chrome.storage.local.set({ apiPreference: 'local' });
      const config = await initConfig();
      expect(config.isLocal).toBe(true);
      expect(config.apiBaseUrl).toBe('http://localhost:8080');
    });
  });

  describe('setApiMode', () => {
    it('switches to local mode', async () => {
      await initConfig();
      setApiMode('local');
      const config = getConfig();
      expect(config.isLocal).toBe(true);
      expect(config.apiBaseUrl).toBe('http://localhost:8080');
    });

    it('switches to cloud mode', async () => {
      await initConfig();
      setApiMode('local');
      setApiMode('cloud');
      const config = getConfig();
      expect(config.isLocal).toBe(false);
      expect(config.apiBaseUrl).toContain('form-genome-api');
    });
  });

  describe('getConfig', () => {
    it('returns readonly config', async () => {
      await initConfig();
      const config = getConfig();
      expect(config.analyzeEndpoint).toBe('/api/analyze/upload');
    });
  });
});
