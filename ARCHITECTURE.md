# Architecture Specification: WhoIsTrackingMe

## 1. System Overview

**WhoIsTrackingMe** is an offline-first browser extension designed for privacy forensics and tracking artifact inspection. It observes, classifies, correlates, and explains tracking infrastructure and persistent browser artifacts while strictly maintaining zero remote exfiltration.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Browser Runtime (MV3)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│   Telemetry Ingestion Layer                                                 │
│   ├── chrome.cookies (Inventory & onChanged listeners)                      │
│   ├── chrome.tabs (Active origin correlation)                               │
│   └── chrome.webRequest (Metadata & Set-Cookie response header audits)      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Core Forensics Engine                             │
├─────────────────────────────────────────────────────────────────────────────┤
│   ├── Domain Engine (tldts / Public Suffix List parsing)                    │
│   ├── Attribute Forensics (HttpOnly, Secure, SameSite, Expiry, CHIPS)       │
│   ├── Value Masking Utility (e.g., abc1••••••89)                            │
│   ├── Curated Tracker Intelligence Catalog                                  │
│   ├── Domain & Profile Aggregation Engine                                   │
│   ├── Heuristic Privacy Exposure Scorer (Transparent Point Breakdown)       │
│   └── Graph Topology & Chronological Timeline Builders                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Local Persistence (IndexedDB)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│   Database: am_i_being_tracked_db                                           │
│   ├── Store: cookies (indexed by registrableDomain, isThirdParty, session)  │
│   └── Store: observations (indexed by firstPartySite, requestedDomain)      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Presentation Layer                                │
├─────────────────────────────────────────────────────────────────────────────┤
│   ├── Extension Toolbar Popup (Active site overview & quick metrics)        │
│   └── Forensics Dashboard (Tailwind CSS, React 18, D3.js)                   │
│       ├── Forensics Overview & Privacy Exposure Score Card                  │
│       ├── Aggregated Domain Intelligence Table                              │
│       ├── Visited Website Profile Detail Inspector                          │
│       ├── Interactive D3 Force-Directed Relationship Graph                  │
│       ├── Chronological Forensic Timeline with Multi-Filter Engine          │
│       └── "Explain This Artifact" Scientific Reasoning Drawer               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Layer Descriptions

### Ingestion Layer (`src/background/`)
- **Active Tab Tracker**: Tracks `chrome.tabs.onUpdated` and `chrome.tabs.onActivated` to maintain a real-time memory mapping of `tabId -> topLevelSite`.
- **Cookie Inventory Service**: Runs periodic inventory via `chrome.cookies.getAll({})` and captures dynamic mutations via `chrome.cookies.onChanged`.
- **Passive Network Observer**: Uses `chrome.webRequest.onBeforeRequest` and `onHeadersReceived` to record request metadata and audit `Set-Cookie` response headers without intercepting or logging request bodies or sensitive authorization tokens.

### Analysis Layer (`src/analysis/`)
- **Domain Engine (`domain.ts`)**: Uses the Public Suffix List (via `tldts`) to resolve multi-level ccTLDs (e.g. `example.co.uk`) and assess third-party boundaries (`isSameRegistrableDomain`, `isThirdParty`). Rejects non-network schemes.
- **Cookie Forensics (`cookie-forensics.ts`)**: Audits security flags (`Secure`, `HttpOnly`, `SameSite`, `CHIPS`) and computes remaining lifetimes. Generates objective forensic explanations strictly separating observed technical facts from inferred tracking behavior.
- **Risk Scorer (`risk.ts`, `risk-config.ts`)**: Implements an explainable, configurable scoring heuristic (0.0 – 10.0) with an itemized point breakdown.
- **Graph Builder (`graph-builder.ts`)**: Assembles a tri-partite network graph: Visited Websites $\rightarrow$ Parent Organizations $\rightarrow$ Third-Party Domains.
- **Timeline Engine (`timeline.ts`)**: Merges cookies and network telemetry into a chronological event stream with severity classifications.

### Persistence Layer (`src/database/store.ts`)
- Local client-side IndexedDB wrapper (`am_i_being_tracked_db`).
- Stores normalized records in `cookies` and `observations` with secondary indices for instant querying.
- Provides `clearAll()` functionality to guarantee complete user control over local forensic data.

### Presentation Layer (`src/dashboard/`, `src/popup/`)
- Built with React 18 and styled using Tailwind CSS with a dark cybersecurity palette.
- **Popup**: Compact status indicator for the active browser tab.
- **Dashboard**: Full-page single-page application featuring interactive D3 force simulations, data tables, and modal explanation drawers.
