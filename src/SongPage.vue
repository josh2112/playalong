<script setup lang="ts">
import { ChevronDownIcon } from "@heroicons/vue/16/solid";
import {
    ArrowPathIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    PlayIcon,
    StopIcon,
} from "@heroicons/vue/24/solid";
import { computed, onMounted, ref, watch, type Ref } from "vue";
import type { Cue, Tic, Video } from "./models";
import { cancelCountoff, playCountoff } from "./useCountoff.ts";
import { useSettings } from "./useSettings";

interface Player {
    play: () => void;
    pause: () => void;
    setMute: (isMute: boolean) => void;
    seek: (position: number) => void;
    position: Ref<number>;
    isPlaying: Ref<boolean>;
    isHalfSpeed: Ref<boolean>;
}

const props = defineProps<{ video: Video; player: Player; canPlayAudio: boolean }>();

const emit = defineEmits<{ showSettings: [] }>();

const currentCue = defineModel<Cue>("currentCue");

const nextCue = computed(
    () =>
        props.video.cues[
            props.video.cues.findIndex((c) => c.measure == currentCue.value?.measure) + 1
        ],
);

const { downbeatLeadMs, cueMeasure } = useSettings();

const tics = ref<Tic[]>();
const ticIndex = ref(-1);

const isCountoffPlaying = ref(false);

const isLoopOn = ref<boolean>();

const loopAt = computed(() => nextCue.value?.seek ?? props.video.length);

onMounted(() => {
    if (currentCue.value) loadCue(currentCue.value);
});

watch(currentCue, (cue) => {
    if (cue) loadCue(cue);
});

watch(isCountoffPlaying, (isPlaying) => {
    if (!isPlaying) ticIndex.value = -1;
});

watch(props.player.position, (pos) => {
    if (isLoopOn.value && pos >= loopAt.value) {
        playCue(currentCue.value!);
    }
});

function loadCue(cue: Cue) {
    if (cue) {
        if (isCountoffPlaying.value) {
            cancelCountoff();
            isCountoffPlaying.value = false;
        }
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

        props.player.pause();
        props.player.seek(cue.seek);
    }
}

function playCue(cue: Cue) {
    props.player.pause();
    props.player.seek(cue.seek);
    props.player.setMute(false);

    ticIndex.value = -1;

    if (props.canPlayAudio) {
        playCountoff(
            cue.countoff,
            cue.bpm * (props.player.isHalfSpeed.value ? 0.5 : 1),
            () => (ticIndex.value += 1),
            () => {
                props.player.play();
                setTimeout(() => (isCountoffPlaying.value = false), 500);
            },
            downbeatLeadMs.value,
        );
        isCountoffPlaying.value = true;
    }
}

function togglePlayPause() {
    if (props.player.isPlaying.value) {
        props.player.pause();
    } else if (isCountoffPlaying.value) {
        cancelCountoff();
        isCountoffPlaying.value = false;
    } else if (currentCue.value) {
        playCue(currentCue.value);
    }
}

function stepCue(prev: boolean) {
    currentCue.value =
        props.video.cues[
            props.video.cues.findIndex((c) => c.measure == currentCue.value?.measure) +
                (prev ? -1 : 1)
        ];
}
</script>

<template>
    <div>
        <div v-if="currentCue" class="bg-emerald-50 rounded-2xl p-4">
            <div class="flex flex-wrap gap-4 gap-y-4 items-center justify-center">
                <!-- Measure selection -->
                <div class="flex">
                    <button
                        class="rounded-s-lg bg-emerald-300 px-4 py-2 hover:bg-emerald-400 active:bg-emerald-400 disabled:bg-emerald-200 disabled:text-emerald-600 transition-all"
                        :disabled="currentCue.measure == video.cues.at(0)!.measure"
                        @click="stepCue(true)"
                    >
                        <div class="flex flex-col items-center">
                            <ChevronLeftIcon class="size-8" />
                            <div class="text-sm font-semibold">Prev</div>
                        </div>
                    </button>

                    <div
                        class="bg-emerald-300 px-4 py-2 hover:bg-emerald-400 active:bg-emerald-400 transition-all relative flex items-center"
                    >
                        <div class="border-2 px-3 py-1 text-lg font-semibold">
                            {{ currentCue.measure }}
                        </div>
                        <ChevronDownIcon class="size-5 ms-1 -me-3" />
                        <select
                            v-model="currentCue"
                            class="absolute inset-0 h-full w-full opacity-0"
                        >
                            <option v-for="cue in video.cues" :key="cue.measure" :value="cue">
                                {{ cue.measure }}
                            </option>
                        </select>
                    </div>

                    <button
                        class="rounded-e-lg bg-emerald-300 px-4 py-2 hover:bg-emerald-400 active:bg-emerald-400 disabled:bg-emerald-200 disabled:text-emerald-600 transition-all"
                        :disabled="currentCue.measure == video.cues.at(-1)!.measure"
                        @click="stepCue(false)"
                    >
                        <div class="flex flex-col items-center">
                            <ChevronRightIcon class="size-8" />
                            <div class="text-sm font-semibold">Next</div>
                        </div>
                    </button>
                </div>

                <div class="flex gap-4">
                    <!-- Play/stop button -->
                    <button
                        class="rounded-lg bg-emerald-300 min-w-36 px-4 py-2 hover:bg-emerald-400 active:bg-emerald-400 transition-all"
                        @click="togglePlayPause()"
                    >
                        <div class="flex flex-col items-center">
                            <PlayIcon
                                v-if="!player.isPlaying.value && !isCountoffPlaying"
                                class="size-8 -ms-1"
                            />
                            <StopIcon v-else class="size-8" />
                            <div class="text-sm font-semibold">
                                <div v-if="!player.isPlaying.value && !isCountoffPlaying">
                                    Start
                                </div>
                                <div v-else>Stop</div>
                            </div>
                        </div>
                    </button>

                    <!-- Loop button-->
                    <button
                        class="rounded-lg bg-emerald-300 px-4 py-2 min-w-36 hover:bg-emerald-400 active:bg-emerald-400 transition-all"
                        :class="{ 'bg-emerald-800 text-white': isLoopOn }"
                        @click="isLoopOn = !isLoopOn"
                    >
                        <div class="flex flex-col items-center">
                            <ArrowPathIcon class="size-8" />
                            <div class="text-sm font-semibold">
                                Loop{{
                                    isLoopOn
                                        ? `ing ${currentCue.measure}-${nextCue?.measure ?? "end"}`
                                        : ""
                                }}
                            </div>
                        </div>
                    </button>
                </div>

                <!-- Playback speed switches -->
                <div>
                    <button
                        class="rounded-s-lg bg-emerald-300 px-4 py-2 text-sm font-semibold hover:bg-emerald-400 active:bg-emerald-400 transition-all"
                        :class="{ 'bg-emerald-800 text-white': !player.isHalfSpeed.value }"
                        @click="player.isHalfSpeed.value = false"
                    >
                        Normal</button
                    ><button
                        class="rounded-e-lg bg-emerald-300 px-4 py-2 text-sm font-semibold hover:bg-emerald-400 active:bg-emerald-400 transition-all"
                        :class="{ 'bg-emerald-800 text-white': player.isHalfSpeed.value }"
                        @click="player.isHalfSpeed.value = true"
                    >
                        Half speed
                    </button>
                </div>
            </div>

            <div
                class="mt-2 flex items-baseline justify-center text-lg font-semibold -mb-2 min-h-0 overflow-y-auto"
            >
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

        <button class="underline mt-2" @click="emit('showSettings')">Video out of sync?</button>
    </div>
</template>
