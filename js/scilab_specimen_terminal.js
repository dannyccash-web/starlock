/* ============================================================
   STARLOCK - SCIENCE LAB SPECIMEN TERMINAL CONTROLLER
   ------------------------------------------------------------
   Backs the "scilab_specimen_terminal" HTML close-up.
   Close-up image: Images/closeups/Science Lab 3 Terminal.png

   LAYOUT (1920×1080 stage pixels)
     TERMINAL SCREEN (.st-terminal)
       x=319  y=192  w=1334  h=597

   NAVIGATION
     "home"   — intro paragraph + list of three specimen rows
     "detail" — back button + status + notes + puzzle + buttons

   TONE PUZZLE MECHANIC
     Each tile contains TWO horizontal bars at distinct vertical
     positions (y1 and y2). Both bars are the same colour. The tile
     order is correct when tile[n].t2 === tile[n+1].t1 — i.e. the
     bottom bar of each tile sits at the same height as the top bar
     of the tile to its right, creating a visual chain.

     Six discrete tone levels (0 = highest, 5 = lowest):
       Level 0 → 880 Hz   Level 3 → 587 Hz
       Level 1 → 784 Hz   Level 4 → 494 Hz
       Level 2 → 659 Hz   Level 5 → 440 Hz

   PLAY BUTTON
     Plays tone1 then tone2 for each tile in left-to-right order.
     Only enables Activate once the sequence is solved AND played.

   ACTIVATE
     Specimen 1 → specimen1_active (green square on wall)
     Specimen 2 → specimen2_active (blue square on wall)
     Specimen 3 → specimen3_active (nothing visible; Glitch hosts Vance)
   ============================================================ */

(function () {

  /* ── Panel dimensions ── */
  const ST_LEFT   = 319;
  const ST_TOP    = 192;
  const ST_WIDTH  = 1334;
  const ST_HEIGHT = 597;

  /* ── Tone table (6 discrete levels, index 0 = highest pitch) ── */
  const TONE_Y    = [0.14, 0.28, 0.43, 0.57, 0.71, 0.85];
  const TONE_FREQ = [880,  784,  659,  587,  494,  440 ];

  /* ── Specimen definitions ── */
  // tiles[n].t2 === tiles[n+1].t1  →  the chain is correct
  // startOrder is the scrambled arrangement shown on first open.
  const SPECIMENS = [
    {
      id:          "specimen1",
      label:       "SPECIMEN 1",
      solvedFlag:  "specimen1_solved",
      playedFlag:  "specimen1_played",
      activeFlag:  "specimen1_active",
      statusMeta:  "5-TILE SEQUENCE · ANALYSIS INCOMPLETE",
      introText:
        "I am confident I have isolated the correct set of tones for Specimen 1. " +
        "The specimen responds to audio stimuli more readily than the others — its " +
        "structure visibly shifts when specific frequencies are applied. Each tone " +
        "has a characteristic endpoint that must connect to the starting point of " +
        "the next. Arrange the tiles until the sequence chains correctly, then play " +
        "it to confirm before activating.",
      activateMsg:
        "The containment field shifts frequency. Specimen 1 rises slowly from the " +
        "desk, its translucent squares catching the emergency light. It's active.",
      // Solution: tile[n].t2 === tile[n+1].t1
      // Chain: 3→3, 1→1, 4→4, 2→2  ✓
      tiles: [
        { id: 0, t1: 0, t2: 3 },
        { id: 1, t1: 3, t2: 1 },
        { id: 2, t1: 1, t2: 4 },
        { id: 3, t1: 4, t2: 2 },
        { id: 4, t1: 2, t2: 5 },
      ],
      startOrder: [2, 4, 0, 3, 1],
    },
    {
      id:          "specimen2",
      label:       "SPECIMEN 2",
      solvedFlag:  "specimen2_solved",
      playedFlag:  "specimen2_played",
      activeFlag:  "specimen2_active",
      statusMeta:  "7-TILE SEQUENCE · ANALYSIS INCOMPLETE",
      introText:
        "Specimen 2 is considerably more complex than the first. I am detecting " +
        "more distinct tonal frequencies, and their relationships are less obvious " +
        "on initial analysis. Three sessions to isolate the individual tones; I " +
        "believe the set is complete. The sequencing logic is identical to " +
        "Specimen 1 — each tile's second tone must match the first tone of the " +
        "tile to its right. There are simply more tiles to order. Work carefully.",
      activateMsg:
        "The containment field hums at a higher register. Specimen 2 rises from " +
        "the desk, its structure pulsing with a faint blue luminescence. It's active.",
      // Chain: 4→4, 2→2, 5→5, 1→1, 3→3, 0→0  ✓
      tiles: [
        { id: 0, t1: 0, t2: 4 },
        { id: 1, t1: 4, t2: 2 },
        { id: 2, t1: 2, t2: 5 },
        { id: 3, t1: 5, t2: 1 },
        { id: 4, t1: 1, t2: 3 },
        { id: 5, t1: 3, t2: 0 },
        { id: 6, t1: 0, t2: 2 },
      ],
      startOrder: [4, 1, 6, 2, 0, 5, 3],
    },
    {
      id:          "specimen3",
      label:       "SPECIMEN 3",
      solvedFlag:  "specimen3_solved",
      playedFlag:  "specimen3_played",
      activeFlag:  "specimen3_active",
      statusMeta:  "3-TILE SEQUENCE · SEQUENCE VERIFIED",
      preSolved:   true,
      introText:
        "I have to note something about Specimen 3. The tonal sequence was — " +
        "immediate. I sat down to begin the analysis and found myself arranging " +
        "the tiles before I had consciously worked through the logic. I verified " +
        "the result twice. It was correct both times. The specimen seemed almost " +
        "to want me to solve it. There was a clarity I cannot account for. I have " +
        "already played the sequence. I am activating it now.",
      activateMsg: null,
      // Pre-solved, starts in correct order
      // Chain: 3→3, 0→0  ✓
      tiles: [
        { id: 0, t1: 1, t2: 3 },
        { id: 1, t1: 3, t2: 0 },
        { id: 2, t1: 0, t2: 2 },
      ],
      startOrder: [0, 1, 2],
    },
  ];

  /* ── Opening paragraph (home view) ── */
  const INTRO =
    "We have acquired three specimens of an unknown alien species. The crew " +
    "has taken to calling them Glitch — I find the name more accurate than I " +
    "would like. Initial analysis indicates the specimens respond strongly to " +
    "specific audio frequencies. I believe a precise sequence of tones, unique " +
    "to each specimen, may be the key to communicating with them — or to " +
    "activating whatever potential they are carrying. I have isolated the " +
    "individual tones for each. The challenge is the order.";

  /* ── Module-scope state ── */
  let currentView  = "home";
  let selectedSpec = null;    // index 0-2
  let selectedSlot = null;    // tile slot awaiting swap
  let tileOrders   = null;    // current arrangement per specimen
  let playedNow    = [false, false, false];

  function initOrders(ctx) {
    tileOrders = SPECIMENS.map((s) =>
      (s.preSolved || ctx.hasFlag(s.solvedFlag))
        ? s.tiles.map((_, i) => i)
        : [...s.startOrder]
    );
  }

  /* ── Minimal DOM helper ── */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === "class")  node.className = attrs[k];
        else if (k === "style" && typeof attrs[k] === "object") {
          Object.assign(node.style, attrs[k]);
        } else if (k.startsWith("on") && typeof attrs[k] === "function") {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (k === "disabled") {
          if (attrs[k]) node.setAttribute("disabled", "");
        } else if (attrs[k] === true)  node.setAttribute(k, "");
        else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k]);
      }
    }
    (children || []).forEach((c) => {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  /* ── Web Audio ── */
  let _actx = null;
  function getCtx() {
    if (!_actx) _actx = new (window.AudioContext || window.webkitAudioContext)();
    return _actx;
  }
  function playTone(freq, startTime, duration) {
    try {
      const ctx  = getCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      // Louder, with short attack/release to avoid clicks
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.65, startTime + 0.03);
      gain.gain.setValueAtTime(0.65, startTime + duration - 0.04);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.01);
    } catch (_) {}
  }
  function playSequence(specIdx) {
    try {
      const spec  = SPECIMENS[specIdx];
      const order = tileOrders[specIdx];
      const ctx   = getCtx();
      const now   = ctx.currentTime + 0.05;
      const tLen  = 0.36;   // each tone duration
      const tGap  = 0.06;   // gap between tone1 and tone2 within a tile
      const iGap  = 0.14;   // gap between tiles
      const step  = tLen + tGap + tLen + iGap;  // 0.92s per tile
      order.forEach((tileIdx, i) => {
        const tile = spec.tiles[tileIdx];
        const t0   = now + i * step;
        playTone(TONE_FREQ[tile.t1], t0,           tLen);
        playTone(TONE_FREQ[tile.t2], t0 + tLen + tGap, tLen);
      });
    } catch (_) {}
  }

  /* ── Puzzle logic ── */
  function isSolved(specIdx) {
    if (SPECIMENS[specIdx].preSolved) return true;
    return tileOrders[specIdx].every((tileIdx, slot) => tileIdx === slot);
  }

  /* ── Build the full terminal ── */
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
      buildHeader(ctx),
      currentView === "home" ? buildHome(ctx) : buildDetail(ctx),
    ]));
  }

  /* ── Header ── */
  function buildHeader(ctx) {
    if (currentView === "detail") {
      const back = el("button", {
        type: "button", class: "ct-back-btn",
        onclick: () => { currentView = "home"; selectedSlot = null; ctx.renderActive(); },
      }, ["❮  SPECIMENS"]);
      return el("header", { class: "ct-header" }, [
        back,
        el("span", { class: "ct-subtitle" }, [SPECIMENS[selectedSpec].label]),
      ]);
    }
    return el("header", { class: "ct-header" }, [
      el("span", { class: "ct-title" },    ["SPECIMEN TERMINAL"]),
      el("span", { class: "ct-subtitle" }, ["VANCE, DR. · SCIENCE OFFICER"]),
    ]);
  }

  /* ── Home view ── */
  function buildHome(ctx) {
    return el("div", { class: "st-home" }, [
      el("p", { class: "st-para" }, [INTRO]),
      el("div", { class: "st-spec-list" },
        SPECIMENS.map((spec, i) => {
          const isActive = ctx.hasFlag(spec.activeFlag);
          const solved   = isSolved(i) || ctx.hasFlag(spec.solvedFlag);
          const rowClass = "st-spec-row" + (isActive ? " st-spec-active" : "");
          const statusLabel = isActive ? "ACTIVE" : (solved ? "SOLVED" : "STASIS");
          return el("button", {
            type: "button", class: rowClass,
            onclick: () => { currentView = "detail"; selectedSpec = i; selectedSlot = null; ctx.renderActive(); },
          }, [
            el("span", { class: "st-spec-num"    }, [spec.label]),
            el("div",  { class: "st-spec-info"   }, [
              el("span", { class: "st-spec-title" }, [spec.label]),
              el("span", { class: "st-spec-meta"  }, [spec.statusMeta]),
            ]),
            el("span", { class: "st-spec-status" }, [statusLabel]),
            el("span", { class: "ct-pod-chevron" }, ["❯"]),
          ]);
        })
      ),
    ]);
  }

  /* ── Detail view ── */
  function buildDetail(ctx) {
    const spec      = SPECIMENS[selectedSpec];
    const isActive  = ctx.hasFlag(spec.activeFlag);
    const solved    = isSolved(selectedSpec) || ctx.hasFlag(spec.solvedFlag);
    const hasPlayed = playedNow[selectedSpec] || ctx.hasFlag(spec.playedFlag) || !!spec.preSolved;
    const canActivate = solved && hasPlayed && !isActive;

    if (solved && !spec.preSolved && !ctx.hasFlag(spec.solvedFlag)) ctx.setFlag(spec.solvedFlag);

    const statusText  = isActive ? "ACTIVE" : "EMERGENCY STASIS";
    const statusClass = "st-status-badge " + (isActive ? "st-status-active" : "st-status-stasis");

    return el("div", { class: "st-detail" }, [
      // Status row
      el("div", { class: "st-status-row" }, [
        el("span", { class: "st-status-label" }, ["STATUS:"]),
        el("span", { class: statusClass },       [statusText]),
      ]),
      // Vance's notes
      el("p", { class: "st-para" }, [spec.introText]),
      // Puzzle
      buildPuzzle(spec, solved, ctx),
      // Buttons
      buildButtons(spec, ctx, solved, hasPlayed, canActivate, isActive),
    ]);
  }

  /* ── Puzzle ── */
  function buildPuzzle(spec, solved, ctx) {
    const order = tileOrders[selectedSpec];
    return el("div", { class: "st-puzzle-area" }, [
      el("div", { class: "st-tile-row" },
        order.map((tileIdx, slot) => buildTile(spec, tileIdx, slot, solved, ctx))
      ),
      solved ? el("div", { class: "st-solved-badge" }, ["✓  SEQUENCE VERIFIED"]) : null,
    ]);
  }

  function buildTile(spec, tileIdx, slot, solved, ctx) {
    const tile      = spec.tiles[tileIdx];
    const selected  = selectedSlot === slot;
    const W = 120, H = 90;
    const y1 = TONE_Y[tile.t1] * H;
    const y2 = TONE_Y[tile.t2] * H;
    const colour = solved ? "#6cffae" : (selected ? "#ffffff" : "rgba(108,208,255,0.85)");
    const strokeW = solved ? 6 : 5;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg   = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width",  "100%");
    svg.setAttribute("height", "100%");
    svg.classList.add("st-tile-svg");

    [y1, y2].forEach((y) => {
      // Glow copy when solved
      if (solved) {
        const g = document.createElementNS(svgNS, "line");
        g.setAttribute("x1", "0");   g.setAttribute("y1", String(y));
        g.setAttribute("x2", String(W)); g.setAttribute("y2", String(y));
        g.setAttribute("stroke", "rgba(108,255,174,0.3)");
        g.setAttribute("stroke-width", "14");
        g.setAttribute("stroke-linecap", "square");
        svg.appendChild(g);
      }
      const ln = document.createElementNS(svgNS, "line");
      ln.setAttribute("x1", "0");    ln.setAttribute("y1", String(y));
      ln.setAttribute("x2", String(W)); ln.setAttribute("y2", String(y));
      ln.setAttribute("stroke", colour);
      ln.setAttribute("stroke-width", String(strokeW));
      ln.setAttribute("stroke-linecap", "square");
      svg.appendChild(ln);
    });

    const tileClass = "st-tile"
      + (selected ? " selected" : "")
      + (solved   ? " solved"   : "");

    const btn = el("button", {
      type:         "button",
      class:        tileClass,
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
      const order = tileOrders[selectedSpec];
      [order[selectedSlot], order[slot]] = [order[slot], order[selectedSlot]];
      selectedSlot = null;
    }
    ctx.renderActive();
  }

  /* ── Buttons ── */
  function buildButtons(spec, ctx, solved, hasPlayed, canActivate, isActive) {
    const playLabel = (solved && hasPlayed) ? "▶  REPLAY SEQUENCE" : "▶  PLAY SEQUENCE";
    const playBtn = el("button", {
      type: "button",
      class: "st-btn st-play-btn" + ((solved && hasPlayed) ? " played" : ""),
      onclick: () => {
        playSequence(selectedSpec);
        if (solved) {
          playedNow[selectedSpec] = true;
          ctx.setFlag(spec.playedFlag);
        }
        ctx.renderActive();
      },
    }, [playLabel]);

    let actClass = "st-btn st-activate-btn";
    if (isActive)     actClass += " activated";
    else if (canActivate) actClass += " ready";

    const actBtn = el("button", {
      type:     "button",
      class:    actClass,
      disabled: !canActivate && !isActive,
      onclick:  canActivate ? () => handleActivate(spec, ctx) : null,
    }, [isActive ? "SPECIMEN ACTIVE" : "ACTIVATE"]);

    return el("div", { class: "st-btn-row" }, [playBtn, actBtn]);
  }

  function handleActivate(spec, ctx) {
    ctx.setFlag(spec.activeFlag);
    ctx.closeCloseup();
    ctx.renderActive();
    ctx.showMessage(
      spec.activateMsg ||
      "The containment field activates. The chamber reads empty. " +
      "Specimen 3 is not in storage. It is not here."
    );
  }

  /* ── Mount / unmount ── */
  function mount(layer, ctx) {
    if (!tileOrders) initOrders(ctx);
    // Specimen 3 is always pre-solved/pre-played
    if (!ctx.hasFlag("specimen3_solved")) ctx.setFlag("specimen3_solved");
    if (!ctx.hasFlag("specimen3_played")) ctx.setFlag("specimen3_played");
    playedNow[2] = true;
    buildTerminal(layer, ctx);
  }

  function unmount() {
    currentView  = "home";
    selectedSpec = null;
    selectedSlot = null;
    tileOrders   = null;
    playedNow    = [false, false, false];
  }

  Engine.registerCloseupController("scilab_specimen_terminal", { mount, unmount });
})();
