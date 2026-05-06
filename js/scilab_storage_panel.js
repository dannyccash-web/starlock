/* ============================================================
   STARLOCK - SCIENCE LAB SPECIMEN STORAGE PANEL CONTROLLER
   ------------------------------------------------------------
   Backs the "scilab_storage_panel" HTML close-up.
   Close-up image: Images/closeups/Science Lab 3 Terminal.png
   — close-up of the batch code entry panel on the specimen
   storage unit in the science lab.

   UI: Three digit dials. Each shows the current digit; clicking
   advances it. Matching the solution auto-triggers the unlock.

   Starting combination: 5 - 2 - 8
   Solution:             3 - 7 - 1
   (Batch reference number found in Vance's workbench notes.)

   DIGIT POSITIONING
   Coordinates are in the 1920×1080 stage space. Press D in-game
   to enable the debug overlay, then adjust DIGIT_LEFT and
   DIGIT_TOP here to match the three dial positions in the art.

   On solve:
     1. Sets flag: specimen_storage_unlocked
     2. Closes the close-up
     3. Shows a scene message
   ============================================================ */

(function () {
  const SOLUTION   = [3, 7, 1];
  const START      = [5, 2, 8];
  const FLAG       = "specimen_storage_unlocked";
  const SOLVED_MSG =
    "The storage unit releases with a hiss of cold air. The three specimen " +
    "containers are now accessible.";

  // Digit layout — adjust to match the panel art.
  // NOTE: These are placeholder positions. Press D in-game and
  //       adjust to align with the three dials in the closeup image.
  const DIGIT_LEFT = [780, 918, 1056];
  const DIGIT_TOP  = 420;
  const DIGIT_W    = 110;
  const DIGIT_H    = 130;

  let digits = [...START];

  /* ---------- DOM helper ---------- */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === "class") node.className = attrs[k];
        else if (k === "style" && typeof attrs[k] === "object") {
          Object.assign(node.style, attrs[k]);
        } else if (k.startsWith("on") && typeof attrs[k] === "function") {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (attrs[k] === true) node.setAttribute(k, "");
        else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k]);
      }
    }
    (children || []).forEach((c) => {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function isSolved() {
    return digits.every((d, i) => d === SOLUTION[i]);
  }

  /* ---------- Build the three digit dials ---------- */
  function buildLock(layer, ctx) {
    layer.innerHTML = "";

    digits.forEach((d, i) => {
      const btn = el("button", {
        type: "button",
        class: "combo-digit",
        style: {
          position: "absolute",
          left:   DIGIT_LEFT[i] + "px",
          top:    DIGIT_TOP + "px",
          width:  DIGIT_W + "px",
          height: DIGIT_H + "px",
        },
        "aria-label": `Dial ${i + 1}, currently ${d}. Click to advance.`,
        onclick: () => {
          digits[i] = (digits[i] + 1) % 10;
          buildLock(layer, ctx);
          if (isSolved()) setTimeout(() => handleSolve(layer, ctx), 120);
        },
      }, [String(d)]);
      layer.appendChild(btn);
    });
  }

  function handleSolve(layer, ctx) {
    layer.innerHTML = "";
    const flash = el("div", {
      class: "combo-solved-flash",
      style: {
        position: "absolute",
        left:   DIGIT_LEFT[0] + "px",
        top:    (DIGIT_TOP - 10) + "px",
        width:  (DIGIT_LEFT[2] + DIGIT_W - DIGIT_LEFT[0]) + "px",
        height: (DIGIT_H + 20) + "px",
      },
    }, [
      el("span", { class: "combo-solved-text" }, ["OPEN"]),
    ]);
    layer.appendChild(flash);

    setTimeout(() => {
      ctx.setFlag(FLAG);
      ctx.closeCloseup();
      ctx.renderActive();
      ctx.showMessage(SOLVED_MSG);
    }, 700);
  }

  /* ---------- Mount / unmount ---------- */
  function mount(layer, ctx) {
    if (ctx.hasFlag(FLAG)) { ctx.closeCloseup(); return; }
    buildLock(layer, ctx);
  }

  function unmount() {
    digits = [...START];
  }

  Engine.registerCloseupController("scilab_storage_panel", { mount, unmount });
})();
