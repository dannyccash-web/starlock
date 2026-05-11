/* ============================================================
   STARLOCK - SCIENCE LAB SPECIMEN TERMINAL CONTROLLER
   ------------------------------------------------------------
   Backs the "scilab_specimen_terminal" HTML close-up.
   Close-up image: Images/closeups/Science Lab 3 Terminal.png

   LAYOUT (1920×1080 stage pixels)
     x=319  y=192  w=1334  h=597

   NAVIGATION
     "home"   — intro paragraph + specimen list rows
     "detail" — back button + status + notes + puzzle + buttons

   TONE PUZZLE VISUAL
     Each tile has two horizontal bars:
       Tone 1  — left half  of tile, at vertical position TONE_Y[t1]
       Tone 2  — right half of tile, at vertical position TONE_Y[t2]
     When the sequence is correct, the Tone 2 bar of tile N and the
     Tone 1 bar of tile N+1 sit at the same height — they visually
     connect at the tile boundary.

   INTERACTION
     Click-and-drag tiles horizontally. Other tiles smoothly slide
     open a gap to indicate where the dragged tile will land.

   AUDIO
     On Play: each tile sounds tone1 (0.36s) then tone2 (0.36s),
     with a small gap between tiles. Gain 0.65 with soft envelope.

   TONE LEVELS  (0 = highest, 5 = lowest)
     0 → 880 Hz   1 → 784 Hz   2 → 659 Hz
     3 → 587 Hz   4 → 494 Hz   5 → 440 Hz
   ============================================================ */

(function () {

  /* ── Panel dimensions ── */
  const ST_LEFT   = 319;
  const ST_TOP    = 192;
  const ST_WIDTH  = 1334;
  const ST_HEIGHT = 597;

  /* ── Tone table ── */
  const TONE_Y    = [0.14, 0.28, 0.43, 0.57, 0.71, 0.85];
  const TONE_FREQ = [880,  784,  659,  587,  494,  440 ];

  /* ── Specimen data ── */
  // Solution order: tile[n].t2 === tile[n+1].t1 for all n.
  // startOrder: scrambled indices shown on first open.
  const SPECIMENS = [
    {
      id: "specimen1", label: "SPECIMEN 1",
      solvedFlag: "specimen1_solved", playedFlag: "specimen1_played", activeFlag: "specimen1_active",
      statusMeta: "5-TILE SEQUENCE · ANALYSIS INCOMPLETE",
      introText:
        "I am confident I have isolated the correct set of tones for Specimen 1. " +
        "The specimen responds to audio stimuli more readily than the others — its " +
        "structure visibly shifts when specific frequencies are applied. Each tile " +
        "carries two tones. The second tone of each tile must match the first tone " +
        "of the tile to its right. Drag the tiles into the correct order, then play " +
        "the sequence to confirm before activating.",
      activateMsg:
        "The containment field shifts frequency. Specimen 1 rises slowly from the " +
        "desk, its translucent squares catching the emergency light. It's active.",
      // Chain: t2→t1: 3→3, 1→1, 4→4, 2→2  ✓
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
      id: "specimen2", label: "SPECIMEN 2",
      solvedFlag: "specimen2_solved", playedFlag: "specimen2_played", activeFlag: "specimen2_active",
      statusMeta: "7-TILE SEQUENCE · ANALYSIS INCOMPLETE",
      introText:
        "Specimen 2 is considerably more complex than the first. I am detecting " +
        "more distinct tonal frequencies, and their relationships are less obvious " +
        "on initial analysis. Three sessions to isolate the individual tones; I " +
        "believe the set is complete. The sequencing logic is identical to Specimen " +
        "1 — each tile's second tone must match the first tone of the tile to its " +
        "right. There are simply more tiles to order. Work carefully.",
      activateMsg:
        "The containment field hums at a higher register. Specimen 2 rises from " +
        "the desk, its structure pulsing with a faint blue luminescence. It's active.",
      // Chain: t2→t1: 4→4, 2→2, 5→5, 1→1, 3→3, 0→0  ✓
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
      id: "specimen3", label: "SPECIMEN 3",
      solvedFlag: "specimen3_solved", playedFlag: "specimen3_played", activeFlag: "specimen3_active",
      statusMeta: "3-TILE SEQUENCE · SEQUENCE VERIFIED",
      preSolved: true,
      introText:
        "I have to note something about Specimen 3. The tonal sequence was — " +
        "immediate. I sat down to begin the analysis and found myself arranging " +
        "the tiles before I had consciously worked through the logic. I verified " +
        "the result twice. It was correct both times. The specimen seemed almost " +
        "to want me to solve it. There was a clarity I cannot account for. I have " +
        "already played the sequence. I am activating it now.",
      activateMsg: null,
      // Chain: t2→t1: 3→3, 0→0  ✓
      tiles: [
        { id: 0, t1: 1, t2: 3 },
        { id: 1, t1: 3, t2: 0 },
        { id: 2, t1: 0, t2: 2 },
      ],
      startOrder: [0, 1, 2],
    },
  ];

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
  let selectedSpec = null;
  let tileOrders   = null;
  let playedNow    = [false, false, false];
  let _ctx         = null;   // set in mount; used by drag callbacks

  function initOrders(ctx) {
    tileOrders = SPECIMENS.map((s) =>
      (s.preSolved || ctx.hasFlag(s.solvedFlag))
        ? s.tiles.map((_, i) => i)
        : [...s.startOrder]
    );
  }

  /* ── DOM helper ── */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === "class")  node.className = attrs[k];
        else if (k === "style" && typeof attrs[k] === "object") Object.assign(node.style, attrs[k]);
        else if (k.startsWith("on") && typeof attrs[k] === "function")
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else if (k === "disabled") { if (attrs[k]) node.setAttribute("disabled", ""); }
        else if (attrs[k] === true)  node.setAttribute(k, "");
        else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k]);
      }
    }
    (children || []).forEach((c) => {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  /* ── SVG helper ── */
  const NS = "http://www.w3.org/2000/svg";
  function mkLine(x1, y1, x2, y2, stroke, strokeW) {
    const ln = document.createElementNS(NS, "line");
    ln.setAttribute("x1", x1); ln.setAttribute("y1", y1);
    ln.setAttribute("x2", x2); ln.setAttribute("y2", y2);
    ln.setAttribute("stroke", stroke);
    ln.setAttribute("stroke-width", strokeW);
    ln.setAttribute("stroke-linecap", "square");
    return ln;
  }

  /* ── Audio ── */
  let _actx = null;
  function getACtx() {
    if (!_actx) _actx = new (window.AudioContext || window.webkitAudioContext)();
    return _actx;
  }
  function playTone(freq, t0, dur) {
    try {
      const ctx = getACtx();
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.65, t0 + 0.03);
      gain.gain.setValueAtTime(0.65, t0 + dur - 0.04);
      gain.gain.linearRampToValueAtTime(0, t0 + dur);
      osc.start(t0); osc.stop(t0 + dur + 0.01);
    } catch (_) {}
  }
  function playSequence(specIdx) {
    try {
      const spec = SPECIMENS[specIdx], order = tileOrders[specIdx];
      const ctx = getACtx(), now = ctx.currentTime + 0.05;
      const tLen = 0.36, tGap = 0.06, iGap = 0.14;
      const step = tLen + tGap + tLen + iGap;
      order.forEach((ti, i) => {
        playTone(TONE_FREQ[spec.tiles[ti].t1], now + i * step, tLen);
        playTone(TONE_FREQ[spec.tiles[ti].t2], now + i * step + tLen + tGap, tLen);
      });
    } catch (_) {}
  }

  /* ── Puzzle helpers ── */
  function isSolved(specIdx) {
    if (SPECIMENS[specIdx].preSolved) return true;
    return tileOrders[specIdx].every((ti, slot) => ti === slot);
  }

  /* ── Drag-and-drop ── */
  // Tiles use CSS transform to animate without layout reflow.
  // dragInfo is set during an active drag and cleared on mouseup.
  let dragInfo = null;

  function startDrag(e, slot, tileRowEl) {
    if (!_ctx) return;
    e.preventDefault();

    const tiles  = Array.from(tileRowEl.querySelectorAll(".st-tile"));
    const rects  = tiles.map((t) => t.getBoundingClientRect());
    const tileW  = rects[slot].width;
    const gap    = 3;   // matches CSS gap

    dragInfo = { slot, tileW, gap, rects, insertAt: slot };

    // Visual: dragged tile goes semi-transparent and lifts
    tiles[slot].classList.add("st-dragging");
    tiles[slot].style.zIndex = "10";
    tiles[slot].style.transition = "none";

    function onMove(e) {
      if (!dragInfo) return;
      const dx  = e.clientX - rects[slot].left - tileW / 2;
      const cx  = e.clientX;

      // Snap the dragged tile to follow cursor
      tiles[slot].style.transform = `translateX(${dx}px)`;

      // Calculate insert position: count non-dragged tile centres left of cursor
      let insert = 0;
      for (let i = 0; i < rects.length; i++) {
        if (i === slot) continue;
        if (rects[i].left + rects[i].width / 2 < cx) insert++;
      }
      dragInfo.insertAt = insert;

      // Slide other tiles to open/close the gap
      const step = tileW + gap;
      tiles.forEach((tile, i) => {
        if (i === slot) return;
        let shift = 0;
        if (insert < slot  && i >= insert && i < slot)  shift =  step;
        if (insert > slot  && i > slot   && i <= insert) shift = -step;
        tile.style.transition = "transform 140ms ease";
        tile.style.transform  = `translateX(${shift}px)`;
      });
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
      if (!dragInfo) return;

      const { slot, insertAt } = dragInfo;

      // Commit reorder
      if (slot !== insertAt) {
        const order = tileOrders[selectedSpec];
        const moved = order.splice(slot, 1)[0];
        order.splice(insertAt, 0, moved);
      }

      // Reset transforms before re-render
      tiles.forEach((t) => {
        t.style.transform  = "";
        t.style.transition = "";
        t.style.zIndex     = "";
        t.classList.remove("st-dragging");
      });
      dragInfo = null;
      _ctx.renderActive();
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  }

  /* ── Build terminal ── */
  function buildTerminal(layer, ctx) {
    _ctx = ctx;
    layer.innerHTML = "";
    layer.appendChild(el("div", {
      class: "st-terminal",
      style: {
        position: "absolute",
        left: ST_LEFT + "px", top: ST_TOP + "px",
        width: ST_WIDTH + "px", height: ST_HEIGHT + "px",
        overflow: "hidden",
      },
    }, [
      buildHeader(ctx),
      currentView === "home" ? buildHome(ctx) : buildDetail(ctx),
    ]));
  }

  function buildHeader(ctx) {
    if (currentView === "detail") {
      return el("header", { class: "ct-header" }, [
        el("button", { type: "button", class: "ct-back-btn",
          onclick: () => { currentView = "home"; ctx.renderActive(); },
        }, ["❮  SPECIMENS"]),
        el("span", { class: "ct-subtitle" }, [SPECIMENS[selectedSpec].label]),
      ]);
    }
    return el("header", { class: "ct-header" }, [
      el("span", { class: "ct-title"    }, ["SPECIMEN TERMINAL"]),
      el("span", { class: "ct-subtitle" }, ["VANCE, DR. · SCIENCE OFFICER"]),
    ]);
  }

  function buildHome(ctx) {
    return el("div", { class: "st-home" }, [
      el("p", { class: "st-para" }, [INTRO]),
      el("div", { class: "st-spec-list" },
        SPECIMENS.map((spec, i) => {
          const active  = ctx.hasFlag(spec.activeFlag);
          const solved  = isSolved(i) || ctx.hasFlag(spec.solvedFlag);
          const status  = active ? "ACTIVE" : (solved ? "SOLVED" : "STASIS");
          return el("button", {
            type: "button",
            class: "st-spec-row" + (active ? " st-spec-active" : ""),
            onclick: () => { currentView = "detail"; selectedSpec = i; ctx.renderActive(); },
          }, [
            el("span", { class: "st-spec-num"    }, [spec.label]),
            el("div",  { class: "st-spec-info"   }, [
              el("span", { class: "st-spec-title" }, [spec.label]),
              el("span", { class: "st-spec-meta"  }, [spec.statusMeta]),
            ]),
            el("span", { class: "st-spec-status" }, [status]),
            el("span", { class: "ct-pod-chevron" }, ["❯"]),
          ]);
        })
      ),
    ]);
  }

  function buildDetail(ctx) {
    const spec       = SPECIMENS[selectedSpec];
    const isActive   = ctx.hasFlag(spec.activeFlag);
    const solved     = isSolved(selectedSpec) || ctx.hasFlag(spec.solvedFlag);
    const hasPlayed  = playedNow[selectedSpec] || ctx.hasFlag(spec.playedFlag) || !!spec.preSolved;
    const canActivate = solved && hasPlayed && !isActive;

    if (solved && !spec.preSolved && !ctx.hasFlag(spec.solvedFlag)) ctx.setFlag(spec.solvedFlag);

    return el("div", { class: "st-detail" }, [
      el("div", { class: "st-status-row" }, [
        el("span", { class: "st-status-label" }, ["STATUS:"]),
        el("span", { class: "st-status-badge " + (isActive ? "st-status-active" : "st-status-stasis") },
          [isActive ? "ACTIVE" : "EMERGENCY STASIS"]),
      ]),
      el("p", { class: "st-para" }, [spec.introText]),
      buildPuzzle(spec, solved, ctx),
      buildButtons(spec, ctx, solved, hasPlayed, canActivate, isActive),
    ]);
  }

  /* ── Tile puzzle ── */
  function buildPuzzle(spec, solved, ctx) {
    const order = tileOrders[selectedSpec];

    const tileRow = el("div", { class: "st-tile-row" }, []);
    order.forEach((tileIdx, slot) => {
      const tileEl = buildTile(spec, tileIdx, slot, solved);
      if (!solved) {
        tileEl.addEventListener("mousedown", (e) => startDrag(e, slot, tileRow));
      }
      tileRow.appendChild(tileEl);
    });

    return el("div", { class: "st-puzzle-area" }, [
      tileRow,
      solved ? el("div", { class: "st-solved-badge" }, ["✓  SEQUENCE VERIFIED"]) : null,
    ]);
  }

  function buildTile(spec, tileIdx, slot, solved) {
    const tile = spec.tiles[tileIdx];
    const W = 120, H = 90;
    const y1 = TONE_Y[tile.t1] * H;   // Tone 1 — left half
    const y2 = TONE_Y[tile.t2] * H;   // Tone 2 — right half
    const HW = W / 2;                  // half-width split point

    const baseColour = solved ? "#6cffae" : "rgba(108,208,255,0.88)";
    const glowColour = solved ? "rgba(108,255,174,0.32)" : "rgba(108,208,255,0.18)";
    const strokeW    = solved ? 6 : 5;

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width",  "100%");
    svg.setAttribute("height", "100%");
    svg.classList.add("st-tile-svg");

    // Glow under each bar
    svg.appendChild(mkLine(0,  y1, HW, y1, glowColour, 14));
    svg.appendChild(mkLine(HW, y2, W,  y2, glowColour, 14));
    // Main bars
    svg.appendChild(mkLine(0,  y1, HW, y1, baseColour, strokeW));  // Tone 1 (left)
    svg.appendChild(mkLine(HW, y2, W,  y2, baseColour, strokeW));  // Tone 2 (right)

    const btn = el("button", {
      type:  "button",
      class: "st-tile" + (solved ? " solved" : ""),
      "aria-label": `Tone tile ${slot + 1}`,
    }, []);
    btn.appendChild(svg);
    return btn;
  }

  /* ── Buttons ── */
  function buildButtons(spec, ctx, solved, hasPlayed, canActivate, isActive) {
    const playBtn = el("button", {
      type: "button",
      class: "st-btn st-play-btn" + (solved && hasPlayed ? " played" : ""),
      onclick: () => {
        playSequence(selectedSpec);
        if (solved) { playedNow[selectedSpec] = true; ctx.setFlag(spec.playedFlag); }
        ctx.renderActive();
      },
    }, [solved && hasPlayed ? "▶  REPLAY SEQUENCE" : "▶  PLAY SEQUENCE"]);

    let actClass = "st-btn st-activate-btn";
    if (isActive) actClass += " activated";
    else if (canActivate) actClass += " ready";

    const actBtn = el("button", {
      type: "button", class: actClass,
      disabled: !canActivate && !isActive,
      onclick: canActivate ? () => {
        ctx.setFlag(spec.activeFlag);
        ctx.closeCloseup();
        ctx.renderActive();
        ctx.showMessage(
          spec.activateMsg ||
          "The containment field activates. The chamber reads empty. " +
          "Specimen 3 is not in storage. It is not here."
        );
      } : null,
    }, [isActive ? "SPECIMEN ACTIVE" : "ACTIVATE"]);

    return el("div", { class: "st-btn-row" }, [playBtn, actBtn]);
  }

  /* ── Mount / unmount ── */
  function mount(layer, ctx) {
    _ctx = ctx;
    if (!tileOrders) initOrders(ctx);
    if (!ctx.hasFlag("specimen3_solved")) ctx.setFlag("specimen3_solved");
    if (!ctx.hasFlag("specimen3_played")) ctx.setFlag("specimen3_played");
    playedNow[2] = true;
    buildTerminal(layer, ctx);
  }

  function unmount() {
    currentView  = "home";
    selectedSpec = null;
    tileOrders   = null;
    playedNow    = [false, false, false];
    dragInfo     = null;
    _ctx         = null;
    // Clean up any stale drag listeners
    document.removeEventListener("mousemove", () => {});
    document.removeEventListener("mouseup",   () => {});
  }

  Engine.registerCloseupController("scilab_specimen_terminal", { mount, unmount });
})();
