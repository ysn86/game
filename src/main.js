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

  game.start();
  window.GAME = game; // 動作確認用フック
});
})();
