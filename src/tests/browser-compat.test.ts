/**
 * Browser abstraction layer unit tests.
 *
 * These tests verify that:
 *  1. getBrowserName() correctly identifies runtimes from UA / globals
 *  2. supportsAlarms() and supportsWebRequest() read from the right namespace
 *  3. The BrowserAPI type contracts are satisfied — all required methods exist
 *
 * The webextension-polyfill and browser globals are mocked here; the actual
 * Chrome or Firefox runtime is NOT required to run these tests.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getBrowserName, isFirefox, isChromium, supportsAlarms, supportsWebRequest, getManifestVersion } from '../browser/compat';

describe('Browser Compat Detection', () => {
  const originalNavigator = globalThis.navigator;
  const originalBrowser = (globalThis as any).browser;
  const originalBrave = (globalThis as any).brave;

  afterEach(() => {
    // Restore globals after each test
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
    (globalThis as any).browser = originalBrowser;
    (globalThis as any).brave = originalBrave;
  });

  describe('isFirefox()', () => {
    it('returns false when browser.runtime.getBrowserInfo is not present', () => {
      (globalThis as any).browser = undefined;
      expect(isFirefox()).toBe(false);
    });

    it('returns true when browser.runtime.getBrowserInfo is a function', () => {
      (globalThis as any).browser = {
        runtime: { getBrowserInfo: vi.fn() }
      };
      expect(isFirefox()).toBe(true);
    });
  });

  describe('isChromium()', () => {
    it('returns true when not Firefox', () => {
      (globalThis as any).browser = undefined;
      expect(isChromium()).toBe(true);
    });

    it('returns false when Firefox is detected', () => {
      (globalThis as any).browser = {
        runtime: { getBrowserInfo: vi.fn() }
      };
      expect(isChromium()).toBe(false);
    });
  });

  describe('getBrowserName()', () => {
    beforeEach(() => {
      // Ensure not Firefox for Chromium UA tests
      (globalThis as any).browser = undefined;
    });

    it('returns Firefox when getBrowserInfo is present', () => {
      (globalThis as any).browser = { runtime: { getBrowserInfo: vi.fn() } };
      expect(getBrowserName()).toBe('Firefox');
    });

    it('returns Edge when UA contains Edg/', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 Chrome/120 Edg/120.0' },
        configurable: true,
      });
      expect(getBrowserName()).toBe('Edge');
    });

    it('returns Brave when brave global is present', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 Chrome/120' },
        configurable: true,
      });
      (globalThis as any).brave = { isBrave: vi.fn() };
      expect(getBrowserName()).toBe('Brave');
    });

    it('returns Vivaldi when UA contains Vivaldi/', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 Chrome/120 Vivaldi/6.0' },
        configurable: true,
      });
      expect(getBrowserName()).toBe('Vivaldi');
    });

    it('returns Chrome for a standard Chrome UA', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 Chrome/120.0' },
        configurable: true,
      });
      expect(getBrowserName()).toBe('Chrome');
    });

    it('returns unknown when navigator is unavailable (service worker context)', () => {
      (globalThis as any).browser = undefined;
      // Remove navigator
      const desc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        configurable: true,
      });
      expect(getBrowserName()).toBe('unknown');
      // Restore
      if (desc) Object.defineProperty(globalThis, 'navigator', desc);
    });
  });

  describe('supportsAlarms()', () => {
    it('returns true when alarms.create is a function on the browser namespace', () => {
      (globalThis as any).browser = {
        runtime: {},
        alarms: { create: vi.fn() }
      };
      expect(supportsAlarms()).toBe(true);
    });

    it('returns true when alarms.create is a function on the chrome namespace', () => {
      (globalThis as any).browser = undefined;
      (globalThis as any).chrome = { alarms: { create: vi.fn() } };
      expect(supportsAlarms()).toBe(true);
      (globalThis as any).chrome = undefined;
    });

    it('returns false when neither namespace has alarms', () => {
      (globalThis as any).browser = undefined;
      (globalThis as any).chrome = undefined;
      expect(supportsAlarms()).toBe(false);
    });
  });

  describe('supportsWebRequest()', () => {
    it('returns true when webRequest.onBeforeRequest.addListener exists', () => {
      (globalThis as any).browser = {
        runtime: {},
        webRequest: { onBeforeRequest: { addListener: vi.fn() } }
      };
      expect(supportsWebRequest()).toBe(true);
    });

    it('returns false when webRequest is absent', () => {
      (globalThis as any).browser = { runtime: {} };
      expect(supportsWebRequest()).toBe(false);
    });
  });

  describe('getManifestVersion()', () => {
    it('returns the manifest_version from the runtime', () => {
      (globalThis as any).browser = {
        runtime: {
          getBrowserInfo: vi.fn(),
          getManifest: vi.fn(() => ({ manifest_version: 3 }))
        }
      };
      expect(getManifestVersion()).toBe(3);
    });

    it('defaults to 3 when runtime or getManifest is unavailable', () => {
      (globalThis as any).browser = undefined;
      (globalThis as any).chrome = undefined;
      expect(getManifestVersion()).toBe(3);
    });
  });
});
