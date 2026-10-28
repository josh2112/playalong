let ctx: AudioContext | null = null;
let activeCountoff: { node: GainNode; timers: number[] } | null = null;

// Creates a 'click' at a given time in seconds.
// The frequency depends on whether the click is accented or not.
// The note quickly ramps up to full or half volume (depending on accent),
// then ramps back down 5 ms later, stopping after 6 ms.
function makeClick(node: AudioNode, when: number, note: string) {
    if (note == "_") return;

    const isAccent = note.toUpperCase() == note;

    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.frequency.value = isAccent ? 1500 : 1000;

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(isAccent ? 1 : 0.5, when + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);

    osc.connect(gain).connect(node);
    osc.start(when);
    osc.stop(when + 0.06);
}

// Silences all clicks (connected to the activeCountoff node) and clears any pending onDownbeat() timeout.
export function cancelCountoff() {
    if (!activeCountoff) return;
    for (const timer of activeCountoff.timers) {
        clearTimeout(timer);
    }
    activeCountoff.node.disconnect();
    activeCountoff = null;
}

/**
 * Creates and plays a countoff, calling a callback function when the downbeat would occur.
 * pattern: beat pattern as characters, where capitals are accented; e.g. 'TtTtTTTT'
 * bpm: countoff temp in beats per minute
 * onDownbeat: callback to run at moment of downbeat
 * leadMs: latency compensation: call onDownbeat this many ms early
 */
export function playCountoff(
    pattern: string,
    bpm: number,
    onBeat: (beat: number) => void,
    onDownbeat: () => void,
    downbeatLeadMs = 0,
) {
    cancelCountoff();

    ctx ??= new AudioContext();
    ctx.resume();

    const node = ctx.createGain();
    node.connect(ctx.destination);

    const secondsPerBeat = 60 / bpm;
    const start = ctx.currentTime + 0.1;

    let timers: number[] = [];

    // Create and schedule each click in terms of seconds from start
    let time = start;
    let i = 0;
    for (const c of pattern.split("")) {
        makeClick(node, time, c);
        timers.push(window.setTimeout(() => onBeat(i), (time - ctx.currentTime) * 1000));
        if (c != "_") time += secondsPerBeat;
        i++;
    }

    // Figure out exactly when to call the callback based on countoff length and downbeat lead time
    const delayMs = (time - ctx.currentTime) * 1000 - downbeatLeadMs;

    timers.push(
        window.setTimeout(
            () => {
                activeCountoff = null;
                onDownbeat();
            },
            Math.max(0, delayMs),
        ),
    );

    activeCountoff = { node, timers };
}
