/* ============================================================
   STARLOCK - TYPEWRITER
   ------------------------------------------------------------
   Animates text into an element one character at a time, while
   the looping typewriter SFX plays through GameAudio. Used by
   the message bar, inventory cards, settings labels, and any
   other text we want to feel like it's coming through the
   ship's terminal in real time.

   Public API:

     Typewriter.type(el, text, opts)
       el    - target DOM element. Its content is replaced with
               an inner <span class="tw-text"> that grows char by
               char, plus a <span class="tw-caret"> blinking cursor.
       text  - string to type.
       opts  - { speed=22, html=false, onDone }
                 speed: ms per character
                 html:  if true, treat `text` as trusted HTML and
                        type its visible characters (tag-aware).
                        We currently only need plain text, but the
                        flag is here for future flexibility.
       Returns a Promise that resolves when typing completes (or is
       cancelled by another type() call on the same element).

     Typewriter.typeIntoSelector(root, selector, opts)
       Convenience: types each child element matching selector in
       sequence, using its existing textContent as the source.
       Used to animate menu labels on first reveal.

   Cancellation:
     Calling type() on an element with an in-flight animation
     immediately finishes the previous one (snaps to full text)
     and starts the new animation cleanly. This keeps the UI
     responsive when the player triggers messages quickly.

   Sound coupling:
     Each type() call increments GameAudio's typewriter ref count
     on start and decrements on finish. The SFX therefore plays
     for as long as ANY text is animating, and stops once
     everything is settled.
   ============================================================ */

const Typewriter = (() => {

  function ensureCaret(el) {
    let textSpan  = el.querySelector(":scope > .tw-text");
    let caretSpan = el.querySelector(":scope > .tw-caret");
    if (!textSpan) {
      el.textContent = "";
      textSpan = document.createElement("span");
      textSpan.className = "tw-text";
      el.appendChild(textSpan);
    }
    if (!caretSpan) {
      caretSpan = document.createElement("span");
      caretSpan.className = "tw-caret";
      caretSpan.setAttribute("aria-hidden", "true");
      caretSpan.textContent = "█"; // full block
      el.appendChild(caretSpan);
    }
    return { textSpan, caretSpan };
  }

  function type(el, text, opts = {}) {
    if (!el) return Promise.resolve();
    text = text == null ? "" : String(text);
    const speed = opts.speed != null ? opts.speed : 22;

    // Cancel any in-flight typing on this element.
    if (el._typewriterCancel) {
      try { el._typewriterCancel("supersede"); } catch (e) {}
    }

    el.classList.add("typewriting");
    const { textSpan, caretSpan } = ensureCaret(el);
    textSpan.textContent = "";
    caretSpan.style.display = "";

    GameAudio.typewriterStart();
    let sfxReleased = false;
    const releaseSfx = () => {
      if (sfxReleased) return;
      sfxReleased = true;
      GameAudio.typewriterStop();
    };

    return new Promise((resolve) => {
      let i = 0;
      let timer = null;
      let cancelled = false;

      const finish = (reason) => {
        if (cancelled) return;
        cancelled = true;
        if (timer) clearTimeout(timer);
        textSpan.textContent = text;
        // Hide caret once typing is complete (so it doesn't
        // hang around forever after a message).
        caretSpan.style.display = "none";
        el.classList.remove("typewriting");
        el._typewriterCancel = null;
        releaseSfx();
        if (typeof opts.onDone === "function") {
          try { opts.onDone(reason || "complete"); } catch (e) {}
        }
        resolve(reason || "complete");
      };

      el._typewriterCancel = finish;

      const tick = () => {
        if (cancelled) return;
        if (i >= text.length) { finish("complete"); return; }
        i++;
        textSpan.textContent = text.slice(0, i);
        timer = setTimeout(tick, speed);
      };
      // Empty string: nothing to animate, but we still want the
      // SFX-balancing finish() call to fire.
      if (text.length === 0) { finish("complete"); return; }
      tick();
    });
  }

  /* Sequentially typewrite the textContent of each element matching
     `selector` inside `root`. Useful for revealing a panel of labels
     in order (e.g., the Settings panel headers). */
  function typeIntoSelector(root, selector, opts = {}) {
    if (!root) return Promise.resolve();
    const targets = Array.from(root.querySelectorAll(selector));
    return targets.reduce((chain, el) => {
      const original = el.dataset.twSource || el.textContent;
      el.dataset.twSource = original;
      return chain.then(() => type(el, original, opts));
    }, Promise.resolve());
  }

  /* Run typewriter once on each unique element. Repeated calls are
     no-ops once an element has been animated, so we can call this
     freely from "panel revealed" hooks without re-typing labels. */
  function typeOnce(el, text, opts = {}) {
    if (!el) return Promise.resolve();
    if (el.dataset.twTyped === "1") {
      // Already typed; just make sure the final text is set.
      const { textSpan, caretSpan } = ensureCaret(el);
      textSpan.textContent = text == null ? (el.dataset.twSource || "") : String(text);
      caretSpan.style.display = "none";
      return Promise.resolve("already");
    }
    el.dataset.twTyped = "1";
    return type(el, text, opts);
  }

  return { type, typeIntoSelector, typeOnce };
})();
