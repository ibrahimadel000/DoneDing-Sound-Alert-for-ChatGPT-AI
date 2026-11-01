// DoneDing v7.0 — Single-Voice Web Audio Synthesizer (Zero Overlap / Mixing)
(function(global) {
    'use strict';

    let audioCtx = null;
    let activeNodes = [];

    const SOUND_LABELS = {
        pro_chime: 'Pro Chime',
        warm_marimba: 'Warm Marimba',
        crystal_triad: 'Crystal Triad',
        double_pulse: 'Studio Pulse',
        soft_harp: 'Celestial Harp',
        gentle_zen: 'Resonant Bowl'
    };

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

    function stopActiveNodes() {
        while (activeNodes.length > 0) {
            const node = activeNodes.pop();
            try { node.stop(); } catch (e) {}
            try { node.disconnect(); } catch (e) {}
        }
    }

    function primeAudio() {
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
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

        activeNodes.push(osc1, osc2);
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

            // Immediately stop any currently playing oscillators so sounds NEVER mix!
            stopActiveNodes();

            const vol = Math.max(0.05, Math.min(1.0, Number(volume) || 0.85));
            const baseGain = 0.24 * vol;

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2600, ctx.currentTime);
            filter.connect(ctx.destination);

            if (preset === 'pro_chime') {
                // F#5 -> B5 signature two-note chime
                scheduleNote(ctx, filter, 739.99, 0.00, 0.55, baseGain, 2.75, 'sine');
                scheduleNote(ctx, filter, 987.77, 0.14, 0.60, baseGain, 2.75, 'sine');
            } else if (preset === 'crystal_triad') {
                // Bright D5 -> F#5 -> D6 arpeggio
                scheduleNote(ctx, filter, 587.33, 0.00, 0.42, baseGain * 0.9, 2.0, 'sine');
                scheduleNote(ctx, filter, 739.99, 0.11, 0.42, baseGain * 0.95, 2.0, 'sine');
                scheduleNote(ctx, filter, 1174.66, 0.22, 0.62, baseGain, 2.0, 'sine');
            } else if (preset === 'warm_marimba') {
                // Woody low-mid marimba G4 -> D5 -> B5
                scheduleNote(ctx, filter, 392.00, 0.00, 0.32, baseGain * 1.15, 4.0, 'triangle');
                scheduleNote(ctx, filter, 587.33, 0.10, 0.36, baseGain * 1.05, 4.0, 'triangle');
                scheduleNote(ctx, filter, 987.77, 0.20, 0.48, baseGain * 0.95, 4.0, 'sine');
            } else if (preset === 'gentle_zen') {
                // Deep 528Hz resonant singing bowl
                scheduleNote(ctx, filter, 528.00, 0.00, 0.95, baseGain * 1.1, 1.5, 'sine');
                scheduleNote(ctx, filter, 792.00, 0.05, 0.85, baseGain * 0.65, 2.0, 'sine');
            } else if (preset === 'soft_harp') {
                // 4-note cascading C5 -> E5 -> G5 -> C6 harp
                scheduleNote(ctx, filter, 523.25, 0.00, 0.38, baseGain * 0.85, 2.0, 'sine');
                scheduleNote(ctx, filter, 659.25, 0.08, 0.42, baseGain * 0.90, 2.0, 'sine');
                scheduleNote(ctx, filter, 783.99, 0.16, 0.46, baseGain * 0.95, 2.0, 'sine');
                scheduleNote(ctx, filter, 1046.50, 0.24, 0.62, baseGain, 2.0, 'sine');
            } else if (preset === 'double_pulse') {
                // Fast studio ping A5 -> E6
                scheduleNote(ctx, filter, 880.00, 0.00, 0.18, baseGain, 2.5, 'sine');
                scheduleNote(ctx, filter, 1318.51, 0.14, 0.36, baseGain, 2.5, 'sine');
            } else {
                scheduleNote(ctx, filter, 739.99, 0.00, 0.55, baseGain, 2.75, 'sine');
                scheduleNote(ctx, filter, 987.77, 0.14, 0.60, baseGain, 2.75, 'sine');
            }

            return true;
        } catch (err) {
            return false;
        }
    }

    global.AIChimeAudio = {
        primeAudio,
        playChime,
        stopActiveNodes,
        SOUND_LABELS,
        PLATFORM_DEFAULT_SOUNDS,
        getState: () => (audioCtx ? audioCtx.state : 'uninitialized')
    };
})(window);
