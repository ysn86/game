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
      const newLevel = Math.floor(lines / 10) + 1;
      if (newLevel !== level) {
        level = newLevel;
        dropInterval = computeInterval(level);
      }
      updateHud();
    }
  }

  function computeInterval(lv) {
    const base = 800;
    return Math.max(80, base * Math.pow(0.82, lv - 1));
  }

  function move(dx) {
    if (!current || gameOver || paused) return;
    if (!collides(current, dx, 0, current.rot)) current.x += dx;
    draw();
  }

  function softDrop() {
    if (!current || gameOver || paused) return;
    if (!collides(current, 0, 1, current.rot)) {
      current.y += 1;
      score += 1;
      updateHud();
    } else {
      lock();
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
    lock();
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
        draw();
        return;
      }
    }
  }

  function lock() {
    merge(current);
    clearLines();
    if (current.y < HIDDEN_ROWS) {
      gameOver = true;
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
    drawHold();
    draw();
  }

  function ghostY(piece) {
    let dy = 0;
    while (!collides(piece, 0, dy + 1, piece.rot)) dy++;
    return piece.y + dy;
  }

  function drawCell(g, x, y, color, alpha) {
    const px = x * CELL;
    const py = y * CELL;
    g.save();
    if (alpha !== undefined) g.globalAlpha = alpha;
    g.fillStyle = color;
    g.fillRect(px, py, CELL, CELL);
    g.fillStyle = 'rgba(255,255,255,.18)';
    g.fillRect(px, py, CELL, Math.max(2, CELL * 0.14));
    g.fillStyle = 'rgba(0,0,0,.22)';
    g.fillRect(px, py + CELL - Math.max(2, CELL * 0.14), CELL, Math.max(2, CELL * 0.14));
    g.strokeStyle = 'rgba(0,0,0,.35)';
    g.lineWidth = 1;
    g.strokeRect(px + .5, py + .5, CELL - 1, CELL - 1);
    g.restore();
  }

  function drawBoardBackground() {
    ctx.fillStyle = COLORS.G;
    ctx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
    ctx.strokeStyle = 'rgba(255,255,255,.04)';
    ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL + .5, 0);
      ctx.lineTo(x * CELL + .5, boardCanvas.height);
      ctx.stroke();
    }
    for (let y = 1; y < ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL + .5);
      ctx.lineTo(boardCanvas.width, y * CELL + .5);
      ctx.stroke();
    }
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
          if (yy >= 0) drawCell(ctx, current.x + c, yy, COLORS[current.type], 0.22);
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
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (!s[r][c]) continue;
        const px = offX + (c - minC) * cell;
        const py = offY + (r - minR) * cell;
        g.fillStyle = COLORS[type];
        g.fillRect(px, py, cell, cell);
        g.fillStyle = 'rgba(255,255,255,.18)';
        g.fillRect(px, py, cell, Math.max(2, cell * 0.14));
        g.fillStyle = 'rgba(0,0,0,.22)';
        g.fillRect(px, py + cell - Math.max(2, cell * 0.14), cell, Math.max(2, cell * 0.14));
        g.strokeStyle = 'rgba(0,0,0,.35)';
        g.strokeRect(px + .5, py + .5, cell - 1, cell - 1);
      }
    }
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

  const KEY = {};
  window.addEventListener('keydown', (e) => {
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
        if (paused) showOverlay('PAUSED', 'Press P to resume');
        else hideOverlay();
        break;
      case 'Enter':
        if (paused) { paused = false; hideOverlay(); }
        break;
    }
  }, { passive: false });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowDown') softDropping = false;
  });

  document.querySelectorAll('.tbtn').forEach((btn) => {
    const act = btn.dataset.act;
    const trigger = (ev) => {
      ev.preventDefault();
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
