// AI Pulse v4.0 — Multi-Tab Popup Controller
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
    stats: { totalCompletions: 0 },
    recentCompletions: []
};

const SUPPORTED_PLATFORMS = [
    { name: 'Google Gemini', host: 'gemini.google.com', color: '#3B82F6' },
    { name: 'Claude AI', host: 'claude.ai', color: '#D97757' },
    { name: 'ChatGPT', host: 'chatgpt.com', color: '#10A37F' },
    { name: 'DeepSeek', host: 'chat.deepseek.com', color: '#4D6BFE' },
    { name: 'Notion AI', host: 'www.notion.so', color: '#64748B' },
    { name: 'Perplexity', host: 'www.perplexity.ai', color: '#14B8A6' },
    { name: 'MS Copilot', host: 'copilot.microsoft.com', color: '#8B5CF6' },
    { name: 'Google AI Studio', host: 'aistudio.google.com', color: '#2563EB' },
    { name: 'NotebookLM', host: 'notebooklm.google.com', color: '#0EA5E9' },
    { name: 'xAI Grok', host: 'grok.com', color: '#F43F5E' },
    { name: 'Poe AI', host: 'poe.com', color: '#7C3AED' },
    { name: 'Mistral Le Chat', host: 'chat.mistral.ai', color: '#F97316' },
    { name: 'Qwen AI', host: 'chat.qwen.ai', color: '#6366F1' },
    { name: 'Kimi AI', host: 'kimi.moonshot.cn', color: '#06B6D4' },
    { name: 'HuggingChat', host: 'huggingface.co', color: '#EAB308' },
    { name: 'Meta AI', host: 'www.meta.ai', color: '#0081FB' },
    { name: 'Phind', host: 'www.phind.com', color: '#22C55E' },
    { name: 'You.com', host: 'you.com', color: '#38BDF8' },
    { name: 'Cohere Coral', host: 'coral.cohere.com', color: '#EC4899' },
    { name: 'Vercel v0', host: 'v0.dev', color: '#94A3B8' },
    { name: 'Bolt.new', host: 'bolt.new', color: '#F59E0B' },
    { name: 'Lovable', host: 'lovable.dev', color: '#EC4899' },
    { name: 'Replit AI', host: 'replit.com', color: '#F97316' },
    { name: 'Character.AI', host: 'character.ai', color: '#A855F7' },
    { name: 'Pi AI', host: 'pi.ai', color: '#10B981' },
    { name: 'Duck.ai', host: 'duck.ai', color: '#EF4444' },
    { name: 'Blackbox AI', host: 'www.blackbox.ai', color: '#6366F1' }
];

let liveTabsCache = [];
let currentSettings = { ...DEFAULT_SETTINGS };

document.addEventListener('DOMContentLoaded', async () => {
    const enabledToggle = document.getElementById('enabledToggle');
    const testSoundBtn = document.getElementById('testSoundBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeLabel = document.getElementById('volumeLabel');
    const soundEnabledToggle = document.getElementById('soundEnabledToggle');
    const onlyWhenUnfocusedToggle = document.getElementById('onlyWhenUnfocusedToggle');
    const desktopNotificationToggle = document.getElementById('desktopNotificationToggle');
    const titleBadgeAlertToggle = document.getElementById('titleBadgeAlertToggle');
    const minDurationInput = document.getElementById('minDurationInput');
    const statusSubtitle = document.getElementById('statusSubtitle');
    const headerPulseRing = document.getElementById('headerPulseRing');

    const kpiOpenTabs = document.getElementById('kpiOpenTabs');
    const kpiGenerating = document.getElementById('kpiGenerating');
    const kpiCompleted = document.getElementById('kpiCompleted');
    const navSessionsBadge = document.getElementById('navSessionsBadge');

    const multiTabList = document.getElementById('multiTabList');
    const recentHistoryList = document.getElementById('recentHistoryList');
    const refreshTabsBtn = document.getElementById('refreshTabsBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const presetGrid = document.getElementById('presetGrid');
    const platformSearchInput = document.getElementById('platformSearchInput');
    const platformDirectoryGrid = document.getElementById('platformDirectoryGrid');

    // Tab Navigation switching
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const panel = document.getElementById(btn.dataset.tab);
            if (panel) panel.classList.add('active');
        });
    });

    currentSettings = await chrome.storage.sync.get(DEFAULT_SETTINGS);

    enabledToggle.checked = currentSettings.enabled !== false;
    const pct = Math.round((currentSettings.volume ?? 0.85) * 100);
    volumeSlider.value = pct;
    volumeLabel.textContent = `${pct}%`;
    soundEnabledToggle.checked = currentSettings.soundEnabled !== false;
    onlyWhenUnfocusedToggle.checked = Boolean(currentSettings.onlyWhenUnfocused);
    desktopNotificationToggle.checked = currentSettings.desktopNotification !== false;
    titleBadgeAlertToggle.checked = currentSettings.titleBadgeAlert !== false;
    minDurationInput.value = currentSettings.minDurationMs || 500;
    kpiCompleted.textContent = String(currentSettings.stats?.totalCompletions || 0);
    statusSubtitle.textContent = enabledToggle.checked ? 'Monitoring 27 AI Platforms' : 'Notifications Paused';

    function setActivePresetChip(preset) {
        presetGrid.querySelectorAll('.preset-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.preset === preset);
        });
    }
    setActivePresetChip(currentSettings.soundPreset || 'pro_chime');

    presetGrid.querySelectorAll('.preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const preset = chip.dataset.preset;
            currentSettings.soundPreset = preset;
            setActivePresetChip(preset);
            chrome.storage.sync.set({ soundPreset: preset });
            window.AIChimeAudio.playChime(preset, Number(volumeSlider.value) / 100);
        });
    });

    testSoundBtn.addEventListener('click', () => {
        window.AIChimeAudio.playChime(currentSettings.soundPreset || 'pro_chime', Number(volumeSlider.value) / 100);
    });

    enabledToggle.addEventListener('change', () => {
        const enabled = enabledToggle.checked;
        statusSubtitle.textContent = enabled ? 'Monitoring 27 AI Platforms' : 'Notifications Paused';
        chrome.storage.sync.set({ enabled });
    });

    volumeSlider.addEventListener('input', () => {
        volumeLabel.textContent = `${volumeSlider.value}%`;
        chrome.storage.sync.set({ volume: Number(volumeSlider.value) / 100 });
    });

    soundEnabledToggle.addEventListener('change', () => {
        chrome.storage.sync.set({ soundEnabled: soundEnabledToggle.checked });
    });

    onlyWhenUnfocusedToggle.addEventListener('change', () => {
        chrome.storage.sync.set({ onlyWhenUnfocused: onlyWhenUnfocusedToggle.checked });
    });

    desktopNotificationToggle.addEventListener('change', () => {
        chrome.storage.sync.set({ desktopNotification: desktopNotificationToggle.checked });
    });

    titleBadgeAlertToggle.addEventListener('change', () => {
        chrome.storage.sync.set({ titleBadgeAlert: titleBadgeAlertToggle.checked });
    });

    minDurationInput.addEventListener('change', () => {
        const val = Math.max(100, Number(minDurationInput.value) || 500);
        minDurationInput.value = val;
        chrome.storage.sync.set({ minDurationMs: val });
    });

    clearHistoryBtn.addEventListener('click', () => {
        currentSettings.recentCompletions = [];
        chrome.storage.sync.set({ recentCompletions: [] });
        renderRecentHistory([]);
    });

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Render all open AI tabs across Chrome
    function renderOpenTabs(tabs) {
        liveTabsCache = Array.isArray(tabs) ? tabs : [];
        const openCount = liveTabsCache.length;
        const genCount = liveTabsCache.filter(t => t.isGenerating).length;

        kpiOpenTabs.textContent = String(openCount);
        kpiGenerating.textContent = String(genCount);
        navSessionsBadge.textContent = String(openCount);
        headerPulseRing.classList.toggle('generating', genCount > 0);

        if (openCount === 0) {
            multiTabList.innerHTML = `
              <div class="empty-state">
                No active AI chat tabs detected right now.<br>
                Open <strong>Gemini, Claude, ChatGPT, DeepSeek, Notion</strong>, or any supported AI chat — all open tabs will appear here live!
              </div>
            `;
            return;
        }

        multiTabList.innerHTML = liveTabsCache.map(tab => {
            const initial = escapeHtml((tab.platformName || 'AI').slice(0, 2).toUpperCase());
            const elapsedSec = tab.isGenerating && tab.generationStartTime
                ? Math.max(1, Math.round((Date.now() - tab.generationStartTime) / 1000))
                : null;

            let statusClass = '';
            let cardClass = '';
            let statusText = 'Idle';
            if (tab.isGenerating) {
                statusClass = 'generating';
                cardClass = 'is-generating';
                statusText = `⚡ ${elapsedSec || 1}s...`;
            } else if (tab.unreadDone) {
                statusClass = 'done';
                cardClass = 'is-done';
                statusText = '🔔 Done!';
            }

            return `
              <div class="session-card ${cardClass}">
                <div class="session-left">
                  <div class="platform-dot" style="background: ${escapeHtml(tab.brandColor || '#6366F1')}">
                    ${initial}
                  </div>
                  <div class="session-meta">
                    <div class="session-platform-row">
                      <span class="session-platform">${escapeHtml(tab.platformName)}</span>
                    </div>
                    <div class="session-title" title="${escapeHtml(tab.title)}">${escapeHtml(tab.title)}</div>
                  </div>
                </div>
                <div class="session-actions">
                  <span class="status-pill ${statusClass}">${statusText}</span>
                  <button class="jump-btn" data-tab-id="${tab.tabId}" data-win-id="${tab.windowId}" title="Switch to this AI Tab">
                    Focus ↗
                  </button>
                </div>
              </div>
            `;
        }).join('');

        multiTabList.querySelectorAll('.jump-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = Number(btn.getAttribute('data-tab-id'));
                const windowId = Number(btn.getAttribute('data-win-id'));
                chrome.runtime.sendMessage({ type: 'FOCUS_AI_TAB', tabId, windowId }, () => {
                    window.close();
                });
            });
        });
    }

    function renderRecentHistory(items) {
        const list = Array.isArray(items) ? items : [];
        if (list.length === 0) {
            recentHistoryList.innerHTML = `<div class="empty-state" style="padding: 8px;">No completions recorded in this session yet.</div>`;
            return;
        }
        recentHistoryList.innerHTML = list.slice(0, 6).map(item => {
            const sec = ((item.elapsedMs || 0) / 1000).toFixed(1);
            return `
              <div class="history-item">
                <div class="history-left">
                  <span class="history-dot" style="background: ${escapeHtml(item.brandColor || '#6366F1')}"></span>
                  <span class="history-name">${escapeHtml(item.platformName)}</span>
                  <span class="history-title">${escapeHtml(item.title)}</span>
                </div>
                <span class="history-meta">✓ ${sec}s</span>
              </div>
            `;
        }).join('');
    }

    function renderPlatformsDirectory(filterText = '') {
        const q = filterText.trim().toLowerCase();
        const disabledHosts = currentSettings.disabledHosts || {};
        const filtered = SUPPORTED_PLATFORMS.filter(p =>
            !q || p.name.toLowerCase().includes(q) || p.host.toLowerCase().includes(q)
        );

        platformDirectoryGrid.innerHTML = filtered.map(p => {
            const isEnabled = !disabledHosts[p.host];
            const initials = escapeHtml(p.name.slice(0, 2).toUpperCase());
            return `
              <label class="platform-item">
                <div class="platform-item-left">
                  <span class="platform-mini-badge" style="background: ${p.color}">${initials}</span>
                  <span class="platform-item-name" title="${p.host}">${escapeHtml(p.name)}</span>
                </div>
                <input type="checkbox" class="platform-host-toggle" data-host="${p.host}" ${isEnabled ? 'checked' : ''}>
              </label>
            `;
        }).join('');

        platformDirectoryGrid.querySelectorAll('.platform-host-toggle').forEach(chk => {
            chk.addEventListener('change', () => {
                const host = chk.getAttribute('data-host');
                const map = { ...(currentSettings.disabledHosts || {}) };
                if (chk.checked) {
                    delete map[host];
                } else {
                    map[host] = true;
                }
                currentSettings.disabledHosts = map;
                chrome.storage.sync.set({ disabledHosts: map });
            });
        });
    }

    platformSearchInput.addEventListener('input', () => {
        renderPlatformsDirectory(platformSearchInput.value);
    });

    function fetchOpenTabs() {
        chrome.runtime.sendMessage({ type: 'GET_ALL_AI_TABS' }, (resp) => {
            if (resp && Array.isArray(resp.tabs)) {
                renderOpenTabs(resp.tabs);
            }
        });
    }

    refreshTabsBtn.addEventListener('click', fetchOpenTabs);

    // Subscribe to live background updates
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg && msg.type === 'TAB_REGISTRY_UPDATED') {
            renderOpenTabs(msg.tabs);
        }
    });

    // Update live elapsed second counters every 1s for generating tabs
    setInterval(() => {
        if (liveTabsCache.some(t => t.isGenerating)) {
            renderOpenTabs(liveTabsCache);
        }
    }, 1000);

    renderRecentHistory(currentSettings.recentCompletions || []);
    renderPlatformsDirectory('');
    fetchOpenTabs();
});
