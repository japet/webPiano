import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
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

interface KeyData {
  midi: number;
  noteName: string;
  label: string;
  part: string;
  baseClass: string;
}

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
      contain: content;
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

  /**
   * MIDI numbers currently pressed by user interaction.
   * Mutated in place with an explicit requestUpdate() to avoid copying
   * the Set on every note event.
   */
  private _pressedKeys = new Set<number>();

  /** Per-key render data, recomputed only when the note range changes. */
  private _keyData: KeyData[] = [];

  /** Parsed activeNotes, recomputed only when the property changes. */
  private _activeMidiSet = new Set<number>();

  /** Map of pointerId to the MIDI note currently under that pointer. */
  private _activePointers = new Map<number, number | null>();

  /** Octave shift applied to computer keyboard input (Z/X to change). */
  private _keyboardOctaveShift = 0;

  /** Map of keyboard event.key to the MIDI note it struck (accounts for octave shift). */
  private _keyboardHeldNotes = new Map<string, number>();

  /** Whether the MIDI sustain pedal (CC 64) is down. */
  private _sustainOn = false;

  /** Notes whose release was deferred by the sustain pedal. */
  private _sustainedNotes = new Set<number>();

  /** MIDI access object, if available. */
  private _midiAccess: MIDIAccess | null = null;

  /** Bound handlers for cleanup. */
  private _boundKeyDown = this._onKeyDown.bind(this);
  private _boundKeyUp = this._onKeyUp.bind(this);
  private _boundBlur = this._onBlur.bind(this);
  private _boundMidiMessage = this._onMidiMessage.bind(this);
  private _boundMidiStateChange = this._onMidiStateChange.bind(this);

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
      this._rebuildKeyData();
    }
    if (changed.has('activeNotes')) {
      const set = new Set<number>();
      for (const n of this.activeNotes) {
        try { set.add(noteNameToMidi(n)); } catch { /* ignore invalid names */ }
      }
      this._activeMidiSet = set;
    }
  }

  protected updated(changed: PropertyValues): void {
    // Skip the first update (old value undefined) — connectedCallback handles init.
    if (changed.has('enableMidi') && changed.get('enableMidi') !== undefined) {
      if (this.enableMidi) {
        this._initMidi();
      } else {
        this._cleanupMidi();
      }
    }
  }

  private _rebuildKeyData(): void {
    const start = noteNameToMidi(this.startNote);
    const end = noteNameToMidi(this.endNote);
    const keys: KeyData[] = [];
    let whiteCount = 0;
    for (let midi = start; midi <= end; midi++) {
      const black = isBlackKey(midi);
      if (!black) whiteCount++;
      keys.push({
        midi,
        noteName: midiToNoteName(midi),
        label: noteLabel(midi),
        part: black ? 'key black-key' : 'key white-key',
        baseClass: black ? 'key black' : 'key white',
      });
    }
    this._keyData = keys;
    this.style.setProperty('--white-key-count', String(whiteCount));
  }

  // --- MIDI ---

  private async _initMidi(): Promise<void> {
    if (!this.enableMidi || this._midiAccess) return;
    if (typeof navigator === 'undefined') return;
    if (!navigator.requestMIDIAccess) {
      console.warn('Web MIDI not available: this browser does not support the Web MIDI API.');
      return;
    }

    try {
      const access = await navigator.requestMIDIAccess();
      // enableMidi may have been turned off while awaiting access
      if (!this.enableMidi || this._midiAccess) return;
      this._midiAccess = access;
      access.inputs.forEach(input => {
        input.addEventListener('midimessage', this._boundMidiMessage);
      });
      access.addEventListener('statechange', this._boundMidiStateChange);
    } catch (err) {
      console.warn('Web MIDI not available:', err);
    }
  }

  private _cleanupMidi(): void {
    if (this._midiAccess) {
      this._midiAccess.removeEventListener('statechange', this._boundMidiStateChange);
      this._midiAccess.inputs.forEach(input => {
        input.removeEventListener('midimessage', this._boundMidiMessage);
      });
      this._midiAccess = null;
    }
    this._setSustain(false);
  }

  private _onMidiStateChange(event: Event): void {
    const port = (event as MIDIConnectionEvent).port;
    if (!port || port.type !== 'input') return;
    if (port.state === 'connected') {
      // addEventListener dedupes the same handler reference, so devices
      // already wired up are unaffected.
      (port as MIDIInput).addEventListener('midimessage', this._boundMidiMessage);
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
    } else if (status === 0xb0 && data[1] === 64) {
      // Sustain pedal (CC 64): value >= 64 means down
      this._setSustain(data[2] >= 64);
    }
  }

  // --- Keyboard input ---

  private _onKeyDown(event: KeyboardEvent): void {
    if (!this.enableKeyboard) return;
    if (event.repeat) return;

    if (event.key === 'z' || event.key === 'x') {
      const delta = event.key === 'z' ? -1 : 1;
      this._keyboardOctaveShift = Math.max(-3, Math.min(3, this._keyboardOctaveShift + delta));
      event.preventDefault();
      return;
    }

    const noteName = DEFAULT_KEYBOARD_MAP[event.key];
    if (!noteName) return;

    const midi = noteNameToMidi(noteName) + this._keyboardOctaveShift * 12;
    this._keyboardHeldNotes.set(event.key, midi);
    this._strikeNote(midi, 80);
    event.preventDefault();
  }

  private _onKeyUp(event: KeyboardEvent): void {
    if (!this.enableKeyboard) return;

    // Release the note this key actually struck, in case the octave
    // shift changed while the key was held.
    const midi = this._keyboardHeldNotes.get(event.key);
    if (midi === undefined) return;
    this._keyboardHeldNotes.delete(event.key);
    this._releaseNote(midi);
  }

  private _onBlur(): void {
    // Release all pressed keys when focus is lost
    for (const midi of this._pressedKeys) {
      this._dispatchNoteOff(midi);
    }
    this._pressedKeys.clear();
    this._activePointers.clear();
    this._keyboardHeldNotes.clear();
    this._sustainedNotes.clear();
    this.requestUpdate();
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
    if (this._pressedKeys.has(midi)) {
      if (!this._sustainedNotes.has(midi)) return;
      // Re-strike of a note sounding only because of the sustain pedal:
      // end the sustained instance and start a new one. The key stays
      // visually pressed, so no re-render is needed.
      this._sustainedNotes.delete(midi);
      this._dispatchNoteOff(midi);
      this._dispatchNoteOn(midi, velocity);
      return;
    }

    this._pressedKeys.add(midi);
    this.requestUpdate();
    this._dispatchNoteOn(midi, velocity);
  }

  private _releaseNote(midi: number): void {
    if (!this._pressedKeys.has(midi)) return;

    if (this._sustainOn) {
      this._sustainedNotes.add(midi);
      return;
    }

    this._pressedKeys.delete(midi);
    this.requestUpdate();
    this._dispatchNoteOff(midi);
  }

  private _setSustain(on: boolean): void {
    if (this._sustainOn === on) return;
    this._sustainOn = on;
    if (!on) {
      const sustained = [...this._sustainedNotes];
      this._sustainedNotes.clear();
      for (const midi of sustained) {
        this._releaseNote(midi);
      }
    }
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
    const keys = this._keyData.map(k => {
      const active = this._pressedKeys.has(k.midi) || this._activeMidiSet.has(k.midi);
      return html`
        <button
          part=${k.part}
          class=${active ? `${k.baseClass} active` : k.baseClass}
          data-midi=${k.midi}
          data-note=${k.noteName}
          aria-label=${k.label}
          aria-pressed=${String(active)}
          tabindex="-1"
        >${this.showLabels ? k.noteName : nothing}</button>
      `;
    });

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
