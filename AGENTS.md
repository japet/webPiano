# webPiano

An interactive piano web component (`<web-piano>`) built with Lit 3 and TypeScript. Published to npm as `web-piano`. Supports three input methods: computer keyboard, mouse/touch (multi-touch and glissando), and MIDI devices.

## Architecture

- `src/WebPiano.ts` — Main component class. All UI, pointer/keyboard/MIDI handling, and event dispatch.
- `src/note-utils.ts` — MIDI ↔ note name conversion utilities (no external music library; ~70 lines, intentionally inlined instead of depending on `tonal`).
- `src/index.ts` — Class + type exports.
- `src/web-piano.ts` — Registers the custom element as `<web-piano>`.
- `test/` — Browser tests via @web/test-runner.
- `demo/index.html` — Interactive demo page.
- `dist/` — Build output (gitignored).
- `custom-elements.json` — Web component manifest, regenerated via `npm run analyze`.

## Tech Stack

Lit 3.x with TypeScript decorators (`@property`, `@state`). tsup builds ESM + `.d.ts`. The dev server (`@web/dev-server` + esbuild plugin) serves `.ts` directly with no build step. No runtime dependencies besides Lit.

## Development Workflow

```bash
npm start          # dev server on http://localhost:8000/demo/
npm run build      # compile TS → dist/ (JS + .d.ts)
npm test           # browser tests via @web/test-runner (Chrome)
npm run analyze    # regenerate custom-elements.json
```

## Key Implementation Details

- MIDI numbers are the internal representation; note name strings are the public-facing format. Keys are generated programmatically from the `start-note`/`end-note` range (defaults A0–C8, 88 keys).
- Keys are `<button>` elements with ARIA labels and `aria-pressed`. White keys get `.white`, black keys `.black`, pressed/highlighted keys `.active`.
- `_pressedKeys` (internal `Set<number>`) tracks user-pressed notes; `activeNotes` (external string[] property) highlights notes programmatically. Rendered state is the union.
- Performance: per-key render data (`_keyData`) is rebuilt only when the range changes; `activeNotes` is parsed once per change into `_activeMidiSet`; `_pressedKeys` is mutated in place with an explicit `requestUpdate()` rather than copied — keep it that way.
- Pointer events attach to the `.piano` container, not individual keys. `setPointerCapture` keeps tracking during drags; `shadowRoot.elementFromPoint` determines which key the pointer is over (black-key overlap works because they have higher z-index).
- Velocity is derived from vertical click position (top = soft 30, bottom = loud 127). Keyboard input uses fixed velocity 80.
- Keyboard maps 17 keys (A–; row) to C4–E5 via `DEFAULT_KEYBOARD_MAP`. Z/X shift the octave down/up (clamped to ±3); keyup releases the note the key actually struck via `_keyboardHeldNotes`. Requires component focus (`tabIndex` set to 0 in `connectedCallback`).
- MIDI connects in `connectedCallback` via `navigator.requestMIDIAccess()`, cleans up in `disconnectedCallback`. Hot-plugged devices are wired up via the `statechange` event on `MIDIAccess`. `enableMidi` can be toggled at runtime (handled in `updated()`). MIDI input does NOT require focus.
- Sustain pedal (MIDI CC 64): while down, `_releaseNote` defers releases into `_sustainedNotes`; pedal-up releases them. Re-striking a sustained note dispatches note-off then note-on.
- On blur, all pressed keys are released to prevent stuck notes.

## Events

- `note-on` — `detail: { note: string, midi: number, velocity: number }`
- `note-off` — `detail: { note: string, midi: number }`

Both use `bubbles: true, composed: true` to cross shadow DOM boundaries.

## Conventions

- Note names use scientific pitch notation with flats (`Db4`, not `C#4`) in output; `noteNameToMidi` accepts both sharps and flats as input.
- Private methods and fields use a single underscore prefix (`_onKeyDown`).
- Consumer styling via CSS custom properties (`--key-white-color`, `--key-black-color`, `--key-active-color`, `--key-border-color`, `--key-label-color`, `--key-label-active-color`) and CSS parts (`key`, `white-key`, `black-key`).

## Gotchas

- Computer keyboard input silently does nothing without focus; MIDI works regardless of focus.
- Safari does not support the Web MIDI API. The component degrades gracefully (console warning; keyboard/mouse still work).
- The keyboard map covers C4–E5, shiftable ±3 octaves with Z/X; there is no configurable mapping.

## What NOT to Do

- Don't add new dependencies without asking first.
- Don't reorganize the file structure.
