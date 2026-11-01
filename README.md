# DoneDing v6.0 — Multi-Tab AI Completion Monitor

**DoneDing** monitors all your open AI chat tabs across Chrome simultaneously, plays a **distinct acoustic chime for each AI website** (so you can tell whether Gemini, Claude, ChatGPT, or DeepSeek finished purely by sound), displays a **top-bar notification banner showing the AI site and sound played**, and sends a **native computer system notification (Windows / macOS banner)**.

---

## What's New in DoneDing v6.0

1. **Instant `Open Sessions` Discovery (Fixed for Already-Open Tabs)**:
   - Uses direct URL matching + automatic `chrome.scripting` injection so even tabs that were opened *before* you installed or reloaded DoneDing appear immediately in **Open Sessions** without needing a page refresh.
2. **Per-Session Mute Checkbox & Removed Redundant "Sources" Tab**:
   - Every open AI tab in **Open Sessions** has its own checkbox on the left — uncheck any open AI chat tab/site whenever you want to silence it.
3. **Distinct Sound Per AI Website**:
   - When multiple AI websites are open at once, each platform plays its own distinct acoustic tone (e.g., **Gemini** = `Pro Chime`, **Claude** = `Warm Marimba`, **ChatGPT** = `Crystal Triad`, **DeepSeek / Grok** = `Studio Pulse`, **Notion / Kimi** = `Celestial Harp`, **Perplexity** = `Resonant Bowl`).
   - You can also change and preview each open AI site's sound directly from the dropdown inside its row on **Open Sessions**.
4. **Top-Bar Notification with Site & Sound Name**:
   - Both the extension top bar and the in-page top notification bar display which AI site finished and which sound tone played, complete with a 1-click **Sound Replay** button.
5. **Native Computer System Notification (`OS Banner`)**:
   - Sends a native Windows / macOS system notification when an AI response completes, plus a **Test OS Alert** button in **Acoustics & Alerts → Trigger conditions**.
