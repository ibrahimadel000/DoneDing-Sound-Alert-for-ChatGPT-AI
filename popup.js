// DoneDing v6.0 — Multi-Tab Popup Controller with Per-Site Sound Assignment & Top-Bar Alert Strip
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
    stats: { totalCompletions: 0 },
    recentCompletions: []
};

const SOUND_OPTIONS = [
    { key: 'pro_chime', label: 'Pro Chime' },
    { key: 'warm_marimba', label: 'Warm Marimba' },
    { key: 'crystal_triad', label: 'Crystal Triad' },
    { key: 'double_pulse', label: 'Studio Pulse' },
    { key: 'soft_harp', label: 'Celestial Harp' },
    { key: 'gentle_zen', label: 'Resonant Bowl' }
];

let liveTabsCache = [];
let currentSettings = { ...DEFAULT_SETTINGS };
let topBarLastSound = 'pro_chime';

document.addEventListener('DOMContentLoaded', async () => {
    const hasChromeStorage = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;

    const enabledToggle = document.getElementById('enabledToggle');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const testSoundBtn = document.getElementById('testSoundBtn');
    const testSystemNotifBtn = document.getElementById('testSystemNotifBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeLabel = document.getElementById('volumeLabel');

    const distinctSiteSoundsToggle = document.getElementById('distinctSiteSoundsToggle');
    const desktopNotificationToggle = document.getElementById('desktopNotificationToggle');
    const inPageTopBannerToggle = document.getElementById('inPageTopBannerToggle');
    const onlyWhenUnfocusedToggle = document.getElementById('onlyWhenUnfocusedToggle');

    const headerStatusLed = document.getElementById('headerStatusLed');
    const headerTelemetry = document.getElementById('headerTelemetry');
    const navSessionsCount = document.getElementById('navSessionsCount');
    const footerStatusText = document.getElementById('footerStatusText');
    const footerCompletionsCount = document.getElementById('footerCompletionsCount');

    const topNotifBar = document.getElementById('topNotifBar');
    const topNotifDot = document.getElementById('topNotifDot');
    const topNotifSite = document.getElementById('topNotifSite');
    const topNotifSound = document.getElementById('topNotifSound');
    const topNotifReplayBtn = document.getElementById('topNotifReplayBtn');

    const multiTabList = document.getElementById('multiTabList');
    const recentHistoryList = document.getElementById('recentHistoryList');
    const refreshTabsBtn = document.getElementById('refreshTabsBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const presetGrid = document.getElementById('presetGrid');

    // Segmented Tab Switching
    document.querySelectorAll('.seg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.seg-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            const target = document.getElementById(btn.dataset.tab);
            if (target) target.classList.add('active');
        });
    });

    const stored = hasChromeStorage ? await chrome.storage.sync.get(DEFAULT_SETTINGS) : {};
    currentSettings = {
        ...DEFAULT_SETTINGS,
        ...stored,
        siteSounds: { ...DEFAULT_SETTINGS.siteSounds, ...(stored.siteSounds || {}) }
    };

    function applyTheme(themeName) {
        const t = themeName === 'paper' ? 'paper' : 'carbon';
        document.documentElement.setAttribute('data-theme', t);
    }
    applyTheme(currentSettings.theme || 'carbon');

    themeToggleBtn.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'paper' ? 'carbon' : 'paper';
        applyTheme(next);
        currentSettings.theme = next;
        if (hasChromeStorage) chrome.storage.sync.set({ theme: next });
    });

    enabledToggle.checked = currentSettings.enabled !== false;
    const pct = Math.round((currentSettings.volume ?? 0.85) * 100);
    volumeSlider.value = pct;
    volumeLabel.textContent = `${pct}%`;

    distinctSiteSoundsToggle.checked = currentSettings.useDistinctSiteSounds !== false;
    desktopNotificationToggle.checked = currentSettings.desktopNotification !== false;
    inPageTopBannerToggle.checked = currentSettings.inPageTopBanner !== false;
    onlyWhenUnfocusedToggle.checked = Boolean(currentSettings.onlyWhenUnfocused);

    const totalDone = currentSettings.stats?.totalCompletions || 0;
    footerCompletionsCount.textContent = `${totalDone} completed`;

    // Populate Top-Bar Notification Strip from latest completion or active default
    function updateTopNotificationBar(bannerData) {
        if (bannerData && bannerData.platformName) {
            const sec = bannerData.elapsedMs ? ` (${(bannerData.elapsedMs / 1000).toFixed(1)}s)` : '';
            topNotifDot.style.backgroundColor = bannerData.brandColor || '#D97757';
            topNotifSite.textContent = `${bannerData.platformName} finished${sec}`;
            topNotifSound.textContent = `Sound: ${bannerData.soundLabel || 'Pro Chime'}`;
            topBarLastSound = bannerData.soundPreset || 'pro_chime';
            topNotifBar.classList.add('is-fresh');
        } else if (currentSettings.stats && currentSettings.stats.lastCompletedSite) {
            const st = currentSettings.stats;
            const sec = st.lastCompletedElapsedMs ? ` (${(st.lastCompletedElapsedMs / 1000).toFixed(1)}s)` : '';
            topNotifSite.textContent = `${st.lastCompletedSite} finished${sec}`;
            topNotifSound.textContent = `Sound: ${st.lastCompletedSoundLabel || 'Pro Chime'}`;
            topBarLastSound = st.lastCompletedSound || currentSettings.soundPreset || 'pro_chime';
        } else {
            const activeSoundObj = SOUND_OPTIONS.find(s => s.key === currentSettings.soundPreset) || SOUND_OPTIONS[0];
            topNotifSite.textContent = 'Ready for AI completions';
            topNotifSound.textContent = `Default: ${activeSoundObj.label}`;
            topBarLastSound = activeSoundObj.key;
        }
    }
    updateTopNotificationBar(null);

    topNotifReplayBtn.addEventListener('click', () => {
        if (window.AIChimeAudio) {
            window.AIChimeAudio.playChime(topBarLastSound, Number(volumeSlider.value) / 100);
        }
    });

    function updateStatusIndicators() {
        const isOn = enabledToggle.checked;
        const genCount = liveTabsCache.filter(t => t.isGenerating).length;
        headerStatusLed.classList.toggle('paused', !isOn);
        headerStatusLed.classList.toggle('generating', isOn && genCount > 0);
        footerStatusText.textContent = isOn ? 'DoneDing active across 27 AI sites' : 'DoneDing paused';
    }
    updateStatusIndicators();

    function setActivePresetRow(preset) {
        presetGrid.querySelectorAll('.tone-row').forEach(row => {
            const match = row.dataset.preset === preset;
            row.classList.toggle('active', match);
            row.setAttribute('aria-checked', match ? 'true' : 'false');
        });
    }
    setActivePresetRow(currentSettings.soundPreset || 'pro_chime');

    presetGrid.querySelectorAll('.tone-row').forEach(row => {
        row.addEventListener('click', () => {
            const preset = row.dataset.preset;
            currentSettings.soundPreset = preset;
            setActivePresetRow(preset);
            if (hasChromeStorage) chrome.storage.sync.set({ soundPreset: preset });
            const soundObj = SOUND_OPTIONS.find(s => s.key === preset);
            topBarLastSound = preset;
            topNotifSound.textContent = `Auditioned: ${soundObj ? soundObj.label : preset}`;
            window.AIChimeAudio.playChime(preset, Number(volumeSlider.value) / 100);
        });
    });

    testSoundBtn.addEventListener('click', () => {
        window.AIChimeAudio.playChime(currentSettings.soundPreset || 'pro_chime', Number(volumeSlider.value) / 100);
    });

    testSystemNotifBtn.addEventListener('click', () => {
        window.AIChimeAudio.playChime(currentSettings.soundPreset || 'pro_chime', Number(volumeSlider.value) / 100);
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({
                type: 'TEST_SYSTEM_NOTIFICATION',
                soundPreset: currentSettings.soundPreset || 'pro_chime'
            });
        }
    });

    enabledToggle.addEventListener('change', () => {
        const enabled = enabledToggle.checked;
        updateStatusIndicators();
        if (hasChromeStorage) chrome.storage.sync.set({ enabled });
    });

    volumeSlider.addEventListener('input', () => {
        volumeLabel.textContent = `${volumeSlider.value}%`;
        if (hasChromeStorage) chrome.storage.sync.set({ volume: Number(volumeSlider.value) / 100 });
    });

    distinctSiteSoundsToggle.addEventListener('change', () => {
        currentSettings.useDistinctSiteSounds = distinctSiteSoundsToggle.checked;
        if (hasChromeStorage) chrome.storage.sync.set({ useDistinctSiteSounds: distinctSiteSoundsToggle.checked });
        renderOpenTabs(liveTabsCache);
    });

    desktopNotificationToggle.addEventListener('change', () => {
        if (hasChromeStorage) chrome.storage.sync.set({ desktopNotification: desktopNotificationToggle.checked });
    });

    inPageTopBannerToggle.addEventListener('change', () => {
        if (hasChromeStorage) chrome.storage.sync.set({ inPageTopBanner: inPageTopBannerToggle.checked });
    });

    onlyWhenUnfocusedToggle.addEventListener('change', () => {
        if (hasChromeStorage) chrome.storage.sync.set({ onlyWhenUnfocused: onlyWhenUnfocusedToggle.checked });
    });

    clearHistoryBtn.addEventListener('click', () => {
        currentSettings.recentCompletions = [];
        if (hasChromeStorage) chrome.storage.sync.set({ recentCompletions: [] });
        renderRecentHistory([]);
    });

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getSoundForTab(tab) {
        const pid = tab.platformId || 'generic';
        if (currentSettings.siteSounds && currentSettings.siteSounds[pid]) {
            return currentSettings.siteSounds[pid];
        }
        if (window.AIChimeAudio && window.AIChimeAudio.PLATFORM_DEFAULT_SOUNDS[pid]) {
            return window.AIChimeAudio.PLATFORM_DEFAULT_SOUNDS[pid];
        }
        return currentSettings.soundPreset || 'pro_chime';
    }

    // Render all open AI tabs across Chrome with integrated checkbox (check/uncheck to mute) & per-site sound selector!
    function renderOpenTabs(tabs) {
        liveTabsCache = Array.isArray(tabs) ? tabs : [];
        const openCount = liveTabsCache.length;
        const genCount = liveTabsCache.filter(t => t.isGenerating).length;

        navSessionsCount.textContent = String(openCount);
        headerTelemetry.textContent = genCount > 0
            ? `${openCount} open · ${genCount} active`
            : `${openCount} open`;
        updateStatusIndicators();

        if (openCount === 0) {
            multiTabList.innerHTML = `
              <div class="empty-notice">
                No AI chat tabs are currently open in Chrome. Open Gemini, Claude, ChatGPT, DeepSeek, Notion, or Perplexity and it will appear here automatically.
              </div>
            `;
            return;
        }

        const disabledHosts = currentSettings.disabledHosts || {};
        const mutedTabs = currentSettings.mutedTabs || {};

        multiTabList.innerHTML = liveTabsCache.map(tab => {
            const elapsedSec = tab.isGenerating && tab.generationStartTime
                ? Math.max(1, Math.round((Date.now() - tab.generationStartTime) / 1000))
                : null;

            const isChecked = !disabledHosts[tab.hostname] && !mutedTabs[tab.tabId];
            const selectedSound = getSoundForTab(tab);

            let stateClass = '';
            let stateHtml = '<span>Idle</span>';

            if (!isChecked) {
                stateHtml = '<span>Muted</span>';
            } else if (tab.isGenerating) {
                stateClass = 'is-generating';
                stateHtml = `
                  <svg class="svg-icon-sm" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                    <path d="M3 8v3M6.5 5v6M10 3v10M13.5 6v4"></path>
                  </svg>
                  <span>${elapsedSec || 1}s</span>
                `;
            } else if (tab.unreadDone) {
                stateClass = 'is-ready';
                stateHtml = `
                  <svg class="svg-icon-sm" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3.5 8.5 6.5 11.5 12.5 4.5"></polyline>
                  </svg>
                  <span>Ready</span>
                `;
            }

            const optionsHtml = SOUND_OPTIONS.map(opt =>
                `<option value="${opt.key}" ${opt.key === selectedSound ? 'selected' : ''}>♪ ${opt.label}</option>`
            ).join('');

            return `
              <div class="session-row ${isChecked ? '' : 'is-muted'}" role="listitem">
                <div class="session-main">
                  <input type="checkbox" class="rule-check session-mute-check" data-tab-id="${tab.tabId}" data-host="${escapeHtml(tab.hostname)}" title="Check to enable sound for ${escapeHtml(tab.platformName)}, uncheck to mute" ${isChecked ? 'checked' : ''}>
                  <span class="host-marker" style="background-color: ${escapeHtml(tab.brandColor || '#E55A2B')}"></span>
                  <div class="session-text">
                    <div class="session-host-line">
                      <span class="session-host">${escapeHtml(tab.platformName)}</span>
                    </div>
                    <div class="session-doc-title" title="${escapeHtml(tab.title)}">${escapeHtml(tab.title)}</div>
                  </div>
                </div>
                <div class="session-meta">
                  <select class="site-sound-select" data-platform-id="${escapeHtml(tab.platformId)}" data-platform-name="${escapeHtml(tab.platformName)}" title="Choose distinct sound for ${escapeHtml(tab.platformName)}">
                    ${optionsHtml}
                  </select>
                  <span class="state-tag ${stateClass}">${stateHtml}</span>
                  <button class="focus-btn" data-tab-id="${tab.tabId}" data-win-id="${tab.windowId}" title="Switch to tab">
                    <span>Focus</span>
                    <svg class="svg-icon-sm" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M5 11L11 5"></path>
                      <polyline points="6 5 11 5 11 10"></polyline>
                    </svg>
                  </button>
                </div>
              </div>
            `;
        }).join('');

        // Per-session Check/Uncheck mute listener
        multiTabList.querySelectorAll('.session-mute-check').forEach(chk => {
            chk.addEventListener('change', () => {
                const host = chk.getAttribute('data-host');
                const tabId = chk.getAttribute('data-tab-id');
                const disabledMap = { ...(currentSettings.disabledHosts || {}) };
                const mutedMap = { ...(currentSettings.mutedTabs || {}) };
                if (chk.checked) {
                    delete disabledMap[host];
                    delete mutedMap[tabId];
                } else {
                    disabledMap[host] = true;
                    mutedMap[tabId] = true;
                }
                currentSettings.disabledHosts = disabledMap;
                currentSettings.mutedTabs = mutedMap;
                if (hasChromeStorage) {
                    chrome.storage.sync.set({ disabledHosts: disabledMap, mutedTabs: mutedMap });
                }
                renderOpenTabs(liveTabsCache);
            });
        });

        // Per-site Sound Assignment selector listener (plays preview & saves custom sound for that AI site!)
        multiTabList.querySelectorAll('.site-sound-select').forEach(sel => {
            sel.addEventListener('change', () => {
                const pid = sel.getAttribute('data-platform-id');
                const pname = sel.getAttribute('data-platform-name');
                const chosen = sel.value;
                const map = { ...(currentSettings.siteSounds || {}) };
                map[pid] = chosen;
                currentSettings.siteSounds = map;
                currentSettings.useDistinctSiteSounds = true;
                distinctSiteSoundsToggle.checked = true;
                if (hasChromeStorage) {
                    chrome.storage.sync.set({ siteSounds: map, useDistinctSiteSounds: true });
                }
                const soundObj = SOUND_OPTIONS.find(s => s.key === chosen);
                topBarLastSound = chosen;
                topNotifSite.textContent = `${pname} sound updated`;
                topNotifSound.textContent = `Sound: ${soundObj ? soundObj.label : chosen}`;
                topNotifBar.classList.add('is-fresh');
                if (window.AIChimeAudio) {
                    window.AIChimeAudio.playChime(chosen, Number(volumeSlider.value) / 100);
                }
            });
        });

        multiTabList.querySelectorAll('.focus-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = Number(btn.getAttribute('data-tab-id'));
                const windowId = Number(btn.getAttribute('data-win-id'));
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                    chrome.runtime.sendMessage({ type: 'FOCUS_AI_TAB', tabId, windowId }, () => {
                        window.close();
                    });
                }
            });
        });
    }

    function renderRecentHistory(items) {
        const list = Array.isArray(items) ? items : [];
        if (list.length === 0) {
            recentHistoryList.innerHTML = `<div class="empty-notice" style="padding: 8px 4px;">No completed responses logged yet.</div>`;
            return;
        }
        recentHistoryList.innerHTML = list.slice(0, 6).map(item => {
            const sec = ((item.elapsedMs || 0) / 1000).toFixed(1);
            const sLabel = item.soundLabel || 'Pro Chime';
            return `
              <div class="log-row" role="listitem">
                <div class="log-left">
                  <span class="host-marker" style="background-color: ${escapeHtml(item.brandColor || '#E55A2B')}"></span>
                  <span class="log-host">${escapeHtml(item.platformName)}</span>
                  <span class="log-sound-tag">♪ ${escapeHtml(sLabel)}</span>
                </div>
                <span class="log-duration">${sec}s</span>
              </div>
            `;
        }).join('');
    }

    function fetchOpenTabs() {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ type: 'GET_ALL_AI_TABS' }, (resp) => {
                if (resp && Array.isArray(resp.tabs)) {
                    renderOpenTabs(resp.tabs);
                }
            });
        }
    }

    refreshTabsBtn.addEventListener('click', fetchOpenTabs);

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((msg) => {
            if (msg && msg.type === 'TAB_REGISTRY_UPDATED') {
                renderOpenTabs(msg.tabs);
                if (msg.banner) {
                    updateTopNotificationBar(msg.banner);
                }
            }
        });
    }

    setInterval(() => {
        if (liveTabsCache.some(t => t.isGenerating)) {
            renderOpenTabs(liveTabsCache);
        }
    }, 1000);

    renderRecentHistory(currentSettings.recentCompletions || []);
    fetchOpenTabs();
});
