/* ============================================================
   STARLOCK - SCIENCE LAB 1 WORKBENCH CONTROLLER
   ------------------------------------------------------------
   Backs the "scilab_workbench" HTML close-up.
   Close-up image: Images/closeups/Science Lab 1 Workbench.png

   ASSEMBLY SEQUENCE
   The player installs four components onto the phaser chassis in
   a strict order. Installing out of order shows an error message;
   installing in order reveals each component's overlay image and
   progresses the build.

   Correct order:
     1. Power Supply      (scanner_power_supply)
     2. Signal Amplifier  (scanner_signal_amplifier)
     3. Frequency Emitter (freq_emitter)
     4. Glitch 1          (glitch_specimen_1)

   REMOVAL
   Clicking an installed component removes it and all components
   that follow it in the sequence, returning each to inventory.
   This resets the build past that point so the player can try again.

   COMPLETION
   Once all four components are installed in order, a success message
   plays and a scanner cover slot appears (775×555 at X856 Y319).
   Equipping the scanner cover and clicking the slot seals the
   device, triggers a final success message, adds the completed
   scanner to the player's inventory, and closes the close-up.

   STATE FLAGS
     wb_power_installed     — power supply seated on chassis
     wb_amplifier_installed — signal amplifier seated
     wb_freq_installed      — frequency emitter seated
     wb_glitch_installed    — Glitch 1 seated; phaser core complete
     wb_phaser_complete     — all four components in the right order
     scanner_built          — scanner cover placed; device assembled
   ============================================================ */

(function () {

  // === Component definitions — in required installation order ===
  // The index in this array IS the required order (0 first, 3 last).
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

  const FLAG_COMPLETE = "wb_phaser_complete";
  const FLAG_BUILT    = "scanner_built";

  const SCANNER_COVER_ITEM = "scanner_cover";
  const SCANNER_ITEM       = "scanner";

  // Scanner cover slot — only visible once phaser is complete.
  const COVER_GEOM  = { x: 856, y: 319, w: 775, h: 555 };
  const COVER_IMAGE = "Images/closeups/Science%20Lab%201%20Workbench%20Scanner%20Cover.png";

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

    // Always show overlay images for any installed components.
    COMPONENTS.forEach(comp => {
      if (ctx.hasFlag(comp.flag)) addImage(layer, comp.image);
    });

    // Final state: scanner cover placed — show cover overlay, no buttons.
    if (ctx.hasFlag(FLAG_BUILT)) {
      addImage(layer, COVER_IMAGE);
      return;
    }

    // Component slot buttons.
    // If phaser is complete all four slots are filled; only the cover slot matters.
    if (!ctx.hasFlag(FLAG_COMPLETE)) {
      COMPONENTS.forEach((comp, i) => {
        if (ctx.hasFlag(comp.flag)) {
          // Installed — click to remove this and anything after it.
          addHotspot(layer, comp.geom, `${comp.label} (installed — click to remove)`, (e) => {
            e.stopPropagation();
            removeFrom(layer, ctx, i);
          });
        } else {
          // Empty slot — click to install equipped item.
          addHotspot(layer, comp.geom, comp.label, (e) => {
            e.stopPropagation();
            tryInstall(layer, ctx, i);
          });
        }
      });
    }

    // Scanner cover slot — only appears once the phaser core is complete.
    if (ctx.hasFlag(FLAG_COMPLETE)) {
      addHotspot(layer, COVER_GEOM, "Scanner cover slot", (e) => {
        e.stopPropagation();
        tryCover(layer, ctx);
      });
    }
  }

  /* ---- Install a component ---- */

  function tryInstall(layer, ctx, index) {
    const comp = COMPONENTS[index];
    const eq   = Inventory.getEquipped();

    // Wrong item equipped (or nothing equipped).
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

    // Order check: the previous component must already be installed.
    if (index > 0 && !ctx.hasFlag(COMPONENTS[index - 1].flag)) {
      ctx.showMessage(
        "It doesn't seem to be working — something's missing. There must be a specific order."
      );
      return;
    }

    // Install: set flag, remove from inventory.
    ctx.setFlag(comp.flag);
    Inventory.removeItem(comp.item);

    // Check whether all four components are now installed.
    const allInstalled = COMPONENTS.every(c => ctx.hasFlag(c.flag));
    if (allInstalled) {
      ctx.setFlag(FLAG_COMPLETE);
      ctx.showMessage(
        "You hear a low hum as the components align. It's working — the chassis is fully powered."
      );
    } else {
      ctx.showMessage("The component slots into place with a soft click.");
    }

    buildUI(layer, ctx);
    ctx.renderActive();
  }

  /* ---- Remove a component (and all that follow it) ---- */

  function removeFrom(layer, ctx, index) {
    // Remove in reverse order so inventory additions feel natural.
    for (let i = COMPONENTS.length - 1; i >= index; i--) {
      if (ctx.hasFlag(COMPONENTS[i].flag)) {
        ctx.clearFlag(COMPONENTS[i].flag);
        Inventory.addItem(COMPONENTS[i].item);
      }
    }
    // Clear phaser-complete flag if it was set.
    if (ctx.hasFlag(FLAG_COMPLETE)) {
      ctx.clearFlag(FLAG_COMPLETE);
    }
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

    // Show the cover overlay immediately.
    buildUI(layer, ctx);
    ctx.renderActive();

    // Brief pause, then award the scanner and exit.
    setTimeout(() => {
      Inventory.addItem(SCANNER_ITEM);
      ctx.showPickupNotification(SCANNER_ITEM);
      ctx.showMessage(
        "Assembly complete. The display flickers on — the scanner is ready."
      );
      setTimeout(() => {
        ctx.closeCloseup();
      }, 2200);
    }, 600);
  }

  /* ---- Mount / unmount ---- */

  function mount(layer, ctx) {
    buildUI(layer, ctx);
  }

  function unmount() {
    // All state lives in engine flags — nothing to reset here.
  }

  Engine.registerCloseupController("scilab_workbench", { mount, unmount });

})();
