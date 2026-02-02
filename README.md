# web-piano

An interactive piano web component with configurable range, multi-touch support, and MIDI input. Built with Lit 3 and TypeScript. Works with any framework.

## Features

- Configurable key range (default: full 88 keys, A0 to C8)
- Keyboard, mouse/touch, and MIDI input
- Multi-touch and glissando (slide across keys)
- Velocity from touch/click position
- Accessible: `<button>` keys with ARIA labels
- Styleable via CSS custom properties and `::part()`
- Zero runtime dependencies beyond Lit
- TypeScript types included

## Installation

```bash
npm install web-piano
```

## Usage

### HTML

```html
<script type="module" src="web-piano/web-piano.js"></script>

<web-piano></web-piano>
```

### With a specific range

```html
<web-piano start-note="C4" end-note="C5"></web-piano>
```

### JavaScript

```javascript
import 'web-piano/web-piano.js';

const piano = document.querySelector('web-piano');

piano.addEventListener('note-on', (e) => {
  console.log(e.detail); // { note: "C4", midi: 60, velocity: 80 }
});

piano.addEventListener('note-off', (e) => {
  console.log(e.detail); // { note: "C4", midi: 60 }
});
```

### Programmatic highlighting

```javascript
import { WebPiano } from 'web-piano';

const piano = document.querySelector('web-piano');
piano.activeNotes = ['C4', 'E4', 'G4']; // highlight a chord
```

### React

```jsx
import 'web-piano/web-piano.js';

function App() {
  return (
    <web-piano
      start-note="C3"
      end-note="C5"
      show-labels
      onNote-on={(e) => console.log(e.detail)}
    />
  );
}
```

### Vue

```vue
<template>
  <web-piano
    start-note="C3"
    end-note="C5"
    @note-on="onNoteOn"
  />
</template>

<script setup>
import 'web-piano/web-piano.js';

function onNoteOn(e) {
  console.log(e.detail);
}
</script>
```

## Properties

| Attribute | Property | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `start-note` | `startNote` | `string` | `"A0"` | First note (inclusive) |
| `end-note` | `endNote` | `string` | `"C8"` | Last note (inclusive) |
| — | `activeNotes` | `string[]` | `[]` | Highlight notes programmatically |
| `show-labels` | `showLabels` | `boolean` | `false` | Show note names on keys |
| `enable-midi` | `enableMidi` | `boolean` | `true` | Connect to MIDI devices |
| `enable-keyboard` | `enableKeyboard` | `boolean` | `true` | Enable computer keyboard input |

## Events

### `note-on`

Fired when a note begins playing.

```typescript
interface NoteOnDetail {
  note: string;    // "C4", "Db5", etc.
  midi: number;    // MIDI note number (0-127)
  velocity: number; // 0-127
}
```

### `note-off`

Fired when a note stops playing.

```typescript
interface NoteOffDetail {
  note: string;
  midi: number;
}
```

Both events have `bubbles: true` and `composed: true`, so they cross shadow DOM boundaries.

## Styling

### CSS custom properties

```css
web-piano {
  height: 200px;
  --key-white-color: #fff;
  --key-black-color: #222;
  --key-active-color: #4a87fa;
  --key-border-color: #333;
  --key-label-color: #999;
  --key-label-active-color: #fff;
}
```

### CSS `::part()` selectors

```css
web-piano::part(white-key) {
  background: ivory;
}

web-piano::part(black-key) {
  background: #1a1a2e;
}

web-piano::part(key):hover {
  filter: brightness(0.95);
}
```

Available parts: `key`, `white-key`, `black-key`.

## Keyboard Mapping

The component must be focused to receive keyboard input. Click the piano first.

| Key | Note | Key | Note | Key | Note |
|-----|------|-----|------|-----|------|
| A | C4 | W | Db4 | S | D4 |
| E | Eb4 | D | E4 | F | F4 |
| T | Gb4 | G | G4 | Y | Ab4 |
| H | A4 | U | Bb4 | J | B4 |
| K | C5 | O | Db5 | L | D5 |
| P | Eb5 | ; | E5 |

## MIDI

The component connects to MIDI devices automatically via the Web MIDI API. MIDI input works regardless of focus state.

**Browser support:** Chrome, Edge, Firefox. Safari does not support Web MIDI.

## Development

```bash
npm install
npm start          # dev server at http://localhost:8000/demo/
npm run build      # compile to dist/
npm test           # run tests
```

## License

MIT
