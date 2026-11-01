// Popup Controller for AI Chat Completion Sound & Notifier
const DEFAULT_SETTINGS = {
    enabled: true,
    soundEnabled: true,
    soundPreset: 'pro_chime',
    volume: 0.85,
    onlyWhenUnfocused: false,
    desktopNotification: true,
    titleBadgeAlert: true,
    minDurationMs: 500,
    stats: { totalCompletions: 0 }
};

document.addEventListener('DOMContentLoaded', async () => {
    const enabledToggle = document.getElementById('enabledToggle');
    const soundPreset = document.getElementById('soundPreset');
    const testSoundBtn = document.getElementById('testSoundBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeLabel = document.getElementById('volumeLabel');
    const soundEnabledToggle = document.getElementById('soundEnabledToggle');
    const onlyWhenUnfocusedToggle = document.getElementById('onlyWhenUnfocusedToggle');
    const desktopNotificationToggle = document.getElementById('desktopNotificationToggle');
    const titleBadgeAlertToggle = document.getElementById('titleBadgeAlertToggle');
    const minDurationInput = document.getElementById('minDurationInput');
    const statusSubtitle = document.getElementById('statusSubtitle');
    const statsCounter = document.getElementById('statsCounter');
    const siteNameText = document.getElementById('siteNameText');
    const generationBadge = document.getElementById('generationBadge');
    const liveDot = document.getElementById('liveDot');

    const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);

    enabledToggle.checked = stored.enabled !== false;
    soundPreset.value = stored.soundPreset || 'pro_chime';
    const pct = Math.round((stored.volume ?? 0.85) * 100);
    volumeSlider.value = pct;
    volumeLabel.textContent = `${pct}%`;
    soundEnabledToggle.checked = stored.soundEnabled !== false;
    onlyWhenUnfocusedToggle.checked = Boolean(stored.onlyWhenUnfocused);
    desktopNotificationToggle.checked = stored.desktopNotification !== false;
    titleBadgeAlertToggle.checked = stored.titleBadgeAlert !== false;
    minDurationInput.value = stored.minDurationMs || 500;

    const total = stored.stats?.totalCompletions || 0;
    statsCounter.textContent = `${total} AI completion${total === 1 ? '' : 's'} notified`;
    statusSubtitle.textContent = enabledToggle.checked ? 'Active on all AI Chats' : 'Extension Paused';

    function saveSettings(patch) {
        chrome.storage.sync.set(patch);
    }

    enabledToggle.addEventListener('change', () => {
        const enabled = enabledToggle.checked;
        statusSubtitle.textContent = enabled ? 'Active on all AI Chats' : 'Extension Paused';
        saveSettings({ enabled });
    });

    soundPreset.addEventListener('change', () => {
        saveSettings({ soundPreset: soundPreset.value });
        window.AIChimeAudio.playChime(soundPreset.value, Number(volumeSlider.value) / 100);
    });

    volumeSlider.addEventListener('input', () => {
        volumeLabel.textContent = `${volumeSlider.value}%`;
        saveSettings({ volume: Number(volumeSlider.value) / 100 });
    });

    testSoundBtn.addEventListener('click', () => {
        window.AIChimeAudio.playChime(soundPreset.value, Number(volumeSlider.value) / 100);
    });

    soundEnabledToggle.addEventListener('change', () => {
        saveSettings({ soundEnabled: soundEnabledToggle.checked });
    });

    onlyWhenUnfocusedToggle.addEventListener('change', () => {
        saveSettings({ onlyWhenUnfocused: onlyWhenUnfocusedToggle.checked });
    });

    desktopNotificationToggle.addEventListener('change', () => {
        saveSettings({ desktopNotification: desktopNotificationToggle.checked });
    });

    titleBadgeAlertToggle.addEventListener('change', () => {
        saveSettings({ titleBadgeAlert: titleBadgeAlertToggle.checked });
    });

    minDurationInput.addEventListener('change', () => {
        const val = Math.max(100, Number(minDurationInput.value) || 500);
        minDurationInput.value = val;
        saveSettings({ minDurationMs: val });
    });

    // Query active tab status
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'GET_TAB_STATUS' }, (resp) => {
                if (chrome.runtime.lastError || !resp) {
                    siteNameText.textContent = 'Ready (Open any AI Chat tab)';
                    return;
                }
                siteNameText.textContent = `Connected: ${resp.platformName}`;
                if (resp.isGenerating) {
                    generationBadge.textContent = 'Generating...';
                    generationBadge.classList.add('generating');
                    liveDot.classList.add('generating');
                } else {
                    generationBadge.textContent = 'Monitoring';
                }
            });
        }
    } catch (e) {
        // Ignore on chrome:// pages
    }
});
