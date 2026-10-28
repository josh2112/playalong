<script setup lang="ts">
import {
    ArrowUturnLeftIcon,
    MusicalNoteIcon,
    PauseIcon,
    PlayIcon,
} from "@heroicons/vue/24/outline";
import { ref, watch } from "vue";
import "./style.css";
import { playCountoff } from "./useCountoff.ts";
import { useYouTubePlayer } from "./useYouTubePlayer.ts";

const DEBUG = false;
const BUILD_TIMESTAMP = new Date(__BUILD_TIME__).toLocaleString();

interface Cue {
    measure: number;
    bpm: number;
    countoff: string;
    seek: number;
}

interface Video {
    name: string;
    id: string;
    cues: Cue[];
}

interface Tic {
    beat: number;
    isAccent: boolean;
}

const player = useYouTubePlayer("yt-player");

const videos = ref<Video[]>();

const currentVideo = ref<Video>();
const currentCue = ref<Cue>();

const tics = ref<Tic[]>();
const ticIndex = ref(-1);

const downbeatLeadMs = ref(Number(localStorage.getItem("playalong.downbeatLeadMs") ?? "100"));

const isPlaying = ref(false);

// The browser will not play audio until the user has interacted with the page.
const canPlayAudio = ref(false);
window.addEventListener("pointerdown", () => (canPlayAudio.value = true), { once: true });

watch(player.ready, async (isReady) => {
    if (isReady) {
        videos.value = await (await fetch("playlist.json")).json();
        player.addListener((e) => (isPlaying.value = e.data == 1));

        const videoId = localStorage.getItem("playalong.videoId");
        const cueMeasure = localStorage.getItem("playalong.cueMeasure");

        if (videoId) {
            await loadVideo(
                videos.value!.find((v) => v.id == videoId)!,
                cueMeasure ? Number(cueMeasure) : 0,
            );
        }
    }
});

watch(downbeatLeadMs, (ms) => localStorage.setItem("playalong.downbeatLeadMs", ms.toString()));

async function loadVideo(video: Video, measure: number | undefined = undefined) {
    localStorage.setItem("playalong.videoId", video.id);

    player.mute();

    const loaded = player.waitForVideoLoaded();
    player.loadVideo(video.id, 0);
    await loaded;

    player.pause();

    currentVideo.value = video;

    if (measure === undefined) measure = 1;
    currentCue.value =
        measure !== undefined ? video.cues.find((c) => c.measure == measure) : video.cues[0];
}

watch(currentCue, (cue) => {
    if (cue) {
        localStorage.setItem("playalong.cueMeasure", cue.measure.toString());

        let newTics: Tic[] = [];
        let beat = 1;
        for (const t of cue.countoff) {
            const isAccent = t != "_" && t.toUpperCase() == t;
            if (isAccent) beat = 1;
            else beat += 1;
            newTics.push({ beat, isAccent });
        }
        tics.value = newTics;

        playCue(cue);
    }
});

let timeTracker: number;

const timestamp = ref(0);

watch(isPlaying, (playing) => {
    if (playing) {
        timeTracker = setInterval(function () {
            timestamp.value = player.getPosition();
        }, 100);
    } else {
        clearInterval(timeTracker);
    }
});

function playCue(cue: Cue) {
    player.pause();

    player.unmute();
    player.seek(cue.seek);

    ticIndex.value = -1;

    if (canPlayAudio.value) {
        playCountoff(
            cue.countoff,
            cue.bpm,
            () => (ticIndex.value += 1),
            () => {
                ticIndex.value += 1;
                player.play();
            },
            downbeatLeadMs.value,
        );
    }
}

function togglePlayPause() {
    if (isPlaying.value) player.pause();
    else {
        // If the video is close enough to the cue start position, do the full countoff. Otherwise just
        // resume.
        if (currentCue.value) {
            const pos = player.getPosition();
            if (Math.abs(pos - currentCue.value.seek) < 1) {
                playCue(currentCue.value);
            } else {
                player.play();
            }
        }
    }
}
</script>

<template>
    <div class="antialiased container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col h-dvh overflow-hidden">
            <div class="w-full max-w-3xl mx-auto shrink-0 py-4">
                <div id="yt-player" class="w-full max-w-100 h-30 mx-auto rounded-xl shadow-lg" />
            </div>

            <div v-if="currentVideo" class="shrink-0 bg-neutral-200 rounded-lg p-4">
                <div class="font-semibold mb-3">{{ currentVideo.name }}</div>
                <div
                    v-if="currentCue"
                    class="mb-3 py-3 flex flex-col gap-4 border-y border-neutral-400"
                >
                    <div class="flex gap-4 flex-wrap items-center justify-center">
                        <button
                            class="rounded-full bg-neutral-300 px-4 py-2 hover:bg-neutral-400 active:bg-neutral-400 transition-all"
                            @click="playCue(currentCue)"
                        >
                            <ArrowUturnLeftIcon class="size-8" />
                        </button>
                        <div class="mt-1 border-2 px-4 py-1 text-lg font-semibold">
                            {{ currentCue.measure }}
                        </div>
                        <button
                            class="rounded-full bg-neutral-300 px-4 py-2 hover:bg-neutral-400 active:bg-neutral-400 transition-all"
                            @click="togglePlayPause()"
                        >
                            <PlayIcon v-if="!isPlaying" class="size-8" />
                            <PauseIcon v-else class="size-8" />
                        </button>

                        <div
                            class="flex items-baseline justify-center text-lg font-semibold text-neutral-700"
                        >
                            <div
                                v-for="(tic, i) in tics"
                                :key="i"
                                :class="{
                                    'text-2xl': tic.isAccent,
                                    'bg-emerald-400': i == ticIndex,
                                }"
                                class="px-3 py-2 rounded-full"
                            >
                                {{ tic.beat }}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="flex flex-wrap gap-2 mt-2">
                    <button
                        v-for="cue in currentVideo.cues"
                        class="text-lg border border-black px-2 py-1 min-w-9 hover:bg-neutral-300 active:bg-neutral-400 transition-all"
                        :class="{ 'border-2': cue == currentCue }"
                        @click="currentCue = cue"
                    >
                        {{ cue.measure }}
                    </button>
                </div>
            </div>

            <div class="flex-1 min-h-0 overflow-y-auto mt-2">
                <div
                    v-for="video in videos"
                    class="my-2 flex gap-2 items-center rounded-lg px-2 py-1"
                    :class="{ 'bg-neutral-200': video == currentVideo }"
                >
                    <MusicalNoteIcon class="size-4" />
                    <a href="#" class="underline" @click="loadVideo(video)">{{ video.name }}</a>
                </div>
            </div>

            <footer
                class="w-full max-w-md mx-auto shrink-0 p-2 border-t pb-[env(safe-area-inset-bottom)]"
            >
                <div v-if="DEBUG">Timestamp: {{ timestamp.toFixed(1) }} s</div>
                <label for="range-slider" class="block text-sm font-medium"
                    >Video sync: {{ downbeatLeadMs }} ms
                    <span class="text-sm italic font-normal ms-1"
                        >Adjust this if the video doesn't start right on the downbeat.</span
                    >
                    <input
                        type="range"
                        id="range-slider"
                        min="0"
                        max="500"
                        step="10"
                        v-model="downbeatLeadMs"
                        class="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-120"
                /></label>

                <div class="text-sm italic text-right border-t border-neutral-300 mt-1 py-1">
                    @ Josh2112 Apps. Built {{ BUILD_TIMESTAMP }}
                </div>
            </footer>
        </div>
    </div>
</template>
