import { vi } from 'vitest';

// Mock chrome APIs globally for tests
const storageData: Record<string, unknown> = {};

const chromeMock = {
  storage: {
    local: {
      get: vi.fn((keys: string | string[] | Record<string, unknown> | null) => {
        if (keys === null) return Promise.resolve({ ...storageData });
        if (typeof keys === 'string') return Promise.resolve({ [keys]: storageData[keys] });
        if (Array.isArray(keys)) {
          const result: Record<string, unknown> = {};
          keys.forEach(k => { result[k] = storageData[k]; });
          return Promise.resolve(result);
        }
        return Promise.resolve(keys);
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(storageData, items);
        return Promise.resolve();
      }),
      remove: vi.fn((keys: string | string[]) => {
        const arr = Array.isArray(keys) ? keys : [keys];
        arr.forEach(k => delete storageData[k]);
        return Promise.resolve();
      }),
      clear: vi.fn(() => {
        Object.keys(storageData).forEach(k => delete storageData[k]);
        return Promise.resolve();
      }),
    },
    sync: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    },
    onChanged: { addListener: vi.fn() },
  },
  runtime: {
    id: 'test-extension-id',
    getManifest: vi.fn(() => ({ version: '2.0.0' })),
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn() },
    lastError: null as chrome.runtime.LastError | null,
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    onRemoved: { addListener: vi.fn() },
    onActivated: { addListener: vi.fn() },
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
};

(globalThis as Record<string, unknown>).chrome = chromeMock;
