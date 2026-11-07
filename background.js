// DoneDing v8.0 — Central Background Service Worker
const ICON_DATA_URI = "data:image/png;base64,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";

const DEFAULT_SETTINGS = {
    enabled: true,
    theme: 'carbon',
    soundEnabled: true,
    soundPreset: 'pro_chime',
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
    tabSounds: {},
    volume: 0.85,
    onlyWhenUnfocused: false,
    desktopNotification: true,
    inPageTopBanner: true,
    titleBadgeAlert: true,
    disabledHosts: {},
    mutedTabs: {},
    stats: {
        totalCompletions: 0,
        lastCompletedSite: null,
        lastCompletedSound: null,
        lastCompletedSoundLabel: null,
        lastCompletedTitle: null,
        lastCompletedElapsedMs: null,
        lastCompletedAt: null
    },
    recentCompletions: []
};

const SOUND_LABELS = {
    pro_chime: 'Pro Chime',
    warm_marimba: 'Warm Marimba',
    crystal_triad: 'Crystal Triad',
    double_pulse: 'Studio Pulse',
    soft_harp: 'Celestial Harp',
    gentle_zen: 'Resonant Bowl'
};

const HOST_CATALOG = [
    { id: 'gemini', test: u => u.includes('gemini.google.com'), name: 'Google Gemini', color: '#D97757', defaultSound: 'pro_chime' },
    { id: 'aistudio', test: u => u.includes('aistudio.google.com'), name: 'AI Studio', color: '#C26D53', defaultSound: 'pro_chime' },
    { id: 'notebooklm', test: u => u.includes('notebooklm.google.com'), name: 'NotebookLM', color: '#2E9077', defaultSound: 'soft_harp' },
    { id: 'claude', test: u => u.includes('claude.ai'), name: 'Claude', color: '#D97757', defaultSound: 'warm_marimba' },
    { id: 'chatgpt', test: u => u.includes('chatgpt.com') || u.includes('chat.openai.com'), name: 'ChatGPT', color: '#10A37F', defaultSound: 'crystal_triad' },
    { id: 'notion', test: u => u.includes('notion.so') || u.includes('notion.com') || u.includes('notion.site'), name: 'Notion AI', color: '#8A847C', defaultSound: 'soft_harp' },
    { id: 'deepseek', test: u => u.includes('deepseek.com'), name: 'DeepSeek', color: '#3B82F6', defaultSound: 'double_pulse' },
    { id: 'perplexity', test: u => u.includes('perplexity.ai'), name: 'Perplexity', color: '#20B2AA', defaultSound: 'gentle_zen' },
    { id: 'copilot', test: u => u.includes('copilot.microsoft.com') || u.includes('m365.cloud.microsoft'), name: 'Copilot', color: '#D97706', defaultSound: 'crystal_triad' },
    { id: 'grok', test: u => u.includes('grok.com') || u.includes('x.com/i/grok'), name: 'Grok', color: '#E11D48', defaultSound: 'double_pulse' },
    { id: 'poe', test: u => u.includes('poe.com'), name: 'Poe', color: '#C084FC', defaultSound: 'warm_marimba' },
    { id: 'mistral', test: u => u.includes('mistral.ai'), name: 'Mistral Le Chat', color: '#EA580C', defaultSound: 'pro_chime' },
    { id: 'qwen', test: u => u.includes('qwen.ai') || u.includes('qwenlm.ai'), name: 'Qwen Chat', color: '#0284C7', defaultSound: 'crystal_triad' },
    { id: 'kimi', test: u => u.includes('moonshot.cn') || u.includes('kimi.ai'), name: 'Kimi AI', color: '#0D9488', defaultSound: 'soft_harp' },
    { id: 'huggingchat', test: u => u.includes('huggingface.co/chat'), name: 'HuggingChat', color: '#CA8A04', defaultSound: 'pro_chime' },
    { id: 'meta', test: u => u.includes('meta.ai'), name: 'Meta AI', color: '#2563EB', defaultSound: 'crystal_triad' },
    { id: 'phind', test: u => u.includes('phind.com'), name: 'Phind', color: '#16A34A', defaultSound: 'double_pulse' },
    { id: 'you', test: u => u.includes('you.com'), name: 'You.com', color: '#0284C7', defaultSound: 'pro_chime' },
    { id: 'cohere', test: u => u.includes('cohere.com'), name: 'Cohere Coral', color: '#DB2777', defaultSound: 'warm_marimba' },
    { id: 'v0', test: u => u.includes('v0.dev'), name: 'Vercel v0', color: '#A8A298', defaultSound: 'double_pulse' },
    { id: 'bolt', test: u => u.includes('bolt.new'), name: 'Bolt.new', color: '#D97706', defaultSound: 'double_pulse' },
    { id: 'lovable', test: u => u.includes('lovable.dev'), name: 'Lovable', color: '#E11D48', defaultSound: 'soft_harp' },
    { id: 'replit', test: u => u.includes('replit.com'), name: 'Replit AI', color: '#EA580C', defaultSound: 'warm_marimba' },
    { id: 'character', test: u => u.includes('character.ai'), name: 'Character.AI', color: '#CA8A04', defaultSound: 'soft_harp' },
    { id: 'pi', test: u => u.includes('pi.ai'), name: 'Pi AI', color: '#15803D', defaultSound: 'gentle_zen' },
    { id: 'duck', test: u => u.includes('duck.ai'), name: 'Duck.ai', color: '#DC2626', defaultSound: 'pro_chime' },
    { id: 'blackbox', test: u => u.includes('blackbox.ai'), name: 'Blackbox AI', color: '#78736A', defaultSound: 'double_pulse' }
];

function matchPlatformFromUrl(urlStr) {
    if (!urlStr) return null;
    const lower = urlStr.toLowerCase();
    if (lower.startsWith('chrome://') || lower.startsWith('edge://') || lower.startsWith('about:')) return null;
    for (const item of HOST_CATALOG) {
        if (item.test(lower)) {
            let hostname = '';
            try { hostname = new URL(urlStr).hostname; } catch (e) {}
            return { ...item, hostname };
        }
    }
    return null;
}

const tabRegistry = new Map();

chrome.runtime.onInstalled.addListener(async () => {
    const existing = await chrome.storage.sync.get(null);
    const merged = {
        ...DEFAULT_SETTINGS,
        ...existing,
        siteSounds: { ...DEFAULT_SETTINGS.siteSounds, ...(existing.siteSounds || {}) },
        tabSounds: { ...(existing.tabSounds || {}) }
    };
    await chrome.storage.sync.set(merged);
    await refreshAllOpenTabs(true);
});

chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabRegistry.has(tabId)) {
        tabRegistry.delete(tabId);
        updateToolbarBadge();
        broadcastRegistryUpdate();
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' || changeInfo.title || changeInfo.url) {
        const matched = matchPlatformFromUrl(tab.url || '');
        if (matched) {
            const prev = tabRegistry.get(tabId) || {};
            tabRegistry.set(tabId, {
                tabId,
                windowId: tab.windowId,
                platformId: matched.id,
                platformName: matched.name,
                brandColor: matched.color,
                hostname: matched.hostname,
                title: (tab.title || matched.name).replace(/^\[Ready\]\s*/, ''),
                url: tab.url,
                isGenerating: Boolean(prev.isGenerating),
                generationStartTime: prev.generationStartTime || null,
                unreadDone: Boolean(prev.unreadDone),
                lastCompletedAt: prev.lastCompletedAt || null,
                lastElapsedMs: prev.lastElapsedMs || null,
                lastSoundPlayed: prev.lastSoundPlayed || null,
                lastUpdated: Date.now()
            });
            updateToolbarBadge();
            broadcastRegistryUpdate();
        } else if (tabRegistry.has(tabId)) {
            tabRegistry.delete(tabId);
            updateToolbarBadge();
            broadcastRegistryUpdate();
        }
    }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
    const entry = tabRegistry.get(tabId);
    if (entry && entry.unreadDone) {
        entry.unreadDone = false;
        tabRegistry.set(tabId, entry);
        updateToolbarBadge();
        broadcastRegistryUpdate();
    }
});

function updateToolbarBadge() {
    let generatingCount = 0;
    let unreadDoneCount = 0;

    for (const entry of tabRegistry.values()) {
        if (entry.isGenerating) generatingCount++;
        else if (entry.unreadDone) unreadDoneCount++;
    }

    if (generatingCount > 0) {
        chrome.action.setBadgeText({ text: String(generatingCount) });
        chrome.action.setBadgeBackgroundColor({ color: '#D97706' });
    } else if (unreadDoneCount > 0) {
        chrome.action.setBadgeText({ text: String(unreadDoneCount) });
        chrome.action.setBadgeBackgroundColor({ color: '#15803D' });
    } else {
        const totalOpen = tabRegistry.size;
        chrome.action.setBadgeText({ text: totalOpen > 0 ? String(totalOpen) : '' });
        chrome.action.setBadgeBackgroundColor({ color: '#2A2926' });
    }
}

function broadcastRegistryUpdate(extraBanner = null) {
    const tabsList = Array.from(tabRegistry.values()).sort((a, b) => {
        if (a.isGenerating !== b.isGenerating) return a.isGenerating ? -1 : 1;
        if (a.unreadDone !== b.unreadDone) return a.unreadDone ? -1 : 1;
        return (b.lastUpdated || 0) - (a.lastUpdated || 0);
    });
    chrome.runtime.sendMessage({
        target: 'popup',
        type: 'TAB_REGISTRY_UPDATED',
        tabs: tabsList,
        banner: extraBanner
    }).catch(() => {});
}

async function ensureOffscreenDocument() {
    const offscreenUrl = chrome.runtime.getURL('offscreen.html');
    if ('getContexts' in chrome.runtime) {
        const contexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT'],
            documentUrls: [offscreenUrl]
        });
        if (contexts.length > 0) return;
    }
    try {
        await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Play completion chime for AI chat sessions'
        });
    } catch (e) {}
}

async function playChimeCentral(preset, volume) {
    try {
        await ensureOffscreenDocument();
        const res = await chrome.runtime.sendMessage({
            target: 'offscreen',
            type: 'OFFSCREEN_PLAY_CHIME',
            preset,
            volume
        });
        return Boolean(res && res.ok);
    } catch (e) {
        return false;
    }
}

// Injected into whichever browser tab the user is viewing across the whole browser (<all_urls>)
// Uses Shadow DOM + Safe DOM creation (Zero innerHTML so YouTube/Google TrustedTypes CSP NEVER blocks it!)
function injectBrowserWideTopBanner(bannerPayload) {
    try {
        const existingHost = document.getElementById('doneding-banner-host');
        if (existingHost) existingHost.remove();

        const host = document.createElement('div');
        host.id = 'doneding-banner-host';
        host.style.cssText = 'all: initial; position: absolute; z-index: 2147483647;';

        const shadow = host.attachShadow({ mode: 'open' });

        const bar = document.createElement('div');
        bar.style.cssText = [
            'position: fixed',
            'top: 14px',
            'left: 50%',
            'transform: translateX(-50%) translateY(-14px) scale(0.98)',
            'z-index: 2147483647',
            'background: #161514',
            'color: #F2EFE9',
            'border: 1px solid #3E3C38',
            'border-radius: 10px',
            'padding: 8px 12px 8px 14px',
            'font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif',
            'font-size: 12.5px',
            'line-height: 1.35',
            'display: flex',
            'align-items: center',
            'gap: 12px',
            'box-shadow: 0 14px 34px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.35)',
            'opacity: 0',
            'cursor: pointer',
            'box-sizing: border-box',
            'overflow: hidden',
            'transition: opacity 0.22s cubic-bezier(0.22, 1, 0.36, 1), transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)'
        ].join(';');

        // Left brand accent line
        const accent = document.createElement('span');
        accent.style.cssText = `position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: ${bannerPayload.brandColor || '#E55A2B'};`;
        bar.appendChild(accent);

        // Body column
        const bodyWrap = document.createElement('div');
        bodyWrap.style.cssText = 'display: flex; flex-direction: column; gap: 2px;';

        // Top line: Platform name + elapsed seconds
        const topLine = document.createElement('div');
        topLine.style.cssText = 'display: flex; align-items: center; gap: 7px;';

        const nameSpan = document.createElement('span');
        nameSpan.style.cssText = 'font-weight: 650; color: #F2EFE9; letter-spacing: -0.01em;';
        nameSpan.textContent = `${bannerPayload.platformName} finished`;

        const timeSpan = document.createElement('span');
        timeSpan.style.cssText = 'font-size: 10.5px; font-variant-numeric: tabular-nums; color: #26B860; background: rgba(38,184,96,0.15); padding: 1px 6px; border-radius: 4px; font-weight: 600;';
        timeSpan.textContent = `${bannerPayload.elapsedSec}s`;

        topLine.appendChild(nameSpan);
        topLine.appendChild(timeSpan);
        bodyWrap.appendChild(topLine);

        // Subline: Sound tag + conversation title
        const subLine = document.createElement('div');
        subLine.style.cssText = 'display: flex; align-items: center; gap: 6px; font-size: 11px; color: #ABA59B;';

        const soundSpan = document.createElement('span');
        soundSpan.style.cssText = 'color: #E55A2B; font-weight: 600;';
        soundSpan.textContent = `♪ ${bannerPayload.soundDisplay}`;

        const dotSpan = document.createElement('span');
        dotSpan.textContent = '·';

        const titleSpan = document.createElement('span');
        titleSpan.style.cssText = 'max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #ABA59B;';
        titleSpan.textContent = bannerPayload.title || 'Response ready';

        subLine.appendChild(soundSpan);
        subLine.appendChild(dotSpan);
        subLine.appendChild(titleSpan);
        bodyWrap.appendChild(subLine);
        bar.appendChild(bodyWrap);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.title = 'Dismiss';
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = 'background: transparent; color: #8A847A; border: none; border-radius: 4px; padding: 3px 6px; font-size: 13px; cursor: pointer; line-height: 1; margin-left: 6px;';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            bar.style.opacity = '0';
            bar.style.transform = 'translateX(-50%) translateY(-14px) scale(0.98)';
            setTimeout(() => host.remove(), 240);
        });
        bar.appendChild(closeBtn);

        // Click anywhere on banner to switch straight to the finished AI tab!
        bar.addEventListener('click', () => {
            bar.style.opacity = '0';
            bar.style.transform = 'translateX(-50%) translateY(-14px) scale(0.98)';
            try {
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage && bannerPayload.sourceTabId) {
                    chrome.runtime.sendMessage({
                        type: 'FOCUS_AI_TAB',
                        tabId: bannerPayload.sourceTabId,
                        windowId: bannerPayload.sourceWindowId
                    });
                }
            } catch (err) {}
            setTimeout(() => host.remove(), 240);
        });

        shadow.appendChild(bar);
        document.documentElement.appendChild(host);

        requestAnimationFrame(() => {
            bar.style.opacity = '1';
            bar.style.transform = 'translateX(-50%) translateY(0) scale(1)';
        });

        setTimeout(() => {
            if (bar && host.parentNode) {
                bar.style.opacity = '0';
                bar.style.transform = 'translateX(-50%) translateY(-14px) scale(0.98)';
                setTimeout(() => { if (host.parentNode) host.remove(); }, 260);
            }
        }, 6500);
    } catch (e) {}
}

// Broadcasts the Top-Bar Notification Banner to the currently active tab in EVERY open Chrome window (plus the AI tab)
async function broadcastTopBannerAcrossBrowser(bannerPayload) {
    try {
        const activeTabs = await chrome.tabs.query({ active: true });
        const targetTabIds = new Set(activeTabs.map(t => t.id).filter(Boolean));
        if (bannerPayload.sourceTabId) {
            targetTabIds.add(bannerPayload.sourceTabId);
        }

        await Promise.allSettled(Array.from(targetTabIds).map(async (tid) => {
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tid },
                    func: injectBrowserWideTopBanner,
                    args: [bannerPayload]
                });
            } catch (e) {
                // Tab might be chrome:// or restricted page; ignore safely
            }
        }));
    } catch (e) {}
}

// Reliable Computer System Notification (OS Banner) using Base64 Data URI icon + ServiceWorker fallback
function triggerComputerSystemNotification(title, message, targetTabId = null, targetWindowId = null) {
    const notifId = 'doneding-os-' + Date.now() + '-' + (targetTabId || 0);
    try {
        chrome.notifications.create(notifId, {
            type: 'basic',
            iconUrl: ICON_DATA_URI,
            title: title,
            message: message,
            priority: 2,
            requireInteraction: false,
            silent: false
        }, (createdId) => {
            if (chrome.runtime.lastError || !createdId) {
                if (self.registration && self.registration.showNotification) {
                    self.registration.showNotification(title, {
                        body: message,
                        icon: ICON_DATA_URI,
                        tag: notifId
                    }).catch(() => {});
                }
                return;
            }

            if (targetTabId) {
                const clickHandler = (clickedId) => {
                    if (clickedId === createdId) {
                        chrome.tabs.update(targetTabId, { active: true });
                        if (targetWindowId) chrome.windows.update(targetWindowId, { focused: true });
                        const entry = tabRegistry.get(targetTabId);
                        if (entry) {
                            entry.unreadDone = false;
                            tabRegistry.set(targetTabId, entry);
                            updateToolbarBadge();
                            broadcastRegistryUpdate();
                        }
                        chrome.notifications.clear(createdId);
                        chrome.notifications.onClicked.removeListener(clickHandler);
                    }
                };
                chrome.notifications.onClicked.addListener(clickHandler);
            }
        });
    } catch (err) {
        if (self.registration && self.registration.showNotification) {
            self.registration.showNotification(title, {
                body: message,
                icon: ICON_DATA_URI
            }).catch(() => {});
        }
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type || message.target === 'offscreen') return false;

    if (message.type === 'TAB_STATE_SYNC') {
        if (sender && sender.tab && sender.tab.id) {
            const tabId = sender.tab.id;
            const prev = tabRegistry.get(tabId) || {};
            const updated = {
                tabId,
                windowId: sender.tab.windowId,
                platformId: message.platformId || prev.platformId || 'generic',
                platformName: message.platformName || prev.platformName || 'AI Chat',
                brandColor: message.brandColor || prev.brandColor || '#E55A2B',
                hostname: message.hostname || prev.hostname || '',
                title: message.title || sender.tab.title || prev.title || 'Conversation',
                url: sender.tab.url || prev.url || '',
                isGenerating: Boolean(message.isGenerating),
                generationStartTime: message.generationStartTime || (message.isGenerating ? Date.now() : null),
                unreadDone: message.isGenerating ? false : (message.clearUnread ? false : Boolean(prev.unreadDone)),
                lastCompletedAt: prev.lastCompletedAt || null,
                lastElapsedMs: prev.lastElapsedMs || null,
                lastSoundPlayed: prev.lastSoundPlayed || null,
                lastUpdated: Date.now()
            };
            tabRegistry.set(tabId, updated);
            updateToolbarBadge();
            broadcastRegistryUpdate();
        }
        sendResponse({ ok: true });
        return false;
    }

    if (message.type === 'GET_ALL_AI_TABS') {
        refreshAllOpenTabs(true).then((tabsList) => {
            sendResponse({ tabs: tabsList });
        });
        return true;
    }

    if (message.type === 'FOCUS_AI_TAB') {
        const targetTabId = Number(message.tabId);
        const targetWindowId = Number(message.windowId);
        if (targetTabId) {
            chrome.tabs.update(targetTabId, { active: true }).then(() => {
                if (targetWindowId) {
                    chrome.windows.update(targetWindowId, { focused: true });
                }
                const entry = tabRegistry.get(targetTabId);
                if (entry) {
                    entry.unreadDone = false;
                    tabRegistry.set(targetTabId, entry);
                    updateToolbarBadge();
                    broadcastRegistryUpdate();
                }
                sendResponse({ ok: true });
            }).catch(() => sendResponse({ ok: false }));
        }
        return true;
    }

    if (message.type === 'PLAY_SOUND_CENTRAL') {
        playChimeCentral(message.preset || 'pro_chime', message.volume ?? 0.85)
            .then((ok) => sendResponse({ ok }));
        return true;
    }

    if (message.type === 'AI_GENERATION_COMPLETED') {
        handleGenerationCompleted(message, sender).then((res) => sendResponse(res));
        return true;
    }

    return false;
});

async function refreshAllOpenTabs(injectIfMissing = false) {
    try {
        const allTabs = await chrome.tabs.query({});
        const activeIds = new Set(allTabs.map(t => t.id));
        for (const id of Array.from(tabRegistry.keys())) {
            if (!activeIds.has(id)) {
                tabRegistry.delete(id);
            }
        }

        await Promise.all(allTabs.map(async (tab) => {
            if (!tab.id || !tab.url) return;
            const matched = matchPlatformFromUrl(tab.url);
            if (!matched) return;

            const prev = tabRegistry.get(tab.id) || {};
            tabRegistry.set(tab.id, {
                tabId: tab.id,
                windowId: tab.windowId,
                platformId: matched.id,
                platformName: matched.name,
                brandColor: matched.color,
                hostname: matched.hostname,
                title: (tab.title || matched.name).replace(/^\[Ready\]\s*/, ''),
                url: tab.url,
                isGenerating: Boolean(prev.isGenerating),
                generationStartTime: prev.generationStartTime || null,
                unreadDone: Boolean(prev.unreadDone && !tab.active),
                lastCompletedAt: prev.lastCompletedAt || null,
                lastElapsedMs: prev.lastElapsedMs || null,
                lastSoundPlayed: prev.lastSoundPlayed || null,
                lastUpdated: prev.lastUpdated || Date.now()
            });

            try {
                const resp = await chrome.tabs.sendMessage(tab.id, { type: 'GET_TAB_STATUS' });
                if (resp && resp.supported) {
                    tabRegistry.set(tab.id, {
                        tabId: tab.id,
                        windowId: tab.windowId,
                        platformId: resp.platformId || matched.id,
                        platformName: resp.platformName || matched.name,
                        brandColor: resp.brandColor || matched.color,
                        hostname: resp.hostname || matched.hostname,
                        title: resp.cleanTitle || (tab.title || matched.name).replace(/^\[Ready\]\s*/, ''),
                        url: tab.url,
                        isGenerating: Boolean(resp.isGenerating),
                        generationStartTime: resp.generationStartTime || null,
                        unreadDone: Boolean(prev.unreadDone && !tab.active),
                        lastCompletedAt: prev.lastCompletedAt || null,
                        lastElapsedMs: prev.lastElapsedMs || null,
                        lastSoundPlayed: prev.lastSoundPlayed || null,
                        lastUpdated: Date.now()
                    });
                }
            } catch (err) {
                if (injectIfMissing && chrome.scripting) {
                    try {
                        await chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            files: ['sound_engine.js', 'content.js']
                        });
                    } catch (injectErr) {}
                }
            }
        }));
    } catch (e) {}

    updateToolbarBadge();
    return Array.from(tabRegistry.values()).sort((a, b) => {
        if (a.isGenerating !== b.isGenerating) return a.isGenerating ? -1 : 1;
        if (a.unreadDone !== b.unreadDone) return a.unreadDone ? -1 : 1;
        return (b.lastUpdated || 0) - (a.lastUpdated || 0);
    });
}

function resolveSessionSound(tabId, platformId, data) {
    if (tabId && data.tabSounds && data.tabSounds[tabId]) {
        return data.tabSounds[tabId];
    }
    if (platformId && data.siteSounds && data.siteSounds[platformId]) {
        return data.siteSounds[platformId];
    }
    const found = HOST_CATALOG.find(h => h.id === platformId);
    if (found && found.defaultSound) return found.defaultSound;
    return data.soundPreset || 'pro_chime';
}

async function handleGenerationCompleted(message, sender) {
    const data = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    const tabId = sender?.tab?.id;
    const windowId = sender?.tab?.windowId;
    const hostname = message.hostname || '';
    const platformId = message.platformId || 'generic';

    // 1. Check if master switch is off OR if this specific session/site is unchecked in Open Sessions
    const isSessionMuted = Boolean(
        !data.enabled ||
        (tabId && data.mutedTabs && data.mutedTabs[tabId]) ||
        (hostname && data.disabledHosts && data.disabledHosts[hostname])
    );

    if (isSessionMuted) {
        if (tabId) {
            const prev = tabRegistry.get(tabId) || {};
            tabRegistry.set(tabId, {
                ...prev,
                isGenerating: false,
                generationStartTime: null,
                unreadDone: false,
                lastUpdated: Date.now()
            });
            updateToolbarBadge();
            broadcastRegistryUpdate();
        }
        return { played: false, muted: true };
    }

    // 2. Check if "Background tabs only" is enabled and user is already viewing that AI tab
    if (data.onlyWhenUnfocused && message.tabFocused) {
        if (tabId) {
            const prev = tabRegistry.get(tabId) || {};
            tabRegistry.set(tabId, {
                ...prev,
                isGenerating: false,
                generationStartTime: null,
                unreadDone: false,
                lastUpdated: Date.now()
            });
            updateToolbarBadge();
            broadcastRegistryUpdate();
        }
        return { played: false, muted: true };
    }

    // 3. Resolve the sound assigned to this session
    const chosenSound = resolveSessionSound(tabId, platformId, data);
    const chosenSoundLabel = SOUND_LABELS[chosenSound] || 'Pro Chime';
    const isSoundEnabled = data.soundEnabled !== false;
    const soundDisplayText = isSoundEnabled ? chosenSoundLabel : `${chosenSoundLabel} (Sound Off)`;
    const elapsedSec = ((message.elapsedMs || 0) / 1000).toFixed(1);

    if (tabId) {
        const prev = tabRegistry.get(tabId) || {};
        tabRegistry.set(tabId, {
            ...prev,
            tabId,
            windowId,
            platformId,
            platformName: message.platformName || prev.platformName || 'AI Chat',
            brandColor: message.brandColor || prev.brandColor || '#E55A2B',
            hostname: hostname || prev.hostname || '',
            title: message.title || sender.tab.title || prev.title || 'AI Chat',
            url: sender.tab.url || prev.url || '',
            isGenerating: false,
            generationStartTime: null,
            unreadDone: !message.tabFocused,
            lastCompletedAt: Date.now(),
            lastElapsedMs: message.elapsedMs || 0,
            lastSoundPlayed: chosenSound,
            lastUpdated: Date.now()
        });
        updateToolbarBadge();
    }

    // 4. Save stats & recent completions
    const stats = data.stats || { totalCompletions: 0 };
    stats.totalCompletions = (stats.totalCompletions || 0) + 1;
    stats.lastCompletedSite = message.platformName || hostname;
    stats.lastCompletedSound = chosenSound;
    stats.lastCompletedSoundLabel = soundDisplayText;
    stats.lastCompletedTitle = message.title || 'Conversation';
    stats.lastCompletedElapsedMs = message.elapsedMs || 0;
    stats.lastCompletedAt = Date.now();
    stats.lastCompletedTabId = tabId || null;
    stats.lastCompletedWindowId = windowId || null;

    const recent = Array.isArray(data.recentCompletions) ? data.recentCompletions : [];
    recent.unshift({
        platformId,
        platformName: message.platformName || hostname,
        brandColor: message.brandColor || '#E55A2B',
        title: message.title || 'Conversation',
        soundPreset: chosenSound,
        soundLabel: soundDisplayText,
        elapsedMs: message.elapsedMs || 0,
        completedAt: Date.now(),
        tabId: tabId || null,
        windowId: windowId || null
    });
    const trimmedRecent = recent.slice(0, 12);
    await chrome.storage.sync.set({ stats, recentCompletions: trimmedRecent });

    broadcastRegistryUpdate({
        platformName: stats.lastCompletedSite,
        brandColor: message.brandColor || '#E55A2B',
        title: stats.lastCompletedTitle,
        soundPreset: chosenSound,
        soundLabel: soundDisplayText,
        elapsedMs: stats.lastCompletedElapsedMs,
        tabId: tabId || null,
        windowId: windowId || null
    });

    // 5. INDEPENDENT TRIGGER A: Top-Bar Notification Banner across the WHOLE browser!
    // Runs regardless of whether "Play completion sound" is checked or unchecked!
    if (data.inPageTopBanner !== false) {
        broadcastTopBannerAcrossBrowser({
            platformName: message.platformName || hostname || 'AI Chat',
            brandColor: message.brandColor || '#E55A2B',
            title: message.title || 'Response finished',
            elapsedSec,
            soundDisplay: soundDisplayText,
            sourceTabId: tabId || null,
            sourceWindowId: windowId || null
        });
    }

    // 6. INDEPENDENT TRIGGER B: Computer System Notification (OS Banner)
    if (data.desktopNotification !== false) {
        triggerComputerSystemNotification(
            `DoneDing · ${message.platformName || 'AI Chat'} Ready (${elapsedSec}s)`,
            `${message.title || 'Response finished'} · ♪ ${soundDisplayText}`,
            tabId || null,
            windowId || null
        );
    }

    // 7. INDEPENDENT TRIGGER C: Play Completion Sound (ONLY if soundEnabled is checked)
    let playedCentral = false;
    if (isSoundEnabled) {
        playedCentral = await playChimeCentral(chosenSound, data.volume ?? 0.85);
    }

    return {
        played: playedCentral,
        soundEnabled: isSoundEnabled,
        muted: false,
        soundPreset: chosenSound,
        soundLabel: soundDisplayText,
        volume: data.volume ?? 0.85
    };
}
