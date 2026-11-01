// AI Chat Completion Sound & Notifier - Content Script
(function() {
    'use strict';

    const DEFAULT_SETTINGS = {
        enabled: true,
        soundEnabled: true,
        soundPreset: 'pro_chime',
        volume: 0.85,
        onlyWhenUnfocused: false,
        desktopNotification: true,
        titleBadgeAlert: true,
        minDurationMs: 500,
        disabledHosts: {}
    };

    let settings = { ...DEFAULT_SETTINGS };

    // Load settings & subscribe to live updates from popup
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => {
            settings = { ...DEFAULT_SETTINGS, ...stored };
        });
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'sync') {
                for (const [key, change] of Object.entries(changes)) {
                    settings[key] = change.newValue;
                }
            }
        });
    }

    // Wake up Web Audio engine on user interaction (from user's v2.3 script)
    ['click', 'keydown', 'pointerdown'].forEach(evt => {
        window.addEventListener(evt, () => {
            if (window.AIChimeAudio) {
                window.AIChimeAudio.primeAudio();
            }
        }, { capture: true, passive: true });
    });

    // Modern visibility check that works on position: fixed elements & SVGs
    function isElementVisible(el) {
        if (!el) return false;
        if (typeof el.checkVisibility === 'function') {
            return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    // --- Platform Detection Functions ---

    // 1. Google Gemini & Google AI Studio (Preserves user's v2.3 detection + enhancements)
    function checkGeminiGenerating() {
        const stopBtn = document.querySelector(
            'stop-button, ' +
            'button[data-test-id="stop-button"], ' +
            'button[data-testid="stop-button"], ' +
            'button[aria-label*="Stop response" i], ' +
            'button[aria-label*="Stop generating" i], ' +
            'button[aria-label*="Stop running" i], ' +
            'button[aria-label*="إيقاف الرد" i], ' +
            'button[aria-label*="إيقاف" i], ' +
            'button[aria-label*="Stop" i]'
        );
        if (stopBtn && isElementVisible(stopBtn)) return true;

        const inputContainer = document.querySelector('.input-area, .send-button-container, chat-window, ms-prompt-input-wrapper');
        if (inputContainer) {
            const icons = inputContainer.querySelectorAll('mat-icon, .google-symbols, .google-material-icons');
            for (const icon of icons) {
                const txt = icon.textContent.trim().toLowerCase();
                if ((txt === 'stop' || txt === 'stop_circle') && isElementVisible(icon)) {
                    return true;
                }
            }
        }
        return false;
    }

    // 2. Anthropic Claude (claude.ai)
    function checkClaudeGenerating() {
        const stopSelectors = [
            'button[aria-label*="Stop Response" i]',
            'button[aria-label*="Stop generating" i]',
            'button[aria-label*="Stop" i]',
            'button[data-testid*="stop" i]',
            '[data-is-streaming="true"]'
        ];
        const el = document.querySelector(stopSelectors.join(', '));
        if (el && isElementVisible(el)) return true;

        // Check composer area for a visible Stop button
        const buttons = document.querySelectorAll('fieldset button, form button, [ role=" region"] button');
        for (const btn of buttons) {
            if (!isElementVisible(btn)) continue;
            const label = ((btn.getAttribute('aria-label') || '') + ' ' + (btn.textContent || '')).trim().toLowerCase();
            if (label.includes('stop response') || label === 'stop' || label.includes('إيقاف')) {
                return true;
            }
        }
        return false;
    }

    // 3. OpenAI ChatGPT (chatgpt.com / chat.openai.com)
    function checkChatGPTGenerating() {
        const stopBtn = document.querySelector(
            'button[data-testid="stop-button"], ' +
            'button[aria-label*="Stop streaming" i], ' +
            'button[aria-label*="Stop generating" i], ' +
            'button[aria-label*="Stop" i], ' +
            '.result-streaming'
        );
        return Boolean(stopBtn && isElementVisible(stopBtn));
    }

    // 4. Notion AI (Preserves user's exact v2.3 detection)
    function checkNotionGenerating() {
        const clickable = document.querySelectorAll(
            'button, [role="button"], [data-testid*="stop" i], [aria-label*="stop" i]'
        );

        for (const el of clickable) {
            if (!isElementVisible(el)) continue;

            const aria = (el.getAttribute('aria-label') || '').toLowerCase();
            const title = (el.getAttribute('title') || '').toLowerCase();
            if (aria.includes('stop') || aria.includes('إيقاف') || title.includes('stop')) {
                return true;
            }

            const text = el.textContent.trim().toLowerCase();
            if (/^(stop|stop generating|stop writing|esc to stop)/i.test(text)) {
                return true;
            }

            const stopSquare = el.querySelector('svg rect, svg [d*="M2"], svg [d*="M3"]');
            if (stopSquare && el.closest('[class*="chat"], [class*="prompt"], [role="dialog"], form')) {
                return true;
            }
        }

        const overlays = document.querySelectorAll(
            '.notion-overlay-container, [class*="notion-ai"], [class*="ai-panel"], [role="dialog"]'
        );
        for (const container of overlays) {
            if (!isElementVisible(container)) continue;
            const text = container.textContent;
            if (/\b(Stop generating|Esc to stop|Writing\.\.\.|Thinking\.\.\.|Generating\.\.\.)/i.test(text)) {
                return true;
            }
        }

        return false;
    }

    // 5. Universal Fallback for Perplexity, DeepSeek, Copilot, Grok, Poe
    function checkGenericAIGenerating() {
        const stopBtn = document.querySelector(
            'button[aria-label*="Stop" i], ' +
            'button[data-testid*="stop" i], ' +
            'button[title*="Stop" i], ' +
            '[role="button"][aria-label*="Stop" i], ' +
            'button[aria-label*="إيقاف" i]'
        );
        if (stopBtn && isElementVisible(stopBtn)) return true;

        // DeepSeek / Poe / Perplexity stop buttons inside composer
        const buttons = document.querySelectorAll('button, [role="button"]');
        for (const btn of buttons) {
            if (!isElementVisible(btn)) continue;
            const text = (btn.textContent || '').trim().toLowerCase();
            if (text === 'stop' || text === 'stop generating' || text === 'stop responding') {
                return true;
            }
        }
        return false;
    }

    function getPlatformInfo() {
        const host = location.hostname.toLowerCase();
        if (host.includes('gemini.google.com')) return { name: 'Google Gemini', check: checkGeminiGenerating };
        if (host.includes('aistudio.google.com')) return { name: 'Google AI Studio', check: checkGeminiGenerating };
        if (host.includes('claude.ai')) return { name: 'Claude AI', check: checkClaudeGenerating };
        if (host.includes('chatgpt.com') || host.includes('openai.com')) return { name: 'ChatGPT', check: checkChatGPTGenerating };
        if (/notion\.(com|so|site)$/.test(host) || host.includes('notion')) return { name: 'Notion AI', check: checkNotionGenerating };
        if (host.includes('perplexity.ai')) return { name: 'Perplexity', check: checkGenericAIGenerating };
        if (host.includes('deepseek.com')) return { name: 'DeepSeek', check: checkGenericAIGenerating };
        if (host.includes('copilot.microsoft.com')) return { name: 'Microsoft Copilot', check: checkGenericAIGenerating };
        if (host.includes('poe.com')) return { name: 'Poe AI', check: checkGenericAIGenerating };
        if (host.includes('grok.com')) return { name: 'Grok', check: checkGenericAIGenerating };
        return { name: 'AI Chat', check: checkGenericAIGenerating };
    }

    function checkIsGenerating() {
        const platform = getPlatformInfo();
        return platform.check();
    }

    // Tab title badge alert helper when user is on another tab/window
    let originalTitle = null;
    let titleFlashTimer = null;

    function triggerTitleAlert(platformName) {
        if (!settings.titleBadgeAlert || document.hasFocus()) return;
        if (titleFlashTimer) return;
        originalTitle = document.title.replace(/^🔔\s*(\[Done\]\s*)?/, '');
        let toggle = true;
        titleFlashTimer = setInterval(() => {
            if (document.hasFocus()) {
                clearTitleAlert();
                return;
            }
            document.title = toggle ? `🔔 [Done] ${originalTitle}` : originalTitle;
            toggle = !toggle;
        }, 1200);
    }

    function clearTitleAlert() {
        if (titleFlashTimer) {
            clearInterval(titleFlashTimer);
            titleFlashTimer = null;
            if (originalTitle) {
                document.title = originalTitle;
            }
        }
    }

    window.addEventListener('focus', clearTitleAlert);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) clearTitleAlert();
    });

    // Core Completion Trigger
    async function onGenerationComplete(elapsedMs) {
        if (!settings.enabled) return;
        if (settings.disabledHosts && settings.disabledHosts[location.hostname]) return;

        const tabFocused = document.hasFocus() && !document.hidden;
        if (settings.onlyWhenUnfocused && tabFocused) {
            console.log('[AI Chime] 🔕 Generation finished while tab is active (onlyWhenUnfocused is enabled).');
            return;
        }

        const platform = getPlatformInfo();
        let playedInPage = false;

        if (settings.soundEnabled && window.AIChimeAudio) {
            playedInPage = await window.AIChimeAudio.playChime(settings.soundPreset, settings.volume);
            if (playedInPage) {
                console.log(`[AI Chime] 🔔 Chime played (${settings.soundPreset}).`);
            }
        }

        triggerTitleAlert(platform.name);

        // Notify background service worker (for offscreen audio fallback if in-page was blocked, stats & desktop notification)
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            try {
                chrome.runtime.sendMessage({
                    type: 'AI_GENERATION_COMPLETED',
                    hostname: location.hostname,
                    platformName: platform.name,
                    elapsedMs,
                    tabFocused,
                    needsOffscreenAudio: Boolean(settings.soundEnabled && !playedInPage)
                });
            } catch (e) {
                // Extension context invalidated or reloaded
            }
        }
    }

    let isGenerating = false;
    let generationStartTime = 0;
    let stopDebounceTimer = null;

    function evaluateState() {
        const currentlyRunning = checkIsGenerating();

        if (currentlyRunning) {
            // Cancel any pending completion debounce if the stop button re-appeared during streaming
            if (stopDebounceTimer) {
                clearTimeout(stopDebounceTimer);
                stopDebounceTimer = null;
            }
            if (!isGenerating) {
                isGenerating = true;
                generationStartTime = Date.now();
                clearTitleAlert();
                console.log('[AI Chime] 🟢 Generation detected...');
            }
        } else if (!currentlyRunning && isGenerating && !stopDebounceTimer) {
            // Wait 350ms to confirm generation truly finished (prevents false triggers during multi-step tool calls)
            stopDebounceTimer = setTimeout(() => {
                stopDebounceTimer = null;
                if (checkIsGenerating()) return; // Still running

                const elapsed = Date.now() - generationStartTime;
                isGenerating = false;

                const minDuration = Number(settings.minDurationMs) || 500;
                if (elapsed >= minDuration) {
                    console.log(`[AI Chime] 🏁 Generation finished (${elapsed}ms). Playing chime...`);
                    onGenerationComplete(elapsed);
                }
            }, 350);
        }
    }

    // Observe DOM mutations & poll every 600ms (just like user's v2.3 script)
    const observer = new MutationObserver(evaluateState);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    setInterval(evaluateState, 600);

    // Console diagnostic helpers (preserved from user's script)
    window.testAIChime = () => window.AIChimeAudio && window.AIChimeAudio.playChime(settings.soundPreset, settings.volume);
    window.debugAI = function() {
        const platform = getPlatformInfo();
        console.log('--- AI Chime Diagnostics (Extension v3.0) ---');
        console.log('Platform:', platform.name, `(${location.hostname})`);
        console.log('Audio State:', window.AIChimeAudio ? window.AIChimeAudio.getState() : 'missing');
        console.log('Currently Generating?:', checkIsGenerating());
        console.log('Active Settings:', settings);
    };

    // Listen for popup diagnostic/test messages
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            if (msg && msg.type === 'GET_TAB_STATUS') {
                const platform = getPlatformInfo();
                sendResponse({
                    supported: true,
                    platformName: platform.name,
                    hostname: location.hostname,
                    isGenerating: checkIsGenerating(),
                    audioState: window.AIChimeAudio ? window.AIChimeAudio.getState() : 'uninitialized'
                });
                return true;
            }
        });
    }

    console.log('[AI Chime] Extension v3.0 active. Type "debugAI()" in console to inspect state.');
})();
