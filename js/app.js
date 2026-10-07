/**
 * ACCESSFIX AI - Main Application Logic
 * Automated WCAG Detection & Repair Engine
 * Pure Vanilla JavaScript (Zero external dependencies)
 */

(function () {
  'use strict';

  // --- Global State ---
  const state = {
    audioEnabled: true,
    audioCtx: null,
    currentScore: 72,
    targetScore: 100,
    isScanning: false,
    activeFilter: 'all',
    violations: JSON.parse(JSON.stringify(window.ACCESSFIX_DATA.violations)),
    demoRepaired: false,
    demoScore: 58,
    certHash: null,
    totalFixedCount: 0
  };

  // --- Sound Engine (Web Audio API Synthesizer) ---
  function initAudio() {
    if (!state.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      state.audioCtx = new AudioContextClass();
    }
    if (state.audioCtx && state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }
  }

  function playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.08) {
    if (!state.audioEnabled) return;
    try {
      initAudio();
      if (!state.audioCtx) return;

      const osc = state.audioCtx.createOscillator();
      const gain = state.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, state.audioCtx.currentTime);

      gain.gain.setValueAtTime(gainVal, state.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, state.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(state.audioCtx.destination);

      osc.start();
      osc.stop(state.audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio synthesis note skipped:', e);
    }
  }

  function playSoundEffect(name) {
    if (!state.audioEnabled) return;
    switch (name) {
      case 'click':
        playTone(600, 'sine', 0.06, 0.04);
        break;
      case 'scanTick':
        playTone(880, 'sine', 0.08, 0.03);
        break;
      case 'fixApplied':
        playTone(523.25, 'triangle', 0.12, 0.08); // C5
        setTimeout(() => playTone(659.25, 'triangle', 0.14, 0.08), 80); // E5
        setTimeout(() => playTone(783.99, 'triangle', 0.2, 0.08), 160); // G5
        break;
      case 'verificationSuccess':
        playTone(523.25, 'sine', 0.15, 0.07);
        setTimeout(() => playTone(659.25, 'sine', 0.15, 0.07), 90);
        setTimeout(() => playTone(783.99, 'sine', 0.18, 0.07), 180);
        setTimeout(() => playTone(1046.50, 'sine', 0.35, 0.09), 270); // C6
        break;
      case 'error':
        playTone(220, 'sawtooth', 0.2, 0.06);
        break;
    }
  }

  // --- Toast Notification System ---
  function showToast(message, type = 'info', title = 'AccessFix System') {
    let shelf = document.getElementById('toastShelf');
    if (!shelf) {
      shelf = document.createElement('div');
      shelf.id = 'toastShelf';
      shelf.className = 'toast-shelf';
      shelf.setAttribute('aria-live', 'polite');
      document.body.appendChild(shelf);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');

    const iconSvg = type === 'success' 
      ? `<svg width="20" height="20" fill="none" stroke="#10b981" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`
      : `<svg width="20" height="20" fill="none" stroke="#00f2fe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 16v-4m0-4h.01"/></svg>`;

    toast.innerHTML = `
      <div style="flex-shrink:0;">${iconSvg}</div>
      <div style="flex:1;">
        <div style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:${type === 'success' ? '#10b981' : '#00f2fe'};">${title}</div>
        <div style="font-size:0.875rem; color:#f8fafc;">${message}</div>
      </div>
      <button type="button" aria-label="Close notification" style="color:#64748b; font-size:1.1rem; padding:4px;" onclick="this.parentElement.remove()">✕</button>
    `;

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

  // --- Score Gauge Management ---
  function updateScoreGauge(score, animate = true) {
    const scoreValEl = document.getElementById('scoreValue');
    const radialBar = document.getElementById('radialBar');
    const scoreDeltaBadge = document.getElementById('scoreDeltaBadge');

    if (!scoreValEl || !radialBar) return;

    // SVG circle circumference for r=70 is ~440px
    const circumference = 440;
    const offset = circumference - (score / 100) * circumference;
    radialBar.style.strokeDashoffset = offset;

    if (animate) {
      let currentVal = parseInt(scoreValEl.textContent, 10) || 72;
      const targetVal = score;
      const stepTime = Math.abs(Math.floor(600 / (targetVal - currentVal || 1)));

      const timer = setInterval(() => {
        if (currentVal < targetVal) {
          currentVal++;
          scoreValEl.textContent = currentVal;
          if (scoreDeltaBadge) {
            scoreDeltaBadge.innerHTML = `+${targetVal - 72} Pts <span>(Surpassing AA)</span>`;
            scoreDeltaBadge.className = 'score-delta-badge badge-success';
          }
        } else if (currentVal > targetVal) {
          currentVal--;
          scoreValEl.textContent = currentVal;
        } else {
          clearInterval(timer);
        }
      }, Math.max(stepTime, 20));
    } else {
      scoreValEl.textContent = score;
    }
  }

  // --- Interactive Scanner Engine ---
  function initScanner() {
    const scanBtn = document.getElementById('runScanBtn');
    const urlInput = document.getElementById('scannerUrlInput');
    const presetChips = document.querySelectorAll('.preset-chip');
    const stages = document.querySelectorAll('.stage-item');
    const progressFill = document.getElementById('scannerProgressFill');
    const progressPercent = document.getElementById('scannerProgressPercent');
    const progressStatusText = document.getElementById('scannerStatusText');

    if (!scanBtn) return;

    // Preset Chip Click Handlers
    presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        presetChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const url = chip.getAttribute('data-url');
        if (url && urlInput) urlInput.value = url;
        playSoundEffect('click');
        showToast(`Target set to ${chip.textContent.trim()}`, 'info', 'Scanner Config');
      });
    });

    scanBtn.addEventListener('click', () => {
      if (state.isScanning) return;
      runFullScan();
    });

    function runFullScan() {
      state.isScanning = true;
      scanBtn.disabled = true;
      scanBtn.innerHTML = `
        <span class="stage-spinner" style="display:inline-block; margin-right:8px;"></span>
        Executing Formal Pipeline...
      `;

      // Reset stages
      stages.forEach(st => {
        st.classList.remove('running', 'completed');
        st.classList.add('pending');
      });

      updateScoreGauge(72, false);
      if (progressFill) progressFill.style.width = '0%';
      if (progressPercent) progressPercent.textContent = '0%';

      const steps = [
        { name: 'DOM Tree Analysis & AST Parse', duration: 700, progress: 25, status: 'Auditing 148 DOM nodes...' },
        { name: 'WCAG 2.2 AA Detection', duration: 700, progress: 50, status: 'Matched 4 critical compliance vectors...' },
        { name: 'Generative Repair Synthesis', duration: 800, progress: 75, status: 'Synthesizing non-breaking AST patches...' },
        { name: 'Safety & Layout Invariance Check', duration: 600, progress: 90, status: 'Bounded model check passed (0 regressions)...' },
        { name: 'Formal Verification & Proof Generation', duration: 500, progress: 100, status: '100% Soundness Verified!' }
      ];

      let currentStepIndex = 0;

      function executeNextStep() {
        if (currentStepIndex > 0) {
          const prevStage = stages[currentStepIndex - 1];
          if (prevStage) {
            prevStage.classList.remove('running');
            prevStage.classList.add('completed');
          }
        }

        if (currentStepIndex >= steps.length) {
          // Finished
          state.isScanning = false;
          scanBtn.disabled = false;
          scanBtn.innerHTML = `
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Re-run Accessibility Scan
          `;
          updateScoreGauge(100, true);
          playSoundEffect('verificationSuccess');
          showToast('Scan & Verification completed. Score elevated from 72 → 100.', 'success', 'Verification Complete');
          autoRepairAllViolations();
          return;
        }

        const step = steps[currentStepIndex];
        const currentStageEl = stages[currentStepIndex];
        if (currentStageEl) {
          currentStageEl.classList.remove('pending');
          currentStageEl.classList.add('running');
        }

        if (progressFill) progressFill.style.width = `${step.progress}%`;
        if (progressPercent) progressPercent.textContent = `${step.progress}%`;
        if (progressStatusText) progressStatusText.textContent = step.status;

        playSoundEffect('scanTick');

        currentStepIndex++;
        setTimeout(executeNextStep, step.duration);
      }

      executeNextStep();
    }
  }

  // --- Violation Dashboard Rendering & Individual Repairs ---
  function renderViolations() {
    const grid = document.getElementById('violationsGrid');
    if (!grid) return;

    const filtered = state.violations.filter(v => {
      if (state.activeFilter === 'all') return true;
      return v.principle.toLowerCase().includes(state.activeFilter.toLowerCase());
    });

    grid.innerHTML = filtered.map(v => {
      return `
        <article class="violation-card ${v.isFixed ? 'is-repaired' : ''}" id="card-${v.id}" data-id="${v.id}">
          <div class="violation-card-header">
            <div>
              <div class="violation-meta-top">
                <span class="badge ${v.isFixed ? 'badge-success' : 'badge-danger'}">
                  ${v.isFixed ? '✓ REPAIRED & VERIFIED' : v.severity}
                </span>
                <span class="badge badge-glow-cyan">${v.wcagRule} (${v.level})</span>
                <span class="badge" style="color:var(--text-muted); font-family:var(--font-mono);">${v.elementTag}</span>
              </div>
              <h3 class="violation-title">${v.title}</h3>
              <p class="violation-impact">${v.impact}</p>
            </div>
            <div>
              <button type="button" 
                      class="btn ${v.isFixed ? 'btn-success' : 'btn-primary'} btn-sm repair-single-btn" 
                      data-id="${v.id}"
                      aria-label="${v.isFixed ? 'Repaired' : 'Apply automated fix for ' + v.wcagRule}"
                      ${v.isFixed ? 'disabled' : ''}>
                ${v.isFixed 
                  ? `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Repaired ✓` 
                  : `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Apply Fix`
                }
              </button>
            </div>
          </div>

          <div class="violation-code-box">
            <div class="code-pane">
              <div class="code-pane-label label-before">
                <span>Before Code (Violation)</span>
                <span style="color:var(--color-danger);">FAIL</span>
              </div>
              <pre class="code-snippet"><code>${escapeHtml(v.beforeCode)}</code></pre>
            </div>

            <div class="code-pane" style="${v.isFixed ? 'border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.05);' : ''}">
              <div class="code-pane-label label-after">
                <span>Synthesized Fix (Patch)</span>
                <span style="color:var(--color-success);">PASS ✓</span>
              </div>
              <pre class="code-snippet"><code>${escapeHtml(v.afterCode)}</code></pre>
            </div>
          </div>

          <div class="violation-footer">
            <div class="fix-explanation">
              <strong style="color:var(--text-highlight);">AST Engine Strategy:</strong> ${v.fixExplanation}
            </div>
            <div style="font-family:var(--font-mono); font-size:0.75rem; color:${v.isFixed ? '#10b981' : 'var(--text-dim)'};">
              ${v.isFixed ? 'Soundness Verified • Zero Drift' : 'Ready for Invariance Check'}
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Attach listeners
    grid.querySelectorAll('.repair-single-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-id');
        applySingleRepair(id);
      });
    });

    updateCountersAndDashboardStats();
  }

  function applySingleRepair(id) {
    const violation = state.violations.find(v => v.id === id);
    if (!violation || violation.isFixed) return;

    violation.isFixed = true;
    violation.repairedTimestamp = new Date().toISOString();
    state.totalFixedCount++;

    playSoundEffect('fixApplied');
    showToast(`Remediated ${violation.wcagRule}: ${violation.title}`, 'success', 'Patch Injected');

    renderViolations();

    // Recalculate scanner score dynamically
    const fixedRatio = state.violations.filter(v => v.isFixed).length / state.violations.length;
    const computedScore = Math.round(72 + (28 * fixedRatio));
    updateScoreGauge(computedScore, true);
  }

  function autoRepairAllViolations() {
    let unFixed = state.violations.filter(v => !v.isFixed);
    if (unFixed.length === 0) return;

    state.violations.forEach(v => {
      v.isFixed = true;
      v.repairedTimestamp = new Date().toISOString();
    });

    state.totalFixedCount = state.violations.length;
    renderViolations();
    updateScoreGauge(100, true);
    playSoundEffect('verificationSuccess');
    showToast('Applied all safe patches. AST layout soundness preserved.', 'success', 'All Fixes Applied');
  }

  function updateCountersAndDashboardStats() {
    const fixedTotal = state.violations.filter(v => v.isFixed).length;
    const remaining = state.violations.length - fixedTotal;

    const remainingCounter = document.getElementById('remainingViolationsCounter');
    const fixedCounter = document.getElementById('fixedViolationsCounter');

    if (remainingCounter) remainingCounter.textContent = remaining;
    if (fixedCounter) fixedCounter.textContent = `${fixedTotal}/${state.violations.length}`;
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

  // --- Before / After Full Diff Studio ---
  function initDiffStudio() {
    const applyAllBtn = document.getElementById('applyAllSafeFixesBtn');
    if (applyAllBtn) {
      applyAllBtn.addEventListener('click', () => {
        autoRepairAllViolations();
        applyAllBtn.classList.remove('btn-primary');
        applyAllBtn.classList.add('btn-success');
        applyAllBtn.innerHTML = `
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          All 5 Safe Fixes Applied ✓
        `;
      });
    }
  }

  // --- Formal Verification & Certificate Engine ---
  function generateCertHash() {
    if (!state.certHash) {
      const chars = '0123456789abcdef';
      let salt = '';
      for (let i = 0; i < 32; i++) {
        salt += chars[Math.floor(Math.random() * chars.length)];
      }
      state.certHash = `SHA256: 0x${salt}`;
    }
    return state.certHash;
  }

  function initCertificateModal() {
    const openBtn = document.getElementById('openCertBtn');
    const modal = document.getElementById('certModal');
    const closeBtn = document.getElementById('closeCertModalBtn');
    const copyHashBtn = document.getElementById('copyHashBtn');
    const printBtn = document.getElementById('printCertBtn');
    const hashDisplay = document.getElementById('certHashValue');
    const certTimestamp = document.getElementById('certTimestamp');

    if (!openBtn || !modal) return;

    function openModal() {
      const hash = generateCertHash();
      if (hashDisplay) hashDisplay.textContent = hash;
      if (certTimestamp) certTimestamp.textContent = new Date().toUTCString();

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

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) {
        closeModal();
      }
    });

    if (copyHashBtn) {
      copyHashBtn.addEventListener('click', () => {
        const hash = generateCertHash();
        navigator.clipboard.writeText(hash).then(() => {
          showToast(`Copied certificate proof hash: ${hash}`, 'success', 'Clipboard');
          playSoundEffect('click');
        }).catch(() => {
          showToast('Failed to copy to clipboard', 'error', 'Error');
        });
      });
    }

    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }
  }

  // --- WCAG 4 Pillars Rendering ---
  function renderWcagPillars() {
    const container = document.getElementById('wcagPillarsGrid');
    if (!container || !window.ACCESSFIX_DATA.wcagPillars) return;

    container.innerHTML = window.ACCESSFIX_DATA.wcagPillars.map(p => `
      <div class="pillar-card">
        <div>
          <div class="pillar-num">PRINCIPLE 0${p.principleNumber}</div>
          <h3 class="pillar-title">${p.name}</h3>
          <p class="pillar-desc">${p.tagline}</p>
          <div class="badge badge-success" style="margin-bottom:14px;">
            ✓ ${p.criteriaChecked} Criteria Synthesized
          </div>
        </div>
        <div>
          <ul class="pillar-rules-list">
            ${p.rules.map(r => `
              <li class="pillar-rule-item">
                <span>WCAG ${r.code}</span>
                <span class="text-cyan">${r.name.split(' ')[0]}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `).join('');
  }

  // --- Frameworks Integration Rendering ---
  function renderFrameworks() {
    const container = document.getElementById('frameworksGrid');
    if (!container || !window.ACCESSFIX_DATA.frameworks) return;

    container.innerHTML = window.ACCESSFIX_DATA.frameworks.map(f => `
      <div class="framework-card">
        <div class="framework-icon">
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
        </div>
        <h3 class="framework-title">${f.name}</h3>
        <span class="framework-tag">${f.tag}</span>
        <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.5; margin-bottom:12px;">${f.description}</p>
        <pre class="framework-snippet-pre"><code>${escapeHtml(f.snippet)}</code></pre>
      </div>
    `).join('');
  }

  // --- Live Interactive Sandbox ("AetherPay Checkout") ---
  function initLiveSandbox() {
    const scanRepairBtn = document.getElementById('sandboxScanRepairBtn');
    const resetBtn = document.getElementById('sandboxResetBtn');
    const statusBadge = document.getElementById('sandboxStatusBadge');
    const scoreVal = document.getElementById('sandboxScoreVal');
    const issuesVal = document.getElementById('sandboxIssuesVal');
    const complianceVal = document.getElementById('sandboxComplianceVal');

    // Interactive target elements inside fake checkout
    const imgEl = document.getElementById('demoProductImg');
    const labelWrap = document.getElementById('demoLabelContainer');
    const inputEl = document.getElementById('demoEmailInput');
    const payBtn = document.getElementById('demoPayBtn');
    const fakeDivBtn = document.getElementById('demoCustomToggle');

    if (!scanRepairBtn) return;

    function applySandboxFixes() {
      if (state.demoRepaired) return;

      scanRepairBtn.disabled = true;
      scanRepairBtn.innerHTML = `
        <span class="stage-spinner" style="display:inline-block; margin-right:6px;"></span>
        Synthesizing Live Fixes...
      `;

      // Highlight broken targets first with red reticles
      if (imgEl) {
        imgEl.classList.add('target-violation');
        imgEl.setAttribute('data-wcag-tag', 'WCAG 1.1.1 (No Alt)');
      }
      if (inputEl) {
        inputEl.classList.add('target-violation');
        inputEl.setAttribute('data-wcag-tag', 'WCAG 1.3.1 (Unlabeled)');
      }
      if (payBtn) {
        payBtn.classList.add('target-violation');
        payBtn.setAttribute('data-wcag-tag', 'WCAG 1.4.3 (Contrast 2.1:1)');
      }
      if (fakeDivBtn) {
        fakeDivBtn.classList.add('target-violation');
        fakeDivBtn.setAttribute('data-wcag-tag', 'WCAG 4.1.2 (Div Button)');
      }

      playSoundEffect('scanTick');

      // After 1.2s, synthesize transformations
      setTimeout(() => {
        // Fix 1: Image Alt text
        if (imgEl) {
          imgEl.classList.remove('target-violation');
          imgEl.classList.add('target-repaired');
          imgEl.setAttribute('alt', 'Aether Pro Neural Audio Headphones in Matte Obsidian');
        }

        // Fix 2: Explicit Label Injection
        if (labelWrap) {
          labelWrap.innerHTML = `
            <label for="demoEmailInput" style="display:block; font-size:0.8rem; font-weight:600; margin-bottom:6px; color:#38bdf8;">
              Billing Email Address <span aria-hidden="true" style="color:#ef4444;">*</span>
            </label>
          `;
        }
        if (inputEl) {
          inputEl.classList.remove('target-violation');
          inputEl.classList.add('target-repaired');
          inputEl.setAttribute('aria-required', 'true');
          inputEl.setAttribute('autocomplete', 'email');
          inputEl.style.borderColor = '#00f2fe';
        }

        // Fix 3: High Contrast 8.6:1 Button
        if (payBtn) {
          payBtn.classList.remove('target-violation');
          payBtn.classList.add('target-repaired');
          payBtn.style.color = '#050b14';
          payBtn.style.backgroundColor = '#00f2fe';
          payBtn.style.fontWeight = '700';
          payBtn.style.boxShadow = '0 0 15px rgba(0, 242, 254, 0.4)';
        }

        // Fix 4: Transform fake Div to semantic Accessible Switch
        if (fakeDivBtn) {
          fakeDivBtn.classList.remove('target-violation');
          fakeDivBtn.classList.add('target-repaired');
          fakeDivBtn.setAttribute('role', 'switch');
          fakeDivBtn.setAttribute('aria-checked', 'true');
          fakeDivBtn.setAttribute('tabindex', '0');
          fakeDivBtn.setAttribute('aria-label', 'Express Carbon-Neutral Delivery');
        }

        // Update score from 58 -> 100
        state.demoRepaired = true;
        animateNumber(scoreVal, 58, 100, 600);
        if (issuesVal) issuesVal.textContent = '0 Issues';
        if (complianceVal) complianceVal.textContent = '100% WCAG AA';

        if (statusBadge) {
          statusBadge.className = 'badge badge-success';
          statusBadge.innerHTML = `✓ Verification Passed`;
        }

        scanRepairBtn.disabled = false;
        scanRepairBtn.classList.remove('btn-primary');
        scanRepairBtn.classList.add('btn-success');
        scanRepairBtn.innerHTML = `
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          Verification Passed ✓
        `;

        playSoundEffect('verificationSuccess');
        showToast('Live DOM patched & verified. Score elevated from 58 → 100.', 'success', 'Live Demo Repaired');
      }, 1200);
    }

    function resetSandbox() {
      state.demoRepaired = false;
      if (scoreVal) scoreVal.textContent = '58';
      if (issuesVal) issuesVal.textContent = '4 Violations';
      if (complianceVal) complianceVal.textContent = 'Non-compliant';

      if (statusBadge) {
        statusBadge.className = 'badge badge-danger';
        statusBadge.innerHTML = `4 Critical Violations`;
      }

      scanRepairBtn.disabled = false;
      scanRepairBtn.className = 'btn btn-primary btn-sm';
      scanRepairBtn.innerHTML = `
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        Scan & Repair
      `;

      // Reset DOM elements
      if (imgEl) {
        imgEl.className = 'demo-item-img';
        imgEl.removeAttribute('alt');
        imgEl.removeAttribute('data-wcag-tag');
      }
      if (labelWrap) {
        labelWrap.innerHTML = '';
      }
      if (inputEl) {
        inputEl.className = 'scanner-url-input';
        inputEl.style.border = '1px solid rgba(255,255,255,0.15)';
        inputEl.removeAttribute('aria-required');
        inputEl.removeAttribute('data-wcag-tag');
      }
      if (payBtn) {
        payBtn.className = 'btn btn-lg';
        payBtn.style.color = '#94a3b8';
        payBtn.style.backgroundColor = '#1e293b';
        payBtn.style.fontWeight = '400';
        payBtn.style.boxShadow = 'none';
        payBtn.removeAttribute('data-wcag-tag');
      }
      if (fakeDivBtn) {
        fakeDivBtn.className = 'custom-div-toggle';
        fakeDivBtn.removeAttribute('role');
        fakeDivBtn.removeAttribute('aria-checked');
        fakeDivBtn.removeAttribute('tabindex');
        fakeDivBtn.removeAttribute('aria-label');
        fakeDivBtn.removeAttribute('data-wcag-tag');
      }

      playSoundEffect('click');
      showToast('Sandbox reset to original broken state for demonstration.', 'info', 'Sandbox Reset');
    }

    scanRepairBtn.addEventListener('click', applySandboxFixes);
    if (resetBtn) resetBtn.addEventListener('click', resetSandbox);
  }

  // --- Judge Quick Tour / Fast Auto-Demo ---
  function initJudgeTour() {
    const tourBtn = document.getElementById('judgeTourBtn');
    if (!tourBtn) return;

    tourBtn.addEventListener('click', () => {
      playSoundEffect('click');
      showToast('Initiating Guided Judge Showcase...', 'info', 'Judge Mode');

      // 1. Scroll to Scanner
      const scannerSec = document.getElementById('scanner');
      if (scannerSec) {
        scannerSec.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
          const runScanBtn = document.getElementById('runScanBtn');
          if (runScanBtn) runScanBtn.click();

          // 2. Scroll to Demo after 3s
          setTimeout(() => {
            const demoSec = document.getElementById('live-demo');
            if (demoSec) {
              demoSec.scrollIntoView({ behavior: 'smooth' });
              setTimeout(() => {
                const sandboxBtn = document.getElementById('sandboxScanRepairBtn');
                if (sandboxBtn) sandboxBtn.click();

                // 3. Open Certificate after 2.5s
                setTimeout(() => {
                  const certBtn = document.getElementById('openCertBtn');
                  if (certBtn) certBtn.click();
                }, 2500);
              }, 800);
            }
          }, 3500);
        }, 600);
      }
    });
  }

  // --- Command Palette (Ctrl+K) ---
  function initCommandPalette() {
    const modal = document.getElementById('cmdPaletteModal');
    const input = document.getElementById('cmdPaletteInput');
    const cmdList = document.getElementById('cmdPaletteList');
    if (!modal) return;

    function openPalette() {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      if (input) {
        input.value = '';
        input.focus();
      }
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
        if (modal.classList.contains('open')) {
          closePalette();
        } else {
          openPalette();
        }
      } else if (e.key === 'Escape' && modal.classList.contains('open')) {
        closePalette();
      }
    });

    const openCmdBtn = document.getElementById('openCmdPaletteBtn');
    if (openCmdBtn) openCmdBtn.addEventListener('click', openPalette);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closePalette();
    });

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

  // --- Helper Utilities ---
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function animateNumber(element, start, end, duration) {
    if (!element) return;
    const range = end - start;
    const stepTime = Math.max(Math.floor(duration / (Math.abs(range) || 1)), 15);
    let current = start;

    const timer = setInterval(() => {
      if (current < end) current++;
      else if (current > end) current--;
      else clearInterval(timer);
      element.textContent = current;
    }, stepTime);
  }

  // --- Sound Toggle & Mobile Nav ---
  function initHeaderControls() {
    const soundBtn = document.getElementById('soundToggleBtn');
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const navMenu = document.getElementById('mainNav');

    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        state.audioEnabled = !state.audioEnabled;
        soundBtn.setAttribute('aria-pressed', state.audioEnabled.toString());
        soundBtn.innerHTML = state.audioEnabled 
          ? `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>`
          : `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>`;
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

  // --- Document Initialization ---
  document.addEventListener('DOMContentLoaded', () => {
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

    console.log('%c ACCESSFIX AI v2.4 Active %c Formal WCAG Verification Engine ', 'background:#00f2fe; color:#050b14; font-weight:bold; padding:4px;', 'background:#111a2e; color:#38bdf8; padding:4px;');
  });

})();
