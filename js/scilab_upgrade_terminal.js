/* ============================================================
   STARLOCK - SCIENCE LAB CARD UPGRADE TERMINAL CONTROLLER
   ------------------------------------------------------------
   Backs the "scilab_upgrade_terminal" HTML close-up.
   Close-up image: Images/closeups/Science Lab 2 Terminal.png
   — close-up of the card upgrade terminal beside the bridge door.

   UI: A 4-digit authorization code entry panel with a number pad.
   The code is embedded in Reyes' Log 1 (mission auth: 0743).

   SOLUTION: 0 7 4 3

   On solve:
     1. Sets flag: upgrade_puzzle_solved
     2. Closes the close-up
     3. Shows a scene message
   The wall hotspot (scilab_upgrade_terminal_ready) then handles
   the keycard insertion step separately.

   If the player has already solved this, mount() immediately
   closes the close-up (the wall state changes to show the
   keycard slot instead).
   ============================================================ */

(function () {
  const SOLUTION   = [0, 7, 4, 3];
  const FLAG       = "upgrade_puzzle_solved";
  const SOLVED_MSG =
    "Authorization code accepted. CLEARANCE GRANTED. Insert crew keycard to proceed with upgrade.";

  let input = [];       // current digit string, max 4 digits
  let shakeTimer = null;

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
    return input.length === 4 && input.every((d, i) => d === SOLUTION[i]);
  }

  /* ---------- Build the terminal UI ---------- */
  function buildTerminal(layer, ctx) {
    layer.innerHTML = "";

    const displayDigits = [];
    for (let i = 0; i < 4; i++) {
      displayDigits.push(
        el("span", {
          class: "ut-digit-cell" + (i < input.length ? " ut-digit-filled" : ""),
        }, [i < input.length ? String(input[i]) : "_"])
      );
    }

    const display = el("div", { class: "ut-display" }, displayDigits);

    // Number pad: 1 2 3 / 4 5 6 / 7 8 9 / ← 0 ✓
    const padKeys = [
      { label: "1", value: 1 },
      { label: "2", value: 2 },
      { label: "3", value: 3 },
      { label: "4", value: 4 },
      { label: "5", value: 5 },
      { label: "6", value: 6 },
      { label: "7", value: 7 },
      { label: "8", value: 8 },
      { label: "9", value: 9 },
      { label: "⌫", value: "del" },
      { label: "0", value: 0 },
      { label: "ENT", value: "enter" },
    ];

    const padBtns = padKeys.map((k) => {
      let cls = "ut-key";
      if (k.value === "del")   cls += " ut-key-del";
      if (k.value === "enter") cls += " ut-key-enter";

      return el("button", {
        type: "button",
        class: cls,
        "aria-label": k.value === "del" ? "Delete" : k.value === "enter" ? "Enter" : String(k.label),
        onclick: () => handleKey(k.value, layer, ctx),
      }, [k.label]);
    });

    const pad = el("div", { class: "ut-numpad" }, padBtns);

    const panel = el("div", { class: "ut-panel" }, [
      el("header", { class: "ct-header" }, [
        el("span", { class: "ct-title" }, ["CARD UPGRADE TERMINAL"]),
        el("span", { class: "ct-subtitle" }, ["AUTHORIZATION REQUIRED"]),
      ]),
      el("div", { class: "ut-body" }, [
        el("p", { class: "ut-prompt" }, ["ENTER 4-DIGIT AUTH CODE"]),
        display,
        pad,
      ]),
    ]);

    layer.appendChild(panel);
  }

  function handleKey(value, layer, ctx) {
    if (value === "del") {
      if (input.length > 0) input.pop();
      buildTerminal(layer, ctx);
      return;
    }
    if (value === "enter") {
      if (input.length < 4) {
        triggerError(layer, ctx, "INCOMPLETE CODE");
        return;
      }
      if (isSolved()) {
        handleSolve(layer, ctx);
      } else {
        triggerError(layer, ctx, "INVALID CODE — ACCESS DENIED");
        input = [];
        setTimeout(() => buildTerminal(layer, ctx), 900);
      }
      return;
    }
    // Digit input
    if (input.length < 4) {
      input.push(value);
      buildTerminal(layer, ctx);
      // Auto-submit when 4 digits entered
      if (input.length === 4) {
        setTimeout(() => {
          if (isSolved()) {
            handleSolve(layer, ctx);
          } else {
            triggerError(layer, ctx, "INVALID CODE — ACCESS DENIED");
            input = [];
            setTimeout(() => buildTerminal(layer, ctx), 900);
          }
        }, 200);
      }
    }
  }

  function triggerError(layer, ctx, msg) {
    layer.innerHTML = "";
    const flash = el("div", { class: "ut-panel ut-error-flash" }, [
      el("div", { class: "ct-header" }, [
        el("span", { class: "ct-title" }, ["CARD UPGRADE TERMINAL"]),
      ]),
      el("div", { class: "ut-error-msg" }, [msg]),
    ]);
    layer.appendChild(flash);
  }

  function handleSolve(layer, ctx) {
    layer.innerHTML = "";
    const flash = el("div", { class: "ut-panel ut-solved-flash" }, [
      el("div", { class: "ct-header" }, [
        el("span", { class: "ct-title" }, ["CARD UPGRADE TERMINAL"]),
      ]),
      el("div", { class: "ut-solved-msg" }, ["AUTHORIZATION ACCEPTED"]),
      el("div", { class: "ut-solved-sub" }, ["INSERT CREW KEYCARD TO PROCEED"]),
    ]);
    layer.appendChild(flash);

    setTimeout(() => {
      ctx.setFlag(FLAG);
      ctx.showMessage(SOLVED_MSG);
      ctx.closeCloseup();
      ctx.renderActive();
    }, 1200);
  }

  /* ---------- Mount / unmount ---------- */
  function mount(layer, ctx) {
    if (ctx.hasFlag(FLAG)) {
      ctx.closeCloseup();
      return;
    }
    input = [];
    buildTerminal(layer, ctx);
  }

  function unmount() {
    input = [];
    if (shakeTimer) clearTimeout(shakeTimer);
  }

  Engine.registerCloseupController("scilab_upgrade_terminal", { mount, unmount });
})();
