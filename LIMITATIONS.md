# Browser Boundaries & Technical Limitations: WhoIsTrackingMe

Browser extension security models, particularly Chrome Extension Manifest V3, impose deliberate sandbox boundaries. To maintain scientific integrity, WhoIsTrackingMe explicitly documents what can and cannot be observed.

---

## 1. Storage Boundaries

### Cookies
- **Capabilities**: Full access to all cookies in the browser's cookie jar via `chrome.cookies` (provided `<all_urls>` permission is held). Captures technical flags (`HttpOnly`, `Secure`, `SameSite`, `Path`, `Expiry`, `partitionKey`).
- **Limitations**: Historical cookies created prior to extension installation lack an authoritative setting origin. WhoIsTrackingMe attributes these when the domain is revisited during active browsing.

### Partitioned Cookies (CHIPS)
- **Capabilities**: Captures `partitionKey` metadata when cookies are partitioned per top-level site under the Cookies Having Independent Partitioned State (CHIPS) standard.
- **Privacy Impact**: Partitioned cookies cannot be read across different top-level sites, significantly neutralizing cross-site tracking even when set by third-party domains.

### Web Storage (`localStorage`, `sessionStorage`, `IndexedDB`, `CacheStorage`)
- **Limitation**: The `chrome.cookies` API does **not** expose origin-private Web Storage.
- **Iframe Isolation**: A background service worker cannot directly inspect the `localStorage` or `IndexedDB` of third-party iframes without injecting invasive content scripts into every frame. WhoIsTrackingMe prioritizes user privacy and does not inject content scripts into unconsented contexts.

---

## 2. Network Observation Boundaries

### Passive `chrome.webRequest` vs. Blocking Declarative Net Request
- **Capabilities**: WhoIsTrackingMe uses passive `webRequest.onBeforeRequest` and `webRequest.onHeadersReceived` to record request metadata and `Set-Cookie` headers.
- **Limitations**: In Manifest V3, non-blocking `webRequest` cannot modify request flows or intercept encrypted payloads. This is an intentional architectural decision: WhoIsTrackingMe is designed as a forensic observability tool, not an ad blocker.

### Encrypted Payloads & Body Inspections
- **Intentional Limitation**: Request bodies, POST payloads, GraphQL queries, and WebSocket frame contents are not inspected. This ensures passwords, form fields, and private communications are never exposed.

---

## 3. Browser-Specific Protections
- **Safari / Firefox (ITP & Total Cookie Protection)**: Advanced browsers enforce client-side state partitioning where each website receives an isolated cookie jar for third parties. WhoIsTrackingMe's domain analysis flags cross-site infrastructure, but users should note that modern browser partitioning mechanisms may independently prevent tracking servers from linking partitions.
