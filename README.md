# AI Chat Completion Sound & Notifier (Chrome Extension v3.0)

Never wait staring at a loading spinner again. **AI Chat Completion Sound & Notifier** automatically plays a pleasant synthesized chime, flashes a `🔔 [Done]` badge in the tab title, and optionally sends a clickable system notification the moment your AI assistant finishes generating its response.

Built directly on top of your Tampermonkey v2.3 Web Audio API engine (`F#5 → B5` Pro Chime) and upgraded to a full **Manifest V3 Chrome Extension** with background-tab audio fallback (`chrome.offscreen`), a live settings popup, and support for all major AI chat platforms.

---

## Supported AI Platforms

| Platform | Domains Covered |
| :--- | :--- |
| **Google Gemini & AI Studio** | `gemini.google.com`, `aistudio.google.com` |
| **Anthropic Claude** | `claude.ai` |
| **OpenAI ChatGPT** | `chatgpt.com`, `chat.openai.com` |
| **Notion AI** | `notion.so`, `notion.com`, `notion.site` |
| **Perplexity AI** | `perplexity.ai` |
| **DeepSeek** | `chat.deepseek.com`, `deepseek.com` |
| **Microsoft Copilot** | `copilot.microsoft.com` |
| **Poe & Grok** | `poe.com`, `grok.com` |

---

## How to Install in Google Chrome / Brave / Edge (2 Minutes)

1. **Unzip** `ai_chat_completion_notifier.zip` to a permanent folder on your laptop (for example, `Documents/ai-chat-completion-sound`).
2. Open Google Chrome and navigate to:
   ```
   chrome://extensions/
   ```
3. In the top-right corner, toggle **Developer mode** **ON**.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the unzipped folder containing `manifest.json`.
6. Pin **AI Chat Completion Sound & Notifier** from your Chrome extensions puzzle icon (`🧩`) in the toolbar to test chimes, adjust volume, or customize notification rules anytime.

---

## Key Features & Improvements Over Tampermonkey

- **Guaranteed Background Audio (`chrome.offscreen` Fallback)**: Browsers often suspend Web Audio contexts in background tabs. If a tab's audio context is suspended while you are working in another app or window, the extension automatically routes the chime through Chrome's Offscreen Audio API so you never miss a completion sound.
- **5 Built-in Web Audio Chime Presets + Volume Slider**:
  - **Pro Chime (F#5 → B5 Original)**: Your exact warm low-pass filtered dual-oscillator chime from Tampermonkey v2.3.
  - **Crystal Triad**: Uplifting D5 → F#5 → D6 arpeggio.
  - **Warm Marimba**: Soft percussive triad.
  - **Zen Singing Bowl**: Deep harmonic bell.
  - **Modern Double Pulse**: Crisp two-note ping.
- **Smart Multi-Step Debounce**: Prevents premature chimes when AI models pause briefly between tool calls or thinking blocks.
- **Clickable System Notifications**: Optional OS banner notification that brings you straight back to the finished AI tab when clicked.
- **Console Diagnostics Preserved**: Open DevTools on any supported AI chat page and run `debugAI()` or `testAIChime()` anytime.
