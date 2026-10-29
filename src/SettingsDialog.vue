<script setup lang="ts">
import { ref } from "vue";
import { useSettings } from "./useSettings";

const syncDialog = ref<HTMLDialogElement | null>(null);

const showModal = () => syncDialog.value?.showModal();

defineExpose({
    showModal,
});

const { downbeatLeadMs } = useSettings();

// Close when the dimmed backdrop is tapped (the click target is the dialog itself)
function onDialogClick(e: MouseEvent) {
    if (e.target === syncDialog.value) syncDialog.value?.close();
}
</script>

<template>
    <dialog
        ref="syncDialog"
        class="m-auto w-[90vw] max-w-md rounded-xl p-4 shadow-xl backdrop:bg-emerald-900/50 bg-emerald-50"
        @click="onDialogClick"
    >
        <h2 class="mb-2 text-lg font-semibold">Settings</h2>

        <div class="my-6">
            <label for="videoSync" class="font-semibold"
                ><div>
                    Video lead time:
                    <span class="font-normal">{{ downbeatLeadMs }} ms</span>
                </div></label
            >
            <input
                v-model.number="downbeatLeadMs"
                id="videoSync"
                type="range"
                min="0"
                max="500"
                step="10"
                class="rotate-180 w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-800 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-800 [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-120"
            />
            <div class="mt-1 italic text-sm font-normal">
                Move <b>left</b> if the music starts is late after the downbeat. Move
                <b>right</b> if it starts before the downbeat.
            </div>
        </div>

        <button
            class="mt-6 w-full rounded-lg bg-emerald-800 py-3 text-white"
            @click="syncDialog?.close()"
        >
            Done
        </button>
    </dialog>
</template>
