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
  const slotsEl = document.getElementById("inventory");
  const stageEl = document.getElementById("stage");

  const state = {
    items: [],         // ordered list of itemIds
    equipped: null,    // itemId or null
  };

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
    // Update cursor mode
    if (state.equipped) {
      const def = STARLOCK_DATA.ITEMS[state.equipped];
      // Browsers cap cursor images at ~128px. Use def.cursor (small) if
      // present, otherwise fall back to def.icon (browsers may then
      // substitute a crosshair if the icon is too large).
      const cursorImg = def.cursor || def.icon;
      // Resolve URL against the page (not the stylesheet) so cursor:
      // url(...) works no matter where the CSS file lives.
      const abs = new URL(cursorImg, window.location.href).href;
      stageEl.style.cursor = `url('${abs}') 16 8, crosshair`;
      stageEl.classList.add("cursor-equipped");
    } else {
      stageEl.style.cursor = "";
      stageEl.classList.remove("cursor-equipped");
    }
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

  function equip(id) {
    if (id !== null && !state.items.includes(id)) return;
    state.equipped = id;
    render();
  }

  // Escape to unequip
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.equipped) equip(null);
  });

  return { addItem, removeItem, hasItem, getEquipped, equip, render };
})();
