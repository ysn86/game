// プレイヤー状態・セーブ/ロード
(function(){
window.RPG = window.RPG || {};
const SAVE_KEY = 'hikari_no_takara_save1';

RPG.newState = function(){
  return {
    name:'ゆうしゃ',
    level:1, exp:0, hp:16, mp:0, gold:50,
    weapon:'stick', armor:'clothes',
    weapons:['stick'], armors:['clothes'],
    items:[{id:'herb', n:2}],
    spells:[],
    poisoned:false,
    flags:{},
    map:'town', x:5, y:3, dir:'up',
  };
};

RPG.lvl   = s => RPG.DB.LEVELS[s.level-1];
RPG.maxhp = s => RPG.lvl(s).hp;
RPG.maxmp = s => RPG.lvl(s).mp;
RPG.atk   = s => RPG.lvl(s).str + (RPG.DB.WEAPONS[s.weapon] ? RPG.DB.WEAPONS[s.weapon].atk : 0);
RPG.def   = s => RPG.lvl(s).vit + (RPG.DB.ARMORS[s.armor] ? RPG.DB.ARMORS[s.armor].def : 0);

RPG.addItem = (s,id,n=1)=>{
  const it = s.items.find(i=>i.id===id);
  if(it) it.n+=n; else s.items.push({id,n});
};
RPG.removeItem = (s,id,n=1)=>{
  const it = s.items.find(i=>i.id===id);
  if(!it) return;
  it.n-=n;
  if(it.n<=0) s.items.splice(s.items.indexOf(it),1);
};
RPG.hasItem = (s,id)=> s.items.some(i=>i.id===id && i.n>0);

RPG.rand = (a,b)=> a + Math.floor(Math.random()*(b-a+1));

// 経験値からレベルアップ処理。表示すべきメッセージの配列を返す
RPG.checkLevelUp = function(s){
  const msgs=[];
  while(s.level < RPG.DB.MAX_LEVEL && s.exp >= RPG.DB.LEVELS[s.level].exp){
    const before = RPG.DB.LEVELS[s.level-1];
    s.level++;
    const now = RPG.DB.LEVELS[s.level-1];
    s.hp = Math.min(RPG.maxhp(s), s.hp + (now.hp-before.hp));
    s.mp = Math.min(RPG.maxmp(s), s.mp + (now.mp-before.mp));
    let m = s.name+'は レベル'+s.level+'に あがった!\n'
      + 'ちから+'+(now.str-before.str)+'  みのまもり+'+(now.vit-before.vit)
      + '  さいだいHP+'+(now.hp-before.hp);
    msgs.push(m);
    if(now.learn && !s.spells.includes(now.learn)){
      s.spells.push(now.learn);
      msgs.push(s.name+'は じゅもん '+RPG.DB.SPELLS[now.learn].name+'を おぼえた!');
    }
  }
  return msgs;
};

RPG.save   = s  => { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); };
RPG.load   = () => {
  try{
    const j = localStorage.getItem(SAVE_KEY);
    return j ? JSON.parse(j) : null;
  }catch(e){ return null; }
};
RPG.hasSave = () => !!localStorage.getItem(SAVE_KEY);
})();
