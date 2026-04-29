# Starlock

A browser-based point-and-click escape room set on a damaged spaceship. The
player wakes from cryo sleep and must figure out what happened to the rest of
the crew.

This repo is a static site — pure HTML/CSS/JS, no build step, no bundler.

## Run locally

The game uses only relative paths and no `fetch()`, so you can open it
directly:

```
double-click index.html
```

If your browser blocks local image loads (some Chromium configs do), serve it
with any tiny static server:

```
# Python 3
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Deploy to GitHub Pages

1. `git init`, commit, push to a new GitHub repo.
2. **Settings → Pages → Deploy from branch → `main` / root**.
3. Visit `https://<user>.github.io/<repo>/`.

(All paths in the code are relative, so this just works from the repo root.
Image filenames are case-sensitive on GitHub Pages — keep `Images/` capitalized
to match the existing files.)

## Project layout

```
index.html               -- entry point (start screen + game screen)
css/style.css            -- all styling, including atmosphere presets
js/scenes.js             -- ALL game content (rooms, walls, items, close-ups)
js/inventory.js          -- inventory + equip/use system
js/engine.js             -- scene rendering, hot spots, action dispatch
js/ui.js                 -- HUD chrome (menu panel, equipped indicator)
js/main.js               -- boot, start screen wiring, stage scaler
Images/                  -- art assets
  cryo_room_1.png        -- wall 1 of the cryo room (1920x1080 base plate)
  starlock_start_screen.png        -- porthole frame (alpha-cut center)
  starlock_start_screen_space.png  -- starfield that scrolls behind the frame
  starlock_logo.png
  items/
    keycard.png          -- placeholder item (transparent PNG)
  closeups/
    cryo_panel_g4.png    -- placeholder close-up of the central panel
spaceship_escape_room_game_rundown.txt   -- the design doc
```

## HUD overview

- **Inventory bar** (bottom-center): always-on quick-equip strip. Click a slot to equip / unequip.
- **Hamburger menu** (☰, top-right): opens a slide-in panel from the right with two tabs — *Inventory* (full cards with descriptions) and *Settings* (TBD) — plus a "Return to Start Screen" action.
- **Equipped indicator** (top-left): shows the icon and name of whatever item is currently equipped. Hidden when nothing is equipped.
- **Cursor swap**: when an item is equipped, the cursor over the scene becomes that item's icon.

## Architecture in one paragraph

To work around the fact that AI image generators can't reliably re-render a
scene with consistent object placement, every wall view is **one base-plate
PNG that is never re-generated**. Every changeable detail (an item on a table,
a panel that opens) is a separate transparent PNG ("sprite") layered on top at
fixed `(x, y)` coordinates from `scenes.js`. Hot spots are invisible click
rectangles, also defined in `scenes.js`, and can be gated by game-state flags
or by the player's currently-equipped inventory item. Zoom-in close-ups
(keypads, screens, etc.) are separate full-screen images with their own
hot spots. Lighting variations (lights off, red alert, restored) are CSS
filters on the same base plate — no new image needed.

This means total image count = (# wall views) + (# unique items) + (# zoom-ins),
not the combinatorial explosion of "wall × every state".

## Vertical-slice gameplay

Click **START**, then on the cryo wall:

1. Click the **storage crate** (lower left). It opens. A keycard appears on top.
2. Click the **keycard**. It goes into your inventory.
3. Click the **central CRYO POD G4 panel** to zoom in. Click any of the four
   pods to read its status. Press **Esc** or **← Back** to exit the close-up.
4. Click the inventory keycard to **equip** it (it gets a blue glow).
5. Click the **right-hand "LOCKED" door**. Because the keycard is equipped, the
   game accepts it (but tells you the door has no power yet — the next puzzle).
6. Use the **left/right arrows** (or arrow keys) to rotate to the placeholder
   walls.
7. Press **D** to toggle hot-spot debug outlines.

## Adding new content

### A new wall
Open `js/scenes.js`, append a new entry to `ROOMS.cryo.walls` (or create a new
room). Drop the wall PNG in `Images/walls/...` and reference its path. Add an
empty `sprites: []` and `hotspots: []` to start.

### A new item
1. Save a transparent PNG to `Images/items/<id>.png`.
2. Add an entry to `ITEMS` in `scenes.js`.
3. Place a `pickup` action on a hot spot somewhere.

### A new zoom-in close-up
1. Save a 1920x1080 PNG to `Images/closeups/<id>.png`.
2. Add an entry to `CLOSEUPS` with hot spots in 1920x1080 coordinates.
3. Have a hot spot use `action: { type: "openCloseup", target: "<id>" }`.

### State flags
Use any string. `setState` and `pickup` actions add flags; `showIf`/`hideIf` on
sprites and hot spots read them. There's no schema — typos just fail silently,
so press **D** in-game and check that hot spots appear/disappear correctly as
you progress.

## Controls

| Action                  | Input                         |
| ----------------------- | ----------------------------- |
| Start game              | Click START / Enter / Space   |
| Turn left / right       | Click arrow / ← →             |
| Click hot spot          | Click                         |
| Equip / unequip item    | Click inventory slot / Esc    |
| Use item on environment | Equip, then click hot spot    |
| Toggle debug outlines   | **D**                         |
| Close zoom-in           | Click ← Back / Esc            |
| Open / close game menu  | Click **☰** (top-right) / Esc |
| Return to start screen  | Menu → "Return to Start"      |

## What's stubbed

Things flagged with `not yet generated` in the UI, or that you'll want to
replace once you have art:

- `Images/items/keycard.png` — placeholder PNG, replace with a real photo-real keycard.
- `Images/closeups/cryo_panel_g4.png` — placeholder; render a real close-up of the central screen.
- Cryo walls 2–4 — placeholders; generate base plates and add sprites/hot spots.
- All other rooms (lab, bridge, shuttle bay, engineering) — not yet defined in `scenes.js`.

The design doc (`spaceship_escape_room_game_rundown.txt`) contains the full
puzzle chain and item flow to expand into.
