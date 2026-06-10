import { expect } from '@esm-bundle/chai';
import { WebPiano } from '../src/WebPiano.js';
import '../src/web-piano.js';

function createElement(attrs: Record<string, string> = {}): WebPiano {
  const el = document.createElement('web-piano') as WebPiano;
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  document.body.appendChild(el);
  return el;
}

async function waitForUpdate(el: WebPiano): Promise<void> {
  await el.updateComplete;
}

function getKeys(el: WebPiano): HTMLButtonElement[] {
  return Array.from(el.shadowRoot!.querySelectorAll('.key'));
}

function cleanup(): void {
  document.querySelectorAll('web-piano').forEach(el => el.remove());
}

describe('WebPiano', () => {
  afterEach(cleanup);

  describe('key generation', () => {
    it('renders 88 keys by default (A0 to C8)', async () => {
      const el = createElement();
      await waitForUpdate(el);
      const keys = getKeys(el);
      expect(keys.length).to.equal(88);
    });

    it('renders a custom range', async () => {
      const el = createElement({ 'start-note': 'C4', 'end-note': 'C5' });
      await waitForUpdate(el);
      const keys = getKeys(el);
      // C4 to C5 = 13 semitones (inclusive)
      expect(keys.length).to.equal(13);
    });

    it('first and last keys have correct data attributes', async () => {
      const el = createElement({ 'start-note': 'C4', 'end-note': 'E4' });
      await waitForUpdate(el);
      const keys = getKeys(el);
      expect(keys[0].dataset.note).to.equal('C4');
      expect(keys[keys.length - 1].dataset.note).to.equal('E4');
    });

    it('uses button elements for keys', async () => {
      const el = createElement({ 'start-note': 'C4', 'end-note': 'C4' });
      await waitForUpdate(el);
      const keys = getKeys(el);
      expect(keys[0].tagName).to.equal('BUTTON');
    });

    it('assigns white and black classes correctly', async () => {
      const el = createElement({ 'start-note': 'C4', 'end-note': 'D4' });
      await waitForUpdate(el);
      const keys = getKeys(el);
      // C4 = white, Db4 = black, D4 = white
      expect(keys[0].classList.contains('white')).to.be.true;
      expect(keys[1].classList.contains('black')).to.be.true;
      expect(keys[2].classList.contains('white')).to.be.true;
    });
  });

  describe('accessibility', () => {
    it('has a role=group container with aria-label', async () => {
      const el = createElement();
      await waitForUpdate(el);
      const container = el.shadowRoot!.querySelector('.piano');
      expect(container!.getAttribute('role')).to.equal('group');
      expect(container!.getAttribute('aria-label')).to.equal('Piano keyboard');
    });

    it('each key has an aria-label', async () => {
      const el = createElement({ 'start-note': 'C4', 'end-note': 'Db4' });
      await waitForUpdate(el);
      const keys = getKeys(el);
      expect(keys[0].getAttribute('aria-label')).to.equal('C 4');
      expect(keys[1].getAttribute('aria-label')).to.equal('D flat 4');
    });

    it('keys have aria-pressed', async () => {
      const el = createElement({ 'start-note': 'C4', 'end-note': 'C4' });
      await waitForUpdate(el);
      const keys = getKeys(el);
      expect(keys[0].getAttribute('aria-pressed')).to.equal('false');
    });
  });

  describe('activeNotes property', () => {
    it('highlights externally set notes', async () => {
      const el = createElement({ 'start-note': 'C4', 'end-note': 'E4' });
      await waitForUpdate(el);

      el.activeNotes = ['C4', 'E4'];
      await waitForUpdate(el);

      const keys = getKeys(el);
      expect(keys[0].classList.contains('active')).to.be.true;  // C4
      expect(keys[1].classList.contains('active')).to.be.false; // Db4
      expect(keys[2].classList.contains('active')).to.be.false; // D4
      expect(keys[3].classList.contains('active')).to.be.false; // Eb4
      expect(keys[4].classList.contains('active')).to.be.true;  // E4
    });

    it('sets aria-pressed for active notes', async () => {
      const el = createElement({ 'start-note': 'C4', 'end-note': 'D4' });
      await waitForUpdate(el);

      el.activeNotes = ['C4'];
      await waitForUpdate(el);

      const keys = getKeys(el);
      expect(keys[0].getAttribute('aria-pressed')).to.equal('true');
      expect(keys[1].getAttribute('aria-pressed')).to.equal('false');
    });
  });

  describe('showLabels', () => {
    it('does not show labels by default', async () => {
      const el = createElement({ 'start-note': 'C4', 'end-note': 'C4' });
      await waitForUpdate(el);
      const keys = getKeys(el);
      expect(keys[0].textContent!.trim()).to.equal('');
    });

    it('shows labels when enabled', async () => {
      const el = createElement({ 'start-note': 'C4', 'end-note': 'C4', 'show-labels': '' });
      await waitForUpdate(el);
      const keys = getKeys(el);
      expect(keys[0].textContent!.trim()).to.equal('C4');
    });
  });

  describe('events', () => {
    it('dispatches note-on with correct detail', async () => {
      const el = createElement({ 'start-note': 'C4', 'end-note': 'C4' });
      await waitForUpdate(el);

      let received: any = null;
      el.addEventListener('note-on', ((e: CustomEvent) => {
        received = e.detail;
      }) as EventListener);

      // Simulate pointer down on the key
      const key = getKeys(el)[0];
      const rect = key.getBoundingClientRect();
      const pointerDown = new PointerEvent('pointerdown', {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        pointerId: 1,
        bubbles: true,
        composed: true,
      });
      key.dispatchEvent(pointerDown);

      expect(received).to.not.be.null;
      expect(received.note).to.equal('C4');
      expect(received.midi).to.equal(60);
      expect(received.velocity).to.be.a('number');
      expect(received.velocity).to.be.greaterThan(0);
    });

    it('dispatches note-off on pointer up', async () => {
      const el = createElement({ 'start-note': 'C4', 'end-note': 'C4' });
      await waitForUpdate(el);

      let noteOff: any = null;
      el.addEventListener('note-off', ((e: CustomEvent) => {
        noteOff = e.detail;
      }) as EventListener);

      const key = getKeys(el)[0];
      const rect = key.getBoundingClientRect();

      // Press
      key.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        pointerId: 1,
        bubbles: true,
        composed: true,
      }));

      // Release
      key.dispatchEvent(new PointerEvent('pointerup', {
        pointerId: 1,
        bubbles: true,
        composed: true,
      }));

      expect(noteOff).to.not.be.null;
      expect(noteOff.note).to.equal('C4');
      expect(noteOff.midi).to.equal(60);
    });

    it('events bubble and cross shadow DOM', async () => {
      const el = createElement({ 'start-note': 'C4', 'end-note': 'C4' });
      await waitForUpdate(el);

      let bubbled = false;
      document.body.addEventListener('note-on', () => {
        bubbled = true;
      }, { once: true });

      const key = getKeys(el)[0];
      const rect = key.getBoundingClientRect();
      key.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        pointerId: 1,
        bubbles: true,
        composed: true,
      }));

      expect(bubbled).to.be.true;
    });
  });

  describe('keyboard input', () => {
    function trackEvents(el: WebPiano) {
      const ons: any[] = [];
      const offs: any[] = [];
      el.addEventListener('note-on', ((e: CustomEvent) => ons.push(e.detail)) as EventListener);
      el.addEventListener('note-off', ((e: CustomEvent) => offs.push(e.detail)) as EventListener);
      return { ons, offs };
    }

    function pressKey(el: WebPiano, key: string): void {
      el.dispatchEvent(new KeyboardEvent('keydown', { key }));
    }

    function releaseKey(el: WebPiano, key: string): void {
      el.dispatchEvent(new KeyboardEvent('keyup', { key }));
    }

    it('plays a note on keydown and releases on keyup', async () => {
      const el = createElement();
      await waitForUpdate(el);
      const { ons, offs } = trackEvents(el);

      pressKey(el, 'a');
      expect(ons).to.have.length(1);
      expect(ons[0].note).to.equal('C4');

      releaseKey(el, 'a');
      expect(offs).to.have.length(1);
      expect(offs[0].note).to.equal('C4');
    });

    it('shifts the octave up with x and down with z', async () => {
      const el = createElement();
      await waitForUpdate(el);
      const { ons } = trackEvents(el);

      pressKey(el, 'x');
      pressKey(el, 'a');
      releaseKey(el, 'a');
      expect(ons[0].note).to.equal('C5');

      pressKey(el, 'z');
      pressKey(el, 'z');
      pressKey(el, 'a');
      expect(ons[1].note).to.equal('C3');
    });

    it('releases the originally struck note if the octave changes while held', async () => {
      const el = createElement();
      await waitForUpdate(el);
      const { offs } = trackEvents(el);

      pressKey(el, 'a'); // C4 on
      pressKey(el, 'x'); // shift up while held
      releaseKey(el, 'a');

      expect(offs).to.have.length(1);
      expect(offs[0].note).to.equal('C4');
    });
  });

  describe('MIDI messages', () => {
    function midiMessage(el: WebPiano, bytes: number[]): void {
      (el as any)._onMidiMessage({ data: new Uint8Array(bytes) });
    }

    function trackEvents(el: WebPiano) {
      const ons: any[] = [];
      const offs: any[] = [];
      el.addEventListener('note-on', ((e: CustomEvent) => ons.push(e.detail)) as EventListener);
      el.addEventListener('note-off', ((e: CustomEvent) => offs.push(e.detail)) as EventListener);
      return { ons, offs };
    }

    it('plays and releases notes from MIDI messages', async () => {
      const el = createElement();
      await waitForUpdate(el);
      const { ons, offs } = trackEvents(el);

      midiMessage(el, [0x90, 60, 100]); // note on C4
      expect(ons).to.have.length(1);
      expect(ons[0]).to.deep.equal({ note: 'C4', midi: 60, velocity: 100 });

      midiMessage(el, [0x80, 60, 0]); // note off C4
      expect(offs).to.have.length(1);
      expect(offs[0]).to.deep.equal({ note: 'C4', midi: 60 });
    });

    it('sustain pedal defers note-off until the pedal is released', async () => {
      const el = createElement();
      await waitForUpdate(el);
      const { offs } = trackEvents(el);

      midiMessage(el, [0xb0, 64, 127]); // pedal down
      midiMessage(el, [0x90, 60, 100]); // note on
      midiMessage(el, [0x80, 60, 0]);   // note off — deferred
      expect(offs).to.have.length(0);

      midiMessage(el, [0xb0, 64, 0]);   // pedal up
      expect(offs).to.have.length(1);
      expect(offs[0].midi).to.equal(60);
    });

    it('re-striking a sustained note retriggers it', async () => {
      const el = createElement();
      await waitForUpdate(el);
      const { ons, offs } = trackEvents(el);

      midiMessage(el, [0xb0, 64, 127]); // pedal down
      midiMessage(el, [0x90, 60, 100]); // note on
      midiMessage(el, [0x80, 60, 0]);   // note off — sustained
      midiMessage(el, [0x90, 60, 90]);  // strike again while sustained

      expect(offs).to.have.length(1);  // sustained instance ended
      expect(ons).to.have.length(2);   // new instance started
      expect(ons[1].velocity).to.equal(90);

      midiMessage(el, [0x80, 60, 0]);  // note off — sustained again
      midiMessage(el, [0xb0, 64, 0]);  // pedal up
      expect(offs).to.have.length(2);
    });

    it('does not hold a note pressed by sustain after release without pedal', async () => {
      const el = createElement();
      await waitForUpdate(el);
      const { offs } = trackEvents(el);

      midiMessage(el, [0x90, 60, 100]);
      midiMessage(el, [0x80, 60, 0]);
      expect(offs).to.have.length(1);
    });
  });

  describe('cleanup', () => {
    it('removes element cleanly', async () => {
      const el = createElement();
      await waitForUpdate(el);
      el.remove();
      // Should not throw
    });
  });
});
