/* ============================================================
   INVENTORY
   - addItem(itemId)        : add an item to the player's inventory
   - hasItem(itemId)        : query
   - removeItem(itemId)     : consume an item (e.g., one-time-use)
   - equip(itemId | null)   : sets the currently-equipped item;
                              cursor over the scene becomes that icon.
                              Pass null to unequip.
   - getEquipped()          : currently-equipped item id or null

   Renders into #inventory. Click a slot to toggle equipped.
   Click the equipped slot again, or hit Escape, to unequip.
   ============================================================ */

const Inventory = (() => {
  const slotsEl   = document.getElementById("inventory");
  const stageEl   = document.getElementById("stage");
  const closeupEl = document.getElementById("closeup");

  const state = {
    items: [],         // ordered list of itemIds
    equipped: null,    // itemId or null
  };

  /* ----- Canvas-based cursor builder -----
     Browsers cap cursor images at ~128 px; oversized icons are silently
     ignored and the browser falls back to its default pointer. For items
     with a dedicated small cursor image (def.cursor) we use it directly.
     For everything else we draw the icon onto a canvas and pass the
     resulting data-URL — guaranteed to be accepted no matter how large
     the original icon is. Pass `size` to override the default 48×48. */
  function _buildCursorDataUrl(src, size) {
    return new Promise((resolve) => {
      const SIZE = size || 48;
      const img  = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = SIZE; canvas.height = SIZE;
          const ctx    = canvas.getContext("2d");
          const ratio  = Math.min(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
          const w = Math.round(img.naturalWidth  * ratio);
          const h = Math.round(img.naturalHeight * ratio);
          ctx.drawImage(img, Math.round((SIZE - w) / 2), Math.round((SIZE - h) / 2), w, h);
          resolve({ dataUrl: canvas.toDataURL("image/png"), size: SIZE });
        } catch (e) {
          resolve({ dataUrl: src, size: SIZE });   // CORS / taint fallback
        }
      };
      img.onerror = () => resolve({ dataUrl: src, size: SIZE });
      img.src = src;
    });
  }

  // Per-item cursor URL cache so we don't re-encode on every equip toggle.
  const _cursorCache = {};

  /* Apply `cursorValue` (a full CSS cursor string) to both the stage and
     the closeup overlay, so the custom cursor works in both normal play
     and close-up views. */
  function _setCursorOnAll(cursorValue, add) {
    stageEl.style.cursor = cursorValue;
    if (closeupEl) closeupEl.style.cursor = cursorValue;
    if (add) {
      stageEl.classList.add("cursor-equipped");
      if (closeupEl) closeupEl.classList.add("cursor-equipped");
    }
  }

  function _applyCursor(id) {
    const def = STARLOCK_DATA.ITEMS[id];
    if (!def) return;

    if (def.cursor) {
      // Dedicated cursor art — small by design, use directly
      const abs = new URL(def.cursor, window.location.href).href;
      _setCursorOnAll(`url('${abs}') 16 8, crosshair`, true);
      return;
    }

    // No dedicated cursor: resize the icon via canvas
    const abs  = new URL(def.icon, window.location.href).href;
    const size = def.cursorSize || 48;
    if (_cursorCache[id]) {
      const half = Math.round(size / 2);
      _setCursorOnAll(`url('${_cursorCache[id]}') ${half} ${half}, crosshair`, true);
      return;
    }
    // Temporarily show crosshair while the image loads asynchronously
    _setCursorOnAll("crosshair", true);
    _buildCursorDataUrl(abs, size).then(({ dataUrl, size: s }) => {
      _cursorCache[id] = dataUrl;
      // Only apply if this item is still the one equipped
      if (state.equipped === id) {
        const half = Math.round(s / 2);
        _setCursorOnAll(`url('${dataUrl}') ${half} ${half}, crosshair`, true);
      }
    });
  }

  function render() {
    slotsEl.innerHTML = "";
    state.items.forEach((id) => {
      const def = STARLOCK_DATA.ITEMS[id];
      if (!def) return;
      const slot = document.createElement("div");
      slot.className = "inv-slot" + (state.equipped === id ? " equipped" : "");
      slot.style.backgroundImage = `url('${def.icon}')`;
      slot.title = def.name;
      slot.addEventListener("click", (e) => {
        e.stopPropagation();
        equip(state.equipped === id ? null : id);
      });
      slotsEl.appendChild(slot);
    });
    // Update cursor — works for every item regardless of source image size
    if (state.equipped) {
      _applyCursor(state.equipped);
    } else {
      stageEl.style.cursor = "";
      stageEl.classList.remove("cursor-equipped");
      if (closeupEl) { closeupEl.style.cursor = ""; closeupEl.classList.remove("cursor-equipped"); }
    }

    // Broadcast so other UI (the slide-in menu, the equipped indicator)
    // can stay in sync without reaching into Inventory's internals.
    document.dispatchEvent(new CustomEvent("inventory:change", {
      detail: { items: state.items.slice(), equipped: state.equipped },
    }));
  }

  function addItem(id) {
    if (!STARLOCK_DATA.ITEMS[id]) {
      console.warn("Unknown item:", id);
      return;
    }
    if (!state.items.includes(id)) state.items.push(id);
    render();
  }

  function removeItem(id) {
    state.items = state.items.filter((i) => i !== id);
    if (state.equipped === id) state.equipped = null;
    render();
  }

  function hasItem(id) { return state.items.includes(id); }
  function getEquipped() { return state.equipped; }
  function getItems()   { return state.items.slice(); }

  function equip(id) {
    if (id !== null && !state.items.includes(id)) return;
    state.equipped = id;
    render();
  }

  // Escape to unequip
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.equipped) equip(null);
  });

  return { addItem, removeItem, hasItem, getEquipped, getItems, equip, render };
})();
