// decibri docs: code tabs component
// Tabbed code blocks with localStorage-backed language preference.
// Markup contract (ids follow code-tab-{group}-{lang} / code-panel-{group}-{lang},
// where {group} is the 1-based index of the tab group within the page):
//   <div class="code-tabs" data-tab-group="code">
//     <div class="code-tab-bar" role="tablist" aria-label="Language">
//       <button class="code-tab-btn" id="code-tab-1-node" aria-controls="code-panel-1-node"
//               role="tab" data-lang="node" aria-selected="true">Node.js</button>
//     </div>
//     <div class="code-tab-panel" id="code-panel-1-node" aria-labelledby="code-tab-1-node"
//          data-lang="node" role="tabpanel">
//       <pre><code class="language-javascript">...</code></pre>
//     </div>
//   </div>
// Inactive panels carry the hidden attribute in the static HTML, so the initial
// visible state does not depend on this script. The script tag is safe to defer.
// When a copy button shares the tab bar, role="tablist"/aria-label move to an inner
// display:contents wrapper around only the tab buttons, because a tablist may not
// own non-tab children:
//   <div class="code-tab-bar">
//     <div role="tablist" aria-label="Language" style="display: contents">
//       <button class="code-tab-btn" ... role="tab" ...>Node.js</button>
//     </div>
//     <button class="code-copy-btn" aria-label="Copy code">...</button>
//   </div>
// When only one panel is present, the tab bar is hidden via CSS (:has selector or .single-tab fallback).
(function () {
  var KEY = 'decibri-docs-code-tab';

  function readPref() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function writePref(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }

  function setActive(group, lang) {
    var btns = group.querySelectorAll('.code-tab-btn');
    for (var i = 0; i < btns.length; i++) {
      var isSel = btns[i].getAttribute('data-lang') === lang;
      btns[i].setAttribute('aria-selected', isSel ? 'true' : 'false');
      btns[i].tabIndex = isSel ? 0 : -1;
    }
    var panels = group.querySelectorAll('.code-tab-panel');
    for (var j = 0; j < panels.length; j++) {
      if (panels[j].getAttribute('data-lang') === lang) {
        panels[j].removeAttribute('hidden');
      } else {
        panels[j].setAttribute('hidden', '');
      }
    }
    // Notify listeners (e.g. homepage install pill) of the active language.
    try {
      group.dispatchEvent(new CustomEvent('code-tabs:change', {
        detail: { lang: lang },
        bubbles: true
      }));
    } catch (e) {}
  }

  function init() {
    var groups = document.querySelectorAll('.code-tabs');
    if (!groups.length) return;

    // Single-tab collapse. Mark groups with exactly one panel so CSS can hide
    // the tab bar and render as a plain code block. Unconditional because a
    // pure-CSS :has(.code-tab-panel:only-of-type) approach fails: .code-tab-panel
    // shares its parent (.code-tabs) with .code-tab-bar, and both are <div>, so
    // :only-of-type never matches.
    for (var g = 0; g < groups.length; g++) {
      if (groups[g].querySelectorAll('.code-tab-panel').length === 1) {
        groups[g].classList.add('single-tab');
      }
    }

    var pref = readPref();

    groups.forEach(function (group) {
      var panels = group.querySelectorAll('.code-tab-panel');
      var langs = [];
      for (var i = 0; i < panels.length; i++) langs.push(panels[i].getAttribute('data-lang'));
      var active = (pref && langs.indexOf(pref) !== -1) ? pref : langs[0];
      setActive(group, active);

      var btns = group.querySelectorAll('.code-tab-btn');
      btns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var lang = btn.getAttribute('data-lang');
          writePref(lang);
          // Sync every group on the page that has this lang available.
          document.querySelectorAll('.code-tabs').forEach(function (g) {
            var has = false;
            var ps = g.querySelectorAll('.code-tab-panel');
            for (var k = 0; k < ps.length; k++) {
              if (ps[k].getAttribute('data-lang') === lang) { has = true; break; }
            }
            if (has) setActive(g, lang);
          });
        });

        // Keyboard navigation (ARIA tablist pattern): Left/Right arrows move focus.
        btn.addEventListener('keydown', function (e) {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          var all = Array.prototype.slice.call(btns);
          var idx = all.indexOf(btn);
          var next = e.key === 'ArrowRight'
            ? (idx + 1) % all.length
            : (idx - 1 + all.length) % all.length;
          all[next].focus();
          all[next].click();
        });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
