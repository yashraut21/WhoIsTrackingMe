# WhoIsTrackingMe — Comprehensive User & Scoring Guide

This guide provides an end-to-end walkthrough on how to use **WhoIsTrackingMe** to analyze browser tracking artifacts, understand privacy exposure risks, and take concrete defensive measures to protect your digital privacy.

---

## 1. How to Use WhoIsTrackingMe Effectively

WhoIsTrackingMe is a local-first digital forensics suite. Unlike ad blockers that silently filter network requests, WhoIsTrackingMe operates as an **audit and observability instrument**: it records, classifies, correlates, and explains tracking infrastructure and persistent browser artifacts without modifying web traffic.

### Quick Start Workflow

1. Open `chrome://extensions/` in Chrome or Chromium (Brave, Edge).
2. Toggle on **Developer mode** in the upper-right corner.
3. Click **Load unpacked** and select the compiled extension directory:
   ```text
   dist/
   ```
4. Pin the **WhoIsTrackingMe** icon to your extension toolbar for quick access.
5. Click the extension icon and select **Open Forensics Dashboard** (or navigate to `chrome-extension://<EXTENSION_ID>/index.html`).

### Step-by-Step Investigation Walkthrough

1. **Browse Naturally**: Browse 4 to 8 websites normally in separate tabs (e.g., a news site, an e-commerce store, a tech blog, a social platform). Keep WhoIsTrackingMe enabled in the background.
2. **Real-Time Capture**: While you browse, the background service worker automatically captures:
   - Accessible cookie metadata (name, domain, expiration date, SameSite, Secure, HttpOnly).
   - Real-time HTTP response `Set-Cookie` headers.
   - Outgoing third-party network request metadata (initiator site, target domain, HTTP method, resource type).
3. **Zero Invasiveness**: No browsing data, passwords, form fields, or search queries are ever intercepted or transmitted off your machine.

---

### Step 3: Quick Context via Toolbar Popup
Click the extension icon in the toolbar while viewing any tab:
- **Active Origin**: Confirms the first-party site currently being audited.
- **Site Cookies**: Displays the total count of cookies left by this site.
- **Third-Party vs. Persistent Ratio**: Highlights how many of the site's cookies are set by cross-origin entities and how many survive browser restarts.
- **Refresh & Dashboard Links**: Click **Open Full Forensics Dashboard** to transition into deep analysis.

---

### Step 4: Mastering the Forensics Dashboard

#### A. Forensics Overview (`Dashboard`)
- **Privacy Exposure Score Card**: Immediate heuristic rating (`0.0 - 10.0`) with an expandable button explaining the exact mathematical point breakdown.
- **6 Core Metric Cards**:
  1. *Total Cookies*: Cumulative cookies across your browser profile.
  2. *First-Party Cookies*: Cookies belonging directly to visited origins.
  3. *Third-Party Cookies*: Cross-origin cookies.
  4. *Persistent Identifiers*: Cookies with future expiration dates that survive browser closure.
  5. *Known Trackers*: Domains matched against our high-confidence intelligence database.
  6. *Unknown Third Parties*: Unclassified cross-origin infrastructure (e.g., CDNs, widgets).
- **Consolidated Domain Forensics Table**:
  - Filter by *Known Trackers*, *Unknown Third Parties*, or *First Party*.
  - Sort by total artifacts to see which entities accumulate the largest footprint.
  - Click any row to jump directly into that domain's forensic profile.

#### B. Website Profiles (`Websites`)
- Groups observed tracking by visited property (e.g., `nytimes.com`).
- Displays:
  - Total cookies and external domains triggered by that specific website.
  - Active tracking categories (e.g., Advertising, Analytics, Session Replay).
  - Complete cookies table with technical security flags (`Secure`, `HttpOnly`, `SameSite`) and masked values (`abc1••••••89`).
  - Click **Explain** on any artifact to open the scientific reasoning modal.

#### C. The Overhauled Tracking Graph & Pathway Explorer (`Tracking Graph`)
- **Forensic Purpose**: Exposing cross-site surveillance reach—answering *"Which third-party companies track me across multiple different sites, how do they correlate my browsing history, and what persistent tokens were dropped?"*
- **View Modes**:
  1. **Visual Flow Map (Canvas)**:
     - Three vertical columns: **1. Visited Websites** $\rightarrow$ **2. Surveillance Entities** $\rightarrow$ **3. Tracking Endpoints**.
     - **Persistent Zoom & Pan**: Viewport coordinates and scale are preserved across all interactions, filter selections, and hovers (no unexpected view resets).
     - **On-Canvas Navigation Controls**: Dedicated buttons for Zoom In (`+`), Zoom Out (`-`), Fit All Nodes to View, and Reset (`1:1`).
     - **Interactive Node Centering**: Clicking any node opens its evidence drawer and lets you smoothly center the canvas on that node.
     - **Hover Subgraph Isolation**: Hovering any node highlights its incoming/outgoing conduits while dimming unrelated nodes.
  2. **Pathway Explorer (Step-by-Step Tree)**:
     - Structured master-detail view designed for clear traversal without 2D graph clutter.
     - Select any visited website to see an itemized forensic chain:
       - Every third party notified (Google, Meta, Criteo, etc.)
       - Whether the entity acts as a **Cross-Site Hub** (linking this site with other visited properties)
       - All specific tracking endpoints contacted
       - Identifiers and cookies deposited (flagging persistent cross-session tokens)
  3. **Entity Footprint Hub**:
     - Pick an organization (Google, Meta, Microsoft, Amazon, Hotjar) from the dropdown.
     - View its cross-site reach hub and auto-generated narrative:
       *"Google tracking infrastructure was triggered across 4 of your visited websites (80% cross-site penetration)..."*
  4. **Cluster Physics**:
     - Force-directed D3 simulation showing attraction and clustering around central surveillance hubs.
- **Noise Reduction**:
  - **Cross-Site Hubs Only (2+ sites)**: Checkbox toggle to eliminate single-site noise and reveal exclusively multi-site surveillance bridges.

#### D. Forensic Chronological Timeline (`Timeline`)
- Unified reverse-chronological stream merging network communications and cookie events.
- **Priority Filter**: Toggle **Review Priorities Only** to isolate high-concern events (advertising networks, session replay recorders, and long-lived identifiers).
- Filter by website, category, or search keyword.

---

## 2. Why This is Helpful from a Privacy Perspective

### 1. Transparency Over "Black-Box" Blocking
Standard ad blockers block network requests silently based on filter lists. While effective, they do not explain *who* is tracking you, *how* cross-site correlation occurs, or *which* security posture your cookies maintain. WhoIsTrackingMe provides complete visibility.

### 2. Uncovering Cross-Site Surveillance Hubs
The primary privacy threat on the modern web is not a single website remembering your login; it is a **single third-party entity embedded across dozens of unrelated websites**. By mapping cross-site penetration, WhoIsTrackingMe reveals which conglomerates hold the technical capability to build a unified profile of your interests.

### 3. Auditing Security Hygiene of Stored Cookies
- **Missing `HttpOnly`**: Indicates client-side scripts can read the cookie via `document.cookie`, increasing vulnerability to XSS token theft.
- **Missing `Secure`**: Indicates cookies may be transmitted over unencrypted HTTP connections.
- **Overextended Lifetimes**: Identifies cookies configured to persist for 2, 5, or 10 years on disk.

### 4. Detecting Behavioral & Session Replay Recorders
WhoIsTrackingMe flags session replay infrastructure (Hotjar, FullStory, Microsoft Clarity) which can capture mouse movements, scrolling behavior, and form interactions.

---

## 3. Actionable Defense: How to Protect Your Privacy & Security

When WhoIsTrackingMe flags elevated exposure, here are concrete steps to harden your browser:

### Action 1: Enforce Browser Third-Party Cookie Blocking
- In Chrome: Go to `chrome://settings/cookies` and select **Block third-party cookies**.
- In Firefox: Enable **Enhanced Tracking Protection (Strict)**, which activates *Total Cookie Protection* (partitioning cookie jars per top-level website).
- In Brave: Shields block third-party storage by default.

### Action 2: Purge Persistent Identifiers Flagged by WhoIsTrackingMe
- Use the **Cookie Inventory** in WhoIsTrackingMe to identify cookies with expiration dates years into the future.
- In Chrome: Navigate to `chrome://settings/siteData`, search for the specific domain (e.g. `doubleclick.net`), and delete its stored data.

### Action 3: Deploy Layered Content & Script Blockers
- **uBlock Origin**: Use uBlock Origin alongside WhoIsTrackingMe. While WhoIsTrackingMe serves as your forensic audit camera, uBlock Origin acts as your enforcement shield.
- **Privacy Badger**: Automatically learns and restricts domains that appear across multiple visited sites.

### Action 4: Implement DNS-Level Tracker Filtering
- Configure encrypted DNS (DNS-over-HTTPS) using privacy-filtering resolvers:
  - **NextDNS**: Configurable cloud DNS with blocklists (OISD, AdGuard).
  - **Pi-hole / AdGuard Home**: Network-wide hardware DNS filtering that prevents tracking requests from ever resolving.

### Action 5: Contextual Site Isolation (Containers & Profiles)
- Separate sensitive browsing (banking, personal email) from general browsing (news, social media, shopping) by using **Chrome Profiles** or **Firefox Multi-Account Containers**. This prevents shared parent tracking organizations from linking your sessions.

---

## 4. Detailed Scoring Guide: Privacy Exposure Index

The **Privacy Exposure Score** is a deterministic, explainable heuristic index ranging from **0.0** (clean / isolated) to **10.0** (maximum observed tracking surface).

> [!NOTE]
> The score does **not** represent an objective probability of compromise or legal non-compliance. It is an empirical index measuring your active **exposure surface** based strictly on local evidence.

### Formula & Weights Configuration
All weights are transparently configured in [`src/analysis/risk-config.ts`](src/analysis/risk-config.ts):

$$\text{Raw Score} = \sum (\text{Factor Points})$$
$$\text{Privacy Exposure Score} = \min(10.0, \max(0.0, \text{Round}(\text{Raw Score}, 1)))$$

### Point Breakdown Table

| Forensic Factor | Weight | Condition / Multiplier | Why It Matters |
| :--- | :--- | :--- | :--- |
| **Known Tracking Infrastructure** | `+0.7` | Per verified tracking domain in traffic | Confirmed communication with curated analytics, advertising, or telemetry providers. |
| **Cross-Site Tracking Reach** | `+0.6` | Per parent organization observed across $\ge 2$ distinct visited websites | Directly measures cross-site correlation capability (e.g., Google or Meta seeing you across multiple sites). |
| **Commercial Advertising Networks** | `+0.5` | Per advertising exchange / retargeting domain | High likelihood of commercial audience profiling and programmatic real-time bidding (RTB). |
| **Persistent Third-Party Identifiers** | `+0.4` | Per non-session third-party cookie | Persistent disk state that survives browser restarts in a third-party context. |
| **Session Replay Recorders** | `+0.9` | Per session replay domain (Hotjar, FullStory, Clarity) | Captures granular behavioral telemetry (DOM inputs, mouse pathing, scroll depth). |
| **Device Fingerprinting** | `+1.0` | Per fingerprinting provider (Fingerprint.com) | Attempts to identify hardware/browser entropy independent of cookies. |

---

### Score Ranges & Qualitative Tiers

| Score Range | Tier | Visual Indicator | Forensic Interpretation | Recommended Action |
| :---: | :--- | :---: | :--- | :--- |
| **0.0 – 2.9** | **Minimal Exposure** | 🟢 Green | Minimal or strictly first-party infrastructure. Most cookies are session-only. | Maintain standard browsing hygiene. |
| **3.0 – 6.4** | **Moderate Exposure** | 🟡 Amber | Several third-party analytics tags or advertising cookies detected across 1–2 properties. | Enable third-party cookie blocking in browser settings. |
| **6.5 – 10.0** | **Elevated Exposure** | 🔴 Crimson | Multiple major surveillance hubs observed across disparate websites with persistent identifiers. | Purge persistent cookies, enable strict site containers, and verify tracker blocking. |

---

### Step-by-Step Calculation Walkthrough

Imagine you visit `nytimes.com` and `cnn.com`. The extension observes:
- `nytimes.com` calls `doubleclick.net` (Advertising, Google) and sets 1 persistent cookie `IDE`.
- `cnn.com` calls `doubleclick.net` (Advertising, Google) and `google-analytics.com` (Analytics, Google).
- `nytimes.com` calls `hotjar.com` (Session Replay).

The score is calculated transparently:
1. **Known Trackers**: 3 unique domains (`doubleclick.net`, `google-analytics.com`, `hotjar.com`) $\times 0.7 = \mathbf{+2.1}$
2. **Cross-Site Reach**: 1 entity (`Google`) observed on both `nytimes.com` and `cnn.com` $\times 0.6 = \mathbf{+0.6}$
3. **Advertising Infrastructure**: 1 ad network (`doubleclick.net`) $\times 0.5 = \mathbf{+0.5}$
4. **Session Replay**: 1 replay service (`hotjar.com`) $\times 0.9 = \mathbf{+0.9}$
5. **Persistent 3rd-Party Cookie**: 1 cookie (`IDE`) $\times 0.4 = \mathbf{+0.4}$

$$\text{Total Raw Score} = 2.1 + 0.6 + 0.5 + 0.9 + 0.4 = \mathbf{4.5}$$

**Result Displayed in Dashboard**:
```text
Privacy Exposure Score: 4.5 / 10 (Moderate Exposure)
├── +2.1 Known tracking infrastructure (3 domains)
├── +0.9 Session replay behavioral recorders (1 service)
├── +0.6 Cross-site tracking reach (1 organization spanning multiple sites)
├── +0.5 Commercial advertising networks (1 network)
└── +0.4 Persistent third-party identifiers (1 cookie)
```
No hidden variables. Completely explainable.
