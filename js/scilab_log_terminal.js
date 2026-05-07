/* ============================================================
   STARLOCK - SCIENCE LAB LOG TERMINAL CONTROLLER
   ------------------------------------------------------------
   Backs the "scilab_log_terminal" HTML close-up.
   Close-up image: Images/closeups/Science Lab 4 Terminal.png

   LAYOUT  (1920×1080 stage pixels)

     TERMINAL SCREEN (.lt-terminal)
       x=334  y=91  w=1280  h=565
       Shows the log list → log detail navigation.

     PHYSICAL SCANNER SLOT (.lt-phys-scanner)
       x=751  y=907  w=413  h=94
       Invisible interactive area over the physical document
       scanner slot in the art. Has a soft blue pulsing glow.
       Behaviour:
         — Player must EQUIP coded_message, then click here.
         — On first use: sets flag coded_note_scanned (note kept).
         — If already scanned: shows "already decoded" message.
         — If wrong/no item equipped: hint message shown.

   THREE LOG ENTRIES:
     Log 01 — Expedition Record                  (flag: log1_read)
     Log 02 — Experiment Record                  (flag: log2_read)
     Log 03 — Dispute Record                     (flag: log3_read)
              Locked/red until coded_note_scanned.
              Ends with "Unencrypted: authorization code 0743"

   unmount() resets to list view so each fresh open starts there.
   ============================================================ */

(function () {

  /* ── Log data ── */
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
        "calling them glitches. I think the name is going to stick.",
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
      locked: true,   // unlocked when coded_note_scanned is set
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
      // Appended after the body as a decoded footer line
      decodedFooter: "Unencrypted: authorization code 0743",
    },
  ];

  /* ── Panel / slot dimensions ── */
  const LT_PANEL_LEFT   = 334;
  const LT_PANEL_TOP    = 91;
  const LT_PANEL_WIDTH  = 1280;
  const LT_PANEL_HEIGHT = 565;

  const LT_SCAN_LEFT   = 751;
  const LT_SCAN_TOP    = 907;
  const LT_SCAN_WIDTH  = 413;
  const LT_SCAN_HEIGHT = 94;

  /* ── Module-scope view state ── */
  let currentView   = "list";
  let selectedLogId = null;

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

  /* ── Status helpers ── */
  function isLogLocked(log, hasFlag) {
    return !!(log.locked && !hasFlag("coded_note_scanned"));
  }
  function logStatusLabel(log, hasFlag) {
    if (isLogLocked(log, hasFlag)) return "LOCKED";
    if (hasFlag(log.flag))         return "READ";
    return "UNREAD";
  }

  /* ── Build the terminal screen ── */
  function buildLogPanel(layer, ctx) {
    const old = layer.querySelector(".lt-terminal");
    if (old) old.remove();

    const content = (currentView === "detail" && selectedLogId)
      ? buildDetail(ctx, selectedLogId)
      : buildList(ctx);

    layer.appendChild(el("div", {
      class: "lt-terminal",
      style: {
        position: "absolute",
        left:     LT_PANEL_LEFT   + "px",
        top:      LT_PANEL_TOP    + "px",
        width:    LT_PANEL_WIDTH  + "px",
        height:   LT_PANEL_HEIGHT + "px",
        overflow: "hidden",
      },
    }, [content]));
  }

  /* ── List view ── */
  function buildList(ctx) {
    const { hasFlag } = ctx;
    return el("div", {
      class: "lt-list-wrapper",
      role: "region",
      "aria-label": "Mission logs",
    }, [
      el("header", { class: "ct-header" }, [
        el("span", { class: "ct-title" },    ["MISSION LOGS"]),
        el("span", { class: "ct-subtitle" }, ["REYES, A. · COMMANDER"]),
      ]),
      el("div", { class: "lt-log-list" },
        LOGS.map((log) => {
          const locked      = isLogLocked(log, hasFlag);
          const statusLabel = logStatusLabel(log, hasFlag);
          const rowClass    = "lt-log-row" +
            (locked            ? " lt-log-locked"  :
             hasFlag(log.flag) ? " lt-log-read"    :
                                 " lt-log-unread");

          return el("button", {
            type:    "button",
            class:   rowClass,
            onclick: () => {
              selectedLogId = log.id;
              currentView   = "detail";
              ctx.renderActive();
            },
          }, [
            el("span", { class: "lt-log-num" }, [`LOG ${log.num}`]),
            el("span", { class: "lt-log-info" }, [
              el("span", { class: "lt-log-title" }, [
                locked ? `LOG ${log.num} — ENCRYPTED` : log.title,
              ]),
              el("span", { class: "lt-log-meta" }, [
                locked
                  ? "AUTHORIZATION REQUIRED — SCAN KEY DOCUMENT TO UNLOCK"
                  : log.date,
              ]),
            ]),
            el("span", { class: "lt-log-status" }, [statusLabel]),
            el("span", { class: "ct-pod-chevron" }, [locked ? "🔒" : "❯"]),
          ]);
        })
      ),
    ]);
  }

  /* ── Detail view ── */
  function buildDetail(ctx, logId) {
    const { hasFlag, setFlag } = ctx;
    const log    = LOGS.find((l) => l.id === logId);
    if (!log) return buildList(ctx);

    const locked = isLogLocked(log, hasFlag);
    if (!locked && !hasFlag(log.flag)) setFlag(log.flag);

    const backBtn = el("button", {
      type: "button",
      class: "ct-back-btn",
      onclick: () => {
        currentView   = "list";
        selectedLogId = null;
        ctx.renderActive();
      },
    }, ["❮ LOGS"]);

    if (locked) {
      return el("div", { role: "region" }, [
        el("header", { class: "ct-header" }, [
          backBtn,
          el("span", { class: "ct-subtitle" }, [`LOG ${log.num}`]),
        ]),
        el("div", { class: "lt-locked-notice" }, [
          el("div", { class: "lt-locked-icon" }, ["🔒"]),
          el("p",   { class: "lt-locked-msg"  }, ["LOG ENCRYPTED — AUTHORIZATION REQUIRED"]),
          el("p",   { class: "lt-locked-hint" }, [
            "Equip the physical key document and scan it in the slot below to decode this entry."
          ]),
        ]),
      ]);
    }

    // Unlocked body
    const paragraphEls = log.body.split("\n\n").map((p) =>
      el("p", { class: "lt-log-para" }, [p])
    );

    // Decoded footer for Log 03
    const footerEl = log.decodedFooter
      ? el("p", { class: "lt-log-para lt-log-decoded" }, [log.decodedFooter])
      : null;

    return el("div", { role: "region" }, [
      el("header", { class: "ct-header" }, [
        backBtn,
        el("span", { class: "ct-subtitle" }, [`LOG ${log.num}`]),
      ]),
      el("div", { class: "lt-log-body" }, [
        el("div", { class: "lt-log-header-row" }, [
          el("span", { class: "lt-log-detail-title" }, [log.title]),
          el("span", { class: "lt-log-detail-meta"  }, [log.date]),
        ]),
        el("div", { class: "lt-log-text" }, [...paragraphEls, footerEl]),
      ]),
    ]);
  }

  /* ── Build the physical scanner slot ── */
  function buildScannerSlot(layer, ctx) {
    const old = layer.querySelector(".lt-phys-scanner");
    if (old) old.remove();

    const { hasFlag, setFlag, showMessage, renderActive } = ctx;
    const alreadyScanned = hasFlag("coded_note_scanned");

    // Invisible button over the scanner slot in the art
    const btn = el("button", {
      type:  "button",
      class: "lt-scan-btn",
      "aria-label": alreadyScanned ? "Document decoded" : "Scan document",
      style: {
        position:   "absolute",
        inset:      "0",
        background: "transparent",
        border:     "none",
        cursor:     alreadyScanned ? "default" : "pointer",
        width:      "100%",
        height:     "100%",
      },
      onclick: () => {
        if (alreadyScanned) {
          showMessage("The key document has already been decoded. Log 03 is unlocked.");
          return;
        }
        const eq = Inventory.getEquipped();
        if (eq === "coded_message") {
          setFlag("coded_note_scanned");
          showMessage(
            "You feed Reyes' coded note into the scanner slot. " +
            "The terminal hums as it decodes the document. Log 03 is now unlocked."
          );
          renderActive();
        } else {
          showMessage(
            "The scanner slot is waiting for the physical key document. " +
            "Equip Reyes' coded note, then click the scanner slot."
          );
        }
      },
    }, []);

    // Wrapper carries the blue pulse glow animation
    const wrapper = el("div", {
      class: "lt-phys-scanner" + (alreadyScanned ? " lt-phys-scanner--done" : ""),
      style: {
        position: "absolute",
        left:     LT_SCAN_LEFT   + "px",
        top:      LT_SCAN_TOP    + "px",
        width:    LT_SCAN_WIDTH  + "px",
        height:   LT_SCAN_HEIGHT + "px",
      },
    }, [btn]);

    layer.appendChild(wrapper);
  }

  /* ── Mount / unmount ── */
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
