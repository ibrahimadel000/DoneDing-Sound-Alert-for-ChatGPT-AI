// Background Service Worker — Multi-Tab AI Session Manager & Audio Router
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
    mutedTabs: {},
    stats: {
        totalCompletions: 0,
        lastCompletedSite: null,
        lastCompletedAt: null
    },
    recentCompletions: []
};

// In-memory + session registry of open AI chat tabs:
// tabId -> { tabId, windowId, platformId, platformName, brandColor, hostname, title, url, isGenerating, generationStartTime, unreadDone, lastCompletedAt, elapsedMs }
const tabRegistry = new Map();

chrome.runtime.onInstalled.addListener(async () => {
    const existing = await chrome.storage.sync.get(null);
    const merged = { ...DEFAULT_SETTINGS, ...existing };
    await chrome.storage.sync.set(merged);
    updateToolbarBadge();
});

// Clean up closed tabs and update toolbar badge
chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabRegistry.has(tabId)) {
        tabRegistry.delete(tabId);
        updateToolbarBadge();
        broadcastRegistryUpdate();
    }
});

// Clear unreadDone when user switches to a completed AI tab
chrome.tabs.onActivated.addListener(({ tabId }) => {
    const entry = tabRegistry.get(tabId);
    if (entry && entry.unreadDone) {
        entry.unreadDone = false;
        tabRegistry.set(tabId, entry);
        updateToolbarBadge();
        broadcastRegistryUpdate();
    }
});

// Update toolbar badge based on multi-tab state
function updateToolbarBadge() {
    let generatingCount = 0;
    let unreadDoneCount = 0;

    for (const entry of tabRegistry.values()) {
        if (entry.isGenerating) generatingCount++;
        else if (entry.unreadDone) unreadDoneCount++;
    }

    if (generatingCount > 0) {
        chrome.action.setBadgeText({ text: String(generatingCount) });
        chrome.action.setBadgeBackgroundColor({ color: '#F59E0B' }); // Amber while generating
    } else if (unreadDoneCount > 0) {
        chrome.action.setBadgeText({ text: `✓${unreadDoneCount}` });
        chrome.action.setBadgeBackgroundColor({ color: '#10B981' }); // Emerald when finished in background
    } else {
        const totalOpen = tabRegistry.size;
        chrome.action.setBadgeText({ text: totalOpen > 1 ? String(totalOpen) : '' });
        chrome.action.setBadgeBackgroundColor({ color: '#4F46E5' });
    }
}

function broadcastRegistryUpdate() {
    const tabsList = Array.from(tabRegistry.values()).sort((a, b) => {
        if (a.isGenerating !== b.isGenerating) return a.isGenerating ? -1 : 1;
        if (a.unreadDone !== b.unreadDone) return a.unreadDone ? -1 : 1;
        return (b.lastUpdated || 0) - (a.lastUpdated || 0);
    });
    chrome.runtime.sendMessage({
        type: 'TAB_REGISTRY_UPDATED',
        tabs: tabsList
    }).catch(() => {
        // Popup is closed, ignore
    });
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
    } catch (e) {
        // Already exists
    }
}

async function playChimeViaOffscreen(preset, volume) {
    try {
        await ensureOffscreenDocument();
        await chrome.runtime.sendMessage({
            type: 'OFFSCREEN_PLAY_CHIME',
            preset,
            volume
        });
    } catch (e) {
        console.warn('[AI Pulse] Offscreen audio error:', e);
    }
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
                brandColor: message.brandColor || prev.brandColor || '#6366F1',
                hostname: message.hostname || prev.hostname || '',
                title: message.title || sender.tab.title || prev.title || 'AI Conversation',
                url: sender.tab.url || prev.url || '',
                isGenerating: Boolean(message.isGenerating),
                generationStartTime: message.generationStartTime || (message.isGenerating ? Date.now() : null),
                unreadDone: message.isGenerating ? false : (message.clearUnread ? false : Boolean(prev.unreadDone)),
                lastCompletedAt: prev.lastCompletedAt || null,
                lastElapsedMs: prev.lastElapsedMs || null,
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
        // Also ping all tabs so registry is 100% fresh even if service worker just woke up
        refreshAllOpenTabs().then((tabsList) => {
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

async function refreshAllOpenTabs() {
    try {
        const allTabs = await chrome.tabs.query({});
        const activeIds = new Set(allTabs.map(t => t.id));
        for (const id of Array.from(tabRegistry.keys())) {
            if (!activeIds.has(id)) {
                tabRegistry.delete(id);
            }
        }
        await Promise.all(allTabs.map(async (tab) => {
            if (!tab.id || !tab.url || tab.url.startsWith('chrome://')) return;
            try {
                const resp = await chrome.tabs.sendMessage(tab.id, { type: 'GET_TAB_STATUS' });
                if (resp && resp.supported) {
                    const prev = tabRegistry.get(tab.id) || {};
                    tabRegistry.set(tab.id, {
                        tabId: tab.id,
                        windowId: tab.windowId,
                        platformId: resp.platformId,
                        platformName: resp.platformName,
                        brandColor: resp.brandColor,
                        hostname: resp.hostname,
                        title: resp.cleanTitle || tab.title || resp.platformName,
                        url: tab.url,
                        isGenerating: Boolean(resp.isGenerating),
                        generationStartTime: resp.generationStartTime || null,
                        unreadDone: Boolean(prev.unreadDone && !tab.active),
                        lastCompletedAt: prev.lastCompletedAt || null,
                        lastElapsedMs: prev.lastElapsedMs || null,
                        lastUpdated: Date.now()
                    });
                }
            } catch (e) {
                // Content script not running on non-AI tab
            }
        }));
    } catch (e) {
        // Ignore query errors
    }

    updateToolbarBadge();
    return Array.from(tabRegistry.values()).sort((a, b) => {
        if (a.isGenerating !== b.isGenerating) return a.isGenerating ? -1 : 1;
        if (a.unreadDone !== b.unreadDone) return a.unreadDone ? -1 : 1;
        return (b.lastUpdated || 0) - (a.lastUpdated || 0);
    });
}

async function handleGenerationCompleted(message, sender) {
    const data = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    const tabId = sender?.tab?.id;

    // Update multi-tab registry state
    if (tabId) {
        const prev = tabRegistry.get(tabId) || {};
        tabRegistry.set(tabId, {
            ...prev,
            tabId,
            windowId: sender.tab.windowId,
            platformId: message.platformId || prev.platformId || 'generic',
            platformName: message.platformName || prev.platformName || 'AI Chat',
            brandColor: message.brandColor || prev.brandColor || '#6366F1',
            hostname: message.hostname || prev.hostname || '',
            title: message.title || sender.tab.title || prev.title || 'AI Chat',
            url: sender.tab.url || prev.url || '',
            isGenerating: false,
            generationStartTime: null,
            unreadDone: !message.tabFocused,
            lastCompletedAt: Date.now(),
            lastElapsedMs: message.elapsedMs || 0,
            lastUpdated: Date.now()
        });
        updateToolbarBadge();
        broadcastRegistryUpdate();
    }

    if (!data.enabled) return { played: false, reason: 'disabled' };

    const hostname = message.hostname || 'AI Chat';
    if (data.disabledHosts && data.disabledHosts[hostname]) {
        return { played: false, reason: 'host_disabled' };
    }
    if (tabId && data.mutedTabs && data.mutedTabs[tabId]) {
        return { played: false, reason: 'tab_muted' };
    }

    // Update completion counter & history log
    const stats = data.stats || { totalCompletions: 0 };
    stats.totalCompletions = (stats.totalCompletions || 0) + 1;
    stats.lastCompletedSite = message.platformName || hostname;
    stats.lastCompletedAt = Date.now();

    const recent = Array.isArray(data.recentCompletions) ? data.recentCompletions : [];
    recent.unshift({
        platformName: message.platformName || hostname,
        brandColor: message.brandColor || '#6366F1',
        title: message.title || 'Conversation',
        elapsedMs: message.elapsedMs || 0,
        completedAt: Date.now(),
        tabId: tabId || null,
        windowId: sender?.tab?.windowId || null
    });
    const trimmedRecent = recent.slice(0, 12);

    await chrome.storage.sync.set({ stats, recentCompletions: trimmedRecent });

    // Play audio via offscreen if in-page audio was blocked by browser autoplay policy
    if (data.soundEnabled && message.needsOffscreenAudio) {
        await playChimeViaOffscreen(data.soundPreset, data.volume);
    }

    // Desktop notification when unfocused
    if (data.desktopNotification && (!message.tabFocused || message.forceNotification)) {
        const elapsedSec = ((message.elapsedMs || 0) / 1000).toFixed(1);
        const notifId = 'ai-done-' + Date.now() + '-' + (tabId || 0);
        chrome.notifications.create(notifId, {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: `${message.platformName || 'AI Chat'} Finished (${elapsedSec}s)`,
            message: `${message.title || 'Your response is ready'} — click to switch to this tab.`,
            priority: 1
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

    return { played: true };
}
