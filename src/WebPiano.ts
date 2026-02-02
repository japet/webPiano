import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { midiToNoteName, noteNameToMidi, isBlackKey, noteLabel } from './note-utils.js';

export interface NoteOnDetail {
  note: string;
  midi: number;
  velocity: number;
}

export interface NoteOffDetail {
  note: string;
  midi: number;
}

const DEFAULT_KEYBOARD_MAP: Record<string, string> = {
  a: 'C4', w: 'Db4', s: 'D4', e: 'Eb4', d: 'E4', f: 'F4',
  t: 'Gb4', g: 'G4', y: 'Ab4', h: 'A4', u: 'Bb4', j: 'B4',
  k: 'C5', o: 'Db5', l: 'D5', p: 'Eb5', ';': 'E5',
};

export class WebPiano extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      --key-white-color: #fff;
      --key-black-color: #222;
      --key-active-color: #4a87fa;
      --key-border-color: #333;
      --key-label-color: #999;
      --key-label-active-color: #fff;
    }

    :host([hidden]) {
      display: none;
    }

    .piano {
      display: flex;
      width: 100%;
      height: 100%;
      min-height: 80px;
      position: relative;
      background: #7a7a7a;
      border-radius: 4px;
      padding: 4px 4px 0;
      box-sizing: border-box;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }

    .key {
      position: relative;
      border: none;
      padding: 0;
      margin: 0;
      cursor: pointer;
      font-size: 9px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 4px;
      box-sizing: border-box;
      transition: background-color 0.05s;
    }

    .key:focus-visible {
      outline: 2px solid #4a87fa;
      outline-offset: -2px;
      z-index: 3;
    }

    .white {
      flex: 1 0 0%;
      height: 100%;
      background-color: var(--key-white-color);
      border: 1px solid var(--key-border-color);
      color: var(--key-label-color);
      z-index: 1;
    }

    .black {
      flex: 0 0 calc(100% / var(--white-key-count, 52) * 0.6);
      height: 60%;
      margin-left: calc(-100% / var(--white-key-count, 52) * 0.3);
      margin-right: calc(-100% / var(--white-key-count, 52) * 0.3);
      background-color: var(--key-black-color);
      border: 1px solid var(--key-border-color);
      border-top: none;
      color: var(--key-label-color);
      z-index: 2;
    }

    .active {
      background-color: var(--key-active-color) !important;
      color: var(--key-label-active-color);
    }
  `;

  /** First note of the keyboard range (inclusive). */
  @property({ type: String, attribute: 'start-note' })
  startNote = 'A0';

  /** Last note of the keyboard range (inclusive). */
  @property({ type: String, attribute: 'end-note' })
  endNote = 'C8';

  /** Notes to highlight externally (e.g., for showing chords or scales). */
  @property({ type: Array, attribute: false })
  activeNotes: string[] = [];

  /** Show note name labels on keys. */
  @property({ type: Boolean, attribute: 'show-labels' })
  showLabels = false;

  /** Enable Web MIDI device input. */
  @property({ type: Boolean, attribute: 'enable-midi' })
  enableMidi = true;

  /** Enable computer keyboard input. */
  @property({ type: Boolean, attribute: 'enable-keyboard' })
  enableKeyboard = true;

  /** MIDI numbers currently pressed by user interaction. */
  @state()
  private _pressedKeys = new Set<number>();

  /** Map of pointerId to the MIDI note currently under that pointer. */
  private _activePointers = new Map<number, number | null>();

  /** MIDI access object, if available. */
  private _midiAccess: MIDIAccess | null = null;

  /** Bound handlers for cleanup. */
  private _boundKeyDown = this._onKeyDown.bind(this);
  private _boundKeyUp = this._onKeyUp.bind(this);
  private _boundBlur = this._onBlur.bind(this);
  private _boundMidiMessage = this._onMidiMessage.bind(this);

  connectedCallback(): void {
    super.connectedCallback();
    this.tabIndex = 0;
    this.addEventListener('keydown', this._boundKeyDown);
    this.addEventListener('keyup', this._boundKeyUp);
    this.addEventListener('blur', this._boundBlur);
    this._initMidi();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this._boundKeyDown);
    this.removeEventListener('keyup', this._boundKeyUp);
    this.removeEventListener('blur', this._boundBlur);
    this._cleanupMidi();
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('startNote') || changed.has('endNote')) {
      const whiteCount = this._countWhiteKeys();
      this.style.setProperty('--white-key-count', String(whiteCount));
    }
  }

  private _countWhiteKeys(): number {
    const start = noteNameToMidi(this.startNote);
    const end = noteNameToMidi(this.endNote);
    let count = 0;
    for (let m = start; m <= end; m++) {
      if (!isBlackKey(m)) count++;
    }
    return count;
  }

  // --- MIDI ---

  private async _initMidi(): Promise<void> {
    if (!this.enableMidi) return;
    if (typeof navigator === 'undefined' || !navigator.requestMIDIAccess) return;

    try {
      this._midiAccess = await navigator.requestMIDIAccess();
      this._midiAccess.inputs.forEach(input => {
        input.addEventListener('midimessage', this._boundMidiMessage);
      });
    } catch (err) {
      console.warn('Web MIDI not available:', err);
    }
  }

  private _cleanupMidi(): void {
    if (this._midiAccess) {
      this._midiAccess.inputs.forEach(input => {
        input.removeEventListener('midimessage', this._boundMidiMessage);
      });
      this._midiAccess = null;
    }
  }

  private _onMidiMessage(event: Event): void {
    const midiEvent = event as MIDIMessageEvent;
    const data = midiEvent.data;
    if (!data || data.length < 3) return;

    const status = data[0] & 0xf0;
    const midi = data[1];
    const velocity = data[2];

    if (status === 0x90 && velocity > 0) {
      this._strikeNote(midi, velocity);
    } else if (status === 0x80 || (status === 0x90 && velocity === 0)) {
      this._releaseNote(midi);
    }
  }

  // --- Keyboard input ---

  private _onKeyDown(event: KeyboardEvent): void {
    if (!this.enableKeyboard) return;
    if (event.repeat) return;

    const noteName = DEFAULT_KEYBOARD_MAP[event.key];
    if (!noteName) return;

    const midi = noteNameToMidi(noteName);
    if (this._pressedKeys.has(midi)) return;

    this._strikeNote(midi, 80);
    event.preventDefault();
  }

  private _onKeyUp(event: KeyboardEvent): void {
    if (!this.enableKeyboard) return;

    const noteName = DEFAULT_KEYBOARD_MAP[event.key];
    if (!noteName) return;

    const midi = noteNameToMidi(noteName);
    this._releaseNote(midi);
  }

  private _onBlur(): void {
    // Release all pressed keys when focus is lost
    for (const midi of this._pressedKeys) {
      this._dispatchNoteOff(midi);
    }
    this._pressedKeys = new Set();
    this._activePointers.clear();
  }

  // --- Pointer input ---

  private _onPointerDown(event: PointerEvent): void {
    const container = event.currentTarget as HTMLElement;
    container.setPointerCapture(event.pointerId);

    const key = this._keyFromPoint(event.clientX, event.clientY);
    if (!key) return;

    const midi = Number(key.dataset.midi);
    const velocity = this._velocityFromEvent(event, key);

    this._activePointers.set(event.pointerId, midi);
    this._strikeNote(midi, velocity);

    event.preventDefault();
  }

  private _onPointerMove(event: PointerEvent): void {
    if (!this._activePointers.has(event.pointerId)) return;

    const key = this._keyFromPoint(event.clientX, event.clientY);
    const currentMidi = this._activePointers.get(event.pointerId)!;
    const newMidi = key ? Number(key.dataset.midi) : null;

    if (newMidi === currentMidi) return;

    // Release old note
    if (currentMidi !== null) {
      this._releaseNote(currentMidi);
    }

    // Strike new note
    if (newMidi !== null) {
      const velocity = this._velocityFromEvent(event, key!);
      this._strikeNote(newMidi, velocity);
    }

    this._activePointers.set(event.pointerId, newMidi);
  }

  private _onPointerUp(event: PointerEvent): void {
    const midi = this._activePointers.get(event.pointerId);
    if (midi !== undefined && midi !== null) {
      this._releaseNote(midi);
    }
    this._activePointers.delete(event.pointerId);
  }

  private _keyFromPoint(x: number, y: number): HTMLElement | null {
    // elementFromPoint returns the topmost element, which handles
    // black key overlap naturally (they have higher z-index).
    const el = this.shadowRoot!.elementFromPoint(x, y);
    if (el instanceof HTMLElement && el.classList.contains('key')) {
      return el;
    }
    return null;
  }

  private _velocityFromEvent(event: PointerEvent, key: HTMLElement): number {
    const rect = key.getBoundingClientRect();
    const relativeY = (event.clientY - rect.top) / rect.height;
    const clamped = Math.max(0, Math.min(1, relativeY));
    // Top of key = soft (30), bottom = loud (127)
    return Math.round(30 + clamped * 97);
  }

  // --- Note state management ---

  private _strikeNote(midi: number, velocity: number): void {
    if (this._pressedKeys.has(midi)) return;

    const next = new Set(this._pressedKeys);
    next.add(midi);
    this._pressedKeys = next;

    this._dispatchNoteOn(midi, velocity);
  }

  private _releaseNote(midi: number): void {
    if (!this._pressedKeys.has(midi)) return;

    const next = new Set(this._pressedKeys);
    next.delete(midi);
    this._pressedKeys = next;

    this._dispatchNoteOff(midi);
  }

  private _dispatchNoteOn(midi: number, velocity: number): void {
    const detail: NoteOnDetail = {
      note: midiToNoteName(midi),
      midi,
      velocity,
    };
    this.dispatchEvent(new CustomEvent('note-on', {
      detail,
      bubbles: true,
      composed: true,
    }));
  }

  private _dispatchNoteOff(midi: number): void {
    const detail: NoteOffDetail = {
      note: midiToNoteName(midi),
      midi,
    };
    this.dispatchEvent(new CustomEvent('note-off', {
      detail,
      bubbles: true,
      composed: true,
    }));
  }

  // --- Render ---

  render() {
    const startMidi = noteNameToMidi(this.startNote);
    const endMidi = noteNameToMidi(this.endNote);
    const activeSet = new Set(this.activeNotes.map(n => {
      try { return noteNameToMidi(n); } catch { return -1; }
    }));

    const keys = [];
    for (let midi = startMidi; midi <= endMidi; midi++) {
      const noteName = midiToNoteName(midi);
      const black = isBlackKey(midi);
      const active = this._pressedKeys.has(midi) || activeSet.has(midi);

      keys.push(html`
        <button
          part=${black ? 'key black-key' : 'key white-key'}
          class=${classMap({ key: true, black, white: !black, active })}
          data-midi=${midi}
          data-note=${noteName}
          aria-label=${noteLabel(midi)}
          aria-pressed=${String(active)}
          tabindex="-1"
        >${this.showLabels ? noteName : nothing}</button>
      `);
    }

    return html`
      <div
        class="piano"
        role="group"
        aria-label="Piano keyboard"
        @pointerdown=${this._onPointerDown}
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
        @pointercancel=${this._onPointerUp}
      >${keys}</div>
    `;
  }
}
