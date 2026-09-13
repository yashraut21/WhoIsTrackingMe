# Privacy Architecture: WhoIsTrackingMe

## 1. The Zero-Exfiltration Guarantee

**WhoIsTrackingMe** is engineered on a strict zero-transmission principle:
- **No External Servers**: The extension contains no telemetry endpoints, analytics SDKs, error reporting services, or remote cloud databases.
- **Local Persistence**: All cookie records, network request observations, and domain summaries reside exclusively in the client browser's local IndexedDB (`am_i_being_tracked_db`).
- **Complete Local Control**: Users can inspect all stored telemetry directly in the dashboard and wipe local databases at any time using extension settings.

---

## 2. Sensitive Artifact Protection

The extension observes technical metadata to explain tracking without exposing user credentials:
1. **Value Masking**: Cookie values, session identifiers, and authentication tokens are masked upon capture:
   - Long strings: First 4 characters, 6 mask dots, last 2 characters (e.g., `user_session_123456789` $\rightarrow$ `user••••••89`).
   - Short strings: Entirely replaced with `••••`.
2. **Payload Blindness**: WhoIsTrackingMe does not observe, log, or record HTTP request bodies, POST form payloads, passwords, payment details, or Authorization headers.

---

## 3. Strict Separation of Facts vs. Inferences

Forensic credibility requires clear distinction between what was directly observed and what may be inferred:

| Forensic Domain | Observed Fact | Inferred Classification |
| :--- | :--- | :--- |
| **Network Requests** | Top-level site `cnn.com` requested script from `doubleclick.net`. | `doubleclick.net` is infrastructure operated by Google commonly utilized for cross-site advertising attribution. |
| **Cookie Identifiers** | Cookie `IDE` with `SameSite=None`, `Secure=true`, expiration in 730 days. | Persistent identifier capable of cross-site recognition across participating networks. |
| **Unclassified Domains** | Site loaded resource from `cdn.example.org`. | Third-party communication observed. Third-party infrastructure is essential for content delivery and does not inherently imply tracking. |

WhoIsTrackingMe avoids unfounded claims like "Google is tracking you" and instead provides technically precise statements such as *"Observed communication with Google advertising infrastructure."*
