/* ============================================================
   STARLOCK - BOOT
   - Scales the 1920x1080 stage to fit the viewport
   - Wires the START / NEW GAME button to fade into the cryo room
   - Wires the CONTINUE button to restore a saved game
   - Typewriter-animates the start-screen labels and opening message
   - Boots the looping background soundtrack on first user click
   ============================================================ */

(function () {
  const startSec    = document.getElementById("start-screen");
  const gameSec     = document.getElementById("game-screen");
  const startBtn    = document.getElementById("start-button");
  const continueBtn = document.getElementById("continue-button");

  // Scale stage to fit window while preserving 16:9 aspect.
  function fitStage() {
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    const scale = Math.min(sw / 1920, sh / 1080);
    document.documentElement.style.setProperty("--scale", scale.toString());
  }
  window.addEventListener("resize", fitStage);
  fitStage();

  /* ---------- Save-state awareness ----------
     On load, check for an existing save and update the start screen
     so CONTINUE is the prominent action and START becomes secondary. */
  const hasSave = SaveManager.hasSave();
  if (hasSave) {
    startBtn.dataset.twText = "NEW GAME";
    startBtn.textContent    = "NEW GAME";
    startBtn.classList.add("start-btn--secondary");
    continueBtn.classList.remove("hidden");
  }

  /* ---------- Typewriter the start-screen labels ---------- */
  setTimeout(() => {
    const txt = startBtn.dataset.twText || startBtn.textContent;
    Typewriter.typeOnce(startBtn, txt, { speed: 80 });
    if (hasSave) {
      const cTxt = continueBtn.dataset.twText || continueBtn.textContent;
      Typewriter.typeOnce(continueBtn, cTxt, { speed: 60 });
    }
  }, 250);

  /* ---------- Shared transition helper ---------- */
  function fadeToGame(afterFade) {
    startSec.style.transition = "opacity 600ms ease";
    startSec.style.opacity = "0";
    setTimeout(() => {
      startSec.classList.remove("active");
      gameSec.classList.add("active");
      gameSec.style.opacity = "0";
      gameSec.style.transition = "opacity 600ms ease";
      void gameSec.offsetWidth;
      gameSec.style.opacity = "1";
      if (afterFade) afterFade();
    }, 600);
  }

  /* ---------- START / NEW GAME ---------- */
  startBtn.addEventListener("click", () => {
    GameAudio.startSoundtrack();

    if (hasSave) {
      const ok = window.confirm(
        "Start a new game?\n\nYour current saved progress will be erased."
      );
      if (!ok) return;
      SaveManager.clear();
    }

    fadeToGame(() => {
      Engine.startRoom("cryo");
      setTimeout(() => {
        Engine.showMessage(
          "You awaken. The ship is on auxiliary power and locked down. " +
          "What happened while you were in cryo sleep?",
          6000
        );
      }, 700);
    });
  });

  /* ---------- CONTINUE ---------- */
  continueBtn.addEventListener("click", () => {
    GameAudio.startSoundtrack();
    fadeToGame(() => {
      SaveManager.restore();
      setTimeout(() => Engine.showMessage("Welcome back.", 2500), 400);
    });
  });

  /* ---------- Keyboard shortcut: Enter / Space ----------
     Triggers the primary button — CONTINUE when a save exists. */
  document.addEventListener("keydown", (e) => {
    if (!(e.key === "Enter" || e.key === " ")) return;
    if (!startSec.classList.contains("active")) return;
    if (hasSave) continueBtn.click();
    else         startBtn.click();
  });
})();
