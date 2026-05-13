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

   TONE LEVELS  (0 = highest, 2 = lowest)
     0 → 880 Hz   1 → 659 Hz   2 → 440 Hz
   ============================================================ */

(function () {

  /* ── Panel dimensions ── */
  const ST_LEFT   = 319;
  const ST_TOP    = 192;
  const ST_WIDTH  = 1334;
  const ST_HEIGHT = 597;

  /* ── Tone table (3 tones only, 0 = high, 2 = low) ── */
  const TONE_Y    = [0.20, 0.50, 0.80];
  const TONE_FREQ = [880,  659,  440 ];

  /* ── Specimen data ── */
  // Tiles use tones 0 (high/880Hz), 1 (mid/659Hz), 2 (low/440Hz).
  // Solution: any arrangement where tile[n].t2 === tile[n+1].t1 for all n.
  // startOrder: scrambled indices shown on first open.
  const SPECIMENS = [
    {
      id: "specimen1", label: "SPECIMEN 1",
      solvedFlag: "specimen1_solved", playedFlag: "specimen1_played", activeFlag: "specimen1_active",
      activateMsg: null,
      introText:
        "I am confident I have isolated the correct set of tones for Specimen 1. " +
        "The specimen responds to audio stimuli more readily than the others — its " +
        "structure visibly shifts when specific frequencies are applied. The tones " +
        "must be played in the correct sequence. Play and confirm before activating.",
      // Chain solved by [0,1,2,3,4,5,6]:
      //   (0,1)→(1,2)→(2,0)→(0,2)→(2,1)→(1,0)→(0,2)  all t2=next t1 ✓
      tiles: [
        { id: 0, t1: 0, t2: 1 },
        { id: 1, t1: 1, t2: 2 },
        { id: 2, t1: 2, t2: 0 },
        { id: 3, t1: 0, t2: 2 },
        { id: 4, t1: 2, t2: 1 },
        { id: 5, t1: 1, t2: 0 },
        { id: 6, t1: 0, t2: 2 },
      ],
      startOrder: [3, 6, 1, 5, 0, 4, 2],
    },
    {
      id: "specimen2", label: "SPECIMEN 2",
      solvedFlag: "specimen2_solved", playedFlag: "specimen2_played", activeFlag: "specimen2_active",
      activateMsg: null,
      introText:
        "Specimen 2 is considerably more complex than the first. I am detecting " +
        "more distinct tonal relationships, and their order is less obvious on " +
        "initial analysis. Three sessions to isolate the individual components — " +
        "I believe the set is complete. The sequencing logic follows from Specimen 1. " +
        "Work carefully.",
      // Chain solved by [0,1,2,3,4,5,6,7,8,9]:
      //   (0,1)→(1,2)→(2,0)→(0,1)→(1,0)→(0,2)→(2,1)→(1,2)→(2,2)→(2,0)  all t2=next t1 ✓
      tiles: [
        { id: 0, t1: 0, t2: 1 },
        { id: 1, t1: 1, t2: 2 },
        { id: 2, t1: 2, t2: 0 },
        { id: 3, t1: 0, t2: 1 },
        { id: 4, t1: 1, t2: 0 },
        { id: 5, t1: 0, t2: 2 },
        { id: 6, t1: 2, t2: 1 },
        { id: 7, t1: 1, t2: 2 },
        { id: 8, t1: 2, t2: 2 },
        { id: 9, t1: 2, t2: 0 },
      ],
      startOrder: [5, 2, 8, 0, 7, 3, 9, 1, 6, 4],
    },
    {
      id: "specimen3", label: "SPECIMEN 3",
      solvedFlag: "specimen3_solved", playedFlag: "specimen3_played", activeFlag: "specimen3_active",
      activateMsg: null,
      preSolved: true,
      introText:
        "Finally. After weeks of careful observation I believe I have isolated the " +
        "correct tonal sequence for Specimen 3. What struck me was how quickly the " +
        "pattern revealed itself — as if the specimen wanted to be understood. I " +
        "confirmed the arrangement three times. Each time, correct. I have played " +
        "the sequence. The resonance is unlike anything I have recorded from the " +
        "other two. There is an almost musical quality to it. I am beginning " +
        "activation now. Initial response is unusual — the specimen is reacting far " +
        "more immediately than expected. The field readings are spiking and I can " +
        "see it moving toward the glass. I have never seen this level of — it's " +
        "coming through the seal. I need to — it's" +
        "\n\n" +
        "[LOG entry abruptly terminated]\n" +
        "⚠  EMERGENCY LOCKDOWN INITIATED  ⚠\n" +
        "BIOHAZARD PROTOCOL ENGAGED — SCIENCE LAB C SEALED",
      activateMsg: null,
      // Chain solved by [0,1,2,3,4]:
      //   (0,1)→(1,0)→(0,2)→(2,1)→(1,2)  all t2=next t1 ✓
      tiles: [
        { id: 0, t1: 0, t2: 1 },
        { id: 1, t1: 1, t2: 0 },
        { id: 2, t1: 0, t2: 2 },
        { id: 3, t1: 2, t2: 1 },
        { id: 4, t1: 1, t2: 2 },
      ],
      startOrder: [0, 1, 2, 3, 4],
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
  let playingNow   = [false, false, false];  // true while audio is in progress
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
    ln.setAttribute("stroke-linecap", "butt");  // no bleed past endpoints
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

  // Returns milliseconds until the last tone in the sequence finishes.
  function calcPlayDurationMs(specIdx) {
    const n = tileOrders[specIdx].length;
    const tLen = 0.36, tGap = 0.06, iGap = 0.14;
    const step = tLen + tGap + tLen + iGap;
    return Math.ceil((0.05 + (n - 1) * step + tLen + tGap + tLen + 0.35) * 1000);
  }

  /* ── Puzzle helpers ── */
  function isSolved(specIdx) {
    if (SPECIMENS[specIdx].preSolved) return true;
    const spec  = SPECIMENS[specIdx];
    const order = tileOrders[specIdx];
    for (let i = 0; i < order.length - 1; i++) {
      if (spec.tiles[order[i]].t2 !== spec.tiles[order[i + 1]].t1) return false;
    }
    return true;
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

  /* ── Text helpers ── */
  // Builds a <p class="st-para"> where \n becomes <br>.
  function buildPara(text) {
    const p = document.createElement("p");
    p.className = "st-para";
    text.split("\n").forEach((line, i) => {
      if (i > 0) p.appendChild(document.createElement("br"));
      p.appendChild(document.createTextNode(line));
    });
    return p;
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
          const metaText = solved ? "SEQUENCE VERIFIED" : "ANALYSIS INCOMPLETE";
          return el("button", {
            type: "button",
            class: "st-spec-row" + (active ? " st-spec-active" : ""),
            onclick: () => { currentView = "detail"; selectedSpec = i; ctx.renderActive(); },
          }, [
            el("div",  { class: "st-spec-info"   }, [
              el("span", { class: "st-spec-title" }, [spec.label]),
              el("span", { class: "st-spec-meta"  }, [metaText]),
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
      buildPara(spec.introText),
      buildPuzzle(spec, solved, hasPlayed),
      buildButtons(spec, ctx, solved, hasPlayed, canActivate, isActive),
    ]);
  }

  /* ── Tile puzzle ── */
  function buildPuzzle(spec, solved, hasPlayed) {
    const order    = tileOrders[selectedSpec];
    const verified = solved && hasPlayed;
    const canDrag  = !verified && !playingNow[selectedSpec];

    const tileRow = el("div", { class: "st-tile-row" }, []);
    order.forEach((tileIdx, slot) => {
      const tileEl = buildTile(spec, tileIdx, slot, verified);
      if (canDrag) {
        tileEl.addEventListener("mousedown", (e) => startDrag(e, slot, tileRow));
      }
      tileRow.appendChild(tileEl);
    });

    return el("div", { class: "st-puzzle-area" }, [
      tileRow,
      verified ? el("div", { class: "st-solved-badge" }, ["✓  SEQUENCE VERIFIED"]) : null,
    ]);
  }

  function buildTile(spec, tileIdx, slot, solved) {
    const tile = spec.tiles[tileIdx];
    const W = 120, H = 120;
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
    svg.setAttribute("preserveAspectRatio", "none");  // stretch to fill tile exactly
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
    const isPlaying   = playingNow[selectedSpec];
    const verified    = solved && hasPlayed;
    let playLabel;
    if (isPlaying)     playLabel = "▶  PLAYING...";
    else if (verified) playLabel = "▶  REPLAY SEQUENCE";
    else               playLabel = "▶  PLAY SEQUENCE";

    const playBtn = el("button", {
      type: "button",
      class: "st-btn st-play-btn" + (verified ? " played" : ""),
      disabled: isPlaying,
      onclick: () => {
        const si = selectedSpec;
        playSequence(si);
        if (solved && !playedNow[si]) {
          // Mark playing; after audio finishes mark verified and re-render
          playingNow[si] = true;
          ctx.renderActive();
          setTimeout(() => {
            playedNow[si]  = true;
            playingNow[si] = false;
            if (_ctx) {
              _ctx.setFlag(spec.playedFlag);
              _ctx.renderActive();
            }
          }, calcPlayDurationMs(si));
        } else {
          ctx.renderActive();
        }
      },
    }, [playLabel]);

    let actClass = "st-btn st-activate-btn";
    if (isActive)       actClass += " activated";
    else if (canActivate) actClass += " ready";

    const actBtn = el("button", {
      type: "button", class: actClass,
      disabled: !canActivate && !isActive,
      onclick: canActivate ? () => {
        ctx.setFlag(spec.activeFlag);
        ctx.closeCloseup();
        ctx.renderActive();
      } : null,
    }, [isActive ? "STASIS RELEASED" : "RELEASE STASIS"]);

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
    playingNow   = [false, false, false];
    dragInfo     = null;
    _ctx         = null;
    // Clean up any stale drag listeners
    document.removeEventListener("mousemove", () => {});
    document.removeEventListener("mouseup",   () => {});
  }

  Engine.registerCloseupController("scilab_specimen_terminal", { mount, unmount });
})();
