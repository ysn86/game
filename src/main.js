// 起動処理
(function(){
window.addEventListener('load', ()=>{
  const canvas = document.getElementById('screen');
  const input = new RPG.Input();
  const game = new RPG.Game(canvas, input);

  // タッチ端末なら仮想パッドを表示
  if(('ontouchstart' in window) || matchMedia('(pointer:coarse)').matches
     || location.search.includes('touch=1')){
    document.body.classList.add('touch');
  }
  document.querySelectorAll('#pad button[data-b]').forEach(el=>{
    input.bindTouch(el, el.dataset.b);
  });

  // 最初の操作でオーディオを起動（ブラウザの自動再生制限対応）
  input.onPress(()=>RPG.audio.unlock());
  // Mキーでサウンドのミュート切替
  window.addEventListener('keydown', e=>{
    if(e.key==='m'||e.key==='M') RPG.audio.toggleMute();
  });

  game.start();
  window.GAME = game; // 動作確認用フック
});
})();
