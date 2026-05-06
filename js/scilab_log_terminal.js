/* ============================================================
   STARLOCK - SCIENCE LAB LOG TERMINAL CONTROLLER
   ------------------------------------------------------------
   Backs the "scilab_log_terminal" HTML close-up.
   Close-up image: Images/closeups/Science Lab 4 Terminal.png

   LAYOUT
   Two independent layers mounted into #closeup-html:

     1. LOG PANEL (.lt-terminal)
        Narrow panel on the LEFT side of the screen, showing the
        terminal UI: log list → log detail navigation.

     2. PHYSICAL SCANNER SLOT (.lt-phys-scanner)
        A persistent interactive element at the BOTTOM-CENTRE of
        the closeup, positioned over the actual paper scanner slot
        visible in the terminal image. Always shown. Behaviour:
          - If player has coded_message in inventory → clicking
            inserts it and sets coded_note_scanned (not consumed).
          - If already scanned → shows "DECRYPTED" indicator.
          - Otherwise → shows a hint message in the message bar.
        Tune LT_SCAN_* constants to the art position (D key = debug).

   THREE LOG ENTRIES:
     Log 1 — Expedition Record (auth code 0743, sets log1_read)
     Log 2 — Experiment Record (sets log2_read)
     Log 3 — Dispute Record   (locked until coded_note_scanned)

   unmount() resets view to list so each fresh open starts there.
   ============================================================ */

(function () {

  /* ---------- Log data ---------- */
  const LOGS = [
    {
      id: "log1",
      num: "01",
      title: "EXPEDITION RECORD",
      date: "T-12d 06h",
      flag: "log1_read",
      body:
        "We located what appeared to be mineral deposits in a low-lying cave " +
        "system approximately 3.4 km from the landing site. On closer inspection " +
        "the deposits were not inert. They responded to light, shifted position " +
        "when approached, and reorganised when Vance played a tone through the " +
        "portable speaker. Vance described them as unlike anything in any " +
        "biological or mineralogical record. We collected three specimens in " +
        "sealed field containers and returned to the ship.\n\n" +
        "I've been staring at the footage. Each one is a small cluster of " +
        "translucent squares. They look like a visual artifact. Vance keeps " +
        "calling them glitches. I think the name is going to stick.\n\n" +
        "Mission auth code logged: 0743",
    },
    {
      id: "log2",
      num: "02",
      title: "EXPERIMENT RECORD",
      date: "T-04d 14h",
      flag: "log2_read",
      body:
        "Vance has been running controlled stimulus tests on one of the live " +
        "specimens — light intensity, audio frequency, thermal variation. The " +
        "glitch responds to audio most strongly. During today's session using a " +
        "mid-range frequency sweep, the specimen became agitated. It moved out " +
        "of containment before Vance could react.\n\n" +
        "What followed happened quickly. The specimen approached Vance directly " +
        "and appeared to enter their body through sustained proximity. Vance " +
        "collapsed. Vitals became erratic, then stabilised at levels that don't " +
        "correspond to normal human baseline. Vance appears dead. Something is " +
        "still running.\n\n" +
        "Tarn and I suited Vance in the EVA gear and placed them in pod 4 under " +
        "full quarantine seal. I documented what I could. The wiring on pod 4 " +
        "has since been tampered with. I don't know when or by whom.",
    },
    {
      id: "log3",
      num: "03",
      title: "DISPUTE RECORD",
      date: "T-00d 02h",
      flag: "log3_read",
      locked: true,   // unlocked by coded_note_scanned
      body:
        "Tarn wants to take the shuttle, destroy the ship and all specimens, " +
        "and return alone. No evidence. No organism. No risk. Tarn says bringing " +
        "the glitch anywhere near other people — even in a sealed lab at base — " +
        "is a risk we have no right to take. I understand the argument. I don't " +
        "accept it.\n\n" +
        "If we destroy the ship we abandon the engineer, who is still in cryo. " +
        "We lose any chance of developing a treatment or understanding what the " +
        "glitch is. We give up on doing this properly. Tarn says that's " +
        "acceptable. I don't agree.\n\n" +
        "Tarn also sabotaged pod 4's wiring at some point. I only found out " +
        "today.\n\n" +
        "We're not going to agree on this. I can hear Tarn moving toward the " +
        "shuttle bay. I'm going after them.",
    },
  ];

  /* ---------- Physical scanner slot position ----------
     Position the scanner slot over the actual paper slot in the
     closeup image. Tune these constants in debug mode (D key).
     Values are in 1920×1080 stage coordinates. */
  const LT_SCAN_LEFT   = 620;   // left edge of the slot area
  const LT_SCAN_TOP    = 870;   // top edge
  const LT_SCAN_WIDTH  = 680;   // width of the clickable zone
  const LT_SCAN_HEIGHT = 160;   // height of the clickable zone

  /* ---------- Log panel position ----------
     Narrow panel on the left side of the closeup image. */
  const LT_PANEL_LEFT   = 60;
  const LT_PANEL_TOP    = 140;
  const LT_PANEL_WIDTH  = 820;
  const LT_PANEL_HEIGHT = 700;

  /* ---------- Module-scope view state ---------- */
  let currentView   = "list";
  let selectedLogId = null;

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

  /* ---------- Status helpers ---------- */
  function logStatusClass(log, hasFlag) {
    if (log.locked && !hasFlag("coded_note_scanned")) return "lt-log-locked";
    if (hasFlag(log.flag)) return "lt-log-read";
    return "lt-log-unread";
  }

  function logStatusLabel(log, hasFlag) {
    if (log.locked && !hasFlag("coded_note_scanned")) return "LOCKED";
    if (hasFlag(log.flag)) return "READ";
    return "UNREAD";
  }

  /* ---------- Build the log panel ---------- */
  function buildLogPanel(layer, ctx) {
    const old = layer.querySelector(".lt-terminal");
    if (old) old.remove();

    let content;
    if (currentView === "detail" && selectedLogId) {
      content = buildDetail(ctx, selectedLogId);
    } else {
      content = buildList(ctx);
    }

    const panel = el("div", {
      class: "lt-terminal",
      style: {
        position: "absolute",
        left:   LT_PANEL_LEFT + "px",
        top:    LT_PANEL_TOP + "px",
        width:  LT_PANEL_WIDTH + "px",
        height: LT_PANEL_HEIGHT + "px",
      },
    }, [content]);

    layer.appendChild(panel);
  }

  /* ----- List view ----- */
  function buildList(ctx) {
    const { hasFlag } = ctx;
    return el("div", {
      class: "lt-list-wrapper",
      role: "region",
      "aria-label": "Mission logs",
    }, [
      el("header", { class: "ct-header" }, [
        el("span", { class: "ct-title" }, ["MISSION LOGS"]),
        el("span", { class: "ct-subtitle" }, ["REYES, A. · COMMANDER"]),
      ]),
      el("div", { class: "lt-log-list" },
        LOGS.map((log) => {
          const statusClass = logStatusClass(log, hasFlag);
          const isLocked = log.locked && !hasFlag("coded_note_scanned");
          return el("button", {
            type: "button",
            class: "lt-log-row " + statusClass,
            onclick: () => {
              selectedLogId = log.id;
              currentView = "detail";
              ctx.renderActive();
            },
          }, [
            el("span", { class: "lt-log-num" }, [`LOG ${log.num}`]),
            el("span", { class: "lt-log-info" }, [
              el("span", { class: "lt-log-title" }, [
                isLocked ? `LOG ${log.num} — ENCRYPTED` : log.title,
              ]),
              el("span", { class: "lt-log-meta" }, [
                isLocked ? "INSERT KEY DOCUMENT TO UNLOCK" : log.date,
              ]),
            ]),
            el("span", { class: "lt-log-status" }, [logStatusLabel(log, hasFlag)]),
            el("span", { class: "ct-pod-chevron" }, [isLocked ? "🔒" : "❯"]),
          ]);
        })
      ),
    ]);
  }

  /* ----- Detail view ----- */
  function buildDetail(ctx, logId) {
    const { hasFlag, setFlag } = ctx;
    const log = LOGS.find((l) => l.id === logId);
    if (!log) return buildList(ctx);

    const isLocked = log.locked && !hasFlag("coded_note_scanned");
    if (!isLocked && !hasFlag(log.flag)) setFlag(log.flag);

    return el("div", { role: "region" }, [
      el("header", { class: "ct-header" }, [
        el("button", {
          type: "button",
          class: "ct-back-btn",
          onclick: () => {
            currentView = "list";
            selectedLogId = null;
            ctx.renderActive();
          },
        }, ["❮ LOGS"]),
        el("span", { class: "ct-subtitle" }, [`LOG ${log.num}`]),
      ]),
      isLocked
        ? el("div", { class: "lt-locked-notice" }, [
            el("p", null, [
              "This log is encrypted. Insert the physical key document " +
              "into the scanner slot at the bottom of the terminal to unlock it."
            ]),
          ])
        : el("div", { class: "lt-log-body" }, [
            el("div", { class: "lt-log-header-row" }, [
              el("span", { class: "lt-log-detail-title" }, [log.title]),
              el("span", { class: "lt-log-detail-meta" }, [log.date]),
            ]),
            el("div", { class: "lt-log-text" },
              log.body.split("\n\n").map((p) =>
                el("p", { class: "lt-log-para" }, [p])
              )
            ),
          ]),
    ]);
  }

  /* ---------- Build the physical scanner slot ----------
     Always mounted regardless of which log view is showing. */
  function buildScannerSlot(layer, ctx) {
    const old = layer.querySelector(".lt-phys-scanner");
    if (old) old.remove();

    const { hasFlag, setFlag, showMessage, renderActive } = ctx;
    const alreadyScanned = hasFlag("coded_note_scanned");
    const hasNote        = Inventory.hasItem("coded_message");

    let inner;
    if (alreadyScanned) {
      inner = el("div", { class: "lt-scan-state lt-scan-state--done" }, [
        el("span", { class: "lt-scan-icon" }, ["▓"]),
        el("span", { class: "lt-scan-text" }, ["DOCUMENT DECODED · LOG 03 UNLOCKED"]),
      ]);
    } else {
      inner = el("button", {
        type: "button",
        class: "lt-scan-state lt-scan-state--idle",
        onclick: () => {
          if (hasNote) {
            setFlag("coded_note_scanned");
            showMessage(
              "You feed Reyes' coded note into the scanner slot. " +
              "The terminal hums as it decodes the physical key. Log 03 unlocked."
            );
            renderActive();
          } else {
            showMessage(
              "The scanner slot is waiting for the physical key document. " +
              "Find Reyes' coded note."
            );
          }
        },
      }, [
        el("span", { class: "lt-scan-icon" }, ["▒"]),
        el("span", { class: "lt-scan-text" }, [
          hasNote ? "INSERT CODED NOTE →" : "INSERT DOCUMENT",
        ]),
      ]);
    }

    const slot = el("div", {
      class: "lt-phys-scanner",
      style: {
        position: "absolute",
        left:   LT_SCAN_LEFT + "px",
        top:    LT_SCAN_TOP + "px",
        width:  LT_SCAN_WIDTH + "px",
        height: LT_SCAN_HEIGHT + "px",
      },
    }, [inner]);

    layer.appendChild(slot);
  }

  /* ---------- Mount / unmount ---------- */
  function mount(layer, ctx) {
    layer.innerHTML = "";
    buildLogPanel(layer, ctx);
    buildScannerSlot(layer, ctx);
  }

  function unmount() {
    currentView   = "list";
    selectedLogId = null;
  }

  Engine.registerCloseupController("scilab_log_terminal", { mount, unmount });
})();
