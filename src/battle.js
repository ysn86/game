// 戦闘システム（ドラクエ1風 1対1ターン制）
(function(){
window.RPG = window.RPG || {};
const R = RPG.rand;

function physDamage(atk, def){
  const base = atk/2 - def/4;
  const dmg = Math.floor(base * (0.8 + Math.random()*0.4));
  return Math.max(1, dmg);
}

// 戻り値: 'win' | 'lose' | 'flee'
RPG.runBattle = async function(game, enemyId){
  const E = RPG.DB.ENEMIES[enemyId];
  const ui = game.ui, s = game.state;
  const bs = { enemy:E, ehp:E.hp, visible:true, shake:0, flash:0 };
  game.battle = bs;
  game.mode = 'battle';

  const CMD_POS = {x:16, y:196, cancel:false};
  const SUB_POS = {x:176, y:196};

  await ui.message(E.name+'が あらわれた!');

  let result = null;
  while(!result){
    // ---- プレイヤーのターン ----
    let acted = false;
    while(!acted){
      const c = await ui.choose(['たたかう','じゅもん','どうぐ','にげる'], CMD_POS);
      if(c===0){ // たたかう
        acted = true;
        await ui.message(s.name+'の こうげき!');
        if(Math.random() < 1/16){
          RPG.audio.sfx('miss');
          await ui.message('ミス! ダメージを あたえられない!');
        }else{
          let dmg, crit = Math.random() < 1/24;
          if(crit){
            dmg = Math.max(1, Math.floor(RPG.atk(s)*(0.8+Math.random()*0.25)));
            RPG.audio.sfx('crit');
            await ui.message('かいしんの いちげき!!');
          }else{
            dmg = physDamage(RPG.atk(s), E.def);
            RPG.audio.sfx('hit');
          }
          bs.ehp -= dmg; bs.shake = 0.35;
          await game.sleep(250);
          await ui.message(E.name+'に '+dmg+'の ダメージ!');
        }
      }
      else if(c===1){ // じゅもん
        if(s.spells.length===0){ await ui.message('まだ じゅもんを おぼえていない!'); continue; }
        const list = s.spells.map(id=>{
          const sp=RPG.DB.SPELLS[id];
          return sp.name+'  MP'+sp.mp;
        });
        const i = await ui.choose(list, SUB_POS);
        if(i<0) continue;
        const spId = s.spells[i], sp = RPG.DB.SPELLS[spId];
        if(s.mp < sp.mp){ await ui.message('MPが たりない!'); continue; }
        acted = true;
        s.mp -= sp.mp;
        await ui.message(s.name+'は '+sp.name+'を となえた!');
        if(sp.type==='heal'){
          RPG.audio.sfx('heal');
          const v = Math.min(R(sp.power[0],sp.power[1]), RPG.maxhp(s)-s.hp);
          s.hp += v;
          await ui.message(s.name+'の HPが '+v+' かいふくした!');
        }else{
          RPG.audio.sfx('spell');
          const dmg = R(sp.power[0],sp.power[1]);
          bs.ehp -= dmg; bs.shake = 0.35;
          await game.sleep(250);
          await ui.message(E.name+'に '+dmg+'の ダメージ!');
        }
      }
      else if(c===2){ // どうぐ
        const usable = s.items.filter(it=>RPG.DB.ITEMS[it.id].type!=='key');
        if(usable.length===0){ await ui.message('つかえる どうぐを もっていない!'); continue; }
        const i = await ui.choose(usable.map(it=>RPG.DB.ITEMS[it.id].name+' ×'+it.n), SUB_POS);
        if(i<0) continue;
        const item = RPG.DB.ITEMS[usable[i].id];
        acted = true;
        if(item.type==='heal'){
          RPG.audio.sfx('heal');
          const v = Math.min(R(item.power[0],item.power[1]), RPG.maxhp(s)-s.hp);
          s.hp += v;
          RPG.removeItem(s, usable[i].id);
          await ui.message(s.name+'は '+item.name+'を つかった!\nHPが '+v+' かいふくした!');
        }else if(item.type==='cure'){
          RPG.removeItem(s, usable[i].id);
          if(s.poisoned){ s.poisoned=false; RPG.audio.sfx('heal'); await ui.message('どくが きえさった!'); }
          else await ui.message('しかし なにも おこらなかった。');
        }
      }
      else if(c===3){ // にげる
        acted = true;
        await ui.message(s.name+'は にげだした!');
        if(E.boss){
          await ui.message('しかし まわりこまれてしまった!');
        }else{
          const chance = Math.min(0.9, Math.max(0.3, 0.55 + (s.level - E.exp/8)*0.03));
          if(Math.random() < chance){ RPG.audio.sfx('flee'); result='flee'; break; }
          await ui.message('しかし まわりこまれてしまった!');
        }
      }
    }
    if(result) break;

    if(bs.ehp<=0){
      bs.visible = false;
      await ui.message(E.name+'を たおした!');
      result = 'win';
      break;
    }

    // ---- 敵のターン ----
    let act = 'attack';
    if(E.acts){
      const total = E.acts.reduce((a,[,w])=>a+w,0);
      let roll = Math.random()*total;
      for(const [name,w] of E.acts){ roll-=w; if(roll<=0){ act=name; break; } }
    }
    if(act==='attack'){
      await ui.message(E.name+'の こうげき!');
      if(Math.random() < 1/20){
        RPG.audio.sfx('miss');
        await ui.message(s.name+'は ひらりと みをかわした!');
      }else{
        const dmg = physDamage(E.atk, RPG.def(s));
        s.hp = Math.max(0, s.hp-dmg);
        RPG.audio.sfx('phit');
        bs.flash = 0.3;
        await game.sleep(250);
        await ui.message(s.name+'は '+dmg+'の ダメージを うけた!');
        if(E.poison && !s.poisoned && s.hp>0 && Math.random()<E.poison){
          s.poisoned = true;
          await ui.message(s.name+'は どくを うけてしまった!');
        }
      }
    }else if(act==='fire'){
      const dmg = R(E.fire[0], E.fire[1]);
      s.hp = Math.max(0, s.hp-dmg);
      RPG.audio.sfx('spell');
      RPG.audio.sfx('phit');
      bs.flash = 0.3;
      await ui.message(E.name+'は ほのおのじゅもんを となえた!\n'+s.name+'は '+dmg+'の ダメージを うけた!');
    }else if(act==='breath'){
      const dmg = R(E.breath[0], E.breath[1]);
      s.hp = Math.max(0, s.hp-dmg);
      RPG.audio.sfx('spell');
      RPG.audio.sfx('phit');
      bs.flash = 0.35;
      await ui.message(E.name+'は ほのおを はいた!\n'+s.name+'は '+dmg+'の ダメージを うけた!');
    }

    if(s.hp<=0){ result='lose'; break; }
  }

  // ---- 結果処理 ----
  if(result==='win'){
    RPG.audio.jingle('victory');
    s.exp += E.exp; s.gold += E.gold;
    await ui.message('けいけんち '+E.exp+' を かくとく!\n'+E.gold+'ゴールドを てにいれた!');
    const lvMsgs = RPG.checkLevelUp(s);
    if(lvMsgs.length) RPG.audio.jingle('levelup'); // レベルアップのファンファーレ
    for(const m of lvMsgs) await ui.message(m);
  }

  game.battle = null;
  if(result!=='lose') game.mode = 'field';
  return result;
};
})();
