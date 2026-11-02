<div align="center">

# DoneDing

### Know the moment your AI is done.

A Chrome extension that keeps track of AI conversations across your open tabs and lets you know when a response is ready — even when you're working somewhere else.

</div>

---

## Overview

**DoneDing** monitors AI chat tabs across Chrome, so you don't have to keep switching between conversations to check whether a response has finished.

When an AI chat completes, DoneDing can play a customizable sound for that session, show a notification banner on the tab you're currently viewing, and send a native desktop notification.

## Features

- **Browser-wide monitoring** — Track supported AI chat sessions across multiple open Chrome tabs.
- **Per-session sounds** — Use customizable completion sounds for individual sessions.
- **Top-bar notification banner** — See when an AI response finishes, even while browsing another tab.
- **Quick return to the conversation** — Click the banner to jump back to the AI tab that completed.
- **Native desktop notifications** — Receive system-level alerts when a response is ready.
- **Independent notification controls** — Turn completion sounds and the in-page banner on or off separately.

## How it works

1. Keep your AI chat conversations open in Chrome.
2. Continue working in another tab while DoneDing monitors the conversations.
3. When a response finishes, DoneDing displays the notifications enabled in your settings.
4. Select the banner to return directly to the completed conversation.

## What's new in v8.0

### Browser-wide notification banner

The notification banner can appear on the webpage you're currently viewing when an AI chat finishes in another tab. This includes sites such as YouTube, GitHub, Google Docs, and X. Selecting the banner takes you back to the AI conversation that completed.

### Independent sound and banner settings

Completion sounds and the top-bar banner now operate independently. Disabling **Play completion sound** silences the chime without disabling the banner. You can manage each notification type separately.

### Cleaner controls

The **Replay** controls have been removed from the banner and extension popup. The **Test Computer Alert** button has also been removed from Trigger Settings.

### More reliable desktop notification icon

Desktop notifications use an embedded Base64 PNG data URI for their icon. This avoids notification failures caused by service-worker path resolution.

---

## Permissions and privacy

DoneDing's browser-wide banner feature uses the `<all_urls>` host permission so it can display a notification on the page you're currently viewing, including when the completed AI conversation is open in another tab.

Review the extension's requested permissions in Chrome before installing or enabling it. Only grant permissions you are comfortable with.

## Version

**Current documented version:** `v8.0`

---

<div align="center">

**DoneDing** · Stay focused. Get notified. Get back to it.

</div>
