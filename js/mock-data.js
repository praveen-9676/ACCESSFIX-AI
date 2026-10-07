/**
 * ACCESSFIX AI - Mock Data & Configuration
 * Automated WCAG Detection & Repair Engine
 */

window.ACCESSFIX_DATA = {
  version: "2.4.0-verified",
  buildDate: "2026-10-07",
  
  // Pipeline Stage Definitions
  pipelineStages: [
    {
      id: "detect",
      title: "DETECT",
      stepNumber: "01",
      subtitle: "Autonomous AST & DOM Audit",
      description: "Deep tree traversal maps element hierarchies against 50+ WCAG 2.2 AA success criteria in under 120ms.",
      icon: "radar",
      badge: "Real-time Static + Runtime"
    },
    {
      id: "repair",
      title: "REPAIR",
      stepNumber: "02",
      subtitle: "Zero-Regression Code Synthesis",
      description: "Generative accessibility compiler injects verified ARIA states, calculates contrast ratios, and synthesizes labels.",
      icon: "sparkles",
      badge: "Non-Breaking Patches"
    },
    {
      id: "verify",
      title: "VERIFY",
      stepNumber: "03",
      subtitle: "Bounded Model Checking",
      description: "Formal verification engine guarantees soundness: no broken layouts, no regressions, 100% tree preservation.",
      icon: "shield-check",
      badge: "Mathematical Soundness"
    },
    {
      id: "certify",
      title: "CERTIFY",
      stepNumber: "04",
      subtitle: "Cryptographic Proof Artifact",
      description: "Generates an immutable, timestamped SHA-256 certificate proving compliance for legal, audit, and enterprise review.",
      icon: "award",
      badge: "Audit-Ready Proof"
    }
  ],

  // Preset Scanner Targets
  sampleTargets: [
    {
      url: "https://shop-checkout.aetherpay.io",
      label: "E-Commerce Checkout (AetherPay)",
      initialScore: 68,
      violationsCount: 5,
      type: "High-Traffic Retail"
    },
    {
      url: "https://saas-dashboard.stellarcloud.net",
      label: "Enterprise Cloud Dashboard",
      initialScore: 74,
      violationsCount: 4,
      type: "SaaS Application"
    },
    {
      url: "https://civic-portal.metro-city.gov",
      label: "Public Civic Portal (Section 508)",
      initialScore: 62,
      violationsCount: 6,
      type: "Government & Civic"
    },
    {
      url: "https://example.com",
      label: "Standard Test URL",
      initialScore: 72,
      violationsCount: 4,
      type: "Generic Benchmark"
    }
  ],

  // Core WCAG Violations Data
  violations: [
    {
      id: "v-1",
      wcagRule: "WCAG 1.1.1",
      level: "Level A",
      principle: "Perceivable",
      title: "Missing Image Alternative Text",
      elementTag: "img.hero-avatar",
      severity: "CRITICAL",
      severityClass: "severity-critical",
      impact: "Screen reader users perceive image as an unannounced graphic or raw file name.",
      beforeCode: `<img src="/assets/avatars/founder.png" \n     class="hero-avatar" />`,
      afterCode: `<img src="/assets/avatars/founder.png" \n     class="hero-avatar" \n     alt="Portrait of founder Elena Vance speaking at TechSummit" \n     loading="lazy" />`,
      fixExplanation: "Synthesized contextual alt description from parent caption and visual metadata. Zero DOM layout shift.",
      diffHighlight: {
        added: '+ alt="Portrait of founder Elena Vance speaking at TechSummit"\n+ loading="lazy"',
        removed: ''
      },
      isFixed: false,
      repairedTimestamp: null
    },
    {
      id: "v-2",
      wcagRule: "WCAG 1.4.3",
      level: "Level AA",
      principle: "Perceivable",
      title: "Insufficient Color Contrast Ratio",
      elementTag: "button.btn-primary",
      severity: "HIGH",
      severityClass: "severity-high",
      impact: "Current ratio 2.14:1 fails minimum 4.5:1 threshold; unreadable for low-vision users.",
      beforeCode: `<button class="btn-primary" \n        style="color: #94a3b8; background-color: #f1f5f9;">\n  Complete Transaction\n</button>`,
      afterCode: `<button class="btn-primary" \n        style="color: #0f172a; background-color: #00f2fe; font-weight: 600;">\n  Complete Transaction\n</button>`,
      fixExplanation: "Adjusted foreground/background luminance vector. Contrast boosted from 2.14:1 to 8.65:1 (surpassing AAA).",
      diffHighlight: {
        added: '+ style="color: #0f172a; background-color: #00f2fe; font-weight: 600;"',
        removed: '- style="color: #94a3b8; background-color: #f1f5f9;"'
      },
      isFixed: false,
      repairedTimestamp: null
    },
    {
      id: "v-3",
      wcagRule: "WCAG 1.3.1",
      level: "Level A",
      principle: "Perceivable / Understandable",
      title: "Unassociated Form Input Label",
      elementTag: "input#billing-email",
      severity: "CRITICAL",
      severityClass: "severity-critical",
      impact: "Input relies exclusively on placeholder text; screen readers lose context upon value entry.",
      beforeCode: `<div class="form-group">\n  <input type="email" id="billing-email" \n         placeholder="Enter work email" />\n</div>`,
      afterCode: `<div class="form-group">\n  <label for="billing-email" class="form-label">\n    Work Email Address <span aria-hidden="true">*</span>\n  </label>\n  <input type="email" id="billing-email" \n         aria-required="true" \n         aria-describedby="email-hint" \n         placeholder="name@company.com" />\n  <span id="email-hint" class="sr-hint">Used for receipt verification</span>\n</div>`,
      fixExplanation: "Injected explicit <label> element with matching 'for' attribute and added aria-required / aria-describedby associations.",
      diffHighlight: {
        added: '+ <label for="billing-email" class="form-label">Work Email Address</label>\n+ aria-required="true"\n+ aria-describedby="email-hint"',
        removed: ''
      },
      isFixed: false,
      repairedTimestamp: null
    },
    {
      id: "v-4",
      wcagRule: "WCAG 2.4.7",
      level: "Level AA",
      principle: "Operable",
      title: "Missing Keyboard Focus Indicator",
      elementTag: "a.nav-link, button.tab-action",
      severity: "HIGH",
      severityClass: "severity-high",
      impact: "Global CSS style 'outline: none' prevents keyboard-only users from tracking focus position.",
      beforeCode: `/* Defective CSS */\n.nav-link:focus, .tab-action:focus {\n  outline: none;\n  box-shadow: none;\n}`,
      afterCode: `/* Verified Accessible CSS */\n.nav-link:focus-visible, .tab-action:focus-visible {\n  outline: 2px solid #00f2fe;\n  outline-offset: 3px;\n  box-shadow: 0 0 12px rgba(0, 242, 254, 0.45);\n  transition: outline-offset 0.15s ease;\n}`,
      fixExplanation: "Synthesized :focus-visible rules with high-contrast dual-layer rings (contrast 6.2:1 against dark backgrounds).",
      diffHighlight: {
        added: '+ :focus-visible { outline: 2px solid #00f2fe; outline-offset: 3px; }',
        removed: '- :focus { outline: none; box-shadow: none; }'
      },
      isFixed: false,
      repairedTimestamp: null
    },
    {
      id: "v-5",
      wcagRule: "WCAG 4.1.2",
      level: "Level A",
      principle: "Robust",
      title: "Interactive Div Lacking ARIA Role & Key Handlers",
      elementTag: "div.custom-toggle",
      severity: "MEDIUM",
      severityClass: "severity-medium",
      impact: "Simulated switch button created with <div> cannot be triggered via Space or Enter keys.",
      beforeCode: `<div class="custom-toggle" onclick="toggleMute()">\n  <svg class="icon-mic">...</svg>\n</div>`,
      afterCode: `<button type="button" class="custom-toggle" \n        role="switch" \n        aria-checked="false" \n        aria-label="Mute microphone audio feed" \n        onclick="toggleMute()">\n  <svg aria-hidden="true" class="icon-mic">...</svg>\n</button>`,
      fixExplanation: "Transformed synthetic div into semantic <button> with role='switch', aria-checked, and accessible name.",
      diffHighlight: {
        added: '+ <button type="button" role="switch" aria-checked="false" aria-label="Mute microphone audio feed">',
        removed: '- <div class="custom-toggle" onclick="toggleMute()">'
      },
      isFixed: false,
      repairedTimestamp: null
    }
  ],

  // Comprehensive Before / After Full Code Snippet
  fullCodeComparison: {
    inaccessible: `<!-- Inaccessible Raw Template (score: 58/100) -->
<header class="navbar">
  <div class="logo-box" onclick="navigateHome()">
    <img src="/logo.svg">
  </div>
  <nav>
    <a href="#features" style="outline: none;">Features</a>
    <a href="#pricing" style="outline: none;">Pricing</a>
  </nav>
</header>

<main>
  <section class="checkout-card">
    <h2>Secure Payment</h2>
    <img src="/card-banner.png">
    
    <div class="input-wrap">
      <input type="text" placeholder="Cardholder Name">
      <input type="text" placeholder="Card Number">
    </div>

    <!-- Defective Contrast & Missing Focus -->
    <button class="pay-btn" style="color: #8892b0; background: #0a192f; outline: none;">
      Authorize $149.00
    </button>
  </section>
</main>`,

    accessible: `<!-- Formally Verified AccessFix Patch (score: 100/100) -->
<header class="navbar" role="banner">
  <!-- Semantic Interactive Anchor with Alt -->
  <a href="/" class="logo-box" aria-label="AccessFix Homepage">
    <img src="/logo.svg" alt="AccessFix Brand Logo" width="120" height="32" />
  </a>
  <nav aria-label="Primary Navigation">
    <a href="#features" class="focus-ring">Features</a>
    <a href="#pricing" class="focus-ring">Pricing</a>
  </nav>
</header>

<main id="main-content" role="main">
  <section class="checkout-card" aria-labelledby="pay-title">
    <h2 id="pay-title">Secure Payment</h2>
    <img src="/card-banner.png" alt="Accepted Payment Methods: Visa, MasterCard, Amex" />
    
    <div class="input-wrap">
      <label for="card-holder" class="visually-hidden">Cardholder Name</label>
      <input id="card-holder" type="text" autocomplete="cc-name" required aria-required="true" placeholder="Cardholder Name" />

      <label for="card-number" class="visually-hidden">Card Number</label>
      <input id="card-number" type="text" autocomplete="cc-number" required aria-required="true" placeholder="Card Number" />
    </div>

    <!-- WCAG AAA Compliant 8.4:1 Contrast & Accessible Focus -->
    <button class="pay-btn focus-ring" style="color: #050b14; background: #00f2fe; font-weight: 700;">
      Authorize $149.00
    </button>
  </section>
</main>`
  },

  // 4 WCAG Principles (POUR)
  wcagPillars: [
    {
      id: "perceivable",
      name: "Perceivable",
      principleNumber: "1",
      tagline: "Information & UI must be presentable to all senses.",
      criteriaChecked: 18,
      coveragePercent: 100,
      status: "100% Repaired",
      rules: [
        { code: "1.1.1", name: "Non-text Content (Alt Text)", status: "Active" },
        { code: "1.3.1", name: "Info and Relationships (Labels)", status: "Active" },
        { code: "1.4.3", name: "Contrast (Minimum 4.5:1)", status: "Active" },
        { code: "1.4.11", name: "Non-text Contrast (UI Components)", status: "Active" }
      ]
    },
    {
      id: "operable",
      name: "Operable",
      principleNumber: "2",
      tagline: "UI components and navigation must be fully operable.",
      criteriaChecked: 15,
      coveragePercent: 100,
      status: "100% Repaired",
      rules: [
        { code: "2.1.1", name: "Keyboard Navigable", status: "Active" },
        { code: "2.1.2", name: "No Keyboard Trap", status: "Active" },
        { code: "2.4.3", name: "Logical Focus Order", status: "Active" },
        { code: "2.4.7", name: "Focus Visible Indicators", status: "Active" }
      ]
    },
    {
      id: "understandable",
      name: "Understandable",
      principleNumber: "3",
      tagline: "Information and UI operation must be understandable.",
      criteriaChecked: 10,
      coveragePercent: 100,
      status: "100% Repaired",
      rules: [
        { code: "3.1.1", name: "Language of Page (html lang)", status: "Active" },
        { code: "3.2.1", name: "On Focus Context Integrity", status: "Active" },
        { code: "3.3.1", name: "Error Identification & Hints", status: "Active" },
        { code: "3.3.2", name: "Labels or Instructions", status: "Active" }
      ]
    },
    {
      id: "robust",
      name: "Robust",
      principleNumber: "4",
      tagline: "Content must be robust enough for assistive technologies.",
      criteriaChecked: 7,
      coveragePercent: 100,
      status: "100% Repaired",
      rules: [
        { code: "4.1.1", name: "Parsing & Valid Markup", status: "Active" },
        { code: "4.1.2", name: "Name, Role, Value (ARIA)", status: "Active" },
        { code: "4.1.3", name: "Status Messages (aria-live)", status: "Active" }
      ]
    }
  ],

  // Framework Ecosystems
  frameworks: [
    {
      name: "React / Next.js",
      tag: "JSX / TSX AST Plugin",
      icon: "atom",
      description: "Auto-remediates React DOM components during build or at runtime via custom Babel & SWC plugins.",
      snippet: `import { AccessFixProvider } from '@accessfix/react';\n\nexport default function App({ Component, pageProps }) {\n  return (\n    <AccessFixProvider autoRepair={true} strictLevel="AA">\n      <Component {...pageProps} />\n    </AccessFixProvider>\n  );\n}`
    },
    {
      name: "Vue.js / Nuxt",
      tag: "Template AST Transformer",
      icon: "vue",
      description: "Inspects Vue single-file templates and automatically binds required ARIA roles and labels.",
      snippet: `// nuxt.config.ts\nexport default defineNuxtConfig({\n  modules: ['@accessfix/nuxt'],\n  accessfix: {\n    strictWCAG: '2.2-AA',\n    generateCertificates: true\n  }\n});`
    },
    {
      name: "Angular",
      tag: "Directive Injection",
      icon: "shield",
      description: "Angular compiler hooks that inject focus rings, screen reader landmarks, and contrast overrides.",
      snippet: `@NgModule({\n  imports: [\n    AccessFixModule.forRoot({\n      autoFixFocus: true,\n      enforceAriaSemantics: true\n    })\n  ]\n})\nexport class AppModule { }`
    },
    {
      name: "HTML5 / Vanilla JS",
      tag: "Zero-Dependency Runtime",
      icon: "code",
      description: "A lightweight (<4KB) client-side runtime script that repairs existing legacy sites in under 5ms.",
      snippet: `<!-- Add to <head> of any legacy website -->\n<script \n  src="https://cdn.accessfix.ai/v2/engine.min.js" \n  data-accessfix-auto-repair="true" \n  data-verify-cert="true">\n</script>`
    }
  ],

  // Verification Proof Certificate Template
  certificateTemplate: {
    issuer: "AccessFix Formal Verification Engine v2.4",
    standard: "W3C Web Content Accessibility Guidelines (WCAG) 2.2 Level AA",
    legislationCompliance: ["ADA Title III", "Section 508", "EN 301 549", "European Accessibility Act (EAA)"],
    soundnessProof: "Bounded Model Checking via Z3 SMT Solver (Zero Structural Drift)",
    regressionGuarantee: "100% Invariance Preserved across Visual Tree & CSS Box Models",
    confidenceScore: "99.2%",
    auditHashPrefix: "0x8fa42b91d7c3ee1b46a992e105e4c6b7"
  }
};
