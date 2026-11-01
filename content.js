// DoneDing v6.0 — Content Script for 27 AI Chat Platforms, Per-Site Chimes & Top-Bar Alert Banner
(function() {
    'use strict';

    if (window.__DONEDING_LOADED__) return;
    window.__DONEDING_LOADED__ = true;

    const DEFAULT_SETTINGS = {
        enabled: true,
        theme: 'carbon',
        soundEnabled: true,
        soundPreset: 'pro_chime',
        useDistinctSiteSounds: true,
        siteSounds: {
            gemini: 'pro_chime',
            aistudio: 'pro_chime',
            notebooklm: 'soft_harp',
            claude: 'warm_marimba',
            chatgpt: 'crystal_triad',
            deepseek: 'double_pulse',
            notion: 'soft_harp',
            perplexity: 'gentle_zen',
            copilot: 'crystal_triad',
            grok: 'double_pulse',
            poe: 'warm_marimba',
            mistral: 'pro_chime',
            qwen: 'crystal_triad',
            kimi: 'soft_harp'
        },
        volume: 0.85,
        onlyWhenUnfocused: false,
        desktopNotification: true,
        inPageTopBanner: true,
        titleBadgeAlert: true,
        disabledHosts: {},
        mutedTabs: {}
    };

    let settings = { ...DEFAULT_SETTINGS };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => {
            settings = {
                ...DEFAULT_SETTINGS,
                ...stored,
                siteSounds: { ...DEFAULT_SETTINGS.siteSounds, ...(stored.siteSounds || {}) }
            };
        });
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'sync') {
                for (const [key, change] of Object.entries(changes)) {
                    settings[key] = change.newValue;
                }
            }
        });
    }

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

    // In-page Top-Bar Notification Pill (shows AI site + sound name when completion occurs)
    let topBannerTimer = null;
    function showInPageTopBanner(platform, elapsedMs, soundKey) {
        if (settings.inPageTopBanner === false) return;
        const soundLabel = (window.AIChimeAudio && window.AIChimeAudio.SOUND_LABELS[soundKey]) || 'Pro Chime';
        const elapsedSec = (elapsedMs / 1000).toFixed(1);

        let bar = document.getElementById('doneding-top-banner');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'doneding-top-banner';
            bar.style.cssText = [
                'position: fixed',
                'top: 12px',
                'left: 50%',
                'transform: translateX(-50%) translateY(-8px)',
                'z-index: 2147483647',
                'background: #141413',
                'color: #F2EFE9',
                'border: 1px solid #3E3C38',
                'border-radius: 6px',
                'padding: 7px 12px',
                'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                'font-size: 12px',
                'line-height: 1.3',
                'display: flex',
                'align-items: center',
                'gap: 10px',
                'box-shadow: 0 6px 20px rgba(0,0,0,0.42)',
                'opacity: 0',
                'transition: opacity 0.18s cubic-bezier(0.22, 1, 0.36, 1), transform 0.18s cubic-bezier(0.22, 1, 0.36, 1)'
            ].join(';');
            document.documentElement.appendChild(bar);
        }

        bar.innerHTML = `
            <span style="width:8px;height:8px;border-radius:2px;background:${platform.color};flex-shrink:0;"></span>
            <span style="font-weight:600;color:#F2EFE9;">DoneDing · ${platform.name} finished (${elapsedSec}s)</span>
            <span style="color:#ABA59B;border-left:1px solid #2B2A27;padding-left:8px;">Sound: ${soundLabel}</span>
            <button id="doneding-banner-replay" style="background:#E55A2B;color:#FAF8F5;border:none;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:600;cursor:pointer;">Replay</button>
        `;

        const replayBtn = bar.querySelector('#doneding-banner-replay');
        if (replayBtn) {
            replayBtn.onclick = (e) => {
                e.stopPropagation();
                if (window.AIChimeAudio) {
                    window.AIChimeAudio.playChime(soundKey, settings.volume);
                }
            };
        }

        requestAnimationFrame(() => {
            bar.style.opacity = '1';
            bar.style.transform = 'translateX(-50%) translateY(0)';
        });

        if (topBannerTimer) clearTimeout(topBannerTimer);
        topBannerTimer = setTimeout(() => {
            if (bar) {
                bar.style.opacity = '0';
                bar.style.transform = 'translateX(-50%) translateY(-8px)';
            }
        }, 4500);
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
        } catch (e) {}
    }

    async function onGenerationComplete(elapsedMs) {
        if (!settings.enabled) return;
        if (settings.disabledHosts && settings.disabledHosts[location.hostname]) return;

        const tabFocused = document.hasFocus() && !document.hidden;
        const platform = getPlatformInfo();
        const chosenSound = window.AIChimeAudio
            ? window.AIChimeAudio.resolveSoundForPlatform(platform.id, settings)
            : (settings.soundPreset || 'pro_chime');

        let playedInPage = false;

        if (!settings.onlyWhenUnfocused || !tabFocused) {
            if (settings.soundEnabled && window.AIChimeAudio) {
                playedInPage = await window.AIChimeAudio.playChime(chosenSound, settings.volume);
            }
            showInPageTopBanner(platform, elapsedMs, chosenSound);
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
                    soundPlayed: chosenSound,
                    elapsedMs,
                    tabFocused,
                    needsOffscreenAudio: Boolean(
                        settings.soundEnabled &&
                        (!settings.onlyWhenUnfocused || !tabFocused) &&
                        !playedInPage
                    )
                });
            } catch (e) {}
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
            }
        } else if (!currentlyRunning && isGenerating && !stopDebounceTimer) {
            stopDebounceTimer = setTimeout(() => {
                stopDebounceTimer = null;
                if (checkIsGenerating()) return;

                const elapsed = Date.now() - generationStartTime;
                isGenerating = false;

                // Automatic 500ms anti-flicker debounce (handled silently under the hood)
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

    window.testAIChime = () => {
        const platform = getPlatformInfo();
        const chosenSound = window.AIChimeAudio.resolveSoundForPlatform(platform.id, settings);
        return window.AIChimeAudio && window.AIChimeAudio.playChime(chosenSound, settings.volume);
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
