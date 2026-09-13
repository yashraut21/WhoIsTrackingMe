# Security Specification & Permissions: WhoIsTrackingMe

## 1. Principle of Least Privilege

WhoIsTrackingMe requests only the browser extension permissions strictly required to observe and analyze local forensic tracking metadata:

| Permission | Technical Justification | Security Mitigation |
| :--- | :--- | :--- |
| `cookies` | Required to inventory accessible browser cookies and audit technical attributes (`HttpOnly`, `Secure`, `SameSite`, `Path`, `Expiry`). | Raw cookie values are masked upon ingestion (`abc1••••••89`). Unmasked values are never persisted to disk or emitted to logs. |
| `storage` | Retains user settings and local state across service worker restarts. | Strictly local extension storage; no cloud synchronizers enabled. |
| `webRequest` | Passively records request metadata (initiator, target domain, method, resource type) and Set-Cookie response headers. | Never intercepts request bodies, forms, passwords, or Authorization headers. Operates in passive observation mode without blocking. |
| `tabs` | Identifies the active URL of open tabs to attribute cookies and third-party requests to the visited first-party website. | Tab metadata is processed in-memory and used solely for origin correlation. |
| `alarms` | Schedules periodic background inventory refreshes (every 60 minutes). | Triggers internal inventory routine only. |
| `<all_urls>` | Host permission required because tracking scripts, cookies, and beacons can be set by or embedded in any visited origin. | Zero network dispatchers; network requests are observed passively without mutation. |

---

## 2. Defensive Engineering & Vulnerability Mitigations

### Cross-Site Scripting (XSS) Prevention
- WhoIsTrackingMe employs React's JSX escaping by default. No `dangerouslySetInnerHTML`, `eval()`, or `new Function()` constructs exist anywhere in the codebase.
- Remote JavaScript is prohibited: all code is bundled locally via Vite. No dynamic script tags or remote CDN scripts are ever injected.

### Sensitive Token Masking
- Cookie values and potential session tokens are automatically sanitized:
  ```text
  Raw:    session_token_xyz987654321
  Masked: sess••••••21
  ```
- Cleartext values are never persisted to IndexedDB.

### Prototype Pollution Resistance
- Tracker definitions and domain keys are looked up using array methods and `Map` instances (`new Map()`) rather than raw prototype-inheriting object literals, mitigating `__proto__` pollution vectors.

### Untrusted Dataset Handling
- Tracker catalog entries and network headers are treated as untrusted input. Domain normalizers strip non-network protocols (`javascript:`, `data:`, `blob:`) and sanitize malformed strings before processing.
