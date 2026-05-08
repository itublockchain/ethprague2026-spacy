---
name: spacy-context
description: |
  Project context for Spacy — orbital threshold wallet for ETHPrague 2026.
  Use this skill when:
  - Writing or modifying code in this monorepo
  - Discussing architecture decisions
  - Naming components, types, or routes
when_to_use: always
---

Spacy is a server-side 2-of-3 threshold ECDSA wallet whose signing nodes
sit at three different points along SpaceComputer's terrestrial-to-orbital
trust gradient. For the hackathon demo, the actual signing is delegated to
the Privy SDK; the visual story is "tx signed in space" but the underlying
backend is intentionally swappable.

Key conventions:
- Privy is invisible — never import or expose Privy's pre-built UI components
- All Privy hook usage is wrapped in src/hooks/useSpacyAuth.ts
- The four-phase signing animation (authorizing → orbital-signing → ground-signing → broadcasting) is choreography, not real cryptography. Document this honestly in code comments.
- Color tokens come from index.css @theme — never hardcode hex outside index.css and 3D object files
- License is AGPL-3.0 — every new file gets the standard header
