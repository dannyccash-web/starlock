/* ============================================================
   STARLOCK - SCIENCE LAB CARD UPGRADE TERMINAL CONTROLLER
   ------------------------------------------------------------
   Backs the "scilab_upgrade_terminal" HTML close-up.
   Close-up image: Images/closeups/Science Lab 2 Terminal.png

   LAYOUT — all coordinates are 1920×1080 stage pixels.

     DISPLAY PANEL (.ut-display-panel)
       The terminal screen area in the art.
       x=522, y=202, w=421, h=596
       Shows: header, 4-digit code entry, status, post-solve prompt.

     KEYPAD OVERLAY (.ut-key-overlay)
       3×3 invisible buttons over the physical keypad in the art.
       Grid origin: x=1115, y=290  |  total: 241×290
       Layout:
         Row 0: 1  2  3
         Row 1: 4  5  6
         Row 2: *  0  *   (left * = delete, right * = enter/submit)
       Each button is fully transparent so the printed keys show.

     CARD SLOT (.ut-card-slot)
       Invisible clickable area over the blue card slot in the art.
       x=1132, y=694, w=252, h=47
       Visible only after the code has been accepted. Player must
       equip the crew keycard and click this area to insert it.

   FLOW
     1. Player opens the closeup (wall hotspot).
     2. Player enters 4-digit code on the keypad (solution: 0743,
        found in Reyes' Log 1 on the opposite wall).
     3. On correct code → AUTHORIZATION ACCEPTED shown; flag
        upgrade_puzzle_solved set; card slot becomes active.
     4. Player equips keycard and clicks the card slot.
        → keycard consumed; keycard_upgraded added to inventory.
        → flag card_upgraded set; closeup closes.
   ============================================================ */

(function () {
  const SOLUTION  = [0, 7, 4, 3];
  const CODE_FLAG = "upgrade_puzzle_solved";
  const CARD_FLAG = "card_upgraded";

  // Accepted keycard IDs (only the original crew keycard works here)
  const KEYCARD_IDS = ["keycard"];

  // ---------- Display panel ----------
  const DISPLAY_X = 522;
  const DISPLAY_Y = 202;
  const DISPLAY_W = 421;
  const DISPLAY_H = 596;

  // ---------- Keypad grid ----------
  // 3×3 grid, 241 px wide × 290 px tall, origin at (1115, 290)
  const GRID_X  = 1115;
  const GRID_Y  = 290;
  const KEY_W   = 80;   // 241 / 3 ≈ 80 px per column
  const KEY_H   = 97;   // 290 / 3 ≈ 97 px per row
  const KEY_COLS = [GRID_X, GRID_X + 80, GRID_X + 161];
  const KEY_ROWS = [GRID_Y, GRID_Y + 97, GRID_Y + 193];

  // Row-major key layout: [label, value]
  // left * = backspace, right * = enter/submit
  const KEYS = [
    [["1",1], ["2",2], ["3",3]],
    [["4",4], ["5",5], ["6",6]],
    [["*","del"], ["0",0], ["*","enter"]],
  ];

  // ---------- Card slot ----------
  const SLOT_X = 1132;
  const SLOT_Y = 694;
  const SLOT_W = 252;
  const SLOT_H = 47;

  let input     = [];
  let statusMsg = "";   // "" | "error" | "solved"

  /* ---------- Minimal DOM helper ---------- */
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

  /* ---------- Build / refresh the display panel ---------- */
  function buildDisplay(layer, ctx) {
    const old = layer.querySelector(".ut-display-panel");
    if (old) old.remove();

    const codeSolved = ctx.hasFlag(CODE_FLAG);
    const cardDone   = ctx.hasFlag(CARD_FLAG);

    // Subtitle and body content vary by phase
    let subtitle, bodyChildren;

    if (cardDone) {
      subtitle = "UPGRADE COMPLETE";
      bodyChildren = [
        el("div", { class: "ut-status ut-status--solved" }, [
          "UPGRADE COMPLETE",
          el("div", { class: "ut-solved-sub" }, ["SENIOR CREW ACCESS GRANTED"]),
        ]),
      ];
    } else if (codeSolved || statusMsg === "solved") {
      subtitle = "AWAITING KEYCARD";
      bodyChildren = [
        el("div", { class: "ut-status ut-status--solved" }, [
          "AUTHORIZATION ACCEPTED",
        ]),
        el("p", { class: "ut-prompt" }, ["EQUIP CREW KEYCARD"]),
        el("p", { class: "ut-prompt" }, ["INSERT INTO BLUE SLOT →"]),
      ];
    } else {
      // Code-entry phase
      subtitle = "AUTHORIZATION REQUIRED";
      const digits = [];
      for (let i = 0; i < 4; i++) {
        digits.push(el("span", {
          class: "ut-digit-cell" + (i < input.length ? " ut-digit-filled" : ""),
        }, [i < input.length ? String(input[i]) : "_"]));
      }
      bodyChildren = [
        el("p", { class: "ut-prompt" }, ["ENTER 4-DIGIT AUTH CODE"]),
        el("div", { class: "ut-display" }, digits),
      ];
      if (statusMsg === "error") {
        bodyChildren.push(
          el("div", { class: "ut-status ut-status--error" }, ["INVALID CODE — ACCESS DENIED"])
        );
      }
    }

    const panel = el("div", {
      class: "ut-display-panel",
      style: {
        position:  "absolute",
        left:      DISPLAY_X + "px",
        top:       DISPLAY_Y + "px",
        width:     DISPLAY_W + "px",
        height:    DISPLAY_H + "px",
        boxSizing: "border-box",
      },
    }, [
      el("header", { class: "ct-header" }, [
        el("span", { class: "ct-title" },    ["CARD UPGRADE TERMINAL"]),
        el("span", { class: "ct-subtitle" }, [subtitle]),
      ]),
      el("div", { class: "ut-left-body" }, bodyChildren),
    ]);

    layer.appendChild(panel);
  }

  /* ---------- Build transparent keypad buttons ----------
     Buttons are invisible so the printed art shows through.
     Hidden once the code has been accepted. */
  function buildKeypad(layer, ctx) {
    const old = layer.querySelector(".ut-key-overlay");
    if (old) old.remove();

    if (ctx.hasFlag(CODE_FLAG)) return;   // keypad no longer needed

    const overlay = el("div", { class: "ut-key-overlay" });

    KEYS.forEach((row, ri) => {
      row.forEach(([label, value], ci) => {
        const ariaLabel =
          (value === "del")   ? "Delete" :
          (value === "enter") ? "Enter"  : String(label);

        const btn = el("button", {
          type:       "button",
          class:      "ut-img-key",
          "aria-label": ariaLabel,
          style: {
            position:   "absolute",
            left:       KEY_COLS[ci] + "px",
            top:        KEY_ROWS[ri] + "px",
            width:      KEY_W + "px",
            height:     KEY_H + "px",
            background: "transparent",
            border:     "none",
            cursor:     "pointer",
          },
          onclick: () => handleKey(value, layer, ctx),
        }, []);   // no visible children — fully transparent

        overlay.appendChild(btn);
      });
    });

    layer.appendChild(overlay);
  }

  /* ---------- Build card-slot interaction area ----------
     Visible only while code is solved but card not yet inserted.
     Fully transparent so the blue slot in the art is the visual cue. */
  function buildCardSlot(layer, ctx) {
    const old = layer.querySelector(".ut-card-slot");
    if (old) old.remove();

    if (!ctx.hasFlag(CODE_FLAG) || ctx.hasFlag(CARD_FLAG)) return;

    const slot = el("button", {
      type:  "button",
      class: "ut-card-slot",
      "aria-label": "Insert keycard into blue slot",
      style: {
        position:   "absolute",
        left:       SLOT_X + "px",
        top:        SLOT_Y + "px",
        width:      SLOT_W + "px",
        height:     SLOT_H + "px",
        background: "transparent",
        border:     "none",
        cursor:     "pointer",
      },
      onclick: () => handleCardInsert(layer, ctx),
    }, []);

    layer.appendChild(slot);
  }

  /* ---------- Full rebuild ---------- */
  function rebuild(layer, ctx) {
    buildDisplay(layer, ctx);
    buildKeypad(layer, ctx);
    buildCardSlot(layer, ctx);
  }

  /* ---------- Key press handler ---------- */
  function handleKey(value, layer, ctx) {
    if (statusMsg === "solved") return;

    if (value === "del") {
      if (input.length > 0) {
        input.pop();
        statusMsg = "";
        buildDisplay(layer, ctx);
      }
      return;
    }

    if (value === "enter") {
      if (input.length < 4) {
        statusMsg = "error";
        buildDisplay(layer, ctx);
        setTimeout(() => { statusMsg = ""; buildDisplay(layer, ctx); }, 900);
        return;
      }
      checkSolution(layer, ctx);
      return;
    }

    // Digit (0–9)
    if (input.length < 4) {
      input.push(value);
      statusMsg = "";
      buildDisplay(layer, ctx);
      if (input.length === 4) {
        setTimeout(() => checkSolution(layer, ctx), 200);
      }
    }
  }

  function checkSolution(layer, ctx) {
    if (isSolved()) {
      statusMsg = "solved";
      buildDisplay(layer, ctx);
      setTimeout(() => {
        ctx.setFlag(CODE_FLAG);
        ctx.showMessage(
          "Authorization code accepted. CLEARANCE GRANTED. " +
          "Equip your crew keycard and insert it into the blue slot."
        );
        // Keep closeup open — player must now insert the keycard
        rebuild(layer, ctx);
      }, 1400);
    } else {
      statusMsg = "error";
      buildDisplay(layer, ctx);
      input = [];
      setTimeout(() => {
        statusMsg = "";
        buildDisplay(layer, ctx);
      }, 900);
    }
  }

  /* ---------- Card insertion handler ---------- */
  function handleCardInsert(layer, ctx) {
    const eq = Inventory.getEquipped();
    if (!eq || !KEYCARD_IDS.includes(eq)) {
      ctx.showMessage(
        "The terminal is armed. Equip your crew keycard, then click the blue slot to insert it."
      );
      return;
    }

    // Play keycard swipe SFX
    if (typeof GameAudio !== "undefined") GameAudio.playKeycardSwipe();

    // Consume original keycard, award upgraded one
    Inventory.removeItem(eq);
    Inventory.addItem("keycard_upgraded");
    if (ctx.showPickupNotification) ctx.showPickupNotification("keycard_upgraded");
    ctx.setFlag(CARD_FLAG);
    ctx.showMessage(
      "Card accepted. CLEARANCE UPGRADED: SENIOR CREW. " +
      "The card ejects, its stripe rewritten."
    );

    // Refresh display to show completion state
    buildDisplay(layer, ctx);
    buildCardSlot(layer, ctx);   // removes the slot (card_upgraded now set)

    // Auto-close after a moment
    setTimeout(() => {
      ctx.closeCloseup();
      ctx.renderActive();
    }, 2200);
  }

  /* ---------- Mount / unmount ---------- */
  function mount(layer, ctx) {
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
