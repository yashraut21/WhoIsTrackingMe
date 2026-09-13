/**
 * Browser API adapter — the single place that touches browser globals.
 *
 * Returns a strongly-typed BrowserAPI object backed by the standardised
 * `browser.*` namespace (Firefox, or Chrome + webextension-polyfill).
 *
 * webextension-polyfill wraps Chrome's callback-based APIs to return
 * Promises identical to Firefox's native browser.* surface.
 * Under Firefox it is a no-op pass-through.
 *
 * HOW TO USE:
 *   import { browserAPI } from '../browser';
 *   const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
 *
 * Never import `chrome` or `browser` globals directly in application code.
 */

// The polyfill augments the global `browser` namespace when loaded as a
// side-effect import, and re-exports it as the default export for direct use.
import wext from 'webextension-polyfill';

import type {
  BrowserAPI,
  BrowserCookie,
  BrowserCookieChangeInfo,
  BrowserHttpHeader,
  IBrowserAlarms,
  IBrowserCookies,
  IBrowserRuntime,
  IBrowserTabs,
  IBrowserWebRequest,
} from './types';

// Alias the polyfill namespace for clarity throughout this file.
// `wext` is always the Promise-based, cross-browser normalised surface.
const ext = wext;

// ---------------------------------------------------------------------------
// Cookies adapter
// ---------------------------------------------------------------------------

function buildCookiesAdapter(): IBrowserCookies {
  return {
    async getAll(details) {
      const results = await ext.cookies.getAll(details as Parameters<typeof ext.cookies.getAll>[0]);
      return results.map((c): BrowserCookie => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        secure: c.secure,
        httpOnly: c.httpOnly,
        sameSite: c.sameSite as string,
        session: c.session,
        expirationDate: c.expirationDate,
        // `partitionKey` is Chromium-only; Firefox returns undefined
        partitionKey: (c as unknown as Record<string, unknown>).partitionKey as BrowserCookie['partitionKey'],
      }));
    },

    onChanged: {
      addListener(callback: (changeInfo: BrowserCookieChangeInfo) => void) {
        ext.cookies.onChanged.addListener((changeInfo) => {
          const c = changeInfo.cookie;
          callback({
            removed: changeInfo.removed,
            cause: changeInfo.cause,
            cookie: {
              name: c.name,
              value: c.value,
              domain: c.domain,
              path: c.path,
              secure: c.secure,
              httpOnly: c.httpOnly,
              sameSite: c.sameSite as string,
              session: c.session,
              expirationDate: c.expirationDate,
              partitionKey: (c as unknown as Record<string, unknown>).partitionKey as BrowserCookie['partitionKey'],
            },
          });
        });
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Tabs adapter
// ---------------------------------------------------------------------------

function buildTabsAdapter(): IBrowserTabs {
  return {
    async query(queryInfo) {
      const tabs = await ext.tabs.query(queryInfo as Parameters<typeof ext.tabs.query>[0]);
      return tabs.map((t) => ({ id: t.id, url: t.url, active: t.active }));
    },

    onUpdated: {
      addListener(callback) {
        ext.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
          callback(
            tabId,
            { url: changeInfo.url, status: changeInfo.status },
            { id: tab.id, url: tab.url, active: tab.active }
          );
        });
      },
    },

    onRemoved: {
      addListener(callback) {
        ext.tabs.onRemoved.addListener((tabId) => callback(tabId));
      },
    },
  };
}

// ---------------------------------------------------------------------------
// WebRequest adapter
// ---------------------------------------------------------------------------

function buildWebRequestAdapter(): IBrowserWebRequest {
  return {
    onBeforeRequest: {
      addListener(callback, filter, extraInfoSpec) {
        // webextension-polyfill wraps webRequest listeners transparently.
        // We cast through unknown because the polyfill's exact type for
        // extraInfoSpec differs slightly per browser family.
        (ext.webRequest.onBeforeRequest as unknown as {
          addListener(cb: (d: Record<string, unknown>) => void, f: unknown, e?: unknown): void;
        }).addListener(
          (details) => {
            callback({
              requestId: details.requestId as string,
              url: details.url as string,
              method: details.method as string,
              type: details.type as string,
              initiator: details.initiator as string | undefined,
              tabId: details.tabId as number,
              timeStamp: details.timeStamp as number,
            });
          },
          filter,
          extraInfoSpec
        );
      },
    },

    onHeadersReceived: {
      addListener(callback, filter, extraInfoSpec) {
        (ext.webRequest.onHeadersReceived as unknown as {
          addListener(cb: (d: Record<string, unknown>) => void, f: unknown, e?: unknown): void;
        }).addListener(
          (details) => {
            const rawHeaders = details.responseHeaders as Array<Record<string, unknown>> | undefined;
            const headers: BrowserHttpHeader[] | undefined = rawHeaders?.map((h) => ({
              name: h.name as string,
              value: h.value as string | undefined,
            }));
            callback({
              requestId: details.requestId as string,
              url: details.url as string,
              method: details.method as string,
              type: details.type as string,
              initiator: details.initiator as string | undefined,
              tabId: details.tabId as number,
              timeStamp: details.timeStamp as number,
              responseHeaders: headers,
            });
          },
          filter,
          extraInfoSpec
        );
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Runtime adapter
// ---------------------------------------------------------------------------

function buildRuntimeAdapter(): IBrowserRuntime {
  return {
    async sendMessage<T = unknown>(message: unknown): Promise<T> {
      return ext.runtime.sendMessage(message) as Promise<T>;
    },

    async openOptionsPage(): Promise<void> {
      await ext.runtime.openOptionsPage();
    },

    onInstalled: {
      addListener(callback) {
        ext.runtime.onInstalled.addListener(callback);
      },
    },

    onMessage: {
      addListener(callback) {
        // The polyfill's OnMessageListener requires the callback to return
        // `true | void | Promise<void>`. We bridge to our looser interface
        // by casting the result explicitly.
        const wrapped = (
          message: unknown,
          sender: Record<string, unknown>,
          sendResponse: (response?: unknown) => void
        ): true | void => {
          const result = callback(message, sender, sendResponse);
          if (result === true) return true;
        };
        (ext.runtime.onMessage.addListener as unknown as (
          cb: (msg: unknown, sender: Record<string, unknown>, sr: (r?: unknown) => void) => true | void
        ) => void)(wrapped);
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Alarms adapter
// ---------------------------------------------------------------------------

function buildAlarmsAdapter(): IBrowserAlarms {
  return {
    create(name, alarmInfo) {
      ext.alarms.create(name, alarmInfo);
    },

    onAlarm: {
      addListener(callback) {
        ext.alarms.onAlarm.addListener((alarm) => {
          callback({
            name: alarm.name,
            scheduledTime: alarm.scheduledTime,
            periodInMinutes: alarm.periodInMinutes,
          });
        });
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Public singleton
// ---------------------------------------------------------------------------

/**
 * Convenience export — stable object of lazily-initialised browser API adapters.
 *
 * @example
 *   import { browserAPI } from '../browser';
 *   const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
 */
export const browserAPI: BrowserAPI = {
  get cookies() { return buildCookiesAdapter(); },
  get tabs() { return buildTabsAdapter(); },
  get webRequest() { return buildWebRequestAdapter(); },
  get runtime() { return buildRuntimeAdapter(); },
  get alarms() { return buildAlarmsAdapter(); },
};

/** Explicit factory function — useful for testing with injected adapters. */
export function getBrowserAPI(): BrowserAPI {
  return browserAPI;
}
