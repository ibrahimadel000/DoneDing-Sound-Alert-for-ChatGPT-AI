// Background Service Worker for AI Chat Completion Sound & Notifier
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
    stats: {
        totalCompletions: 0,
        lastCompletedSite: null,
        lastCompletedAt: null
    }
};

// Initialize default settings on installation
chrome.runtime.onInstalled.addListener(async () => {
    const existing = await chrome.storage.sync.get(null);
    const merged = { ...DEFAULT_SETTINGS, ...existing };
    await chrome.storage.sync.set(merged);
});

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
        // Ignore if already created
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
        console.warn('[AI Chime Background] Offscreen audio error:', e);
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) return;

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

async function handleGenerationCompleted(message, sender) {
    const data = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    if (!data.enabled) return { played: false, reason: 'disabled' };

    const hostname = message.hostname || 'AI Chat';
    if (data.disabledHosts && data.disabledHosts[hostname]) {
        return { played: false, reason: 'host_disabled' };
    }

    // Update completion counter stats
    const stats = data.stats || { totalCompletions: 0 };
    stats.totalCompletions = (stats.totalCompletions || 0) + 1;
    stats.lastCompletedSite = message.platformName || hostname;
    stats.lastCompletedAt = Date.now();
    await chrome.storage.sync.set({ stats });

    // Play audio via offscreen if requested (either because in-page audio was blocked or always as reliable fallback)
    if (data.soundEnabled && message.needsOffscreenAudio) {
        await playChimeViaOffscreen(data.soundPreset, data.volume);
    }

    // Show Desktop Notification if enabled and tab is unfocused (or always if requested)
    if (data.desktopNotification && (!message.tabFocused || message.forceNotification)) {
        const elapsedSec = ((message.elapsedMs || 0) / 1000).toFixed(1);
        const notifId = 'ai-done-' + Date.now();
        chrome.notifications.create(notifId, {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: `${message.platformName || 'AI Chat'} Finished Responding`,
            message: `Completed in ${elapsedSec}s — click to return to your chat tab.`,
            priority: 1
        });

        if (sender && sender.tab && sender.tab.id) {
            const tabId = sender.tab.id;
            const windowId = sender.tab.windowId;
            const clickHandler = (clickedId) => {
                if (clickedId === notifId) {
                    chrome.tabs.update(tabId, { active: true });
                    if (windowId) chrome.windows.update(windowId, { focused: true });
                    chrome.notifications.clear(notifId);
                    chrome.notifications.onClicked.removeListener(clickHandler);
                }
            };
            chrome.notifications.onClicked.addListener(clickHandler);
        }
    }

    return { played: true };
}
