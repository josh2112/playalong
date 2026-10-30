<script setup lang="ts">
import { ArrowLeftIcon, Cog6ToothIcon } from "@heroicons/vue/24/solid";
import { useWakeLock } from "@vueuse/core";
import { onMounted, ref, useTemplateRef, watch } from "vue";
import { BUILD_TIMESTAMP } from "./consts.ts";
import type { Cue, Video } from "./models.ts";
import SettingsDialog from "./SettingsDialog.vue";
import SongListPage from "./SongListPage.vue";
import SongPage from "./SongPage.vue";
import "./style.css";
import { useSettings } from "./useSettings.ts";
import { useYouTubePlayer } from "./useYouTubePlayer.ts";

const { videoId, cueMeasure } = useSettings();

const syncDialog = useTemplateRef("syncDialog");

const { request: requestWakeLock } = useWakeLock();

const player = useYouTubePlayer("yt-player");

const videos = ref<Video[]>();

const currentVideo = ref<Video>();
const currentCue = ref<Cue>();

// The browser will not play audio until the user has interacted with the page.
const canPlayAudio = ref(false);

window.addEventListener("pointerdown", () => (canPlayAudio.value = true), { once: true });

window.addEventListener("popstate", () => {
    if (currentVideo.value) {
        currentVideo.value = undefined;
    }
});

onMounted(async () => {
    videos.value = await (await fetch("playlist.json")).json();
    requestWakeLock("screen");
});

watch(player.ready, async (isReady) => {
    if (isReady) {
        if (videoId.value) {
            await loadVideo(
                videos.value!.find((v) => v.id == videoId.value)!,
                cueMeasure.value ? Number(cueMeasure.value) : 0,
            );
        }
    }
});

async function loadVideo(video: Video, measure: number | undefined = undefined) {
    history.pushState({ videoId: "video.id" }, "");

    videoId.value = video.id;

    player.setMute(true);

    await player.loadVideo(video.id, 0);

    currentVideo.value = video;

    if (measure === undefined) measure = 1;
    currentCue.value =
        measure !== undefined ? video.cues.find((c) => c.measure == measure) : video.cues[0];
}
</script>

<template>
    <div class="bg-emerald-300 antialiased">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col h-dvh overflow-hidden">
            <header
                class="w-full h-12 mx-auto shrink-0 pt-[env(safe-area-inset-top)] flex items-center"
            >
                <button
                    v-if="currentVideo"
                    class="rounded-full p-2 hover:bg-emerald-200 active:bg-emerald-400"
                    @click="currentVideo = undefined"
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

            <SongListPage
                v-if="!currentVideo"
                class="flex-1 min-h-0 overflow-y-auto"
                :videos="videos ?? []"
                @video-selected="(video) => loadVideo(video)"
            />

            <SongPage
                v-else
                class="flex-1 min-h-0 overflow-y-auto"
                :video="currentVideo"
                :player="player"
                v-model:current-cue="currentCue"
                :can-play-audio="canPlayAudio"
                @show-settings="syncDialog?.showModal()"
            />

            <footer class="w-full max-w-md mx-auto shrink-0 p-2 pb-[env(safe-area-inset-bottom)]">
                <div class="w-full max-w-3xl mx-auto shrink-0">
                    <div
                        id="yt-player"
                        class="w-full max-w-100 h-30 mx-auto rounded-xl shadow-lg"
                    />
                </div>
                <div class="text-sm italic text-center mt-1 py-1">
                    @ Josh2112 Apps. Built {{ BUILD_TIMESTAMP }}
                </div>
            </footer>
        </div>

        <SettingsDialog ref="syncDialog" />
    </div>
</template>
