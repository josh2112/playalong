export interface Video {
    name: string;
    id: string;
    length: number;
    cues: Cue[];
}

export interface Cue {
    measure: number;
    bpm: number;
    countoff: string;
    seek: number;
}

export interface Tic {
    beat: number;
    isAccent: boolean;
}
