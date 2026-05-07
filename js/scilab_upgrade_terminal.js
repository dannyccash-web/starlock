/* ============================================================
   STARLOCK - SCIENCE LAB CARD UPGRADE TERMINAL CONTROLLER
   ------------------------------------------------------------
   Backs the "scilab_upgrade_terminal" HTML close-up.
   Close-up image: Images/closeups/Science Lab 2 Terminal.png

   THREE-PHASE UPGRADE FLOW
   ─────────────────────────────────────────────────────────────
   Phase 0  (no flags)
     Display: "INSERT SECURITY CARD"
     Card slot (blue slot in art, x=1132 y=694 252×47) is active.
     Player must EQUIP the crew keycard then click the slot.
     → keycard removed from inventory; flag card_in_terminal set.

   Phase 1  (card_in_terminal, code input not yet activated)
     Display: science officer card detected + UPGRADE button.
     Clicking UPGRADE enters Phase 2 (in-memory only, not a flag).

   Phase 2  (card_in_terminal, code input active)
     Display: 4-digit entry keypad.
     Correct code 0743 → keycard_upgraded added to inventory;
     flag card_upgraded set; closeup closes.
     Wrong code → error flash, digits clear, try again.

   Phase 3  (card_upgraded)
     Wall hotspot shows "Upgrade complete. The terminal is idle."
     The closeup is never opened in this state.

   COORDINATES  (1920×1080 stage pixels)
     Display panel : x=522  y=202  w=421  h=596
     Keypad grid   : x=1115 y=290  241×290  (3×4, invisible buttons)
       Columns : 1115, 1196, 1276   Key w=80
       Rows    : 290,  362,  434,  506   Key h=72
       Layout  : 1 2 3 / 4 5 6 / 7 8 9 / * 0 del
       Left  * = noop,  Right del = delete last digit
     Card slot     : x=1132 y=694  w=252  h=47
   ============================================================ */

(function () {
  const SOLUTION        = [0, 7, 4, 3];
  const CARD_IN_FLAG    = "card_in_terminal";
  const CARD_DONE_FLAG  = "card_upgraded";
  const KEYCARD_IDS     = ["keycard"];   // only original crew keycard

  /* ── Display panel ── */
  const DISPLAY_X = 522,  DISPLAY_Y = 202,
        DISPLAY_W = 421,  DISPLAY_H = 596;

  /* ── Keypad grid ── */
  const GRID_X = 1115, GRID_Y = 290,
        KEY_W  = 80,   KEY_H  = 72;
  const KEY_COLS = [GRID_X,        GRID_X + 80,  GRID_X + 161];
  const KEY_ROWS = [GRID_Y,        GRID_Y + 72,  GRID_Y + 144, GRID_Y + 216];
  const KEYS = [
    [["1",1],      ["2",2], ["3",3]],
    [["4",4],      ["5",5], ["6",6]],
    [["7",7],      ["8",8], ["9",9]],
    [["*","noop"], ["0",0], ["del","del"]],
  ];

  /* ── Card slot ── */
  const SLOT_X = 1132, SLOT_Y = 694,
        SLOT_W = 252,  SLOT_H = 47;

  /* ── In-memory phase state (reset on unmount) ── */
  let codeInputActive = false;   // Phase 1 → Phase 2 transition
  let input           = [];
  let statusMsg       = "";      // "" | "error"

  /* ── Minimal DOM helper ── */
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

  /* ── Build / refresh the display panel ── */
  function buildDisplay(layer, ctx) {
    const old = layer.querySelector(".ut-display-panel");
    if (old) old.remove();

    const cardIn   = ctx.hasFlag(CARD_IN_FLAG);
    const cardDone = ctx.hasFlag(CARD_DONE_FLAG);

    let subtitle, bodyChildren;

    if (cardDone) {
      /* Phase 3 — shouldn't really reach here via normal gameplay */
      subtitle = "UPGRADE COMPLETE";
      bodyChildren = [
        el("div", { class: "ut-status ut-status--solved" }, [
          "UPGRADE COMPLETE",
          el("div", { class: "ut-solved-sub" }, ["SENIOR CREW ACCESS GRANTED"]),
        ]),
      ];

    } else if (cardIn && codeInputActive) {
      /* Phase 2 — code entry */
      subtitle = "ENTER AUTHORIZATION CODE";
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

    } else if (cardIn) {
      /* Phase 1 — card detected, awaiting UPGRADE click */
      subtitle = "CARD DETECTED";
      bodyChildren = [
        el("div", { class: "ut-card-detected" }, [
          el("div", { class: "ut-card-label" }, ["SCIENCE OFFICER KEYCARD"]),
          el("div", { class: "ut-card-clearance" }, ["CLEARANCE LEVEL: CREW"]),
        ]),
        el("button", {
          type: "button",
          class: "ut-upgrade-btn",
          onclick: () => {
            codeInputActive = true;
            buildDisplay(layer, ctx);
            buildKeypad(layer, ctx);
            buildCardSlot(layer, ctx);
          },
        }, ["UPGRADE"]),
      ];

    } else {
      /* Phase 0 — awaiting card */
      subtitle = "AWAITING CARD";
      bodyChildren = [
        el("p", { class: "ut-prompt" }, ["INSERT SECURITY CARD"]),
        el("p", { class: "ut-prompt-hint" }, [
          "Equip your security card, then insert it into the blue slot →"
        ]),
      ];
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

  /* ── Build transparent keypad (Phase 2 only) ── */
  function buildKeypad(layer, ctx) {
    const old = layer.querySelector(".ut-key-overlay");
    if (old) old.remove();

    if (!ctx.hasFlag(CARD_IN_FLAG) || !codeInputActive) return;

    const overlay = el("div", { class: "ut-key-overlay" });
    KEYS.forEach((row, ri) => {
      row.forEach(([label, value], ci) => {
        const ariaLabel =
          value === "del"  ? "Delete" :
          value === "noop" ? ""       : String(label);
        overlay.appendChild(el("button", {
          type: "button", class: "ut-img-key", "aria-label": ariaLabel,
          style: {
            position: "absolute",
            left:     KEY_COLS[ci] + "px",
            top:      KEY_ROWS[ri] + "px",
            width:    KEY_W + "px",
            height:   KEY_H + "px",
            background: "transparent", border: "none", cursor: "pointer",
          },
          onclick: () => handleKey(value, layer, ctx),
        }, []));
      });
    });
    layer.appendChild(overlay);
  }

  /* ── Build card slot (Phase 0 only) ── */
  function buildCardSlot(layer, ctx) {
    const old = layer.querySelector(".ut-card-slot");
    if (old) old.remove();

    if (ctx.hasFlag(CARD_IN_FLAG) || ctx.hasFlag(CARD_DONE_FLAG)) return;

    layer.appendChild(el("button", {
      type: "button", class: "ut-card-slot",
      "aria-label": "Insert security card into terminal",
      style: {
        position: "absolute",
        left: SLOT_X + "px", top: SLOT_Y + "px",
        width: SLOT_W + "px", height: SLOT_H + "px",
        background: "transparent", border: "none", cursor: "pointer",
      },
      onclick: () => handleCardInsert(layer, ctx),
    }, []));
  }

  /* ── Full rebuild ── */
  function rebuild(layer, ctx) {
    buildDisplay(layer, ctx);
    buildKeypad(layer, ctx);
    buildCardSlot(layer, ctx);
  }

  /* ── Card insertion handler (Phase 0 → Phase 1) ── */
  function handleCardInsert(layer, ctx) {
    const eq = Inventory.getEquipped();
    if (!eq || !KEYCARD_IDS.includes(eq)) {
      ctx.showMessage(
        "The terminal is waiting for a security card. Equip your keycard and click the blue slot."
      );
      return;
    }
    if (typeof GameAudio !== "undefined") GameAudio.playKeycardSwipe();
    Inventory.removeItem(eq);
    ctx.setFlag(CARD_IN_FLAG);
    ctx.showMessage(
      "You slot the keycard into the terminal. It hums quietly as it reads the stripe."
    );
    rebuild(layer, ctx);
  }

  /* ── Key press handler (Phase 2) ── */
  function handleKey(value, layer, ctx) {
    if (value === "noop") return;
    if (value === "del") {
      if (input.length > 0) { input.pop(); statusMsg = ""; buildDisplay(layer, ctx); }
      return;
    }
    if (input.length < 4) {
      input.push(value); statusMsg = ""; buildDisplay(layer, ctx);
      if (input.length === 4) setTimeout(() => checkSolution(layer, ctx), 200);
    }
  }

  function checkSolution(layer, ctx) {
    if (isSolved()) {
      // Show a quick success flash in the display before closing
      const panel = layer.querySelector(".ut-display-panel");
      if (panel) {
        const body = panel.querySelector(".ut-left-body");
        if (body) {
          body.innerHTML = "";
          body.appendChild(el("div", { class: "ut-status ut-status--solved" }, [
            "AUTHORIZATION ACCEPTED",
            el("div", { class: "ut-solved-sub" }, ["ISSUING UPGRADED CARD…"]),
          ]));
        }
      }
      setTimeout(() => {
        Inventory.addItem("keycard_upgraded");
        if (ctx.showPickupNotification) ctx.showPickupNotification("keycard_upgraded");
        ctx.setFlag(CARD_DONE_FLAG);
        ctx.showMessage(
          "Authorization accepted. CLEARANCE UPGRADED: SENIOR CREW. " +
          "The terminal ejects an updated card."
        );
        ctx.closeCloseup();
        ctx.renderActive();
      }, 1400);
    } else {
      statusMsg = "error"; buildDisplay(layer, ctx);
      input = [];
      setTimeout(() => { statusMsg = ""; buildDisplay(layer, ctx); }, 900);
    }
  }

  /* ── Mount / unmount ── */
  function mount(layer, ctx) {
    codeInputActive = false;
    input           = [];
    statusMsg       = "";
    layer.innerHTML = "";
    rebuild(layer, ctx);
  }

  function unmount() {
    codeInputActive = false;
    input           = [];
    statusMsg       = "";
  }

  Engine.registerCloseupController("scilab_upgrade_terminal", { mount, unmount });
})();
