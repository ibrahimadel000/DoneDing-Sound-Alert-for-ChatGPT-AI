chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === 'OFFSCREEN_PLAY_CHIME') {
        window.AIChimeAudio.playChime(message.preset || 'pro_chime', message.volume ?? 0.85)
            .then((ok) => sendResponse({ ok }))
            .catch((err) => sendResponse({ ok: false, error: String(err) }));
        return true;
    }
});
