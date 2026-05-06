/* ============================================================
   STARLOCK - SCIENCE LAB CARD UPGRADE TERMINAL CONTROLLER
   ------------------------------------------------------------
   Backs the "scilab_upgrade_terminal" HTML close-up.
   Close-up image: Images/closeups/Science Lab 2 Terminal.png
   — close-up of the card upgrade terminal beside the bridge door.

   LAYOUT
   Two independent layers mounted into #closeup-html:

     1. LEFT PANEL (.ut-left-panel)
        Spans from the left edge to the left of the physical keypad.
        Shows the terminal header, code display, status messages,
        and any error/solved feedback. This is the "screen" portion
        of the terminal visible in the image.

     2. KEYPAD OVERLAY (.ut-key-overlay)
        Transparent buttons positioned absolutely over the physical
        keypad printed on the terminal face in the closeup art.
        Pressing a key triggers number input; the display updates
        instantly in the left panel.

   KEYPAD POSITIONS
   Adjust KEY_COLS, KEY_ROWS, KEY_W, KEY_H to match the actual
   pixel positions of the keys in the closeup image. Press D in-game
   to see the debug overlay and fine-tune. Standard 3×4 numpad layout:
     Row 0: 7 8 9
     Row 1: 4 5 6
     Row 2: 1 2 3
     Row 3: ⌫ 0 ENT

   SOLUTION: 0 7 4 3  (Reyes' mission auth code, found in Log 1)

   On solve:
     1. Shows AUTHORIZATION ACCEPTED in the left panel
     2. Sets flag: upgrade_puzzle_solved
     3. Closes the close-up after a brief pause
   The wall hotspot (scilab_upgrade_terminal_ready) handles the
   keycard insertion step separately.
   ============================================================ */

(function () {
  const SOLUTION   = [0, 7, 4, 3];
  const FLAG       = "upgrade_puzzle_solved";
  const SOLVED_MSG =
    "Authorization code accepted. CLEARANCE GRANTED. " +
    "Insert crew keycard to proceed with upgrade.";

  // ---------- Keypad layout ----------
  // Left edges for the 3 columns and top edges for the 4 rows.
  // These are in 1920×1080 stage coordinates.
  // NOTE: Tune to match the physical keypad in the closeup image.
  const KEY_COLS = [1295, 1465, 1635];  // x-left of each column
  const KEY_ROWS = [265,  435,  605, 775];  // y-top of each row
  const KEY_W    = 155;    // width of each key button
  const KEY_H    = 145;    // height of each key button

  // Numpad layout: row × col → { label, value }
  const KEYS = [
    ["7","8","9"],
    ["4","5","6"],
    ["1","2","3"],
    ["⌫","0","ENT"],
  ];

  // Left panel occupies the left portion of the screen
  // (from left edge to the left of the keypad area).
  const PANEL_LEFT   = 60;
  const PANEL_TOP    = 160;
  const PANEL_WIDTH  = KEY_COLS[0] - PANEL_LEFT - 30;  // stops just left of keypad
  const PANEL_HEIGHT = 760;

  let input     = [];
  let statusMsg = "";   // "error" | "solved" | ""

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
    return input.length === 4 && input.every((d, i) => Number(d) === SOLUTION[i]);
  }

  /* ---------- Build the left information panel ---------- */
  function buildLeftPanel(layer, ctx) {
    // Remove old panel if present
    const old = layer.querySelector(".ut-left-panel");
    if (old) old.remove();

    const displayDigits = [];
    for (let i = 0; i < 4; i++) {
      displayDigits.push(
        el("span", {
          class: "ut-digit-cell" + (i < input.length ? " ut-digit-filled" : ""),
        }, [i < input.length ? String(input[i]) : "_"])
      );
    }

    let statusEl = null;
    if (statusMsg === "error") {
      statusEl = el("div", { class: "ut-status ut-status--error" }, [
        "INVALID CODE — ACCESS DENIED",
      ]);
    } else if (statusMsg === "solved") {
      statusEl = el("div", { class: "ut-status ut-status--solved" }, [
        "AUTHORIZATION ACCEPTED",
        el("div", { class: "ut-solved-sub" }, ["INSERT CREW KEYCARD TO PROCEED"]),
      ]);
    }

    const panel = el("div", {
      class: "ut-left-panel",
      style: {
        position: "absolute",
        left:   PANEL_LEFT + "px",
        top:    PANEL_TOP + "px",
        width:  PANEL_WIDTH + "px",
        height: PANEL_HEIGHT + "px",
      },
    }, [
      el("header", { class: "ct-header" }, [
        el("span", { class: "ct-title" }, ["CARD UPGRADE TERMINAL"]),
        el("span", { class: "ct-subtitle" }, ["AUTHORIZATION REQUIRED"]),
      ]),
      el("div", { class: "ut-left-body" }, [
        el("p", { class: "ut-prompt" }, ["ENTER 4-DIGIT AUTH CODE"]),
        el("div", { class: "ut-display" }, displayDigits),
        statusEl,
      ]),
    ]);

    layer.appendChild(panel);
  }

  /* ---------- Build the transparent keypad overlay ----------
     Each button is positioned over the corresponding physical key
     in the closeup image. Transparent background so the art shows. */
  function buildKeypadOverlay(layer, ctx) {
    const old = layer.querySelector(".ut-key-overlay");
    if (old) old.remove();

    const overlay = el("div", { class: "ut-key-overlay" });

    KEYS.forEach((row, ri) => {
      row.forEach((label, ci) => {
        const value = label === "⌫" ? "del" : label === "ENT" ? "enter" : Number(label);
        let cls = "ut-img-key";
        if (label === "⌫")  cls += " ut-img-key--del";
        if (label === "ENT") cls += " ut-img-key--enter";

        const btn = el("button", {
          type: "button",
          class: cls,
          "aria-label": label === "⌫" ? "Delete" : label === "ENT" ? "Enter" : label,
          style: {
            position: "absolute",
            left:   KEY_COLS[ci] + "px",
            top:    KEY_ROWS[ri] + "px",
            width:  KEY_W + "px",
            height: KEY_H + "px",
          },
          onclick: () => handleKey(value, layer, ctx),
        }, [label]);

        overlay.appendChild(btn);
      });
    });

    layer.appendChild(overlay);
  }

  /* ---------- Rebuild both layers ---------- */
  function rebuild(layer, ctx) {
    buildLeftPanel(layer, ctx);
    buildKeypadOverlay(layer, ctx);
  }

  /* ---------- Key handler ---------- */
  function handleKey(value, layer, ctx) {
    if (statusMsg === "solved") return;   // already done

    if (value === "del") {
      if (input.length > 0) {
        input.pop();
        statusMsg = "";
        buildLeftPanel(layer, ctx);
      }
      return;
    }

    if (value === "enter") {
      if (input.length < 4) {
        statusMsg = "error";
        buildLeftPanel(layer, ctx);
        setTimeout(() => { statusMsg = ""; buildLeftPanel(layer, ctx); }, 900);
        return;
      }
      checkSolution(layer, ctx);
      return;
    }

    // Digit
    if (input.length < 4) {
      input.push(value);
      statusMsg = "";
      buildLeftPanel(layer, ctx);
      if (input.length === 4) {
        setTimeout(() => checkSolution(layer, ctx), 200);
      }
    }
  }

  function checkSolution(layer, ctx) {
    if (isSolved()) {
      statusMsg = "solved";
      buildLeftPanel(layer, ctx);
      setTimeout(() => {
        ctx.setFlag(FLAG);
        ctx.showMessage(SOLVED_MSG);
        ctx.closeCloseup();
        ctx.renderActive();
      }, 1400);
    } else {
      statusMsg = "error";
      buildLeftPanel(layer, ctx);
      input = [];
      setTimeout(() => {
        statusMsg = "";
        buildLeftPanel(layer, ctx);
      }, 900);
    }
  }

  /* ---------- Mount / unmount ---------- */
  function mount(layer, ctx) {
    if (ctx.hasFlag(FLAG)) { ctx.closeCloseup(); return; }
    input     = [];
    statusMsg = "";
    layer.innerHTML = "";
    rebuild(layer, ctx);
  }

  function unmount() {
    input     = [];
    statusMsg = "";
  }

  Engine.registerCloseupController("scilab_upgrade_terminal", { mount, unmount });
})();
