import { html, css, LitElement } from 'lit';
import { Note, Chord } from 'tonal';

export class WebPiano extends LitElement {
  static styles = css`
    :host{
        display: flex;
        --background-color: blue;
        --indicator-color: #EEB0B0;
        height: 140px;
        width: 1000px;
    }

    .piano {
        padding: 30px 1% 0 1%;
        background-color: #7a7a7a;
        border-radius: 1vmin;
        text-align:center;
        overflow: hidden;
        display: flex;
        box-sizing: border-box;
        height: 100%;
        width: 100%;
    }

    .white {
        width: 2%;
        height: 100%;
        background-color: white;
        border: 1px solid #333;
        box-sizing: border-box;
    }

    .black {
        width: 1.2%;
        height: 60%;
        background-color: black;
        border-left: 2px solid #333;
        border-right: 2px solid #333;
        border-bottom: 2px solid #333;
        border-top: 1px solid #333;
        margin-left: -0.6%;
        margin-right: -0.6%;
        z-index: 2;
        box-sizing: border-box;
    }

    .selected{
        background-color: #4a87fa;
    }

    .playingDisplay{
        position: fixed;
        margin-top: -12px;
        font-size: 12px;
    }

    .indicator{
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: var(--indicator-color);
        position: fixed;
        margin-top: -20px;
        
    }

    :host(:focus){
        outline: none;
        --indicator-color: #22FF47;
    }
  `;

  static properties = {
    header: { type: String },
    counter: { type: Number },
  };

  constructor() {
    super();
  }

  firstUpdated() {
    this.header = 'Hey there';
    this.counter = 5;
    this.activeNotes = [];
    this.tabIndex = 0;
    this.KEYBOARD_NOTE_MAP = {
      a: "C4",
      w: "Db4",
      s: "D4",
      e: "Eb4",
      d: "E4",
      f: "F4",
      t: "Gb4",
      g: "G4",
      y: "Ab4",
      h: "A4",
      u: "Bb4",
      j: "B4",
      k: "C5",
      o: "Db5",
      l: "D5",
      p: "Eb5",
      ';': "E5"
    };
    
    this.addEventListener('keydown', this._handleKeyDown);
    this.addEventListener('keyup', this._handleKeyUp);
    this.addEventListener('blur', this._handleBlur);
    navigator.requestMIDIAccess().then(midi => {
        this.midi = midi;
        console.log('midi device initialized');
        midi.inputs.forEach(input => {
            input.onmidimessage = this.handleMIDIMessage;
        });
    }, error => {
        console.log('failed to initalize midi: ${error}');
    });
    this.shadowRoot.querySelectorAll('.key').forEach(key => {
        key.addEventListener('mousedown', () => this.mouseDown(key));
        key.addEventListener('mouseup', () => this.mouseUp(key));
    });
  }

  _handleBlur(event){
    const selected = this.shadowRoot.querySelectorAll('.selected');
    console.log("blur");
    selected.forEach((div) => {
        this.releaseNote(div);
    })
  }

  _handleKeyDown(event){
    console.log("keydown");
    var noteName = this.KEYBOARD_NOTE_MAP[event.key];
    if (this.activeNotes.indexOf(noteName) == -1){
        const pianoNoteDiv = this.shadowRoot.querySelector('div[note='+noteName+']');
        if (pianoNoteDiv){
            this.strikeNote(pianoNoteDiv);            
        }
    }
  }

  mouseDown(key){
      this.strikeNote(key);
  }

  mouseUp(key){
      this.releaseNote(key);
  }

  handleMIDIMessage = (event) => {
      if (this === document.activeElement){
          var data = event.data;
          var midiNote = Note.fromMidi(data[1]);//MIDI_NOTE_MAP[data[1]];
          var strength = data [2];
          const pianoNoteDiv = this.shadowRoot.querySelector('div[note='+midiNote+']');
          if (strength > 0){
              this.strikeNote(pianoNoteDiv);
          }else{
              this.releaseNote(pianoNoteDiv);
          }
      }
  }

  strikeNote(noteDiv){
      if(!noteDiv.classList.contains('selected')){
          const noteName = noteDiv.getAttribute("note");
          noteDiv.classList.add('selected');
          this.activeNotes.push(noteName);
          this.dispatchEvent(new CustomEvent('key-strike', { detail: noteName }));
          this.shadowRoot.querySelector('.playingDisplay').innerHTML = this.activeNotes;
      }
  }

  releaseNote(noteDiv){
      if(noteDiv.classList.contains('selected')){
          noteDiv.classList.remove('selected');
          const noteName = noteDiv.getAttribute("note");
          var index = this.activeNotes.indexOf(noteName);
          this.activeNotes.splice(index,1);
          this.dispatchEvent(new CustomEvent('key-release', { detail: noteName }));
          this.shadowRoot.querySelector('.playingDisplay').innerHTML = this.activeNotes;
      }
  }

  _handleKeyUp(event){
    var noteName = this.KEYBOARD_NOTE_MAP[event.key];
      const pianoNoteDiv = this.shadowRoot.querySelector('div[note='+noteName+']');
      if (pianoNoteDiv){
          this.releaseNote(pianoNoteDiv);            
      }
  }

  __increment() {
    this.counter += 1;
  }

  render() {
    return html`
      <div class="piano">
        <div class = "playingDisplay"></div>
        <div class = "indicator"></div>
        <div note="A0"  class="key white"></div>
        <div note="Bb0" class="key black"></div>
        <div note="B0"  class="key white"></div>
        <div note="C1"  class="key white"></div>
        <div note="Db1" class="key black"></div>
        <div note="D1"  class="key white"></div>
        <div note="Eb1" class="key black"></div>
        <div note="E1"  class="key white"></div>
        <div note="F1"  class="key white"></div>
        <div note="Gb1" class="key black"></div>
        <div note="G1"  class="key white"></div>
        <div note="Ab1" class="key black"></div>
        <div note="A1"  class="key white"></div>
        <div note="Bb1" class="key black"></div>
        <div note="B1"  class="key white"></div>
        <div note="C2"  class="key white"></div>
        <div note="Db2" class="key black"></div>
        <div note="D2"  class="key white"></div>
        <div note="Eb2" class="key black"></div>
        <div note="E2"  class="key white"></div>
        <div note="F2"  class="key white"></div>
        <div note="Gb2" class="key black"></div>
        <div note="G2"  class="key white"></div>
        <div note="Ab2" class="key black"></div>
        <div note="A2"  class="key white"></div>
        <div note="Bb2" class="key black"></div>
        <div note="B2"  class="key white"></div>
        <div note="C3"  class="key white"></div>
        <div note="Db3" class="key black"></div>
        <div note="D3"  class="key white"></div>
        <div note="Eb3" class="key black"></div>
        <div note="E3"  class="key white"></div>
        <div note="F3"  class="key white"></div>
        <div note="Gb3" class="key black"></div>
        <div note="G3"  class="key white"></div>
        <div note="Ab3" class="key black"></div>
        <div note="A3"  class="key white"></div>
        <div note="Bb3" class="key black"></div>
        <div note="B3"  class="key white"></div>
        <div note="C4"  class="key white"></div>
        <div note="Db4" class="key black"></div>
        <div note="D4"  class="key white"></div>
        <div note="Eb4" class="key black"></div>
        <div note="E4"  class="key white"></div>
        <div note="F4"  class="key white"></div>
        <div note="Gb4" class="key black"></div>
        <div note="G4"  class="key white"></div>
        <div note="Ab4" class="key black"></div>
        <div note="A4"  class="key white"></div>
        <div note="Bb4" class="key black"></div>
        <div note="B4"  class="key white"></div>
        <div note="C5"  class="key white"></div>
        <div note="Db5" class="key black"></div>
        <div note="D5"  class="key white"></div>
        <div note="Eb5" class="key black"></div>
        <div note="E5"  class="key white"></div>
        <div note="F5"  class="key white"></div>
        <div note="Gb5" class="key black"></div>
        <div note="G5"  class="key white"></div>
        <div note="Ab5" class="key black"></div>
        <div note="A5"  class="key white"></div>
        <div note="Bb5" class="key black"></div>
        <div note="B5"  class="key white"></div>
        <div note="C6"  class="key white"></div>
        <div note="Db6" class="key black"></div>
        <div note="D6"  class="key white"></div>
        <div note="Eb6" class="key black"></div>
        <div note="E6"  class="key white"></div>
        <div note="F6"  class="key white"></div>
        <div note="Gb6" class="key black"></div>
        <div note="G6"  class="key white"></div>
        <div note="Ab6" class="key black"></div>
        <div note="A6"  class="key white"></div>
        <div note="Bb6" class="key black"></div>
        <div note="B6"  class="key white"></div>
        <div note="C7"  class="key white"></div>
        <div note="Db7" class="key black"></div>
        <div note="D7"  class="key white"></div>
        <div note="Eb7" class="key black"></div>
        <div note="E7"  class="key white"></div>
        <div note="F7"  class="key white"></div>
        <div note="Gb7" class="key black"></div>
        <div note="G7"  class="key white"></div>
        <div note="Ab7" class="key black"></div>
        <div note="A7"  class="key white"></div>
        <div note="Bb7" class="key black"></div>
        <div note="B7"  class="key white"></div>
        <div note="C8"  class="key white"></div>
      </div>
    `;
  }
}
