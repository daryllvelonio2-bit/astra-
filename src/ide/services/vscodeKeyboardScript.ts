/**
 * Injected script for VS Code (code-server / Monaco Editor / xterm) in WebView.
 *
 * Ensures:
 * - When virtual keyboard is ALREADY open:
 *   Clicking any line of code or inside the terminal / editor keeps the virtual keyboard open!
 *   It ONLY closes if focus moves outside the editor/terminal/inputs (unfocused).
 * - When virtual keyboard is CLOSED:
 *   Single click positions cursor, highlights code / terminal, keeps focus active
 *   for external / physical keyboards WITHOUT popping up the on-screen virtual keyboard.
 * - Double tap anywhere:
 *   Unlocks and opens the virtual keyboard instantly.
 *   Suppresses synthetic double-click word/block selection so existing code is NOT selected or deleted on typing.
 * - Fast Typing: Zero attribute thrashing on focused textareas; avoids triggering Chromium's
 *   RestartInputMethod() or MutationObserver loops during fast keystrokes.
 * - Touch dragging in xterm: Intercepts touchmove in capture phase and updates scroll position without letting
 *   xterm translate touch into arrow-key escape sequences or SGR mouse sequences (fixes "aN;Na").
 * - Terminal UI: Triggers terminal resize / fit events so CLIs (opencode, htop, git) get full column width.
 */
export const INJECTED_KEYBOARD_GUARD = `
(function() {
  if (window.__astra_guard_cleanup) {
    try { window.__astra_guard_cleanup(); } catch(e) {}
  }

  /* ── 1. Clean Scrollbar & Terminal Container CSS ───────────────────────── */
  function injectTerminalCSS() {
    if (document.getElementById('__astra_term_css')) return;
    var style = document.createElement('style');
    style.id = '__astra_term_css';
    style.textContent = [
      '.xterm-viewport::-webkit-scrollbar { width: 4px; }',
      '.xterm-viewport::-webkit-scrollbar-thumb { background: rgba(128, 128, 128, 0.4); border-radius: 2px; }',
      '.terminal-outer-container { width: 100% !important; height: 100% !important; }'
    ].join('\\n');
    (document.head || document.documentElement).appendChild(style);
  }
  injectTerminalCSS();

  /* ── 2. Keyboard State & Double-Tap Parameters ─────────────────────────── */
  var isKeyboardUnlocked = false;
  var startX = 0;
  var startY = 0;
  var isScrolling = false;
  var lastTapTime = 0;
  var lastTapX = 0;
  var lastTapY = 0;
  var DOUBLE_TAP_DELAY = 500;
  var DOUBLE_TAP_MAX_DIST = 60;

  function notifyHost(unlocked) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'KEYBOARD_STATE', unlocked: unlocked }));
      }
    } catch(e) {}
  }

  var origSetAttribute = HTMLTextAreaElement.prototype.setAttribute;
  var origRemoveAttribute = HTMLTextAreaElement.prototype.removeAttribute;

  function safeSetInputMode(el, targetMode) {
    if (!el) return;
    try {
      if (el.getAttribute('inputmode') !== targetMode) {
        origSetAttribute.call(el, 'inputmode', targetMode);
      }
    } catch(e) {}
  }

  HTMLTextAreaElement.prototype.setAttribute = function(name, val) {
    if (name && name.toLowerCase() === 'inputmode') {
      var expected = isKeyboardUnlocked ? (val || 'text') : 'none';
      if (this.getAttribute('inputmode') === expected) {
        return;
      }
      return origSetAttribute.call(this, 'inputmode', expected);
    }
    return origSetAttribute.apply(this, arguments);
  };

  HTMLTextAreaElement.prototype.removeAttribute = function(name) {
    if (name && name.toLowerCase() === 'inputmode' && !isKeyboardUnlocked) {
      return;
    }
    return origRemoveAttribute.apply(this, arguments);
  };

  var origFocus = HTMLTextAreaElement.prototype.focus;
  HTMLTextAreaElement.prototype.focus = function() {
    var targetMode = isKeyboardUnlocked ? 'text' : 'none';
    safeSetInputMode(this, targetMode);
    return origFocus.apply(this, arguments);
  };

  function applyKeyboardState(el, allow) {
    if (!el) return;
    el.readOnly = false;
    safeSetInputMode(el, allow ? 'text' : 'none');
  }

  function configureAllTextareas(root, allow) {
    var textareas = (root || document).querySelectorAll(
      'textarea.inputarea, textarea.xterm-helper-textarea, textarea, .monaco-editor textarea'
    );
    for (var i = 0; i < textareas.length; i++) {
      applyKeyboardState(textareas[i], allow);
    }
  }

  function getActiveTextarea(target) {
    if (target && target.closest) {
      var editor = target.closest('.monaco-editor');
      if (editor) {
        var ta = editor.querySelector('textarea.inputarea, textarea');
        if (ta) return ta;
      }
      var term = target.closest('.xterm');
      if (term) {
        var tta = term.querySelector('textarea.xterm-helper-textarea, textarea');
        if (tta) return tta;
      }
    }
    var activeTermTa = document.querySelector('.terminal.xterm textarea, .xterm textarea, textarea.xterm-helper-textarea');
    if (activeTermTa) return activeTermTa;
    var activeEditorTa = document.querySelector('.monaco-editor.focused textarea, .monaco-editor textarea, textarea.inputarea');
    if (activeEditorTa) return activeEditorTa;
    var anyTa = document.querySelector('textarea');
    if (anyTa) return anyTa;
    return null;
  }

  function unlockKeyboard(target) {
    isKeyboardUnlocked = true;
    notifyHost(true);
    configureAllTextareas(document, true);
    var ta = getActiveTextarea(target);
    if (ta) {
      applyKeyboardState(ta, true);
      // Collapse any text selection inside the helper textarea so typed characters won't delete selected code
      try {
        if (ta.selectionStart !== ta.selectionEnd) {
          ta.selectionStart = ta.selectionEnd;
        }
      } catch(_) {}
      ta.blur();
      origFocus.call(ta);
    }
    // Collapse any window DOM selection
    try {
      var sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        sel.collapseToEnd();
      }
    } catch(_) {}
  }

  function lockKeyboard(target) {
    isKeyboardUnlocked = false;
    notifyHost(false);
    configureAllTextareas(document, false);
  }

  /* ── 3. Touch Dragging in Terminal: Fix aN;Na / Arrow Key Injection ────── */
  var termTouchStartY = 0;
  var termTouchStartX = 0;
  var termStartScrollTop = 0;
  var isTermTouchScrolling = false;

  function handleTermTouchStart(e) {
    var term = e.target && e.target.closest && e.target.closest('.xterm');
    if (term && e.touches && e.touches[0]) {
      var vp = term.querySelector('.xterm-viewport');
      termTouchStartY = e.touches[0].clientY;
      termTouchStartX = e.touches[0].clientX;
      termStartScrollTop = vp ? vp.scrollTop : 0;
      isTermTouchScrolling = false;
    }
  }

  function handleTermTouchMove(e) {
    var term = e.target && e.target.closest && e.target.closest('.xterm');
    if (term && e.touches && e.touches[0]) {
      var dy = termTouchStartY - e.touches[0].clientY;
      var dx = termTouchStartX - e.touches[0].clientX;
      if (Math.abs(dy) > 5 || Math.abs(dx) > 5) {
        isTermTouchScrolling = true;
        var vp = term.querySelector('.xterm-viewport');
        if (vp && vp.scrollHeight > vp.clientHeight) {
          vp.scrollTop = termStartScrollTop + dy;
        }
        e.stopImmediatePropagation();
      }
    }
  }

  document.addEventListener('touchstart', handleTermTouchStart, { capture: true, passive: true });
  document.addEventListener('touchmove', handleTermTouchMove, { capture: true, passive: false });

  /* ── 4. Touch Tracking: Tap vs Double-Tap ───────────────────────────────── */
  function handleTouchStart(e) {
    if (!e.touches || !e.touches[0]) return;
    var t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    isScrolling = false;
  }

  function handleTouchMove(e) {
    if (!e.touches || !e.touches[0]) return;
    var t = e.touches[0];
    if (Math.hypot(t.clientX - startX, t.clientY - startY) > 22) {
      isScrolling = true;
    }
  }

  function handleTouchEnd(e) {
    if (isScrolling || isTermTouchScrolling) return;
    if (!e.changedTouches || !e.changedTouches[0]) return;
    var t = e.changedTouches[0];
    var now = Date.now();
    var timeDiff = now - lastTapTime;
    var dist = Math.hypot(t.clientX - lastTapX, t.clientY - lastTapY);

    if (timeDiff < DOUBLE_TAP_DELAY && dist < DOUBLE_TAP_MAX_DIST) {
      // DOUBLE TAP: Open keyboard and place cursor without word/code selection
      lastTapTime = 0;
      try { e.preventDefault(); } catch(_) {}
      unlockKeyboard(e.target);
    } else {
      // SINGLE TAP
      lastTapTime = now;
      lastTapX = t.clientX;
      lastTapY = t.clientY;

      var inEditorOrInput = e.target && e.target.closest &&
        (e.target.closest('.monaco-editor') || e.target.closest('.xterm') || e.target.closest('.terminal') || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT');

      if (isKeyboardUnlocked) {
        // Keyboard is ALREADY showing:
        if (inEditorOrInput) {
          // User clicked on a line of code or inside terminal: KEEP KEYBOARD OPEN!
          // Maintain inputmode="text" so virtual keyboard stays visible at new cursor position
          var ta = getActiveTextarea(e.target);
          if (ta) {
            applyKeyboardState(ta, true);
          }
        } else {
          // User clicked outside the editor or input (e.g. sidebar, tabs, status bar): close keyboard!
          lockKeyboard(e.target);
        }
      } else {
        // Keyboard is currently closed: keep it suppressed (external keyboard mode)
        lockKeyboard(e.target);
      }
    }
  }

  document.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });
  document.addEventListener('touchmove', handleTouchMove, { capture: true, passive: true });
  document.addEventListener('touchend', handleTouchEnd, { capture: true, passive: false });

  // If focus moves completely away from editor or inputs, dismiss virtual keyboard
  function handleFocusOut(e) {
    if (!isKeyboardUnlocked) return;
    setTimeout(function() {
      var active = document.activeElement;
      var stillInEditor = active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT' || (active.closest && (active.closest('.monaco-editor') || active.closest('.xterm'))));
      if (!stillInEditor && isKeyboardUnlocked) {
        lockKeyboard();
      }
    }, 150);
  }
  document.addEventListener('focusout', handleFocusOut, true);

  // Suppress multi-click word/block selection so code is not highlighted and deleted upon typing
  function handleMultiDown(e) {
    if (e.detail > 1) {
      try { e.preventDefault(); } catch(_) {}
    }
  }
  document.addEventListener('mousedown', handleMultiDown, true);
  document.addEventListener('pointerdown', handleMultiDown, true);

  function handleDblClick(e) {
    try { e.preventDefault(); e.stopPropagation(); } catch(_) {}
    unlockKeyboard(e.target);
  }
  document.addEventListener('dblclick', handleDblClick, true);

  /* ── 5. Terminal Auto-Fit / Layout Re-trigger ───────────────────────────── */
  function triggerTerminalFit() {
    try {
      window.dispatchEvent(new Event('resize'));
    } catch(e) {}
  }
  setTimeout(triggerTerminalFit, 500);
  setTimeout(triggerTerminalFit, 1500);
  setTimeout(triggerTerminalFit, 3000);

  /* ── 6. DOM MutationObserver: Debounced & Filtered for High-Speed Typing ─ */
  var observer = null;
  try {
    var mutationTimer = null;
    observer = new MutationObserver(function(mutations) {
      var hasNewStructuralNode = false;
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        if (added && added.length > 0) {
          for (var j = 0; j < added.length; j++) {
            var node = added[j];
            if (node.nodeType === 1 && (node.classList.contains('terminal') || node.classList.contains('monaco-editor') || node.tagName === 'TEXTAREA')) {
              hasNewStructuralNode = true;
              break;
            }
          }
        }
        if (hasNewStructuralNode) break;
      }
      if (!hasNewStructuralNode) return;

      if (mutationTimer) clearTimeout(mutationTimer);
      mutationTimer = setTimeout(function() {
        if (!isKeyboardUnlocked) {
          configureAllTextareas(document, false);
        }
        injectTerminalCSS();
      }, 400);
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', function() {
        observer.observe(document.body, { childList: true, subtree: true });
      });
    }
  } catch(e) {}

  configureAllTextareas(document, false);

  window.__astra_guard_cleanup = function() {
    document.removeEventListener('touchstart', handleTouchStart, true);
    document.removeEventListener('touchmove', handleTouchMove, true);
    document.removeEventListener('touchend', handleTouchEnd, true);
    document.removeEventListener('focusout', handleFocusOut, true);
    document.removeEventListener('mousedown', handleMultiDown, true);
    document.removeEventListener('pointerdown', handleMultiDown, true);
    document.removeEventListener('dblclick', handleDblClick, true);
    document.removeEventListener('touchstart', handleTermTouchStart, true);
    document.removeEventListener('touchmove', handleTermTouchMove, true);
    HTMLTextAreaElement.prototype.setAttribute = origSetAttribute;
    HTMLTextAreaElement.prototype.removeAttribute = origRemoveAttribute;
    HTMLTextAreaElement.prototype.focus = origFocus;
    if (observer) {
      try { observer.disconnect(); } catch(e) {}
    }
  };
})();
true;
`;
