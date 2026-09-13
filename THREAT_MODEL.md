# Threat Model: WhoIsTrackingMe

## 1. Protected Assets

| Asset | Sensitivity | Description |
| :--- | :--- | :--- |
| **User Browsing History** | High | The list of visited domains and timestamps. |
| **Authentication Tokens & Cookies** | Critical | Active session tokens, JWTs, and credential cookies stored in the browser. |
| **Local Forensics Database** | Moderate | Accumulated telemetry records and network topology maps stored in IndexedDB. |
| **Tracker Intelligence Catalog** | Low | Curated local knowledge base of tracker classifications. |

---

## 2. Threat Actors

- **Malicious Web Origins**: Websites engineered to exploit extension messaging, poison local caches, or perform prototype pollution.
- **Third-Party Ad Scripts**: Scripts running inside visited websites seeking to fingerprint or exfiltrate local extension presence.
- **Local Machine Adversaries**: Unprivileged processes on the user's workstation attempting to harvest unmasked browser session data.

---

## 3. Trust Boundaries & Attack Surfaces

```text
 [ Visited Web Page (Untrusted) ]
                │
                │ HTTP Requests / Cookies (Untrusted Data Flow)
                ▼
 [ MV3 Background Worker (Isolated Extension Context) ]
                │
                │ Internal Messages / IndexedDB Writes
                ▼
 [ Extension Dashboard (Privileged UI Context) ]
```

### Attack Surfaces
1. **Network Header Parsing**: Untrusted strings in `Set-Cookie` and request URLs.
2. **Dashboard UI Rendering**: Display of user-influenced domain names, cookie names, and header parameters.
3. **Runtime Message Passing**: Communication channels between tabs, popup, and background service worker.

---

## 4. Threats, Attacks & Mitigations

### Threat 1: Cross-Site Scripting (XSS) via Malicious Domain or Cookie Names
- **Attack**: An attacker configures a domain (e.g., `<script>alert(1)</script>.evil.com`) or cookie name containing script tags, attempting DOM injection in the forensics dashboard.
- **Mitigation**:
  - React JSX handles text node escaping by default.
  - No `dangerouslySetInnerHTML`, `innerHTML`, or `eval()` is used anywhere in the dashboard.
  - Domain normalizer strictly validates host syntax and rejects script schemes.

### Threat 2: Session Token Exfiltration via Extension Storage
- **Attack**: A local adversary or compromised extension inspects IndexedDB to extract session cookies.
- **Mitigation**:
  - Sensitive values are masked prior to storage (`abc1••••••89`).
  - Cleartext cookie values are never written to permanent disk storage.

### Threat 3: Prototype Pollution via Crafted Tracker Metadata
- **Attack**: Malicious input containing `__proto__` or `constructor` keys targeting domain aggregation logic.
- **Mitigation**:
  - Aggregations use native `Map` instances (`new Map()`) rather than raw object literal dictionaries.
  - Unit tests explicitly verify prototype pollution resistance.

### Threat 4: Data Exfiltration via Remote Dispatch
- **Attack**: Telemetry gathered by the extension is leaked to an external analytics or tracking endpoint.
- **Mitigation**:
  - The extension contains zero external network dependencies.
  - Manifest V3 Content Security Policy (CSP) forbids remote scripts.
