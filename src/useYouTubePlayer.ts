import { onMounted, ref } from "vue";

declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

export function useYouTubePlayer(elId: string) {
    let player: any;
    const ready = ref(false);

    onMounted(() => {
        const init = () => {
            player = new window.YT.Player(elId, {
                playerVars: {
                    playsinline: 1,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                },
                events: { onReady: () => (ready.value = true) },
            });
        };
        if (window.YT?.Player) return init();
        window.onYouTubeIframeAPIReady = init;
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(s);
    });

    return {
        ready,
        // cue paused at a position, so the countoff can run before playback
        loadVideo: (videoId: string, seconds: number) =>
            player.loadVideoById({ videoId, startSeconds: seconds }),
        seek: (seconds: number) => player.seekTo(seconds, true),
        play: () => player.playVideo(),
        pause: () => player.pauseVideo(),
        isPlaying: () => player.getPlayerState() == 1,
        setRate: (r: number) => player.setPlaybackRate(r), // handy for slow practice
        mute: () => player.mute(),
        unmute: () => player.unMute(),
        addListener: (handler: (e: any) => void) =>
            player.addEventListener("onStateChange", handler),
        removeListener: (handler: (e: any) => void) =>
            player.removeEventListener("onStateChange", handler),
        waitForVideoLoaded: () =>
            new Promise<void>((resolve) => {
                const handler = (e: any) => {
                    if (e.data == 1) {
                        player.removeEventListener("onStateChange", handler);
                        resolve();
                    }
                };
                player.addEventListener("onStateChange", handler);
            }),
        getPosition: () => player.getCurrentTime(),
    };
}
