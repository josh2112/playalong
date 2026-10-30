<script setup lang="ts">
import { MusicalNoteIcon } from "@heroicons/vue/24/solid";
import type { Video } from "./models";

defineProps<{ videos: Video[] }>();

const emit = defineEmits<{
    videoSelected: [video: Video];
}>();
</script>

<template>
    <div class="rounded-2xl shadow-xl bg-emerald-50">
        <div
            v-for="video in videos"
            class="px-2 py-3 flex gap-2 items-center border-b border-emerald-200"
            @click="emit('videoSelected', video)"
        >
            <MusicalNoteIcon class="size-4 text-emerald-700 mx-1" />
            <div>{{ video.name }}</div>
        </div>
    </div>
</template>
