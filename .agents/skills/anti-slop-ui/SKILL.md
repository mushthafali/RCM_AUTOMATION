---
name: anti-slop-ui
description: "Rules, constraints, and aesthetic guidelines to eliminate generic 'AI Slop' UI design patterns and enforce crafted, high-density, human-grade enterprise and industrial software design."
---

# Anti-Slop UI Design Guidelines & Guardrails

This skill enforces strict visual and structural design standards to eliminate the generic, repetitive aesthetic known as **"AI Slop"** (e.g., purple/cyan glowing neon gradients, gratuitous glassmorphism blur orbs, decorative badge overload, and generic 3-card SaaS templates) in favor of **crafted, high-density, enterprise-grade industrial software design** (inspired by Linear, Vercel, Datadog, Raycast, and Apple Pro apps).

---

## 1. Forbidden "AI Slop" Patterns (BANNED)

1. ❌ **No Floating Neon Gradients / Glowing Orbs**:
   - BAN: `bg-cyan-500/10 rounded-full blur-3xl`, glowing gradient radial backgrounds, decorative neon halos.
   - USE: Solid, crisp neutral backgrounds (`#09090b`, `#121215`, `#18181b`) with intentional surface contrast.

2. ❌ **No Gratuitous Glassmorphism Everywhere**:
   - BAN: Transparent cards with `backdrop-blur-md` and `border-opacity-20` on every element.
   - USE: Solid surface colors with crisp 1px borders (`border-zinc-800`, `border-zinc-800/80`) and subtle elevation.

3. ❌ **No Decorative Badge & Pill Overload**:
   - BAN: Every heading having 2-3 pill badges with `text-cyan-400 border-cyan-500/20`.
   - USE: Minimal, semantic status tags only where they convey real operational status (`Pass`, `Fail`, `Critical`).

4. ❌ **No Generic 3-Card SaaS Grid**:
   - BAN: Repeating standard 3-card marketing feature grids in analytical/enterprise software.
   - USE: Purposeful macro-layouts: data-dense tables, structured split-panes, compact inspector toolbars, and contextual master-detail views.

5. ❌ **No Playful/Sparkly Decorative Icons**:
   - BAN: Sparkles, emojis, or arbitrary icons placed as decoration.
   - USE: Precise, functional technical iconography (Lucide engineering icons) aligned strictly with labels.

---

## 2. Crafted Industrial & Metrology Design Tokens

### A. Color Architecture (High-Contrast Neutral + Semantic Accents)
* **Backgrounds**: 
  * App Canvas: `bg-zinc-950` (`#09090b`)
  * Elevated Panels / Sidebar: `bg-zinc-900` (`#18181b`)
  * Inset Wells / Table Rows / Inputs: `bg-zinc-900/50` or `bg-zinc-950`
* **Hairline Borders**:
  * Default Borders: `border-zinc-800` (`#27272a`)
  * Active / Focus Borders: `border-zinc-600` or `border-blue-500`
* **Text Hierarchy**:
  * Primary Headings & Critical Figures: `text-zinc-50` / `text-white` (High Contrast)
  * Body & Labels: `text-zinc-300` / `text-zinc-400`
  * Secondary / Meta / Units: `text-zinc-500` / `text-zinc-600`
* **Strict Semantic Accents Only**:
  * Action / Selection: Cobalt / Precision Blue (`#2563eb`, `text-blue-400`, `bg-blue-600`)
  * Metrology Pass: Clean Forest Emerald (`#10b981`, `text-emerald-400`)
  * Warning / Marginal Drift: Industrial Amber (`#f59e0b`, `text-amber-400`)
  * Metrology Fail / Out-of-Tolerance: Crisp Crimson (`#ef4444`, `text-rose-400`)

---

## 3. Layout, Density, and Typography Rules

1. **High Information Density**:
   - Compact table paddings (`py-2 px-3` instead of bulky `py-4 px-6`).
   - Monospaced tabular numerals (`font-mono font-medium tracking-tight`) for all metrology data (range, readings, errors, drift, dates).
2. **Master-Detail & Split Panes**:
   - Keep context visible: selecting an item opens side-by-side or contextual inspector panels rather than navigating away.
3. **Intentional Form Controls**:
   - High-contrast inputs with clean focus rings, crisp units attached to the input edge, and instant inline validation without noisy alerts.
