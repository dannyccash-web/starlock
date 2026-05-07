/* ============================================================
   STARLOCK - AUDIO MANAGER
   ------------------------------------------------------------
   Centralizes all sound playback for the game:

     - Soundtrack:  the looping background music
                    (audio/Space Soundtrack.mp3). Volume controlled
                    by the "soundtrack" slider in the settings menu.

     - Effects:     short SFX (typewriter loop, door open, keycard
                    swipe, etc.). Volume controlled by the
                    "effects" slider in the settings menu.

   Volume preferences persist via localStorage so the player's
   settings survive a page reload.

   Browsers block autoplay until the user interacts with the
   page. We start the soundtrack on the first explicit START
   click (see main.js); attempts before that will silently fail
   and we'll retry on the next user gesture.
   ============================================================ */

const GameAudio = (() => {
  const SOUNDTRACK_KEY = "starlock_volume_soundtrack";
  const EFFECTS_KEY    = "starlock_volume_effects";

  // Default volumes (0..1). Soundtrack starts mid-low so it doesn't
  // overpower the typewriter SFX on first run.
  const DEFAULT_SOUNDTRACK = 0.45;
  const DEFAULT_EFFECTS    = 0.7;

  function readVol(key, fallback) {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? clamp(n, 0, 1) : fallback;
  }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  const state = {
    soundtrackVolume: readVol(SOUNDTRACK_KEY, DEFAULT_SOUNDTRACK),
    effectsVolume:    readVol(EFFECTS_KEY,    DEFAULT_EFFECTS),
    soundtrackStarted: false,
    typewriterActive:  0,  // ref-count of concurrent typewriter animations
  };

  /* ----- Soundtrack: looping background music ----- */
  const soundtrack = new window.Audio("audio/Space%20Soundtrack.mp3");
  soundtrack.loop = true;
  soundtrack.preload = "auto";
  soundtrack.volume = state.soundtrackVolume;

  /* ----- Typewriter SFX: short clip looped while text is typing ----- */
  const typewriter = new window.Audio("audio/mixkit-data-input-on-typewriter-1378.mp3");
  typewriter.loop = true;
  typewriter.preload = "auto";
  typewriter.volume = state.effectsVolume;

  /* ----- One-shot SFX: door open, keycard swipe ----- */
  const doorOpenSfx  = new window.Audio("audio/universfield-opening-metal-door-199581.mp3");
  doorOpenSfx.preload = "auto";
  doorOpenSfx.volume = state.effectsVolume;

  const keycardSwipeSfx = new window.Audio("audio/driken5482-swipe-236674.mp3");
  keycardSwipeSfx.preload = "auto";
  keycardSwipeSfx.volume = state.effectsVolume;

  function playOneShot(audio) {
    audio.volume = state.effectsVolume;
    try { audio.currentTime = 0; } catch (e) {}
    const p = audio.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }

  function playDoorOpen()     { playOneShot(doorOpenSfx); }
  function playKeycardSwipe() { playOneShot(keycardSwipeSfx); }

  function startSoundtrack() {
    if (state.soundtrackStarted) return;
    const p = soundtrack.play();
    if (p && typeof p.then === "function") {
      p.then(() => { state.soundtrackStarted = true; })
       .catch(() => { /* will retry on next gesture */ });
    } else {
      state.soundtrackStarted = true;
    }
  }

  // Fallback: if anything calls startSoundtrack before the first
  // user gesture, register a one-shot listener that retries.
  function armAutoStartOnGesture() {
    const retry = () => {
      if (state.soundtrackStarted) return;
      startSoundtrack();
      if (state.soundtrackStarted) {
        document.removeEventListener("click",   retry, true);
        document.removeEventListener("keydown", retry, true);
      }
    };
    document.addEventListener("click",   retry, true);
    document.addEventListener("keydown", retry, true);
  }
  armAutoStartOnGesture();

  /* ----- Typewriter SFX control -----
     A short grace window on stop avoids audible clicks when one
     typewriter animation immediately follows another (e.g., a new
     showMessage cancels the previous one). If a new typewriterStart
     arrives during the grace window, we just keep playing. */
  let stopTimer = null;
  const STOP_GRACE_MS = 60;

  function typewriterStart() {
    state.typewriterActive++;
    if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
    // Only kick playback if it isn't already running.
    if (state.typewriterActive === 1 && (typewriter.paused || typewriter.ended)) {
      typewriter.volume = state.effectsVolume;
      try { typewriter.currentTime = 0; } catch (e) {}
      const p = typewriter.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      // Make sure volume is up to date even if we didn't restart.
      typewriter.volume = state.effectsVolume;
    }
  }
  function typewriterStop() {
    state.typewriterActive = Math.max(0, state.typewriterActive - 1);
    if (state.typewriterActive === 0) {
      if (stopTimer) clearTimeout(stopTimer);
      stopTimer = setTimeout(() => {
        stopTimer = null;
        if (state.typewriterActive === 0) {
          typewriter.pause();
          try { typewriter.currentTime = 0; } catch (e) {}
        }
      }, STOP_GRACE_MS);
    }
  }

  /* ----- Volume setters / getters ----- */
  function setSoundtrackVolume(v) {
    state.soundtrackVolume = clamp(parseFloat(v) || 0, 0, 1);
    soundtrack.volume = state.soundtrackVolume;
    try { localStorage.setItem(SOUNDTRACK_KEY, String(state.soundtrackVolume)); } catch (e) {}
  }
  function setEffectsVolume(v) {
    state.effectsVolume = clamp(parseFloat(v) || 0, 0, 1);
    typewriter.volume      = state.effectsVolume;
    doorOpenSfx.volume     = state.effectsVolume;
    keycardSwipeSfx.volume = state.effectsVolume;
    try { localStorage.setItem(EFFECTS_KEY, String(state.effectsVolume)); } catch (e) {}
  }
  function getSoundtrackVolume() { return state.soundtrackVolume; }
  function getEffectsVolume()    { return state.effectsVolume; }

  return {
    startSoundtrack,
    setSoundtrackVolume,
    setEffectsVolume,
    getSoundtrackVolume,
    getEffectsVolume,
    typewriterStart,
    typewriterStop,
    playDoorOpen,
    playKeycardSwipe,
  };
})();
