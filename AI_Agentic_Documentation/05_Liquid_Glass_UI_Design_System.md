# Chapter 5: Liquid Glass UI Design System

## 1. Aesthetic Foundations & Design Philosophy

The interface of MedDoc Intelligence is built on an **Ultra-Transparent Frosted Liquid Glass** aesthetic inspired by macOS Sonoma and Apple VisionOS:
1. **Depth Through Translucency**: Instead of flat dark cards, panels use low-opacity dark tints (`rgba(16, 7, 40, 0.22)`) paired with extreme backdrop blurring (`blur(36px)`), allowing background lighting to diffuse naturally.
2. **Specular Edge Lighting**: Double inner shadow borders (`inset 0 1px 2px rgba(255, 255, 255, 0.28)` on top and `inset 0 -1px 2px rgba(0, 0, 0, 0.3)` on bottom) replicate physical glass bevels.
3. **Fluid Ambient Aurora**: Five radial gradient plasma orbs continuously float behind the glass panels, creating organic visual motion that shines through the transparent UI.

---

## 2. Core Design Tokens (`frontend/src/index.css`)

```css
:root {
  --bg-primary: #05020d;
  --bg-secondary: rgba(12, 5, 30, 0.35);
  --sidebar-bg: rgba(9, 4, 24, 0.32);
  --card-bg: rgba(16, 7, 40, 0.22);
  --card-border: rgba(216, 180, 254, 0.18);
  --border-color: rgba(168, 85, 247, 0.16);
  --text-primary: #fcfaff;
  --text-secondary: #d8b4fe;
  --text-muted: #9d8ec2;
  --accent: #8b5cf6;
  --accent-light: #c084fc;
  --shadow-liquid: 0 20px 50px -10px rgba(50, 15, 110, 0.35),
                   inset 0 1px 2px 0 rgba(255, 255, 255, 0.28);
}
```

---

## 3. Dynamic Ambient Plasma Aurora Engine (`App.jsx`)

The backdrop features five independent layered CSS orbs driven by non-repeating alternating keyframe animations:

```jsx
<div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
  {/* Orb 1: Violet Top-Left Swirl */}
  <div className="absolute -top-32 -left-28 w-[580px] h-[580px] rounded-full bg-violet-600/35 blur-[120px] animate-aurora-1" />
  
  {/* Orb 2: Fuchsia Right-Center Pulse */}
  <div className="absolute top-1/4 -right-24 w-[620px] h-[620px] rounded-full bg-fuchsia-600/30 blur-[130px] animate-aurora-2" />
  
  {/* Orb 3: Royal Purple Bottom Sweep */}
  <div className="absolute -bottom-28 left-1/4 w-[660px] h-[660px] rounded-full bg-purple-700/30 blur-[140px] animate-aurora-3" />
  
  {/* Orb 4: Indigo Center Glow */}
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full bg-indigo-500/20 blur-[110px] animate-pulse-glow" />
  
  {/* Orb 5: Light Violet Refraction Accent */}
  <div className="absolute bottom-10 right-1/3 w-[380px] h-[380px] rounded-full bg-violet-400/15 blur-[125px] animate-aurora-2" />
</div>
```

---

## 4. On-Demand Evidence Vault Drawer (`SourceDrawer.jsx`)

To keep clinical conversations uncluttered while ensuring 100% auditability:
- **No In-Bubble Clutter**: Raw source text (`Sources:\n...`) and noisy inline chips are stripped from the main conversation stream.
- **Dedicated Launcher Button**: Messages display a glowing `.btn-source-liquid` button (`📖 View Sources (N)`).
- **Interactive Drawer Features**:
  1. **Multi-Chunk Tabs**: Direct navigation between all retrieved evidence chunks (`Chunk 1`, `Chunk 2`, ...).
  2. **Page & Section Badges**: Displays exact document name, page locator, and section heading.
  3. **Full Un-Truncated Verbatim Passage**: Entire text passage retrieved from the vector index is rendered with high-contrast typography.
  4. **One-Click Copy**: Copies the full verbatim passage to clipboard with emerald green confirmation.

---

## 5. Functional Color Button System

| Color Scheme | CSS Classes | Clinical & Functional Intent | UI Location |
| :--- | :--- | :--- | :--- |
| **🟢 Emerald Green** | `.btn-liquid-emerald`<br>`.btn-ghost-emerald` | Initialization, positive feedback, live sync | - **"New Chat"** in top header<br>- **"Re-sync Knowledge Base"** in sidebar<br>- **"Copied"** state on Copy buttons |
| **🔵 Sapphire Blue** | `.btn-liquid-cyan`<br>`.btn-ghost-cyan` | Action execution, inquiry, regeneration | - **"Ask AI"** main send button<br>- **"Copy"** button on message bubbles<br>- **"Regenerate"** synthesis button<br>- Chunk navigation arrows `<` `>` |
| **🔴 Crimson Rose** | `.btn-liquid-rose`<br>`.btn-ghost-rose` | Destructive actions, reset, dismissal | - **"Clear Chat"** header button<br>- **"Close Vault"** evidence drawer button |
| **🟣 Amethyst Purple** | `.btn-source-liquid` | Grounded clinical attribution | - **"View Sources (N)"** button on assistant messages |
