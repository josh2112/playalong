import { onMounted, ref, watch } from "vue";

declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

export function useYouTubePlayer(elId: string) {
    let player: any;
    let positionUpdateTimer: number;

    const ready = ref(false);
    const isPlaying = ref(false);
    const position = ref(0);
    const isHalfSpeed = ref(false);

    onMounted(() => {
        const init = () => {
            player = new window.YT.Player(elId, {
                playerVars: {
                    playsinline: 1,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                },
                events: {
                    onReady: () => (ready.value = true),
                    onStateChange: (e: any) => (isPlaying.value = e.data == 1),
                },
            });
        };

        if (window.YT?.Player) return init();
        window.onYouTubeIframeAPIReady = init;

        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(s);
    });

    watch(isPlaying, (playing) => {
        if (playing) {
            positionUpdateTimer = setInterval(
                () => (position.value = player.getCurrentTime()),
                100,
            );
        } else {
            clearInterval(positionUpdateTimer);
        }
    });

    watch(isHalfSpeed, (halfSpeed) => player.setPlaybackRate(halfSpeed ? 0.5 : 1));

    const waitForVideoLoaded = async () =>
        new Promise<void>((resolve) => {
            const handler = (e: any) => {
                if (e.data == 1) {
                    player.removeEventListener("onStateChange", handler);
                    resolve();
                }
            };
            player.addEventListener("onStateChange", handler);
        });

    return {
        ready,
        isPlaying,
        position,
        isHalfSpeed,
        // cue paused at a position, so the countoff can run before playback
        loadVideo: async (videoId: string, seconds: number) => {
            const loaded = waitForVideoLoaded();
            player.loadVideoById({ videoId, startSeconds: seconds });
            await loaded;
            player.pauseVideo();
        },
        seek: (seconds: number) => {
            player.seekTo(seconds, true);
            position.value = seconds;
        },
        play: () => player.playVideo(),
        pause: () => player.pauseVideo(),
        setMute: (isMute: boolean) => {
            if (isMute) player.mute();
            else player.unMute();
        },
    };
}
