(() => {
  'use strict';

  const COLS = 10;
  const ROWS = 20;
  const HIDDEN_ROWS = 2;
  const TOTAL_ROWS = ROWS + HIDDEN_ROWS;

  const COLORS = {
    I: '#39d0ff',
    O: '#ffd93b',
    T: '#c07bff',
    S: '#5cea7a',
    Z: '#ff6478',
    J: '#5c8dff',
    L: '#ffa24b',
    G: '#2a3373',
  };

  const SHAPES = {
    I: [
      [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
      [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
    ],
    O: [
      [[1,1],[1,1]],
      [[1,1],[1,1]],
      [[1,1],[1,1]],
      [[1,1],[1,1]],
    ],
    T: [
      [[0,1,0],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,1],[0,1,0]],
      [[0,1,0],[1,1,0],[0,1,0]],
    ],
    S: [
      [[0,1,1],[1,1,0],[0,0,0]],
      [[0,1,0],[0,1,1],[0,0,1]],
      [[0,0,0],[0,1,1],[1,1,0]],
      [[1,0,0],[1,1,0],[0,1,0]],
    ],
    Z: [
      [[1,1,0],[0,1,1],[0,0,0]],
      [[0,0,1],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,0],[0,1,1]],
      [[0,1,0],[1,1,0],[1,0,0]],
    ],
    J: [
      [[1,0,0],[1,1,1],[0,0,0]],
      [[0,1,1],[0,1,0],[0,1,0]],
      [[0,0,0],[1,1,1],[0,0,1]],
      [[0,1,0],[0,1,0],[1,1,0]],
    ],
    L: [
      [[0,0,1],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,0],[0,1,1]],
      [[0,0,0],[1,1,1],[1,0,0]],
      [[1,1,0],[0,1,0],[0,1,0]],
    ],
  };

  const KICKS_JLSTZ = {
    '0>1': [[0,0],[-1,0],[-1, 1],[0,-2],[-1,-2]],
    '1>0': [[0,0],[ 1,0],[ 1,-1],[0, 2],[ 1, 2]],
    '1>2': [[0,0],[ 1,0],[ 1,-1],[0, 2],[ 1, 2]],
    '2>1': [[0,0],[-1,0],[-1, 1],[0,-2],[-1,-2]],
    '2>3': [[0,0],[ 1,0],[ 1, 1],[0,-2],[ 1,-2]],
    '3>2': [[0,0],[-1,0],[-1,-1],[0, 2],[-1, 2]],
    '3>0': [[0,0],[-1,0],[-1,-1],[0, 2],[-1, 2]],
    '0>3': [[0,0],[ 1,0],[ 1, 1],[0,-2],[ 1,-2]],
  };
  const KICKS_I = {
    '0>1': [[0,0],[-2,0],[ 1,0],[-2,-1],[ 1, 2]],
    '1>0': [[0,0],[ 2,0],[-1,0],[ 2, 1],[-1,-2]],
    '1>2': [[0,0],[-1,0],[ 2,0],[-1, 2],[ 2,-1]],
    '2>1': [[0,0],[ 1,0],[-2,0],[ 1,-2],[-2, 1]],
    '2>3': [[0,0],[ 2,0],[-1,0],[ 2, 1],[-1,-2]],
    '3>2': [[0,0],[-2,0],[ 1,0],[-2,-1],[ 1, 2]],
    '3>0': [[0,0],[ 1,0],[-2,0],[ 1,-2],[-2, 1]],
    '0>3': [[0,0],[-1,0],[ 2,0],[-1, 2],[ 2,-1]],
  };
  const TYPES = ['I','O','T','S','Z','J','L'];

  const Sound = (() => {
    let actx = null, master = null, muted = false;
    const BGM_BPM = 140;
    const BGM_STEP = 60 / BGM_BPM / 2;
    const BGM_BASS = [110,0,0,0, 87.31,0,0,0, 130.81,0,0,0, 98,0,0,0];
    const BGM_LEAD = [440,523.25,659.25,523.25, 349.23,440,523.25,440, 261.63,329.63,392,329.63, 392,493.88,587.33,493.88];
    let bgmTimer = null, bgmStep = 0, bgmNextTime = 0, bgmPlaying = false;
    function ensure() {
      if (actx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = new AC();
      master = actx.createGain();
      master.gain.value = 0.7;
      const comp = actx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 6;
      master.connect(comp);
      comp.connect(actx.destination);
    }
    function tone(opts) {
      if (muted) return;
      ensure(); if (!actx) return;
      const {
        freq, type = 'sine', dur = 0.1, vol = 0.3,
        freqEnd = null, attack = 0.004, delay = 0,
      } = opts;
      const now = actx.currentTime + delay;
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (freqEnd !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), now + dur);
      }
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(vol, now + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain); gain.connect(master);
      osc.start(now); osc.stop(now + dur + 0.02);
    }
    function noise(opts) {
      if (muted) return;
      ensure(); if (!actx) return;
      const { dur = 0.1, vol = 0.25, filterFreq = 1500, delay = 0 } = opts;
      const now = actx.currentTime + delay;
      const n = Math.max(1, Math.floor(actx.sampleRate * dur));
      const buf = actx.createBuffer(1, n, actx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
      const src = actx.createBufferSource();
      src.buffer = buf;
      const filter = actx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      const gain = actx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(vol, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      src.connect(filter); filter.connect(gain); gain.connect(master);
      src.start(now); src.stop(now + dur + 0.02);
    }
    function bgmTick() {
      if (!actx) return;
      const lookahead = 0.12;
      while (bgmNextTime < actx.currentTime + lookahead) {
        const i = bgmStep % 16;
        const b = BGM_BASS[i];
        const l = BGM_LEAD[i];
        const delay = Math.max(0, bgmNextTime - actx.currentTime);
        if (b) tone({ freq: b, type: 'sine', dur: BGM_STEP * 3.6, vol: 0.14, delay, attack: 0.02 });
        if (l) tone({ freq: l, type: 'triangle', dur: BGM_STEP * 0.85, vol: 0.09, delay, attack: 0.006 });
        noise({ dur: 0.02, vol: 0.025, filterFreq: 7000, delay });
        bgmNextTime += BGM_STEP;
        bgmStep++;
      }
    }
    function bgmStart() {
      if (bgmPlaying || muted) return;
      ensure();
      if (!actx) return;
      bgmPlaying = true;
      bgmStep = 0;
      bgmNextTime = actx.currentTime + 0.06;
      bgmTimer = setInterval(bgmTick, 25);
    }
    function bgmStop() {
      bgmPlaying = false;
      if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
    }
    return {
      move()   { tone({ freq: 320, type: 'triangle', dur: 0.07, vol: 0.28 }); },
      rotate() { tone({ freq: 520, type: 'triangle', dur: 0.09, vol: 0.34 }); },
      soft()   { tone({ freq: 240, type: 'sine', dur: 0.05, vol: 0.22 }); },
      hard() {
        tone({ freq: 220, freqEnd: 90, type: 'square', dur: 0.16, vol: 0.4 });
        noise({ dur: 0.1, vol: 0.32, filterFreq: 1100 });
      },
      lock()   { noise({ dur: 0.06, vol: 0.24, filterFreq: 1700 }); },
      hold()   { tone({ freq: 380, freqEnd: 200, type: 'sine', dur: 0.12, vol: 0.3 }); },
      clear(count) {
        const base = 523.25;
        const scale = [1, 1.25, 1.5, 2.0, 2.5];
        const n = Math.min(scale.length, count + 1);
        for (let i = 0; i < n; i++) {
          tone({ freq: base * scale[i], type: 'triangle', dur: 0.22, vol: 0.36, delay: i * 0.055 });
        }
        if (count >= 4) {
          tone({ freq: base * 3, type: 'sine', dur: 0.35, vol: 0.4, delay: 0.22 });
          noise({ dur: 0.25, vol: 0.2, filterFreq: 4000, delay: 0.22 });
        }
      },
      levelUp() {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          tone({ freq: f, type: 'triangle', dur: 0.18, vol: 0.38, delay: i * 0.09 });
        });
      },
      gameOver() {
        [440, 349.23, 261.63, 196].forEach((f, i) => {
          tone({ freq: f, type: 'sawtooth', dur: 0.3, vol: 0.34, delay: i * 0.13 });
        });
        tone({ freq: 130.81, type: 'sine', dur: 0.6, vol: 0.3, delay: 0.5, attack: 0.02 });
        noise({ dur: 0.5, vol: 0.22, filterFreq: 500, delay: 0.5 });
      },
      bgmStart,
      bgmStop,
      isBgmPlaying() { return bgmPlaying; },
      isReady() { return !!(actx && actx.state === 'running'); },
      resume() {
        ensure();
        if (actx && actx.state === 'suspended') actx.resume();
      },
      toggle() { muted = !muted; if (!muted) this.resume(); return muted; },
      isMuted() { return muted; },
    };
  })();

  const boardCanvas = document.getElementById('board');
  const ctx = boardCanvas.getContext('2d');
  const nextCanvas = document.getElementById('next');
  const nctx = nextCanvas.getContext('2d');
  const holdCanvas = document.getElementById('hold');
  const hctx = holdCanvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const linesEl = document.getElementById('lines');
  const levelEl = document.getElementById('level');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlaySub = document.getElementById('overlaySub');

  const CELL = boardCanvas.width / COLS;

  let grid, current, queue, hold, canHold;
  let score, lines, level;
  let dropInterval, dropAcc, lastTime;
  let gameOver, paused;
  let softDropping;
  let rafId = null;

  function createGrid() {
    const g = [];
    for (let r = 0; r < TOTAL_ROWS; r++) {
      g.push(new Array(COLS).fill(null));
    }
    return g;
  }

  function newBag() {
    const bag = TYPES.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
  }

  function refillQueue() {
    while (queue.length < 5) {
      queue.push(...newBag());
    }
  }

  function spawn(type) {
    const t = type || queue.shift();
    refillQueue();
    const shape = SHAPES[t];
    const size = shape[0].length;
    const piece = {
      type: t,
      rot: 0,
      shape,
      x: Math.floor((COLS - size) / 2),
      y: HIDDEN_ROWS - (t === 'I' ? 2 : 1),
    };
    if (collides(piece, 0, 0, piece.rot)) {
      gameOver = true;
      Sound.bgmStop();
      Sound.gameOver();
      showOverlay('GAME OVER', `SCORE ${score}  /  Press ENTER for restart`);
    }
    return piece;
  }

  function collides(piece, dx, dy, rot) {
    const s = piece.shape[rot];
    for (let r = 0; r < s.length; r++) {
      for (let c = 0; c < s[r].length; c++) {
        if (!s[r][c]) continue;
        const nx = piece.x + c + dx;
        const ny = piece.y + r + dy;
        if (nx < 0 || nx >= COLS || ny >= TOTAL_ROWS) return true;
        if (ny < 0) continue;
        if (grid[ny][nx]) return true;
      }
    }
    return false;
  }

  function merge(piece) {
    const s = piece.shape[piece.rot];
    for (let r = 0; r < s.length; r++) {
      for (let c = 0; c < s[r].length; c++) {
        if (!s[r][c]) continue;
        const ny = piece.y + r;
        const nx = piece.x + c;
        if (ny >= 0 && ny < TOTAL_ROWS && nx >= 0 && nx < COLS) {
          grid[ny][nx] = piece.type;
        }
      }
    }
  }

  function clearLines() {
    let cleared = 0;
    for (let r = TOTAL_ROWS - 1; r >= 0; r--) {
      if (grid[r].every(v => v !== null)) {
        grid.splice(r, 1);
        grid.unshift(new Array(COLS).fill(null));
        cleared++;
        r++;
      }
    }
    if (cleared > 0) {
      const table = [0, 100, 300, 500, 800];
      score += table[cleared] * level;
      lines += cleared;
      const prevLevel = level;
      const newLevel = Math.floor(lines / 10) + 1;
      if (newLevel !== level) {
        level = newLevel;
        dropInterval = computeInterval(level);
      }
      updateHud();
      Sound.clear(cleared);
      if (level > prevLevel) Sound.levelUp();
    }
  }

  function computeInterval(lv) {
    const base = 800;
    return Math.max(80, base * Math.pow(0.82, lv - 1));
  }

  function move(dx) {
    if (!current || gameOver || paused) return;
    if (!collides(current, dx, 0, current.rot)) { current.x += dx; Sound.move(); }
    draw();
  }

  function softDrop() {
    if (!current || gameOver || paused) return;
    if (!collides(current, 0, 1, current.rot)) {
      current.y += 1;
      score += 1;
      updateHud();
      Sound.soft();
    } else {
      lock(false);
    }
    draw();
  }

  function hardDrop() {
    if (!current || gameOver || paused) return;
    let dist = 0;
    while (!collides(current, 0, 1, current.rot)) {
      current.y += 1;
      dist++;
    }
    score += dist * 2;
    updateHud();
    Sound.hard();
    lock(true);
    draw();
  }

  function rotate(dir) {
    if (!current || gameOver || paused) return;
    const from = current.rot;
    const to = (from + (dir > 0 ? 1 : 3)) % 4;
    const kicks = current.type === 'I' ? KICKS_I : (current.type === 'O' ? {[from+'>'+to]:[[0,0]]} : KICKS_JLSTZ);
    const set = kicks[from + '>' + to] || [[0,0]];
    for (const [kx, ky] of set) {
      if (!collides(current, kx, -ky, to)) {
        current.x += kx;
        current.y += -ky;
        current.rot = to;
        Sound.rotate();
        draw();
        return;
      }
    }
  }

  function lock(silent) {
    merge(current);
    if (!silent) Sound.lock();
    clearLines();
    if (current.y < HIDDEN_ROWS) {
      gameOver = true;
      Sound.bgmStop();
      Sound.gameOver();
      showOverlay('GAME OVER', `SCORE ${score}  /  Press ENTER for restart`);
      return;
    }
    canHold = true;
    current = spawn();
    dropAcc = 0;
  }

  function doHold() {
    if (!current || gameOver || paused || !canHold) return;
    const t = current.type;
    if (hold === null) {
      hold = t;
      current = spawn();
    } else {
      const swap = hold;
      hold = t;
      current = spawn(swap);
    }
    canHold = false;
    dropAcc = 0;
    Sound.hold();
    drawHold();
    draw();
  }

  function ghostY(piece) {
    let dy = 0;
    while (!collides(piece, 0, dy + 1, piece.rot)) dy++;
    return piece.y + dy;
  }

  function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(hex, target, amt) {
    const [r, g, b] = hexToRgb(hex);
    const rr = Math.round(r + (target[0] - r) * amt);
    const gg = Math.round(g + (target[1] - g) * amt);
    const bb = Math.round(b + (target[2] - b) * amt);
    return `rgb(${rr}, ${gg}, ${bb})`;
  }
  const lighten = (c, a) => mix(c, [255, 255, 255], a);
  const darken  = (c, a) => mix(c, [0, 0, 0], a);

  function roundRectPath(g, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    g.beginPath();
    if (g.roundRect) { g.roundRect(x, y, w, h, rr); return; }
    g.moveTo(x + rr, y);
    g.lineTo(x + w - rr, y);
    g.arcTo(x + w, y, x + w, y + rr, rr);
    g.lineTo(x + w, y + h - rr);
    g.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    g.lineTo(x + rr, y + h);
    g.arcTo(x, y + h, x, y + h - rr, rr);
    g.lineTo(x, y + rr);
    g.arcTo(x, y, x + rr, y, rr);
    g.closePath();
  }

  function drawCell(g, x, y, color, size) {
    const CS = size || CELL;
    const px = x * CS;
    const py = y * CS;
    const inset = Math.max(1, CS * 0.06);
    const r = Math.max(2, CS * 0.22);
    const w = CS - inset * 2;
    const h = CS - inset * 2;

    g.save();
    g.shadowColor = color;
    g.shadowBlur = CS * 0.45;
    const grad = g.createLinearGradient(px, py, px + CS, py + CS);
    grad.addColorStop(0, lighten(color, 0.45));
    grad.addColorStop(0.55, color);
    grad.addColorStop(1, darken(color, 0.4));
    g.fillStyle = grad;
    roundRectPath(g, px + inset, py + inset, w, h, r);
    g.fill();
    g.restore();

    g.save();
    g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.lineWidth = Math.max(1, CS * 0.06);
    roundRectPath(g, px + inset * 2, py + inset * 2, w - inset * 2, h - inset * 2, r * 0.65);
    g.stroke();
    g.restore();

    g.save();
    g.globalAlpha = 0.5;
    const shine = g.createRadialGradient(
      px + CS * 0.32, py + CS * 0.28, CS * 0.02,
      px + CS * 0.32, py + CS * 0.28, CS * 0.35
    );
    shine.addColorStop(0, 'rgba(255,255,255,0.9)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = shine;
    roundRectPath(g, px + inset, py + inset, w, h, r);
    g.fill();
    g.restore();
  }

  function drawGhost(g, x, y, color) {
    const px = x * CELL, py = y * CELL;
    const r = Math.max(2, CELL * 0.22);
    const inset = Math.max(2, CELL * 0.12);
    g.save();
    g.strokeStyle = color;
    g.globalAlpha = 0.55;
    g.lineWidth = Math.max(1.5, CELL * 0.08);
    g.setLineDash([Math.max(3, CELL * 0.18), Math.max(2, CELL * 0.12)]);
    roundRectPath(g, px + inset, py + inset, CELL - inset * 2, CELL - inset * 2, r * 0.7);
    g.stroke();
    g.setLineDash([]);
    g.globalAlpha = 0.08;
    g.fillStyle = color;
    g.fill();
    g.restore();
  }

  function drawBoardBackground() {
    const W = boardCanvas.width, H = boardCanvas.height;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#151d47');
    bg.addColorStop(1, '#0d1330');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL + .5, 0);
      ctx.lineTo(x * CELL + .5, H);
      ctx.stroke();
    }
    for (let y = 1; y < ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL + .5);
      ctx.lineTo(W, y * CELL + .5);
      ctx.stroke();
    }
    const vign = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75);
    vign.addColorStop(0, 'rgba(0,0,0,0)');
    vign.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, W, H);
  }

  function draw() {
    drawBoardBackground();
    for (let r = HIDDEN_ROWS; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = grid[r][c];
        if (v) drawCell(ctx, c, r - HIDDEN_ROWS, COLORS[v]);
      }
    }
    if (current && !gameOver) {
      const gy = ghostY(current);
      const s = current.shape[current.rot];
      for (let r = 0; r < s.length; r++) {
        for (let c = 0; c < s[r].length; c++) {
          if (!s[r][c]) continue;
          const yy = gy + r - HIDDEN_ROWS;
          if (yy >= 0) drawGhost(ctx, current.x + c, yy, COLORS[current.type]);
        }
      }
      for (let r = 0; r < s.length; r++) {
        for (let c = 0; c < s[r].length; c++) {
          if (!s[r][c]) continue;
          const yy = current.y + r - HIDDEN_ROWS;
          if (yy >= 0) drawCell(ctx, current.x + c, yy, COLORS[current.type]);
        }
      }
    }
    drawNext();
  }

  function drawMini(g, canvas, type) {
    g.clearRect(0, 0, canvas.width, canvas.height);
    if (!type) return;
    const s = SHAPES[type][0];
    let minR = s.length, maxR = -1, minC = s[0].length, maxC = -1;
    for (let r = 0; r < s.length; r++) {
      for (let c = 0; c < s[r].length; c++) {
        if (s[r][c]) {
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
        }
      }
    }
    const w = maxC - minC + 1;
    const h = maxR - minR + 1;
    const cell = Math.min(canvas.width / (w + 2), canvas.height / (h + 2));
    const offX = (canvas.width - w * cell) / 2;
    const offY = (canvas.height - h * cell) / 2;
    g.save();
    g.translate(offX, offY);
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (!s[r][c]) continue;
        drawCell(g, c - minC, r - minR, COLORS[type], cell);
      }
    }
    g.restore();
  }

  function drawNext() { drawMini(nctx, nextCanvas, queue[0]); }
  function drawHold() { drawMini(hctx, holdCanvas, hold); }

  function updateHud() {
    scoreEl.textContent = String(score);
    linesEl.textContent = String(lines);
    levelEl.textContent = String(level);
  }

  function showOverlay(title, sub) {
    overlayTitle.textContent = title;
    overlaySub.textContent = sub;
    overlay.classList.remove('hidden');
  }
  function hideOverlay() { overlay.classList.add('hidden'); }

  function reset() {
    grid = createGrid();
    queue = [];
    refillQueue();
    hold = null;
    canHold = true;
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = computeInterval(level);
    dropAcc = 0;
    lastTime = 0;
    gameOver = false;
    paused = false;
    softDropping = false;
    current = spawn();
    updateHud();
    drawHold();
    draw();
    hideOverlay();
    Sound.bgmStop();
    if (Sound.isReady() && !Sound.isMuted() && !gameOver) Sound.bgmStart();
  }

  function loop(t) {
    if (!lastTime) lastTime = t;
    const dt = t - lastTime;
    lastTime = t;
    if (!gameOver && !paused) {
      const interval = softDropping ? Math.min(60, dropInterval) : dropInterval;
      dropAcc += dt;
      while (dropAcc >= interval) {
        dropAcc -= interval;
        if (!collides(current, 0, 1, current.rot)) {
          current.y += 1;
          if (softDropping) { score += 1; updateHud(); }
        } else {
          lock();
          if (gameOver) break;
        }
      }
      draw();
    }
    rafId = requestAnimationFrame(loop);
  }

  const soundBtn = document.getElementById('soundBtn');
  function updateSoundBtn() {
    if (!soundBtn) return;
    soundBtn.textContent = Sound.isMuted() ? '♪ OFF' : '♪ ON';
    soundBtn.setAttribute('aria-pressed', String(Sound.isMuted()));
  }
  function startAudio() {
    Sound.resume();
    if (!gameOver && !paused && !Sound.isMuted()) Sound.bgmStart();
  }
  function applyMuteToBgm() {
    if (Sound.isMuted()) Sound.bgmStop();
    else if (!gameOver && !paused) Sound.bgmStart();
  }

  if (soundBtn) {
    updateSoundBtn();
    soundBtn.addEventListener('click', (e) => {
      e.preventDefault();
      Sound.resume();
      Sound.toggle();
      updateSoundBtn();
      applyMuteToBgm();
    });
  }

  window.addEventListener('keydown', (e) => {
    startAudio();
    if (['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' ','Space'].includes(e.key)) e.preventDefault();
    if (gameOver) {
      if (e.key === 'Enter') reset();
      return;
    }
    switch (e.key) {
      case 'ArrowLeft': move(-1); break;
      case 'ArrowRight': move(1); break;
      case 'ArrowDown': softDropping = true; break;
      case 'ArrowUp':
      case 'x': case 'X': rotate(1); break;
      case 'z': case 'Z': rotate(-1); break;
      case ' ': hardDrop(); break;
      case 'c': case 'C': case 'Shift': doHold(); break;
      case 'p': case 'P':
        paused = !paused;
        if (paused) { showOverlay('PAUSED', 'Press P to resume'); Sound.bgmStop(); }
        else { hideOverlay(); if (!Sound.isMuted()) Sound.bgmStart(); }
        break;
      case 'm': case 'M':
        Sound.toggle(); updateSoundBtn();
        applyMuteToBgm();
        break;
      case 'Enter':
        if (paused) { paused = false; hideOverlay(); if (!Sound.isMuted()) Sound.bgmStart(); }
        break;
    }
  }, { passive: false });
  window.addEventListener('pointerdown', () => startAudio(), { once: true });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowDown') softDropping = false;
  });

  document.querySelectorAll('.tbtn').forEach((btn) => {
    const act = btn.dataset.act;
    const trigger = (ev) => {
      ev.preventDefault();
      startAudio();
      if (gameOver) { reset(); return; }
      switch (act) {
        case 'left': move(-1); break;
        case 'right': move(1); break;
        case 'rotate': rotate(1); break;
        case 'down': softDrop(); break;
        case 'drop': hardDrop(); break;
        case 'hold': doHold(); break;
      }
    };
    btn.addEventListener('click', trigger);
    btn.addEventListener('touchstart', trigger, { passive: false });
  });

  overlay.addEventListener('click', () => { if (gameOver) reset(); });

  reset();
  rafId = requestAnimationFrame(loop);
})();
