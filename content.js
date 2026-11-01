// AI Pulse v4.0 — Content Script for 25+ AI Chat Platforms & Live Multi-Tab Sync
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
        disabledHosts: {},
        mutedTabs: {}
    };

    let settings = { ...DEFAULT_SETTINGS };

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

    // Wake up Web Audio engine on user interaction
    ['click', 'keydown', 'pointerdown'].forEach(evt => {
        window.addEventListener(evt, () => {
            if (window.AIChimeAudio) {
                window.AIChimeAudio.primeAudio();
            }
        }, { capture: true, passive: true });
    });

    function isElementVisible(el) {
        if (!el) return false;
        if (typeof el.checkVisibility === 'function') {
            return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    // --- Platform-Specific & Universal Detection Functions ---

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

        const buttons = document.querySelectorAll('fieldset button, form button');
        for (const btn of buttons) {
            if (!isElementVisible(btn)) continue;
            const label = ((btn.getAttribute('aria-label') || '') + ' ' + (btn.textContent || '')).trim().toLowerCase();
            if (label.includes('stop response') || label === 'stop' || label.includes('إيقاف')) {
                return true;
            }
        }
        return false;
    }

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

    function checkDeepSeekGenerating() {
        if (checkGenericAIGenerating()) return true;
        // DeepSeek often uses a role="button" in the chat input area with a square SVG path
        const inputBtns = document.querySelectorAll('[class*="chat-input"] [role="button"], [class*="ds-icon-button"]');
        for (const b of inputBtns) {
            if (!isElementVisible(b)) continue;
            const aria = (b.getAttribute('aria-label') || '').toLowerCase();
            if (aria.includes('stop')) return true;
        }
        return false;
    }

    function checkGenericAIGenerating() {
        const stopBtn = document.querySelector(
            'button[aria-label*="Stop" i], ' +
            'button[data-testid*="stop" i], ' +
            'button[title*="Stop" i], ' +
            '[role="button"][aria-label*="Stop" i], ' +
            '[role="button"][title*="Stop" i], ' +
            'button[aria-label*="Cancel" i][class*="stop" i], ' +
            'button[aria-label*="إيقاف" i], ' +
            'button[aria-label*="Arrêter" i], ' +
            'button[aria-label*="Detener" i]'
        );
        if (stopBtn && isElementVisible(stopBtn)) return true;

        const buttons = document.querySelectorAll('button, [role="button"]');
        for (const btn of buttons) {
            if (!isElementVisible(btn)) continue;
            const text = (btn.textContent || '').trim().toLowerCase();
            if (
                text === 'stop' ||
                text === 'stop generating' ||
                text === 'stop responding' ||
                text === 'stop response' ||
                text === 'إيقاف'
            ) {
                return true;
            }
        }
        return false;
    }

    // Comprehensive Registry of 25+ AI Chat Platforms
    const PLATFORM_CATALOG = [
        { id: 'gemini', match: h => h.includes('gemini.google.com'), name: 'Google Gemini', color: '#3B82F6', check: checkGeminiGenerating },
        { id: 'aistudio', match: h => h.includes('aistudio.google.com'), name: 'Google AI Studio', color: '#2563EB', check: checkGeminiGenerating },
        { id: 'notebooklm', match: h => h.includes('notebooklm.google.com'), name: 'NotebookLM', color: '#0EA5E9', check: checkGeminiGenerating },
        { id: 'claude', match: h => h.includes('claude.ai'), name: 'Claude AI', color: '#D97757', check: checkClaudeGenerating },
        { id: 'chatgpt', match: h => h.includes('chatgpt.com') || h.includes('openai.com'), name: 'ChatGPT', color: '#10A37F', check: checkChatGPTGenerating },
        { id: 'notion', match: h => /notion\.(com|so|site)$/.test(h) || h.includes('notion'), name: 'Notion AI', color: '#64748B', check: checkNotionGenerating },
        { id: 'deepseek', match: h => h.includes('deepseek.com'), name: 'DeepSeek', color: '#4D6BFE', check: checkDeepSeekGenerating },
        { id: 'perplexity', match: h => h.includes('perplexity.ai'), name: 'Perplexity', color: '#14B8A6', check: checkGenericAIGenerating },
        { id: 'copilot', match: h => h.includes('copilot.microsoft.com') || h.includes('m365.cloud.microsoft'), name: 'MS Copilot', color: '#8B5CF6', check: checkGenericAIGenerating },
        { id: 'grok', match: h => h.includes('grok.com') || h.includes('x.com'), name: 'xAI Grok', color: '#F43F5E', check: checkGenericAIGenerating },
        { id: 'poe', match: h => h.includes('poe.com'), name: 'Poe AI', color: '#7C3AED', check: checkGenericAIGenerating },
        { id: 'mistral', match: h => h.includes('mistral.ai'), name: 'Mistral Le Chat', color: '#F97316', check: checkGenericAIGenerating },
        { id: 'qwen', match: h => h.includes('qwen.ai') || h.includes('qwenlm.ai'), name: 'Qwen AI', color: '#6366F1', check: checkGenericAIGenerating },
        { id: 'kimi', match: h => h.includes('moonshot.cn') || h.includes('kimi.ai'), name: 'Kimi AI', color: '#06B6D4', check: checkGenericAIGenerating },
        { id: 'huggingchat', match: h => h.includes('huggingface.co'), name: 'HuggingChat', color: '#EAB308', check: checkGenericAIGenerating },
        { id: 'meta', match: h => h.includes('meta.ai'), name: 'Meta AI', color: '#0081FB', check: checkGenericAIGenerating },
        { id: 'phind', match: h => h.includes('phind.com'), name: 'Phind', color: '#22C55E', check: checkGenericAIGenerating },
        { id: 'you', match: h => h.includes('you.com'), name: 'You.com', color: '#38BDF8', check: checkGenericAIGenerating },
        { id: 'cohere', match: h => h.includes('cohere.com'), name: 'Cohere Coral', color: '#EC4899', check: checkGenericAIGenerating },
        { id: 'v0', match: h => h.includes('v0.dev'), name: 'Vercel v0', color: '#94A3B8', check: checkGenericAIGenerating },
        { id: 'bolt', match: h => h.includes('bolt.new'), name: 'Bolt.new', color: '#F59E0B', check: checkGenericAIGenerating },
        { id: 'lovable', match: h => h.includes('lovable.dev'), name: 'Lovable', color: '#EC4899', check: checkGenericAIGenerating },
        { id: 'replit', match: h => h.includes('replit.com'), name: 'Replit AI', color: '#F97316', check: checkGenericAIGenerating },
        { id: 'character', match: h => h.includes('character.ai'), name: 'Character.AI', color: '#A855F7', check: checkGenericAIGenerating },
        { id: 'pi', match: h => h.includes('pi.ai'), name: 'Pi AI', color: '#10B981', check: checkGenericAIGenerating },
        { id: 'duck', match: h => h.includes('duck.ai'), name: 'Duck.ai', color: '#EF4444', check: checkGenericAIGenerating },
        { id: 'blackbox', match: h => h.includes('blackbox.ai'), name: 'Blackbox AI', color: '#6366F1', check: checkGenericAIGenerating }
    ];

    function getPlatformInfo() {
        const host = location.hostname.toLowerCase();
        for (const p of PLATFORM_CATALOG) {
            if (p.match(host)) return p;
        }
        return { id: 'generic', name: 'AI Chat', color: '#6366F1', check: checkGenericAIGenerating };
    }

    function getCleanTabTitle() {
        return (document.title || '').replace(/^🔔\s*(\[Done\]\s*)?/, '').trim() || getPlatformInfo().name;
    }

    function checkIsGenerating() {
        const platform = getPlatformInfo();
        return platform.check();
    }

    let originalTitle = null;
    let titleFlashTimer = null;

    function triggerTitleAlert() {
        if (!settings.titleBadgeAlert || document.hasFocus()) return;
        if (titleFlashTimer) return;
        originalTitle = getCleanTabTitle();
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
        syncStateWithBackground(false, true);
    }

    window.addEventListener('focus', clearTitleAlert);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) clearTitleAlert();
    });

    let isGenerating = false;
    let generationStartTime = 0;
    let stopDebounceTimer = null;

    function syncStateWithBackground(currentlyGenerating, clearUnread = false) {
        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) return;
        const platform = getPlatformInfo();
        try {
            chrome.runtime.sendMessage({
                type: 'TAB_STATE_SYNC',
                platformId: platform.id,
                platformName: platform.name,
                brandColor: platform.color,
                hostname: location.hostname,
                title: getCleanTabTitle(),
                isGenerating: Boolean(currentlyGenerating),
                generationStartTime: currentlyGenerating ? generationStartTime : null,
                clearUnread
            });
        } catch (e) {
            // Ignore when extension reloads
        }
    }

    async function onGenerationComplete(elapsedMs) {
        if (!settings.enabled) return;
        if (settings.disabledHosts && settings.disabledHosts[location.hostname]) return;

        const tabFocused = document.hasFocus() && !document.hidden;
        const platform = getPlatformInfo();
        let playedInPage = false;

        if (!settings.onlyWhenUnfocused || !tabFocused) {
            if (settings.soundEnabled && window.AIChimeAudio) {
                playedInPage = await window.AIChimeAudio.playChime(settings.soundPreset, settings.volume);
            }
            triggerTitleAlert();
        }

        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            try {
                chrome.runtime.sendMessage({
                    type: 'AI_GENERATION_COMPLETED',
                    platformId: platform.id,
                    platformName: platform.name,
                    brandColor: platform.color,
                    hostname: location.hostname,
                    title: getCleanTabTitle(),
                    elapsedMs,
                    tabFocused,
                    needsOffscreenAudio: Boolean(
                        settings.soundEnabled &&
                        (!settings.onlyWhenUnfocused || !tabFocused) &&
                        !playedInPage
                    )
                });
            } catch (e) {
                // Ignore
            }
        }
    }

    function evaluateState() {
        const currentlyRunning = checkIsGenerating();

        if (currentlyRunning) {
            if (stopDebounceTimer) {
                clearTimeout(stopDebounceTimer);
                stopDebounceTimer = null;
            }
            if (!isGenerating) {
                isGenerating = true;
                generationStartTime = Date.now();
                clearTitleAlert();
                syncStateWithBackground(true, true);
                console.log('[AI Pulse] 🟢 Generation started on', getPlatformInfo().name);
            }
        } else if (!currentlyRunning && isGenerating && !stopDebounceTimer) {
            stopDebounceTimer = setTimeout(() => {
                stopDebounceTimer = null;
                if (checkIsGenerating()) return;

                const elapsed = Date.now() - generationStartTime;
                isGenerating = false;

                const minDuration = Number(settings.minDurationMs) || 500;
                if (elapsed >= minDuration) {
                    console.log(`[AI Pulse] 🏁 Generation finished (${elapsed}ms).`);
                    onGenerationComplete(elapsed);
                } else {
                    syncStateWithBackground(false);
                }
            }, 350);
        }
    }

    // Initial registration with background multi-tab registry
    setTimeout(() => syncStateWithBackground(checkIsGenerating()), 250);

    // Keep title synced if conversation title changes
    let lastSentTitle = '';
    setInterval(() => {
        evaluateState();
        const curTitle = getCleanTabTitle();
        if (curTitle !== lastSentTitle) {
            lastSentTitle = curTitle;
            syncStateWithBackground(isGenerating);
        }
    }, 650);

    const observer = new MutationObserver(evaluateState);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });

    window.testAIChime = () => window.AIChimeAudio && window.AIChimeAudio.playChime(settings.soundPreset, settings.volume);
    window.debugAI = function() {
        const platform = getPlatformInfo();
        console.log('--- AI Pulse v4.0 Diagnostics ---');
        console.log('Platform:', platform.name, `(${location.hostname})`);
        console.log('Audio State:', window.AIChimeAudio ? window.AIChimeAudio.getState() : 'missing');
        console.log('Currently Generating?:', checkIsGenerating());
        console.log('Settings:', settings);
    };

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            if (msg && msg.type === 'GET_TAB_STATUS') {
                const platform = getPlatformInfo();
                sendResponse({
                    supported: true,
                    platformId: platform.id,
                    platformName: platform.name,
                    brandColor: platform.color,
                    hostname: location.hostname,
                    cleanTitle: getCleanTabTitle(),
                    isGenerating: checkIsGenerating(),
                    generationStartTime: isGenerating ? generationStartTime : null,
                    audioState: window.AIChimeAudio ? window.AIChimeAudio.getState() : 'uninitialized'
                });
                return true;
            }
        });
    }
})();
