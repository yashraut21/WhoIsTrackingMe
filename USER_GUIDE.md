# WhoIsTrackingMe — User Guide

Welcome to **WhoIsTrackingMe**! This guide explains what the extension does in simple, everyday language, walks through every feature, and shows you practical steps you can take to protect your privacy online.

---

## Table of Contents
1. [What is WhoIsTrackingMe? (In Plain English)](#1-what-is-whoistrackingme-in-plain-english)
2. [How to Install the Extension](#2-how-to-install-the-extension)
3. [Tour of Every Feature](#3-tour-of-every-feature)
   - [The Quick Popup](#a-the-quick-popup)
   - [The Dashboard Overview & Privacy Score](#b-the-dashboard-overview--privacy-score)
   - [Websites List View](#c-websites-list-view)
   - [Cookie Forensics & Inspector](#d-cookie-forensics--inspector)
   - [The Interactive Tracking Graph](#e-the-interactive-tracking-graph)
   - [Activity Timeline](#f-activity-timeline)
   - [Known Tracker Catalog](#g-known-tracker-catalog)
4. [How to Use This Tool Effectively (Everyday Habits)](#4-how-to-use-this-tool-effectively-everyday-habits)
5. [What Security Measures You Can Take to Stay Safe](#5-what-security-measures-you-can-take-to-stay-safe)
6. [How the Privacy Exposure Score Works (0 to 10)](#6-how-the-privacy-exposure-score-works-0-to-10)
7. [Privacy & Security Guarantees](#7-privacy--security-guarantees)

---

## 1. What is WhoIsTrackingMe? (In Plain English)

Most people know that websites track them, but usually it happens completely in the dark. 

- Traditional **ad blockers** silently block things, but they don't explain *who* was watching you or *how* they do it.
- **WhoIsTrackingMe** works like an **X-ray camera for your browser**. It quietly observes what happens in the background and turns hidden surveillance into clear, readable evidence.

### What it checks for:
- **Cookies**: Little files dropped on your computer. Are they harmless login memories, or "super-cookies" set to expire in 10 years?
- **Third-Party Trackers**: Invisible scripts from companies (like Google, Meta, Criteo, TikTok) that load quietly when you visit an unrelated site.
- **Cross-Site Stalking**: When a single company spots you visiting news sites, shopping sites, and medical blogs, and connects the dots to build a profile about you.
- **Session Recorders**: Tools (like Hotjar or Microsoft Clarity) that can record your mouse clicks, scrolling, and typing habits.

> [!NOTE]
> **100% Private & Local**: WhoIsTrackingMe never sends any data off your computer. It has no remote servers, no analytics, and no accounts. All your history stays strictly in your browser's local memory.

---

## 2. How to Install the Extension

### For Chrome, Brave, Edge, or Vivaldi:
1. Build the extension or locate the `dist-chrome/` folder:
   ```bash
   npm run build:chrome
   ```
2. Open your browser's extension manager:
   - **Chrome**: `chrome://extensions`
   - **Brave**: `brave://extensions`
   - **Edge**: `edge://extensions`
   - **Vivaldi**: `vivaldi://extensions`
3. Turn on **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the `dist-chrome/` folder.
5. Click the puzzle icon in your browser toolbar and **pin** WhoIsTrackingMe.

### For Firefox:
1. Build the Firefox target:
   ```bash
   npm run build:firefox
   ```
2. Open `about:debugging#/runtime/this-firefox` in Firefox.
3. Click **Load Temporary Add-on…** and select `dist-firefox/manifest.json`.

---

## 3. Tour of Every Feature

### A. The Quick Popup
Click the WhoIsTrackingMe icon in your browser toolbar anytime you are on a webpage:
- **Active Origin**: Tells you the website you are currently looking at.
- **Quick Counters**:
  - **Cookies**: Total cookies stored for this site.
  - **Third-Party**: How many cookies were set by outside companies, not the site itself.
  - **Persistent**: How many cookies will remain on your computer even after you close your browser.
- **Open Forensics Dashboard**: Opens the full interactive dashboard in a new tab.

---

### B. The Dashboard Overview & Privacy Score
When you open the full dashboard, the first screen gives you a bird's-eye view:
- **Privacy Score Card (0 to 10)**: 
  - `0.0 – 2.9 (Green)`: Clean and safe. Minimal third parties, mostly temporary session cookies.
  - `3.0 – 6.4 (Amber)`: Moderate tracking. Common advertising tags and analytics are present.
  - `6.5 – 10.0 (Red)`: Heavy tracking. Multiple big tech trackers watching you across several sites with long-lasting identifiers.
- **Score Breakdown**: Click the info badge on the score card to see an exact mathematical explanation of why points were added.
- **Quick Action Bar**:
  - **Refresh**: Re-scans your browser cookies immediately.
  - **Clear All Data**: Wipes all stored history and observations from the extension database with one click.

---

### C. Websites List View
Click **Websites** in the left sidebar to see a clean, organized table of every website you've visited:
- **Domain Name**: The site address (e.g., `nytimes.com`).
- **Detected Trackers**: Visual badges showing which tracker networks were spotted (e.g., Google, Meta, Amazon).
- **Third-Party Requests**: The number of background requests made to outside servers.
- **Cookie Count**: How many cookies this site left behind.
- **Filter & Sort**:
  - Search by site name or tracker name.
  - Sort by: *Most Trackers*, *Most Cookies*, *Third-Party Count*, or *Alphabetical*.
  - Turn on **Trackers Only** to filter out benign sites.
- **Inspect**: Click on any site row to open a full drill-down showing every single cookie and network call made by that website.

---

### D. Cookie Forensics & Inspector
Click **Cookies** in the sidebar to view every cookie stored in your browser:
- **Masked Values**: For your security, actual session tokens and IDs are masked (e.g., `abc1••••••89`). Raw passwords and session keys are never stored or displayed in plain text.
- **Lifespan Countdown**: Clearly shows whether a cookie is:
  - *Session (Transient)*: Deleted automatically when you close your browser.
  - *Persistent (e.g., `365 days` or `2 years`)*: Stays on your hard drive across browser restarts.
- **Security Badges**:
  - `Secure`: Ensures the cookie is only sent over encrypted HTTPS connections.
  - `HttpOnly`: Prevents malicious JavaScript on a website from reading your cookie.
  - `SameSite (Strict / Lax / None)`: Controls whether the cookie can be sent across different websites.
  - `CHIPS (Partitioned)`: Modern privacy protection where cookies are partitioned so they cannot track you across different websites.
- **Explain Modal**: Click **Explain** next to any cookie to get a plain-English diagnosis of what this cookie does and whether it poses a privacy concern.

---

### E. The Interactive Tracking Graph
Click **Tracking Graph** in the sidebar to visually see how trackers follow you across the internet:
- **Flow Mode**: Shows a 3-column river diagram:
  1. *Left column*: Websites you visited.
  2. *Middle column*: Tracking companies (Google, Meta, etc.).
  3. *Right column*: Specific tracking endpoints.
- **Fullscreen Mode**: Click the **Expand / Fullscreen** icon in the graph toolbar to open an edge-to-edge canvas with smooth zoom and pan controls. Press `ESC` or the minimize button to exit.
- **Highlight Potential Concerns**: Click the **Highlight Concerns** toggle button:
  - Benign nodes dim out.
  - High-risk trackers (fingerprinters, session recorders, multi-site hubs) glow in vibrant red/rose so you can immediately see the biggest culprits.
- **Shortlist Concerns Drawer**: Click **Shortlist Concerns** to open a slide-out drawer listing your top privacy risks ordered by severity. Click any concern to automatically center and zoom the graph onto that node.
- **Pathway Explorer Tab**: If 2D graphs feel too busy, switch to the *Pathway Explorer* tab. It gives you a clean, step-by-step tree view where you can click a website and see an itemized checklist of everyone that was contacted.
- **Cross-Site Hubs Only Filter**: Check this box to instantly hide single-site trackers and only see companies that tracked you across **2 or more different websites**.

---

### F. Activity Timeline
Click **Timeline** in the sidebar to see a chronological live log of your browsing:
- Combines network calls and cookie events in reverse chronological order (newest first).
- **Review Priorities Only**: Turn this switch on to filter out ordinary traffic and only show high-priority events: ad bidding, session replay recordings, and persistent identifiers.

---

### G. Known Tracker Catalog
Click **Trackers** to explore the built-in intelligence catalog:
- Lists major tracking companies, their parent organizations, and their categories (Advertising, Analytics, Session Replay, Fingerprinting, Social Tracking).
- Search any company name (e.g., "ByteDance", "Oracle", "Criteo") to learn what their infrastructure is designed to do.

---

## 4. How to Use This Tool Effectively (Everyday Habits)

Here is a recommended 3-step routine to get the most out of WhoIsTrackingMe:

### 1. The Regular Reality Check (Once a Day or Week)
1. Open the dashboard and glance at your **Privacy Exposure Score**.
2. If your score is above **6.5 (Elevated)**, switch to the **Tracking Graph**.
3. Toggle on **Highlight Concerns** or open the **Shortlist Concerns** drawer.
4. Look at which companies are connecting the most sites together. Usually, you will find 1 or 2 big advertising networks bridging almost every site you visit.

### 2. Before & After Checking an Ad Blocker
If you use an ad blocker (like uBlock Origin) or a privacy browser (like Brave):
1. Browse a few news sites with your protection **turned off** and inspect WhoIsTrackingMe. Notice how many cookies and trackers appear.
2. Turn your protection **on**, clear your data in WhoIsTrackingMe, and browse the same sites again.
3. You will immediately see the difference in your Privacy Score and graph—giving you concrete proof of whether your blocker is actually doing its job.

### 3. Auditing Sensitive Websites
When visiting banking, medical, or government portals:
1. Check the **Quick Popup** on that tab.
2. Verify that there are **0 Third-Party** trackers.
3. If an official or sensitive site is loading advertising trackers or session recorders, that is an immediate red flag that your interaction is being shared with commercial brokers.

---

## 5. What Security Measures You Can Take to Stay Safe

Once WhoIsTrackingMe identifies who is tracking you, here are concrete, powerful actions you can take:

### Measure 1: Turn on Third-Party Cookie Blocking in Your Browser
This single setting stops over 80% of persistent tracking:
- **Chrome**: Go to `chrome://settings/cookies` $\rightarrow$ select **Block third-party cookies**.
- **Firefox**: Go to `about:preferences#privacy` $\rightarrow$ set Enhanced Tracking Protection to **Strict**.
- **Edge**: Go to `edge://settings/content/cookies` $\rightarrow$ enable **Block third-party cookies**.
- **Brave**: Brave Blocks third-party cookies by default via Brave Shields.

### Measure 2: Clear Long-Lived Cookies Identified by the Extension
- When WhoIsTrackingMe flags a cookie expiring in `1 year` or `2 years` from an ad company:
- Open your browser's site data settings:
  - Chrome: `chrome://settings/siteData`
  - Firefox: `about:preferences#privacy` $\rightarrow$ *Cookies and Site Data* $\rightarrow$ *Manage Data*
- Search for the offending tracking domain (e.g. `doubleclick.net`) and click **Remove**.

### Measure 3: Install uBlock Origin as Your Active Shield
- Remember: **WhoIsTrackingMe is your audit camera; uBlock Origin is your bodyguard.**
- Use both together. WhoIsTrackingMe will show you what sneaks through, while uBlock Origin will block the majority of scripts before they execute.

### Measure 4: Use Separate Profiles or Containers for Sensitive Accounts
- **The Danger**: If you check personal Facebook or Google in one tab, and browse medical symptoms or job boards in another tab, cross-site trackers can connect both sessions.
- **The Fix**:
  - In **Firefox**: Install the **Multi-Account Containers** extension. Keep Banking, Shopping, and Personal browsing in strictly isolated containers.
  - In **Chrome/Brave/Edge**: Create a separate **Browser Profile** (e.g., "Personal" vs. "General Browsing"). Profiles keep cookies completely separated.

### Measure 5: Set Up DNS-Level Tracker Blocking
- Instead of relying solely on browser extensions, block trackers for your entire device or home network:
  - **NextDNS** (`nextdns.io`): A free private DNS resolver that lets you turn on blocklists (like OISD or AdGuard). It blocks tracking domains before your browser even connects to them.
  - **Pi-hole**: A small home network filter that blocks ads and telemetry for every phone, laptop, and smart TV in your house.

---

## 6. How the Privacy Exposure Score Works (0 to 10)

The Privacy Score is completely transparent. There are no mysterious algorithms or hidden factors. Here is the exact point system:

| Factor | Points Added | Why We Flag It |
|---|:---:|---|
| **Device Fingerprinting** | **+1.0** per provider | Services that try to identify your specific computer or graphics card even if you delete your cookies. |
| **Session Replay Recorder** | **+0.9** per recorder | Recorders like Hotjar or FullStory that log your mouse clicks, scrolling, and inputs. |
| **Known Tracker Domain** | **+0.7** per domain | Verified tracking domains identified in your local network traffic. |
| **Cross-Site Organization** | **+0.6** per entity | A company that was caught seeing you across **2 or more completely different websites**. |
| **Advertising Network** | **+0.5** per network | Ad exchanges and retargeting providers building ad profiles. |
| **Persistent 3rd-Party Cookie** | **+0.4** per cookie | A cross-site cookie that saves to your disk and stays active after closing the browser. |

The final score is simply the sum of these points, capped between **0.0** (best) and **10.0** (maximum exposure).

---

## 7. Privacy & Security Guarantees

- **Zero Outbound Traffic**: The extension contains no network transmission code. It does not phone home, make telemetry calls, or contact external servers.
- **No Payload Inspection**: The extension never reads form passwords, credit card numbers, search box inputs, or POST request bodies. It only inspects domain hostnames and cookie headers.
- **Token Masking**: Sensitive cookie tokens are masked before saving to disk (e.g., `abc1••••••89`).
- **Automatic Storage Management**: To prevent consuming disk space, network observations are capped at 50,000 records, automatically pruned after 30 days, and expired cookies are periodically cleaned up every hour.
- **One-Click Total Wipe**: You can delete all collected data at any time by clicking **Clear All Data** in the dashboard.
