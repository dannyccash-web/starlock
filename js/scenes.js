/* ============================================================
   STARLOCK - SCENE DATA
   ------------------------------------------------------------
   Every wall view, every hot spot, every item, every close-up.

   ARCHITECTURE
   The game is composed of stacked, transparent PNG layers, all
   sized to the 1920x1080 stage and pinned to the same origin
   (0,0). A wall is the sum of:

     plate    : 1 base wall image (e.g. "Cryo Room 1.png")
     sprites  : 0..N transparent overlay PNGs sitting on top of
                the plate. Each one is a full 1920x1080 PNG with
                its prop in the correct position and the rest
                fully transparent — so they "snap" into place.
                Sprites can be turned on/off via showIf/hideIf,
                or swapped (broken / fixed / opened / closed).
     hotspots : invisible click rectangles whose geometry is
                authored to match where the prop appears on the
                composite, so clicking the *visual* item works.
     close-ups: a separate full-stage image per zoomable detail,
                with its own sub-hot-spots OR a fully custom HTML
                interface (see CLOSEUPS.cryo_terminal).

   Coordinates are in a virtual 1920x1080 stage. Engine scales.

   FIELDS
   rooms[id]          - a logical room (cryo, lab, bridge, etc)
     walls[]          - clockwise list of wall views
       id             - unique within room
       plate          - URL of base image, OR null for placeholder
       placeholderLabel - shown if plate is null
       atmosphere     - CSS atmosphere class
       sprites[]      - { id, image, x, y, w, h, showIf?, hideIf? }
       hotspots[]     - { id, shape: rect|poly, geom, label,
                          showIf?, hideIf?, requires?, action }
   closeups[id]       - { image, hotspots[] }            (image-only)
                     OR { image, kind:"html", controller } (HTML UI)
   items[id]          - { name, icon, description }

   STATE FLAGS:
     pod4_wiring_repaired - the sabotaged wiring panel next to pod 4
                            has been reconnected using foil strips.
                            Required before the cryo terminal will
                            allow pod 4 to be released.
                            For dev testing, run:
                              Engine.setFlag('pod4_wiring_repaired')
                            in the browser console.
     pod4_opened          - the science officer's pod has been
                            unsealed via the terminal. The corpse
                            is visible and the keycard is now
                            retrievable.
     keycard_taken        - keycard sprite hidden, in inventory
     bridge_door_unlocked - the door from the science lab into
                            the bridge has been opened. Triggers
                            the silent emptying of pod 4 (the
                            corpse vanishes; the infected science
                            officer becomes a roaming threat).
                            (Set later, in a future room.)

   CRYO PODS IMAGE STATES (Cryo Room 3 Pods *.png):
     [default]              Pods.png   — wiring sabotaged, pod 4 sealed
     pod4_wiring_repaired   Pods B.png — wiring patched, pod 4 still sealed
     pod4_opened            Pods C.png — pod 4 open, body visible inside
     bridge_door_unlocked   Pods D.png — pod 4 empty (officer has left)
   ============================================================ */

const ITEMS = {
  keycard: {
    name: "Crew Keycard",
    icon:   "Images/items/keycard.png",
    cursor: "Images/items/keycard_cursor.png",
    description: "Magnetic ID card pulled from the science officer's suit. Unlocks low-level crew systems.",
  },

  // TODO: add icon + cursor images when art is ready.
  // Foil strips are found elsewhere in the ship and used to patch the
  // severed wiring panel beside cryo pod 4.
  foil_strips: {
    name: "Foil Strips",
    icon:   "Images/items/foil_strips.png",
    description: "A few lengths of conductive foil tape. Thin enough to bridge a broken circuit.",
  },
};

const ROOMS = {
  cryo: {
    title: "Cryo Sleep Bay",
    startWall: 0,

    /* The four walls form a clockwise ring. The player starts on
       Wall 1 (terminal). Right arrow = next index, left = previous.
         0: Wall 1 — Terminal      (front)
         1: Wall 2 — Science Lab door (right)
         2: Wall 3 — Cryo pods     (back)
         3: Wall 4 — Shuttle Bay door (left)
    */
    walls: [
      // ============================================================
      // WALL 1 — TERMINAL (the wall the player faces on wake-up)
      // ============================================================
      // NOTE: ?v=2 is a cache-buster appended to all cryo room art
      // after the May 2026 image refresh. Bump the integer the next
      // time we replace any of these PNGs so browsers reliably load
      // the new file instead of the cached old one.
      {
        id: "cryo_wall_1_terminal",
        plate: "Images/Cryo%20Room%201.png?v=2",
        atmosphere: "cryo-emergency",
        sprites: [
          // Terminal mounted on the wall. Full-size transparent
          // overlay PNG — props are pre-positioned in the file.
          {
            id: "wall_terminal",
            image: "Images/Cryo%20Room%201%20Terminal.png?v=2",
            x: 0, y: 0, w: 1920, h: 1080,
          },
        ],
        hotspots: [
          // Click the terminal screen → open the interactive
          // terminal close-up (HTML-driven). The hotspot bbox
          // matches the visible terminal in the PNG (alpha bbox:
          // x=728..1184, y=338..581).
          {
            id: "terminal",
            shape: "rect",
            geom: [728, 338, 456, 243],
            label: "Cryo control terminal",
            action: { type: "openCloseup", target: "cryo_terminal" },
          },
        ],
      },

      // ============================================================
      // WALL 2 — SCIENCE LAB DOOR (turn right from terminal)
      // ============================================================
      {
        id: "cryo_wall_2_lab_door",
        plate: "Images/Cryo%20Room%202.png?v=2",
        atmosphere: "cryo-emergency",
        sprites: [],
        hotspots: [
          // The central pressure door. Locked; reader accepts the
          // crew keycard but the lab circuit has no power yet.
          {
            id: "lab_door",
            shape: "rect",
            geom: [670, 80, 580, 840],
            label: "Door — 02: Science Lab",
            action: {
              type: "useItem",
              accepts: ["keycard"],
              onAccept: {
                message: "The keycard reader blinks green, but the door's actuators have no power. You'll need to restore the lab circuit first.",
              },
              onReject: {
                message: "The door is locked. There's a card reader beside it. Label: 02 — SCIENCE LAB.",
              },
            },
          },
        ],
      },

      // ============================================================
      // WALL 3 — CRYO PODS (the wall the player awakened from)
      // ============================================================
      {
        id: "cryo_wall_3_pods",
        plate: "Images/Cryo%20Room%203.png?v=2",
        atmosphere: "cryo-emergency",
        sprites: [
          // The pod overlay swaps between four variants depending on
          // game state. Only one is ever visible at a time.
          //
          //   A — default: wiring sabotaged, pod 4 sealed
          {
            id: "wall_pods_a",
            image: "Images/Cryo%20Room%203%20Pods.png?v=3",
            x: 0, y: 0, w: 1920, h: 1080,
            hideIf: { all: ["pod4_wiring_repaired"] },
          },
          //   B — wiring patched, pod 4 still sealed
          {
            id: "wall_pods_b",
            image: "Images/Cryo%20Room%203%20Pods%20B.png?v=1",
            x: 0, y: 0, w: 1920, h: 1080,
            showIf: { all: ["pod4_wiring_repaired"] },
            hideIf: { all: ["pod4_opened"] },
          },
          //   C — pod 4 open, body visible
          {
            id: "wall_pods_c",
            image: "Images/Cryo%20Room%203%20Pods%20C.png?v=1",
            x: 0, y: 0, w: 1920, h: 1080,
            showIf: { all: ["pod4_opened"] },
            hideIf: { all: ["bridge_door_unlocked"] },
          },
          //   D — pod 4 empty (science officer has left)
          {
            id: "wall_pods_d",
            image: "Images/Cryo%20Room%203%20Pods%20D.png?v=1",
            x: 0, y: 0, w: 1920, h: 1080,
            showIf: { all: ["bridge_door_unlocked"] },
          },
          // Crew keycard, retrievable from the science officer's suit
          // ONLY after the pod has been unsealed via the terminal.
          // Hidden once the player picks it up.
          {
            id: "keycard_in_pod",
            image: "Images/items/keycard.png",
            x: 1500, y: 880, w: 90, h: 56,
            showIf: { all: ["pod4_opened"] },
            hideIf: { all: ["keycard_taken"] },
          },
        ],
        hotspots: [
          // ---- Wiring access panel (bottom-right of the pod wall) ----
          // Disappears once the wiring has been repaired.
          // NOTE: geom is an estimate — press D in-game to enter debug
          // mode and see the hotspot overlay; adjust x/y/w/h as needed
          // once the final art is in place.
          {
            id: "wiring_box",
            shape: "rect",
            geom: [1720, 840, 165, 160],
            label: "Wiring access panel",
            hideIf: { all: ["pod4_wiring_repaired"] },
            action: {
              type: "useItem",
              accepts: ["foil_strips"],
              onReject: {
                message: "A small panel hangs open beside pod 4, exposing a bundle of wiring. Each connection has been cleanly severed — this wasn't an accident. Maybe the right materials could bridge the breaks.",
              },
              onAccept: {
                message: "You press the foil strips across each severed connection, bridging the breaks one by one. The wiring hums faintly. A status indicator near pod 4 flickers on.",
                flags: ["pod4_wiring_repaired"],
                consume: true,
              },
            },
          },

          // ---- Four pod hotspots ----
          // All flavour/lore lives in the terminal close-up; the pod
          // hotspots themselves give only the bare physical observation.
          {
            id: "pod1",
            shape: "rect",
            geom: [174, 80, 410, 800],
            label: "Pod 01 — your pod",
            action: {
              type: "message",
              message: "Your pod. The lid is up and the inside is still cold.",
            },
          },
          {
            id: "pod2",
            shape: "rect",
            geom: [584, 80, 386, 800],
            label: "Pod 02",
            action: {
              type: "message",
              message: "The pod is empty.",
            },
          },
          {
            id: "pod3",
            shape: "rect",
            geom: [970, 80, 365, 800],
            label: "Pod 03",
            action: {
              type: "message",
              message: "The pod is empty.",
            },
          },
          // Pod 04 — appearance changes after it's been opened, but
          // the message at this hotspot stays deliberately bare.
          // Identifying who's inside is the terminal's job.
          {
            id: "pod4",
            shape: "rect",
            geom: [1335, 80, 385, 800],
            label: "Pod 04",
            hideIf: { all: ["pod4_opened"] },
            action: {
              type: "message",
              message: "Someone is inside, sealed in an EVA suit. Looks dead — but you're not sure.",
            },
          },
          {
            id: "pod4_open",
            shape: "rect",
            geom: [1335, 80, 385, 800],
            label: "Pod 04 — open",
            showIf: { all: ["pod4_opened"] },
            action: {
              type: "message",
              message: "The pod is open. The suited body inside hasn't moved.",
            },
          },
          // Pick up the keycard. Visible only after pod 4 has been
          // opened, hidden once the player picks it up.
          {
            id: "pickup_keycard",
            shape: "rect",
            geom: [1490, 870, 110, 80],
            label: "Take keycard from suit",
            showIf: { all: ["pod4_opened"] },
            hideIf: { all: ["keycard_taken"] },
            action: {
              type: "pickup",
              item: "keycard",
              flags: ["keycard_taken"],
              message: "You take the science officer's keycard from a clip on the suit.",
            },
          },
        ],
      },

      // ============================================================
      // WALL 4 — SHUTTLE BAY DOOR (turn right again, or left from W1)
      // ============================================================
      {
        id: "cryo_wall_4_shuttle_door",
        plate: "Images/Cryo%20Room%204.png?v=2",
        atmosphere: "cryo-emergency",
        sprites: [],
        hotspots: [
          // Sealed door — the shuttle bay beyond is exposed to vacuum.
          {
            id: "shuttle_door",
            shape: "rect",
            geom: [670, 80, 580, 840],
            label: "Door — 04: Shuttle Bay",
            action: {
              type: "message",
              message: "SEALED. Label: 04 — SHUTTLE BAY. The bay beyond is exposed to vacuum. Opening this would kill you.",
            },
          },
        ],
      },
    ],
  },
};

const CLOSEUPS = {
  // Interactive terminal close-up: a full-screen background image of
  // the terminal panel, with a custom HTML interface mounted on top
  // of it (no overlay tinting — the PNG carries the visual frame).
  // The engine recognises kind: "html" and dispatches to the
  // controller registered under this id.
  cryo_terminal: {
    image: "Images/closeups/Cryo%20Room%201%20Terminal%20Closeup.png",
    kind: "html",
    controller: "cryo_terminal",
  },
};

/* Optional: simple validator so typos don't silently break things. */
window.STARLOCK_DATA = { ITEMS, ROOMS, CLOSEUPS };
