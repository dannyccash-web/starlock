/* ============================================================
   STARLOCK - CRYO TERMINAL CONTROLLER
   ------------------------------------------------------------
   Backs the "cryo_terminal" HTML close-up. The close-up image is
   "Images/closeups/Cryo Room 1 Terminal Closeup.png" — a still of
   the terminal panel from up close. This controller mounts a live
   HTML interface inside the screen area of that image.

   TWO VIEWS:
     1. POD LIST (default)  — one row per pod showing
          POD ##  ·  F. LASTNAME  ·  TITLE
        with a coloured vertical bar on the left:
          green = pod open, red = pod 4 (deceased occupant)
        Clicking a row drills into the detail view.
     2. POD DETAIL         — name / title header, status fields
        (cycle started, last opened, fault state), free-text
        notes, and (for pod 4 only) the OPEN POD action button.

   ACTION BUTTON GATING:
     The pod 4 OPEN button is always clickable. Behaviour depends
     on flags:
       - !pod4_wiring_repaired → showMessage explains the power
         fault, no state change
       - pod4_wiring_repaired && !pod4_opened → unseals the pod,
         sets pod4_opened, triggers re-render
       - pod4_opened → button is replaced with "POD 04 OPENED"
         locked state

   View state lives in module-scope variables (currentView,
   selectedPodNum). The engine calls unmount() when the player
   exits the close-up, which resets the view to the list so the
   next visit always starts there.
   ============================================================ */

(function () {
  // Crew roster shown on the terminal. Centralised here so future
  // logs and other terminals can pull from the same source.
  // NOTE: Times below are placeholders that establish a rough
  // sequence ("the captain woke just before the security officer,
  // both about three hours before the engineer's wake protocol").
  // Tune freely.
  const CREW = [
    {
      pod: 1,
      role: "ENGINEER",
      first: "K.",
      last: "HOLLOWAY",
      cycleStarted: "T-12d 04h",
      // Pod 1 doesn't have a "last opened" before now; emergency
      // wake is what just happened.
      openedAgo: "00:08:14",
      openedKind: "WAKE PROTOCOL",
      notes:
        "Emergency wake protocol triggered. You are the only " +
        "crew member with the technical authority to recover the " +
        "vessel.",
    },
    {
      pod: 2,
      role: "CAPTAIN",
      first: "A.",
      last: "REYES",
      cycleStarted: "T-12d 04h",
      openedAgo: "02:51:08",
      openedKind: "EMERGENCY OPEN",
      notes:
        "Override flags logged on open. Pod accessed in haste; " +
        "biometric authentication bypassed in favour of manual " +
        "release.",
    },
    {
      pod: 3,
      role: "SECURITY OFFICER",
      first: "M.",
      last: "TARN",
      cycleStarted: "T-12d 04h",
      openedAgo: "02:54:42",
      openedKind: "AUTHORIZED OPEN",
      notes:
        "Clean authenticated open. No override flags. Biometrics " +
        "match crew record.",
    },
    {
      pod: 4,
      role: "SCIENCE OFFICER",
      first: "I.",
      last: "VANCE",
      cycleStarted: "T-12d 17h",
      openedAgo: "—",
      openedKind: "QUARANTINE SEAL",
      notes:
        "Occupant placed in quarantine cryo following biological " +
        "exposure event. Vital signs flatlined prior to seal. " +
        "Body preserved for return analysis.",
    },
  ];

  // Module-scope view state. Reset by unmount() so each fresh
  // open of the terminal starts on the pod list.
  let currentView = "list";       // "list" | "detail"
  let selectedPodNum = null;

  /* ---------- DOM helper ---------- */
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

  /* ---------- Status descriptors ----------
     A pod is "deceased" (red bar) if it's pod 4 — regardless of
     whether the seal has been broken. Everyone else is "open"
     (green bar). The label we show changes when pod 4 is unsealed,
     but the colour stays red because the occupant is dead. */
  function barClass(podNum, hasFlag) {
    if (podNum === 4) return "is-deceased";
    return "is-open";
  }
  function statusLabel(podNum, hasFlag) {
    switch (podNum) {
      case 1: return "OPEN · WAKE PROTOCOL";
      case 2: return "OPEN · EMERGENCY OPEN";
      case 3: return "OPEN · AUTHORIZED OPEN";
      case 4:
        return hasFlag("pod4_opened")
          ? "OPEN · OCCUPANT DECEASED"
          : "SEALED · INTERLOCK FAULT";
    }
  }

  /* ---------- View 1: POD LIST ---------- */
  function buildList(layer, ctx) {
    const root = el("div", {
      class: "cryo-terminal ct-screen-list",
      role: "region",
      "aria-label": "Cryo control terminal · pod list",
    }, [
      el("header", { class: "ct-header" }, [
        el("span", { class: "ct-title" },    ["CRYO CONTROL · POD STATUS"]),
        el("span", { class: "ct-subtitle" }, ["CRYO BAY 1"]),
      ]),
      el("div", { class: "ct-pod-list" },
        CREW.map((c) => buildListRow(c, ctx))
      ),
    ]);
    layer.appendChild(root);
  }

  function buildListRow(crew, ctx) {
    const { hasFlag } = ctx;
    return el("button", {
      type: "button",
      class: "ct-pod-row " + barClass(crew.pod, hasFlag),
      onclick: () => {
        currentView = "detail";
        selectedPodNum = crew.pod;
        ctx.renderActive();
      },
    }, [
      el("span", { class: "ct-pod-num" }, [`POD 0${crew.pod}`]),
      el("span", { class: "ct-pod-name-block" }, [
        el("span", { class: "ct-pod-name" }, [`${crew.first} ${crew.last}`]),
        el("span", { class: "ct-pod-role" }, [crew.role]),
      ]),
      el("span", { class: "ct-pod-chevron", "aria-hidden": "true" }, ["❯"]),
    ]);
  }

  /* ---------- View 2: POD DETAIL ---------- */
  function buildDetail(layer, ctx, podNum) {
    const { hasFlag } = ctx;
    const crew = CREW.find((c) => c.pod === podNum);
    if (!crew) { buildList(layer, ctx); return; }

    const status = statusLabel(podNum, hasFlag);
    const bar    = barClass(podNum, hasFlag);

    const root = el("div", {
      class: "cryo-terminal ct-screen-detail " + bar,
      role: "region",
      "aria-label": `Cryo control terminal · pod ${podNum} detail`,
    }, [
      el("header", { class: "ct-header" }, [
        el("button", {
          type: "button",
          class: "ct-back-btn",
          onclick: () => {
            currentView = "list";
            selectedPodNum = null;
            ctx.renderActive();
          },
        }, ["❮ POD LIST"]),
        el("span", { class: "ct-subtitle" }, [`POD 0${podNum}`]),
      ]),
      el("div", { class: "ct-detail-body" }, [
        el("div", { class: "ct-detail-name" },  [`${crew.first} ${crew.last}`]),
        el("div", { class: "ct-detail-role" },  [crew.role]),
        el("div", { class: "ct-detail-fields" }, [
          field("STATUS",         status),
          field("CYCLE STARTED",  crew.cycleStarted),
          field("LAST OPENED",
                crew.openedAgo === "—"
                  ? "—"
                  : `${crew.openedAgo} AGO`),
          field("OPEN TYPE",      crew.openedKind),
        ]),
        el("div", { class: "ct-detail-notes" }, [
          el("span", { class: "ct-detail-notes-label" }, ["NOTES"]),
          el("p",    { class: "ct-detail-notes-body"  }, [crew.notes]),
        ]),
        // Action button only on pod 4.
        podNum === 4
          ? el("div", { class: "ct-detail-actions" }, [buildOpenButton(ctx)])
          : null,
      ]),
    ]);
    layer.appendChild(root);
  }

  function field(label, value) {
    return el("div", { class: "ct-detail-field" }, [
      el("span", { class: "ct-detail-field-label" }, [label]),
      el("span", { class: "ct-detail-field-value" }, [value]),
    ]);
  }

  function buildOpenButton(ctx) {
    const { hasFlag, setFlag, showMessage, renderActive } = ctx;
    if (hasFlag("pod4_opened")) {
      return el("button", { class: "ct-action is-disabled", disabled: true },
                ["POD 04 OPENED"]);
    }
    return el("button", {
      class: "ct-action",
      onclick: () => {
        if (!hasFlag("pod4_wiring_repaired")) {
          showMessage(
            "Pod 04: external interlock has no power. Repair the " +
            "sabotaged wiring panel beside the pod first."
          );
          return;
        }
        setFlag("pod4_opened");
        showMessage("Pod 04 unsealed. Frost vents off the inner glass.");
        renderActive();
      },
    }, ["OPEN POD"]);
  }

  /* ---------- Mount / unmount ---------- */
  function mount(layer, ctx) {
    layer.innerHTML = "";
    if (currentView === "detail" && selectedPodNum != null) {
      buildDetail(layer, ctx, selectedPodNum);
    } else {
      currentView = "list";
      buildList(layer, ctx);
    }
  }
  function unmount() {
    currentView = "list";
    selectedPodNum = null;
  }

  // Register with the engine on load. Engine.js is loaded before
  // this file (see index.html), so Engine is defined here.
  Engine.registerCloseupController("cryo_terminal", { mount, unmount });
})();
