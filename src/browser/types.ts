/**
 * Neutral WebExtension API type contracts.
 *
 * Application code depends exclusively on these interfaces — never on the
 * concrete `chrome.*` or `browser.*` globals. This allows the abstraction
 * layer in api.ts to swap implementations without touching any business logic.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** Browser-agnostic representation of an HTTP header (name/value pair). */
export interface BrowserHttpHeader {
  name: string;
  value?: string;
  binaryValue?: ArrayBuffer;
}

/** SameSite attribute values as reported by the cookies API across browsers. */
export type BrowserSameSiteStatus =
  | 'no_restriction'
  | 'lax'
  | 'strict'
  | 'unspecified';

// ---------------------------------------------------------------------------
// Cookies
// ---------------------------------------------------------------------------

/** Subset of the WebExtension Cookie object used by the application. */
export interface BrowserCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: BrowserSameSiteStatus | string;
  session: boolean;
  expirationDate?: number;
  /** CHIPS partition key — Chrome/Edge only; undefined on Firefox. */
  partitionKey?: { topLevelSite?: string } | string;
}

export interface BrowserCookieChangeInfo {
  removed: boolean;
  cookie: BrowserCookie;
  cause: string;
}

export interface IBrowserCookies {
  getAll(details: Record<string, unknown>): Promise<BrowserCookie[]>;
  onChanged: {
    addListener(callback: (changeInfo: BrowserCookieChangeInfo) => void): void;
  };
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

export interface BrowserTab {
  id?: number;
  url?: string;
  active?: boolean;
}

export interface BrowserTabChangeInfo {
  url?: string;
  status?: string;
}

export interface IBrowserTabs {
  query(queryInfo: {
    active?: boolean;
    currentWindow?: boolean;
  }): Promise<BrowserTab[]>;

  onUpdated: {
    addListener(
      callback: (
        tabId: number,
        changeInfo: BrowserTabChangeInfo,
        tab: BrowserTab
      ) => void
    ): void;
  };

  onRemoved: {
    addListener(callback: (tabId: number) => void): void;
  };
}

// ---------------------------------------------------------------------------
// WebRequest
// ---------------------------------------------------------------------------

export interface BrowserWebRequestDetails {
  requestId: string;
  url: string;
  method: string;
  type: string;
  initiator?: string;
  tabId: number;
  timeStamp: number;
  responseHeaders?: BrowserHttpHeader[];
}

export interface BrowserWebRequestFilter {
  urls: string[];
}

export type BrowserWebRequestExtraInfo = 'responseHeaders' | 'requestHeaders' | 'blocking';

export interface IBrowserWebRequest {
  onBeforeRequest: {
    addListener(
      callback: (details: BrowserWebRequestDetails) => void,
      filter: BrowserWebRequestFilter,
      extraInfoSpec?: BrowserWebRequestExtraInfo[]
    ): void;
  };

  onHeadersReceived: {
    addListener(
      callback: (details: BrowserWebRequestDetails) => void,
      filter: BrowserWebRequestFilter,
      extraInfoSpec?: BrowserWebRequestExtraInfo[]
    ): void;
  };
}

// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------

export type MessageSender = Record<string, unknown>;

export interface IBrowserRuntime {
  sendMessage<T = unknown>(message: unknown): Promise<T>;
  openOptionsPage(): Promise<void>;

  onInstalled: {
    addListener(callback: () => void): void;
  };

  onMessage: {
    addListener(
      callback: (
        message: unknown,
        sender: MessageSender,
        sendResponse: (response?: unknown) => void
      ) => boolean | undefined | void
    ): void;
  };
}

// ---------------------------------------------------------------------------
// Alarms
// ---------------------------------------------------------------------------

export interface BrowserAlarm {
  name: string;
  scheduledTime: number;
  periodInMinutes?: number;
}

export interface BrowserAlarmCreateInfo {
  delayInMinutes?: number;
  periodInMinutes?: number;
  when?: number;
}

export interface IBrowserAlarms {
  create(name: string, alarmInfo: BrowserAlarmCreateInfo): void;
  onAlarm: {
    addListener(callback: (alarm: BrowserAlarm) => void): void;
  };
}

// ---------------------------------------------------------------------------
// Top-level browser API bundle
// ---------------------------------------------------------------------------

/** The complete browser API surface used by WhoIsTrackingMe. */
export interface BrowserAPI {
  cookies: IBrowserCookies;
  tabs: IBrowserTabs;
  webRequest: IBrowserWebRequest;
  runtime: IBrowserRuntime;
  alarms: IBrowserAlarms;
}
