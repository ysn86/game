// ゲームデータ定義（レベル・呪文・アイテム・装備・敵）
(function(){
window.RPG = window.RPG || {};
const DB = {};

// レベルテーブル（index+1 = レベル）
// exp: そのレベルに到達するのに必要な累計経験値
DB.LEVELS = [
  {exp:0,    hp:16,  mp:0,  str:5,  vit:4},
  {exp:7,    hp:22,  mp:4,  str:7,  vit:5},
  {exp:22,   hp:27,  mp:8,  str:9,  vit:7,  learn:'heal'},
  {exp:45,   hp:33,  mp:12, str:12, vit:9},
  {exp:80,   hp:40,  mp:16, str:15, vit:11, learn:'fire'},
  {exp:130,  hp:48,  mp:20, str:18, vit:13, learn:'guard'},
  {exp:195,  hp:56,  mp:24, str:22, vit:16, learn:'spark'},
  {exp:280,  hp:66,  mp:30, str:26, vit:19, learn:'ret'},
  {exp:390,  hp:78,  mp:36, str:30, vit:22, learn:'heal2'},
  {exp:530,  hp:92,  mp:44, str:35, vit:26},
  {exp:700,  hp:104, mp:50, str:39, vit:29, learn:'blizzard'},
  {exp:900,  hp:116, mp:56, str:43, vit:32},
  {exp:1130, hp:128, mp:62, str:47, vit:35, learn:'inferno'},
  {exp:1400, hp:140, mp:68, str:51, vit:38},
  {exp:1700, hp:155, mp:76, str:56, vit:42},
];
DB.MAX_LEVEL = DB.LEVELS.length;

DB.SPELLS = {
  heal:     {name:'ヒール',       mp:3,  type:'heal',   power:[20,28], field:true,  fx:'heal'},
  fire:     {name:'ファイア',     mp:4,  type:'attack', power:[15,24], field:false, fx:'fire'},
  guard:    {name:'まもり',       mp:4,  type:'buff',   field:false, fx:'buff',  sfx:'buff'},
  spark:    {name:'スパーク',     mp:7,  type:'attack', power:[26,38], field:false, fx:'spark', sfx:'spark'},
  ret:      {name:'リターン',     mp:8,  type:'warp',   field:true},
  heal2:    {name:'ハイヒール',   mp:8,  type:'heal',   power:[58,75], field:true,  fx:'heal'},
  blizzard: {name:'ブリザド',     mp:10, type:'attack', power:[44,62], field:false, fx:'ice',   sfx:'ice'},
  inferno:  {name:'インフェルノ', mp:14, type:'attack', power:[68,95], field:false, fx:'bigfire'},
};

DB.ITEMS = {
  herb:     {name:'やくそう',       price:24, type:'heal', power:[28,36]},
  antidote: {name:'どくけしそう',   price:12, type:'cure'},
  key:      {name:'まほうのカギ',   type:'key'},
  treasure: {name:'ひかりのたから', type:'key'},
};

DB.WEAPONS = {
  stick:  {name:'ひのきのぼう',   price:10,  atk:2},
  copper: {name:'どうのつるぎ',   price:120, atk:9},
  steel:  {name:'はがねのつるぎ', price:500, atk:16},
};
DB.ARMORS = {
  clothes: {name:'ぬののふく',     price:15,  def:2},
  leather: {name:'かわのよろい',   price:150, def:9},
  steelA:  {name:'はがねのよろい', price:600, def:17},
};

// acts: [行動, 重み] / fire・breath: 固定ダメージ幅 / poison: 通常攻撃時に毒を与える確率
DB.ENEMIES = {
  punipuni: {name:'ぷにぷに',     sprite:'punipuni', hp:7,   atk:8,  def:4,  exp:2,  gold:3},
  batty:    {name:'こうもりん',   sprite:'batty',    hp:11,  atk:11, def:6,  exp:4,  gold:6},
  rat:      {name:'とげラット',   sprite:'rat',      hp:16,  atk:15, def:10, exp:8,  gold:12, poison:0.25},
  bone:     {name:'さまようホネ', sprite:'bone',     hp:26,  atk:22, def:14, exp:16, gold:24},
  mage:     {name:'やみのまどうし', sprite:'mage',   hp:28,  atk:20, def:14, exp:22, gold:42,
             acts:[['attack',6],['fire',4]], fire:[10,16]},
  eye:      {name:'ダークアイ',   sprite:'eye',      hp:32,  atk:26, def:18, exp:24, gold:38,
             acts:[['attack',7],['fire',3]], fire:[12,18], poison:0.2},
  // ラスボス第1形態: 倒すと第2形態(next)に変身する
  boss:     {name:'どうくつのぬし ドラゴネル', sprite:'boss', hp:150, atk:34, def:24, exp:0, gold:0,
             acts:[['attack',6],['breath',4]], breath:[18,26], boss:true, next:'boss2'},
  // ラスボス第2形態(真のすがた)
  boss2:    {name:'真・ドラゴネル', sprite:'boss2', hp:220, atk:42, def:28, exp:500, gold:800,
             acts:[['attack',5],['breath',3],['fire',2]], breath:[26,36], fire:[18,26], boss:true},
  // レア敵: かたくて じゅもんが きかず すぐ にげるが 経験値がたくさんもらえる
  metal:    {name:'メタルぷに', sprite:'metal', hp:4, atk:10, def:60, exp:150, gold:30,
             acts:[['attack',4],['run',6]], spellImmune:true},
};

RPG.DB = DB;
})();
