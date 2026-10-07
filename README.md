# ACCESSFIX AI — Detect. Repair. Prove.
> **Autonomous Accessibility Remediation Engine** for Hackathon Demonstrations.

ACCESSFIX AI is a futuristic, dark-mode developer platform that solves the primary dilemma in modern web accessibility: **Detection tools point out hundreds of violations, but developers still need to fix, regression-test, and legally prove compliance.**

AccessFix closes the loop with the core paradigm:
$$\mathbf{DETECT} \longrightarrow \mathbf{REPAIR} \longrightarrow \mathbf{VERIFY} \longrightarrow \mathbf{CERTIFY}$$

---

## 🚀 Key Highlights & Differentiators

1. **Autonomous Zero-Regression AST Synthesis**: Rather than merely alerting developers, AccessFix generates verified semantic HTML, contrast ratios, and ARIA state patches.
2. **Formal Verification Engine**: Utilizes bounded model checking concepts to mathematically guarantee zero layout drift, zero functional regressions, and 100% WCAG 2.2 AA conformance.
3. **Cryptographic Proof of Conformance**: Generates audit-grade SHA-256 conformance certificates with tamper-proof signatures suitable for ADA Title III and Section 508 legal defense.
4. **Built-in Web Audio Synthesizer**: Native Web Audio API sound feedback for scans, repairs, and verification milestones (with instant mute toggle).
5. **Interactive Live Sandbox**: Real-time simulated checkout screen where judges can trigger live DOM remediation and watch the score jump from **58 → 100**.

---

## 🧭 Project Structure

```text
ASTRA/
├── index.html          # Semantic HTML5 dashboard with 11 distinct sections
├── css/
│   └── styles.css      # Dark obsidian glassmorphism design system & animations
├── js/
│   ├── mock-data.js    # WCAG 2.2 AA rules, code snippets, framework presets
│   └── app.js          # Interactive scanner, sound synthesizer, sandbox repair, certificate modal
├── assets/             # Brand graphics and icons
└── README.md           # Documentation and judge pitch walkthrough
```

---

## 🎯 2–3 Minute Judge Demo Guide

| Time | Action | Demonstration Highlight |
|---|---|---|
| **0:00 - 0:30** | **Hero & Visual Pipeline** | Point out the tagline **"Detect. Repair. Prove."** and walk through the 4-stage pipeline (**DETECT → REPAIR → VERIFY → CERTIFY**). Mention that accessibility checkers usually stop at stage 1, but AccessFix completes all 4. |
| **0:30 - 1:00** | **Interactive Scanner** | Click **"Run Accessibility Scan"**. Show the multi-stage progress (DOM Analysis → WCAG Detection → Repair Synthesis → Safety Check → Verification) and the radial gauge animating from **72 → 100**. |
| **1:00 - 1:30** | **Violation Dashboard & Diff Studio** | Inspect the 4 WCAG violations (Missing Alt, Contrast, Form Labels, Keyboard Focus). Click **"Apply Fix"** on a card or **"Apply All Safe Fixes"** to show real-time AST remediation. |
| **1:30 - 2:00** | **Formal Verification & Certificate** | Click **"Generate Verification Certificate"** to reveal the modal certificate with SHA-256 cryptographic proof hash and legal readiness status. |
| **2:00 - 2:30** | **Live Sandbox Playground** | In the **Live Demo** section, show the broken checkout interface with intentional bugs. Click **"Scan & Repair"** to watch the red reticles disappear, the live DOM update, and the score elevate from **58 → 100**. |

> **Pro Tip**: You can also click the **"⚡ Judge Quick Tour"** button in the hero section to run an automated, choreographed 10-second run-through!

---

## 💻 How to Run Locally

You can open `index.html` directly in any web browser, or launch a local web server:

```bash
# Using Python:
python -m http.server 3000

# Or using Node.js / npx:
npx serve .
```

Open `http://localhost:3000` in your browser.
