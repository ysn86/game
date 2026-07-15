// キーボード & タッチ入力
(function(){
window.RPG = window.RPG || {};

const KEYMAP = {
  ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right',
  w:'up', s:'down', a:'left', d:'right',
  z:'a', Z:'a', Enter:'a', ' ':'a',
  x:'b', X:'b', Escape:'b',
};

class Input {
  constructor(){
    this.held = new Set();
    this.listeners = [];
  }
  attach(){
    window.addEventListener('keydown', e=>{
      const b = KEYMAP[e.key];
      if(!b) return;
      e.preventDefault();
      if(!e.repeat){ this.held.add(b); this.emit(b); }
    });
    window.addEventListener('keyup', e=>{
      const b = KEYMAP[e.key];
      if(b) this.held.delete(b);
    });
    window.addEventListener('blur', ()=> this.held.clear());
  }
  bindTouch(el, btn){
    el.addEventListener('pointerdown', e=>{
      e.preventDefault();
      this.held.add(btn); this.emit(btn);
    });
    ['pointerup','pointerleave','pointercancel'].forEach(ev=>
      el.addEventListener(ev, ()=> this.held.delete(btn)));
    el.addEventListener('contextmenu', e=>e.preventDefault());
  }
  emit(b){ this.listeners.slice().forEach(fn=>fn(b)); }
  onPress(fn){ this.listeners.push(fn); }
  isHeld(b){ return this.held.has(b); }
  heldDir(){
    for(const d of ['up','down','left','right']) if(this.held.has(d)) return d;
    return null;
  }
}

RPG.Input = Input;
})();
