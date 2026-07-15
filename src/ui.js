// ウィンドウ描画・メッセージ・選択メニュー（すべて共通のウィンドウ関数で統一）
(function(){
window.RPG = window.RPG || {};

const FONT = "16px 'MS Gothic','Hiragino Kaku Gothic ProN',monospace";
const LINE_H = 24;
const CHARS_PER_LINE = 26;

function wrap(text){
  const out = [];
  String(text).split('\n').forEach(line=>{
    if(line==='') { out.push(''); return; }
    for(let i=0;i<line.length;i+=CHARS_PER_LINE) out.push(line.slice(i,i+CHARS_PER_LINE));
  });
  return out;
}

class UI {
  constructor(){
    this.widgets = [];
    this.time = 0;
  }
  get active(){ return this.widgets.length>0; }

  handlePress(b){
    const w = this.widgets[this.widgets.length-1];
    if(w && w.press) w.press(b);
  }
  update(dt){
    this.time += dt;
    this.widgets.forEach(w=>{ if(w.update) w.update(dt); });
  }
  render(g){
    this.widgets.forEach(w=>w.render(g));
  }

  // 共通ウィンドウ描画
  win(g,x,y,w,h){
    g.fillStyle='rgba(4,4,20,0.94)';
    g.fillRect(x,y,w,h);
    g.strokeStyle='#f0f0f0'; g.lineWidth=3;
    g.strokeRect(x+3,y+3,w-6,h-6);
    g.strokeStyle='#707080'; g.lineWidth=1;
    g.strokeRect(x+7,y+7,w-14,h-14);
  }
  text(g,s,x,y,color){
    g.font=FONT; g.textBaseline='top';
    g.fillStyle=color||'#f0f0f0';
    g.fillText(s,x,y);
  }

  // メッセージ表示（1文字ずつ・Aキーで送り / 3行ごとに改ページ）
  message(text, opts={}){
    const ui=this;
    return new Promise(res=>{
      const lines = wrap(text);
      const pages=[];
      for(let i=0;i<lines.length;i+=3) pages.push(lines.slice(i,i+3));
      const wd={
        x:opts.x??16, y:opts.y??324, w:opts.w??448, h:opts.h??108,
        page:0, chars:0,
        pageLen(){ return this.pages[this.page].join('').length; },
        pages,
        update(dt){ this.chars += dt*40; },
        press(b){
          if(b!=='a' && b!=='b') return;
          if(this.chars < this.pageLen()){ this.chars = this.pageLen(); return; }
          if(this.page < this.pages.length-1){ this.page++; this.chars=0; return; }
          ui.widgets.splice(ui.widgets.indexOf(this),1);
          res();
        },
        render(g){
          ui.win(g,this.x,this.y,this.w,this.h);
          let remain = Math.floor(this.chars);
          const rows = this.pages[this.page];
          for(let i=0;i<rows.length;i++){
            const s = rows[i].slice(0, Math.max(0,remain));
            remain -= rows[i].length;
            ui.text(g, s, this.x+16, this.y+14+i*LINE_H);
          }
          if(this.chars>=this.pageLen() && Math.floor(ui.time*2)%2===0){
            ui.text(g,'▼', this.x+this.w/2-8, this.y+this.h-22);
          }
        },
      };
      ui.widgets.push(wd);
    });
  }

  // 選択メニュー。戻り値: 選んだindex / キャンセルは -1
  choose(items, opts={}){
    const ui=this;
    return new Promise(res=>{
      const labels = items.map(i=> typeof i==='string' ? i : i.label);
      const width = opts.w ?? (Math.max(...labels.map(s=>s.length), (opts.title||'').length)*16 + 64);
      const height = labels.length*LINE_H + 28 + (opts.title?24:0);
      const wd={
        x:opts.x??16, y:opts.y??16, cur:0, labels,
        press(b){
          if(b==='up'){ this.cur=(this.cur+labels.length-1)%labels.length; }
          else if(b==='down'){ this.cur=(this.cur+1)%labels.length; }
          else if(b==='a'){
            ui.widgets.splice(ui.widgets.indexOf(this),1);
            res(this.cur);
          }
          else if(b==='b' && opts.cancel!==false){
            ui.widgets.splice(ui.widgets.indexOf(this),1);
            res(-1);
          }
        },
        render(g){
          ui.win(g,this.x,this.y,width,height);
          let ty=this.y+14;
          if(opts.title){ ui.text(g,opts.title,this.x+16,ty,'#f0d060'); ty+=24; }
          labels.forEach((s,i)=>{
            if(i===this.cur) ui.text(g,'▶',this.x+12,ty+i*LINE_H);
            ui.text(g,s,this.x+32,ty+i*LINE_H, items[i]&&items[i].dim?'#8a8a96':'#f0f0f0');
          });
        },
      };
      ui.widgets.push(wd);
    });
  }

  // 情報パネル（何かキーを押すまで表示）
  panel(lines, opts={}){
    const ui=this;
    return new Promise(res=>{
      const rows = Array.isArray(lines)?lines:wrap(lines);
      const width = opts.w ?? (Math.max(...rows.map(s=>s.length))*16+48);
      const height = opts.h ?? (rows.length*LINE_H+28);
      const wd={
        x:opts.x??16, y:opts.y??16,
        press(b){
          if(b!=='a'&&b!=='b') return;
          ui.widgets.splice(ui.widgets.indexOf(this),1);
          res();
        },
        render(g){
          ui.win(g,this.x,this.y,width,height);
          rows.forEach((s,i)=> ui.text(g,s,this.x+16,this.y+14+i*LINE_H));
        },
      };
      ui.widgets.push(wd);
    });
  }
}

RPG.UI = UI;
})();
