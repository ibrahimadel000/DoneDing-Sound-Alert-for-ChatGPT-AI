// DoneDing v6.0 — Shared Web Audio Synthesizer & Sound Catalog
(function(global) {
    'use strict';

    let audioCtx = null;

    const SOUND_LABELS = {
        pro_chime: 'Pro Chime (F#5 → B5)',
        crystal_triad: 'Crystal Triad',
        warm_marimba: 'Warm Marimba',
        soft_harp: 'Celestial Harp',
        gentle_zen: 'Resonant Bowl',
        double_pulse: 'Studio Pulse'
    };

    // Distinct default sound per AI platform so when multiple AI sites are open,
    // the user can tell WHICH AI finished purely by ear!
    const PLATFORM_DEFAULT_SOUNDS = {
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
    };

    function getAudioContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        return audioCtx;
    }

    function primeAudio() {
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
            const buffer = ctx.createBuffer(1, 1, 22050);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
        } catch (e) {}
    }

    function scheduleNote(ctx, destination, freq, delay, duration, peakGain, overtoneRatio, waveType) {
        const startTime = ctx.currentTime + delay;

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = waveType || 'sine';
        osc1.frequency.setValueAtTime(freq, startTime);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * (overtoneRatio || 2.75), startTime);

        gain1.gain.setValueAtTime(0.0001, startTime);
        gain1.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
        gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        gain2.gain.setValueAtTime(0.0001, startTime);
        gain2.gain.linearRampToValueAtTime(peakGain * 0.22, startTime + 0.01);
        gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + (duration * 0.6));

        osc1.connect(gain1);
        gain1.connect(destination);
        osc2.connect(gain2);
        gain2.connect(destination);

        osc1.start(startTime);
        osc2.start(startTime);
        osc1.stop(startTime + duration + 0.02);
        osc2.stop(startTime + duration + 0.02);
    }

    async function playChime(preset = 'pro_chime', volume = 0.85) {
        try {
            const ctx = getAudioContext();
            if (!ctx) return false;
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }
            if (ctx.state !== 'running') {
                return false;
            }

            const vol = Math.max(0.05, Math.min(1.0, Number(volume) || 0.85));
            const baseGain = 0.22 * vol;

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2400, ctx.currentTime);
            filter.connect(ctx.destination);

            if (preset === 'pro_chime') {
                scheduleNote(ctx, filter, 739.99, 0.00, 0.55, baseGain, 2.75, 'sine'); // F#5
                scheduleNote(ctx, filter, 987.77, 0.14, 0.60, baseGain, 2.75, 'sine'); // B5
            } else if (preset === 'crystal_triad') {
                scheduleNote(ctx, filter, 587.33, 0.00, 0.45, baseGain * 0.9, 2.0, 'sine'); // D5
                scheduleNote(ctx, filter, 739.99, 0.11, 0.45, baseGain * 0.95, 2.0, 'sine'); // F#5
                scheduleNote(ctx, filter, 1174.66, 0.22, 0.65, baseGain, 2.0, 'sine');      // D6
            } else if (preset === 'warm_marimba') {
                scheduleNote(ctx, filter, 392.00, 0.00, 0.35, baseGain * 1.1, 4.0, 'triangle');
                scheduleNote(ctx, filter, 587.33, 0.09, 0.40, baseGain * 1.0, 4.0, 'triangle');
                scheduleNote(ctx, filter, 987.77, 0.18, 0.50, baseGain * 0.9, 4.0, 'sine');
            } else if (preset === 'gentle_zen') {
                scheduleNote(ctx, filter, 528.00, 0.00, 0.95, baseGain, 1.5, 'sine');
                scheduleNote(ctx, filter, 792.00, 0.06, 0.85, baseGain * 0.6, 2.0, 'sine');
            } else if (preset === 'soft_harp') {
                scheduleNote(ctx, filter, 523.25, 0.00, 0.42, baseGain * 0.85, 2.0, 'sine'); // C5
                scheduleNote(ctx, filter, 659.25, 0.08, 0.45, baseGain * 0.90, 2.0, 'sine'); // E5
                scheduleNote(ctx, filter, 783.99, 0.16, 0.48, baseGain * 0.95, 2.0, 'sine'); // G5
                scheduleNote(ctx, filter, 1046.50, 0.24, 0.65, baseGain, 2.0, 'sine');       // C6
            } else if (preset === 'double_pulse') {
                scheduleNote(ctx, filter, 880.00, 0.00, 0.22, baseGain, 2.5, 'sine');
                scheduleNote(ctx, filter, 1174.66, 0.16, 0.40, baseGain, 2.5, 'sine');
            } else {
                scheduleNote(ctx, filter, 739.99, 0.00, 0.55, baseGain, 2.75, 'sine');
                scheduleNote(ctx, filter, 987.77, 0.14, 0.60, baseGain, 2.75, 'sine');
            }

            return true;
        } catch (err) {
            return false;
        }
    }

    function resolveSoundForPlatform(platformId, settings) {
        if (!settings) return 'pro_chime';
        if (settings.useDistinctSiteSounds !== false) {
            if (settings.siteSounds && settings.siteSounds[platformId]) {
                return settings.siteSounds[platformId];
            }
            if (PLATFORM_DEFAULT_SOUNDS[platformId]) {
                return PLATFORM_DEFAULT_SOUNDS[platformId];
            }
        }
        return settings.soundPreset || 'pro_chime';
    }

    global.AIChimeAudio = {
        primeAudio,
        playChime,
        resolveSoundForPlatform,
        SOUND_LABELS,
        PLATFORM_DEFAULT_SOUNDS,
        getState: () => (audioCtx ? audioCtx.state : 'uninitialized')
    };
})(window);
