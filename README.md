<p align="center">
  <img src="public/icons/logo.png" alt="WhoIsTrackingMe Logo" width="180" />
</p>

# WhoIsTrackingMe — Browser Privacy & Tracking Forensics

**WhoIsTrackingMe** is a local-first, production-grade Chrome Extension (Manifest V3) designed for privacy engineering and cybersecurity forensics. It enables users and researchers to inspect, classify, and understand the tracking infrastructure, persistent identifiers, and third-party data collection mechanisms active across their browser.

Built with **TypeScript**, **React 18**, **Tailwind CSS**, **D3.js**, and **IndexedDB**, WhoIsTrackingMe functions as a scientific forensics suite rather than an ad blocker: it observes, classifies, and explains evidence without mutating web traffic or transmitting data off-device.

---

## Key Features

- **Transparent Privacy Exposure Scoring**: Deterministic, explainable heuristic score (`0.0 - 10.0`) with itemized factor rationales (+2.1 tracking infrastructure, +1.5 persistent identifiers, etc.).
- **Interactive D3 Force-Directed Tracking Graph & Flow Map**: Dynamic simulation and hierarchical 3-stage flow mapping relationships between visited websites, parent tracking organizations, and third-party endpoints.
- **Forensic Chronological Timeline**: Real-time unified stream of website visits, network requests, and cookie operations with severity classification and multi-criteria filtering.
- **Consolidated Domain Forensics Table**: High-level inventory mapping domains, parent organizations, categories, first/third party boundaries, and artifact counts.
- **Visited Website Deep Forensics**: In-depth inspection profiles showing all cookies, third-party origins, and active tracking categories per website.
- **Scientific "Explain This Artifact" Layer**: Clear, non-alarmist technical explainers demystifying cookie attributes (`HttpOnly`, `Secure`, `SameSite`, `CHIPS`) while distinguishing observed facts from inferred behavior.
- **Zero-Transmission Guarantee**: 100% offline. Sensitive values and session tokens are securely masked (`abc1••••••89`) before persistence.

---

## Architecture & Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime Engine** | Chrome Extension Manifest V3 | Background service worker with audited least-privilege permissions. |
| **Domain Analysis** | Public Suffix List (via `tldts`) | Accurate eTLD+1 boundary detection (e.g. `example.co.uk`, `com.au`). |
| **Persistence** | Local IndexedDB | Indexed offline client storage with zero external network dispatch. |
| **Visualizations** | D3.js v7 | Force-directed simulations, hierarchical flow, zoom/pan controls. |
| **UI Framework** | React 18 & Tailwind CSS | Minimalist, clean dark theme interface. |
| **Testing Suite** | Vitest | Comprehensive unit and security edge-case test coverage. |

---

## Installation & Running

### 1. Build from Source
```bash
# Install dependencies
npm install

# Run unit & security test suite
npm test

# Build production extension package
npm run build
```

### 2. Load into Chrome / Chromium
1. Open Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the upper-right corner.
3. Click **Load unpacked** and select the generated `dist/` directory.
4. Click the **WhoIsTrackingMe** icon in your extension toolbar or open `chrome-extension://<EXTENSION_ID>/index.html` for the full Forensics Dashboard.

---

## Documentation Suite

- [`ARCHITECTURE.md`](ARCHITECTURE.md): System components, data flow, and IndexedDB schema.
- [`SECURITY.md`](SECURITY.md): Least privilege model, permission justifications, and XSS mitigations.
- [`PRIVACY.md`](PRIVACY.md): The zero-exfiltration policy, value masking, and fact vs. inference model.
- [`LIMITATIONS.md`](LIMITATIONS.md): Manifest V3 boundaries, partitioned storage (CHIPS), and browser sandboxes.
- [`THREAT_MODEL.md`](THREAT_MODEL.md): Assets, threat actors, trust boundaries, attack surfaces, and mitigations.
