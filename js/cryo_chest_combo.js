/* ============================================================
   STARLOCK - CRYO CHEST COMBINATION LOCK CONTROLLER
   ------------------------------------------------------------
   Backs the "cryo_chest_combo" HTML close-up.
   Close-up image: Images/closeups/Cryo Room 4 Chest Closeup.png

   UI: Three digit buttons positioned directly over the lock
   dials visible in the background image. No panel, no border —
   the digits feel like part of the lock itself.

   Starting combination: 9 - 7 - 2
   Solution:            0 - 0 - 3

   DIGIT POSITIONING
   Coordinates are in the 1920×1080 stage space, tuned to match
   the three lock digits visible in the background art. Press D
   in-game to enable the debug overlay, then adjust DIGIT_LEFT
   and DIGIT_TOP here to align with the image.

   On solve:
     1. Sets chest4_003_opened (chest sprite swaps to open).
     2. Adds metal_shears to inventory.
     3. Returns to Wall 4.
     4. Shows a pickup notification + scene message.
   ============================================================ */

(function () {
  const SOLUTION  = [0, 0, 3];
  const START     = [9, 7, 2];
  const ITEM_ID   = "metal_shears";
  const FLAG      = "chest4_003_opened";
  const SOLVED_MSG =
    "The lock clicks open. Inside, wedged under a folded emergency kit, " +
    "you find a pair of heavy metal shears.";

  // Digit layout — adjust these to match the art.
  // Each entry is the left edge of the digit button in stage px.
  const DIGIT_LEFT = [835, 905, 975];
  const DIGIT_TOP  = 390;   // top edge, same for all three
  const DIGIT_W    = 65;    // width of each clickable digit area
  const DIGIT_H    = 95;    // height of each clickable digit area

  let digits = [...START];

  /* ---- DOM helper ---- */
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

  /* ---- Build the three digit buttons ---- */
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
        "aria-label": `Digit ${i + 1}, currently ${d}. Click to advance.`,
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
    // Flash UNLOCKED at the lock position, then return to the wall.
    layer.innerHTML = "";
    const flash = el("div", {
      class: "combo-solved-flash",
      style: {
        position: "absolute",
        left:   DIGIT_LEFT[0] + "px",
        top:    (DIGIT_TOP - 8) + "px",
        width:  (DIGIT_LEFT[2] + DIGIT_W - DIGIT_LEFT[0]) + "px",
        height: (DIGIT_H + 16) + "px",
      },
    }, [
      el("span", { class: "combo-solved-text" }, ["OPEN"]),
    ]);
    layer.appendChild(flash);

    setTimeout(() => {
      ctx.setFlag(FLAG);
      Inventory.addItem(ITEM_ID);
      ctx.closeCloseup();
      ctx.renderActive();
      Engine.showPickupNotification(ITEM_ID);
      ctx.showMessage(SOLVED_MSG);
    }, 700);
  }

  /* ---- Mount / unmount ---- */
  function mount(layer, ctx) {
    if (ctx.hasFlag(FLAG)) { ctx.closeCloseup(); return; }
    buildLock(layer, ctx);
  }

  function unmount() {
    digits = [...START];
  }

  Engine.registerCloseupController("cryo_chest_combo", { mount, unmount });
})();
