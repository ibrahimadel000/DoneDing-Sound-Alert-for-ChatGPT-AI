// DoneDing v6.0 — Background Service Worker, Multi-Tab Session Manager & System Notification Router
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
    mutedTabs: {},
    stats: {
        totalCompletions: 0,
        lastCompletedSite: null,
        lastCompletedSound: null,
        lastCompletedTitle: null,
        lastCompletedElapsedMs: null,
        lastCompletedAt: null
    },
    recentCompletions: []
};

const SOUND_LABELS = {
    pro_chime: 'Pro Chime (F#5 → B5)',
    crystal_triad: 'Crystal Triad',
    warm_marimba: 'Warm Marimba',
    soft_harp: 'Celestial Harp',
    gentle_zen: 'Resonant Bowl',
    double_pulse: 'Studio Pulse'
};

// Direct URL catalog so background.js can identify open AI tabs IMMEDIATELY even before content.js pings back!
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
        siteSounds: { ...DEFAULT_SETTINGS.siteSounds, ...(existing.siteSounds || {}) }
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
            justification: 'Play completion chime when AI finishes generating in background tab'
        });
    } catch (e) {}
}

async function playChimeViaOffscreen(preset, volume) {
    try {
        await ensureOffscreenDocument();
        await chrome.runtime.sendMessage({
            type: 'OFFSCREEN_PLAY_CHIME',
            preset,
            volume
        });
    } catch (e) {}
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) return;

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
        return true;
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

    if (message.type === 'TEST_SYSTEM_NOTIFICATION') {
        const soundKey = message.soundPreset || 'pro_chime';
        const soundLabel = SOUND_LABELS[soundKey] || 'Pro Chime';
        const notifId = 'doneding-test-' + Date.now();
        chrome.notifications.create(notifId, {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'DoneDing · System Alert Active',
            message: `Sample AI completion alert · Sound: ${soundLabel}`,
            priority: 2
        }, () => {
            sendResponse({ ok: true });
        });
        return true;
    }

    if (message.type === 'PLAY_OFFSCREEN_FALLBACK') {
        playChimeViaOffscreen(message.preset || 'pro_chime', message.volume ?? 0.85)
            .then(() => sendResponse({ ok: true }));
        return true;
    }

    if (message.type === 'AI_GENERATION_COMPLETED') {
        handleGenerationCompleted(message, sender).then((res) => sendResponse(res));
        return true;
    }
});

// Discovers all open AI tabs via URL immediately AND injects content scripts if any tab was open prior to extension load!
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
            // 1. Always register the tab immediately from its URL so Sessions NEVER shows empty when AI tabs are open!
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

            // 2. Ping content script for live streaming status; if not injected yet (e.g. tab was opened before extension install), inject it automatically!
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
                    } catch (injectErr) {
                        // Tab might be discarded or restricted
                    }
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

function pickSoundForPlatform(platformId, data) {
    if (data.useDistinctSiteSounds !== false) {
        if (data.siteSounds && data.siteSounds[platformId]) {
            return data.siteSounds[platformId];
        }
        const found = HOST_CATALOG.find(h => h.id === platformId);
        if (found && found.defaultSound) return found.defaultSound;
    }
    return data.soundPreset || 'pro_chime';
}

async function handleGenerationCompleted(message, sender) {
    const data = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    const tabId = sender?.tab?.id;
    const platformId = message.platformId || 'generic';
    const chosenSound = message.soundPlayed || pickSoundForPlatform(platformId, data);
    const chosenSoundLabel = SOUND_LABELS[chosenSound] || 'Pro Chime';

    if (tabId) {
        const prev = tabRegistry.get(tabId) || {};
        tabRegistry.set(tabId, {
            ...prev,
            tabId,
            windowId: sender.tab.windowId,
            platformId,
            platformName: message.platformName || prev.platformName || 'AI Chat',
            brandColor: message.brandColor || prev.brandColor || '#E55A2B',
            hostname: message.hostname || prev.hostname || '',
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

    if (!data.enabled) return { played: false, reason: 'disabled' };

    const hostname = message.hostname || 'AI Chat';
    if (data.disabledHosts && data.disabledHosts[hostname]) {
        return { played: false, reason: 'host_disabled' };
    }
    if (tabId && data.mutedTabs && data.mutedTabs[tabId]) {
        return { played: false, reason: 'tab_muted' };
    }

    const stats = data.stats || { totalCompletions: 0 };
    stats.totalCompletions = (stats.totalCompletions || 0) + 1;
    stats.lastCompletedSite = message.platformName || hostname;
    stats.lastCompletedSound = chosenSound;
    stats.lastCompletedSoundLabel = chosenSoundLabel;
    stats.lastCompletedTitle = message.title || 'Conversation';
    stats.lastCompletedElapsedMs = message.elapsedMs || 0;
    stats.lastCompletedAt = Date.now();
    stats.lastCompletedTabId = tabId || null;
    stats.lastCompletedWindowId = sender?.tab?.windowId || null;

    const recent = Array.isArray(data.recentCompletions) ? data.recentCompletions : [];
    recent.unshift({
        platformId,
        platformName: message.platformName || hostname,
        brandColor: message.brandColor || '#E55A2B',
        title: message.title || 'Conversation',
        soundPreset: chosenSound,
        soundLabel: chosenSoundLabel,
        elapsedMs: message.elapsedMs || 0,
        completedAt: Date.now(),
        tabId: tabId || null,
        windowId: sender?.tab?.windowId || null
    });
    const trimmedRecent = recent.slice(0, 12);

    await chrome.storage.sync.set({ stats, recentCompletions: trimmedRecent });

    broadcastRegistryUpdate({
        platformName: stats.lastCompletedSite,
        brandColor: message.brandColor || '#E55A2B',
        title: stats.lastCompletedTitle,
        soundPreset: chosenSound,
        soundLabel: chosenSoundLabel,
        elapsedMs: stats.lastCompletedElapsedMs,
        tabId: tabId || null,
        windowId: sender?.tab?.windowId || null
    });

    if (data.soundEnabled && message.needsOffscreenAudio) {
        await playChimeViaOffscreen(chosenSound, data.volume);
    }

    // Native Computer System Notification (Windows Action Center / macOS Notification Center)
    if (data.desktopNotification && (!data.onlyWhenUnfocused || !message.tabFocused)) {
        const elapsedSec = ((message.elapsedMs || 0) / 1000).toFixed(1);
        const notifId = 'doneding-done-' + Date.now() + '-' + (tabId || 0);
        chrome.notifications.create(notifId, {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: `DoneDing · ${message.platformName || 'AI Chat'} Ready (${elapsedSec}s)`,
            message: `${message.title || 'Response finished'} · Sound: ${chosenSoundLabel}`,
            priority: 2
        });

        if (tabId) {
            const windowId = sender.tab.windowId;
            const clickHandler = (clickedId) => {
                if (clickedId === notifId) {
                    chrome.tabs.update(tabId, { active: true });
                    if (windowId) chrome.windows.update(windowId, { focused: true });
                    const entry = tabRegistry.get(tabId);
                    if (entry) {
                        entry.unreadDone = false;
                        tabRegistry.set(tabId, entry);
                        updateToolbarBadge();
                        broadcastRegistryUpdate();
                    }
                    chrome.notifications.clear(notifId);
                    chrome.notifications.onClicked.removeListener(clickHandler);
                }
            };
            chrome.notifications.onClicked.addListener(clickHandler);
        }
    }

    return { played: true, soundPreset: chosenSound, soundLabel: chosenSoundLabel };
}
