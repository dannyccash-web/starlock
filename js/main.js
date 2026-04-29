/* ============================================================
   STARLOCK - BOOT
   - Scales the 1920x1080 stage to fit the viewport
   - Wires the START button to fade into the cryo room
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

  // START -> game
  startBtn.addEventListener("click", () => {
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
      // Show an opening line so first-time players know what to do.
      setTimeout(() => {
        Engine.showMessage("You wake up. Emergency lighting only. Look around.", 5000);
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
