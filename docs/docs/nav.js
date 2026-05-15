// Decibri Docs Shared Sidebar Navigation
(function () {
  var path = window.location.pathname;

  // Match: exact-path with trailing-slash tolerance.
  function isActive(href) {
    if (path === href) return true;
    if (path === href + '/') return true;
    var shortHref = href.replace('/docs/', '/');
    if (path === shortHref || path === shortHref + '/') return true;
    return false;
  }

  // True if the current path is the given href OR a descendant of it.
  // Used to auto-expand the ancestor chain of the current page.
  function isAncestorOrSelf(href) {
    if (isActive(href)) return true;
    if (path.indexOf(href + '/') === 0) return true;
    var shortHref = href.replace('/docs/', '/');
    if (path.indexOf(shortHref + '/') === 0) return true;
    return false;
  }

  // True if href is an immediate child of the current path (exactly one URL
  // segment deeper). Used so landing pages auto-expand their direct children,
  // revealing the next navigation layer but not drilling further.
  function isImmediateChildOfCurrent(href) {
    var base = path;
    if (base.length > 1 && base.charAt(base.length - 1) === '/') {
      base = base.substring(0, base.length - 1);
    }
    var prefix = base + '/';
    if (href.indexOf(prefix) === 0) {
      var rem = href.substring(prefix.length);
      if (rem.length > 0 && rem.indexOf('/') === -1) return true;
    }
    return false;
  }

  // Top-level spine sections that should render expanded on every page so the
  // primary navigation stays visible regardless of where the user is.
  function isAlwaysExpanded(href) {
    return href === '/docs/integrations' || href === '/docs/apis';
  }

  var CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';

  function link(href, label) {
    return '<a href="' + href + '" class="sidebar-link' + (isActive(href) ? ' active' : '') + '">' + label + '</a>';
  }

  // Expandable group: parent label is itself a link (to the section's landing page);
  // a separate chevron button toggles expand/collapse. Auto-expanded when the current
  // URL is inside this section.
  function group(href, label, childrenHtml, labelClass, extraAttrs) {
    var expanded = isAncestorOrSelf(href) || isImmediateChildOfCurrent(href) || isAlwaysExpanded(href);
    var active = isActive(href);
    return '<div class="expandable" data-expanded="' + expanded + '">' +
      '<div class="expandable-header">' +
        '<a href="' + href + '" class="' + labelClass + (active ? ' active' : '') + '"' + (extraAttrs || '') + '>' + label + '</a>' +
        '<button class="expandable-chevron" type="button" aria-expanded="' + expanded + '" aria-label="Toggle ' + label + '">' + CHEVRON + '</button>' +
      '</div>' +
      '<div class="expandable-children">' + childrenHtml + '</div>' +
    '</div>';
  }

  // ========== DESKTOP SIDEBAR ==========

  var sttChildren =
      link('/docs/integrations/stt/assemblyai',         'AssemblyAI')
    + link('/docs/integrations/stt/aws-transcribe',     'AWS Transcribe')
    + link('/docs/integrations/stt/azure',              'Azure AI Speech')
    + link('/docs/integrations/stt/deepgram',           'Deepgram')
    + link('/docs/integrations/stt/google',             'Google Cloud Speech-to-Text')
    + link('/docs/integrations/stt/mistral-voxtral',    'Mistral Voxtral')
    + link('/docs/integrations/stt/openai',             'OpenAI')
    + link('/docs/integrations/stt/sherpa-onnx',        'Sherpa-ONNX')
    + link('/docs/integrations/stt/whisper-cpp',        'Whisper.cpp');

  var vadChildren = link('/docs/integrations/vad/silero', 'Silero');
  var kwsChildren = link('/docs/integrations/kws/sherpa-onnx', 'Sherpa-ONNX');

  // Nested subsections (STT/VAD/KWS) use a smaller label style.
  var subsectionStyle = ' style="font-size:10px;letter-spacing:1px"';

  var integrationsChildren =
      group('/docs/integrations/stt', 'Speech-to-text (STT)',         sttChildren, 'sidebar-subsection-title-link', subsectionStyle)
    + group('/docs/integrations/vad', 'Voice activity detection (VAD)', vadChildren, 'sidebar-subsection-title-link', subsectionStyle)
    + group('/docs/integrations/kws', 'Keyword spotting (KWS)',       kwsChildren, 'sidebar-subsection-title-link', subsectionStyle);

  var apisChildren =
      link('/docs/apis/python',  'Python')
    + link('/docs/apis/node',    'Node.js')
    + link('/docs/apis/browser', 'Browser')
    + link('/docs/apis/cli',     'CLI');

  var html = ''
    + '<div class="sidebar-header">'
    +   '<a href="/docs/" class="sidebar-logo">deci<span>bri</span> docs</a>'
    +   '<div class="sidebar-actions">'
    +     '<a href="https://github.com/decibri/decibri" class="sidebar-github" target="_blank" rel="noopener noreferrer" aria-label="GitHub" title="GitHub"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg></a>'
    +     '<button class="sidebar-theme-toggle" onclick="toggleTheme()" aria-label="Toggle theme" title="Toggle theme">'
    +       '<svg class="icon-moon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
    +       '<svg class="icon-sun" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
    +     '</button>'
    +   '</div>'
    + '</div>'

    + '<nav class="sidebar-nav">'

    // Introduction (single link, not expandable)
    +   '<div class="sidebar-section">'
    +     '<a href="/docs/" class="sidebar-top-link' + (isActive('/docs/') ? ' active' : '') + '">Introduction</a>'
    +   '</div>'

    // Getting started (single link, not expandable)
    +   '<div class="sidebar-section">'
    +     '<a href="/docs/getting-started" class="sidebar-top-link' + (isActive('/docs/getting-started') ? ' active' : '') + '">Getting started</a>'
    +   '</div>'

    // Integrations
    +   '<div class="sidebar-section">'
    +     group('/docs/integrations', 'Integrations', integrationsChildren, 'sidebar-section-title-link')
    +   '</div>'

    // APIs
    +   '<div class="sidebar-section">'
    +     group('/docs/apis', 'APIs', apisChildren, 'sidebar-section-title-link')
    +   '</div>'

    + '</nav>'

    + '<div class="sidebar-back">'
    +   '<a href="/">'
    +     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>'
    +     'Back to decibri.com'
    +   '</a>'
    + '</div>';

  // ========== MOBILE MENU (same expandable tree, mobile styling) ==========

  function mlink(href, label) {
    return '<a href="' + href + '" class="mobile-menu-link' + (isActive(href) ? ' active' : '') + '" onclick="toggleMobileMenu()">' + label + '</a>';
  }

  function mgroup(href, label, childrenHtml, labelClass) {
    var expanded = isAncestorOrSelf(href);
    var active = isActive(href);
    return '<div class="expandable mobile-expandable" data-expanded="' + expanded + '">' +
      '<div class="expandable-header">' +
        '<a href="' + href + '" class="' + labelClass + (active ? ' active' : '') + '" onclick="toggleMobileMenu()">' + label + '</a>' +
        '<button class="expandable-chevron" type="button" aria-expanded="' + expanded + '" aria-label="Toggle ' + label + '">' + CHEVRON + '</button>' +
      '</div>' +
      '<div class="expandable-children">' + childrenHtml + '</div>' +
    '</div>';
  }

  var mSttChildren =
      mlink('/docs/integrations/stt/assemblyai',         'AssemblyAI')
    + mlink('/docs/integrations/stt/aws-transcribe',     'AWS Transcribe')
    + mlink('/docs/integrations/stt/azure',              'Azure AI Speech')
    + mlink('/docs/integrations/stt/deepgram',           'Deepgram')
    + mlink('/docs/integrations/stt/google',             'Google Cloud Speech-to-Text')
    + mlink('/docs/integrations/stt/mistral-voxtral',    'Mistral Voxtral')
    + mlink('/docs/integrations/stt/openai',             'OpenAI')
    + mlink('/docs/integrations/stt/sherpa-onnx',        'Sherpa-ONNX')
    + mlink('/docs/integrations/stt/whisper-cpp',        'Whisper.cpp');

  var mVadChildren = mlink('/docs/integrations/vad/silero', 'Silero');
  var mKwsChildren = mlink('/docs/integrations/kws/sherpa-onnx', 'Sherpa-ONNX');

  var mIntegrationsChildren =
      mgroup('/docs/integrations/stt', 'Speech-to-text (STT)',         mSttChildren, 'mobile-menu-subsection-link')
    + mgroup('/docs/integrations/vad', 'Voice activity detection (VAD)', mVadChildren, 'mobile-menu-subsection-link')
    + mgroup('/docs/integrations/kws', 'Keyword spotting (KWS)',       mKwsChildren, 'mobile-menu-subsection-link');

  var mApisChildren =
      mlink('/docs/apis/python',  'Python')
    + mlink('/docs/apis/node',    'Node.js')
    + mlink('/docs/apis/browser', 'Browser')
    + mlink('/docs/apis/cli',     'CLI');

  var mobileMenuHtml = ''
    + '<button class="mobile-menu-close" type="button" aria-label="Close menu" onclick="toggleMobileMenu()">'
    +   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
    + '</button>'
    + '<a href="/docs/" class="mobile-menu-link' + (isActive('/docs/') ? ' active' : '') + '" onclick="toggleMobileMenu()">Introduction</a>'
    + '<a href="/docs/getting-started" class="mobile-menu-link' + (isActive('/docs/getting-started') ? ' active' : '') + '" onclick="toggleMobileMenu()">Getting started</a>'
    + mgroup('/docs/integrations', 'Integrations', mIntegrationsChildren, 'mobile-menu-section-link')
    + mgroup('/docs/apis',         'APIs',         mApisChildren,         'mobile-menu-section-link')
    + '<div class="mobile-menu-divider"></div>'
    + '<a href="/" class="mobile-menu-link">Back to decibri.com</a>';

  // ========== DOM INJECTION & WIRING ==========

  var sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.innerHTML = html;

  var mobileMenu = document.querySelector('.mobile-menu');
  if (mobileMenu) mobileMenu.innerHTML = mobileMenuHtml;

  // Wire every chevron: clicking it toggles expand state of its nearest .expandable ancestor.
  // Text-label clicks (the <a>) navigate normally; no JS interception.
  var chevrons = document.querySelectorAll('.expandable-chevron');
  for (var i = 0; i < chevrons.length; i++) {
    chevrons[i].addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var group = this.closest('.expandable');
      if (!group) return;
      var now = group.getAttribute('data-expanded') === 'true';
      group.setAttribute('data-expanded', now ? 'false' : 'true');
      this.setAttribute('aria-expanded', now ? 'false' : 'true');
    });
  }

  // Sidebar overlay
  var overlay = document.querySelector('.sidebar-overlay');
  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }
  if (overlay) overlay.addEventListener('click', closeSidebar);

  // Mobile menu toggle with focus management: save the opener on open,
  // move focus into the menu; restore focus to the opener on close.
  var lastOpener = null;

  window.toggleMobileMenu = function () {
    var menu = document.querySelector('.mobile-menu');
    var menuOverlay = document.querySelector('.mobile-menu-overlay');
    var isOpening = !menu.classList.contains('open');

    if (isOpening) {
      lastOpener = document.activeElement;
      menu.classList.add('open');
      if (menuOverlay) menuOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(function () {
        var firstFocusable = menu.querySelector('button, a, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) firstFocusable.focus();
      });
    } else {
      menu.classList.remove('open');
      if (menuOverlay) menuOverlay.classList.remove('open');
      document.body.style.overflow = '';
      if (lastOpener && typeof lastOpener.focus === 'function') {
        lastOpener.focus();
      }
      lastOpener = null;
    }
  };

  // Escape closes the mobile menu when it is open.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var menu = document.querySelector('.mobile-menu');
    if (menu && menu.classList.contains('open')) window.toggleMobileMenu();
  });

  // Theme toggle
  window.toggleTheme = function () {
    var el = document.documentElement;
    var current = el.getAttribute('data-theme');
    var next = current === 'light' ? 'dark' : 'light';
    el.setAttribute('data-theme', next);
    localStorage.setItem('decibri-theme', next);
  };
})();
