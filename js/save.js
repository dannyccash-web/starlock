/* ============================================================
   STARLOCK - SAVE MANAGER
   ------------------------------------------------------------
   Persists game state to localStorage so the player can pick up
   where they left off after closing the browser.

   SAVE FORMAT  (key: "starlock_save_v1")
   {
     room:     "cryo" | "science_lab" | ...
     wall:     number (index into room.walls[])
     flags:    string[]
     items:    string[]
     equipped: string | null
   }

   AUTO-SAVE
   Engine.js calls SaveManager.save() after every meaningful state
   change (flag set, room change, wall turn, item pickup/use).

   RESTORE
   main.js calls SaveManager.restore() on "Continue", which pushes
   the saved state back into Engine and Inventory before revealing
   the game screen.
   ============================================================ */

const SaveManager = (() => {
  const KEY = "starlock_save_v1";

  /* ---------- Persist ---------- */
  function save() {
    try {
      const s = Engine._state;
      const data = {
        room:     s.currentRoom,
        wall:     s.currentWall,
        flags:    [...s.flags],
        items:    Inventory.getItems(),
        equipped: Inventory.getEquipped(),
      };
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      // Storage unavailable — fail silently.
    }
  }

  /* ---------- Load raw data (null if none / corrupt) ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /* ---------- Query ---------- */
  function hasSave() { return !!localStorage.getItem(KEY); }

  /* ---------- Erase ---------- */
  function clear() { localStorage.removeItem(KEY); }

  /* ---------- Restore into live engine/inventory ---------- */
  function restore() {
    const data = load();
    if (!data) return false;

    // Restore flags
    data.flags.forEach((f) => Engine.setFlag(f));

    // Restore inventory
    (data.items || []).forEach((id) => Inventory.addItem(id));
    if (data.equipped) Inventory.equip(data.equipped);

    // Restore room/wall (calls renderWall internally)
    Engine.startRoom(data.room || "cryo");
    // startRoom always starts at startWall — override to the saved wall
    Engine._state.currentWall = typeof data.wall === "number" ? data.wall : 0;
    // Re-render with the correct wall
    Engine._renderWall();

    return true;
  }

  /* ---------- Hook into Engine auto-save ----------
     Engine exposes a setSaveHook() for exactly this purpose so the
     save module can register its callback without creating a circular
     dependency (Engine loads before SaveManager). */
  Engine.setSaveHook(save);

  return { save, load, hasSave, clear, restore };
})();
