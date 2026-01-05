# webPiano

A customizable web component that provides an interactive 88-key piano interface with support for keyboard, mouse, and MIDI input. 

## Features

- 🎹 Full 88-key piano range (A0 to C8)
- ⌨️ Keyboard input support
- 🖱️ Mouse/touch interaction
- 🎛️ MIDI device support via Web MIDI API
- 🎨 Customizable styling via CSS custom properties
- 📦 Built as a standard Web Component (works with any framework)
- ⚡ Powered by Lit for efficient rendering

## Quick Start

### Installation

```bash
npm install @japet/web-piano
```

Or use directly via CDN:

```html
<script type="module" src="https://unpkg.com/@japet/web-piano"></script>
```

### Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import 'web-piano.js';
  </script>
</head>
<body>
  <web-piano></web-piano>
</body>
</html>
```

### With Event Listeners

```javascript
import { html, render } from 'lit';
import './web-piano.js';

const piano = document.querySelector('web-piano');

// Listen for note strikes
piano.addEventListener('key-strike', (e) => {
  console.log('Note pressed:', e.detail); // e.g., "C4"
});

// Listen for note releases
piano.addEventListener('key-release', (e) => {
  console.log('Note released:', e.detail); // e.g., "C4"
});
```

## Keyboard Mapping

The following keyboard keys map to piano notes:

| Key | Note | Key | Note | Key | Note |
|-----|------|-----|------|-----|------|
| A | C4 | W | Db4 | S | D4 |
| E | Eb4 | D | E4 | F | F4 |
| T | Gb4 | G | G4 | Y | Ab4 |
| H | A4 | U | Bb4 | J | B4 |
| K | C5 | O | Db5 | L | D5 |
| P | Eb5 | ; | E5 |

**Note**: The component must be focused to receive keyboard input.

## Styling

Customize the appearance using CSS custom properties:

```css
web-piano {
  --background-color: blue;
  --indicator-color: #EEB0B0;
  height: 200px;
  width: 100%;
}

/* Indicator turns green when focused */
web-piano:focus {
  --indicator-color: #22FF47;
}
```

## MIDI Support

The component automatically detects and connects to MIDI devices via the Web MIDI API. Simply connect a MIDI keyboard to your computer, and it will work automatically when the component is focused.

**Browser Support**: MIDI support requires a browser that implements the Web MIDI API (Chrome, Edge, Opera).

## Events

The component dispatches custom events:

### `key-strike`

Fired when a note begins playing.

```javascript
piano.addEventListener('key-strike', (event) => {
  const note = event.detail; // "C4", "Db5", etc.
});
```

### `key-release`

Fired when a note stops playing.

```javascript
piano.addEventListener('key-release', (event) => {
  const note = event.detail; // "C4", "Db5", etc. 
});
```

## Development

### Setup

```bash
npm install
```

### Run Demo Server

```bash
npm start
```

Opens a development server at `http://localhost:8000/demo/`

### Project Structure

```
webPiano/
├── src/
│   └── WebPiano.js          # Main component implementation
├── demo/
│   └── index.html           # Demo page
├── index.js                 # Module exports
├── web-piano.js             # Custom element registration
├── custom-elements.json     # Web component metadata
└── web-dev-server.config.mjs
```

## Contributing

Contributions are welcome! The codebase is straightforward: 

1. The main component logic is in `src/WebPiano.js`
2. All 88 keys are rendered in the template
3. Event handling supports keyboard, mouse, and MIDI inputs
4. Uses Tonal library for note name handling

## Browser Support

- Modern browsers with Web Components support
- Optional: Web MIDI API for MIDI device support (Chrome, Edge, Opera)

## Dependencies

- **lit**: Efficient web component base class and rendering
- **tonal**: Music theory library for note name handling

## License

MIT License - Copyright (c) 2023 web-piano

See [LICENSE](LICENSE) for full text.