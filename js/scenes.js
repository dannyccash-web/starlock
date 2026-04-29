/* ============================================================
   STARLOCK - SCENE DATA
   ------------------------------------------------------------
   This file is the entire game's content. Every wall view,
   every hot spot, every item, every close-up.

   ARCHITECTURE NOTE
   The art problem with AI-generated rooms is that the *base
   plate* (the wall itself) is hard to keep consistent. So we
   never bake state into the wall image. Instead:

     plate (1 image per wall view, never re-generated)
       + sprites (transparent PNGs at fixed coords for each
                  changeable item or detail)
       + hot spots (invisible click rectangles, optionally
                    gated on game state and on equipped item)
       + close-ups (a separate full-screen image per zoomable
                    detail; sub-hot-spots live on top of it)

   Coordinates are in a virtual 1920x1080 stage. Engine scales.

   FIELDS
   rooms[id]          - a logical room (cryo, lab, bridge, etc)
     walls[]          - clockwise list of wall views (left turn = -1)
       id             - unique within room
       plate          - URL of base image, OR null for placeholder
       placeholderLabel - shown if plate is null
       atmosphere     - CSS atmosphere class (cryo-emergency, etc)
       sprites[]      - { id, image, x, y, w, h, showIf?, hideIf? }
       hotspots[]     - { id, shape: rect|poly, geom, label,
                          showIf?, hideIf?, requires?, action }
   closeups[id]       - { image, hotspots[] } -- same hotspot format
   items[id]          - { name, icon, description }

   STATE FLAGS used so far (see engine.js applyAction):
     crate_opened          - left crate has been pried/opened
     keycard_taken         - keycard sprite hidden, in inventory
     viewed_pod_log        - close-up POD 4 log read at least once

   To add new content: append to walls[], items[], or closeups{}.
   Restart the page to reload.
   ============================================================ */

const ITEMS = {
  keycard: {
    name: "Crew Keycard",
    icon:   "Images/items/keycard.png",         // for inventory slot
    cursor: "Images/items/keycard_cursor.png",  // small (<=128px) for cursor
    description: "Magnetic ID card. Unlocks low-level crew systems.",
  },
};

const ROOMS = {
  cryo: {
    title: "Cryo Sleep Bay",
    startWall: 0,
    walls: [
      // -------- WALL 1 (the real art) --------
      {
        id: "cryo_wall_1",
        plate: "Images/cryo_room_1.png",
        atmosphere: "cryo-emergency",
        sprites: [
          // The keycard, sitting on the crate, only visible after the crate is opened
          // and before it's been taken. Coords are tuned to the existing wall art.
          {
            id: "keycard_on_crate",
            image: "Images/items/keycard.png",
            x: 162,  y: 706,  w: 90, h: 56,
            showIf: { all: ["crate_opened"], none: ["keycard_taken"] },
          },
        ],
        hotspots: [
          // 1) The crate at the lower left. First click "opens" it (state flag),
          //    revealing the keycard sprite. (You can later swap this for a real
          //    "open crate" sprite using the same showIf/hideIf pattern.)
          {
            id: "crate",
            shape: "rect",
            geom: [110, 670, 290, 200],
            label: "Storage crate",
            hideIf: { all: ["crate_opened"] },
            action: {
              type: "setState",
              flags: ["crate_opened"],
              message: "You pry the storage crate open. Something glints inside.",
            },
          },
          // 2) Pick up the keycard. Hot spot only exists once the crate is open
          //    and the keycard is still there.
          {
            id: "pickup_keycard",
            shape: "rect",
            geom: [150, 700, 120, 80],
            label: "Pick up keycard",
            showIf: { all: ["crate_opened"], none: ["keycard_taken"] },
            action: {
              type: "pickup",
              item: "keycard",
              flags: ["keycard_taken"],
              message: "Crew keycard added to inventory.",
            },
          },
          // 3) The central CRYO POD G4 panel. Click to zoom in.
          {
            id: "pod_panel",
            shape: "rect",
            geom: [675, 230, 580, 360],
            label: "Cryo pod array (zoom)",
            action: { type: "openCloseup", target: "cryo_panel_g4" },
          },
          // 4) The right-hand "LOCKED" door. Requires the keycard.
          {
            id: "locked_door",
            shape: "rect",
            geom: [1530, 110, 290, 740],
            label: "Locked door (science lab)",
            action: {
              type: "useItem",
              accepts: ["keycard"],
              onAccept: {
                message: "The keycard reader blinks green, but the door's actuators have no power. You'll need to restore the lab circuit first.",
              },
              onReject: {
                message: "The door is locked. There's a card reader.",
              },
            },
          },
          // 5) The left "SEALED" door. Cannot be entered (shuttle bay is open to space).
          {
            id: "sealed_door",
            shape: "rect",
            geom: [50, 110, 280, 740],
            label: "Sealed door (shuttle bay)",
            action: {
              type: "message",
              message: "SEALED. The shuttle bay beyond is exposed to vacuum.",
            },
          },
        ],
      },

      // -------- WALL 2 (placeholder, north) --------
      {
        id: "cryo_wall_2",
        plate: null,
        placeholderLabel: "CRYO BAY — NORTH",
        atmosphere: "cryo-emergency",
        sprites: [],
        hotspots: [],
      },
      // -------- WALL 3 (placeholder, opposite) --------
      {
        id: "cryo_wall_3",
        plate: null,
        placeholderLabel: "CRYO BAY — OPPOSITE",
        atmosphere: "cryo-emergency",
        sprites: [],
        hotspots: [],
      },
      // -------- WALL 4 (placeholder, south) --------
      {
        id: "cryo_wall_4",
        plate: null,
        placeholderLabel: "CRYO BAY — SOUTH",
        atmosphere: "cryo-emergency",
        sprites: [],
        hotspots: [],
      },
    ],
  },
};

const CLOSEUPS = {
  cryo_panel_g4: {
    image: "Images/closeups/cryo_panel_g4.png",
    hotspots: [
      // Each pod is its own hot spot; pod 4 is the dead crew member's
      {
        id: "pod1",
        shape: "rect",
        geom: [180, 300, 380, 520],
        label: "Pod 01 (your pod)",
        action: { type: "message", message: "POD 01 — your own. Wake protocol triggered automatically." },
      },
      {
        id: "pod2",
        shape: "rect",
        geom: [580, 300, 380, 520],
        label: "Pod 02",
        action: { type: "message", message: "POD 02 — empty. Pod log shows a clean, authorized open. (Suspicious in retrospect.)" },
      },
      {
        id: "pod3",
        shape: "rect",
        geom: [980, 300, 380, 520],
        label: "Pod 03",
        action: { type: "message", message: "POD 03 — empty. Pod log shows a hurried open with override warnings." },
      },
      {
        id: "pod4",
        shape: "rect",
        geom: [1380, 300, 380, 520],
        label: "Pod 04 (quarantine)",
        action: {
          type: "setState",
          flags: ["viewed_pod_log"],
          message: "POD 04 — occupant DECEASED in quarantine. Cause: organism exposure. This is bad.",
        },
      },
    ],
  },
};

/* Optional: simple validator so typos don't silently break things. */
window.STARLOCK_DATA = { ITEMS, ROOMS, CLOSEUPS };
