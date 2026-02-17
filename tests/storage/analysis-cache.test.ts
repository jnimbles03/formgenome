import { describe, it, expect, beforeEach } from 'vitest';
import { setCachedAnalysis, getCachedAnalysis, getAllCachedAnalyses, clearAnalysisCache } from '../../src/storage/analysis-cache';
import type { CachedAnalysis } from '../../src/types/analysis';

const makeMockAnalysis = (overrides?: Partial<CachedAnalysis>): CachedAnalysis => ({
  form_name: 'Test Form',
  pretty_title: null,
  form_title: null,
  title: null,
  entity_name: 'Test Entity',
  entity: 'Test',
  pages: 2,
  total_field_count: 10,
  field_count: 10,
  complexity_score: 5,
  nigo_score: 3,
  confidence_tier: 'High',
  action_type: 'submit',
  form_purpose: 'testing',
  industry_vertical: 'tech',
  industry_subvertical: 'saas',
  signature_required: false,
  notarization_required: false,
  attachments_required: false,
  payment_required: false,
  identification_required: false,
  conditional_logic: false,
  third_party_involved: false,
  witnesses_required: false,
  deadlines_present: false,
  signature_analysis: null,
  attachment_count: 0,
  payment_amount: null,
  estimated_signer_time: null,
  estimated_processing_time: null,
  gemini_analyzed: true,
  _cached_at: Date.now(),
  _synced: false,
  ...overrides,
});

describe('analysis-cache', () => {
  beforeEach(async () => {
    await chrome.storage.local.clear();
  });

  describe('setCachedAnalysis / getCachedAnalysis', () => {
    it('stores and retrieves an analysis', async () => {
      const analysis = makeMockAnalysis();
      await setCachedAnalysis('https://example.com/test.pdf', analysis);

      const result = await getCachedAnalysis('https://example.com/test.pdf');
      expect(result).not.toBeNull();
      expect(result?.form_name).toBe('Test Form');
    });

    it('returns null for missing keys', async () => {
      const result = await getCachedAnalysis('analysis_nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getAllCachedAnalyses', () => {
    it('returns all cached analyses', async () => {
      const key1 = await setCachedAnalysis('https://example.com/form1.pdf', makeMockAnalysis({ form_name: 'Form 1' }));
      const key2 = await setCachedAnalysis('https://example.com/form2.pdf', makeMockAnalysis({ form_name: 'Form 2' }));

      const all = await getAllCachedAnalyses();
      expect(all.size).toBe(2);
      expect(all.get(key1)?.form_name).toBe('Form 1');
      expect(all.get(key2)?.form_name).toBe('Form 2');
    });

    it('ignores non-analysis keys', async () => {
      await chrome.storage.local.set({ userId: 'user-123' });
      await setCachedAnalysis('https://example.com/form.pdf', makeMockAnalysis());

      const all = await getAllCachedAnalyses();
      expect(all.size).toBe(1);
    });
  });

  describe('clearAnalysisCache', () => {
    it('removes analysis keys but preserves protected keys', async () => {
      await chrome.storage.local.set({ userId: 'user-123', apiPreference: 'cloud' });
      const key1 = await setCachedAnalysis('https://example.com/form1.pdf', makeMockAnalysis());
      await setCachedAnalysis('https://example.com/form2.pdf', makeMockAnalysis());

      const cleared = await clearAnalysisCache();
      expect(cleared).toBe(2);

      // Protected keys should still exist
      const data = await chrome.storage.local.get(null);
      expect(data.userId).toBe('user-123');
      expect(data.apiPreference).toBe('cloud');
      expect(data[key1]).toBeUndefined();
    });
  });
});
