/* ============================================================
   STARLOCK - CRYO CHEST COMBINATION LOCK CONTROLLER
   ------------------------------------------------------------
   Backs the "cryo_chest_combo" HTML close-up.
   Close-up image: Images/closeups/Cryo Room 4 Chest Closeup.png

   UI: A 3-digit wheel combination lock overlaid on the chest
   image. Each digit is a clickable button that cycles 0→9→0.
   Starting combination: 9 - 7 - 2
   Solution:            0 - 0 - 3

   On solve:
     1. Sets the chest4_003_opened flag (chest sprite swaps
        to open on the wall view).
     2. Adds metal_shears to the player's inventory.
     3. Closes the close-up (returns to Wall 4).
     4. Shows a notification message.

   View state (current digits) resets each time the close-up
   is unmounted so repeat visits always start at 9-7-2.
   ============================================================ */

(function () {
  const SOLUTION  = [0, 0, 3];
  const START     = [9, 7, 2];
  const ITEM_ID   = "metal_shears";
  const FLAG      = "chest4_003_opened";
  const SOLVED_MSG =
    "The lock clicks open. Inside, wedged under a folded emergency kit, " +
    "you find a pair of heavy metal shears.";

  // Module-scope digit state — reset on unmount.
  let digits = [...START];

  /* ---- DOM helper (same pattern as cryo_terminal.js) ---- */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === "class") node.className = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
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

  /* ---- Check whether the current digits match the solution ---- */
  function isSolved() {
    return digits.every((d, i) => d === SOLUTION[i]);
  }

  /* ---- Build the combination lock UI ---- */
  function buildLock(layer, ctx) {
    layer.innerHTML = "";

    // Outer wrapper — covers the image and centres the lock panel.
    const wrapper = el("div", {
      class: "combo-lock-wrapper",
    }, [
      el("div", { class: "combo-lock-panel" }, [
        el("div", { class: "combo-lock-label" }, ["COMBINATION LOCK"]),
        el("div", { class: "combo-lock-digits" },
          digits.map((d, i) => buildDigitBtn(d, i, layer, ctx))
        ),
        el("div", { class: "combo-lock-hint" }, ["Click a digit to advance it"]),
      ]),
    ]);

    layer.appendChild(wrapper);
  }

  function buildDigitBtn(digit, index, layer, ctx) {
    return el("button", {
      type: "button",
      class: "combo-digit",
      "aria-label": `Digit ${index + 1}, currently ${digit}`,
      onclick: () => {
        digits[index] = (digits[index] + 1) % 10;
        // Re-render the lock after each click.
        buildLock(layer, ctx);
        // Check for solution after the DOM settles.
        if (isSolved()) {
          setTimeout(() => handleSolve(layer, ctx), 120);
        }
      },
    }, [String(digit)]);
  }

  function handleSolve(layer, ctx) {
    // Show a brief "UNLOCKED" state before closing.
    layer.innerHTML = "";
    const flash = el("div", { class: "combo-lock-wrapper" }, [
      el("div", { class: "combo-lock-panel combo-lock-solved" }, [
        el("div", { class: "combo-lock-solved-text" }, ["UNLOCKED"]),
      ]),
    ]);
    layer.appendChild(flash);

    setTimeout(() => {
      // Grant item and set state.
      ctx.setFlag(FLAG);
      Inventory.addItem(ITEM_ID);
      // Return to the wall view with the chest now open.
      ctx.closeCloseup();
      ctx.renderActive();
      ctx.showMessage(SOLVED_MSG);
    }, 700);
  }

  /* ---- Mount / unmount ---- */
  function mount(layer, ctx) {
    if (ctx.hasFlag(FLAG)) {
      // Already solved — close immediately (shouldn't normally be
      // reachable since the hotspot hides when the flag is set).
      ctx.closeCloseup();
      return;
    }
    buildLock(layer, ctx);
  }

  function unmount() {
    // Reset digits so every fresh visit starts at 9-7-2.
    digits = [...START];
  }

  Engine.registerCloseupController("cryo_chest_combo", { mount, unmount });
})();
