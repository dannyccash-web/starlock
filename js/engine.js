/* ============================================================
   STARLOCK - SCENE ENGINE
   ------------------------------------------------------------
   - Renders the current wall (base plate + sprites + hot spots)
   - Handles turn-arrow navigation between walls of a room
   - Handles hot-spot clicks, including item gating
   - Handles close-up zoom views with their own hot spots
   - Tracks game state flags used by showIf/hideIf and actions
   ============================================================ */

const Engine = (() => {
  const plateEl     = document.getElementById("scene-plate");
  const spriteEl    = document.getElementById("sprite-layer");
  const hotspotEl   = document.getElementById("hotspot-layer");
  const atmoEl      = document.getElementById("atmosphere-layer");
  const messageEl   = document.getElementById("message-bar");
  const closeupEl   = document.getElementById("closeup");
  const closeupImg  = document.getElementById("closeup-image");
  const closeupHs   = document.getElementById("closeup-hotspots");
  const closeupHtml = document.getElementById("closeup-html");
  const closeupBack = document.getElementById("closeup-back");
  const closeupDown = document.getElementById("closeup-down");
  const arrowLeft   = document.getElementById("arrow-left");
  const arrowRight  = document.getElementById("arrow-right");
  const debugBadge  = document.getElementById("debug-badge");

  const state = {
    flags: new Set(),
    currentRoom: "cryo",
    currentWall: 0,
    activeCloseup: null,
    debug: false,
  };

  /* ----- Game state flag helpers ----- */
  const hasFlag = (f) => state.flags.has(f);
  const setFlag = (f) => state.flags.add(f);
  // Visibility predicate: pass {all:[],any:[],none:[]}
  function check(cond) {
    if (!cond) return true;
    if (cond.all && !cond.all.every(hasFlag)) return false;
    if (cond.any && !cond.any.some(hasFlag)) return false;
    if (cond.none && cond.none.some(hasFlag)) return false;
    return true;
  }

  /* ----- Message bar -----
     Messages typewrite in via the Typewriter module (which also
     plays the looping typewriter SFX while it's animating). The
     auto-hide timer starts AFTER the typing finishes so the player
     always gets to read the full message. The duration arg here
     refers to how long to keep the message on screen *after* it
     finishes typing. */
  let msgTimer = null;
  function showMessage(text, duration = 3500) {
    if (!text) return;
    messageEl.classList.add("show");
    clearTimeout(msgTimer);
    Typewriter.type(messageEl, text).then(() => {
      clearTimeout(msgTimer);
      msgTimer = setTimeout(
        () => messageEl.classList.remove("show"),
        duration
      );
    });
  }

  /* ----- Render the current wall ----- */
  function renderWall() {
    const room = STARLOCK_DATA.ROOMS[state.currentRoom];
    const wall = room.walls[state.currentWall];

    // Base plate
    plateEl.innerHTML = "";
    if (wall.plate) {
      plateEl.style.backgroundImage = `url('${wall.plate}')`;
      plateEl.classList.remove("placeholder-plate");
    } else {
      plateEl.style.backgroundImage = "none";
      plateEl.classList.add("placeholder-plate");
      const label = document.createElement("div");
      label.className = "placeholder-label";
      label.innerHTML = `${wall.placeholderLabel || "WALL"}<span class="placeholder-sub">art not yet generated</span>`;
      plateEl.appendChild(label);
    }
    plateEl.dataset.atmosphere = wall.atmosphere || "";

    // Atmosphere overlay
    atmoEl.className = "atmosphere-layer vignette";

    // Sprites (visible based on showIf/hideIf)
    spriteEl.innerHTML = "";
    (wall.sprites || []).forEach((sp) => {
      if (!visibleByFlags(sp)) return;
      const div = document.createElement("div");
      div.className = "sprite";
      div.style.backgroundImage = `url('${sp.image}')`;
      div.style.left   = sp.x + "px";
      div.style.top    = sp.y + "px";
      div.style.width  = sp.w + "px";
      div.style.height = sp.h + "px";
      spriteEl.appendChild(div);
    });

    // Hot spots
    hotspotEl.innerHTML = "";
    (wall.hotspots || []).forEach((hs) => {
      if (!visibleByFlags(hs)) return;
      const btn = makeHotspot(hs, () => handleAction(hs));
      hotspotEl.appendChild(btn);
    });

    // Overlays — small non-interactive visual indicators (e.g. LED dots).
    // Defined as wall.overlays[]. Each has { id, x, y, dotClass, showIf?, hideIf? }.
    (wall.overlays || []).forEach((ov) => {
      if (!visibleByFlags(ov)) return;
      const dot = document.createElement("div");
      dot.className = ov.dotClass || "reader-dot";
      dot.style.left = ov.x + "px";
      dot.style.top  = ov.y + "px";
      dot.style.pointerEvents = "none";
      hotspotEl.appendChild(dot);
    });

    // Arrows (always enabled in this build, since each room is a 4-wall ring)
    arrowLeft.disabled  = room.walls.length <= 1;
    arrowRight.disabled = room.walls.length <= 1;
  }

  function visibleByFlags(obj) {
    return check({ all: obj.showIf?.all, any: obj.showIf?.any, none: obj.showIf?.none })
        && (!obj.hideIf || !check({ all: obj.hideIf?.all, any: obj.hideIf?.any, none: obj.hideIf?.none }));
  }

  function makeHotspot(hs, onClick) {
    const btn = document.createElement("button");
    btn.className = "hotspot";
    btn.type = "button";
    btn.dataset.label = hs.label || hs.id;
    if (hs.shape === "rect") {
      const [x, y, w, h] = hs.geom;
      btn.style.left = x + "px";
      btn.style.top  = y + "px";
      btn.style.width  = w + "px";
      btn.style.height = h + "px";
    } else if (hs.shape === "poly") {
      // For polygons, use a clip-path on a wrapper rect. (Future work.)
      const [x, y, w, h] = hs.bbox || [0, 0, 1920, 1080];
      btn.style.left = x + "px";
      btn.style.top  = y + "px";
      btn.style.width  = w + "px";
      btn.style.height = h + "px";
    }
    btn.addEventListener("click", (e) => { e.stopPropagation(); onClick(); });
    return btn;
  }

  /* ----- Action dispatch -----
     Action types:
       message     - show the message text
       setState    - set one or more flags, optionally show a message
       pickup      - add item to inventory, set flags, show message
       useItem     - if equipped item is in `accepts`, run onAccept;
                     otherwise run onReject
       openCloseup - load a close-up view by id
  */
  function handleAction(hs) {
    const a = hs.action;
    if (!a) return;

    // Allow hot spot to require an equipped item before any action runs.
    if (a.requires && Inventory.getEquipped() !== a.requires) {
      showMessage(a.requireMessage || "You need to equip the right item first.");
      return;
    }

    switch (a.type) {
      case "message":
        showMessage(a.message);
        break;

      case "setState":
        (a.flags || []).forEach(setFlag);
        if (a.message) showMessage(a.message);
        renderActive();
        break;

      case "pickup":
        Inventory.addItem(a.item);
        (a.flags || []).forEach(setFlag);
        if (a.message) showMessage(a.message);
        showPickupNotification(a.item);
        renderActive();
        break;

      case "useItem": {
        const eq = Inventory.getEquipped();
        if (eq && (a.accepts || []).includes(eq)) {
          (a.onAccept?.flags || []).forEach(setFlag);
          if (a.onAccept?.addItem) {
            Inventory.addItem(a.onAccept.addItem);
            showPickupNotification(a.onAccept.addItem);
          }
          if (a.onAccept?.message) showMessage(a.onAccept.message);
          if (a.onAccept?.consume) Inventory.removeItem(eq);
        } else {
          if (a.onReject?.message) showMessage(a.onReject.message);
        }
        renderActive();
        break;
      }

      case "openCloseup":
        if (a.message) showMessage(a.message);
        openCloseup(a.target);
        break;

      default:
        console.warn("Unknown action type:", a.type, hs);
    }
  }

  /* ----- Close-ups -----
     Two flavours:
       - Standard image close-up: rectangular hotspots authored in
         stage coords are mounted on #closeup-hotspots.
       - HTML close-up (kind: "html"): a registered controller mounts
         a custom interactive UI into #closeup-html. The bottom-center
         down-arrow becomes the player's exit; the top-left "Back"
         button is hidden via the .html-mode class. */
  const closeupControllers = {}; // id -> { mount(layer, ctx) }
  function registerCloseupController(id, controller) {
    closeupControllers[id] = controller;
  }
  function openCloseup(id) {
    const c = STARLOCK_DATA.CLOSEUPS[id];
    if (!c) { console.warn("Unknown closeup", id); return; }
    state.activeCloseup = id;
    closeupImg.src = c.image;
    closeupHs.innerHTML = "";
    closeupHtml.innerHTML = "";

    if (c.kind === "html") {
      // HTML close-up: hand off rendering to the controller.
      closeupEl.classList.add("html-mode");
      closeupDown.classList.remove("hidden");
      closeupHtml.classList.add("active");
      const ctrl = closeupControllers[c.controller];
      if (ctrl && typeof ctrl.mount === "function") {
        ctrl.mount(closeupHtml, {
          hasFlag,
          setFlag,
          showMessage,
          renderActive,
          closeCloseup,
        });
      } else {
        console.warn("No controller registered for HTML closeup:", c.controller);
      }
    } else {
      // Image close-up with hotspots.
      closeupEl.classList.remove("html-mode");
      closeupDown.classList.add("hidden");
      closeupHtml.classList.remove("active");
      (c.hotspots || []).forEach((hs) => {
        if (!visibleByFlags(hs)) return;
        const btn = makeHotspot(hs, () => handleAction(hs));
        closeupHs.appendChild(btn);
      });
    }

    closeupEl.classList.remove("hidden");
    if (state.debug) hotspotEl.classList.add("debug"), closeupHs.classList.add("debug");

    // Typewriter the "Back" label the first time the closeup is opened,
    // so its text feels like it's coming through the same terminal as
    // every other in-game string.
    if (closeupBack && closeupBack.dataset.twText) {
      Typewriter.typeOnce(closeupBack, closeupBack.dataset.twText, { speed: 28 });
    }
  }
  function closeCloseup() {
    // Give the active HTML controller a chance to reset its
    // internal view state (e.g., terminal back-to-list) before
    // we tear down the DOM.
    if (state.activeCloseup) {
      const c = STARLOCK_DATA.CLOSEUPS[state.activeCloseup];
      if (c && c.kind === "html") {
        const ctrl = closeupControllers[c.controller];
        if (ctrl && typeof ctrl.unmount === "function") ctrl.unmount();
      }
    }
    state.activeCloseup = null;
    closeupEl.classList.add("hidden");
    closeupEl.classList.remove("html-mode");
    closeupDown.classList.add("hidden");
    closeupHtml.classList.remove("active");
    closeupHtml.innerHTML = "";
  }
  closeupBack.addEventListener("click", closeCloseup);
  closeupDown.addEventListener("click", closeCloseup);

  /* ----- Item pickup notification -----
     Briefly shows the picked-up item's icon + name on screen so the
     player gets immediate visual confirmation of what's now in their
     inventory. Fades in, holds for ~2.5 s, then fades out. */
  const stageEl = document.getElementById("stage");
  function showPickupNotification(itemId) {
    const def = STARLOCK_DATA.ITEMS[itemId];
    if (!def) return;

    // Remove any toast that's still visible from a previous pickup.
    const old = document.getElementById("item-pickup-toast");
    if (old) old.remove();

    const toast = document.createElement("div");
    toast.id = "item-pickup-toast";
    toast.className = "item-pickup-toast";
    toast.innerHTML = `
      <div class="ipt-icon" style="background-image:url('${def.icon}')"></div>
      <div class="ipt-label">Item found</div>
      <div class="ipt-name">${def.name}</div>
    `;
    stageEl.appendChild(toast);

    // Trigger CSS transition on next frame.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add("show"));
    });

    setTimeout(() => {
      toast.classList.remove("show");
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 600);
    }, 2800);
  }

  /* ----- Re-render whatever is currently on screen (after state change) ----- */
  function renderActive() {
    if (state.activeCloseup) {
      // Re-open to refresh hot-spot visibility.
      openCloseup(state.activeCloseup);
    } else {
      renderWall();
    }
    if (state.debug) hotspotEl.classList.add("debug");
  }

  /* ----- Turn navigation (ring of walls) ----- */
  function turn(delta) {
    const room = STARLOCK_DATA.ROOMS[state.currentRoom];
    const n = room.walls.length;
    state.currentWall = (state.currentWall + delta + n) % n;
    renderWall();
  }
  arrowLeft.addEventListener("click", () => turn(-1));
  arrowRight.addEventListener("click", () => turn(+1));

  /* ----- Debug toggle (D key) ----- */
  document.addEventListener("keydown", (e) => {
    if (e.key === "d" || e.key === "D") {
      state.debug = !state.debug;
      hotspotEl.classList.toggle("debug", state.debug);
      closeupHs.classList.toggle("debug", state.debug);
      debugBadge.classList.toggle("hidden", !state.debug);
    }
    if (e.key === "Escape" && state.activeCloseup) closeCloseup();
    if (e.key === "ArrowLeft" && !state.activeCloseup)  turn(-1);
    if (e.key === "ArrowRight" && !state.activeCloseup) turn(+1);
  });

  /* ----- Boot a room ----- */
  function startRoom(roomId) {
    state.currentRoom = roomId;
    state.currentWall = STARLOCK_DATA.ROOMS[roomId].startWall || 0;
    renderWall();
  }

  return {
    startRoom,
    showMessage,
    showPickupNotification,
    setFlag,
    hasFlag,
    registerCloseupController,
    _state: state, // for debugging in console
  };
})();
