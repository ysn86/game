// ゲーム本体（フィールド・イベント・メニュー・進行管理）
(function(){
window.RPG = window.RPG || {};

const TILE = 32;           // 画面上のタイルサイズ
const VIEW_W = 480, VIEW_H = 448;
const STEP_SPEED = 5.5;    // タイル/秒（処理落ちしても dt 基準で一定）

const DIRV = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };

class Game {
  constructor(canvas, input){
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.g.imageSmoothingEnabled = false;
    this.input = input;
    this.ui = new RPG.UI();
    this.mode = 'title';   // title | field | battle | ending
    this.state = null;
    this.map = null;
    this.step = null;
    this.busy = false;
    this.battle = null;
    this.time = 0;
    this.fadeAlpha = 0;
    this.whiteFlash = false;
    this.hurtFlash = 0;

    this.scripts = {
      king: this.scriptKing,
      inn: this.scriptInn,
      weaponShop: this.scriptWeaponShop,
      itemShop: this.scriptItemShop,
    };

    // 動作確認用フック
    this.debug = {
      tp: (m,x,y)=>{ this.loadMap(m); this.state.x=x; this.state.y=y; },
      lvl: n=>{
        const s=this.state;
        s.level=n; s.exp=RPG.DB.LEVELS[n-1].exp;
        s.hp=RPG.maxhp(s); s.mp=RPG.maxmp(s);
        RPG.DB.LEVELS.slice(0,n).forEach(L=>{ if(L.learn && !s.spells.includes(L.learn)) s.spells.push(L.learn); });
      },
      gold: n=>{ this.state.gold=n; },
      give: id=>RPG.addItem(this.state,id),
      equip:(w,a)=>{ this.state.weapon=w; this.state.armor=a;
        if(!this.state.weapons.includes(w))this.state.weapons.push(w);
        if(!this.state.armors.includes(a))this.state.armors.push(a); },
      battle: id=>this.encounterFlow(id),
    };
  }

  start(){
    this.input.attach();
    this.input.onPress(b=>{
      if(this.ui.active){ this.ui.handlePress(b); return; }
      if(this.mode!=='field' || this.busy || this.step) return;
      if(b==='a') this.interactFlow();
      else if(b==='b') this.menuFlow();
    });
    this.titleFlow(true);
    let last = performance.now();
    const loop = t=>{
      const dt = Math.min(0.05,(t-last)/1000); last=t;
      this.update(dt); this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
  bgmForMap(){
    const t=this.map ? this.map.theme : 'field';
    return t==='town' ? 'town' : t==='cave' ? 'cave' : 'field';
  }
  async fadeOut(){ for(let a=0;a<=1.01;a+=0.12){ this.fadeAlpha=Math.min(1,a); await this.sleep(16);} }
  async fadeIn(){ for(let a=1;a>=0;a-=0.12){ this.fadeAlpha=Math.max(0,a); await this.sleep(16);} this.fadeAlpha=0; }

  // ================= マップ =================
  loadMap(name){
    this.map = RPG.MAPS[name];
    if(this.state) this.state.map = name;
  }
  tileCharAt(x,y){
    if(!this.map || y<0||y>=this.map.h||x<0||x>=this.map.w) return '#';
    return this.map.tiles[y][x];
  }
  tileNameAt(x,y){
    const ch = this.tileCharAt(x,y);
    if(ch==='D' && this.state && this.state.flags.door) return 'floor';
    return RPG.tileName(ch, this.map.theme);
  }
  npcAt(x,y){ return (this.map.npcs||[]).find(n=>n.x===x&&n.y===y); }
  chestAt(x,y){ return (this.map.chests||[]).find(c=>c.x===x&&c.y===y); }
  bossAt(x,y){
    return this.map.boss && !this.state.flags.boss &&
      this.map.boss.x===x && this.map.boss.y===y;
  }
  walkable(x,y){
    if(y<0||y>=this.map.h||x<0||x>=this.map.w) return false;
    if(RPG.SOLID.has(this.tileNameAt(x,y))) return false;
    if(this.npcAt(x,y) || this.chestAt(x,y) || this.bossAt(x,y)) return false;
    return true;
  }
  ahead(x,y,dir){ const v=DIRV[dir]; return [x+v[0], y+v[1]]; }

  // ================= 更新 =================
  update(dt){
    this.time += dt;
    this.ui.update(dt);
    if(this.hurtFlash>0) this.hurtFlash-=dt;
    if(this.battle){
      if(this.battle.shake>0) this.battle.shake-=dt;
      if(this.battle.flash>0) this.battle.flash-=dt;
    }
    if(this.mode==='field' && this.state){
      if(this.step){
        this.step.t += dt*STEP_SPEED;
        if(this.step.t>=1){
          const st=this.step; this.step=null;
          this.state.x=st.tx; this.state.y=st.ty;
          this.onArrive();
        }
      } else if(!this.busy && !this.ui.active){
        const d=this.input.heldDir();
        if(d){
          this.state.dir=d;
          const [nx,ny]=this.ahead(this.state.x,this.state.y,d);
          if(this.walkable(nx,ny)) this.step={fx:this.state.x,fy:this.state.y,tx:nx,ty:ny,t:0};
        }
      }
    }
  }

  onArrive(){
    const s=this.state;
    const ch=this.tileCharAt(s.x,s.y);
    if(ch==='p'){ s.hp=Math.max(1,s.hp-2); this.hurtFlash=0.3; }
    if(s.poisoned){ s.hp=Math.max(1,s.hp-1); this.hurtFlash=Math.max(this.hurtFlash,0.15); }
    const w=(this.map.warps||[]).find(w=>w.x===s.x&&w.y===s.y);
    if(w){ this.warpFlow(w); return; }
    const enc=this.map.encounters;
    if(enc && Math.random()<enc.rate){
      const total=enc.table.reduce((a,[,w])=>a+w,0);
      let roll=Math.random()*total, id=enc.table[0][0];
      for(const [e,w] of enc.table){ roll-=w; if(roll<=0){ id=e; break; } }
      this.encounterFlow(id);
    }
  }

  async warpFlow(w){
    this.busy=true;
    await this.fadeOut();
    this.loadMap(w.map);
    RPG.audio.playBgm(this.bgmForMap());
    this.state.x=w.tx; this.state.y=w.ty;
    if(w.dir) this.state.dir=w.dir;
    await this.fadeIn();
    this.busy=false;
  }

  async encounterFlow(enemyId){
    this.busy=true;
    RPG.audio.sfx('encounter');
    for(let i=0;i<3;i++){
      this.whiteFlash=true; await this.sleep(70);
      this.whiteFlash=false; await this.sleep(70);
    }
    RPG.audio.playBgm('battle');
    const r = await RPG.runBattle(this, enemyId);
    if(r==='lose') await this.gameOverFlow();
    else RPG.audio.playBgm(this.bgmForMap());
    this.busy=false;
  }

  async gameOverFlow(){
    await this.ui.message('めのまえが まっくらに なった…');
    const s=this.state;
    s.gold=Math.floor(s.gold/2);
    s.hp=RPG.maxhp(s); s.mp=RPG.maxmp(s); s.poisoned=false;
    this.loadMap('town'); s.x=5; s.y=3; s.dir='up';
    this.mode='field';
    RPG.audio.playBgm('town');
    await this.fadeIn();
    await this.ui.message('※「おお '+s.name+'よ しんでしまうとは なにごとだ!\nそなたに もういちど きかいを あたえよう。\n(しょじきんが はんぶんに なった)');
  }

  // ================= タイトル =================
  async titleFlow(auto){
    this.mode='title';
    this.state=null; this.map=null; this.battle=null; this.fadeAlpha=0;
    RPG.audio.playBgm('title');
    if(auto){
      // 自動スタート: タイトルを少し見せてから、セーブがあれば「つづきから」、
      // なければ「はじめから」を自動で開始する
      await this.sleep(1500);
      const st=RPG.load();
      if(st){
        this.state=st; this.loadMap(st.map); this.mode='field';
        RPG.audio.playBgm(this.bgmForMap());
      }else{
        this.state=RPG.newState(); this.loadMap('town'); this.mode='field';
        RPG.audio.playBgm('town');
        await this.openingFlow();
      }
      return;
    }
    while(true){
      const c=await this.ui.choose(['はじめから','つづきから'],{x:168,y:312,cancel:false});
      if(c===1){
        const st=RPG.load();
        if(!st){ await this.ui.message('ぼうけんのしょが みつかりません。'); continue; }
        this.state=st; this.loadMap(st.map); this.mode='field';
        RPG.audio.playBgm(this.bgmForMap());
        return;
      }
      this.state=RPG.newState(); this.loadMap('town'); this.mode='field';
      RPG.audio.playBgm('town');
      await this.openingFlow();
      return;
    }
  }

  async openingFlow(){
    this.busy=true;
    await this.ui.message('アルテアおうこくの わかもの '+this.state.name+'は\nおうさまに めしだされた ――');
    await this.scripts.king.call(this);
    this.busy=false;
  }

  async endingFlow(){
    await this.fadeOut();
    this.mode='ending';
    this.fadeAlpha=0;
    RPG.audio.playBgm('ending');
    await new Promise(res=>{
      const fn=b=>{
        if(b!=='a') return;
        this.input.listeners.splice(this.input.listeners.indexOf(fn),1);
        res();
      };
      this.input.listeners.push(fn);
    });
    this.titleFlow();
  }

  // ================= しらべる・はなす =================
  async interactFlow(){
    if(this.busy) return;
    this.busy=true;
    try{ await this.interact(); }
    finally{ this.busy=false; }
  }

  async interact(){
    const s=this.state, ui=this.ui;
    let [tx,ty]=this.ahead(s.x,s.y,s.dir);

    if(this.bossAt(tx,ty)){ await this.bossFlow(); return; }

    let npc=this.npcAt(tx,ty);
    if(!npc && this.tileNameAt(tx,ty)==='counter'){
      const [x2,y2]=this.ahead(tx,ty,s.dir);
      npc=this.npcAt(x2,y2);
    }
    if(npc){
      if(npc.script) await this.scripts[npc.script].call(this);
      else for(const l of (npc.lines||[])) await ui.message(l);
      return;
    }

    const chest=this.chestAt(tx,ty);
    if(chest){
      const key='chest:'+s.map+':'+tx+','+ty;
      if(s.flags[key]){ await ui.message('たからばこは からっぽだ。'); return; }
      s.flags[key]=1;
      if(chest.gold){
        s.gold+=chest.gold;
        await ui.message('たからばこを あけた!\n'+chest.gold+'ゴールドを てにいれた!');
      }else if(chest.kind==='armor'){
        if(!s.armors.includes(chest.item)) s.armors.push(chest.item);
        await ui.message('たからばこを あけた!\n'+RPG.DB.ARMORS[chest.item].name+'を てにいれた!');
      }else{
        RPG.addItem(s,chest.item);
        await ui.message('たからばこを あけた!\n'+RPG.DB.ITEMS[chest.item].name+'を てにいれた!');
      }
      return;
    }

    if(this.tileCharAt(tx,ty)==='D' && !s.flags.door){
      if(RPG.hasItem(s,'key')){
        s.flags.door=1;
        await ui.message('まほうのカギを つかった!\nとびらが ひらいた!');
      }else{
        await ui.message('とびらには カギが かかっている。');
      }
      return;
    }
  }

  async bossFlow(){
    const ui=this.ui, s=this.state;
    await ui.message('※「グオオオ… よくぞ ここまで きたな にんげんよ!\n《ひかりのたから》は わたさぬ!!');
    RPG.audio.playBgm('battle');
    const r=await RPG.runBattle(this,'boss');
    if(r==='lose'){ await this.gameOverFlow(); return; }
    RPG.audio.playBgm(this.bgmForMap());
    if(r==='win'){
      s.flags.boss=1;
      RPG.addItem(s,'treasure');
      await ui.message('《ひかりのたから》を とりもどした!\nおうさまに ほうこくしよう!');
    }
  }

  // ================= メニュー =================
  async menuFlow(){
    if(this.busy) return;
    this.busy=true;
    try{
      const s=this.state, ui=this.ui;
      let goTitle=false;
      while(true){
        const c=await ui.choose(['つよさ','じゅもん','どうぐ','そうび','セーブ','タイトルへ'],{x:16,y:16});
        if(c<0) break;
        if(c===5){ // タイトルへ
          await ui.message('セーブしていない ぼうけんは きえてしまうが\nタイトルに もどる?');
          const ok=await ui.choose(['いいえ','はい'],{x:180,y:60});
          if(ok!==1) continue;
          goTitle=true; break;
        }
        if(c===0){
          const L=RPG.lvl(s);
          const next = s.level>=RPG.DB.MAX_LEVEL ? '---' : String(RPG.DB.LEVELS[s.level].exp - s.exp);
          await ui.panel([
            'なまえ:    '+s.name,
            'レベル:    '+s.level,
            'HP:      '+s.hp+'/'+RPG.maxhp(s)+(s.poisoned?' (どく)':''),
            'MP:      '+s.mp+'/'+RPG.maxmp(s),
            'ちから:    '+L.str,
            'みのまもり:  '+L.vit,
            'こうげき力:  '+RPG.atk(s),
            'しゅび力:   '+RPG.def(s),
            'けいけんち:  '+s.exp,
            'つぎのレベル: あと'+next,
            'ゴールド:   '+s.gold+'G',
            'ぶき:     '+RPG.DB.WEAPONS[s.weapon].name,
            'よろい:    '+RPG.DB.ARMORS[s.armor].name,
          ],{x:150,y:24});
        }
        else if(c===1){ // じゅもん
          if(s.spells.length===0){ await ui.message('まだ じゅもんを おぼえていない。'); continue; }
          const i=await ui.choose(s.spells.map(id=>{
            const sp=RPG.DB.SPELLS[id]; return sp.name+'  MP'+sp.mp;
          }),{x:150,y:24,title:'MP '+s.mp+'/'+RPG.maxmp(s)});
          if(i<0) continue;
          const sp=RPG.DB.SPELLS[s.spells[i]];
          if(!sp.field){ await ui.message('たたかいの ときにしか つかえない。'); continue; }
          if(s.mp<sp.mp){ await ui.message('MPが たりない!'); continue; }
          if(s.hp>=RPG.maxhp(s)){ await ui.message('HPは まんたんだ。'); continue; }
          s.mp-=sp.mp;
          RPG.audio.sfx('heal');
          const v=Math.min(RPG.rand(sp.power[0],sp.power[1]), RPG.maxhp(s)-s.hp);
          s.hp+=v;
          await ui.message(sp.name+'を となえた!\nHPが '+v+' かいふくした!');
        }
        else if(c===2){ // どうぐ
          if(s.items.length===0){ await ui.message('なにも もっていない。'); continue; }
          const i=await ui.choose(s.items.map(it=>RPG.DB.ITEMS[it.id].name+' ×'+it.n),{x:150,y:24});
          if(i<0) continue;
          const id=s.items[i].id, item=RPG.DB.ITEMS[id];
          if(item.type==='heal'){
            if(s.hp>=RPG.maxhp(s)){ await ui.message('HPは まんたんだ。'); continue; }
            RPG.audio.sfx('heal');
            const v=Math.min(RPG.rand(item.power[0],item.power[1]), RPG.maxhp(s)-s.hp);
            s.hp+=v; RPG.removeItem(s,id);
            await ui.message(item.name+'を つかった!\nHPが '+v+' かいふくした!');
          }else if(item.type==='cure'){
            RPG.removeItem(s,id);
            if(s.poisoned){ s.poisoned=false; RPG.audio.sfx('heal'); await ui.message('どくが きえさった!'); }
            else await ui.message('しかし なにも おこらなかった。');
          }else if(id==='key'){
            await ui.message('カギのかかった とびらのまえで\nしらべると つかえる。');
          }else{
            await ui.message('まばゆく かがやいている…\nおうさまに とどけよう。');
          }
        }
        else if(c===3){ // そうび
          const t=await ui.choose(['ぶき','よろい'],{x:150,y:24});
          if(t<0) continue;
          if(t===0){
            const i=await ui.choose(s.weapons.map(id=>(id===s.weapon?'E ':'  ')+RPG.DB.WEAPONS[id].name),{x:230,y:24});
            if(i<0) continue;
            s.weapon=s.weapons[i];
            await ui.message(RPG.DB.WEAPONS[s.weapon].name+'を そうびした!');
          }else{
            const i=await ui.choose(s.armors.map(id=>(id===s.armor?'E ':'  ')+RPG.DB.ARMORS[id].name),{x:230,y:24});
            if(i<0) continue;
            s.armor=s.armors[i];
            await ui.message(RPG.DB.ARMORS[s.armor].name+'を そうびした!');
          }
        }
        else if(c===4){ // セーブ
          RPG.save(s);
          await ui.message('ぼうけんのしょに きろくした!');
        }
      }
      if(goTitle){ this.titleFlow(); return; }
    } finally { this.busy=false; }
  }

  // ================= NPCスクリプト =================
  async scriptKing(){
    const ui=this.ui, s=this.state, f=s.flags;
    if(!f.mission){
      await ui.message('※「おお ゆうしゃ'+s.name+'よ! よくぞ まいった。');
      await ui.message('※「ひがしの どうくつに すみつく まもの ドラゴネルが\nくにのたから 《ひかりのたから》を うばって いったのだ。');
      await ui.message('※「どうか たからを とりもどしてくれ!\nしたくきんとして 120ゴールドを さずけよう!');
      s.gold+=120; f.mission=1;
      await ui.message('120ゴールドを てにいれた!\n(Xキー/Bボタンで メニュー。まちで そうびを ととのえよう)');
    } else if(RPG.hasItem(s,'treasure') && !f.clear){
      await ui.message('※「おお! それは まさしく《ひかりのたから》!\nよくぞ とりもどしてくれた '+s.name+'よ!');
      await ui.message('※「そなたこそ まことの ゆうしゃじゃ!\nこのくにの へいわは そなたの おかげじゃ!');
      f.clear=1;
      RPG.save(s);
      await this.endingFlow();
    } else if(f.clear){
      await ui.message('※「'+s.name+'よ ゆっくり やすんでくれ。\nそなたは このくにの えいゆうじゃ!');
    } else {
      await ui.message('※「まものの どうくつは ひがしにある。\nどくのぬまに きをつけるのじゃぞ。');
    }
  }

  async scriptInn(){
    const ui=this.ui, s=this.state;
    await ui.message('※「ようこそ やどやへ!\nひとばん 10ゴールドですが とまりますか?');
    const c=await ui.choose(['はい','いいえ'],{x:340,y:196});
    if(c!==0){ await ui.message('※「またの おこしを おまちしています。'); return; }
    if(s.gold<10){ await ui.message('※「おかねが たりないようですね…'); return; }
    s.gold-=10;
    await this.fadeOut();
    await this.sleep(500);
    s.hp=RPG.maxhp(s); s.mp=RPG.maxmp(s); s.poisoned=false;
    await this.fadeIn();
    await ui.message('※「おはようございます!\nゆうべは ゆっくり やすめましたか?\nいってらっしゃいませ!');
  }

  async scriptWeaponShop(){
    const ui=this.ui, s=this.state;
    await ui.message('※「いらっしゃい! ぶきと ぼうぐの みせだ。');
    const goods=[
      ['w','stick'],['w','copper'],['w','steel'],
      ['a','clothes'],['a','leather'],['a','steelA'],
    ];
    while(true){
      const labels=goods.map(([t,id])=>{
        const d=t==='w'?RPG.DB.WEAPONS[id]:RPG.DB.ARMORS[id];
        return d.name+'  '+d.price+'G';
      });
      const i=await ui.choose(labels,{x:16,y:16,title:'しょじきん '+s.gold+'G'});
      if(i<0) break;
      const [t,id]=goods[i];
      const d=t==='w'?RPG.DB.WEAPONS[id]:RPG.DB.ARMORS[id];
      const owned=(t==='w'?s.weapons:s.armors).includes(id);
      if(owned){ await ui.message('※「それは もう もっているよ。'); continue; }
      if(s.gold<d.price){ await ui.message('※「おかねが たりないようだね。'); continue; }
      const ok=await ui.choose(['かう','やめる'],{x:340,y:196});
      if(ok!==0) continue;
      s.gold-=d.price;
      (t==='w'?s.weapons:s.armors).push(id);
      await ui.message('※「まいど あり!\nメニューの そうびで みにつけておくれ。');
    }
    await ui.message('※「また きておくれ!');
  }

  async scriptItemShop(){
    const ui=this.ui, s=this.state;
    await ui.message('※「いらっしゃいませ! どうぐやです。');
    const goods=['herb','antidote'];
    while(true){
      const labels=goods.map(id=>RPG.DB.ITEMS[id].name+'  '+RPG.DB.ITEMS[id].price+'G');
      const i=await ui.choose(labels,{x:16,y:16,title:'しょじきん '+s.gold+'G'});
      if(i<0) break;
      const id=goods[i], d=RPG.DB.ITEMS[id];
      if(s.gold<d.price){ await ui.message('※「おかねが たりませんよ。'); continue; }
      s.gold-=d.price;
      RPG.addItem(s,id);
      await ui.message('※「ありがとうございます!\n'+d.name+'を てにいれた!');
    }
    await ui.message('※「またの おこしを!');
  }

  // ================= 描画 =================
  render(){
    const g=this.g;
    g.imageSmoothingEnabled=false;
    g.fillStyle='#000'; g.fillRect(0,0,VIEW_W,VIEW_H);

    if(this.mode==='title') this.renderTitle(g);
    else if(this.mode==='field' && this.state) this.renderField(g);
    else if(this.mode==='battle') this.renderBattle(g);
    else if(this.mode==='ending') this.renderEnding(g);

    this.ui.render(g);

    if(this.whiteFlash){ g.fillStyle='#fff'; g.fillRect(0,0,VIEW_W,VIEW_H); }
    if(this.hurtFlash>0){ g.fillStyle='rgba(200,0,60,0.35)'; g.fillRect(0,0,VIEW_W,VIEW_H); }
    if(this.fadeAlpha>0){ g.fillStyle='rgba(0,0,0,'+this.fadeAlpha+')'; g.fillRect(0,0,VIEW_W,VIEW_H); }
  }

  heroPixel(){
    const s=this.state;
    let px=s.x*TILE, py=s.y*TILE;
    if(this.step){
      const t=Math.min(1,this.step.t);
      px=(this.step.fx+(this.step.tx-this.step.fx)*t)*TILE;
      py=(this.step.fy+(this.step.ty-this.step.fy)*t)*TILE;
    }
    return [px,py];
  }

  renderField(g){
    const m=this.map, s=this.state;
    const [hpx,hpy]=this.heroPixel();
    const camX=Math.max(0, Math.min(m.w*TILE-VIEW_W, hpx+TILE/2-VIEW_W/2));
    const camY=Math.max(0, Math.min(m.h*TILE-VIEW_H, hpy+TILE/2-VIEW_H/2));

    const c0=Math.floor(camX/TILE), r0=Math.floor(camY/TILE);
    const c1=Math.min(m.w-1, Math.ceil((camX+VIEW_W)/TILE));
    const r1=Math.min(m.h-1, Math.ceil((camY+VIEW_H)/TILE));
    for(let y=r0;y<=r1;y++){
      for(let x=c0;x<=c1;x++){
        const t=RPG.TILESET[this.tileNameAt(x,y)];
        g.drawImage(t, Math.floor(x*TILE-camX), Math.floor(y*TILE-camY), TILE, TILE);
      }
    }
    // 宝箱
    (m.chests||[]).forEach(c=>{
      const opened=s.flags['chest:'+s.map+':'+c.x+','+c.y];
      g.drawImage(opened?RPG.TILESET.chestOpen:RPG.TILESET.chestClosed,
        Math.floor(c.x*TILE-camX), Math.floor(c.y*TILE-camY), TILE, TILE);
    });
    // NPC
    (m.npcs||[]).forEach(n=>{
      const spr=RPG.SPRITES[n.sprite];
      g.drawImage(spr.down, Math.floor(n.x*TILE-camX), Math.floor(n.y*TILE-camY), TILE, TILE);
    });
    // ボス
    if(m.boss && !s.flags.boss){
      g.drawImage(RPG.MONSTERS.boss, Math.floor(m.boss.x*TILE-camX), Math.floor(m.boss.y*TILE-camY), TILE, TILE);
    }
    // 主人公
    const bob=this.step ? (Math.floor(this.time*10)%2?-2:0) : 0;
    g.drawImage(RPG.SPRITES.hero[s.dir], Math.floor(hpx-camX), Math.floor(hpy-camY)+bob, TILE, TILE);

    // どく状態表示
    if(s.poisoned){
      this.ui.win(g, VIEW_W-96, 8, 88, 40);
      this.ui.text(g,'どく', VIEW_W-72, 20, '#c080f0');
    }
  }

  renderBattle(g){
    const s=this.state, bs=this.battle;
    // ステータス
    if(s){
      this.ui.win(g,16,16,180,128);
      this.ui.text(g,s.name,32,30);
      this.ui.text(g,'HP '+s.hp+'/'+RPG.maxhp(s),32,56,s.hp<=RPG.maxhp(s)/4?'#f08080':'#f0f0f0');
      this.ui.text(g,'MP '+s.mp+'/'+RPG.maxmp(s),32,80);
      this.ui.text(g,'レベル '+s.level,32,104);
    }
    if(bs){
      // 戦闘フレーム
      this.ui.win(g,216,16,248,176);
      g.fillStyle='#0c0c14'; g.fillRect(226,26,228,156);
      if(bs.visible){
        const spr=RPG.MONSTERS[bs.enemy.sprite];
        const size=bs.enemy.boss?128:96;
        const ox=bs.shake>0 ? (Math.random()*10-5) : 0;
        g.drawImage(spr, Math.floor(340-size/2+ox), Math.floor(104-size/2), size, size);
      }
      if(bs.flash>0){ g.fillStyle='rgba(220,0,40,0.35)'; g.fillRect(0,0,VIEW_W,VIEW_H); }
    }
  }

  renderTitle(g){
    g.fillStyle='#000'; g.fillRect(0,0,VIEW_W,VIEW_H);
    g.textAlign='center'; g.textBaseline='top';
    g.font="20px 'MS Gothic',monospace"; g.fillStyle='#8090ff';
    g.fillText('― レトロRPG ―', VIEW_W/2, 72);
    g.font="40px 'MS Gothic',monospace"; g.fillStyle='#f0e060';
    g.fillText('ファイナルソード', VIEW_W/2, 110);
    g.imageSmoothingEnabled=false;
    g.drawImage(RPG.SPRITES.hero.down, VIEW_W/2-32, 180, 64, 64);
    g.font="14px 'MS Gothic',monospace"; g.fillStyle='#c0c0c0';
    g.fillText('矢印キー:いどう  Z/Enter:けってい  X/Esc:キャンセル・メニュー', VIEW_W/2, 262);
    g.fillText('スマホは がめんの ボタンで そうさ  (M:サウンドON/OFF)', VIEW_W/2, 284);
    g.textAlign='left';
  }

  renderEnding(g){
    g.fillStyle='#000'; g.fillRect(0,0,VIEW_W,VIEW_H);
    g.textAlign='center'; g.textBaseline='top';
    g.font="18px 'MS Gothic',monospace"; g.fillStyle='#f0f0f0';
    g.fillText('《ひかりのたから》は おうこくに もどり', VIEW_W/2, 100);
    g.fillText('せかいに へいわが おとずれた。', VIEW_W/2, 132);
    g.fillText('ゆうしゃの でんせつは いつまでも', VIEW_W/2, 180);
    g.fillText('かたりつがれて いくことだろう…', VIEW_W/2, 212);
    g.font="32px 'MS Gothic',monospace"; g.fillStyle='#f0e060';
    g.fillText('～ THE END ～', VIEW_W/2, 280);
    g.font="14px 'MS Gothic',monospace"; g.fillStyle='#909090';
    g.fillText('Z/Enter または Aボタンで タイトルへ', VIEW_W/2, 350);
    g.textAlign='left';
  }
}

RPG.Game = Game;
})();
