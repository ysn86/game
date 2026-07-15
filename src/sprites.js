// ドット絵の自前生成（タイル & キャラクター & モンスター）
(function(){
window.RPG = window.RPG || {};

function cv(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; }

// 疑似乱数（タイル模様用・毎回同じ見た目になるように）
function makeRnd(seed){ let s=seed; return ()=>{ s=(s*16807)%2147483647; return s/2147483647; }; }

// ---- パターン文字列 → 16x16 スプライト ----
function pat(rows, pal){
  const c=cv(16,16), g=c.getContext('2d');
  for(let y=0;y<16;y++){
    const row=rows[y]||'';
    for(let x=0;x<16;x++){
      const ch=row[x];
      if(ch && ch!=='.' && pal[ch]){ g.fillStyle=pal[ch]; g.fillRect(x,y,1,1); }
    }
  }
  return c;
}
function flipX(src){
  const c=cv(src.width,src.height), g=c.getContext('2d');
  g.translate(src.width,0); g.scale(-1,1); g.drawImage(src,0,0);
  return c;
}

// ---- タイル生成 ----
function tile(fn, seed){
  const c=cv(16,16), g=c.getContext('2d'), rnd=makeRnd(seed||12345);
  fn(g, rnd); return c;
}
function speckle(g,rnd,color,n){
  g.fillStyle=color;
  for(let i=0;i<n;i++){ g.fillRect((rnd()*16)|0,(rnd()*16)|0,1,1); }
}

const TILES = {};
TILES.grass = tile((g,r)=>{ g.fillStyle='#1e7c30'; g.fillRect(0,0,16,16); speckle(g,r,'#2f9c44',14); speckle(g,r,'#166024',6); },11);
TILES.forest = tile((g,r)=>{
  g.drawImage(TILES.grass,0,0);
  g.fillStyle='#0d4a1c'; g.fillRect(3,2,10,9); g.fillRect(5,1,6,11);
  g.fillStyle='#187a2e'; g.fillRect(4,3,4,3); g.fillRect(8,5,4,4);
  g.fillStyle='#5a3a1a'; g.fillRect(7,11,2,4);
},22);
TILES.mountain = tile((g,r)=>{
  g.drawImage(TILES.grass,0,0);
  g.fillStyle='#7a6a58'; g.beginPath(); g.moveTo(1,15); g.lineTo(8,2); g.lineTo(15,15); g.closePath(); g.fill();
  g.fillStyle='#9c8c78'; g.beginPath(); g.moveTo(4,15); g.lineTo(8,5); g.lineTo(12,15); g.closePath(); g.fill();
  g.fillStyle='#e8e8ee'; g.fillRect(7,3,3,2);
},33);
TILES.water = tile((g,r)=>{
  g.fillStyle='#1a4fbb'; g.fillRect(0,0,16,16);
  g.fillStyle='#3f74e0';
  g.fillRect(1,3,5,1); g.fillRect(9,6,5,1); g.fillRect(3,10,5,1); g.fillRect(10,13,4,1);
},44);
TILES.swamp = tile((g,r)=>{
  g.fillStyle='#4a2a5e'; g.fillRect(0,0,16,16);
  speckle(g,r,'#6a4586',12); speckle(g,r,'#8a60aa',6);
  g.fillStyle='#9a70bb'; g.fillRect(4,4,2,2); g.fillRect(11,9,2,2);
},55);
TILES.towngate = tile((g,r)=>{
  g.drawImage(TILES.grass,0,0);
  g.fillStyle='#c8c8d0'; g.fillRect(3,5,10,9);
  g.fillStyle='#8a8a94'; g.fillRect(3,5,2,9); g.fillRect(11,5,2,9);
  g.fillStyle='#d03030'; g.beginPath(); g.moveTo(2,5); g.lineTo(8,1); g.lineTo(14,5); g.closePath(); g.fill();
  g.fillStyle='#3a2a10'; g.fillRect(7,9,3,5);
},66);
TILES.cavegate = tile((g,r)=>{
  g.drawImage(TILES.mountain,0,0);
  g.fillStyle='#0a0a0e'; g.fillRect(5,7,6,8);
  g.fillStyle='#000'; g.fillRect(6,9,4,6);
},77);
TILES.wall = tile((g,r)=>{
  g.fillStyle='#9a9aa6'; g.fillRect(0,0,16,16);
  g.fillStyle='#6e6e7a';
  g.fillRect(0,3,16,1); g.fillRect(0,7,16,1); g.fillRect(0,11,16,1); g.fillRect(0,15,16,1);
  g.fillRect(4,0,1,3); g.fillRect(11,4,1,3); g.fillRect(4,8,1,3); g.fillRect(11,12,1,3);
},88);
TILES.rock = tile((g,r)=>{
  g.fillStyle='#4a3b33'; g.fillRect(0,0,16,16);
  speckle(g,r,'#5e4c42',12); speckle(g,r,'#332822',10);
  g.fillStyle='#2a201b'; g.fillRect(2,5,5,1); g.fillRect(9,10,5,1);
},99);
TILES.floor = tile((g,r)=>{
  g.fillStyle='#b8b8c2'; g.fillRect(0,0,16,16);
  g.fillStyle='#9c9ca8'; g.fillRect(0,0,16,1); g.fillRect(0,0,1,16);
  speckle(g,r,'#a8a8b4',6);
},111);
TILES.carpet = tile((g,r)=>{
  g.fillStyle='#a02036'; g.fillRect(0,0,16,16);
  g.fillStyle='#c04056'; g.fillRect(0,0,16,1); g.fillRect(0,15,16,1);
  g.fillStyle='#801a2c'; g.fillRect(7,7,2,2);
},122);
TILES.wood = tile((g,r)=>{
  g.fillStyle='#9a6632'; g.fillRect(0,0,16,16);
  g.fillStyle='#7e5228'; g.fillRect(0,4,16,1); g.fillRect(0,9,16,1); g.fillRect(0,14,16,1);
  g.fillStyle='#b07a40'; speckle(g,r,'#b07a40',5);
},133);
TILES.counter = tile((g,r)=>{
  g.fillStyle='#caa050'; g.fillRect(0,0,16,7);
  g.fillStyle='#e0bc70'; g.fillRect(0,0,16,2);
  g.fillStyle='#96733a'; g.fillRect(0,7,16,9);
  g.fillStyle='#7a5c2e'; g.fillRect(0,7,16,1); g.fillRect(3,9,2,5); g.fillRect(11,9,2,5);
},144);
TILES.door = tile((g,r)=>{
  g.drawImage(TILES.wall,0,0);
  g.fillStyle='#6a4218'; g.fillRect(2,2,12,14);
  g.fillStyle='#8a5c28'; g.fillRect(3,3,10,12);
  g.fillStyle='#f0c030'; g.fillRect(7,8,2,3);
  g.fillStyle='#3a2408'; g.fillRect(7,9,2,1);
},155);
TILES.gravel = tile((g,r)=>{
  g.fillStyle='#b8a878'; g.fillRect(0,0,16,16);
  speckle(g,r,'#a08a5c',10); speckle(g,r,'#ccbe90',8);
},166);
TILES.tree = tile((g,r)=>{
  g.drawImage(TILES.grass,0,0);
  g.fillStyle='#0e5a22'; g.fillRect(2,1,12,10); g.fillRect(4,0,8,12);
  g.fillStyle='#1e8a38'; g.fillRect(4,2,5,4); g.fillRect(9,6,4,3);
  g.fillStyle='#5a3a1a'; g.fillRect(6,12,4,4);
},177);
TILES.cavefloor = tile((g,r)=>{
  g.fillStyle='#38302a'; g.fillRect(0,0,16,16);
  speckle(g,r,'#453c34',12); speckle(g,r,'#2a2420',8);
},188);
TILES.stairsD = tile((g,r)=>{
  g.drawImage(TILES.cavefloor,0,0);
  g.fillStyle='#0a0a0a'; g.fillRect(2,2,12,12);
  g.fillStyle='#8a8a8a'; g.fillRect(2,2,12,3); g.fillStyle='#5e5e5e'; g.fillRect(5,5,9,3); g.fillStyle='#3a3a3a'; g.fillRect(8,8,6,3);
},199);
TILES.stairsU = tile((g,r)=>{
  g.drawImage(TILES.cavefloor,0,0);
  g.fillStyle='#c8c8c8'; g.fillRect(2,11,12,3);
  g.fillStyle='#a0a0a0'; g.fillRect(5,8,9,3);
  g.fillStyle='#787878'; g.fillRect(8,5,6,3);
  g.fillStyle='#585858'; g.fillRect(11,2,3,3);
},211);

// 宝箱
const chestClosed = tile((g,r)=>{
  g.fillStyle='#8a5c28'; g.fillRect(2,4,12,10);
  g.fillStyle='#aa7838'; g.fillRect(3,5,10,4);
  g.fillStyle='#5c3a14'; g.fillRect(2,9,12,1);
  g.fillStyle='#f0c030'; g.fillRect(7,8,2,4); g.fillRect(2,4,12,1);
},222);
const chestOpen = tile((g,r)=>{
  g.fillStyle='#5c3a14'; g.fillRect(2,3,12,3);
  g.fillStyle='#8a5c28'; g.fillRect(2,8,12,6);
  g.fillStyle='#2a1a08'; g.fillRect(3,8,10,2);
  g.fillStyle='#f0c030'; g.fillRect(7,10,2,4);
},233);

// タイル名→キャンバス
const TILESET = {
  grass:TILES.grass, forest:TILES.forest, mountain:TILES.mountain, water:TILES.water,
  swamp:TILES.swamp, towngate:TILES.towngate, cavegate:TILES.cavegate,
  wall:TILES.wall, rock:TILES.rock, floor:TILES.floor, carpet:TILES.carpet,
  wood:TILES.wood, counter:TILES.counter, door:TILES.door, gravel:TILES.gravel,
  tree:TILES.tree, cavefloor:TILES.cavefloor, stairsD:TILES.stairsD, stairsU:TILES.stairsU,
  chestClosed, chestOpen,
};

// 文字 → タイル名（theme で '.' と '#' を切替）
RPG.tileName = function(ch, theme){
  switch(ch){
    case '.': return theme==='cave' ? 'cavefloor' : 'grass';
    case '#': return theme==='cave' ? 'rock' : 'wall';
    case 'f': return 'forest';
    case 'M': return 'mountain';
    case '~': return 'water';
    case 'p': return 'swamp';
    case 'T': return 'towngate';
    case 'C': return 'cavegate';
    case 'F': return 'floor';
    case 'c': return 'carpet';
    case 'w': return 'wood';
    case 'k': return 'counter';
    case 'D': return 'door';
    case 'G': return 'gravel';
    case 't': return 'tree';
    case '<': return 'stairsU';
    case '>': return 'stairsD';
    default : return 'grass';
  }
};
RPG.SOLID = new Set(['mountain','water','wall','rock','counter','tree','door']);

// ---- キャラクター ----
const K='#101018', S='#f0c090', W='#f0f0f0';

const heroDown = [
  '......KKKK......',
  '.....KHHHHK.....',
  '....KHHHHHHK....',
  '....KHHHHHHK....',
  '....KSSSSSSK....',
  '....KSKSSKSK....',
  '....KSSSSSSK....',
  '.....KSSSSK.....',
  '....KTTTTTTK....',
  '...KTTTTTTTTK...',
  '..KSKTTTTTTKSK..',
  '..KKKTTTTTTKKK..',
  '....KTTTTTTK....',
  '....KDDKKDDK....',
  '....KDK..KDK....',
  '....KKK..KKK....',
];
const heroUp = [
  '......KKKK......',
  '.....KHHHHK.....',
  '....KHHHHHHK....',
  '....KHHHHHHK....',
  '....KHHHHHHK....',
  '....KHHHHHHK....',
  '....KHHHHHHK....',
  '.....KHHHHK.....',
  '....KTTTTTTK....',
  '...KTTTTTTTTK...',
  '..KSKTTTTTTKSK..',
  '..KKKTTTTTTKKK..',
  '....KTTTTTTK....',
  '....KDDKKDDK....',
  '....KDK..KDK....',
  '....KKK..KKK....',
];
const heroLeft = [
  '......KKKK......',
  '.....KHHHHK.....',
  '....KHHHHHHK....',
  '....KHHHHHHK....',
  '....KSSSSHHK....',
  '....KSKSSHHK....',
  '....KSSSSHHK....',
  '.....KSSSHK.....',
  '....KTTTTTTK....',
  '....KSTTTTTK....',
  '....KKTTTTTK....',
  '....KTTTTTTK....',
  '....KTTTTTTK....',
  '....KDDDDDDK....',
  '....KDDKKDDK....',
  '.....KKK.KKK....',
];
function person(hair, tunic, legs){
  const pal = {K, S, W, H:hair, T:tunic, D:legs||'#404048'};
  const down = pat(heroDown, pal);
  return { down, up:pat(heroUp,pal), left:pat(heroLeft,pal), right:flipX(pat(heroLeft,pal)) };
}

const kingPat = [
  '....KYKYKYKY....',
  '....KYYYYYYK....',
  '....KSSSSSSK....',
  '....KSKSSKSK....',
  '....KSSSSSSK....',
  '...KWWWWWWWWK...',
  '...KRRRRRRRRK...',
  '..KRRYRRRRYRRK..',
  '..KRRRRRRRRRRK..',
  '..KRRRWWWWRRRK..',
  '..KRRRWWWWRRRK..',
  '..KRRRRRRRRRRK..',
  '...KRRRRRRRRK...',
  '...KRRRRRRRRK...',
  '...KDDK..KDDK...',
  '...KKK....KKK...',
];

const SPRITES = {};
SPRITES.hero     = person('#8a5218', '#2850c8');
SPRITES.soldier  = person('#8a92a4', '#4a5568');
SPRITES.villager = person('#5a3a18', '#2e9a48');
SPRITES.woman    = person('#201818', '#d04878');
SPRITES.merchant = person('#5a3a18', '#d8a028');
SPRITES.elder    = person('#e8e8e8', '#8a8a96');
{
  const kp = pat(kingPat, {K,S,W,Y:'#f0c030',R:'#c02848',D:'#404048'});
  SPRITES.king = { down:kp, up:kp, left:kp, right:kp };
}

// ---- モンスター ----
const MONSTERS = {};
const PUNI_ROWS = [
  '................',
  '................',
  '................',
  '.....KKKKKK.....',
  '....KBBBBBBK....',
  '...KBBBBBBBBK...',
  '..KBBBBBBBBBBK..',
  '..KBWKBBBBWKBK..',
  '..KBWKBBBBWKBK..',
  '.KBBBBBBBBBBBBK.',
  '.KBBBKKKKKKBBBK.',
  '.KBBBBBBBBBBBBK.',
  '.KBBBBBBBBBBBBK.',
  '..KKKKKKKKKKKK..',
  '................',
  '................',
];
MONSTERS.punipuni = pat(PUNI_ROWS, {K,W,B:'#4878e8'});
MONSTERS.metal = pat(PUNI_ROWS, {K,W,B:'#c2cad6'}); // レア敵: 銀色のぷに
MONSTERS.batty = pat([
  '................',
  '................',
  'KK............KK',
  'KPK..........KPK',
  'KPPK.KKKKKK.KPPK',
  'KPPPKPPPPPPKPPPK',
  '.KPPPPPPPPPPPPK.',
  '.KPKPWKPPWKPKPK.',
  '..KPPWKPPWKPPK..',
  '..KPPPPPPPPPPK..',
  '...KPPKKKKPPK...',
  '....KPPPPPPK....',
  '.....KKKKKK.....',
  '....KK....KK....',
  '................',
  '................',
], {K,W,P:'#8040b0'});
MONSTERS.rat = pat([
  '................',
  '................',
  '..K..K..K..K....',
  '.KNKKNKKNKKNK...',
  '.KNNNNNNNNNNK...',
  'KNNNNNNNNNNNNK..',
  'KNWKNNNNNNNNNKK.',
  'KNWKNNNNNNNNNNKK',
  'KNNNNNNNNNNNNK..',
  '.KNNNNNNNNNNK...',
  '..KNNNNNNNNK....',
  '...KNKKKKNK.....',
  '...KNK..KNK.....',
  '...KK....KK.....',
  '................',
  '................',
], {K,W,N:'#a06a30'});
MONSTERS.bone = pat([
  '.....KKKKKK.....',
  '....KWWWWWWK....',
  '....KWWWWWWK....',
  '....KWKWWKWK....',
  '....KWWWWWWK....',
  '.....KWKKWK.....',
  '......KWWK......',
  '...KKKWWWWKKK...',
  '..KWWWWWWWWWWK..',
  '..KWKWWWWWWKWK..',
  '..KWKWKWWKWKWK..',
  '..KKKWWWWWWKKK..',
  '.....KWKKWK.....',
  '.....KWK.KWK....',
  '....KWWK.KWWK...',
  '....KKK...KKK...',
], {K,W});
MONSTERS.eye = pat([
  '................',
  '....KKKKKKKK....',
  '..KKPPPPPPPPKK..',
  '.KPPPPPPPPPPPPK.',
  '.KPPPWWWWWWPPPK.',
  'KPPPWWWWWWWWPPPK',
  'KPPWWWRRRRWWWPPK',
  'KPPWWRRKKRRWWPPK',
  'KPPWWRRKKRRWWPPK',
  'KPPWWWRRRRWWWPPK',
  '.KPPWWWWWWWWPPK.',
  '.KPPPPWWWWPPPPK.',
  '..KKPPPPPPPPKK..',
  '...KPK.KK.KPK...',
  '..KPK......KPK..',
  '..KK........KK..',
], {K,W,P:'#6a2a9a',R:'#d02030'});
MONSTERS.mage = pat([
  '......KKKK......',
  '.....KPPPPK.....',
  '....KPPPPPPK....',
  '...KPPPPPPPPK...',
  '....KKKKKKKK....',
  '....KGGGGGGK....',
  '....KGYKKYGK....',
  '....KGGGGGGK....',
  '...KPPPPPPPPK...',
  '..KPPPPPPPPPPK..',
  '.KPKPPPPPPPPKPK.',
  '.KPKPPPPPPPPKPK.',
  '..KKPPPPPPPPKK..',
  '...KPPPPPPPPK...',
  '..KPPPPPPPPPPK..',
  '..KKKKKKKKKKKK..',
], {K,P:'#3a3a6a',G:'#181828',Y:'#f0d030'});
MONSTERS.boss = pat([
  '..KK........KK..',
  '.KRRK......KRRK.',
  '.KRRRK....KRRRK.',
  '..KRRGKKKKGRRK..',
  '...KGGGGGGGGK...',
  '..KGGWGGGGWGGK..',
  '..KGGKGGGGKGGK..',
  '.KGGGGGGGGGGGGK.',
  '.KGRRRRRRRRRRGK.',
  '.KGGWKWKWKWKGGK.',
  '..KGGGGGGGGGGK..',
  '.KGGKGGGGGGKGGK.',
  'KGGK.KGGGGK.KGGK',
  'KGK..KGGGGK..KGK',
  '.K..KKGKKGKK..K.',
  '....KKK..KKK....',
], {K,W,G:'#2a9a4a',R:'#c04020'});

// ラスボス第2形態: 黒竜(赤く光る目・金の角・炎の口)
MONSTERS.boss2 = pat([
  'KK....KKKK....KK',
  'KDK..KYKKYK..KDK',
  'KDDK.KYYYYK.KDDK',
  'KDDDKDDDDDDKDDDK',
  '.KDDDDDDDDDDDDK.',
  '.KDRRDDDDDDRRDK.',
  '.KDRRDDDDDDRRDK.',
  '.KDDDDDDDDDDDDK.',
  '.KDWKWKWWKWKWDK.',
  '.KDDFFFFFFFFDDK.',
  '..KDDDDDDDDDDK..',
  '.KDDKDDDDDDKDDK.',
  'KDDK.KDDDDK.KDDK',
  'KDK..KDDDDK..KDK',
  '.K..KKDKKDKK..K.',
  '....KKK..KKK....',
], {K,W,D:'#3a2c50',R:'#f02020',Y:'#f0c030',F:'#ff7020'});

RPG.TILESET = TILESET;
RPG.SPRITES = SPRITES;
RPG.MONSTERS = MONSTERS;
})();
