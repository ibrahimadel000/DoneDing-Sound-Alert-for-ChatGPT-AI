# DoneDing v8.0 — Whole-Browser AI Completion Monitor

**DoneDing** monitors all your open AI chat tabs across Chrome simultaneously, plays a **customizable sound per session**, displays a **browser-wide Top-Bar Notification Banner on whichever tab you are currently viewing**, and triggers **native computer system notifications**.

---

## What's New in DoneDing v8.0

1. **Whole-Browser Top-Bar Notification Banner (`<all_urls>`)**:
   - When an AI chat finishes generating in the background while you are browsing another tab (like YouTube, GitHub, Docs, or X), DoneDing automatically injects the floating **Top-Bar Notification Banner** right at the top of the webpage you are currently viewing!
   - Clicking the banner switches you straight back to the AI tab that finished.
2. **Removed "Replay" & "Test" Buttons**:
   - Removed the **Replay** button from the Top-Bar Notification Banner (both in-page and inside the popup) and removed the **Test Computer Alert** button from **Trigger Settings** for a cleaner interface.
3. **Completely Independent Sound & Visual Banner Toggles**:
   - Fixed an `offscreen.js` message-channel race condition and decoupled `Play completion sound` from `Top-bar notification banner`.
   - Unchecking **Play completion sound** now silences only the chime while the Top-bar notification banner continues to appear normally, and re-checking it restores the chime immediately.
4. **Embedded Base64 Icon for Computer System Notifications**:
   - Uses an inline Base64 PNG Data URI (`data:image/png;base64,...`) inside `chrome.notifications.create` so OS notifications never fail due to service worker path resolution.
