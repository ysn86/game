// サウンド（Web Audio APIによるファミコン風BGM・効果音の自前生成）
// 外部音源ファイルは使わず、矩形波・三角波・ノイズをその場で合成する
(function(){
window.RPG = window.RPG || {};

function freq(name){ // 'C#4' → 周波数
  const m = /^([A-G])(#?)(-?\d)$/.exec(name);
  const base = {C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]] + (m[2]?1:0);
  const midi = (parseInt(m[3],10)+1)*12 + base;
  return 440*Math.pow(2,(midi-69)/12);
}

// ---- 楽曲データ ----
// notes: [音名(0=休符), 拍数] / lead=矩形波, bass=三角波
const SONGS = {
  title: { bpm:100,
    lead:[['C4',.5],['E4',.5],['G4',.5],['B4',.5],['C5',2],
          ['A3',.5],['C4',.5],['E4',.5],['G4',.5],['A4',2],
          ['F3',.5],['A3',.5],['C4',.5],['E4',.5],['F4',2],
          ['G3',.5],['B3',.5],['D4',.5],['F4',.5],['G4',2]],
    bass:[['C3',4],['A2',4],['F2',4],['G2',4]] },
  field: { bpm:112,
    lead:[['A4',.5],['B4',.5],['C5',.5],['E5',.5],['D5',.5],['C5',.5],['B4',1],
          ['G4',.5],['A4',.5],['B4',.5],['D5',.5],['C5',.5],['B4',.5],['A4',1],
          ['A4',.5],['B4',.5],['C5',.5],['E5',.5],['G5',.5],['F5',.5],['E5',1],
          ['D5',.5],['E5',.5],['F5',.5],['E5',.5],['D5',.5],['B4',.5],['A4',1]],
    bass:[['A2',1],['E3',1],['A2',1],['E3',1],
          ['G2',1],['D3',1],['G2',1],['D3',1],
          ['F2',1],['C3',1],['F2',1],['C3',1],
          ['E2',1],['B2',1],['E2',1],['B2',1]] },
  town: { bpm:104,
    lead:[['C5',.5],['E5',.5],['G5',.5],['E5',.5],['F5',.5],['E5',.5],['D5',1],
          ['D5',.5],['F5',.5],['A5',.5],['F5',.5],['G5',.5],['F5',.5],['E5',1],
          ['E5',.5],['D5',.5],['C5',.5],['D5',.5],['E5',.5],['F5',.5],['G5',1],
          ['A5',.5],['G5',.5],['F5',.5],['D5',.5],['E5',.5],['C5',1.5]],
    bass:[['C3',1],['G2',1],['C3',1],['G2',1],
          ['F2',1],['C3',1],['F2',1],['C3',1],
          ['C3',1],['G2',1],['E3',1],['G2',1],
          ['G2',1],['D3',1],['G2',1],['C3',1]] },
  cave: { bpm:84,
    lead:[['D4',1],['F4',1],['E4',1],['C4',1],
          ['D4',1],['F4',1],['A4',1],['G4',1],
          ['F4',1],['E4',1],['D4',1],['C#4',1],
          ['D4',2],[0,2]],
    bass:[['D2',2],['A2',2],['C2',2],['G2',2],
          ['A#2',2],['F2',2],['A2',2],['A2',2]] },
  battle: { bpm:152,
    lead:[['A4',.5],['A4',.5],['C5',.5],['A4',.5],['D5',.5],['C5',.5],['A4',.5],['G4',.5],
          ['A4',.5],['A4',.5],['C5',.5],['E5',.5],['D5',.5],['C5',.5],['D5',.5],['E5',.5],
          ['F5',.5],['E5',.5],['D5',.5],['C5',.5],['B4',.5],['C5',.5],['D5',.5],['B4',.5],
          ['A4',.5],['G4',.5],['A4',.5],['B4',.5],['C5',.5],['B4',.5],['A4',.5],['G#4',.5]],
    bass:[['A2',.5],['A2',.5],['A2',.5],['A2',.5],['A2',.5],['A2',.5],['G2',.5],['G2',.5],
          ['A2',.5],['A2',.5],['A2',.5],['A2',.5],['A2',.5],['A2',.5],['G2',.5],['G2',.5],
          ['F2',.5],['F2',.5],['F2',.5],['F2',.5],['G2',.5],['G2',.5],['G2',.5],['G2',.5],
          ['E2',.5],['E2',.5],['E2',.5],['E2',.5],['E2',.5],['E2',.5],['G#2',.5],['G#2',.5]] },
  ending: { bpm:88,
    lead:[['E5',1],['D5',1],['C5',1],['G4',1],
          ['A4',1],['C5',1],['G4',2],
          ['F4',1],['G4',1],['A4',1],['C5',1],
          ['D5',1],['C5',1],['C5',2]],
    bass:[['C3',2],['G2',2],['A2',2],['E2',2],
          ['F2',2],['C3',2],['G2',2],['C3',2]] },
};

// ジングル: [音名, 開始秒, 長さ秒]
const JINGLES = {
  victory: [['G4',0,.13],['C5',.13,.13],['E5',.26,.13],['G5',.39,.45],['E5',.84,.14],['G5',.98,.6]],
  levelup: [['C5',0,.1],['D5',.1,.1],['E5',.2,.1],['G5',.3,.1],
            ['C6',.4,.7],['C5',.4,.7],['E5',.4,.7],['G5',.4,.7]],
};

class AudioSys {
  constructor(){
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.want = null;   // 起動前に指定されたBGM
    this.bgm = null;
  }

  // ブラウザの自動再生制限のため、最初のキー/タッチ操作で初期化する
  unlock(){
    if(this.ctx){
      if(this.ctx.state==='suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    if(this.want) this.playBgm(this.want, true);
  }
  toggleMute(){
    this.muted = !this.muted;
    if(this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  tone(type, f0, t0, dur, vol, f1){
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type;
    o.frequency.setValueAtTime(f0, t0);
    if(f1) o.frequency.exponentialRampToValueAtTime(Math.max(20,f1), t0+dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0+0.012);
    g.gain.setValueAtTime(vol, t0+dur*0.65);
    g.gain.linearRampToValueAtTime(0.0001, t0+dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0+dur+0.03);
  }
  noise(t0, dur, vol, fc){
    const n = Math.floor(this.ctx.sampleRate*dur)+1;
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<n;i++) d[i] = Math.random()*2-1;
    const src=this.ctx.createBufferSource(); src.buffer=buf;
    const f=this.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=fc||2000;
    const g=this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.linearRampToValueAtTime(0.0001, t0+dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0); src.stop(t0+dur+0.02);
  }

  // ---- BGM ----
  playBgm(name, force){
    this.want = name;
    if(!this.ctx) return;
    if(!force && this.bgm && this.bgm.name===name) return;
    this.stopBgm();
    const song = SONGS[name];
    if(!song) return;
    const beat = 60/song.bpm;
    const mk=(notes,type,vol)=>({
      seq: notes.map(([n,b])=>({f:n?freq(n):0, d:b*beat})),
      type, vol, idx:0, t:this.ctx.currentTime+0.06,
    });
    const tracks=[ mk(song.lead,'square',0.055), mk(song.bass,'triangle',0.09) ];
    const tick=()=>{
      if(!this.ctx) return;
      const horizon = this.ctx.currentTime + 0.25;
      tracks.forEach(tr=>{
        while(tr.t < horizon){
          const n = tr.seq[tr.idx];
          if(n.f) this.tone(tr.type, n.f, tr.t, Math.min(n.d*0.92, n.d), tr.vol);
          tr.t += n.d;
          tr.idx = (tr.idx+1)%tr.seq.length;
        }
      });
    };
    tick();
    this.bgm = { name, timer:setInterval(tick, 80) };
  }
  stopBgm(){
    if(this.bgm){ clearInterval(this.bgm.timer); this.bgm=null; }
  }

  // ---- ジングル（勝利・レベルアップ）: BGMを止めて演奏 ----
  jingle(name){
    this.want = null;
    if(!this.ctx) return;
    this.lastJingle = name;
    this.stopBgm();
    const t0=this.ctx.currentTime+0.03;
    (JINGLES[name]||[]).forEach(([n,at,dur])=>{
      this.tone('square', freq(n), t0+at, dur, 0.07);
      this.tone('triangle', freq(n)/2, t0+at, dur, 0.08);
    });
  }

  // ---- 効果音 ----
  sfx(name){
    if(!this.ctx) return;
    this.lastSfx = name;
    const t=this.ctx.currentTime+0.01;
    switch(name){
      case 'hit':       // 攻撃ヒット
        this.noise(t,0.13,0.35,1400);
        this.tone('square',190,t,0.13,0.22,70);
        break;
      case 'crit':      // 会心の一撃
        this.noise(t,0.24,0.5,2200);
        this.tone('square',280,t,0.26,0.28,45);
        break;
      case 'miss':      // ミス・かわす
        this.noise(t,0.16,0.16,5000);
        break;
      case 'phit':      // プレイヤー被ダメージ
        this.tone('square',120,t,0.22,0.26,45);
        this.noise(t,0.16,0.3,700);
        break;
      case 'spell':     // 攻撃呪文
        this.tone('square',330,t,0.09,0.18);
        this.tone('square',495,t+0.08,0.09,0.18);
        this.tone('square',740,t+0.16,0.16,0.18);
        this.noise(t+0.16,0.2,0.15,3000);
        break;
      case 'heal':      // 回復
        this.tone('sine',523,t,0.1,0.2);
        this.tone('sine',659,t+0.09,0.1,0.2);
        this.tone('sine',784,t+0.18,0.24,0.2);
        break;
      case 'encounter': // エンカウント
        for(let i=0;i<3;i++){
          this.tone('square',220,t+i*0.11,0.06,0.2);
          this.tone('square',311,t+i*0.11+0.055,0.06,0.2);
        }
        break;
      case 'flee':      // 逃走
        this.tone('square',620,t,0.3,0.16,140);
        break;
    }
  }
}

RPG.audio = new AudioSys();
})();
