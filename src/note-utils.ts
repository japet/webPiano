const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

const LABEL_NAMES: Record<string, string> = {
  Db: 'D flat',
  Eb: 'E flat',
  Gb: 'G flat',
  Ab: 'A flat',
  Bb: 'B flat',
};

const BLACK_KEY_INDICES = new Set([1, 3, 6, 8, 10]);

const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1,
  D: 2, 'D#': 3, Eb: 3,
  E: 4, Fb: 4,
  F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8,
  A: 9, 'A#': 10, Bb: 10,
  B: 11, Cb: 11,
};

const NOTE_NAME_RE = /^([A-G])(b|#)?(\d)$/;

/**
 * Convert a MIDI note number to a note name string.
 * E.g., 60 → "C4", 61 → "Db4"
 */
export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const semitone = midi % 12;
  return `${NOTE_NAMES[semitone]}${octave}`;
}

/**
 * Convert a note name string to a MIDI note number.
 * E.g., "C4" → 60, "Db4" → 61
 */
export function noteNameToMidi(name: string): number {
  const match = name.match(NOTE_NAME_RE);
  if (!match) {
    throw new Error(`Invalid note name: "${name}"`);
  }
  const [, letter, accidental, octaveStr] = match;
  const noteName = letter + (accidental ?? '');
  const semitone = NOTE_TO_SEMITONE[noteName];
  if (semitone === undefined) {
    throw new Error(`Unknown note: "${noteName}"`);
  }
  const octave = parseInt(octaveStr, 10);
  return (octave + 1) * 12 + semitone;
}

/**
 * Returns true if the MIDI note is a black key (sharp/flat).
 */
export function isBlackKey(midi: number): boolean {
  return BLACK_KEY_INDICES.has(midi % 12);
}

/**
 * Returns an accessible label for a MIDI note.
 * E.g., 61 → "D flat 4", 60 → "C 4"
 */
export function noteLabel(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const semitone = midi % 12;
  const name = NOTE_NAMES[semitone];
  const readable = LABEL_NAMES[name] ?? name;
  return `${readable} ${octave}`;
}
