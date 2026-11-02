// DoneDing v8.0 — Content Script for 27 AI Chat Platforms
(function() {
    'use strict';

    window.dispatchEvent(new CustomEvent('__doneding_cleanup__'));

    let isActiveInstance = true;
    let pollIntervalId = null;
    let mutationObserver = null;
    let titleFlashTimer = null;
    let stopDebounceTimer = null;

    window.addEventListener('__doneding_cleanup__', () => {
        isActiveInstance = false;
        if (pollIntervalId) clearInterval(pollIntervalId);
        if (mutationObserver) mutationObserver.disconnect();
        if (titleFlashTimer) clearInterval(titleFlashTimer);
        if (stopDebounceTimer) clearTimeout(stopDebounceTimer);
    }, { once: true });

    function isElementVisible(el) {
        if (!el) return false;
        if (typeof el.checkVisibility === 'function') {
            return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

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

    // Strictly scoped to Notion AI Chat ONLY — ignores Notion Settings modals, [role="dialog"], and regular page buttons!
    function isInsideNotionAIChat(el) {
        if (!el) return false;
        // 1. Never trigger inside Notion Settings & Members modal or general settings dialogs
        const dialog = el.closest('[role="dialog"]');
        if (dialog) {
            const dialogLabel = (dialog.getAttribute('aria-label') || '').toLowerCase();
            if (dialogLabel.includes('setting') || dialogLabel.includes('إعدادات') || dialog.querySelector('[class*="settings" i]')) {
                return false;
            }
        }

        // 2. Check if element is inside an explicit Notion AI chat panel/sidebar or prompt box
        if (el.closest('[class*="ai-chat" i], [class*="notion-ai" i], [data-testid*="ai-chat" i], [data-testid*="notion-ai" i]')) {
            return true;
        }

        // 3. Or check if the element shares a chat panel/composer container with a Notion AI prompt input
        let parent = el.parentElement;
        for (let depth = 0; depth < 7 && parent && parent !== document.body; depth++) {
            const promptInput = parent.querySelector(
                '[contenteditable="true"][placeholder*="AI" i], ' +
                '[contenteditable="true"][placeholder*="Ask" i], ' +
                '[contenteditable="true"][placeholder*="anything" i], ' +
                '[contenteditable="true"][placeholder*="follow-up" i], ' +
                '[contenteditable="true"][placeholder*="reply" i], ' +
                '[contenteditable="true"][placeholder*="اسأل" i], ' +
                'textarea[placeholder*="AI" i], ' +
                'textarea[placeholder*="Ask" i]'
            );
            if (promptInput && isElementVisible(promptInput)) {
                return true;
            }
            parent = parent.parentElement;
        }
        return false;
    }

    function checkNotionGenerating() {
        // 1. Check only explicit Stop buttons inside the Notion AI Chat composer
        const candidates = document.querySelectorAll(
            'button, [role="button"], [data-testid*="stop" i], [aria-label*="stop" i]'
        );

        for (const el of candidates) {
            if (!isElementVisible(el)) continue;

            const aria = (el.getAttribute('aria-label') || '').trim().toLowerCase();
            const title = (el.getAttribute('title') || '').trim().toLowerCase();
            const text = (el.textContent || '').trim().toLowerCase();

            // Explicit AI stop phrases ("stop generating", "stop writing", "esc to stop")
            if (/^(stop generating|stop writing|stop response|esc to stop|إيقاف الرد)$/i.test(aria) ||
                /^(stop generating|stop writing|stop response|esc to stop|إيقاف الرد)$/i.test(title) ||
                /^(stop generating|stop writing|esc to stop)$/i.test(text)) {
                return true;
            }

            // If a button is labeled "Stop" / "إيقاف", require it to be strictly inside the Notion AI Chat composer
            if ((aria === 'stop' || aria === 'إيقاف' || title === 'stop') && isInsideNotionAIChat(el)) {
                return true;
            }
        }

        // 2. Check leaf status indicators ("Thinking...", "Writing...", "Generating...") strictly inside Notion AI Chat
        const statusLeafs = document.querySelectorAll('span, div');
        for (const leaf of statusLeafs) {
            if (leaf.children.length > 0) continue;
            const txt = (leaf.textContent || '').trim();
            if (txt.length > 0 && txt.length <= 24 && /^(Thinking\.\.\.|Writing\.\.\.|Generating\.\.\.)$/i.test(txt)) {
                if (isElementVisible(leaf) && isInsideNotionAIChat(leaf)) {
                    return true;
                }
            }
        }

        return false;
    }

    function checkDeepSeekGenerating() {
        if (checkGenericAIGenerating()) return true;
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

    const PLATFORM_CATALOG = [
        { id: 'gemini', match: h => h.includes('gemini.google.com'), name: 'Google Gemini', color: '#D97757', check: checkGeminiGenerating },
        { id: 'aistudio', match: h => h.includes('aistudio.google.com'), name: 'AI Studio', color: '#C26D53', check: checkGeminiGenerating },
        { id: 'notebooklm', match: h => h.includes('notebooklm.google.com'), name: 'NotebookLM', color: '#2E9077', check: checkGeminiGenerating },
        { id: 'claude', match: h => h.includes('claude.ai'), name: 'Claude', color: '#D97757', check: checkClaudeGenerating },
        { id: 'chatgpt', match: h => h.includes('chatgpt.com') || h.includes('openai.com'), name: 'ChatGPT', color: '#10A37F', check: checkChatGPTGenerating },
        { id: 'notion', match: h => /notion\.(com|so|site)$/.test(h) || h.includes('notion'), name: 'Notion AI', color: '#8A847C', check: checkNotionGenerating },
        { id: 'deepseek', match: h => h.includes('deepseek.com'), name: 'DeepSeek', color: '#3B82F6', check: checkDeepSeekGenerating },
        { id: 'perplexity', match: h => h.includes('perplexity.ai'), name: 'Perplexity', color: '#20B2AA', check: checkGenericAIGenerating },
        { id: 'copilot', match: h => h.includes('copilot.microsoft.com') || h.includes('m365.cloud.microsoft'), name: 'Copilot', color: '#D97706', check: checkGenericAIGenerating },
        { id: 'grok', match: h => h.includes('grok.com') || h.includes('x.com'), name: 'Grok', color: '#E11D48', check: checkGenericAIGenerating },
        { id: 'poe', match: h => h.includes('poe.com'), name: 'Poe', color: '#C084FC', check: checkGenericAIGenerating },
        { id: 'mistral', match: h => h.includes('mistral.ai'), name: 'Mistral Le Chat', color: '#EA580C', check: checkGenericAIGenerating },
        { id: 'qwen', match: h => h.includes('qwen.ai') || h.includes('qwenlm.ai'), name: 'Qwen Chat', color: '#0284C7', check: checkGenericAIGenerating },
        { id: 'kimi', match: h => h.includes('moonshot.cn') || h.includes('kimi.ai'), name: 'Kimi AI', color: '#0D9488', check: checkGenericAIGenerating },
        { id: 'huggingchat', match: h => h.includes('huggingface.co'), name: 'HuggingChat', color: '#CA8A04', check: checkGenericAIGenerating },
        { id: 'meta', match: h => h.includes('meta.ai'), name: 'Meta AI', color: '#2563EB', check: checkGenericAIGenerating },
        { id: 'phind', match: h => h.includes('phind.com'), name: 'Phind', color: '#16A34A', check: checkGenericAIGenerating },
        { id: 'you', match: h => h.includes('you.com'), name: 'You.com', color: '#0284C7', check: checkGenericAIGenerating },
        { id: 'cohere', match: h => h.includes('cohere.com'), name: 'Cohere Coral', color: '#DB2777', check: checkGenericAIGenerating },
        { id: 'v0', match: h => h.includes('v0.dev'), name: 'Vercel v0', color: '#A8A298', check: checkGenericAIGenerating },
        { id: 'bolt', match: h => h.includes('bolt.new'), name: 'Bolt.new', color: '#D97706', check: checkGenericAIGenerating },
        { id: 'lovable', match: h => h.includes('lovable.dev'), name: 'Lovable', color: '#E11D48', check: checkGenericAIGenerating },
        { id: 'replit', match: h => h.includes('replit.com'), name: 'Replit AI', color: '#EA580C', check: checkGenericAIGenerating },
        { id: 'character', match: h => h.includes('character.ai'), name: 'Character.AI', color: '#CA8A04', check: checkGenericAIGenerating },
        { id: 'pi', match: h => h.includes('pi.ai'), name: 'Pi AI', color: '#15803D', check: checkGenericAIGenerating },
        { id: 'duck', match: h => h.includes('duck.ai'), name: 'Duck.ai', color: '#DC2626', check: checkGenericAIGenerating },
        { id: 'blackbox', match: h => h.includes('blackbox.ai'), name: 'Blackbox AI', color: '#78736A', check: checkGenericAIGenerating }
    ];

    function getPlatformInfo() {
        const host = location.hostname.toLowerCase();
        for (const p of PLATFORM_CATALOG) {
            if (p.match(host)) return p;
        }
        return { id: 'generic', name: 'AI Chat', color: '#E55A2B', check: checkGenericAIGenerating };
    }

    function getCleanTabTitle() {
        return (document.title || '').replace(/^\[Ready\]\s*/, '').replace(/^🔔\s*(\[Done\]\s*)?/, '').trim() || getPlatformInfo().name;
    }

    function checkIsGenerating() {
        return getPlatformInfo().check();
    }

    let originalTitle = null;

    function triggerTitleAlert() {
        if (document.hasFocus()) return;
        if (titleFlashTimer) return;
        originalTitle = getCleanTabTitle();
        let toggle = true;
        titleFlashTimer = setInterval(() => {
            if (!isActiveInstance || document.hasFocus()) {
                clearTitleAlert();
                return;
            }
            document.title = toggle ? `[Ready] ${originalTitle}` : originalTitle;
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

    function syncStateWithBackground(currentlyGenerating, clearUnread = false) {
        if (!isActiveInstance) return;
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
        } catch (e) {}
    }

    function onGenerationComplete(elapsedMs) {
        if (!isActiveInstance) return;
        const tabFocused = document.hasFocus() && !document.hidden;
        const platform = getPlatformInfo();

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
                    tabFocused
                }, (resp) => {
                    if (chrome.runtime.lastError || !resp || resp.muted) return;

                    // Only play backup audio if soundEnabled is true AND central offscreen audio didn't play
                    if (resp.soundEnabled && !resp.played && window.AIChimeAudio && resp.soundPreset) {
                        window.AIChimeAudio.playChime(resp.soundPreset, resp.volume ?? 0.85);
                    }

                    triggerTitleAlert();
                });
            } catch (e) {}
        }
    }

    function evaluateState() {
        if (!isActiveInstance) return;
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
            }
        } else if (!currentlyRunning && isGenerating && !stopDebounceTimer) {
            stopDebounceTimer = setTimeout(() => {
                stopDebounceTimer = null;
                if (!isActiveInstance || checkIsGenerating()) return;

                const elapsed = Date.now() - generationStartTime;
                isGenerating = false;

                if (elapsed >= 500) {
                    onGenerationComplete(elapsed);
                } else {
                    syncStateWithBackground(false);
                }
            }, 350);
        }
    }

    setTimeout(() => syncStateWithBackground(checkIsGenerating()), 150);

    let lastSentTitle = '';
    pollIntervalId = setInterval(() => {
        if (!isActiveInstance) return;
        evaluateState();
        const curTitle = getCleanTabTitle();
        if (curTitle !== lastSentTitle) {
            lastSentTitle = curTitle;
            syncStateWithBackground(isGenerating);
        }
    }, 650);

    mutationObserver = new MutationObserver(evaluateState);
    mutationObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: true });

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            if (!isActiveInstance) return false;
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
                    generationStartTime: isGenerating ? generationStartTime : null
                });
                return false;
            }
            return false;
        });
    }
})();
