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

  describe('cleanup', () => {
    it('removes element cleanly', async () => {
      const el = createElement();
      await waitForUpdate(el);
      el.remove();
      // Should not throw
    });
  });
});
