/* ============================================================
   STARLOCK - SCIENCE LAB LOG TERMINAL CONTROLLER
   ------------------------------------------------------------
   Backs the "scilab_log_terminal" HTML close-up.
   Close-up image: Images/closeups/Science Lab 4 Terminal.png
   — a close-up of Reyes' research terminal in the science lab.

   THREE LOG ENTRIES:
     Log 1 — Expedition Record (freely accessible)
       - Filed by Reyes. Contains mission auth code 0743.
       - Reading sets flag: log1_read
     Log 2 — Experiment Record (freely accessible)
       - Filed by Reyes. Documents Vance's exposure and quarantine.
       - Reading sets flag: log2_read
     Log 3 — Dispute Record (locked)
       - Locked behind a document scanner slot in the terminal.
       - The player must scan Reyes' coded note (coded_message item).
       - Scanning sets coded_note_scanned; coded_message NOT consumed.
       - Reading Log 3 sets flag: log3_read

   UI STRUCTURE:
     View 1 — LOG LIST: Three rows, one per log. Log 3 shows a
       lock indicator until coded_note_scanned is set.
     View 2 — LOG DETAIL: Full log text + metadata. Log 3 detail
       shows the scanner slot when the note has NOT been scanned yet.

   View state lives in module-scope variables (currentView,
   selectedLog). The engine calls unmount() on exit, which resets
   to the list so the next visit always starts there.
   ============================================================ */

(function () {

  /* ---------- Log data ---------- */
  const LOGS = [
    {
      id: "log1",
      num: "01",
      title: "EXPEDITION RECORD",
      date: "T-12d 06h",
      author: "REYES",
      flag: "log1_read",
      locked: false,
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
      author: "REYES",
      flag: "log2_read",
      locked: false,
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
      author: "REYES",
      flag: "log3_read",
      locked: true,  // unlocked by coded_note_scanned flag
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

  /* ---------- Module-scope view state ---------- */
  let currentView   = "list";   // "list" | "detail"
  let selectedLogId = null;
  let ctx_ref       = null;     // stash ctx so scanner action can call it

  /* ---------- DOM helper ---------- */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === "class") node.className = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k.startsWith("on") && typeof attrs[k] === "function") {
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

  /* ---------- View 1: LOG LIST ---------- */
  function buildList(layer, ctx) {
    const root = el("div", {
      class: "lt-terminal",
      role: "region",
      "aria-label": "Science lab log terminal",
    }, [
      el("header", { class: "ct-header" }, [
        el("span", { class: "ct-title" }, ["MISSION LOGS"]),
        el("span", { class: "ct-subtitle" }, ["SCIENCE LAB · REYES, A."]),
      ]),
      el("div", { class: "lt-log-list" },
        LOGS.map((log) => buildListRow(log, ctx))
      ),
    ]);
    layer.appendChild(root);
  }

  function buildListRow(log, ctx) {
    const { hasFlag } = ctx;
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
          isLocked ? `LOG ${log.num} — [ENCRYPTED]` : log.title,
        ]),
        el("span", { class: "lt-log-meta" }, [
          isLocked ? "DOCUMENT SCAN REQUIRED" : `${log.date} · ${log.author}`,
        ]),
      ]),
      el("span", { class: "lt-log-status" }, [logStatusLabel(log, hasFlag)]),
      el("span", { class: "ct-pod-chevron", "aria-hidden": "true" }, [
        isLocked ? "🔒" : "❯",
      ]),
    ]);
  }

  /* ---------- View 2: LOG DETAIL ---------- */
  function buildDetail(layer, ctx, logId) {
    const { hasFlag, setFlag, showMessage, renderActive } = ctx;
    const log = LOGS.find((l) => l.id === logId);
    if (!log) { buildList(layer, ctx); return; }

    const isLocked = log.locked && !hasFlag("coded_note_scanned");

    // Mark log as read when detail is opened (if not locked)
    if (!isLocked && !hasFlag(log.flag)) {
      setFlag(log.flag);
    }

    const root = el("div", {
      class: "lt-terminal",
      role: "region",
      "aria-label": `Log ${log.num} detail`,
    }, [
      el("header", { class: "ct-header" }, [
        el("button", {
          type: "button",
          class: "ct-back-btn",
          onclick: () => {
            currentView = "list";
            selectedLogId = null;
            ctx.renderActive();
          },
        }, ["❮ LOG LIST"]),
        el("span", { class: "ct-subtitle" }, [`LOG ${log.num} · REYES`]),
      ]),
      isLocked
        ? buildScannerSlot(ctx)
        : buildLogBody(log, hasFlag),
    ]);
    layer.appendChild(root);
  }

  function buildLogBody(log, hasFlag) {
    const paragraphs = log.body.split("\n\n");
    return el("div", { class: "lt-log-body" }, [
      el("div", { class: "lt-log-header-row" }, [
        el("span", { class: "lt-log-detail-title" }, [log.title]),
        el("span", { class: "lt-log-detail-meta" }, [`${log.date} · ${log.author}`]),
      ]),
      el("div", { class: "lt-log-text" },
        paragraphs.map((p) => el("p", { class: "lt-log-para" }, [p]))
      ),
    ]);
  }

  /* Scanner slot — shown on Log 3 detail before coded_note_scanned */
  function buildScannerSlot(ctx) {
    const { hasFlag, setFlag, showMessage, renderActive } = ctx;

    // Check if the player has the coded_message in inventory
    const hasNote = Inventory.hasItem("coded_message");

    return el("div", { class: "lt-scanner-panel" }, [
      el("div", { class: "lt-scanner-label" }, ["LOG 03 · ENCRYPTED"]),
      el("p", { class: "lt-scanner-desc" }, [
        "This log entry is protected by a physical encryption key. " +
        "Insert the corresponding document into the scanner slot below " +
        "to decode and unlock the entry.",
      ]),
      el("div", { class: "lt-scanner-slot" }, [
        el("div", { class: "lt-scanner-slot-label" }, ["DOCUMENT SCANNER"]),
        el("div", { class: "lt-scanner-slot-mouth" }, [
          el("span", { class: "lt-scanner-slot-line" }),
          el("span", { class: "lt-scanner-slot-text" }, ["INSERT DOCUMENT"]),
        ]),
        hasNote
          ? el("button", {
              type: "button",
              class: "ct-action lt-scan-btn",
              onclick: () => {
                setFlag("coded_note_scanned");
                showMessage(
                  "You feed Reyes' coded note into the scanner slot. " +
                  "The terminal hums as it decodes the physical key. Log 03 unlocked."
                );
                renderActive();
              },
            }, ["SCAN DOCUMENT"])
          : el("p", { class: "lt-scanner-hint" }, [
              "You don't have the document. " +
              "Find Reyes' coded note and bring it here.",
            ]),
      ]),
    ]);
  }

  /* ---------- Mount / unmount ---------- */
  function mount(layer, ctx) {
    ctx_ref = ctx;
    layer.innerHTML = "";
    if (currentView === "detail" && selectedLogId) {
      buildDetail(layer, ctx, selectedLogId);
    } else {
      currentView = "list";
      buildList(layer, ctx);
    }
  }

  function unmount() {
    currentView   = "list";
    selectedLogId = null;
    ctx_ref       = null;
  }

  Engine.registerCloseupController("scilab_log_terminal", { mount, unmount });
})();
