<script setup lang="ts">
import {
    ArrowUturnLeftIcon,
    MusicalNoteIcon,
    PauseIcon,
    PlayIcon,
} from "@heroicons/vue/24/outline";
import { ref, watch, watchEffect } from "vue";
import "./style.css";
import { playCountoff } from "./useCountOff.ts";
import { useYouTubePlayer } from "./useYouTubePlayer.ts";

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

const player = useYouTubePlayer("yt-player");

const videos = ref<Video[]>();

const currentVideo = ref<Video>();
const currentCue = ref<Cue>();

const latencyMs = ref(100);

const isPlaying = ref(false);

watchEffect(async () => {
    if (player.ready.value) {
        videos.value = await (await fetch("playlist.json")).json();
        player.addListener((e) => (isPlaying.value = e.data == 1));

        const videoId = localStorage.getItem("playalong.videoId");
        const cueMeasure = localStorage.getItem("playalong.cueMeasure");

        if (videoId) {
            currentVideo.value = videos.value?.find((v) => v.id == videoId);
            if (cueMeasure) {
                watch(
                    currentCue,
                    () => {
                        currentCue.value = currentVideo.value!.cues.find(
                            (c) => c.measure == Number(cueMeasure),
                        );
                    },
                    { once: true },
                );
            }
        }
    }
});

watch(currentVideo, async (video) => {
    if (video) {
        localStorage.setItem("playalong.videoId", video.id);

        player.mute();

        const loaded = player.waitForVideoLoaded();
        player.loadVideo(video.id, 0);
        await loaded;

        player.pause();

        currentCue.value = currentVideo.value?.cues[0];
    }
});

watch(currentCue, (cue) => {
    if (cue) {
        localStorage.setItem("playalong.cueMeasure", cue.measure.toString());
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

    playCountoff(cue.countoff, cue.bpm, () => player.play(), latencyMs.value);
}

function togglePlayPause() {
    if (isPlaying.value) player.pause();
    else player.play();
}
</script>

<template>
    <div class="antialiased text container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col h-screen overflow-hidden">
            <div class="w-full max-w-3xl mx-auto py-4">
                <div id="yt-player" class="w-full max-w-100 h-30 mx-auto rounded-xl shadow-lg" />
            </div>

            <div v-if="currentVideo" class="bg-neutral-200 rounded-lg shadow-lg px-4 py-2">
                <div class="font-semibold mb-3">{{ currentVideo.name }}</div>
                <div
                    v-if="currentCue"
                    class="mb-3 p-3 flex gap-4 items-center border-y border-neutral-400"
                >
                    <div class="my-2 border-2 px-4 py-1 text-lg font-semibold">
                        {{ currentCue.measure }}
                    </div>
                    <button
                        class="rounded-full bg-neutral-300 px-4 py-2"
                        @click="togglePlayPause()"
                    >
                        <PlayIcon v-if="!isPlaying" class="size-8" />
                        <PauseIcon v-else class="size-8" />
                    </button>
                    <button
                        class="rounded-full bg-neutral-300 px-4 py-2"
                        @click="playCue(currentCue)"
                    >
                        <ArrowUturnLeftIcon class="size-8" />
                    </button>
                </div>
                <div class="flex gap-2 mt-2">
                    <button
                        v-for="cue in currentVideo.cues"
                        class="text-lg border border-black bg-transparent px-2 py-1 min-w-9 hover:bg-neutral-200 active:bg-neutral-300 transition-all"
                        @click="currentCue = cue"
                    >
                        {{ cue.measure }}
                    </button>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto mt-4">
                <div v-for="video in videos" class="my-2 flex gap-2 items-center">
                    <MusicalNoteIcon class="size-4" />
                    <a href="#" class="underline" @click="currentVideo = video">{{ video.name }}</a>
                </div>
            </div>

            <footer class="w-full max-w-md mx-auto p-2 pb-4">
                <div>Timestamp: {{ timestamp.toFixed(1) }} s</div>
                <label for="range-slider" class="block text-sm font-medium"
                    >Video sync: {{ latencyMs }} ms</label
                >
                <input
                    type="range"
                    id="range-slider"
                    min="0"
                    max="500"
                    step="10"
                    v-model="latencyMs"
                    class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-120"
                />
                <div class="text-sm italic">
                    Adjust this if the video doesn't start right on the downbeat.
                </div>
            </footer>
        </div>
    </div>
</template>
