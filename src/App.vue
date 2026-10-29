<script setup lang="ts">
import {
    ArrowLeftIcon,
    Cog6ToothIcon,
    EllipsisHorizontalIcon,
    MusicalNoteIcon,
    PauseIcon,
    PlayIcon,
} from "@heroicons/vue/24/solid";
import { useWakeLock } from "@vueuse/core";
import { onMounted, ref, useTemplateRef, watch } from "vue";
import SettingsDialog from "./SettingsDialog.vue";
import "./style.css";
import { playCountoff } from "./useCountoff.ts";
import { useSettings } from "./useSettings.ts";
import { useYouTubePlayer } from "./useYouTubePlayer.ts";

const DEBUG = false;
const BUILD_TIMESTAMP = new Date(__BUILD_TIME__).toLocaleString();

interface Video {
    name: string;
    id: string;
    cues: Cue[];
}

interface Cue {
    measure: number;
    bpm: number;
    countoff: string;
    seek: number;
}

interface Tic {
    beat: number;
    isAccent: boolean;
}

const { downbeatLeadMs, videoId, cueMeasure } = useSettings();

const syncDialog = useTemplateRef("syncDialog");

const { request: requestWakeLock } = useWakeLock();

const player = useYouTubePlayer("yt-player");

const videos = ref<Video[]>();

const currentVideo = ref<Video>();
const currentCue = ref<Cue>();

const tics = ref<Tic[]>();
const ticIndex = ref(-1);

const isPlaying = ref(false);

// The browser will not play audio until the user has interacted with the page.
const canPlayAudio = ref(false);
window.addEventListener("pointerdown", () => (canPlayAudio.value = true), { once: true });

onMounted(async () => {
    videos.value = await (await fetch("playlist.json")).json();
    requestWakeLock("screen");
});

watch(player.ready, async (isReady) => {
    if (isReady) {
        player.addListener((e) => (isPlaying.value = e.data == 1));

        if (videoId.value) {
            await loadVideo(
                videos.value!.find((v) => v.id == videoId.value)!,
                cueMeasure.value ? Number(cueMeasure.value) : 0,
            );
        }
    }
});

async function loadVideo(video: Video, measure: number | undefined = undefined) {
    videoId.value = video.id;

    player.mute();

    const loaded = player.waitForVideoLoaded();
    player.loadVideo(video.id, 0);
    await loaded;

    player.pause();

    currentVideo.value = video;

    if (measure === undefined) measure = 1;
    currentCue.value = measure !== undefined ? video.cues.find((c) => c.measure == measure) : video.cues[0];
}

function back() {
    currentVideo.value = undefined;
}

watch(currentCue, (cue) => {
    if (cue) {
        cueMeasure.value = cue.measure;

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
    <div class="bg-emerald-300">
        <div
            class="antialiased container mx-auto px-4 sm:px-6 lg:px-8 touch-manipulation flex flex-col h-dvh overflow-hidden"
        >
            <header class="w-full h-12 mx-auto shrink-0 pt-[env(safe-area-inset-top)] flex items-center">
                <button
                    v-if="currentVideo"
                    class="rounded-full p-2 hover:bg-emerald-200 active:bg-emerald-400"
                    @click="back()"
                >
                    <ArrowLeftIcon class="size-6" />
                </button>
                <div class="grow text-lg font-semibold ps-2">
                    {{ currentVideo?.name ?? "PCB Holiday Concert 2026" }}
                </div>
                <button
                    v-if="currentVideo"
                    class="rounded-full p-2 hover:bg-emerald-200 active:bg-emerald-400"
                    @click="syncDialog?.showModal()"
                >
                    <Cog6ToothIcon class="size-6" />
                </button>
            </header>

            <div v-if="!currentVideo" class="flex-1 min-h-0 overflow-y-auto rounded-2xl shadow-xl bg-emerald-50">
                <div
                    v-for="video in videos"
                    class="px-2 py-3 flex gap-2 items-center border-b border-emerald-200"
                    :class="{ 'bg-emerald-100': video == currentVideo }"
                    @click="loadVideo(video)"
                >
                    <MusicalNoteIcon class="size-4 text-emerald-700" />
                    <div>{{ video.name }}</div>
                </div>
            </div>

            <div v-if="currentVideo" class="flex-1 min-h-0 overflow-y-auto">
                <div class="shrink-0">
                    <div v-if="currentCue" class="bg-emerald-50 rounded-2xl p-4 flex flex-col gap-y-4 gap-4">
                        <div class="flex gap-3 flex-wrap items-center justify-center">
                            <div class="flex flex-col items-center">
                                <div class="mt-1 border-2 px-3 py-1 mb-1 text-lg font-semibold">
                                    {{ currentCue.measure }}
                                </div>
                                <div class="text-sm font-semibold">Measure</div>
                            </div>
                            <button
                                class="rounded-lg bg-emerald-300 px-4 py-2 hover:bg-emerald-400 active:bg-emerald-400 transition-all"
                                @click="playCue(currentCue)"
                            >
                                <div class="flex flex-col items-center">
                                    <div class="flex">
                                        <!--<ArrowUturnLeftIcon class="size-8" />-->
                                        <EllipsisHorizontalIcon class="size-8" />
                                        <PlayIcon class="size-8 -ms-1" />
                                    </div>
                                    <div class="text-sm font-semibold">Start with count-off</div>
                                </div>
                            </button>
                            <button
                                class="rounded-lg bg-emerald-300 px-4 py-2 hover:bg-emerald-400 active:bg-emerald-400 transition-all"
                                @click="togglePlayPause()"
                            >
                                <div class="flex flex-col items-center">
                                    <PlayIcon v-if="!isPlaying" class="size-8" />
                                    <PauseIcon v-else class="size-8" />
                                    <div class="text-sm font-semibold">
                                        {{ isPlaying ? "Pause" : "Play" }}
                                    </div>
                                </div>
                            </button>

                            <div class="flex items-baseline justify-center text-lg font-semibold -mb-2">
                                <div
                                    v-for="(tic, i) in tics"
                                    :key="i"
                                    :class="{
                                        'text-2xl': tic.isAccent,
                                        'bg-emerald-300': i == ticIndex,
                                        'border-s border-black': tic.beat == 1,
                                    }"
                                    class="px-2.5 my-1 py-1"
                                >
                                    {{ tic.beat }}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="mt-4 bg-emerald-50 rounded-2xl p-4 flex flex-wrap gap-2 border-emerald-200">
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

                <footer class="w-full mx-auto shrink-0 p-2 pb-[env(safe-area-inset-bottom)]">
                    <div v-if="DEBUG">Timestamp: {{ timestamp.toFixed(1) }} s</div>

                    <!-- the trigger: a labeled button, not an icon -->
                    <button class="underline" @click="syncDialog?.showModal()">Video out of sync?</button>
                </footer>
            </div>

            <footer class="w-full max-w-md mx-auto shrink-0 p-2 pb-[env(safe-area-inset-bottom)]">
                <div class="w-full max-w-3xl mx-auto shrink-0">
                    <div id="yt-player" class="w-full max-w-100 h-30 mx-auto rounded-xl shadow-lg" />
                </div>
                <div class="text-sm italic text-center mt-1 py-1">@ Josh2112 Apps. Built {{ BUILD_TIMESTAMP }}</div>
            </footer>
        </div>

        <SettingsDialog ref="syncDialog" />
    </div>
</template>
