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
     pod4_wiring_repaired    - the sabotaged wiring panel next to pod 4
                               has been reconnected using foil strips.
                               Required before the cryo terminal will
                               allow pod 4 to be released.
                               For dev testing, run:
                                 Engine.setFlag('pod4_wiring_repaired')
                               in the browser console.
     pod4_opened             - Vance's pod has been unsealed via the
                               terminal. The suited body is visible and
                               the keycard is now retrievable.
     keycard_taken           - keycard sprite hidden, in inventory
     bridge_door_unlocked    - the door from the science lab into
                               the bridge has been opened. Triggers
                               the silent emptying of pod 4 (Vance has
                               left; the inhabited science officer
                               becomes a roaming threat).
                               (Set later, in a future room.)

     SCIENCE LAB FLAGS:
     log1_read               - player has read Reyes' Log 1
                               (expedition record; contains auth code 0743)
     log2_read               - player has read Reyes' Log 2
                               (Vance's infection and cryo-sealing)
     coded_note_scanned      - Reyes' coded note has been scanned at the
                               log terminal; Log 3 is now unlocked.
     log3_read               - player has read Reyes' Log 3
                               (the Reyes/Tarn dispute record)
     workbench_notes_read    - player has read Vance's workbench notes;
                               storage access code 3-7-1 is now known.
     specimen_storage_unlocked - the specimen storage unit has been
                               opened with code 3-7-1; all three
                               containers are accessible.
     container_a_examined    - empty container examined
     container_b_examined    - cracked container examined (infection site)
     container_c_examined    - live specimen container examined
     freq_emitter_taken      - frequency emitter retrieved from
                               Container A; scanner component 2/4.
     card_in_terminal        - player has inserted the crew keycard into
                               the upgrade terminal. The card is held by
                               the machine until the correct authorization
                               code (0743) is entered. The card is NOT in
                               inventory while this flag is set.
     upgrade_puzzle_solved   - (legacy, no longer used by hotspots)
     card_upgraded           - player completed the upgrade sequence;
                               keycard_upgraded is now in inventory;
                               original keycard was consumed by terminal.

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

  // Found in Container A of the specimen storage in the science lab.
  // Vance stored it there before the incident. Scanner component 2/4.
  // Required for assembling Vance's glitch scanner on the workbench.
  freq_emitter: {
    name: "Frequency Emitter",
    icon:   "Images/items/keycard.png?v=2",   // placeholder icon — replace when art exists
    description: "A small audio transducer, tuned to a narrow frequency range. Vance's handwriting on the case reads: 'reactive band — do not exceed 80%'. One of four components needed to complete the scanner.",
  },

  // Produced by entering the authorization code at the card upgrade
  // terminal in the science lab (code: 0743, found in Reyes' Log 1)
  // and then inserting the keycard. Required to open the bridge door.
  keycard_upgraded: {
    name: "Upgraded Keycard",
    icon:   "Images/items/keycard.png?v=2",
    cursor: "Images/items/keycard_cursor.png?v=2",
    description: "Your crew keycard, rewritten to senior clearance. The stripe now carries bridge-level authorization.",
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
            x: 1215, y: 548,
            dotClass: "reader-dot reader-dot--blink-red",
            hideIf: { all: ["lab_door_unlocked"] },
          },
          {
            id: "reader_light_green",
            x: 1215, y: 548,
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
  // Four walls in a clockwise ring. Player enters from the cryo
  // room facing the bridge door (wall 0). Turning right (clockwise):
  //   0: Wall A — Bridge door + card upgrade terminal  (Science Lab 2.png)
  //   1: Wall C — Specimen storage unit                (Science Lab 3.png)
  //   2: Wall B — Cryo return door + Reyes' log term.  (Science Lab 4.png)
  //   3: Wall D — Vance's workbench + scanner assembly (Science Lab 1.png)
  //
  // WALL A (0): Player enters here. Bridge door ahead; card upgrade
  //   terminal to the right. Terminal puzzle code: 0743 (found in
  //   Reyes' Log 1 on Wall B). Enter code then insert the crew keycard
  //   into the blue slot to receive keycard_upgraded (SENIOR CREW).
  //
  // WALL C (1): Specimen storage unit (first right turn from entry).
  //   Three containers — empty, cracked, live specimen. Storage access
  //   panel requires batch code 3-7-1 from Vance's notes on Wall D.
  //
  // WALL B (2): Cryo return door (right side) + Reyes' log terminal
  //   (left side). Facing this wall puts the cryo door ahead-right.
  //   Log 3 requires scanning the coded note (coded_message item).
  //   Log 1 contains mission auth code 0743.
  //
  // WALL D (3): Vance's workbench. Scanner chassis + calibration lens
  //   (component 1/4). Notes reveal storage code 3-7-1 and schematic.
  // ============================================================
  science_lab: {
    title: "Science Lab",
    startWall: 0,

    walls: [

      // ============================================================
      // WALL A (0) — BRIDGE DOOR + CARD UPGRADE TERMINAL
      // Science Lab 2.png
      // ============================================================
      {
        id: "scilab_wall_a_bridge",
        plate: "Images/Science%20Lab%202.png",
        atmosphere: "cryo-emergency",
        sprites: [
          {
            id: "scilab_wall_a_card_reader_overlay",
            image: "Images/Science%20Lab%202%20card%20reader.png",
            x: 0, y: 0, w: 1920, h: 1080,
          },
        ],
        overlays: [
          {
            id: "bridge_reader_light_red",
            x: 1215, y: 548,
            dotClass: "reader-dot reader-dot--blink-red",
            hideIf: { all: ["bridge_door_unlocked"] },
          },
          {
            id: "bridge_reader_light_green",
            x: 1215, y: 548,
            dotClass: "reader-dot reader-dot--solid-green",
            showIf: { all: ["bridge_door_unlocked"] },
          },
        ],
        hotspots: [
          // ---- Bridge door (locked) ----
          {
            id: "bridge_door_locked",
            shape: "rect",
            geom: [670, 80, 580, 840],
            label: "Door — 01: Bridge",
            hideIf: { all: ["bridge_door_unlocked"] },
            action: {
              type: "message",
              message: "The door is sealed. A card reader is mounted to the right. You'll need a senior crew keycard.",
            },
          },
          // ---- Bridge door (open) ----
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
          // ---- Bridge card reader — requires upgraded keycard ----
          // The base keycard is insufficient; the upgrade terminal
          // on this same wall must be solved first.
          {
            id: "bridge_keycard_reader",
            shape: "rect",
            geom: [1060, 290, 160, 380],
            label: "Keycard reader — Bridge",
            hideIf: { all: ["bridge_door_unlocked"] },
            action: {
              type: "useItem",
              accepts: ["keycard_upgraded"],
              onAccept: {
                flags: ["bridge_door_unlocked"],
                message: "The reader blinks green. A heavy clunk echoes through the door frame — bridge access granted.",
              },
              onReject: {
                message: "Keycard reader — 01: BRIDGE. CLEARANCE INSUFFICIENT. Senior crew authorization required. The upgrade terminal nearby might be able to help.",
              },
            },
          },
          // ---- Card upgrade terminal ----
          // Opens the upgrade terminal closeup. The closeup handles both
          // the 4-digit code entry (code: 0743) AND the keycard insertion
          // step (equip keycard, click blue slot). Once done, the wall
          // hotspot shows a simple "idle" message instead.
          // NOTE: geom is an estimate — tune with debug mode (D).
          {
            id: "scilab_upgrade_terminal",
            shape: "rect",
            geom: [1480, 200, 400, 600],
            label: "Card upgrade terminal",
            hideIf: { all: ["card_upgraded"] },
            action: {
              type: "openCloseup",
              target: "scilab_upgrade_terminal",
            },
          },
          // ---- Card upgrade terminal — done ----
          {
            id: "scilab_upgrade_terminal_done",
            shape: "rect",
            geom: [1480, 200, 400, 600],
            label: "Card upgrade terminal",
            showIf: { all: ["card_upgraded"] },
            action: {
              type: "message",
              message: "Upgrade complete. The terminal is idle.",
            },
          },
        ],
      },

      // ============================================================
      // WALL C (1) — SPECIMEN STORAGE
      // Science Lab 3.png (background) + Science Lab 3 specimens.png (foreground)
      //
      // First right turn from the bridge-door wall. Three specimen
      // containers in a sealed storage unit. The storage access panel
      // requires batch code 3-7-1 from Vance's workbench notes on Wall D.
      //
      // Containers:
      //   A — empty (freq_emitter item stored here by Vance)
      //   B — cracked (where the glitch escaped during experiment)
      //   C — live specimen (glitch still active inside)
      //
      // NOTE: All geom values are estimates — tune with debug mode.
      // ============================================================
      {
        id: "scilab_wall_c_storage",
        plate: "Images/Science%20Lab%203.png",
        atmosphere: "cryo-emergency",
        sprites: [
          {
            id: "scilab_wall_c_specimens_overlay",
            image: "Images/Science%20Lab%203%20specimens.png",
            x: 0, y: 0, w: 1920, h: 1080,
          },
        ],
        overlays: [],
        hotspots: [
          // ---- Specimen storage unit — locked state ----
          // Opens the batch-code closeup. Code: 3-7-1 (from workbench).
          {
            id: "scilab_storage_locked",
            shape: "rect",
            geom: [150, 180, 500, 640],
            label: "Specimen storage unit",
            hideIf: { all: ["specimen_storage_unlocked"] },
            action: {
              type: "openCloseup",
              target: "scilab_storage_panel",
              message: "A sealed specimen storage unit. The access panel has a 3-digit code entry. The batch reference number should be in Vance's notes.",
            },
          },
          // ---- Container A — empty (unlocked) ----
          // Contains the frequency emitter (scanner component 2/4).
          {
            id: "scilab_container_a",
            shape: "rect",
            geom: [180, 220, 140, 300],
            label: "Container A",
            showIf: { all: ["specimen_storage_unlocked"] },
            hideIf: { all: ["freq_emitter_taken"] },
            action: {
              type: "pickup",
              item: "freq_emitter",
              flags: ["container_a_examined", "freq_emitter_taken"],
              message: "Container A is empty — no specimen. But Vance stored something here for safekeeping: a small audio transducer in a padded case. Handwritten label: 'Freq. emitter — reactive band.' A component for the scanner.",
            },
          },
          {
            id: "scilab_container_a_empty",
            shape: "rect",
            geom: [180, 220, 140, 300],
            label: "Container A — empty",
            showIf: { all: ["specimen_storage_unlocked", "freq_emitter_taken"] },
            action: {
              type: "message",
              message: "Container A is empty. The frequency emitter has been retrieved. The container itself is clean — whatever specimen was catalogued here is gone. Tarn's badge was last logged in this lab before the shuttle launched.",
            },
          },
          // ---- Container B — cracked ----
          {
            id: "scilab_container_b",
            shape: "rect",
            geom: [360, 220, 140, 300],
            label: "Container B — cracked",
            showIf: { all: ["specimen_storage_unlocked"] },
            action: {
              type: "setState",
              flags: ["container_b_examined"],
              message: "Container B's seal is broken from the inside. The glass is cracked in an outward pattern. Inside, there are faint traces of residue — a kind of crystalline film left behind when the specimen moved through. This is where the glitch escaped during Vance's experiment.",
            },
          },
          // ---- Container C — live specimen ----
          {
            id: "scilab_container_c",
            shape: "rect",
            geom: [540, 220, 140, 300],
            label: "Container C — live specimen",
            showIf: { all: ["specimen_storage_unlocked"] },
            action: {
              type: "setState",
              flags: ["container_c_examined"],
              message: "Container C is intact and sealed. Inside, a cluster of small translucent squares shifts and reorganises slowly. It seems aware of you — the cluster orients toward the glass as you lean in. The squares are hollow, crystalline, and beautiful in a way that makes the back of your neck tighten. This is the only surviving glitch specimen on the ship.",
            },
          },
        ],
      },

      // ============================================================
      // WALL B (2) — CRYO RETURN DOOR + REYES' LOG TERMINAL
      // Science Lab 4.png (background) + Science Lab 4 terminal.png (foreground)
      //
      // Second right turn from entry. The cryo return door is on the
      // RIGHT side of this wall. Reyes' log terminal is on the LEFT.
      // Entering from the cryo room, the player faces the shuttle bay
      // wall (cryo startWall: 3).
      //
      // Three log entries in the HTML terminal close-up. Log 1 and
      // Log 2 are freely accessible. Log 3 requires scanning Reyes'
      // coded note (coded_message item) — note is NOT consumed.
      // Log 1 contains mission auth code 0743.
      //
      // NOTE: Hotspot geom is an estimate — tune with debug mode (D).
      // ============================================================
      {
        id: "scilab_wall_b_logs",
        plate: "Images/Science%20Lab%204.png",
        atmosphere: "cryo-emergency",
        sprites: [
          {
            id: "scilab_wall_b_terminal_overlay",
            image: "Images/Science%20Lab%204%20terminal.png",
            x: 0, y: 0, w: 1920, h: 1080,
          },
        ],
        overlays: [
          // Cryo return door reader — green once the lab door was unlocked.
          {
            id: "cryo_return_light_green",
            x: 1215, y: 548,
            dotClass: "reader-dot reader-dot--solid-green",
            showIf: { all: ["lab_door_unlocked"] },
          },
        ],
        hotspots: [
          // ---- Log terminal — single hotspot in the LEFT THIRD of Wall B ----
          // The close-up controller (scilab_log_terminal) handles all
          // three log entries, the physical scanner slot, and Log 3 gating.
          // NOTE: Adjust geom in debug mode (D) once art is confirmed.
          {
            id: "scilab_log_terminal",
            shape: "rect",
            geom: [60, 120, 480, 780],
            label: "Reyes' log terminal",
            action: {
              type: "openCloseup",
              target: "scilab_log_terminal",
            },
          },
          // ---- Cryo return door (CENTRE of Wall B) ----
          // Returns the player to Cryo Room Wall 3 (shuttle bay door wall)
          // so they face the opposite side of the room from where they came.
          // NOTE: Adjust geom in debug mode (D) once art is confirmed.
          {
            id: "cryo_return_door",
            shape: "rect",
            geom: [670, 80, 580, 840],
            label: "Door — 03: Cryo Room",
            action: {
              type: "gotoRoom",
              room: "cryo",
              startWall: 3,
            },
          },
        ],
      },

      // ============================================================
      // WALL D (3) — VANCE'S WORKBENCH + SCANNER ASSEMBLY
      // Science Lab 1.png (background) + Science Lab 1 workshop.png (foreground)
      //
      // Vance's workspace. The incomplete scanner chassis sits here
      // with the calibration lens already partially installed
      // (scanner component 1/4). Vance's handwritten notes are
      // readable on the bench — they contain the storage batch code
      // (3-7-1) and a schematic for assembling the full scanner.
      //
      // The scanner requires all 4 components before it works.
      // Currently the only one present is component 1 (cal. lens).
      // The others are collected over the course of the game.
      //
      // NOTE: All geom values are estimates — tune with debug mode.
      // ============================================================
      {
        id: "scilab_wall_d_workbench",
        plate: "Images/Science%20Lab%201.png",
        atmosphere: "cryo-emergency",
        sprites: [
          {
            id: "scilab_wall_d_workshop_overlay",
            image: "Images/Science%20Lab%201%20workshop.png",
            x: 0, y: 0, w: 1920, h: 1080,
          },
        ],
        overlays: [],
        hotspots: [
          // ---- Workbench notes ----
          // Reading reveals storage code 3-7-1 and scanner schematic.
          {
            id: "scilab_workbench_notes",
            shape: "rect",
            geom: [900, 560, 500, 300],
            label: "Vance's workbench notes",
            hideIf: { all: ["workbench_notes_read"] },
            action: {
              type: "setState",
              flags: ["workbench_notes_read"],
              message: "Vance's handwritten notes, spread across the bench.\n\nSpecimen batch ref: 3-7-1. Containers stored in sealed unit per protocol.\n\nScanner schematic (partial):\n  [1] Calibration lens — installed (in chassis)\n  [2] Frequency emitter — stored in Container A (reactive band, handle carefully)\n  [3] Power cell — not yet sourced (standard HD cell, cryo kit compatible)\n  [4] Signal amplifier — check bridge command console\n\nNotes on the glitch: audio stimulus in the mid-range produces strong agitation response. Possible interaction with light at higher intensities. Suggest further testing. DO NOT exceed 80% emitter output without additional containment.",
            },
          },
          {
            id: "scilab_workbench_notes_read",
            shape: "rect",
            geom: [900, 560, 500, 300],
            label: "Vance's workbench notes",
            showIf: { all: ["workbench_notes_read"] },
            action: {
              type: "message",
              message: "You've already read Vance's notes. Storage batch code: 3-7-1. Scanner needs: calibration lens (in chassis), frequency emitter (Container A), power cell (cryo kit), signal amplifier (bridge).",
            },
          },
          // ---- Scanner chassis ----
          // Shows assembly state. Currently incomplete.
          {
            id: "scilab_scanner_chassis",
            shape: "rect",
            geom: [600, 280, 500, 400],
            label: "Scanner chassis — incomplete",
            action: {
              type: "message",
              message: "Vance's scanner, partially assembled. The calibration lens is installed in the forward housing. Three component slots are empty. The device won't function until all four components are in place. Vance's notes on the bench describe what goes where.",
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

  // Combination-lock close-up for chest 003 on Wall 4.
  // 3-digit wheel lock starting at 9-7-2. Solution: 0-0-3.
  // Solving sets chest4_003_opened and adds metal_shears to inventory.
  cryo_chest_combo: {
    image: "Images/closeups/Cryo%20Room%204%20Chest%20Closeup.png?v=2",
    kind: "html",
    controller: "cryo_chest_combo",
  },

  // ---- Science Lab: Card upgrade terminal ----
  // Phase 1 — 4-digit keypad. Correct code: 0743 (Reyes' mission auth
  // number, found in Reyes' Log 1 on Wall B). Sets flag: upgrade_puzzle_solved.
  // Phase 2 — card insertion. The controller keeps the closeup open after the
  // code is accepted and shows an interactive card slot (252×47 at x=1132,
  // y=694). Player equips the crew keycard and clicks the slot. This consumes
  // the keycard and adds keycard_upgraded. Sets flag: card_upgraded.
  scilab_upgrade_terminal: {
    image: "Images/closeups/Science%20Lab%202%20Terminal.png",
    kind: "html",
    controller: "scilab_upgrade_terminal",
  },

  // ---- Science Lab: Specimen storage panel ----
  // 3-digit batch code entry. Correct code: 3-7-1 (found in Vance's
  // workbench notes on Wall D).
  // Solving sets flag: specimen_storage_unlocked.
  scilab_storage_panel: {
    image: "Images/closeups/Science%20Lab%203%20Terminal.png",
    kind: "html",
    controller: "scilab_storage_panel",
  },

  // ---- Science Lab: Reyes' log terminal ----
  // HTML terminal with three log entries. Log 1 and Log 2 are
  // freely accessible. Log 3 requires the coded note (coded_message)
  // to be scanned — this sets coded_note_scanned and unlocks Log 3.
  scilab_log_terminal: {
    image: "Images/closeups/Science%20Lab%204%20Terminal.png",
    kind: "html",
    controller: "scilab_log_terminal",
  },
};

/* Optional: simple validator so typos don't silently break things. */
window.STARLOCK_DATA = { ITEMS, ROOMS, CLOSEUPS };
