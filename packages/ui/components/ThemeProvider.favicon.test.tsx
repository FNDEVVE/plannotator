import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { configStore } from '../config/configStore';
import { resetStorageBackend, setStorageBackend } from '../utils/storage';
import { ThemeProvider } from './ThemeProvider';
import {
  CLASSIC_FAVICON_DATA_URL,
  FAVICON_PNG_DATA_URL,
} from '@plannotator/core/favicon';

const hasDom = typeof document !== 'undefined';

let root: Root | null = null;
let host: HTMLElement | null = null;
const stored = new Map<string, string>();

function getFaviconLink(): HTMLLinkElement | null {
  if (!hasDom) return null;
  return document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
}

async function mount(): Promise<void> {
  if (!hasDom) return;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(
      <ThemeProvider>
        <div>App</div>
      </ThemeProvider>,
    );
  });
}

async function unmount(): Promise<void> {
  if (root) {
    await act(async () => {
      root!.unmount();
    });
  }
  root = null;
  host?.remove();
  host = null;
}

describe('ThemeProvider favicon synchronization', () => {
  beforeEach(() => {
    stored.clear();
    setStorageBackend({
      getItem: (key) => stored.get(key) ?? null,
      setItem: (key, value) => {
        stored.set(key, value);
      },
      removeItem: (key) => {
        stored.delete(key);
      },
    });
    if (hasDom) {
      const existing = getFaviconLink();
      if (existing) existing.remove();
    }
  });

  afterEach(async () => {
    if (hasDom) {
      await unmount();
      const existing = getFaviconLink();
      if (existing) existing.remove();
    }
    resetStorageBackend();
  });

  test.skipIf(!hasDom)('updates document link[rel="icon"] href, type, and sizes when faviconStyle changes', async () => {
    stored.set('plannotator-favicon', 'totman');
    configStore.loadFromBackend();

    await mount();

    const link = getFaviconLink();
    expect(link).not.toBeNull();
    expect(link?.href).toBe(FAVICON_PNG_DATA_URL);
    expect(link?.type).toBe('image/png');
    expect(link?.getAttribute('sizes')).toBe('64x64');

    await act(async () => {
      configStore.set('faviconStyle', 'classic');
    });

    const updatedLink = getFaviconLink();
    expect(updatedLink?.href).toBe(CLASSIC_FAVICON_DATA_URL);
    expect(updatedLink?.type).toBe('image/svg+xml');
    expect(updatedLink?.hasAttribute('sizes')).toBe(false);

    await act(async () => {
      configStore.set('faviconStyle', 'totman');
    });

    const revertedLink = getFaviconLink();
    expect(revertedLink?.href).toBe(FAVICON_PNG_DATA_URL);
    expect(revertedLink?.type).toBe('image/png');
    expect(revertedLink?.getAttribute('sizes')).toBe('64x64');
  });

  test.skipIf(!hasDom)('initializes with classic style when stored in backend', async () => {
    stored.set('plannotator-favicon', 'classic');
    configStore.loadFromBackend();

    await mount();

    const link = getFaviconLink();
    expect(link).not.toBeNull();
    expect(link?.href).toBe(CLASSIC_FAVICON_DATA_URL);
    expect(link?.type).toBe('image/svg+xml');
    expect(link?.hasAttribute('sizes')).toBe(false);
  });
});
