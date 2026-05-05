/* ============================================================
   STARLOCK - BOOT
   - Scales the 1920x1080 stage to fit the viewport
   - Wires the START button to fade into the cryo room
   - Typewriter-animates the START label and opening message
   - Boots the looping background soundtrack on first user click
   ============================================================ */

(function () {
  const stage      = document.getElementById("stage");
  const startSec   = document.getElementById("start-screen");
  const gameSec    = document.getElementById("game-screen");
  const startBtn   = document.getElementById("start-button");

  // Scale stage to fit window while preserving 16:9 aspect.
  function fitStage() {
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    const scale = Math.min(sw / 1920, sh / 1080);
    document.documentElement.style.setProperty("--scale", scale.toString());
  }
  window.addEventListener("resize", fitStage);
  fitStage();

  // Typewriter the START button label on initial load. main.js is
  // loaded at the end of <body>, so the DOM is already parsed by the
  // time we get here — schedule the typewriter on a short timeout so
  // the start screen has a beat to fade in before the letters appear.
  // (We keep the existing "START" textContent in HTML so that if JS
  // ever fails to load, the player still sees a real button label.)
  setTimeout(() => {
    const txt = startBtn.dataset.twText || startBtn.textContent;
    Typewriter.typeOnce(startBtn, txt, { speed: 80 });
  }, 250);

  // START -> game
  startBtn.addEventListener("click", () => {
    // The START click is also the player's first user gesture, which
    // satisfies browser autoplay policies. Kick off the soundtrack now.
    GameAudio.startSoundtrack();

    // Cross-fade the start section out and the game section in.
    startSec.style.transition = "opacity 600ms ease";
    startSec.style.opacity = "0";
    setTimeout(() => {
      startSec.classList.remove("active");
      gameSec.classList.add("active");
      gameSec.style.opacity = "0";
      gameSec.style.transition = "opacity 600ms ease";
      // Force reflow so the next opacity change animates.
      void gameSec.offsetWidth;
      gameSec.style.opacity = "1";
      Engine.startRoom("cryo");
      // The other data-tw-text elements inside the game screen
      // (game-menu labels, closeup "Back" button, equipped-indicator
      // label) all typewriter themselves the first time they become
      // visible. So we don't pre-animate anything here — the opening
      // showMessage call below is enough on initial reveal.
      // Show an opening line so first-time players know what to do.
      // showMessage() now typewrites the text and plays the SFX.
      setTimeout(() => {
        Engine.showMessage("You awaken. The ship is on auxiliary power and locked down. What happened while you were in cryo sleep?", 6000);
      }, 700);
    }, 600);
  });

  // Allow Enter to start
  document.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && startSec.classList.contains("active")) {
      startBtn.click();
    }
  });
})();
