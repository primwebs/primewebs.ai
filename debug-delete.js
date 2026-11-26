(function(){
  if(new URLSearchParams(location.search).get('debug-delete')!=='1') return;
  var entries=[], lastClick=null, panel;
  function safe(v){try{return typeof v==='string'?v:JSON.stringify(v,function(k,x){return typeof x==='object'&&x!==null?x:String(x)});}catch(_){return String(v)}}
  function add(kind,detail){
    var item={time:new Date().toLocaleTimeString(),kind:kind,detail:String(detail||'')};
    entries.push(item); if(entries.length>40)entries.shift(); draw();
  }
  function draw(){
    if(!panel)return;
    var list=entries.slice(-12).map(function(x){return '<div style="padding:6px 0;border-top:1px solid #334155"><b>'+x.time+' · '+x.kind+'</b><div style="white-space:pre-wrap;overflow-wrap:anywhere">'+x.detail.replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})+'</div></div>'}).join('');
    panel.querySelector('[data-log]').innerHTML=list||'Klar til test. Klik på Delete-knappen.';
  }
  function report(){
    return ['PRIME WEBS – DELETE BUTTON DIAGNOSTIC','Time: '+new Date().toISOString(),'URL: '+location.href,'Browser: '+navigator.userAgent,'Last click: '+(lastClick||'No Delete click detected'),'','Events:',entries.map(function(x){return x.time+' ['+x.kind+'] '+x.detail}).join('\n')||'No errors captured.'].join('\n');
  }
  function mount(){
    panel=document.createElement('section');
    panel.id='pw-delete-debug-panel';
    panel.style.cssText='position:fixed;z-index:2147483647;left:10px;right:10px;bottom:10px;max-height:48vh;overflow:auto;background:#101827;color:#f8fafc;border:2px solid #60a5fa;border-radius:14px;padding:12px;font:13px/1.4 system-ui;box-shadow:0 8px 35px #0008';
    panel.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><b>DELETE – FEJLFINDER</b><button data-close style="background:#334155;color:white;border:0;border-radius:7px;padding:6px 10px">Luk</button></div><p style="margin:6px 0">Klik på Delete og derefter Bekræft sletning. Fejl vises her. Dine projekter slettes kun, hvis du selv bekræfter.</p><div data-log style="max-height:25vh;overflow:auto"></div><div style="display:flex;gap:8px;margin-top:10px"><button data-copy style="background:#2563eb;color:white;border:0;border-radius:8px;padding:9px 12px">Kopiér fejlrapport</button><button data-clear style="background:#334155;color:white;border:0;border-radius:8px;padding:9px 12px">Ryd log</button></div>';
    document.body.appendChild(panel);
    panel.querySelector('[data-close]').onclick=function(){panel.remove();panel=null};
    panel.querySelector('[data-clear]').onclick=function(){entries=[];lastClick=null;draw()};
    panel.querySelector('[data-copy]').onclick=function(){var t=report();if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){add('INFO','Fejlrapport kopieret. Send den her i chatten.')}).catch(function(){fallback(t)})}else fallback(t)};
    function fallback(t){var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');add('INFO','Fejlrapport kopieret. Send den her i chatten.')}catch(_){add('INFO',t)}ta.remove()}
    add('READY','Fejlfinder aktiv. Ingen ændringer foretages af fejlfinder-scriptet.');
  }
  window.addEventListener('error',function(e){add('JAVASCRIPT-FEJL',(e.message||'Ukendt fejl')+'\n'+(e.filename||'')+':'+(e.lineno||0)+':'+(e.colno||0))});
  window.addEventListener('unhandledrejection',function(e){add('ASYNC-FEJL',safe(e.reason&&e.reason.stack||e.reason))});
  var oldError=console.error;
  console.error=function(){try{add('CONSOLE.ERROR',Array.prototype.map.call(arguments,safe).join(' '))}catch(_){}return oldError.apply(console,arguments)};
  document.addEventListener('click',function(e){
    var b=e.target&&e.target.closest&&e.target.closest('.sd-delete-project,.dash-delete-project');
    if(!b)return;
    lastClick=(b.textContent||'Delete').trim()+' · data-id='+String(b.dataset.id||'');
    add('KNAP KLIKKET',lastClick);
    setTimeout(function(){
      var stillThere=document.body.contains(b);
      add('EFTER KLIK',stillThere?'Knappen findes stadig efter klikket. Se efter en bekræftelsesknap eller fejl ovenfor.':'Knappen blev fjernet fra siden efter klikket.');
    },400);
  },true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();