/* ============================================================
   STARLOCK - SCIENCE LAB 1 WORKBENCH CONTROLLER
   ------------------------------------------------------------
   Backs the "scilab_workbench" HTML close-up.
   Close-up image: Images/closeups/Science Lab 1 Workbench.png

   ASSEMBLY PUZZLE
   The player can slot any of the four components into their
   respective positions in any order — no early feedback is given.
   Only once all four components are in place does the device
   respond: if they were installed in the correct order it hums
   to life; if not, nothing happens and the player must remove
   components and try again.

   Correct order:
     1. Power Supply      (scanner_power_supply)
     2. Signal Amplifier  (scanner_signal_amplifier)
     3. Frequency Emitter (freq_emitter)
     4. Glitch 1          (glitch_specimen_1)

   Install order is tracked in module-level memory (installOrder[]).
   This resets on page reload, which is acceptable: if a player
   saves with all four components installed in the wrong order they
   can remove any one and re-seat it — the fresh tracking will
   correctly assess the new attempt.

   REMOVAL
   Clicking an installed component removes just that component and
   returns it to inventory. The phaser-complete flag is also cleared
   if it was set, so the player can redo the sequence.

   COMPLETION
   Once all four are installed in the correct order, a success
   message plays and a scanner cover slot appears (775×555 at
   X856 Y319). Equipping the scanner cover and clicking the slot
   seals the device, triggers a final success message, adds the
   completed scanner to inventory, and closes the close-up.

   STATE FLAGS
     wb_power_installed     — power supply seated on chassis
     wb_amplifier_installed — signal amplifier seated
     wb_freq_installed      — frequency emitter seated
     wb_glitch_installed    — Glitch 1 seated
     wb_phaser_complete     — all four in the correct order
     scanner_built          — scanner cover placed; device assembled
   ============================================================ */

(function () {

  // === Component definitions ===
  // Array index = the position each component must occupy in the
  // correct build sequence (0 = first, 3 = last).
  const COMPONENTS = [
    {
      flag:  "wb_power_installed",
      item:  "scanner_power_supply",
      label: "Power supply slot",
      geom:  { x: 1121, y: 601, w: 214, h: 230 },
      image: "Images/closeups/Science%20Lab%201%20Workbench%20Power%20Supply.png",
    },
    {
      flag:  "wb_amplifier_installed",
      item:  "scanner_signal_amplifier",
      label: "Signal amplifier slot",
      geom:  { x: 1004, y: 388, w: 245, h: 108 },
      image: "Images/closeups/Science%20Lab%201%20Workbench%20Signal%20Amplifier.png",
    },
    {
      flag:  "wb_freq_installed",
      item:  "freq_emitter",
      label: "Frequency emitter slot",
      geom:  { x: 1246, y: 361, w: 295, h: 139 },
      image: "Images/closeups/Science%20Lab%201%20Workbench%20Frequency%20Emitter.png",
    },
    {
      flag:  "wb_glitch_installed",
      item:  "glitch_specimen_1",
      label: "Glitch specimen slot",
      geom:  { x: 465,  y: 368, w: 530, h: 230 },
      image: "Images/closeups/Science%20Lab%201%20Workbench%20Glitch%201.png",
    },
  ];

  const CORRECT_ORDER = "0,1,2,3"; // indices of COMPONENTS in required order

  const FLAG_COMPLETE = "wb_phaser_complete";
  const FLAG_BUILT    = "scanner_built";

  const SCANNER_COVER_ITEM = "scanner_cover";
  const SCANNER_ITEM       = "scanner";

  const COVER_GEOM  = { x: 856, y: 319, w: 775, h: 555 };
  const COVER_IMAGE = "Images/closeups/Science%20Lab%201%20Workbench%20Scanner%20Cover.png";

  // Session-only install order tracking. Stores COMPONENTS indices
  // in the sequence the player seated them. Resets on page reload.
  let installOrder = [];

  /* ---- Helpers ---- */

  function addImage(layer, src) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.style.cssText =
      "position:absolute;left:0;top:0;width:1920px;height:1080px;pointer-events:none;";
    layer.appendChild(img);
  }

  function addHotspot(layer, geom, label, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hotspot";
    btn.setAttribute("data-label", label);
    btn.style.cssText =
      `position:absolute;` +
      `left:${geom.x}px;top:${geom.y}px;` +
      `width:${geom.w}px;height:${geom.h}px;`;
    btn.addEventListener("click", onClick);
    layer.appendChild(btn);
  }

  /* ---- UI builder ---- */

  function buildUI(layer, ctx) {
    layer.innerHTML = "";

    // Overlay images for every installed component.
    COMPONENTS.forEach(comp => {
      if (ctx.hasFlag(comp.flag)) addImage(layer, comp.image);
    });

    // Final state: scanner sealed — show cover overlay, no buttons.
    if (ctx.hasFlag(FLAG_BUILT)) {
      addImage(layer, COVER_IMAGE);
      return;
    }

    // Component slot buttons (install / remove).
    if (!ctx.hasFlag(FLAG_COMPLETE)) {
      COMPONENTS.forEach((comp, i) => {
        if (ctx.hasFlag(comp.flag)) {
          // Installed — click to remove.
          addHotspot(layer, comp.geom, `${comp.label} (installed — click to remove)`, (e) => {
            e.stopPropagation();
            removeComponent(layer, ctx, i);
          });
        } else {
          // Empty slot — click to try installing equipped item.
          addHotspot(layer, comp.geom, comp.label, (e) => {
            e.stopPropagation();
            tryInstall(layer, ctx, i);
          });
        }
      });
    }

    // Scanner cover slot — only visible once phaser core is complete.
    if (ctx.hasFlag(FLAG_COMPLETE)) {
      addHotspot(layer, COVER_GEOM, "Scanner cover slot", (e) => {
        e.stopPropagation();
        tryCover(layer, ctx);
      });
    }
  }

  /* ---- Install a component (no order enforcement) ---- */

  function tryInstall(layer, ctx, index) {
    const comp = COMPONENTS[index];
    const eq   = Inventory.getEquipped();

    if (eq !== comp.item) {
      if (!eq) {
        ctx.showMessage("You'd need to equip a component to install it here.");
      } else {
        const def  = STARLOCK_DATA.ITEMS[eq];
        const name = def ? def.name : eq;
        ctx.showMessage(`${name} doesn't fit here.`);
      }
      return;
    }

    // Seat the component — no order feedback yet.
    ctx.setFlag(comp.flag);
    Inventory.removeItem(comp.item);
    installOrder.push(index);

    // Only reveal pass/fail once all four are in place.
    const allInstalled = COMPONENTS.every(c => ctx.hasFlag(c.flag));
    if (allInstalled) {
      const orderCorrect = installOrder.join(",") === CORRECT_ORDER;
      if (orderCorrect) {
        ctx.setFlag(FLAG_COMPLETE);
        ctx.showMessage(
          "A low hum resonates through the chassis. It's working."
        );
      } else {
        ctx.showMessage(
          "Nothing happens. Something about the assembly isn't right."
        );
      }
    } else {
      ctx.showMessage("The component seats with a soft click.");
    }

    buildUI(layer, ctx);
    ctx.renderActive();
  }

  /* ---- Remove a single component ---- */

  function removeComponent(layer, ctx, index) {
    const comp = COMPONENTS[index];
    ctx.clearFlag(comp.flag);
    Inventory.addItem(comp.item);

    // Drop this component from the session order tracking.
    const pos = installOrder.indexOf(index);
    if (pos !== -1) installOrder.splice(pos, 1);

    // Clear the phaser-complete flag so the player can retry.
    if (ctx.hasFlag(FLAG_COMPLETE)) ctx.clearFlag(FLAG_COMPLETE);

    ctx.showMessage("You remove the component. It's back in your inventory.");
    buildUI(layer, ctx);
    ctx.renderActive();
  }

  /* ---- Install the scanner cover (final step) ---- */

  function tryCover(layer, ctx) {
    const eq = Inventory.getEquipped();

    if (eq !== SCANNER_COVER_ITEM) {
      if (!eq) {
        ctx.showMessage(
          "The scanner needs its protective cover before it's ready. Equip it first."
        );
      } else {
        const def  = STARLOCK_DATA.ITEMS[eq];
        const name = def ? def.name : eq;
        ctx.showMessage(`${name} doesn't fit here.`);
      }
      return;
    }

    // Seal the scanner.
    ctx.setFlag(FLAG_BUILT);
    Inventory.removeItem(SCANNER_COVER_ITEM);

    buildUI(layer, ctx);
    ctx.renderActive();

    // Brief pause, then award the scanner and close.
    setTimeout(() => {
      Inventory.addItem(SCANNER_ITEM);
      ctx.showPickupNotification(SCANNER_ITEM);
      ctx.showMessage("Assembly complete. The display flickers on — the scanner is ready.");
      setTimeout(() => {
        ctx.closeCloseup();
      }, 2200);
    }, 600);
  }

  /* ---- Mount / unmount ---- */

  function mount(layer, ctx) {
    // Rebuild session order from current flag state on re-open.
    // We can't know the original install sequence from flags alone,
    // but a partial or complete wrong-order state is handled gracefully:
    // the player can remove any component and re-seat it to reset.
    installOrder = COMPONENTS
      .map((comp, i) => ctx.hasFlag(comp.flag) ? i : null)
      .filter(i => i !== null);

    buildUI(layer, ctx);
  }

  function unmount() {
    // State lives in engine flags; installOrder resets on next mount.
  }

  Engine.registerCloseupController("scilab_workbench", { mount, unmount });

})();
