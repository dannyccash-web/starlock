/* ============================================================
   STARLOCK - CRYO TERMINAL CONTROLLER
   ------------------------------------------------------------
   Backs the "cryo_terminal" HTML close-up. The close-up image is
   "Images/closeups/Cryo Room 1 Terminal Closeup.png" — a still of
   the terminal panel from up close. This controller mounts a live
   HTML interface inside the screen area of that image.

   The interface lists the four pods with names, roles, and current
   statuses, and exposes the only on-terminal action available right
   now: "OPEN POD 04". That action is gated on the
   `pod4_wiring_repaired` flag because the security officer cut the
   pod's external interlock circuit; until the wiring puzzle is
   built (TODO) the button shows a POWER FAULT state and refuses to
   click. Once the wiring is repaired AND the player presses the
   button, the pod unseals: the `pod4_opened` flag is set, the row
   updates in place, and the player can return to the pods wall and
   take the keycard from the suit.

   Re-rendering: instead of doing manual DOM patches, we just rebuild
   the interface every time it mounts. The engine's renderActive()
   helper re-mounts on state changes, so we get free reactivity.
   ============================================================ */

(function () {
  // Crew roster shown on the terminal. Centralised here so future
  // logs and other terminals can pull from the same source.
  const CREW = [
    { pod: 1, role: "ENGINEER",         name: "(YOU)" },
    { pod: 2, role: "CAPTAIN",          name: "" },
    { pod: 3, role: "SECURITY OFFICER", name: "" },
    { pod: 4, role: "SCIENCE OFFICER",  name: "" },
  ];

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === "class") node.className = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k.startsWith("on") && typeof attrs[k] === "function") {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (attrs[k] === true) node.setAttribute(k, "");
        else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k]);
      }
    }
    (children || []).forEach((c) => {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  // Returns { label, klass } describing the current status of a pod
  // given the current state flags.
  function statusFor(pod, hasFlag) {
    switch (pod) {
      case 1:
        return { label: "AWAKE · WAKE PROTOCOL COMPLETE", klass: "is-ok" };
      case 2:
        return { label: "EMPTY · EMERGENCY OPEN",         klass: "is-warn" };
      case 3:
        return { label: "EMPTY · AUTHORIZED OPEN",        klass: "is-warn" };
      case 4:
        if (hasFlag("pod4_opened")) {
          return { label: "OPEN · OCCUPANT DECEASED",     klass: "is-open" };
        }
        return { label: "SEALED · EXTERNAL INTERLOCK FAULT", klass: "is-fault" };
    }
  }

  function buildPodRow(crew, hasFlag) {
    const status = statusFor(crew.pod, hasFlag);
    const row = el("div", {
      class: "ct-pod-row" +
        (crew.pod === 1 ? " is-self" : "") +
        (crew.pod === 4 && !hasFlag("pod4_opened") ? " is-fault" : ""),
    }, [
      el("span", { class: "ct-pod-num" }, [`POD 0${crew.pod}`]),
      el("span", { class: "ct-pod-name" }, [
        crew.role,
        crew.name ? el("span", { class: "ct-pod-name-sub" }, [crew.name]) : null,
      ]),
      el("span", { class: `ct-pod-status ${status.klass}` }, [status.label]),
    ]);
    return row;
  }

  function buildOpenButton(ctx) {
    const { hasFlag, setFlag, showMessage, renderActive } = ctx;
    if (hasFlag("pod4_opened")) {
      return el("button", { class: "ct-action is-disabled", disabled: true }, ["POD 04 OPENED"]);
    }
    if (!hasFlag("pod4_wiring_repaired")) {
      return el("button", {
        class: "ct-action is-fault is-disabled",
        disabled: true,
        title: "External interlock fault — wiring beside the pod must be repaired first.",
      }, ["POWER FAULT — REPAIR WIRING"]);
    }
    return el("button", {
      class: "ct-action",
      onclick: () => {
        setFlag("pod4_opened");
        showMessage("Pod 04 unsealed. Frost vents off the inner glass.");
        renderActive();
      },
    }, ["OPEN POD 04"]);
  }

  // Mount the terminal UI into `layer`. ctx provides hasFlag/setFlag,
  // showMessage, renderActive, and closeCloseup.
  function mount(layer, ctx) {
    layer.innerHTML = "";
    const root = el("div", { class: "cryo-terminal", role: "region", "aria-label": "Cryo control terminal" }, [
      el("header", { class: "ct-header" }, [
        el("span", { class: "ct-title" },    ["CRYO CONTROL · POD STATUS"]),
        el("span", { class: "ct-subtitle" }, ["CRYO BAY 1"]),
      ]),
      el("div", { class: "ct-pod-list" },
        CREW.map((c) => buildPodRow(c, ctx.hasFlag))
      ),
      el("footer", { class: "ct-footer" }, [
        buildOpenButton(ctx),
      ]),
    ]);
    layer.appendChild(root);
  }

  // Register with the engine on load. Engine.js is loaded before
  // this file (see index.html), so Engine is defined here.
  Engine.registerCloseupController("cryo_terminal", { mount });
})();
