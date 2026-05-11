/* ============================================================
   STARLOCK - SCIENCE LAB SPECIMEN TERMINAL CONTROLLER
   ------------------------------------------------------------
   Backs the "scilab_specimen_terminal" HTML close-up.
   Close-up image: Images/closeups/Science Lab 4 Terminal.png
   (reusing the same terminal frame art as the log terminal —
   replace with a dedicated Science Lab 3 terminal image when
   that asset is ready)

   LAYOUT (1920×1080 stage pixels)
     TERMINAL SCREEN (.st-terminal)
       x=334  y=91  w=1280  h=565
       (same screen area as the log terminal)

   THREE SPECIMENS:
     Specimen 1 — 5-tile tone puzzle (simpler)
                  Flags: specimen1_solved, specimen1_played, specimen1_active
     Specimen 2 — 7-tile tone puzzle (harder)
                  Flags: specimen2_solved, specimen2_played, specimen2_active
     Specimen 3 — Pre-solved / Vance already activated it
                  Flag: specimen3_active (no visible specimen appears;
                  the Glitch is inhabiting Vance)

   TONE PUZZLE MECHANIC:
     Each tile represents an audio tone. Every tile has a line that
     enters from the left edge at inY (0=top, 1=bottom) and exits
     at the right edge at outY. When tiles are in the correct order
     the line is continuous — outY[n] === inY[n+1] for all adjacent
     tiles. The player clicks a tile to select it (highlighted) then
     clicks another tile to swap their positions.

   PLAY BUTTON:
     Plays a sine-wave tone per tile in the current left-to-right
     order using the Web Audio API. Clicking Play while the puzzle
     is solved marks it as "played" (flag saved) and enables Activate.

   ACTIVATE BUTTON:
     Enabled only when puzzle is solved AND Play has been clicked
     with the correct sequence.
     Specimen 1 → sets specimen1_active; green square appears on wall
     Specimen 2 → sets specimen2_active; blue square appears on wall
     Specimen 3 → sets specimen3_active; nothing visible (Vance hosts it)
   ============================================================ */

(function () {

  /* ── Terminal panel dimensions ── */
  const ST_LEFT   = 319;
  const ST_TOP    = 192;
  const ST_WIDTH  = 1334;
  const ST_HEIGHT = 597;

  /* ── Specimen definitions ── */
  // Each tile: { id (solution-position index), inY, outY, freq }
  // Solution = tiles in id order (0, 1, 2, …). startOrder is the
  // scrambled starting arrangement (indices into the tiles array).
  // Constraint: tiles[n].outY === tiles[n+1].inY for all n in solution.
  const SPECIMENS = [
    {
      id: "specimen1",
      label: "SPECIMEN 1",
      solvedFlag:   "specimen1_solved",
      playedFlag:   "specimen1_played",
      activeFlag:   "specimen1_active",
      introText:
        "I am confident I have isolated the correct set of tones for Specimen 1. " +
        "The specimen responds to audio stimuli more readily than the others — " +
        "its structure visibly shifts when specific frequencies are applied. " +
        "The individual tones are clear. The challenge is the order. Each tone's " +
        "waveform has a characteristic endpoint that must align with the starting " +
        "point of the next. Arrange the sequence, then play it to confirm.",
      activateMsg:
        "The containment field shifts frequency. Specimen 1 rises slowly from the " +
        "desk, its translucent squares catching the emergency light. It's active.",
      // 5 tiles — solution order is [0,1,2,3,4]
      // outY[n] === inY[n+1]: 0.5=0.5, 0.3=0.3, 0.7=0.7, 0.5=0.5 ✓
      tiles: [
        { id: 0, inY: 0.20, outY: 0.50, freq: 440 },   // A4
        { id: 1, inY: 0.50, outY: 0.30, freq: 587 },   // D5
        { id: 2, inY: 0.30, outY: 0.70, freq: 494 },   // B4
        { id: 3, inY: 0.70, outY: 0.50, freq: 659 },   // E5
        { id: 4, inY: 0.50, outY: 0.80, freq: 784 },   // G5
      ],
      startOrder: [2, 4, 0, 3, 1],
    },
    {
      id: "specimen2",
      label: "SPECIMEN 2",
      solvedFlag:   "specimen2_solved",
      playedFlag:   "specimen2_played",
      activeFlag:   "specimen2_active",
      introText:
        "Specimen 2 is proving considerably more challenging than the first. " +
        "The tonal signature is more complex — I'm detecting more distinct " +
        "frequencies, and their relationships are less obvious on initial " +
        "analysis. I've spent three sessions isolating the individual tones " +
        "and believe the set is complete. The sequencing logic is the same as " +
        "Specimen 1, but there are more tones to order. Work carefully.",
      activateMsg:
        "The containment field hums at a higher register. Specimen 2 rises from " +
        "the desk, its structure pulsing with a faint blue luminescence. It's active.",
      // 7 tiles — solution order is [0,1,2,3,4,5,6]
      // outY chain: 0.4,0.2,0.6,0.5,0.8,0.3 ✓
      tiles: [
        { id: 0, inY: 0.10, outY: 0.40, freq: 523 },   // C5
        { id: 1, inY: 0.40, outY: 0.20, freq: 659 },   // E5
        { id: 2, inY: 0.20, outY: 0.60, freq: 440 },   // A4
        { id: 3, inY: 0.60, outY: 0.50, freq: 784 },   // G5
        { id: 4, inY: 0.50, outY: 0.80, freq: 587 },   // D5
        { id: 5, inY: 0.80, outY: 0.30, freq: 880 },   // A5
        { id: 6, inY: 0.30, outY: 0.70, freq: 494 },   // B4
      ],
      startOrder: [4, 1, 6, 2, 0, 5, 3],
    },
    {
      id: "specimen3",
      label: "SPECIMEN 3",
      solvedFlag:   "specimen3_solved",
      playedFlag:   "specimen3_played",
      activeFlag:   "specimen3_active",
      preSolved: true,
      introText:
        "I have to note something about Specimen 3. The tonal sequence was — " +
        "immediate. I sat down to begin the analysis and found myself arranging " +
        "the tiles before I had consciously worked through the logic. I verified " +
        "it twice. It was correct. The specimen seemed almost to want me to solve " +
        "it; there was a clarity I can't account for. I've already played the " +
        "sequence. I'm activating it now.",
      activateMsg: null,   // Specimen 3 hosts Vance — nothing appears
      // 3-tile pre-solved puzzle — starts in correct order
      tiles: [
        { id: 0, inY: 0.30, outY: 0.50, freq: 523 },
        { id: 1, inY: 0.50, outY: 0.40, freq: 659 },
        { id: 2, inY: 0.40, outY: 0.60, freq: 784 },
      ],
      startOrder: [0, 1, 2],
    },
  ];

  /* ── Module-scope UI state ── */
  let activeTab     = 0;      // which specimen tab is shown
  let selectedSlot  = null;   // tile slot currently highlighted for swap
  let tileOrders    = null;   // current ordering per specimen (reset on unmount)
  // Per-session "Play was clicked while solved" tracker — supplements the flag
  let playedNow     = [false, false, false];

  /* ── Initialise tile orders (call inside mount with ctx) ── */
  function initTileOrders(ctx) {
    tileOrders = SPECIMENS.map((s) => {
      // If puzzle was already solved in a previous session, show solved state
      if (s.preSolved || ctx.hasFlag(s.solvedFlag)) {
        return s.tiles.map((_, i) => i);   // correct order
      }
      return [...s.startOrder];
    });
  }

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
        } else if (k === "disabled") {
          if (attrs[k]) node.setAttribute("disabled", "");
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

  /* ── Web Audio tone playback ── */
  let _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return _audioCtx;
  }

  function playTone(freq, startTime, duration) {
    try {
      const ctx  = getAudioCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.28, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    } catch (_) { /* AudioContext not available — silently skip */ }
  }

  function playSequence(specIdx) {
    try {
      const spec  = SPECIMENS[specIdx];
      const order = tileOrders[specIdx];
      const ctx   = getAudioCtx();
      const now   = ctx.currentTime + 0.05;
      const step  = 0.55;   // seconds per tone
      order.forEach((tileIdx, i) => {
        playTone(spec.tiles[tileIdx].freq, now + i * step, 0.45);
      });
    } catch (_) { /* silently skip if audio unavailable */ }
  }

  /* ── Puzzle helpers ── */
  function isSolved(specIdx) {
    const spec  = SPECIMENS[specIdx];
    if (spec.preSolved) return true;
    const order = tileOrders[specIdx];
    return order.every((tileIdx, slot) => tileIdx === slot);
  }

  /* ── Build the full terminal DOM ── */
  function buildTerminal(layer, ctx) {
    layer.innerHTML = "";

    layer.appendChild(el("div", {
      class: "st-terminal",
      style: {
        position: "absolute",
        left:   ST_LEFT   + "px",
        top:    ST_TOP    + "px",
        width:  ST_WIDTH  + "px",
        height: ST_HEIGHT + "px",
        overflow: "hidden",
      },
    }, [
      buildHeader(),
      buildTabBar(ctx),
      buildSpecimenContent(ctx),
    ]));
  }

  function buildHeader() {
    return el("header", { class: "ct-header" }, [
      el("span", { class: "ct-title" },    ["SPECIMEN TERMINAL"]),
      el("span", { class: "ct-subtitle" }, ["VANCE, DR. · SCIENCE OFFICER"]),
    ]);
  }

  function buildTabBar(ctx) {
    return el("div", { class: "st-tab-bar" },
      SPECIMENS.map((spec, i) =>
        el("button", {
          type:  "button",
          class: "st-tab-btn" + (i === activeTab ? " active" : ""),
          onclick: () => {
            activeTab    = i;
            selectedSlot = null;
            ctx.renderActive();
          },
        }, [spec.label])
      )
    );
  }

  function buildSpecimenContent(ctx) {
    const spec       = SPECIMENS[activeTab];
    const isActive   = ctx.hasFlag(spec.activeFlag);
    const solved     = isSolved(activeTab) || ctx.hasFlag(spec.solvedFlag);
    const hasPlayed  = playedNow[activeTab] || ctx.hasFlag(spec.playedFlag) || !!spec.preSolved;
    const canActivate = solved && hasPlayed && !isActive;

    // Persist solved state
    if (solved && !spec.preSolved && !ctx.hasFlag(spec.solvedFlag)) {
      ctx.setFlag(spec.solvedFlag);
    }

    const statusText  = isActive ? "ACTIVE" : "EMERGENCY STASIS";
    const statusClass = "st-status-badge " + (isActive ? "st-status-active" : "st-status-stasis");

    return el("div", { class: "st-content" }, [
      // Status row
      el("div", { class: "st-status-row" }, [
        el("span", { class: "st-status-label" }, ["STATUS:"]),
        el("span", { class: statusClass }, [statusText]),
      ]),
      // Vance's notes
      el("p", { class: "st-intro" }, [spec.introText]),
      // Tile puzzle
      buildPuzzle(spec, solved, ctx),
      // Buttons
      buildButtons(spec, ctx, solved, hasPlayed, canActivate, isActive),
    ]);
  }

  /* ── Puzzle area ── */
  function buildPuzzle(spec, solved, ctx) {
    const order     = tileOrders[activeTab];
    const tileNodes = order.map((tileIdx, slot) =>
      buildTile(spec, tileIdx, slot, solved, ctx)
    );

    return el("div", { class: "st-puzzle-area" }, [
      el("div", { class: "st-tile-row" }, tileNodes),
      solved
        ? el("div", { class: "st-solved-badge" }, ["✓  SEQUENCE VERIFIED"])
        : null,
    ]);
  }

  function buildTile(spec, tileIdx, slot, solved, ctx) {
    const tile       = spec.tiles[tileIdx];
    const isSelected = selectedSlot === slot;
    const classes    = "st-tile"
      + (isSelected ? " selected" : "")
      + (solved     ? " solved"   : "");

    // SVG line dimensions
    const W  = 120;
    const H  = 90;
    const y1 = tile.inY  * H;
    const y2 = tile.outY * H;
    const stroke = solved ? "#6cffae" : (isSelected ? "#ffffff" : "#c8403a");

    const svgNS  = "http://www.w3.org/2000/svg";
    const svg    = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width",  "100%");
    svg.setAttribute("height", "100%");
    svg.classList.add("st-tile-svg");

    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", "0");
    line.setAttribute("y1", String(y1));
    line.setAttribute("x2", String(W));
    line.setAttribute("y2", String(y2));
    line.setAttribute("stroke",         stroke);
    line.setAttribute("stroke-width",   solved ? "6" : "5");
    line.setAttribute("stroke-linecap", "round");
    svg.appendChild(line);

    // Subtle glow duplicate when solved
    if (solved) {
      const glow = document.createElementNS(svgNS, "line");
      glow.setAttribute("x1", "0");
      glow.setAttribute("y1", String(y1));
      glow.setAttribute("x2", String(W));
      glow.setAttribute("y2", String(y2));
      glow.setAttribute("stroke",       "rgba(108,255,174,0.35)");
      glow.setAttribute("stroke-width", "12");
      glow.setAttribute("stroke-linecap", "round");
      svg.insertBefore(glow, line);
    }

    const btn = el("button", {
      type:         "button",
      class:        classes,
      "aria-label": `Tone tile ${slot + 1}`,
      onclick: solved ? null : () => handleTileClick(slot, ctx),
    }, []);
    btn.appendChild(svg);
    return btn;
  }

  function handleTileClick(slot, ctx) {
    if (selectedSlot === null) {
      selectedSlot = slot;
    } else if (selectedSlot === slot) {
      selectedSlot = null;
    } else {
      const order  = tileOrders[activeTab];
      const tmp    = order[selectedSlot];
      order[selectedSlot] = order[slot];
      order[slot]  = tmp;
      selectedSlot = null;
    }
    ctx.renderActive();
  }

  /* ── Buttons ── */
  function buildButtons(spec, ctx, solved, hasPlayed, canActivate, isActive) {

    // Play button
    const playLabel = (hasPlayed && solved) ? "▶  REPLAY SEQUENCE" : "▶  PLAY SEQUENCE";
    const playBtn = el("button", {
      type:  "button",
      class: "st-btn st-play-btn" + ((hasPlayed && solved) ? " played" : ""),
      onclick: () => {
        playSequence(activeTab);
        if (solved) {
          playedNow[activeTab] = true;
          ctx.setFlag(spec.playedFlag);
        }
        ctx.renderActive();
      },
    }, [playLabel]);

    // Activate button
    let activateClass = "st-btn st-activate-btn";
    if (isActive)     activateClass += " activated";
    else if (canActivate) activateClass += " ready";

    const activateBtn = el("button", {
      type:     "button",
      class:    activateClass,
      disabled: (!canActivate && !isActive),
      onclick:  canActivate ? () => handleActivate(spec, ctx) : null,
    }, [isActive ? "SPECIMEN ACTIVE" : "ACTIVATE"]);

    return el("div", { class: "st-btn-row" }, [playBtn, activateBtn]);
  }

  function handleActivate(spec, ctx) {
    ctx.setFlag(spec.activeFlag);
    ctx.closeCloseup();
    ctx.renderActive();
    if (spec.activateMsg) {
      ctx.showMessage(spec.activateMsg);
    } else {
      // Specimen 3 — nothing visible
      ctx.showMessage(
        "The containment field activates. The chamber reads empty. " +
        "Specimen 3 is not in storage. It is not here."
      );
    }
  }

  /* ── Mount / unmount ── */
  function mount(layer, ctx) {
    if (!tileOrders) initTileOrders(ctx);

    // Specimen 3 is always considered solved and played (Vance did it already).
    // We set these flags once so the activate button is always live on open.
    if (!ctx.hasFlag("specimen3_solved")) ctx.setFlag("specimen3_solved");
    if (!ctx.hasFlag("specimen3_played")) ctx.setFlag("specimen3_played");
    playedNow[2] = true;

    buildTerminal(layer, ctx);
  }

  function unmount() {
    activeTab    = 0;
    selectedSlot = null;
    tileOrders   = null;
    playedNow    = [false, false, false];
  }

  Engine.registerCloseupController("scilab_specimen_terminal", { mount, unmount });
})();
