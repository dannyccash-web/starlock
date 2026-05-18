/* ============================================================
   STARLOCK - SCIENCE LAB BACKLIT DISPLAY CONTROLLER
   ------------------------------------------------------------
   Backs the "scilab_backlight" HTML close-up.
   Close-up image: Images/closeups/Science Lab 1 Backlight.png
   — Vance's light panel on the workbench wall, used to view
   transparent schematics by back-lighting them.

   BEHAVIOUR
   The player can place Schematic 1 and/or Schematic 2 by
   equipping the item and clicking anywhere on the white screen
   area. Placing a schematic:
     1. Removes the schematic from inventory.
     2. Sets the corresponding state flag.
     3. Overlays the matching closeup image on the display.
     4. Re-renders Wall D so the schematic sprite appears there too.

   Both schematics can be placed at the same time. Once placed,
   a schematic cannot be removed.

   WHITE AREA
   The clickable white screen region is defined by WHITE_AREA.
   Press D in-game to enable the debug overlay; adjust the
   coordinates to match the lit panel in the closeup art.

   STATE FLAGS
     schematic1_placed — Schematic 1 is on the display
     schematic2_placed — Schematic 2 is on the display
   ============================================================ */

(function () {
  const FLAG_S1 = "schematic1_placed";
  const FLAG_S2 = "schematic2_placed";

  // Clickable area covering the white screen in the closeup art.
  // Coordinates are in the 1920×1080 stage space.
  // NOTE: Tune with debug mode (D key) once art is confirmed.
  const WHITE_AREA = { x: 340, y: 160, w: 1240, h: 680 };

  // Full-scene overlay images for each placed schematic.
  // These are 1920×1080 PNGs with the schematic in position and
  // the rest transparent, matching the sprite pattern used elsewhere.
  const IMG_S1 = "Images/closeups/Science%20Lab%201%20Backlight%20Schematic%201%20Closeup.png";
  const IMG_S2 = "Images/closeups/Science%20Lab%201%20Backlight%20Schematic%202%20Closeup.png";

  /* ---------- Build the interactive UI ---------- */
  function buildUI(layer, ctx) {
    layer.innerHTML = "";

    // Overlay each placed schematic's closeup image on top of the base.
    if (ctx.hasFlag(FLAG_S1)) {
      const img = document.createElement("img");
      img.src = IMG_S1;
      img.alt = "";
      img.style.cssText =
        "position:absolute;left:0;top:0;width:1920px;height:1080px;pointer-events:none;";
      layer.appendChild(img);
    }
    if (ctx.hasFlag(FLAG_S2)) {
      const img = document.createElement("img");
      img.src = IMG_S2;
      img.alt = "";
      img.style.cssText =
        "position:absolute;left:0;top:0;width:1920px;height:1080px;pointer-events:none;";
      layer.appendChild(img);
    }

    // Clickable white-area button — only shown while at least one
    // schematic can still be placed.
    const needsS1 = !ctx.hasFlag(FLAG_S1);
    const needsS2 = !ctx.hasFlag(FLAG_S2);
    if (needsS1 || needsS2) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hotspot";
      btn.setAttribute("data-label", "Backlit display screen");
      btn.style.cssText =
        `position:absolute;` +
        `left:${WHITE_AREA.x}px;` +
        `top:${WHITE_AREA.y}px;` +
        `width:${WHITE_AREA.w}px;` +
        `height:${WHITE_AREA.h}px;`;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        handleScreenClick(layer, ctx);
      });
      layer.appendChild(btn);
    }
  }

  /* ---------- Handle a click on the white screen area ---------- */
  function handleScreenClick(layer, ctx) {
    const eq = Inventory.getEquipped();

    if (eq === "schematic_1" && !ctx.hasFlag(FLAG_S1)) {
      // Place Schematic 1
      ctx.setFlag(FLAG_S1);
      Inventory.removeItem("schematic_1");
      ctx.showMessage(
        "You hold the acetate against the lit panel. The lines and numbers come into focus."
      );
      buildUI(layer, ctx);
      ctx.renderActive(); // also re-renders Wall D schematic sprite

    } else if (eq === "schematic_2" && !ctx.hasFlag(FLAG_S2)) {
      // Place Schematic 2
      ctx.setFlag(FLAG_S2);
      Inventory.removeItem("schematic_2");
      ctx.showMessage(
        "You press the sheet against the panel. The diagram is clearer under the light."
      );
      buildUI(layer, ctx);
      ctx.renderActive(); // also re-renders Wall D schematic sprite

    } else if (!eq) {
      // No item equipped
      if (!ctx.hasFlag(FLAG_S1) && !ctx.hasFlag(FLAG_S2)) {
        ctx.showMessage(
          "A backlit panel — used to illuminate transparent sheets. The surface is blank."
        );
      } else {
        ctx.showMessage("The acetate is clipped to the display.");
      }
    } else {
      // Wrong item equipped
      const itemDef = STARLOCK_DATA.ITEMS[eq];
      const name = itemDef ? itemDef.name : eq;
      ctx.showMessage(`${name} doesn't work here.`);
    }
  }

  /* ---------- Mount / unmount ---------- */
  function mount(layer, ctx) {
    buildUI(layer, ctx);
  }

  function unmount() {
    // Nothing persistent to reset — state is all in flags.
  }

  Engine.registerCloseupController("scilab_backlight", { mount, unmount });
})();
