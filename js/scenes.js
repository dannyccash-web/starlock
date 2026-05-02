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
                with its own sub-hot-spots.

   Coordinates are in a virtual 1920x1080 stage. Engine scales.

   FIELDS
   rooms[id]          - a logical room (cryo, lab, bridge, etc)
     walls[]          - clockwise list of wall views
       id             - unique within room
       plate          - URL of base image, OR null for placeholder
       placeholderLabel - shown if plate is null
       atmosphere     - CSS atmosphere class
       sprites[]      - { id, image, x, y, w, h, showIf?, hideIf? }
                        Full-size overlay sprites use x:0,y:0,
                        w:1920,h:1080. Smaller sprites (e.g. an
                        item lying on the floor) can use a tighter
                        rect.
       hotspots[]     - { id, shape: rect|poly, geom, label,
                          showIf?, hideIf?, requires?, action }
   closeups[id]       - { image, hotspots[] }
   items[id]          - { name, icon, description }

   STATE FLAGS:
     keycard_taken         - keycard sprite hidden, in inventory
     viewed_pod_log        - pod 4 quarantine log read at least once
     terminal_examined     - terminal panel has been read
   ============================================================ */

const ITEMS = {
  keycard: {
    name: "Crew Keycard",
    icon:   "Images/items/keycard.png",
    cursor: "Images/items/keycard_cursor.png",
    description: "Magnetic ID card. Unlocks low-level crew systems.",
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
          // Click the terminal screen → open the pod-status close-up.
          // The hotspot bbox matches the visible terminal in the PNG
          // (alpha bbox: x=728..1184, y=338..581).
          {
            id: "terminal",
            shape: "rect",
            geom: [728, 338, 456, 243],
            label: "Cryo control terminal",
            action: { type: "openCloseup", target: "cryo_panel_g4" },
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
          // The whole row of 4 cryo pods is one transparent overlay.
          // (Later we can swap this for a "pod 4 opened" variant by
          //  flipping showIf/hideIf flags.)
          {
            id: "wall_pods",
            image: "Images/Cryo%20Room%203%20Pods.png?v=2",
            x: 0, y: 0, w: 1920, h: 1080,
          },
          // Crew keycard, dropped beside Pod 04 (the deceased crew
          // member's pod). Hidden once the player picks it up.
          {
            id: "keycard_on_floor",
            image: "Images/items/keycard.png",
            x: 1500, y: 880, w: 90, h: 56,
            hideIf: { all: ["keycard_taken"] },
          },
        ],
        hotspots: [
          // Four pod hotspots, sized to each pod's visible frame in
          // the Pods.png overlay. Pods 2 and 3 are empty (others
          // escaped); Pod 1 is the player's; Pod 4 is the corpse.
          {
            id: "pod1",
            shape: "rect",
            geom: [174, 80, 410, 800],
            label: "Pod 01 — your pod",
            action: {
              type: "message",
              message: "POD 01 — your own pod. Wake protocol triggered automatically. The frost is still on the inside of the glass.",
            },
          },
          {
            id: "pod2",
            shape: "rect",
            geom: [584, 80, 386, 800],
            label: "Pod 02",
            action: {
              type: "message",
              message: "POD 02 — empty. Pod log shows a clean, authorized open. Suspicious, in retrospect.",
            },
          },
          {
            id: "pod3",
            shape: "rect",
            geom: [970, 80, 365, 800],
            label: "Pod 03",
            action: {
              type: "message",
              message: "POD 03 — empty. Pod log shows a hurried open with override warnings.",
            },
          },
          {
            id: "pod4",
            shape: "rect",
            geom: [1335, 80, 385, 800],
            label: "Pod 04 — quarantine",
            action: {
              type: "setState",
              flags: ["viewed_pod_log"],
              message: "POD 04 — occupant DECEASED. Cause: organism exposure. Quarantine protocol failed. The crewmember's hand still rests near the inner glass.",
            },
          },
          // Pick up the keycard. Visible only while the keycard
          // sprite is still on the floor.
          {
            id: "pickup_keycard",
            shape: "rect",
            geom: [1490, 870, 110, 80],
            label: "Pick up keycard",
            hideIf: { all: ["keycard_taken"] },
            action: {
              type: "pickup",
              item: "keycard",
              flags: ["keycard_taken"],
              message: "Crew keycard added to inventory.",
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
  // Pod-status terminal close-up (reached by clicking the terminal
  // on Wall 1). Uses the existing cryo_panel_g4.png art.
  cryo_panel_g4: {
    image: "Images/closeups/cryo_panel_g4.png",
    hotspots: [
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
