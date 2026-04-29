/* ============================================================
   STARLOCK - HUD / MENU UI
   ------------------------------------------------------------
   Wires the in-game HUD chrome that lives outside the scene
   engine itself:

     - Hamburger toggle + slide-in panel (Inventory / Settings)
     - "Return to Start Screen" action (full reset via reload)
     - Equipped-item indicator chip

   Stays decoupled from Inventory by listening for the
   `inventory:change` custom event the inventory module fires
   on every render.
   ============================================================ */

(function () {
  /* ---------- DOM refs ---------- */
  const menuToggle      = document.getElementById("menu-toggle");
  const menu            = document.getElementById("game-menu");
  const menuClose       = document.getElementById("menu-close");
  const tabs            = Array.from(menu.querySelectorAll(".game-menu-tab"));
  const panels          = Array.from(menu.querySelectorAll(".game-menu-panel"));
  const invGrid         = document.getElementById("menu-inventory-grid");
  const invEmpty        = document.getElementById("menu-inventory-empty");
  const returnStartBtn  = document.getElementById("menu-return-start");
  const equipIndicator  = document.getElementById("equipped-indicator");
  const equipIcon       = equipIndicator.querySelector(".eq-icon");
  const equipName       = equipIndicator.querySelector(".eq-name");

  /* ---------- Menu open / close ----------
     Visibility is purely class-driven: .open toggles the slide-in
     transform. aria-hidden + aria-expanded keep assistive tech in
     sync. The element is always in layout (no display:none) so the
     CSS transition runs both directions. */
  function openMenu() {
    menu.classList.add("open");
    menu.setAttribute("aria-hidden", "false");
    menuToggle.setAttribute("aria-expanded", "true");
  }
  function closeMenu() {
    menu.classList.remove("open");
    menu.setAttribute("aria-hidden", "true");
    menuToggle.setAttribute("aria-expanded", "false");
  }
  function toggleMenu() {
    if (menu.classList.contains("open")) closeMenu(); else openMenu();
  }

  menuToggle.addEventListener("click", toggleMenu);
  menuClose.addEventListener("click", closeMenu);

  // Esc closes the menu (other Esc handlers — unequip, close zoom — still fire).
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("open")) closeMenu();
  });

  /* ---------- Tab switching ---------- */
  function activateTab(name) {
    tabs.forEach((t) => {
      const on = t.dataset.tab === name;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    panels.forEach((p) => {
      p.classList.toggle("active", p.dataset.panel === name);
    });
  }
  tabs.forEach((t) => t.addEventListener("click", () => activateTab(t.dataset.tab)));

  /* ---------- Inventory panel ----------
     Card-style grid with item icon, name, description, and an
     EQUIPPED tag. Clicking a card toggles equip via Inventory. */
  function renderInventoryPanel(items, equipped) {
    invGrid.innerHTML = "";
    items.forEach((id) => {
      const def = STARLOCK_DATA.ITEMS[id];
      if (!def) return;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "menu-inv-card" + (equipped === id ? " equipped" : "");
      card.dataset.itemId = id;
      card.innerHTML = `
        <div class="inv-img" style="background-image: url('${def.icon}')"></div>
        <div class="inv-name">${escapeHtml(def.name)}</div>
        <div class="inv-desc">${escapeHtml(def.description || "")}</div>
        <div class="inv-equip-tag">Equipped</div>
      `;
      card.addEventListener("click", () => {
        const cur = Inventory.getEquipped();
        Inventory.equip(cur === id ? null : id);
      });
      invGrid.appendChild(card);
    });
    // Empty-state message visibility
    if (items.length === 0) invEmpty.classList.remove("hidden");
    else                    invEmpty.classList.add("hidden");
  }

  /* ---------- Equipped indicator ---------- */
  function renderEquippedIndicator(equipped) {
    if (!equipped) {
      equipIndicator.classList.add("hidden");
      equipIcon.style.backgroundImage = "";
      equipName.textContent = "";
      return;
    }
    const def = STARLOCK_DATA.ITEMS[equipped];
    if (!def) {
      equipIndicator.classList.add("hidden");
      return;
    }
    equipIcon.style.backgroundImage = `url('${def.icon}')`;
    equipName.textContent = def.name;
    equipIndicator.classList.remove("hidden");
  }

  /* ---------- Sync on inventory changes ---------- */
  document.addEventListener("inventory:change", (e) => {
    const { items, equipped } = e.detail;
    renderInventoryPanel(items, equipped);
    renderEquippedIndicator(equipped);
  });

  // Initial render in case the event already fired before this listener
  // was attached, or before any items exist.
  renderInventoryPanel([], null);
  renderEquippedIndicator(null);

  /* ---------- Return to Start Screen ---------- */
  returnStartBtn.addEventListener("click", () => {
    const ok = window.confirm(
      "Return to the start screen?\nAny progress in this run will be lost."
    );
    if (!ok) return;
    // Hard reset is bulletproof: nukes Engine flags, inventory, closeup
    // state, and DOM tweaks in one shot. The start screen is the default
    // active section in the markup so we land back there cleanly.
    window.location.reload();
  });

  /* ---------- Tiny helper: HTML-escape text from scenes.js ---------- */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
