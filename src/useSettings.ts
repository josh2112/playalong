import { useLocalStorage } from "@vueuse/core";

const downbeatLeadMs = useLocalStorage("playalong.downbeatLeadMs", 100);

const videoId = useLocalStorage<string | null>("playalong.videoId", null);
const cueMeasure = useLocalStorage<number | null>("playalong.cueMeasure", null);

export function useSettings() {
    return {
        downbeatLeadMs,
        videoId,
        cueMeasure,
    };
}
