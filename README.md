# DoneDing v7.0 — Multi-Tab AI Completion Monitor

**DoneDing** monitors all your open AI chat tabs across Chrome simultaneously, lets you pick a **custom completion sound directly on each open session**, displays a **redesigned top-bar notification card**, and triggers **native computer system notifications (Windows / macOS banners)**.

---

## What's New in DoneDing v7.0

1. **Redesigned Top-Bar Notification Card**:
   - Features a left brand-color accent bar, completion duration badge (`14.2s`), animated sound-wave SVG icon, active sound label, and one-click **Replay** button (both inside the popup and in the floating top-of-page alert pill).
2. **Fixed Computer System Notification (`OS Banner`)**:
   - Uses `chrome.runtime.getURL('icons/icon128.png')` required by Chrome Manifest V3 service workers plus a native `ServiceWorkerRegistration.showNotification` fallback so system notifications appear reliably on Windows and macOS.
3. **Fixed Per-Session Check/Uncheck & Per-Session Sound Selection (Zero Mixed Sounds)**:
   - Centralizes completion audio and mute validation in `background.js` (and stops any active Web Audio nodes before playing a new chime) so two sounds never mix together, and unchecking a session in **Open Sessions** completely silences its sound, top-bar banner, and system notification.
4. **Streamlined `Open Sessions` Layout**:
   - Removed the `"Idle"` label from inactive rows.
   - Enlarged the per-session sound selector with a crisp down-arrow chevron (`▾`).
   - Removed the separate `"Default acoustic signature"` list and moved **Output gain (Master volume)** directly onto **Open Sessions**.
