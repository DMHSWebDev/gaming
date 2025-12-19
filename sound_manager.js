// Modular SoundManager for the game engine
// Usage: const soundManager = new SoundManager(SOUNDS);
// soundManager.play('jump');
// soundManager.loop('music');


// Global flag to enable/disable all sounds
export let SOUND_ENABLED = false; // Set to true when sound files are ready

class SoundManager {
    constructor(sounds) {
        this.sounds = {};
        for (const [name, src] of Object.entries(sounds)) {
            const audio = new Audio(src);
            audio.preload = 'auto';
            this.sounds[name] = audio;
        }
    }
    play(name) {
        if (!SOUND_ENABLED) return;
        const sound = this.sounds[name];
        if (sound) {
            sound.currentTime = 0;
            sound.play();
        }
    }
    stop(name) {
        if (!SOUND_ENABLED) return;
        const sound = this.sounds[name];
        if (sound) sound.pause();
    }
    loop(name) {
        if (!SOUND_ENABLED) return;
        const sound = this.sounds[name];
        if (sound) {
            sound.loop = true;
            sound.play();
        }
    }
    stopAll() {
        if (!SOUND_ENABLED) return;
        for (const sound of Object.values(this.sounds)) {
            sound.pause();
            sound.currentTime = 0;
        }
    }
    setVolume(name, volume) {
        if (!SOUND_ENABLED) return;
        const sound = this.sounds[name];
        if (sound) sound.volume = volume;
    }
    muteAll() {
        if (!SOUND_ENABLED) return;
        for (const sound of Object.values(this.sounds)) sound.muted = true;
    }
    unmuteAll() {
        if (!SOUND_ENABLED) return;
        for (const sound of Object.values(this.sounds)) sound.muted = false;
    }
}

export default SoundManager;
