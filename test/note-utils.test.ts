import { expect } from '@esm-bundle/chai';
import { midiToNoteName, noteNameToMidi, isBlackKey, noteLabel } from '../src/note-utils.js';

describe('midiToNoteName', () => {
  it('converts middle C (MIDI 60)', () => {
    expect(midiToNoteName(60)).to.equal('C4');
  });

  it('converts A0 (MIDI 21)', () => {
    expect(midiToNoteName(21)).to.equal('A0');
  });

  it('converts C8 (MIDI 108)', () => {
    expect(midiToNoteName(108)).to.equal('C8');
  });

  it('converts sharps/flats as flats', () => {
    expect(midiToNoteName(61)).to.equal('Db4');
    expect(midiToNoteName(63)).to.equal('Eb4');
    expect(midiToNoteName(66)).to.equal('Gb4');
  });

  it('converts A4 concert pitch (MIDI 69)', () => {
    expect(midiToNoteName(69)).to.equal('A4');
  });
});

describe('noteNameToMidi', () => {
  it('converts C4 to 60', () => {
    expect(noteNameToMidi('C4')).to.equal(60);
  });

  it('converts A0 to 21', () => {
    expect(noteNameToMidi('A0')).to.equal(21);
  });

  it('converts C8 to 108', () => {
    expect(noteNameToMidi('C8')).to.equal(108);
  });

  it('handles flats', () => {
    expect(noteNameToMidi('Db4')).to.equal(61);
    expect(noteNameToMidi('Bb3')).to.equal(58);
  });

  it('handles sharps', () => {
    expect(noteNameToMidi('C#4')).to.equal(61);
    expect(noteNameToMidi('F#3')).to.equal(54);
  });

  it('roundtrips with midiToNoteName', () => {
    for (let midi = 21; midi <= 108; midi++) {
      const name = midiToNoteName(midi);
      expect(noteNameToMidi(name)).to.equal(midi);
    }
  });

  it('throws on invalid input', () => {
    expect(() => noteNameToMidi('X4')).to.throw();
    expect(() => noteNameToMidi('')).to.throw();
    expect(() => noteNameToMidi('C')).to.throw();
  });
});

describe('isBlackKey', () => {
  it('identifies white keys', () => {
    // C, D, E, F, G, A, B in octave 4
    expect(isBlackKey(60)).to.be.false; // C
    expect(isBlackKey(62)).to.be.false; // D
    expect(isBlackKey(64)).to.be.false; // E
    expect(isBlackKey(65)).to.be.false; // F
    expect(isBlackKey(67)).to.be.false; // G
    expect(isBlackKey(69)).to.be.false; // A
    expect(isBlackKey(71)).to.be.false; // B
  });

  it('identifies black keys', () => {
    expect(isBlackKey(61)).to.be.true; // Db
    expect(isBlackKey(63)).to.be.true; // Eb
    expect(isBlackKey(66)).to.be.true; // Gb
    expect(isBlackKey(68)).to.be.true; // Ab
    expect(isBlackKey(70)).to.be.true; // Bb
  });
});

describe('noteLabel', () => {
  it('labels natural notes', () => {
    expect(noteLabel(60)).to.equal('C 4');
    expect(noteLabel(69)).to.equal('A 4');
  });

  it('spells out flats for accessibility', () => {
    expect(noteLabel(61)).to.equal('D flat 4');
    expect(noteLabel(63)).to.equal('E flat 4');
    expect(noteLabel(66)).to.equal('G flat 4');
    expect(noteLabel(68)).to.equal('A flat 4');
    expect(noteLabel(70)).to.equal('B flat 4');
  });
});
