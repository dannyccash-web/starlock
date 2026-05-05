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
    icon:   "Images/items/keycard.png?v=2",
    cursor: "Images/items/keycard_cursor.png?v=2",
    description: "Magnetic ID card pulled from the science officer's suit. Unlocks low-level crew systems.",
  },

  // Found in chest 003 on Wall 4 (combo lock, code: 003).
  // Equip and use on the metallic foil jacket in Wall 2 to
  // obtain foil strips.
  metal_shears: {
    name: "Metal Shears",
    icon:   "Images/items/metal%20shears.png",
    cursor: "Images/items/metal%20shears%20cursor.png",
    description: "Heavy-duty cutting shears. Could slice through thin metal or foil.",
  },

  // Found in Reyes' locker (chest 002, Wall 2). A clue item —
  // the player cannot decipher it yet.
  coded_message: {
    name: "Coded Note",
    icon:   "Images/items/coded_message.png",
    description: "A folded piece of paper covered in rows of dense symbols. The pattern looks deliberate, but you can't make sense of it.",
  },

  // Obtained by using the metal shears on the foil jacket in
  // Wall 2. Used to repair the severed wiring panel beside
  // cryo pod 4 in Wall 3.
  foil_strips: {
    name: "Foil Strips",
    icon:   "Images/items/foil%20strips.png",
    cursor: "Images/items/foil%20strips%20cursor.png",
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
        plate: "Images/Cryo%20Room%201.png?v=3",
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
          // EVA suit hanging on the right side of the terminal wall.
          // NOTE: Tune geom with debug mode (D key) once art position confirmed.
          {
            id: "eva_suit",
            shape: "rect",
            geom: [1350, 120, 290, 780],
            label: "EVA suit",
            action: {
              type: "message",
              message: "Your EVA suit. The others that should be hanging here are gone — either in use, or missing.",
            },
          },
        ],
      },

      // ============================================================
      // WALL 2 — SCIENCE LAB DOOR (turn right from terminal)
      // ============================================================
      // Cryo Room 2.png updated May 2026 (v4): keycard reader panel added.
      {
        id: "cryo_wall_2_lab_door",
        plate: "Images/Cryo%20Room%202.png?v=4",
        atmosphere: "cryo-emergency",
        sprites: [
          // Chest 001 — bottom-left. Closed by default; swaps to open.
          {
            id: "chest2_001_closed",
            image: "Images/Cryo%20Room%202%20001%20closed.png?v=1",
            x: 0, y: 0, w: 1920, h: 1080,
            hideIf: { all: ["chest2_001_opened"] },
          },
          {
            id: "chest2_001_open",
            image: "Images/Cryo%20Room%202%20001%20open.png?v=1",
            x: 0, y: 0, w: 1920, h: 1080,
            showIf: { all: ["chest2_001_opened"] },
          },
          // Chest 002 — bottom-right. Same open/close swap.
          {
            id: "chest2_002_closed",
            image: "Images/Cryo%20Room%202%20002%20closed.png?v=1",
            x: 0, y: 0, w: 1920, h: 1080,
            hideIf: { all: ["chest2_002_opened"] },
          },
          {
            id: "chest2_002_open",
            image: "Images/Cryo%20Room%202%20002%20open.png?v=1",
            x: 0, y: 0, w: 1920, h: 1080,
            showIf: { all: ["chest2_002_opened"] },
          },
        ],
        // Overlay dots for the keycard reader indicator light.
        // Red blinking = door locked; green solid = door open.
        // Tune x/y with debug mode (D key) once final art is confirmed.
        overlays: [
          {
            id: "reader_light_red",
            x: 1205, y: 553,
            dotClass: "reader-dot reader-dot--blink-red",
            hideIf: { all: ["lab_door_unlocked"] },
          },
          {
            id: "reader_light_green",
            x: 1205, y: 553,
            dotClass: "reader-dot reader-dot--solid-green",
            showIf: { all: ["lab_door_unlocked"] },
          },
        ],
        hotspots: [
          // ---- Science Lab door (locked state) ----
          // Hidden once the keycard has been used on the reader panel.
          {
            id: "lab_door_locked",
            shape: "rect",
            geom: [670, 80, 580, 840],
            label: "Door — 02: Science Lab",
            hideIf: { all: ["lab_door_unlocked"] },
            action: {
              type: "message",
              message: "The door is sealed. A card reader is mounted on the panel to the right.",
            },
          },
          // ---- Science Lab door (open state) ----
          // Visible once the door has been unlocked with the keycard.
          {
            id: "lab_door_open",
            shape: "rect",
            geom: [670, 80, 580, 840],
            label: "Door — 02: Science Lab (open)",
            showIf: { all: ["lab_door_unlocked"] },
            action: {
              type: "gotoRoom",
              room: "science_lab",
              startWall: 0,
            },
          },
          // ---- Keycard reader panel (right of the door) ----
          // Hidden once the door is already unlocked.
          // NOTE: Adjust geom once art position is confirmed (press D for debug overlay).
          {
            id: "lab_keycard_reader",
            shape: "rect",
            geom: [1060, 290, 160, 380],
            label: "Keycard reader — Science Lab",
            hideIf: { all: ["lab_door_unlocked"] },
            action: {
              type: "useItem",
              accepts: ["keycard"],
              onAccept: {
                flags: ["lab_door_unlocked"],
                message: "The reader blinks green. A deep clunk echoes through the door frame as the actuators release. Science Lab is open.",
              },
              onReject: {
                message: "A keycard reader. Label: 02 — SCIENCE LAB.",
              },
            },
          },

          // ---- Chest 001 (bottom-left) — your locker ----
          // Bbox of closed chest sprite: x=181–544, y=803–1011
          {
            id: "chest2_001",
            shape: "rect",
            geom: [181, 803, 363, 208],
            label: "Locker 001 — your locker",
            hideIf: { all: ["chest2_001_opened"] },
            action: {
              type: "setState",
              flags: ["chest2_001_opened"],
              message: "Your locker. Empty.",
            },
          },

          // ---- Chest 002 (bottom-right) — Reyes' locker ----
          // Bbox of closed chest sprite: x=1390–1756, y=800–1009
          // Contains a coded note the player cannot yet decipher.
          {
            id: "chest2_002",
            shape: "rect",
            geom: [1390, 800, 366, 209],
            label: "Locker 002 — Reyes",
            hideIf: { all: ["chest2_002_opened"] },
            action: {
              type: "pickup",
              item: "coded_message",
              flags: ["chest2_002_opened"],
              message: "Reyes' locker. Inside, a folded piece of paper covered in symbols you don't recognise.",
            },
          },

          // ---- Foil jacket (left wall, above chest 001) ----
          // Equip the metal shears and use them here to obtain foil strips.
          // Hotspot covers the visible jacket area; hidden once stripped.
          // NOTE: Adjust geom in debug mode (D key) once final art position
          // is confirmed.
          {
            id: "foil_jacket",
            shape: "rect",
            geom: [200, 300, 450, 480],
            label: "Metallic foil jacket",
            hideIf: { all: ["foil_jacket_used"] },
            action: {
              type: "useItem",
              accepts: ["metal_shears"],
              onAccept: {
                addItem: "foil_strips",
                flags: ["foil_jacket_used"],
                message: "You cut several strips from the jacket lining and pocket them.",
              },
              onReject: {
                message: "A metallic thermal jacket — standard issue for warming the body after cryo sleep. The layered foil lining holds heat quickly.",
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
          // (Keycard is retrieved by clicking the suited body after
          // the pod opens — no floating sprite needed.)
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
            geom: [1720, 670, 165, 250],
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
          // Pod 04 open — clicking the body searches the suit.
          // Before the keycard has been taken, the action picks it up.
          // After, the hotspot gives a bare observation.
          {
            id: "pod4_open_search",
            shape: "rect",
            geom: [1335, 80, 385, 800],
            label: "Pod 04 — search the body",
            showIf: { all: ["pod4_opened"] },
            hideIf: { all: ["keycard_taken"] },
            action: {
              type: "pickup",
              item: "keycard",
              flags: ["keycard_taken"],
              message: "You search the EVA suit. Tucked inside the collar, clipped to the lining, you find a crew keycard.",
            },
          },
          {
            id: "pod4_open_searched",
            shape: "rect",
            geom: [1335, 80, 385, 800],
            label: "Pod 04 — open",
            showIf: { all: ["pod4_opened", "keycard_taken"] },
            action: {
              type: "message",
              message: "The pod is open. The suited body is still inside.",
            },
          },
        ],
      },

      // ============================================================
      // WALL 4 — SHUTTLE BAY DOOR (turn right again, or left from W1)
      // ============================================================
      // Cryo Room 4.png updated May 2026 (v3): chests visible in scene.
      {
        id: "cryo_wall_4_shuttle_door",
        plate: "Images/Cryo%20Room%204.png?v=3",
        atmosphere: "cryo-emergency",
        sprites: [
          // Chest 003 — bottom-left. Opens via combination lock (code: 003).
          {
            id: "chest4_003_closed",
            image: "Images/Cryo%20Room%204%20003%20closed.png?v=1",
            x: 0, y: 0, w: 1920, h: 1080,
            hideIf: { all: ["chest4_003_opened"] },
          },
          {
            id: "chest4_003_open",
            image: "Images/Cryo%20Room%204%20003%20open.png?v=1",
            x: 0, y: 0, w: 1920, h: 1080,
            showIf: { all: ["chest4_003_opened"] },
          },
          // Chest 004 — bottom-right. Empty.
          {
            id: "chest4_004_closed",
            image: "Images/Cryo%20Room%204%20004%20closed.png?v=1",
            x: 0, y: 0, w: 1920, h: 1080,
            hideIf: { all: ["chest4_004_opened"] },
          },
          {
            id: "chest4_004_open",
            image: "Images/Cryo%20Room%204%20004%20open.png?v=1",
            x: 0, y: 0, w: 1920, h: 1080,
            showIf: { all: ["chest4_004_opened"] },
          },
        ],
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

          // ---- Chest 003 (bottom-left) — Tarn's locker, combination lock ----
          // Bbox of closed chest sprite: x=159–556, y=784–1010
          // Clicking shows owner info then opens the combo-lock close-up (3-digit, code: 003).
          {
            id: "chest4_003",
            shape: "rect",
            geom: [159, 784, 397, 226],
            label: "Locker 003 — Tarn",
            hideIf: { all: ["chest4_003_opened"] },
            action: {
              type: "openCloseup",
              target: "cryo_chest_combo",
              message: "Tarn's locker. A combination lock holds it shut.",
            },
          },

          // ---- Chest 004 (bottom-right) — Vance's locker, empty ----
          // Bbox of closed chest sprite: x=1367–1764, y=784–1011
          {
            id: "chest4_004",
            shape: "rect",
            geom: [1367, 784, 397, 227],
            label: "Locker 004 — Vance",
            hideIf: { all: ["chest4_004_opened"] },
            action: {
              type: "setState",
              flags: ["chest4_004_opened"],
              message: "Vance's locker. Empty.",
            },
          },
        ],
      },
    ],
  },

  // ============================================================
  // SCIENCE LAB
  // Four walls in a clockwise ring. Player enters facing the
  // bridge door (wall 0). Two right turns reaches the cryo
  // return door (wall 2).
  //   0: Bridge door  (01: BRIDGE)   — Science Lab 2.png
  //   1: Plain wall                  — Science Lab 1.png
  //   2: Cryo Room door (03: CRYO)   — Science Lab 4.png
  //   3: Plain wall                  — Science Lab 3.png
  // ============================================================
  science_lab: {
    title: "Science Lab",
    startWall: 0,

    walls: [
      // ============================================================
      // WALL 0 — BRIDGE DOOR (player enters facing this)
      // ============================================================
      {
        id: "scilab_wall_0_bridge_door",
        plate: "Images/Science%20Lab%202.png",
        atmosphere: "cryo-emergency",
        sprites: [],
        overlays: [
          {
            id: "bridge_reader_light_red",
            x: 1218, y: 585,
            dotClass: "reader-dot reader-dot--blink-red",
            hideIf: { all: ["bridge_door_unlocked"] },
          },
          {
            id: "bridge_reader_light_green",
            x: 1218, y: 585,
            dotClass: "reader-dot reader-dot--solid-green",
            showIf: { all: ["bridge_door_unlocked"] },
          },
        ],
        hotspots: [
          // Locked state — card reader active.
          {
            id: "bridge_door_locked",
            shape: "rect",
            geom: [670, 80, 580, 840],
            label: "Door — 01: Bridge",
            hideIf: { all: ["bridge_door_unlocked"] },
            action: {
              type: "message",
              message: "The door is sealed. A card reader is mounted on the panel to the right.",
            },
          },
          // Open state — navigate to bridge (placeholder until bridge is built).
          {
            id: "bridge_door_open",
            shape: "rect",
            geom: [670, 80, 580, 840],
            label: "Door — 01: Bridge (open)",
            showIf: { all: ["bridge_door_unlocked"] },
            action: {
              type: "message",
              message: "The bridge is ahead. [Room coming soon]",
            },
          },
          // Card reader panel (right of door). Same geometry as cryo lab reader.
          {
            id: "bridge_keycard_reader",
            shape: "rect",
            geom: [1060, 290, 160, 380],
            label: "Keycard reader — Bridge",
            hideIf: { all: ["bridge_door_unlocked"] },
            action: {
              type: "useItem",
              accepts: ["keycard"],
              onAccept: {
                flags: ["bridge_door_unlocked"],
                message: "The reader blinks green. A heavy clunk echoes through the door frame — bridge access granted.",
              },
              onReject: {
                message: "A keycard reader. Label: 01 — BRIDGE.",
              },
            },
          },
        ],
      },

      // ============================================================
      // WALL 1 — PLAIN WALL (right turn from bridge door)
      // ============================================================
      {
        id: "scilab_wall_1_plain",
        plate: "Images/Science%20Lab%201.png",
        atmosphere: "cryo-emergency",
        sprites: [],
        overlays: [],
        hotspots: [],
      },

      // ============================================================
      // WALL 2 — CRYO ROOM DOOR (two turns from bridge door)
      // Green light — the lab was already unlocked from the cryo side.
      // ============================================================
      {
        id: "scilab_wall_2_cryo_door",
        plate: "Images/Science%20Lab%204.png",
        atmosphere: "cryo-emergency",
        sprites: [],
        overlays: [
          {
            id: "cryo_return_light_green",
            x: 1218, y: 585,
            dotClass: "reader-dot reader-dot--solid-green",
            showIf: { all: ["lab_door_unlocked"] },
          },
        ],
        hotspots: [
          {
            id: "cryo_return_door",
            shape: "rect",
            geom: [670, 80, 580, 840],
            label: "Door — 03: Cryo Room",
            action: {
              type: "gotoRoom",
              room: "cryo",
              startWall: 1,   // cryo wall index 1 = the lab door wall
            },
          },
        ],
      },

      // ============================================================
      // WALL 3 — PLAIN WALL (left turn from bridge door)
      // ============================================================
      {
        id: "scilab_wall_3_plain",
        plate: "Images/Science%20Lab%203.png",
        atmosphere: "cryo-emergency",
        sprites: [],
        overlays: [],
        hotspots: [],
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

  // Combination-lock close-up for chest 003 on Wall 4.
  // 3-digit wheel lock starting at 9-7-2. Solution: 0-0-3.
  // Solving sets chest4_003_opened and adds metal_shears to inventory.
  cryo_chest_combo: {
    image: "Images/closeups/Cryo%20Room%204%20Chest%20Closeup.png?v=2",
    kind: "html",
    controller: "cryo_chest_combo",
  },
};

/* Optional: simple validator so typos don't silently break things. */
window.STARLOCK_DATA = { ITEMS, ROOMS, CLOSEUPS };
