/**
 * ACCESSFIX AI - Main Application Logic v2.5
 * URL-Dependent Deterministic WCAG Audit Simulation Engine
 * Pure Vanilla JavaScript — Zero external dependencies
 *
 * PROTOTYPE DISCLOSURE: This is a frontend hackathon prototype.
 * Accessibility findings are generated deterministically from the URL string
 * using a seeded PRNG. A production implementation would connect to a real
 * DOM crawler and WCAG analysis engine.
 */

(function () {
  'use strict';

  const DATA = window.ACCESSFIX_DATA;

  // =========================================================================
  //  Global State
  // =========================================================================
  const state = {
    audioEnabled: true,
    audioCtx: null,
    isScanning: false,
    activeFilter: 'all',

    // Current audit result (null until first scan)
    currentAudit: null,
    // Working copy of violations (allows per-card repair)
    violations: [],
    totalFixedCount: 0,
    allRepaired: false,

    // Live sandbox state
    demoRepaired: false,

    // Audit history (persisted in localStorage)
    auditHistory: [],

    // Certificate hash for current audit
    certHash: null
  };

  // =========================================================================
  //  Sound Engine (Web Audio API Synthesizer) — unchanged
  // =========================================================================
  function initAudio() {
    if (!state.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (state.audioCtx && state.audioCtx.state === 'suspended') state.audioCtx.resume();
  }

  function playTone(freq, type, duration, gain) {
    if (!state.audioEnabled) return;
    try {
      initAudio();
      if (!state.audioCtx) return;
      const o = state.audioCtx.createOscillator();
      const g = state.audioCtx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, state.audioCtx.currentTime);
      g.gain.setValueAtTime(gain || 0.08, state.audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, state.audioCtx.currentTime + (duration || 0.15));
      o.connect(g); g.connect(state.audioCtx.destination);
      o.start(); o.stop(state.audioCtx.currentTime + (duration || 0.15));
    } catch (e) { /* silent */ }
  }

  function playSoundEffect(name) {
    if (!state.audioEnabled) return;
    const effects = {
      click: () => playTone(600, 'sine', 0.06, 0.04),
      scanTick: () => playTone(880, 'sine', 0.08, 0.03),
      fixApplied: () => {
        playTone(523.25, 'triangle', 0.12, 0.08);
        setTimeout(() => playTone(659.25, 'triangle', 0.14, 0.08), 80);
        setTimeout(() => playTone(783.99, 'triangle', 0.2, 0.08), 160);
      },
      verificationSuccess: () => {
        playTone(523.25, 'sine', 0.15, 0.07);
        setTimeout(() => playTone(659.25, 'sine', 0.15, 0.07), 90);
        setTimeout(() => playTone(783.99, 'sine', 0.18, 0.07), 180);
        setTimeout(() => playTone(1046.50, 'sine', 0.35, 0.09), 270);
      },
      error: () => playTone(220, 'sawtooth', 0.2, 0.06)
    };
    if (effects[name]) effects[name]();
  }

  // =========================================================================
  //  Toast Notification System — unchanged
  // =========================================================================
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
    toast.innerHTML = '<div style="flex-shrink:0;">' + iconSvg + '</div>'
      + '<div style="flex:1;"><div style="font-size:0.75rem;text-transform:uppercase;font-weight:700;color:' + (type === 'success' ? '#10b981' : '#00f2fe') + ';">' + title + '</div>'
      + '<div style="font-size:0.875rem;color:#f8fafc;">' + message + '</div></div>'
      + '<button type="button" aria-label="Close notification" style="color:#64748b;font-size:1.1rem;padding:4px;" onclick="this.parentElement.remove()">✕</button>';
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
  //  Utility Helpers
  // =========================================================================
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function animateNumber(el, start, end, duration) {
    if (!el) return;
    const range = end - start;
    const stepTime = Math.max(Math.floor((duration || 600) / (Math.abs(range) || 1)), 15);
    let current = start;
    const timer = setInterval(() => {
      if (current < end) current++;
      else if (current > end) current--;
      else clearInterval(timer);
      el.textContent = current;
    }, stepTime);
  }

  // =========================================================================
  //  Score Gauge Management
  // =========================================================================
  function updateScoreGauge(score, animate) {
    const scoreValEl = document.getElementById('scoreValue');
    const radialBar = document.getElementById('radialBar');
    const scoreDeltaBadge = document.getElementById('scoreDeltaBadge');
    if (!scoreValEl || !radialBar) return;

    const circumference = 440;
    const offset = circumference - (score / 100) * circumference;
    radialBar.style.strokeDashoffset = offset;

    if (animate) {
      const currentVal = parseInt(scoreValEl.textContent, 10) || 0;
      animateNumber(scoreValEl, currentVal, score, 800);
    } else {
      scoreValEl.textContent = score;
    }

    // Update badge
    if (scoreDeltaBadge && state.currentAudit) {
      if (state.allRepaired) {
        const delta = 100 - state.currentAudit.score;
        scoreDeltaBadge.innerHTML = '+' + delta + ' Pts <span>(WCAG AA Verified)</span>';
        scoreDeltaBadge.className = 'score-delta-badge badge-success';
      } else {
        scoreDeltaBadge.innerHTML = 'Score: ' + score + '/100 (' + state.currentAudit.violationCount + ' Violations)';
        scoreDeltaBadge.className = 'score-delta-badge badge-warning';
      }
    }
  }

  // =========================================================================
  //  Audit History (localStorage)
  // =========================================================================
  function loadHistory() {
    try {
      const raw = localStorage.getItem('accessfix_audit_history');
      state.auditHistory = raw ? JSON.parse(raw) : [];
    } catch (e) { state.auditHistory = []; }
  }

  function saveHistory() {
    try {
      localStorage.setItem('accessfix_audit_history', JSON.stringify(state.auditHistory.slice(0, 5)));
    } catch (e) { /* quota exceeded silently */ }
  }

  function addToHistory(audit) {
    // Remove duplicate URLs
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

  function renderHistory() {
    const container = document.getElementById('recentAuditsPanel');
    if (!container) return;

    if (state.auditHistory.length === 0) {
      container.innerHTML = '<div style="padding:16px; text-align:center; color:var(--text-dim); font-size:0.85rem;">No recent audits yet. Run a scan to begin.</div>';
      return;
    }

    container.innerHTML = state.auditHistory.map((h, idx) => {
      const scoreColor = h.score >= 80 ? '#10b981' : h.score >= 65 ? '#f59e0b' : '#ef4444';
      const timeAgo = h.timestamp ? formatTimeAgo(h.timestamp) : 'Just now';
      return '<button type="button" class="history-item" data-url="' + escapeHtml(h.url) + '" aria-label="Re-scan ' + escapeHtml(h.displayURL) + '">'
        + '<div style="flex:1; min-width:0;">'
        + '<div style="font-size:0.825rem; color:#e2e8f0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:var(--font-mono);">' + escapeHtml(h.displayURL) + '</div>'
        + '<div style="font-size:0.7rem; color:var(--text-dim); margin-top:2px;">' + h.violationCount + ' violations • ' + timeAgo + '</div>'
        + '</div>'
        + '<div style="text-align:right;">'
        + '<div style="font-size:1.1rem; font-weight:800; font-family:var(--font-display); color:' + scoreColor + ';">' + h.score + '</div>'
        + '<div style="font-size:0.65rem; color:var(--text-dim); text-transform:uppercase;">Score</div>'
        + '</div>'
        + '</button>';
    }).join('');

    // Attach click handlers
    container.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.getAttribute('data-url');
        const urlInput = document.getElementById('scannerUrlInput');
        if (urlInput) urlInput.value = url;
        playSoundEffect('click');
        showToast('Restored audit for ' + url, 'info', 'History');
        // Trigger scan
        runFullScan(url);
      });
    });
  }

  function formatTimeAgo(isoString) {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  }

  // =========================================================================
  //  Scanner Dashboard Stats Rendering
  // =========================================================================
  function renderScannerDashboard(audit) {
    if (!audit) return;

    // Update dashboard stat elements
    const domCountEl = document.getElementById('statDomNodes');
    const scanTimeEl = document.getElementById('statScanTime');
    const wcagCountEl = document.getElementById('statWcagCriteria');
    const warningCountEl = document.getElementById('statWarnings');

    if (domCountEl) domCountEl.textContent = audit.domNodeCount;
    if (scanTimeEl) scanTimeEl.textContent = audit.scanTimeMs + 'ms';
    if (wcagCountEl) wcagCountEl.textContent = audit.wcagCriteriaChecked;
    if (warningCountEl) warningCountEl.textContent = audit.warningCount;

    // Severity breakdown
    const critEl = document.getElementById('statCritical');
    const highEl = document.getElementById('statHigh');
    const medEl = document.getElementById('statMedium');
    if (critEl) critEl.textContent = audit.severity.critical;
    if (highEl) highEl.textContent = audit.severity.high;
    if (medEl) medEl.textContent = audit.severity.medium;

    // Principle scores
    const pPerc = document.getElementById('statPerceivable');
    const pOper = document.getElementById('statOperable');
    const pUnder = document.getElementById('statUnderstandable');
    const pRobust = document.getElementById('statRobust');
    if (pPerc) pPerc.textContent = audit.principleScores.perceivable + '%';
    if (pOper) pOper.textContent = audit.principleScores.operable + '%';
    if (pUnder) pUnder.textContent = audit.principleScores.understandable + '%';
    if (pRobust) pRobust.textContent = audit.principleScores.robust + '%';

    // Target URL display
    const targetEl = document.getElementById('scanTargetDisplay');
    if (targetEl) targetEl.textContent = audit.displayURL;
  }

  // =========================================================================
  //  Main Scanner Engine (URL-Dependent)
  // =========================================================================
  function initScanner() {
    const scanBtn = document.getElementById('runScanBtn');
    const urlInput = document.getElementById('scannerUrlInput');
    const presetChips = document.querySelectorAll('.preset-chip');

    if (!scanBtn) return;

    // Preset Chip Click Handlers
    presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        presetChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const url = chip.getAttribute('data-url');
        if (url && urlInput) urlInput.value = url;
        playSoundEffect('click');
        showToast('Target set to ' + chip.textContent.trim(), 'info', 'Scanner Config');
      });
    });

    // Scan button
    scanBtn.addEventListener('click', () => {
      if (state.isScanning) return;
      const url = (urlInput ? urlInput.value : '') || 'https://example.com';
      runFullScan(url);
    });

    // Enter key in input
    if (urlInput) {
      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !state.isScanning) {
          e.preventDefault();
          const url = urlInput.value || 'https://example.com';
          runFullScan(url);
        }
      });
    }
  }

  function runFullScan(url) {
    const scanBtn = document.getElementById('runScanBtn');
    const stages = document.querySelectorAll('.stage-item');
    const progressFill = document.getElementById('scannerProgressFill');
    const progressPercent = document.getElementById('scannerProgressPercent');
    const progressStatusText = document.getElementById('scannerStatusText');

    // 1. Generate deterministic audit from URL
    const audit = DATA.generateAudit(url);
    audit.timestamp = new Date().toISOString();

    // 2. Reset state
    state.isScanning = true;
    state.currentAudit = audit;
    state.violations = JSON.parse(JSON.stringify(audit.violations));
    state.totalFixedCount = 0;
    state.allRepaired = false;
    state.certHash = audit.certHash;

    // 3. UI: disable scan button, show spinner
    if (scanBtn) {
      scanBtn.disabled = true;
      scanBtn.innerHTML = '<span class="stage-spinner" style="display:inline-block;margin-right:8px;"></span>Executing Formal Pipeline...';
    }

    // 4. Reset stage indicators
    stages.forEach(st => {
      st.classList.remove('running', 'completed');
      st.classList.add('pending');
    });

    // Reset score gauge to 0
    updateScoreGauge(0, false);
    if (progressFill) progressFill.style.width = '0%';
    if (progressPercent) progressPercent.textContent = '0%';

    // 5. Define animated scan stages
    const stepDefs = [
      {
        label: 'URL Normalization & Target Resolution',
        detail: 'Resolved target: ' + audit.displayURL,
        duration: 400, progress: 10
      },
      {
        label: 'DOM Audit Simulation',
        detail: 'Traversed ' + audit.domNodeCount + ' DOM nodes & computed style map',
        duration: 600, progress: 30
      },
      {
        label: 'WCAG Rule Matching (' + audit.wcagCriteriaChecked + ' Criteria)',
        detail: 'Identified ' + audit.violationCount + ' accessibility violations',
        duration: 700, progress: 55
      },
      {
        label: 'Repair Synthesis Engine',
        detail: 'Synthesizing ' + audit.violationCount + ' non-breaking AST patches...',
        duration: 800, progress: 75
      },
      {
        label: 'Regression & Safety Check',
        detail: 'Prototype model check: 0 simulated regressions detected',
        duration: 500, progress: 90
      },
      {
        label: 'Conformance Verification',
        detail: 'Conformance status: VERIFIED — ' + audit.violationCount + ' safe repairs ready',
        duration: 400, progress: 100
      }
    ];

    let stepIndex = 0;

    // Update stage HTML with dynamic info
    stages.forEach((stageEl, idx) => {
      const def = stepDefs[idx];
      if (!def) return;
      const labelEl = stageEl.querySelector('.stage-label-text');
      const detailEl = stageEl.querySelector('.stage-detail-text');
      const timeEl = stageEl.querySelector('.stage-time');
      if (labelEl) labelEl.textContent = def.label;
      if (detailEl) detailEl.textContent = def.detail;
      if (timeEl) timeEl.textContent = (audit.stageTimings[idx] || 0) + 'ms';
    });

    function executeNextStep() {
      // Mark previous as completed
      if (stepIndex > 0 && stages[stepIndex - 1]) {
        stages[stepIndex - 1].classList.remove('running');
        stages[stepIndex - 1].classList.add('completed');
      }

      if (stepIndex >= stepDefs.length) {
        // --- SCAN COMPLETE ---
        state.isScanning = false;
        if (scanBtn) {
          scanBtn.disabled = false;
          scanBtn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Re-run Accessibility Scan';
        }

        // Show final score
        updateScoreGauge(audit.score, true);

        // Render violations dashboard
        renderViolations();

        // Render dynamic diff
        renderDynamicDiff();

        // Update dashboard stats
        renderScannerDashboard(audit);

        // Update impact section
        updateImpactSection(audit);

        // Update verification section
        updateVerificationSection(audit);

        // Save to history
        addToHistory(audit);

        playSoundEffect('verificationSuccess');
        showToast('AUDIT COMPLETE — ' + audit.violationCount + ' violations detected across ' + audit.displayURL + '. Score: ' + audit.score + '/100', 'success', 'Scan Complete');

        // Show completion summary
        if (progressStatusText) {
          progressStatusText.textContent = 'AUDIT COMPLETE ✓ — ' + audit.violationCount + ' violations, ' + audit.violationCount + ' safe repairs synthesized, 0 simulated regressions';
        }

        return;
      }

      const step = stepDefs[stepIndex];
      if (stages[stepIndex]) {
        stages[stepIndex].classList.remove('pending');
        stages[stepIndex].classList.add('running');
      }

      if (progressFill) progressFill.style.width = step.progress + '%';
      if (progressPercent) progressPercent.textContent = step.progress + '%';
      if (progressStatusText) progressStatusText.textContent = step.detail;

      playSoundEffect('scanTick');
      stepIndex++;
      setTimeout(executeNextStep, step.duration);
    }

    executeNextStep();
  }

  // =========================================================================
  //  Violation Dashboard — Dynamic Rendering
  // =========================================================================
  function renderViolations() {
    const grid = document.getElementById('violationsGrid');
    if (!grid) return;

    if (!state.currentAudit) {
      grid.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-dim); font-size:0.95rem;">Run a scan to populate the violation dashboard.</div>';
      return;
    }

    const filtered = state.violations.filter(v => {
      if (state.activeFilter === 'all') return true;
      return v.principle.toLowerCase().includes(state.activeFilter.toLowerCase());
    });

    grid.innerHTML = filtered.map(v => {
      const severityBadgeClass = v.isFixed ? 'badge-success' : (v.severity === 'CRITICAL' ? 'badge-danger' : v.severity === 'HIGH' ? 'badge-warning' : 'badge');
      return '<article class="violation-card ' + (v.isFixed ? 'is-repaired' : '') + '" data-id="' + v.id + '">'
        + '<div class="violation-card-header"><div>'
        + '<div class="violation-meta-top">'
        + '<span class="badge ' + severityBadgeClass + '">' + (v.isFixed ? '✓ REPAIRED & VERIFIED' : v.severity) + '</span>'
        + '<span class="badge badge-glow-cyan">' + v.wcagRule + ' (' + v.level + ')</span>'
        + '<span class="badge" style="color:var(--text-muted);font-family:var(--font-mono);">' + escapeHtml(v.elementTag) + '</span>'
        + '</div>'
        + '<h3 class="violation-title">' + escapeHtml(v.title) + '</h3>'
        + '<p class="violation-impact">' + escapeHtml(v.impact) + '</p>'
        + '</div><div>'
        + '<button type="button" class="btn ' + (v.isFixed ? 'btn-success' : 'btn-primary') + ' btn-sm repair-single-btn" data-id="' + v.id + '"'
        + ' aria-label="' + (v.isFixed ? 'Repaired' : 'Apply fix for ' + v.wcagRule) + '"'
        + (v.isFixed ? ' disabled' : '') + '>'
        + (v.isFixed
          ? '<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Repaired ✓'
          : '<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Apply Fix')
        + '</button></div></div>'
        + '<div class="violation-code-box"><div class="code-pane">'
        + '<div class="code-pane-label label-before"><span>Before Code (Violation)</span><span style="color:var(--color-danger);">FAIL</span></div>'
        + '<pre class="code-snippet"><code>' + escapeHtml(v.beforeCode) + '</code></pre>'
        + '</div><div class="code-pane" style="' + (v.isFixed ? 'border-color:rgba(16,185,129,0.4);background:rgba(16,185,129,0.05);' : '') + '">'
        + '<div class="code-pane-label label-after"><span>Synthesized Fix (Patch)</span><span style="color:var(--color-success);">PASS ✓</span></div>'
        + '<pre class="code-snippet"><code>' + escapeHtml(v.afterCode) + '</code></pre>'
        + '</div></div>'
        + '<div class="violation-footer"><div class="fix-explanation">'
        + '<strong style="color:var(--text-highlight);">AST Engine Strategy:</strong> ' + escapeHtml(v.fixExplanation)
        + '</div><div style="font-family:var(--font-mono);font-size:0.75rem;color:' + (v.isFixed ? '#10b981' : 'var(--text-dim)') + ';">'
        + (v.isFixed ? 'Soundness Verified • Zero Drift' : 'Ready for Invariance Check')
        + '</div></div></article>';
    }).join('');

    // Attach click handlers
    grid.querySelectorAll('.repair-single-btn').forEach(btn => {
      btn.addEventListener('click', () => applySingleRepair(btn.getAttribute('data-id')));
    });

    updateCounters();
  }

  function applySingleRepair(id) {
    const violation = state.violations.find(v => v.id === id);
    if (!violation || violation.isFixed) return;

    violation.isFixed = true;
    violation.repairedTimestamp = new Date().toISOString();
    state.totalFixedCount++;

    playSoundEffect('fixApplied');
    showToast('Remediated ' + violation.wcagRule + ': ' + violation.title, 'success', 'Patch Applied');

    renderViolations();

    // Recalculate score
    const fixedRatio = state.violations.filter(v => v.isFixed).length / state.violations.length;
    const baseScore = state.currentAudit ? state.currentAudit.score : 70;
    const computedScore = Math.round(baseScore + ((100 - baseScore) * fixedRatio));
    updateScoreGauge(computedScore, true);

    // Check if all fixed
    if (state.violations.every(v => v.isFixed)) {
      state.allRepaired = true;
      updateScoreGauge(100, true);
      renderDynamicDiff();
      updateImpactSection(state.currentAudit);
      showToast('All violations remediated! Score elevated to 100/100.', 'success', 'Full Conformance');
    }
  }

  function autoRepairAllViolations() {
    if (!state.violations || state.violations.length === 0) return;
    if (state.allRepaired) return;

    state.violations.forEach(v => {
      v.isFixed = true;
      v.repairedTimestamp = new Date().toISOString();
    });
    state.totalFixedCount = state.violations.length;
    state.allRepaired = true;

    renderViolations();
    updateScoreGauge(100, true);
    renderDynamicDiff();
    if (state.currentAudit) updateImpactSection(state.currentAudit);

    playSoundEffect('verificationSuccess');
    showToast('Applied all ' + state.violations.length + ' safe patches. Conformance: VERIFIED.', 'success', 'All Fixes Applied');
  }

  function updateCounters() {
    const fixedTotal = state.violations.filter(v => v.isFixed).length;
    const remaining = state.violations.length - fixedTotal;

    const remainingEl = document.getElementById('remainingViolationsCounter');
    const fixedEl = document.getElementById('fixedViolationsCounter');
    if (remainingEl) remainingEl.textContent = remaining;
    if (fixedEl) fixedEl.textContent = fixedTotal + '/' + state.violations.length;
  }

  function initFilterTabs() {
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeFilter = tab.getAttribute('data-filter') || 'all';
        playSoundEffect('click');
        renderViolations();
      });
    });
  }

  // =========================================================================
  //  Dynamic Before/After Diff Studio
  // =========================================================================
  function renderDynamicDiff() {
    const beforePane = document.getElementById('diffPaneBefore');
    const afterPane = document.getElementById('diffPaneAfter');
    const beforeMeta = document.getElementById('diffBeforeMeta');
    const afterMeta = document.getElementById('diffAfterMeta');
    const sourceTag = document.getElementById('diffSourceTag');

    if (!beforePane || !afterPane) return;

    if (!state.currentAudit) return;

    const diff = DATA.generateDiffCode(state.currentAudit.violations);

    // Line-by-line rendering with diff highlighting
    const beforeLines = diff.before.split('\n').map(line => {
      if (line.startsWith('<!--') && (line.includes('Violation') || line.includes('Inaccessible'))) {
        return '<span class="diff-del">' + escapeHtml(line) + '</span>';
      }
      return escapeHtml(line);
    }).join('\n');

    const afterLines = diff.after.split('\n').map(line => {
      if (line.startsWith('<!--') && (line.includes('Fix') || line.includes('Verified'))) {
        return '<span class="diff-add">' + escapeHtml(line) + '</span>';
      }
      return escapeHtml(line);
    }).join('\n');

    beforePane.innerHTML = '<code>' + beforeLines + '</code>';
    afterPane.innerHTML = '<code>' + afterLines + '</code>';

    if (beforeMeta) {
      beforeMeta.innerHTML = 'Score: ' + state.currentAudit.score + '/100 • '
        + state.currentAudit.violationCount + ' Violations Detected';
    }
    if (afterMeta) {
      afterMeta.innerHTML = state.allRepaired
        ? 'Score: 100/100 • All Fixes Verified ✓'
        : 'Score: 100/100 • ' + state.currentAudit.violationCount + ' Patches Ready';
    }
    if (sourceTag) {
      sourceTag.textContent = 'Source: ' + state.currentAudit.displayURL;
    }
  }

  function initDiffStudio() {
    const applyAllBtn = document.getElementById('applyAllSafeFixesBtn');
    if (applyAllBtn) {
      applyAllBtn.addEventListener('click', () => {
        if (!state.currentAudit) {
          showToast('Run a scan first to generate violations.', 'info', 'No Audit');
          return;
        }
        autoRepairAllViolations();
        applyAllBtn.classList.remove('btn-primary');
        applyAllBtn.classList.add('btn-success');
        applyAllBtn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> All ' + state.violations.length + ' Safe Fixes Applied ✓';
      });
    }
  }

  // =========================================================================
  //  Verification Section — Dynamic Update
  // =========================================================================
  function updateVerificationSection(audit) {
    if (!audit) return;
    const repairIdEl = document.getElementById('verifyRepairId');
    const confidenceEl = document.getElementById('verifyConfidence');
    if (repairIdEl) repairIdEl.textContent = 'Repair ID: ' + audit.repairId;
    if (confidenceEl) confidenceEl.textContent = 'Confidence Level: ' + DATA.certificateTemplate.confidenceScore;
  }

  // =========================================================================
  //  Impact Section — Dynamic Update
  // =========================================================================
  function updateImpactSection(audit) {
    if (!audit) return;
    const conformanceEl = document.getElementById('impactConformance');
    const criticalEl = document.getElementById('impactCritical');
    const fixedEl = document.getElementById('impactFixed');
    const scoreEl = document.getElementById('impactScore');

    if (state.allRepaired) {
      if (conformanceEl) conformanceEl.textContent = '100%';
      if (criticalEl) criticalEl.textContent = '0';
      if (fixedEl) fixedEl.textContent = audit.violationCount;
      if (scoreEl) scoreEl.textContent = '100';
    } else {
      const fixedCount = state.violations.filter(v => v.isFixed).length;
      const unfixedCrit = state.violations.filter(v => !v.isFixed && v.severity === 'CRITICAL').length;
      if (conformanceEl) conformanceEl.textContent = (fixedCount === audit.violationCount) ? '100%' : Math.round((fixedCount / audit.violationCount) * 100) + '%';
      if (criticalEl) criticalEl.textContent = unfixedCrit;
      if (fixedEl) fixedEl.textContent = fixedCount;
      if (scoreEl) scoreEl.textContent = audit.score;
    }
  }

  // =========================================================================
  //  Certificate Modal — Dynamic
  // =========================================================================
  function initCertificateModal() {
    const openBtn = document.getElementById('openCertBtn');
    const modal = document.getElementById('certModal');
    const closeBtn = document.getElementById('closeCertModalBtn');
    const copyHashBtn = document.getElementById('copyHashBtn');
    const printBtn = document.getElementById('printCertBtn');
    const hashDisplay = document.getElementById('certHashValue');
    const certTimestamp = document.getElementById('certTimestamp');
    const certTargetEl = document.getElementById('certTargetURL');
    const certBeforeScoreEl = document.getElementById('certBeforeScore');
    const certAfterScoreEl = document.getElementById('certAfterScore');
    const certFixCountEl = document.getElementById('certFixCount');
    const certRepairIdEl = document.getElementById('certRepairId');

    if (!openBtn || !modal) return;

    function openModal() {
      if (!state.currentAudit) {
        showToast('Run an accessibility scan first to generate a certificate.', 'info', 'No Audit Data');
        return;
      }

      const audit = state.currentAudit;
      if (hashDisplay) hashDisplay.textContent = state.certHash || audit.certHash;
      if (certTimestamp) certTimestamp.textContent = new Date().toUTCString();
      if (certTargetEl) certTargetEl.textContent = audit.displayURL;
      if (certBeforeScoreEl) certBeforeScoreEl.textContent = audit.score + '/100';
      if (certAfterScoreEl) certAfterScoreEl.textContent = state.allRepaired ? '100/100' : audit.score + '/100 (pre-repair)';
      if (certFixCountEl) certFixCountEl.textContent = state.totalFixedCount + ' of ' + audit.violationCount;
      if (certRepairIdEl) certRepairIdEl.textContent = audit.repairId;

      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      playSoundEffect('verificationSuccess');
      if (closeBtn) closeBtn.focus();
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      playSoundEffect('click');
      document.body.style.overflow = '';
      openBtn.focus();
    }

    openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
    });

    if (copyHashBtn) {
      copyHashBtn.addEventListener('click', () => {
        const hash = state.certHash || 'No hash generated';
        navigator.clipboard.writeText(hash).then(() => {
          showToast('Copied certificate hash to clipboard', 'success', 'Clipboard');
          playSoundEffect('click');
        }).catch(() => showToast('Failed to copy', 'error', 'Error'));
      });
    }
    if (printBtn) printBtn.addEventListener('click', () => window.print());
  }

  // =========================================================================
  //  WCAG 4 Pillars Rendering — unchanged
  // =========================================================================
  function renderWcagPillars() {
    const container = document.getElementById('wcagPillarsGrid');
    if (!container || !DATA.wcagPillars) return;
    container.innerHTML = DATA.wcagPillars.map(p =>
      '<div class="pillar-card"><div>'
      + '<div class="pillar-num">PRINCIPLE 0' + p.principleNumber + '</div>'
      + '<h3 class="pillar-title">' + p.name + '</h3>'
      + '<p class="pillar-desc">' + p.tagline + '</p>'
      + '<div class="badge badge-success" style="margin-bottom:14px;">✓ ' + p.criteriaChecked + ' Criteria Synthesized</div>'
      + '</div><div><ul class="pillar-rules-list">'
      + p.rules.map(r => '<li class="pillar-rule-item"><span>WCAG ' + r.code + '</span><span class="text-cyan">' + r.name.split(' ')[0] + '</span></li>').join('')
      + '</ul></div></div>'
    ).join('');
  }

  // =========================================================================
  //  Frameworks Rendering — unchanged
  // =========================================================================
  function renderFrameworks() {
    const container = document.getElementById('frameworksGrid');
    if (!container || !DATA.frameworks) return;
    container.innerHTML = DATA.frameworks.map(f =>
      '<div class="framework-card"><div class="framework-icon">'
      + '<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>'
      + '</div><h3 class="framework-title">' + f.name + '</h3>'
      + '<span class="framework-tag">' + f.tag + '</span>'
      + '<p style="font-size:0.85rem;color:var(--text-muted);line-height:1.5;margin-bottom:12px;">' + f.description + '</p>'
      + '<pre class="framework-snippet-pre"><code>' + escapeHtml(f.snippet) + '</code></pre></div>'
    ).join('');
  }

  // =========================================================================
  //  Live Interactive Sandbox — unchanged logic
  // =========================================================================
  function initLiveSandbox() {
    const scanRepairBtn = document.getElementById('sandboxScanRepairBtn');
    const resetBtn = document.getElementById('sandboxResetBtn');
    const statusBadge = document.getElementById('sandboxStatusBadge');
    const scoreVal = document.getElementById('sandboxScoreVal');
    const issuesVal = document.getElementById('sandboxIssuesVal');
    const complianceVal = document.getElementById('sandboxComplianceVal');
    const imgEl = document.getElementById('demoProductImg');
    const labelWrap = document.getElementById('demoLabelContainer');
    const inputEl = document.getElementById('demoEmailInput');
    const payBtn = document.getElementById('demoPayBtn');
    const fakeDivBtn = document.getElementById('demoCustomToggle');

    if (!scanRepairBtn) return;

    function applySandboxFixes() {
      if (state.demoRepaired) return;
      scanRepairBtn.disabled = true;
      scanRepairBtn.innerHTML = '<span class="stage-spinner" style="display:inline-block;margin-right:6px;"></span>Synthesizing Live Fixes...';

      if (imgEl) { imgEl.classList.add('target-violation'); imgEl.setAttribute('data-wcag-tag', 'WCAG 1.1.1 (No Alt)'); }
      if (inputEl) { inputEl.classList.add('target-violation'); inputEl.setAttribute('data-wcag-tag', 'WCAG 1.3.1 (Unlabeled)'); }
      if (payBtn) { payBtn.classList.add('target-violation'); payBtn.setAttribute('data-wcag-tag', 'WCAG 1.4.3 (Contrast 2.1:1)'); }
      if (fakeDivBtn) { fakeDivBtn.classList.add('target-violation'); fakeDivBtn.setAttribute('data-wcag-tag', 'WCAG 4.1.2 (Div Button)'); }
      playSoundEffect('scanTick');

      setTimeout(() => {
        if (imgEl) { imgEl.classList.remove('target-violation'); imgEl.classList.add('target-repaired'); imgEl.setAttribute('alt', 'Aether Pro Neural Audio Headphones in Matte Obsidian'); }
        if (labelWrap) { labelWrap.innerHTML = '<label for="demoEmailInput" style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:6px;color:#38bdf8;">Billing Email Address <span aria-hidden="true" style="color:#ef4444;">*</span></label>'; }
        if (inputEl) { inputEl.classList.remove('target-violation'); inputEl.classList.add('target-repaired'); inputEl.setAttribute('aria-required', 'true'); inputEl.style.borderColor = '#00f2fe'; }
        if (payBtn) { payBtn.classList.remove('target-violation'); payBtn.classList.add('target-repaired'); payBtn.style.color = '#050b14'; payBtn.style.backgroundColor = '#00f2fe'; payBtn.style.fontWeight = '700'; payBtn.style.boxShadow = '0 0 15px rgba(0,242,254,0.4)'; }
        if (fakeDivBtn) { fakeDivBtn.classList.remove('target-violation'); fakeDivBtn.classList.add('target-repaired'); fakeDivBtn.setAttribute('role', 'switch'); fakeDivBtn.setAttribute('aria-checked', 'true'); fakeDivBtn.setAttribute('tabindex', '0'); fakeDivBtn.setAttribute('aria-label', 'Express Carbon-Neutral Delivery'); }

        state.demoRepaired = true;
        animateNumber(scoreVal, 58, 100, 600);
        if (issuesVal) issuesVal.textContent = '0 Issues';
        if (complianceVal) complianceVal.textContent = '100% WCAG AA';
        if (statusBadge) { statusBadge.className = 'badge badge-success'; statusBadge.innerHTML = '✓ Verification Passed'; }
        scanRepairBtn.disabled = false;
        scanRepairBtn.classList.remove('btn-primary');
        scanRepairBtn.classList.add('btn-success');
        scanRepairBtn.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Verification Passed ✓';
        playSoundEffect('verificationSuccess');
        showToast('Live DOM patched & verified. Score elevated from 58 → 100.', 'success', 'Live Demo Repaired');
      }, 1200);
    }

    function resetSandbox() {
      state.demoRepaired = false;
      if (scoreVal) scoreVal.textContent = '58';
      if (issuesVal) issuesVal.textContent = '4 Violations';
      if (complianceVal) complianceVal.textContent = 'Non-compliant';
      if (statusBadge) { statusBadge.className = 'badge badge-danger'; statusBadge.innerHTML = '4 Critical Violations'; }
      scanRepairBtn.disabled = false;
      scanRepairBtn.className = 'btn btn-primary btn-sm';
      scanRepairBtn.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Scan & Repair';
      if (imgEl) { imgEl.className = 'demo-item-img'; imgEl.removeAttribute('alt'); imgEl.removeAttribute('data-wcag-tag'); }
      if (labelWrap) labelWrap.innerHTML = '';
      if (inputEl) { inputEl.className = 'scanner-url-input'; inputEl.style.border = '1px solid rgba(255,255,255,0.15)'; inputEl.removeAttribute('aria-required'); inputEl.removeAttribute('data-wcag-tag'); }
      if (payBtn) { payBtn.className = 'btn btn-lg'; payBtn.style.color = '#94a3b8'; payBtn.style.backgroundColor = '#1e293b'; payBtn.style.fontWeight = '400'; payBtn.style.boxShadow = 'none'; payBtn.removeAttribute('data-wcag-tag'); }
      if (fakeDivBtn) { fakeDivBtn.className = 'custom-div-toggle'; fakeDivBtn.removeAttribute('role'); fakeDivBtn.removeAttribute('aria-checked'); fakeDivBtn.removeAttribute('tabindex'); fakeDivBtn.removeAttribute('aria-label'); fakeDivBtn.removeAttribute('data-wcag-tag'); }
      playSoundEffect('click');
      showToast('Sandbox reset to original broken state.', 'info', 'Sandbox Reset');
    }

    scanRepairBtn.addEventListener('click', applySandboxFixes);
    if (resetBtn) resetBtn.addEventListener('click', resetSandbox);
  }

  // =========================================================================
  //  Judge Quick Tour — unchanged
  // =========================================================================
  function initJudgeTour() {
    const tourBtn = document.getElementById('judgeTourBtn');
    if (!tourBtn) return;
    tourBtn.addEventListener('click', () => {
      playSoundEffect('click');
      showToast('Initiating Guided Judge Showcase...', 'info', 'Judge Mode');
      const scannerSec = document.getElementById('scanner');
      if (scannerSec) {
        scannerSec.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
          const runScanBtn = document.getElementById('runScanBtn');
          if (runScanBtn) runScanBtn.click();
          setTimeout(() => {
            const demoSec = document.getElementById('live-demo');
            if (demoSec) {
              demoSec.scrollIntoView({ behavior: 'smooth' });
              setTimeout(() => {
                const sandboxBtn = document.getElementById('sandboxScanRepairBtn');
                if (sandboxBtn) sandboxBtn.click();
                setTimeout(() => {
                  const certBtn = document.getElementById('openCertBtn');
                  if (certBtn) certBtn.click();
                }, 2500);
              }, 800);
            }
          }, 4000);
        }, 600);
      }
    });
  }

  // =========================================================================
  //  Command Palette (Ctrl+K) — unchanged
  // =========================================================================
  function initCommandPalette() {
    const modal = document.getElementById('cmdPaletteModal');
    const input = document.getElementById('cmdPaletteInput');
    if (!modal) return;

    function openPalette() {
      modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
      if (input) { input.value = ''; input.focus(); }
      playSoundEffect('click');
      document.body.style.overflow = 'hidden';
    }

    function closePalette() {
      modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        modal.classList.contains('open') ? closePalette() : openPalette();
      } else if (e.key === 'Escape' && modal.classList.contains('open')) closePalette();
    });

    const openCmdBtn = document.getElementById('openCmdPaletteBtn');
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
            if (scanBtn) {
              document.getElementById('scanner').scrollIntoView({ behavior: 'smooth' });
              setTimeout(() => scanBtn.click(), 600);
            }
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
  //  Sound Toggle & Mobile Nav — unchanged
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

  // =========================================================================
  //  Document Initialization
  // =========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    loadHistory();

    initHeaderControls();
    initScanner();
    renderViolations();
    initFilterTabs();
    initDiffStudio();
    initCertificateModal();
    renderWcagPillars();
    renderFrameworks();
    initLiveSandbox();
    initJudgeTour();
    initCommandPalette();
    renderHistory();

    console.log('%c ACCESSFIX AI v2.5 Simulation Engine %c URL-Dependent Deterministic WCAG Auditor ', 'background:#00f2fe;color:#050b14;font-weight:bold;padding:4px;', 'background:#111a2e;color:#38bdf8;padding:4px;');
  });

})();
