/**
 * Public entry point for the browser abstraction layer.
 *
 * All application modules import exclusively from this barrel file.
 * Never import `chrome` or `browser` globals directly in application code.
 *
 * @example
 *   import { browserAPI } from '../browser';
 *   const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
 */

export { browserAPI, getBrowserAPI } from './api';
export { getBrowserName, isFirefox, isChromium, supportsAlarms, supportsWebRequest, getManifestVersion } from './compat';
export type {
  BrowserAPI,
  BrowserCookie,
  BrowserCookieChangeInfo,
  BrowserHttpHeader,
  BrowserTab,
  BrowserTabChangeInfo,
  BrowserWebRequestDetails,
  BrowserWebRequestFilter,
  BrowserWebRequestExtraInfo,
  BrowserAlarm,
  BrowserAlarmCreateInfo,
  BrowserSameSiteStatus,
  IBrowserCookies,
  IBrowserTabs,
  IBrowserWebRequest,
  IBrowserRuntime,
  IBrowserAlarms,
} from './types';
