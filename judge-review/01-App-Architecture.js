/**
 * ASTRA / ACCESSFIX AI — Core Architecture & Application Lifecycle
 * File 1: Application Entry, Routing, State Management & Lifecycle
 *
 * System Role:
 * - Centralized reactive state store
 * - Web Audio API sound synthesizer engine
 * - Non-blocking accessible toast notification shelf
 * - User audit history persistence (localStorage)
 * - Navigation routing, mobile menu & command palette (Ctrl+K)
 * - Master DOM lifecycle orchestration
 *
 * Prototype Disclosure:
 * This file orchestrates the frontend architecture for the hackathon prototype.
 * It manages application-wide reactivity, user event routing, and UI lifecycle hooks.
 */

(function (root) {
  'use strict';

  // =========================================================================
  //  1. Centralized Application State
  // =========================================================================
  /**
   * @typedef {Object} SeverityBreakdown
   * @property {number} critical
   * @property {number} high
   * @property {number} medium
   */

  /**
   * @typedef {Object} AuditRecord
   * @property {string} url - Target URL normalized
   * @property {string} displayURL - Formatted URL for UI display
   * @property {number} score - Overall WCAG conformance score (0-100)
   * @property {number} violationCount - Total detected violations
   * @property {Array} violations - List of violation objects
   * @property {SeverityBreakdown} severity - Count per severity tier
   * @property {string} certHash - SHA-256 conformance certificate hash
   * @property {string} repairId - Unique remediation audit identifier
   * @property {string|null} timestamp - ISO timestamp of audit execution
   */

  /**
   * Global state store governing all UI modules
   */
  const state = {
    // Audio engine state
    audioEnabled: true,
    audioCtx: null,

    // Scanner execution status
    isScanning: false,
    activeFilter: 'all',

    // Current active audit record (null until first scan)
    currentAudit: null,

    // Mutable working list of violations (enables per-card and batch repair)
    violations: [],
    totalFixedCount: 0,
    allRepaired: false,

    // Live interactive sandbox playground state
    demoRepaired: false,

    // Local audit history (persisted in localStorage)
    auditHistory: [],

    // Cryptographic certificate hash for the current audit
    certHash: null
  };

  // =========================================================================
  //  2. Web Audio API Sound Synthesizer
  // =========================================================================
  /**
   * Lazily initializes the browser AudioContext upon user gesture.
   */
  function initAudio() {
    if (!state.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (state.audioCtx && state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }
  }

  /**
   * Synthesizes a pure-tone frequency burst using oscillator and gain nodes.
   * @param {number} freq - Frequency in Hertz
   * @param {OscillatorType} [type='sine'] - Oscillator waveform
   * @param {number} [duration=0.15] - Duration in seconds
   * @param {number} [gain=0.08] - Peak amplitude gain
   */
  function playTone(freq, type, duration, gain) {
    if (!state.audioEnabled) return;
    try {
      initAudio();
      if (!state.audioCtx) return;
      const osc = state.audioCtx.createOscillator();
      const gainNode = state.audioCtx.createGain();

      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, state.audioCtx.currentTime);
      gainNode.gain.setValueAtTime(gain || 0.08, state.audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, state.audioCtx.currentTime + (duration || 0.15));

      osc.connect(gainNode);
      gainNode.connect(state.audioCtx.destination);

      osc.start();
      osc.stop(state.audioCtx.currentTime + (duration || 0.15));
    } catch (e) {
      // Audio fails silently on autoplay restrictions
    }
  }

  /**
   * Dispatches branded audio cues for key pipeline events.
   * @param {'click'|'scanTick'|'fixApplied'|'verificationSuccess'|'error'} name
   */
  function playSoundEffect(name) {
    if (!state.audioEnabled) return;
    const soundMap = {
      click: () => playTone(600, 'sine', 0.06, 0.04),
      scanTick: () => playTone(880, 'sine', 0.08, 0.03),
      fixApplied: () => {
        playTone(523.25, 'triangle', 0.12, 0.08);
        setTimeout(() => playTone(659.25, 'triangle', 0.14, 0.08), 80);
        setTimeout(() => playTone(783.99, 'triangle', 0.20, 0.08), 160);
      },
      verificationSuccess: () => {
        playTone(523.25, 'sine', 0.15, 0.07);
        setTimeout(() => playTone(659.25, 'sine', 0.15, 0.07), 90);
        setTimeout(() => playTone(783.99, 'sine', 0.18, 0.07), 180);
        setTimeout(() => playTone(1046.50, 'sine', 0.35, 0.09), 270);
      },
      error: () => playTone(220, 'sawtooth', 0.20, 0.06)
    };
    if (soundMap[name]) soundMap[name]();
  }

  // =========================================================================
  //  3. Accessible Toast Notification System
  // =========================================================================
  /**
   * Spawns an accessible, auto-dismissing toast notification with ARIA live region.
   * @param {string} message - Primary notification text
   * @param {'info'|'success'|'error'} [type='info'] - Severity variant
   * @param {string} [title='AccessFix System'] - Header badge
   */
  function showToast(message, type, title) {
    type = type || 'info';
    title = title || 'AccessFix System';

    let shelf = document.getElementById('toastShelf');
    if (!shelf) {
      shelf = document.createElement('div');
      shelf.id = 'toastShelf';
      shelf.className = 'toast-shelf';
      shelf.setAttribute('aria-live', 'polite');
      document.body.appendChild(shelf);
    }

    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.setAttribute('role', 'alert');

    const iconSvg = type === 'success'
      ? '<svg width="20" height="20" fill="none" stroke="#10b981" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>'
      : '<svg width="20" height="20" fill="none" stroke="#00f2fe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 16v-4m0-4h.01"/></svg>';

    toast.innerHTML =
      '<div style="flex-shrink:0;">' + iconSvg + '</div>'
      + '<div style="flex:1;">'
      + '  <div style="font-size:0.75rem;text-transform:uppercase;font-weight:700;color:' + (type === 'success' ? '#10b981' : '#00f2fe') + ';">' + escapeHtml(title) + '</div>'
      + '  <div style="font-size:0.875rem;color:#f8fafc;">' + escapeHtml(message) + '</div>'
      + '</div>'
      + '<button type="button" aria-label="Close notification" style="color:#64748b;font-size:1.1rem;padding:4px;background:none;border:none;cursor:pointer;" onclick="this.parentElement.remove()">✕</button>';

    shelf.appendChild(toast);

    setTimeout(() => {
      if (toast && toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }

  // =========================================================================
  //  4. Audit Persistence & History Manager
  // =========================================================================
  const STORAGE_KEY = 'accessfix_audit_history';

  /**
   * Loads recent audits from localStorage into memory.
   */
  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      state.auditHistory = raw ? JSON.parse(raw) : [];
    } catch (e) {
      state.auditHistory = [];
    }
  }

  /**
   * Persists the 5 most recent audits into localStorage.
   */
  function saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.auditHistory.slice(0, 5)));
    } catch (e) {
      // Storage quota safety
    }
  }

  /**
   * Prepends a newly completed audit to the history list.
   * @param {AuditRecord} audit
   */
  function addToHistory(audit) {
    state.auditHistory = state.auditHistory.filter(h => h.url !== audit.url);
    state.auditHistory.unshift({
      url: audit.url,
      displayURL: audit.displayURL,
      score: audit.score,
      violationCount: audit.violationCount,
      status: 'Scanned',
      timestamp: audit.timestamp
    });
    state.auditHistory = state.auditHistory.slice(0, 5);
    saveHistory();
    renderHistory();
  }

  /**
   * Formats an ISO date into relative human time (e.g. '5m ago').
   * @param {string} isoString
   * @returns {string}
   */
  function formatTimeAgo(isoString) {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  }

  /**
   * Renders the recent audit items into the UI history panel.
   */
  function renderHistory() {
    const container = document.getElementById('recentAuditsPanel');
    if (!container) return;

    if (state.auditHistory.length === 0) {
      container.innerHTML = '<div style="padding:16px; text-align:center; color:var(--text-dim); font-size:0.85rem;">No recent audits yet. Run a scan to begin.</div>';
      return;
    }

    container.innerHTML = state.auditHistory.map(h => {
      const scoreColor = h.score >= 80 ? '#10b981' : h.score >= 65 ? '#f59e0b' : '#ef4444';
      const timeAgo = h.timestamp ? formatTimeAgo(h.timestamp) : 'Just now';
      return '<button type="button" class="history-item" data-url="' + escapeHtml(h.url) + '" aria-label="Re-scan ' + escapeHtml(h.displayURL) + '">'
        + '<div style="flex:1; min-width:0;">'
        + '  <div style="font-size:0.825rem; color:#e2e8f0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:var(--font-mono);">' + escapeHtml(h.displayURL) + '</div>'
        + '  <div style="font-size:0.7rem; color:var(--text-dim); margin-top:2px;">' + h.violationCount + ' violations • ' + timeAgo + '</div>'
        + '</div>'
        + '<div style="text-align:right;">'
        + '  <div style="font-size:1.1rem; font-weight:800; font-family:var(--font-display); color:' + scoreColor + ';">' + h.score + '</div>'
        + '  <div style="font-size:0.65rem; color:var(--text-dim); text-transform:uppercase;">Score</div>'
        + '</div>'
        + '</button>';
    }).join('');

    // Attach click listeners to reload audit target
    container.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.getAttribute('data-url');
        const urlInput = document.getElementById('scannerUrlInput');
        if (urlInput) urlInput.value = url;
        playSoundEffect('click');
        showToast('Restored target ' + url, 'info', 'History');
        if (root.AccessFixWorkflow && root.AccessFixWorkflow.runFullScan) {
          root.AccessFixWorkflow.runFullScan(url);
        }
      });
    });
  }

  // =========================================================================
  //  5. Navigation & Quick Command Palette (Ctrl+K)
  // =========================================================================
  function initHeaderControls() {
    const soundBtn = document.getElementById('soundToggleBtn');
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const navMenu = document.getElementById('mainNav');

    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        state.audioEnabled = !state.audioEnabled;
        soundBtn.setAttribute('aria-pressed', state.audioEnabled.toString());
        soundBtn.innerHTML = state.audioEnabled
          ? '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>'
          : '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>';
        showToast(state.audioEnabled ? 'Audio synthesis active' : 'Audio synthesis muted', 'info', 'Audio Engine');
      });
    }

    if (mobileBtn && navMenu) {
      mobileBtn.addEventListener('click', () => {
        const isExpanded = mobileBtn.getAttribute('aria-expanded') === 'true';
        mobileBtn.setAttribute('aria-expanded', (!isExpanded).toString());
        navMenu.style.display = isExpanded ? 'none' : 'block';
        navMenu.style.position = 'absolute';
        navMenu.style.top = '76px';
        navMenu.style.left = '0';
        navMenu.style.width = '100%';
        navMenu.style.background = '#090e1a';
        navMenu.style.padding = '20px';
        navMenu.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
      });
    }
  }

  function initCommandPalette() {
    const modal = document.getElementById('cmdPaletteModal');
    const input = document.getElementById('cmdPaletteInput');
    const openCmdBtn = document.getElementById('openCmdPaletteBtn');
    if (!modal) return;

    function openPalette() {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      if (input) { input.value = ''; input.focus(); }
      playSoundEffect('click');
      document.body.style.overflow = 'hidden';
    }

    function closePalette() {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        modal.classList.contains('open') ? closePalette() : openPalette();
      } else if (e.key === 'Escape' && modal.classList.contains('open')) {
        closePalette();
      }
    });

    if (openCmdBtn) openCmdBtn.addEventListener('click', openPalette);
    modal.addEventListener('click', (e) => { if (e.target === modal) closePalette(); });

    const cmdList = document.getElementById('cmdPaletteList');
    if (cmdList) {
      cmdList.querySelectorAll('.cmd-item').forEach(item => {
        item.addEventListener('click', () => {
          const targetId = item.getAttribute('data-target');
          const action = item.getAttribute('data-action');
          closePalette();
          if (action === 'scan') {
            const scanBtn = document.getElementById('runScanBtn');
            const sec = document.getElementById('scanner');
            if (sec) sec.scrollIntoView({ behavior: 'smooth' });
            if (scanBtn) setTimeout(() => scanBtn.click(), 600);
          } else if (action === 'cert') {
            const certBtn = document.getElementById('openCertBtn');
            if (certBtn) certBtn.click();
          } else if (targetId) {
            const sec = document.getElementById(targetId);
            if (sec) sec.scrollIntoView({ behavior: 'smooth' });
          }
        });
      });
    }
  }

  // =========================================================================
  //  6. Utility Helpers
  // =========================================================================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =========================================================================
  //  Module Export
  // =========================================================================
  root.AccessFixArchitecture = {
    state,
    initAudio,
    playTone,
    playSoundEffect,
    showToast,
    loadHistory,
    saveHistory,
    addToHistory,
    renderHistory,
    initHeaderControls,
    initCommandPalette,
    escapeHtml
  };

})(typeof window !== 'undefined' ? window : globalThis);
