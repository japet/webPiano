# WebPiano

## What This Is

An interactive piano web component (`<web-piano>`) built with Lit 3 and TypeScript. Published to npm as `web-piano`. Framework-agnostic — works anywhere web components work.

Supports three input methods: computer keyboard, mouse/touch (with multi-touch and glissando), and MIDI devices.

## Project Structure

```
src/
  WebPiano.ts      — Main component class
  note-utils.ts    — MIDI ↔ note name conversion utilities
  index.ts         — Class + type exports
  web-piano.ts     — Custom element registration
test/
  note-utils.test.ts
  web-piano.test.ts
demo/
  index.html       — Interactive demo page
dist/              — Build output (gitignored)
```

## How to Run

```bash
npm install
npm start          # dev server on http://localhost:8000/demo/
npm run build      # compile TS → dist/ (JS + .d.ts)
npm test           # run browser tests via @web/test-runner
npm run analyze    # regenerate custom-elements.json
```

## Key Technical Decisions

- **Lit 3.x + TypeScript** — decorators (`@property`, `@state`), strict types, `.d.ts` output for consumers.
- **No runtime dependencies besides Lit.** MIDI-to-note conversion is inlined in `note-utils.ts` (~70 lines) rather than pulling in the `tonal` library.
- **tsup** builds ESM + declarations. Dev server uses `@web/dev-server-esbuild` to serve `.ts` directly.
- **Keys generated programmatically** from `startNote`/`endNote` range using MIDI numbers internally.
- **`<button>` elements for keys** — native focus, keyboard, and screen reader support.
- **Container-level pointer events** — enables multi-touch, glissando (sliding across keys), and clean pointer capture.
- **Shadow DOM** with CSS custom properties and `::part()` for consumer styling.
- **Events use `bubbles: true, composed: true`** to cross shadow DOM boundaries.

## Public API

**Attributes/Properties:**
- `start-note` / `startNote` (string, default `"A0"`) — first note
- `end-note` / `endNote` (string, default `"C8"`) — last note
- `activeNotes` (string[], property only) — externally highlight notes
- `show-labels` / `showLabels` (boolean) — show note names on keys
- `enable-midi` / `enableMidi` (boolean, default true)
- `enable-keyboard` / `enableKeyboard` (boolean, default true)

**Events:**
- `note-on` — `{ note: string, midi: number, velocity: number }`
- `note-off` — `{ note: string, midi: number }`

**CSS Custom Properties:**
`--key-white-color`, `--key-black-color`, `--key-active-color`, `--key-border-color`, `--key-label-color`, `--key-label-active-color`

**CSS Parts:** `key`, `white-key`, `black-key`

## How the Component Works

- MIDI numbers are the internal representation. Note name strings are the public-facing format.
- `_pressedKeys` (internal `Set<number>`) tracks user-pressed notes. `activeNotes` (external prop) highlights notes programmatically. Rendered state is the union.
- Pointer events attach to the `.piano` container, not individual keys. `setPointerCapture` keeps tracking during drags. `elementFromPoint` determines which key the pointer is over.
- Velocity is derived from vertical click position (top = soft, bottom = loud).
- Keyboard maps 17 keys (A–; row) to C4–E5. Requires focus.
- MIDI connects in `connectedCallback`, cleans up in `disconnectedCallback`. No focus required for MIDI.
- On blur, all pressed keys are released to prevent stuck notes.

## Known Gotchas

- **Focus required for keyboard input.** MIDI input works without focus, but keyboard does not. No visual focus indicator currently — consumers should style `:host(:focus)` if needed.
- **Web MIDI browser support:** Chrome/Edge/Firefox only. Safari does not support Web MIDI API. The component gracefully degrades (logs a warning, works with keyboard/mouse).
- **`elementFromPoint` and overlapping keys:** Black keys overlap white keys via negative margins and higher z-index. `elementFromPoint` returns the topmost element, so this works correctly without special handling.

## What NOT to Do

- Don't add new dependencies without asking first.
- Don't reorganize the file structure.
