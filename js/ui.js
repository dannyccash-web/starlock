/* ============================================================
   STARLOCK - HUD / MENU UI
   ------------------------------------------------------------
   Wires the in-game HUD chrome that lives outside the scene
   engine itself:

     - Hamburger toggle + slide-in panel (Inventory / Settings)
     - "Return to Start Screen" action (full reset via reload)
     - Equipped-item indicator chip
     - Settings panel: Soundtrack + Effects volume sliders
     - Typewriter-animation of menu labels and inventory cards
       on first reveal

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

  // Settings sliders
  const volSoundtrack      = document.getElementById("vol-soundtrack");
  const volSoundtrackValue = document.getElementById("vol-soundtrack-value");
  const volEffects         = document.getElementById("vol-effects");
  const volEffectsValue    = document.getElementById("vol-effects-value");

  /* ---------- Menu open / close ----------
     Visibility is purely class-driven: .open toggles the slide-in
     transform. aria-hidden + aria-expanded keep assistive tech in
     sync. The element is always in layout (no display:none) so the
     CSS transition runs both directions.

     On the first open we typewriter all labels marked with
     data-tw-text inside the menu (header, tabs, footer button,
     and any labels in the active panel). Subsequent opens skip
     the animation thanks to Typewriter.typeOnce. */
  let menuTypewriterRan = false;

  function openMenu() {
    menu.classList.add("open");
    menu.setAttribute("aria-hidden", "false");
    menuToggle.setAttribute("aria-expanded", "true");
    if (!menuTypewriterRan) {
      menuTypewriterRan = true;
      typewriterAllInside(menu);
    }
    // Re-render the inventory grid so any items that were added while
    // the menu was closed get a fresh typewriter animation now that
    // the player can actually see them.
    renderInventoryPanel(Inventory.getItems(), Inventory.getEquipped());
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

  /* ---------- Typewriter helper ----------
     Walks every element with data-tw-text inside `root` and runs
     Typewriter.typeOnce on it. Each element animates independently;
     they run in parallel which keeps the menu reveal feeling lively
     while the SFX loops once for the whole burst. */
  function typewriterAllInside(root) {
    const targets = Array.from(root.querySelectorAll("[data-tw-text]"));
    targets.forEach((el) => {
      const text = el.dataset.twText;
      // Default speed; punchy for short labels, still readable for long ones.
      Typewriter.typeOnce(el, text, { speed: 30 });
    });
  }

  // First reveal of the equipped-indicator label is handled the
  // first time the indicator becomes visible (see renderEquippedIndicator).

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
     EQUIPPED tag. Clicking a card toggles equip via Inventory.

     Typewriter behaviour: each item's name + description type in
     the FIRST time the player sees that card with the menu open.
     After that the card just sets its text directly, so equipping/
     unequipping doesn't re-fire the animation (and SFX) every time. */
  const typedItems = new Set();

  function renderInventoryPanel(items, equipped) {
    invGrid.innerHTML = "";
    const menuOpen = menu.classList.contains("open");
    items.forEach((id) => {
      const def = STARLOCK_DATA.ITEMS[id];
      if (!def) return;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "menu-inv-card" + (equipped === id ? " equipped" : "");
      card.dataset.itemId = id;
      card.innerHTML = `
        <div class="inv-img" style="background-image: url('${def.icon}')"></div>
        <div class="inv-name"></div>
        <div class="inv-desc"></div>
        <div class="inv-equip-tag">Equipped</div>
      `;
      const nameEl = card.querySelector(".inv-name");
      const descEl = card.querySelector(".inv-desc");

      // Animate this item's text only the first time it gets rendered
      // *while the menu is visible* — otherwise the SFX plays for cards
      // the player can't see. Once typed, the item is remembered for
      // the rest of the session.
      if (menuOpen && !typedItems.has(id)) {
        typedItems.add(id);
        Typewriter.type(nameEl, def.name,              { speed: 22 });
        Typewriter.type(descEl, def.description || "", { speed: 14 });
      } else {
        nameEl.textContent = def.name;
        descEl.textContent = def.description || "";
      }

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

  /* ---------- Equipped indicator ----------
     The chip is hidden when nothing is equipped. On the FIRST time
     it becomes visible we typewriter the static "Equipped" label
     plus the item's name; subsequent renders just swap the name
     directly so swapping equipped items doesn't re-type the label. */
  const equipLabelEl = equipIndicator.querySelector(".eq-label");
  let equipNameTyped = null;
  function renderEquippedIndicator(equipped) {
    if (!equipped) {
      equipIndicator.classList.add("hidden");
      equipIcon.style.backgroundImage = "";
      equipName.textContent = "";
      equipNameTyped = null;
      return;
    }
    const def = STARLOCK_DATA.ITEMS[equipped];
    if (!def) {
      equipIndicator.classList.add("hidden");
      return;
    }
    equipIcon.style.backgroundImage = `url('${def.icon}')`;
    equipIndicator.classList.remove("hidden");
    // First-reveal typewriter for the "Equipped" label.
    if (equipLabelEl && equipLabelEl.dataset.twText) {
      Typewriter.typeOnce(equipLabelEl, equipLabelEl.dataset.twText, { speed: 30 });
    }
    if (equipNameTyped !== equipped) {
      equipNameTyped = equipped;
      Typewriter.type(equipName, def.name, { speed: 22 });
    }
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

  /* ---------- Settings: volume sliders ----------
     The Audio module owns persistence. We just mirror the saved
     values into the slider DOM on init, then forward `input`
     events back into Audio. The percentage label updates live. */
  function fmtPct(v) { return Math.round(parseFloat(v) * 100); }

  function initVolSlider(slider, valueEl, getInitial, setVolume) {
    const initial = getInitial();
    slider.value = String(initial);
    valueEl.textContent = fmtPct(initial);
    slider.addEventListener("input", () => {
      setVolume(slider.value);
      valueEl.textContent = fmtPct(slider.value);
    });
  }
  initVolSlider(
    volSoundtrack, volSoundtrackValue,
    () => GameAudio.getSoundtrackVolume(),
    (v) => GameAudio.setSoundtrackVolume(v),
  );
  initVolSlider(
    volEffects, volEffectsValue,
    () => GameAudio.getEffectsVolume(),
    (v) => GameAudio.setEffectsVolume(v),
  );

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
