// DoneDing v7.0 — Content Script with Auto-Cleanup, Central Audio Delegation & Redesigned Top-Bar Alert
(function() {
    'use strict';

    // Clean up any previous DoneDing content script instance in this tab (prevents duplicate listeners after extension reload)
    window.dispatchEvent(new CustomEvent('__doneding_cleanup__'));

    let isActiveInstance = true;
    let pollIntervalId = null;
    let mutationObserver = null;
    let titleFlashTimer = null;
    let topBannerTimer = null;
    let stopDebounceTimer = null;

    window.addEventListener('__doneding_cleanup__', () => {
        isActiveInstance = false;
        if (pollIntervalId) clearInterval(pollIntervalId);
        if (mutationObserver) mutationObserver.disconnect();
        if (titleFlashTimer) clearInterval(titleFlashTimer);
        if (topBannerTimer) clearTimeout(topBannerTimer);
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

    // Redesigned Tactile Studio Top-Bar Notification Pill (inside webpage viewport)
    function showInPageTopBanner(platform, elapsedMs, soundKey, soundLabel, volume) {
        const elapsedSec = (elapsedMs / 1000).toFixed(1);

        let bar = document.getElementById('doneding-top-banner');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'doneding-top-banner';
            bar.style.cssText = [
                'position: fixed',
                'top: 14px',
                'left: 50%',
                'transform: translateX(-50%) translateY(-14px) scale(0.98)',
                'z-index: 2147483647',
                'background: #161514',
                'color: #F2EFE9',
                'border: 1px solid #33312E',
                'border-radius: 10px',
                'padding: 8px 10px 8px 12px',
                'font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif',
                'font-size: 12.5px',
                'line-height: 1.3',
                'display: flex',
                'align-items: center',
                'gap: 12px',
                'box-shadow: 0 12px 32px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3)',
                'opacity: 0',
                'transition: opacity 0.22s cubic-bezier(0.22, 1, 0.36, 1), transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)'
            ].join(';');
            document.documentElement.appendChild(bar);
        }

        bar.innerHTML = `
            <div style="display:flex;align-items:center;gap:9px;">
              <span style="width:10px;height:10px;border-radius:3px;background:${platform.color};display:inline-block;flex-shrink:0;"></span>
              <div style="display:flex;flex-direction:column;gap:1px;">
                <div style="display:flex;align-items:center;gap:6px;">
                  <span style="font-weight:650;color:#F2EFE9;letter-spacing:-0.01em;">${platform.name} completed</span>
                  <span style="font-size:11px;font-variant-numeric:tabular-nums;color:#26B860;background:rgba(38,184,96,0.14);padding:1px 6px;border-radius:4px;font-weight:600;">${elapsedSec}s</span>
                </div>
                <div style="font-size:11px;color:#ABA59B;display:flex;align-items:center;gap:5px;">
                  <span>DoneDing</span>
                  <span>·</span>
                  <span style="color:#E55A2B;font-weight:600;">♪ ${soundLabel}</span>
                </div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;padding-left:8px;border-left:1px solid #2B2A27;">
              <button id="doneding-banner-replay" style="background:#242320;color:#F2EFE9;border:1px solid #3E3C38;border-radius:6px;padding:4px 9px;font-size:11px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
                <span>♪ Replay</span>
              </button>
              <button id="doneding-banner-close" title="Dismiss" style="background:transparent;color:#8A847A;border:none;border-radius:5px;padding:3px 5px;font-size:13px;cursor:pointer;line-height:1;">✕</button>
            </div>
        `;

        const replayBtn = bar.querySelector('#doneding-banner-replay');
        if (replayBtn) {
            replayBtn.onclick = (e) => {
                e.stopPropagation();
                chrome.runtime.sendMessage({
                    type: 'PLAY_SOUND_CENTRAL',
                    preset: soundKey,
                    volume: volume ?? 0.85
                });
            };
        }

        const closeBtn = bar.querySelector('#doneding-banner-close');
        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                bar.style.opacity = '0';
                bar.style.transform = 'translateX(-50%) translateY(-14px) scale(0.98)';
            };
        }

        requestAnimationFrame(() => {
            bar.style.opacity = '1';
            bar.style.transform = 'translateX(-50%) translateY(0) scale(1)';
        });

        if (topBannerTimer) clearTimeout(topBannerTimer);
        topBannerTimer = setTimeout(() => {
            if (bar) {
                bar.style.opacity = '0';
                bar.style.transform = 'translateX(-50%) translateY(-14px) scale(0.98)';
            }
        }, 5500);
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
                    if (chrome.runtime.lastError || !resp) return;
                    // If session is unchecked/muted, do NOT show banner or flash title!
                    if (resp.muted) return;

                    // If central offscreen audio couldn't play for any reason, play once in-page as backup
                    if (!resp.played && window.AIChimeAudio && resp.soundPreset) {
                        window.AIChimeAudio.playChime(resp.soundPreset, resp.volume ?? 0.85);
                    }

                    if (resp.showBanner) {
                        showInPageTopBanner(
                            platform,
                            elapsedMs,
                            resp.soundPreset || 'pro_chime',
                            resp.soundLabel || 'Pro Chime',
                            resp.volume ?? 0.85
                        );
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
            if (!isActiveInstance) return;
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
                return true;
            }
        });
    }
})();
