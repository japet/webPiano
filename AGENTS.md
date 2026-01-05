# webPiano

A Lit-based web component (`<web-piano>`) that renders an 88-key piano with keyboard, mouse, and MIDI input support. Dispatches `key-strike` and `key-release` custom events with note names as detail.

## Architecture

- `src/WebPiano.js` — Single-file component extending LitElement. Contains all UI, event handling, and MIDI integration logic.
- `index.js` — Re-exports WebPiano class for programmatic use.
- `web-piano.js` — Registers the custom element as `<web-piano>`.
- `demo/index.html` — Basic usage example with Lit's render function. 
- `web-dev-server.config.mjs` — Dev server config with nodeResolve enabled, opens to /demo/. 
- `custom-elements.json` — Web component manifest for tooling.

## Tech Stack

Lit 2.x for reactive properties and efficient shadow DOM rendering. Tonal library (specifically `Note` and `Chord` imports) for converting MIDI note numbers to scientific pitch notation. Web MIDI API for MIDI device input.

## Development Workflow

Run: `npm start` (starts @web/dev-server on port 8000, opens /demo/)
Build: No build step required; uses bare module imports resolved by dev server. 
No tests currently configured.

## Key Implementation Details

The component maintains an `activeNotes` array tracking currently pressed notes. All 88 keys (A0 to C8) are hardcoded in the render method as divs with `note` attributes. White keys get `.white` class, black keys get `.black` class. Selected keys receive `.selected` class which changes background color. 

Keyboard input uses a hardcoded `KEYBOARD_NOTE_MAP` object mapping lowercase letters to specific notes (a=C4, w=Db4, etc.). Only 15 keys are mapped. Key events only fire when the component has focus (`tabIndex` set to 0 in firstUpdated).

MIDI setup happens in `firstUpdated()` via `navigator.requestMIDIAccess()`. All MIDI inputs get the same `handleMIDIMessage` arrow function handler. MIDI note-on (velocity > 0) triggers `strikeNote`, note-off (velocity 0) triggers `releaseNote`. MIDI only responds when component is document.activeElement.

Mouse handlers (`mousedown`/`mouseup`) are attached to all `.key` elements in firstUpdated. They call the same `strikeNote`/`releaseNote` methods as keyboard/MIDI. 

Component loses all active notes on blur via `_handleBlur` which releases all `.selected` elements.

The `.playingDisplay` div shows comma-separated active notes as text. The `.indicator` div is a visual focus indicator that changes color via CSS variable when focused.

## Conventions

Note names use scientific pitch notation with flats (Db not C#). All note-related attributes use this format. Event detail is always a single note string, never an array or object.

Private methods use single underscore prefix (`_handleKeyDown`). The `__increment` method is unused legacy code.

Static `properties` define `header` and `counter` but these are also unused—likely boilerplate from component scaffold.

## Gotchas

The keyboard map only covers C4 to E5 with specific letter keys. No octave shifting or configurable mapping exists. 

MIDI and keyboard input silently fail if component doesn't have focus. The visual indicator provides feedback but no console warnings.

Multiple simultaneous presses of the same note (e.g., via keyboard and MIDI) are prevented by checking `activeNotes.indexOf(noteName)` before striking. Releasing removes only the first occurrence in the array.

The component sets `tabIndex = 0` in firstUpdated rather than via attribute or property, so you cannot override it declaratively.

All 88 keys are in the template regardless of viewport size. No responsive layout or scrolling is implemented.

CSS uses percentages and vmin units. Changing the host element's width/height scales the piano but may break key proportions.

## References

Lit docs for reactive property and event patterns. Tonal docs for Note.fromMidi and other utilities. Web MIDI API spec for MIDI message structure (status byte, data byte 1 = note number, data byte 2 = velocity).