/* ===== Lag 0: hjælpere ===== */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const $=s=>document.querySelector(s);

/* ===== Lag 1: adaptere (udskiftes senere med backend) ===== */
// Storage: browseren nu, database (fx Supabase) senere
const Storage={mem:{},
  get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return k in this.mem?this.mem[k]:d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){this.mem[k]=v}}};
// Session: én lokal bruger nu, rigtigt login senere
const Session={user:()=>({id:'local',name:'Ejer',role:'owner',email:Settings.get().ownerEmail}),can:()=>['owner','admin'].includes(Session.user().role)};
// Credits: lokal tæller nu, regnskab + Stripe senere
const Credits={cost:{generate:10,edit:1},
  unlimited:()=>Session.can(),
  balance(){return this.unlimited()?Infinity:Storage.get('pw.credits',50)},
  spend(a){if(this.unlimited())return true;const b=this.balance(),c=this.cost[a];if(b<c)return false;Storage.set('pw.credits',b-c);return true}};
// Projects: repository, samme interface mod database senere
const Projects={all:()=>Storage.get('pw.projects',[]),save:l=>Storage.set('pw.projects',l)};
const Customers={all:()=>Storage.get('pw.customers',[]),save:l=>Storage.set('pw.customers',l)};
const Settings={d:{company:'PrimeWebs',email:'primewebssupport@gmail.com',phone:'+45 30 95 05 93',web:'https://primewebs.space',ownerEmail:'primewebssupport@gmail.com',theme:'auto'},get(){return{...this.d,...Storage.get('pw.settings',{})}},set(k,v){Storage.set('pw.settings',{...Storage.get('pw.settings',{}),[k]:v})}};

/* ===== Lag 2: rigtig AI via sikker serverfunktion ===== */
const STYLES={Moderne:{accent:'#2540D9',font:'sans',mode:'light'},Elegant:{accent:'#9A6B2F',font:'serif',mode:'light'},Frisk:{accent:'#1E8E5A',font:'sans',mode:'light'},Mørk:{accent:'#8DA0FF',font:'sans',mode:'dark'},Natur:{accent:'#3F7D4E',font:'sans',mode:'light'},Hav:{accent:'#0E7C86',font:'sans',mode:'light'},Solnedgang:{accent:'#E8730C',font:'sans',mode:'light'},Rosa:{accent:'#D6457F',font:'sans',mode:'light'},Lavendel:{accent:'#7B3FD1',font:'sans',mode:'light'},Premium:{accent:'#C9A24B',font:'serif',mode:'dark'}};
const COLORS={blå:'#2540D9',grøn:'#1E8E5A',rød:'#D12C3F',lilla:'#7B3FD1',orange:'#E8730C',sort:'#111111',gul:'#E3B505',turkis:'#0E9AA7',pink:'#D6457F',lyserød:'#E58BB0',brun:'#8A5A3B',grå:'#6B7280',navy:'#1E3A8A',marineblå:'#1E3A8A',guld:'#C9A24B',mint:'#2BB48D',bordeaux:'#7A1F3D',himmelblå:'#38A3F1'};
const mk={
  hero:(n,d)=>({id:uid(),type:'hero',title:'Velkommen til '+n,text:(d?d+' ':'')+'Vi hjælper dig godt i gang med en løsning, der passer til dine behov. Kontakt os i dag for en uforpligtende samtale.',cta:'Kontakt os'}),
  features:()=>({id:uid(),type:'features',title:'Hvorfor vælge os',items:[
    {t:'Erfaring',d:'Vi kender branchen og leverer arbejde, du kan regne med.'},
    {t:'Hurtig levering',d:'Du får svar og løsning hurtigt, uden unødige omveje.'},
    {t:'Personlig service',d:'Du taler direkte med dem, der løser opgaven.'},
    {t:'Klar pris',d:'Du ved, hvad det koster, før vi går i gang.'}]}),
  about:(n,d)=>({id:uid(),type:'about',title:'Om '+n,text:(d?d+'\n\n':'')+'Vi er et lokalt team, der brænder for at gøre en forskel for vores kunder. Vi lytter først og leverer derefter løsninger, der er tænkt igennem.\n\nVores mål er, at du føler dig godt hjulpet fra første henvendelse, til opgaven er løst.'}),
  services:()=>({id:uid(),type:'services',title:'Vores ydelser',items:[
    {t:'Rådgivning',d:'Vi starter med en uforpligtende samtale, hvor vi lytter til dine behov og finder den bedste løsning sammen med dig.'},
    {t:'Løsning og udførelse',d:'Vi udfører opgaven grundigt og med fokus på kvalitet, så resultatet holder længe.'},
    {t:'Opfølgning',d:'Efter levering følger vi op, så du er tryg ved resultatet, og vi kan justere, hvis noget skal være anderledes.'},
    {t:'Løbende support',d:'Har du spørgsmål undervejs eller bagefter, er du altid velkommen til at kontakte os.'}]}),
  steps:()=>({id:uid(),type:'steps',title:'Sådan foregår det',items:[
    {t:'Du kontakter os',d:'Fortæl kort, hvad du har brug for, enten på telefon eller via mail.'},
    {t:'Vi aftaler detaljerne',d:'Vi gennemgår opgaven, tidsplan og pris, så der ikke er nogen overraskelser.'},
    {t:'Vi leverer',d:'Vi udfører arbejdet og holder dig opdateret undervejs.'},
    {t:'Du er tilfreds',d:'Vi følger op og sikrer, at resultatet lever op til dine forventninger.'}]}),
  faq:()=>({id:uid(),type:'faq',title:'Ofte stillede spørgsmål',items:[
    {t:'Hvordan kommer jeg i gang?',d:'Kontakt os på telefon eller mail, så aftaler vi en uforpligtende samtale.'},
    {t:'Hvor hurtigt kan I hjælpe?',d:'Det afhænger af opgaven, men du får altid et realistisk tidsestimat fra start.'},
    {t:'Hvad koster det?',d:'Prisen afhænger af opgavens omfang. Du får et tilbud, før vi går i gang.'},
    {t:'Kan jeg få rettet noget bagefter?',d:'Ja, sig til, hvis noget skal justeres, så kigger vi på det sammen.'}]}),
  cta:n=>({id:uid(),type:'cta',title:'Klar til at komme i gang?',text:'Kontakt '+n+' i dag, og hør, hvordan vi kan hjælpe dig. Samtalen er uforpligtende.',cta:'Kontakt os nu'}),
  contact:()=>({id:uid(),type:'contact',title:'Kontakt',text:'Skriv eller ring, så vender vi hurtigt tilbage.',email:Settings.get().email,phone:Settings.get().phone})};
const DemoAI={mode:'test',
  async generate(input){await wait(900);return smartSite(input)},
  async edit(site,msg){await wait(500);
    const s=structuredClone(site),m=msg.toLowerCase(),th=s.meta.theme,name=s.meta.title,out=[];
    const q=(msg.match(/[“"„»]([^”"“«]+)[”"“«]/)||[])[1],hero=s.blocks.find(b=>b.type==='hero');
    const tk=m.split(/[^a-zæøå]+/),col=Object.keys(COLORS).find(k=>tk.some(w=>w===k||w===k+'t'||w===k+'e'));
    if(col&&!q&&/farve|knap|skift|gør|ændr/.test(m)){th.accent=COLORS[col];out.push('Farven er skiftet til '+col)}
    if(/mørk/.test(m)){th.mode='dark';out.push('Siden er nu mørk')}
    else if(/\blys\b|lyst/.test(m)){th.mode='light';out.push('Siden er nu lys')}
    if(/serif|elegant|klassisk/.test(m)){th.font='serif';out.push('Skriften er nu serif')}
    else if(/sans|moderne/.test(m)){th.font='sans';out.push('Skriften er nu sans-serif')}
    if(hero){
      if(/overskrift/.test(m)){
        if(q){hero.title=q;out.push('Overskriften er ændret')}
        else if(/personlig/.test(m)){hero.title='Hos '+name+' er du i gode hænder';out.push('Overskriften er gjort mere personlig')}
        else if(/kort/.test(m)){hero.title=name;out.push('Overskriften er gjort kortere')}
      }else if(q&&/tekst|beskrivelse/.test(m)){hero.text=q;out.push('Teksten er ændret')}
      if(q&&/knap/.test(m)){hero.cta=q;out.push('Knappen hedder nu '+q)}
    }
    const T={'kontakt':'contact','fordele':'features','om os':'about','ydelser':'services','sådan foregår':'steps','faq':'faq','opfordring':'cta'};
    for(const [k,t] of Object.entries(T)){if(!m.includes(k))continue;const has=s.blocks.some(b=>b.type===t);
      if(/tilføj/.test(m)&&!has){const nb=mk[t](name,''),ci=s.blocks.findIndex(b=>b.type==='contact');
        (t!=='contact'&&ci>-1)?s.blocks.splice(ci,0,nb):s.blocks.push(nb);out.push(k+' er tilføjet')}
      else if(/fjern|slet/.test(m)&&has){s.blocks=s.blocks.filter(b=>b.type!==t);out.push(k+' er fjernet')}}
    if(!out.length)return{site:null,reply:'Det forstod testgeneratoren ikke endnu. Prøv fx: skift farve til grøn, gør siden mørk, tilføj Om os, eller skift overskrift til “…”. Intet er trukket fra dine credits.'};
    return{site:s,reply:out.join('. ')+'.'}}};

/* AI-lag: rigtig AI via /api/ai; falder tilbage til demo-tilstand, hvis serveren ikke er sat op */
const AI={mode:'api',
  async request(action,payload){
    const response=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json','x-access-code':Settings.get().aiCode||''},body:JSON.stringify({action,...payload})});
    const data=await response.json().catch(()=>({error:'Serveren returnerede et ugyldigt svar.'}));
    if(!response.ok){const e=new Error(data.error||'AI-forbindelsen fejlede ('+response.status+').');e.status=response.status;throw e}
    return data;
  },
  async run(action,payload,demo){
    try{const r=await this.request(action,payload);this.mode='api';return r}
    catch(e){
      if(e.status&&![503,404].includes(e.status))throw e;
      this.mode='demo';
      return demo();
    }
  },
  generate(input){return this.run('generate',input,async()=>({site:await DemoAI.generate(input),reply:'Demo-tilstand: AI-serveren er ikke sat op endnu, så siden er lavet af testgeneratoren.'}))},
  edit(site,message){return this.run('edit',{site,message},async()=>{const r=await DemoAI.edit(site,message);return{site:r.site,reply:'Demo: '+r.reply}})}
};

/* ===== Lag 3: renderer (JSON -> HTML). Samme output bruges til udgivelse/eksport senere ===== */
const B={
  hero:b=>`<section><h1>${esc(b.title)}</h1><p>${esc(b.text)}</p><a class="btn" href="#kontakt">${esc(b.cta)}</a></section>`,
  features:b=>`<section><h2>${esc(b.title)}</h2><div class="g">${b.items.map(i=>`<div class="c"><h3>${esc(i.t)}</h3><p>${esc(i.d)}</p></div>`).join('')}</div></section>`,
  about:b=>`<section><h2>${esc(b.title)}</h2>${String(b.text||'').split(/\n\n+/).map(x=>`<p>${esc(x)}</p>`).join('')}</section>`,
  services:b=>B.features(b),
  steps:b=>`<section><h2>${esc(b.title)}</h2><div class="g">${b.items.map((i,n)=>`<div class="c"><h3>${n+1}. ${esc(i.t)}</h3><p>${esc(i.d)}</p></div>`).join('')}</div></section>`,
  faq:b=>`<section><h2>${esc(b.title)}</h2>${b.items.map(i=>`<details class="c" style="margin-bottom:.6rem"><summary style="cursor:pointer;font-weight:600">${esc(i.t)}</summary><p>${esc(i.d)}</p></details>`).join('')}</section>`,
  cta:b=>`<section style="text-align:center"><h2>${esc(b.title)}</h2><p>${esc(b.text)}</p><a class="btn" href="#kontakt">${esc(b.cta)}</a></section>`,
  contact:b=>`<section id="kontakt"><h2>${esc(b.title)}</h2><p>${esc(b.text)}</p><p><a href="tel:${esc(b.phone)}">${esc(b.phone)}</a><br><a href="mailto:${esc(b.email)}">${esc(b.email)}</a></p></section>`};
const lum=h=>{const n=parseInt(h.slice(1),16);return((n>>16&255)*299+(n>>8&255)*587+(n&255)*114)/1000};
const Renderer={html(p){
  const s=p.site,t=s.meta.theme,d=t.mode==='dark',a=/^#[0-9a-fA-F]{6}$/.test(t.accent)?t.accent:'#2540D9',bt=lum(a)>150?'#0E1320':'#fff';
  const f=t.font==='serif'?'Georgia,"Times New Roman",serif':'system-ui,-apple-system,"Segoe UI",sans-serif';
  const bg=d?'#0E1320':'#fff',fg=d?'#E8ECF5':'#101828',mu=d?'#9AA6BD':'#4B5565',ln=d?'#2A3350':'#E3E8F0',sf=d?'#171E30':'#F5F7FB';
  return `<!DOCTYPE html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(s.meta.title)}</title><style>*{box-sizing:border-box}body{margin:0;font-family:${f};background:${bg};color:${fg};line-height:1.6}header{padding:1rem 1.5rem;font-weight:700;border-bottom:1px solid ${ln}}section{padding:2.5rem 1.5rem;max-width:960px;margin:0 auto}h1{font-size:clamp(2rem,6vw,3.2rem);line-height:1.1;margin:0 0 1rem}h2{margin:0 0 1rem}p{color:${mu}}.btn{display:inline-block;background:${a};color:${bt};padding:.8rem 1.4rem;border-radius:8px;text-decoration:none;font-weight:600}.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem}.c{background:${sf};border:1px solid ${ln};border-radius:10px;padding:1rem}a{color:${a}}.btn{color:${bt}}footer{padding:1.5rem;text-align:center;color:${mu};border-top:1px solid ${ln}}</style></head><body><header>${esc(s.meta.title)}</header>${s.blocks.map(b=>(B[b.type]||(()=>''))(b)).join('')}<footer>© ${esc(s.meta.title)}</footer></body></html>`}};

/* ===== Lag 4: UI ===== */
let S={view:'dash',cf:{name:'',email:'',plan:'Gratis'},out:null,outId:null,msg:'',rv:'',rc:0,cdel:null,id:null,device:'desktop',busy:false,err:'',del:null,form:{name:'',desc:'',style:'Moderne'}};
const getP=()=>Projects.all().find(p=>p.id===S.id);
const upd=(id,fn)=>{const l=Projects.all(),i=l.findIndex(p=>p.id===id);if(i<0)return;fn(l[i]);l[i].updatedAt=Date.now();Projects.save(l)};

function vList(){const l=Projects.all();
  if(!l.length)return `<div class="empty"><h1>Mine hjemmesider</h1><h3>Du har ingen projekter endnu</h3><p class="mu">Opret dit første projekt, og få en komplet hjemmeside på få sekunder.</p><button class="btn" data-act="new">Nyt projekt</button></div>`;
  return `<h1>Mine hjemmesider</h1><div class="grid">${l.map(p=>`<div class="card"><h3>${esc(p.name)}</h3><p class="mu">${p.status==='ready'?'Klar til udgivelse':'Kladde'}, ændret ${new Date(p.updatedAt).toLocaleDateString('da-DK')}</p><div class="row"><button class="btn" data-act="open" data-id="${p.id}">Chat-editor</button><button class="btn ghost" data-act="build" data-id="${p.id}">Bygger</button><button class="btn ghost" data-act="del" data-id="${p.id}">${S.del===p.id?'Bekræft sletning':'Slet'}</button></div></div>`).join('')}</div>`}


function vEdit(){const p=getP();if(!p)return vPick('edit')
  const chips=['Skift farve til grøn','Gør siden mørk','Tilføj Om os','Skift overskrift til “Din lokale ekspert”'];
  return `<div class="bar"><button class="btn ghost" data-act="list">← Projekter</button><strong>${esc(p.name)}</strong><span class="sp"></span><button class="btn ghost" data-act="undo" ${p.history.length?'':'disabled'}>Fortryd</button><button class="btn ghost" data-act="redo" ${p.future.length?'':'disabled'}>Gentag</button><button class="btn ${S.device==='desktop'?'':'ghost'}" data-act="dev" data-d="desktop">Computer</button><button class="btn ${S.device==='mobile'?'':'ghost'}" data-act="dev" data-d="mobile">Mobil</button></div>
<div class="ed"><section class="chat"><div class="msgs">${p.chat.map(m=>`<div class="m ${m.r}">${esc(m.t)}</div>`).join('')}${S.busy?'<div class="m ai">Arbejder…</div>':''}</div><div class="chips">${chips.map(t=>`<button class="chip" data-act="chip" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div><div class="row"><input id="chatin" placeholder="Skriv en ændring…" ${S.busy?'disabled':''}><button class="btn" data-act="send" ${S.busy?'disabled':''}>Send</button></div></section><section class="pv"><iframe class="${S.device}" title="Live preview" sandbox srcdoc="${esc(Renderer.html(p))}"></iframe></section></div>`}

/* ===== Nye sider ===== */
const NAV=[
 ['Overblik',[['dash','Dashboard']]],
 ['Hjemmesider',[['list','Mine hjemmesider'],['new','Opret ny hjemmeside'],['templates','Skabeloner']]],
 ['Redigering',[['edit','AI Chat Editor'],['builder','AI Website Builder'],['customize','Tilpas design'],['preview','Forhåndsvisning'],['history','Versionshistorik']]],
 ['Udgivelse',[['domains','Domæner og publicering'],['export','Eksportér']]],
 ['Forretning',[['customers','Kunder og projekter'],['credits','Credits og abonnementer'],['finp','Finance',[['finance','Overblik'],['finlist','Posteringer'],['fincust','Pr. kunde']]],['stats','Statistik og analyser']]],
 ['System',[['setp','Indstillinger',[['settings','Virksomhed og konto'],['colors','Udseende og farver']]],['adminp','Admin Panel',[['admin','Roller og adgang'],['backup','Sikkerhedskopi']]]]]
];
const BT={hero:'Forside',features:'Fordele',about:'Om os',contact:'Kontakt',services:'Ydelser',steps:'Sådan foregår det',faq:'Spørgsmål og svar',cta:'Opfordring'},LBL={title:'Overskrift',text:'Tekst',cta:'Knaptekst',email:'E-mail',phone:'Telefon',t:'Titel',d:'Beskrivelse'};
const PLANS=[['Gratis',50,0],['Starter',500,25],['Pro',1200,50],['Business',3000,100]];
const TPL=[{n:'Restaurant',s:'Elegant',d:'Hyggelig restaurant med lokale råvarer og sæsonens menu.'},{n:'Håndværker',s:'Moderne',d:'Pålidelig håndværker til nybyg, renovering og service.'},{n:'Frisør',s:'Frisk',d:'Frisørsalon med fokus på klip, farve og personlig rådgivning.'},{n:'Konsulent',s:'Mørk',d:'Selvstændig konsulent, der hjælper virksomheder med strategi og vækst.'}];
const CK=[[1,'AI-generator via sikker serverfunktion (API-nøgle kræves)'],[1,'Live preview og chat-redigering'],[1,'Bygger med direkte redigering af blokke'],[1,'Ejer/admin med ubegrænsede credits'],[1,'Kunder med egne credits (manuelt)'],[1,'Sikkerhedskopi og gendannelse'],[1,'Adgangskode, begrænsning og validering på AI-serveren'],[1,'Demo-tilstand, hvis AI-serveren ikke er sat op'],[0,'Login og database'],[0,'Rigtig publicering og egne domæner'],[0,'Betaling og abonnementer (kræver din godkendelse)']];
const nEdits=p=>p.chat.filter(m=>m.r==='u').length;
const snap=()=>JSON.stringify({app:'primewebs',v:1,at:new Date().toISOString(),projects:Projects.all(),customers:Customers.all(),settings:(({aiCode,...r})=>r)(Settings.get()),finance:Fin.all(),credits:Storage.get('pw.credits',50)},null,1);
const frame=p=>`<iframe title="Live preview" sandbox srcdoc="${esc(Renderer.html(p))}"></iframe>`;

function vPick(t){const l=Projects.all();return `<h1>${PT[t]||'Vælg hjemmeside'}</h1><p class="mu">Vælg en hjemmeside at arbejde på.</p>`+(l.length?`<div class="grid">${l.map(p=>`<div class="card"><h3>${esc(p.name)}</h3><button class="btn" data-act="pick" data-t="${t}" data-id="${p.id}">Vælg</button></div>`).join('')}</div>`:`<p>Du har ingen hjemmesider endnu.</p><button class="btn" data-act="go" data-v="new">Opret ny hjemmeside</button>`)}

function vDash(){const l=Projects.all(),u=Session.user(),t=(n,x)=>`<div class="card"><div class="mu">${x}</div><h1>${n}</h1></div>`;
  return `<h1>Dashboard</h1><p class="mu">Velkommen, ${esc(u.name)}. Rolle: ${u.role.toUpperCase()}.</p><div class="grid">${t(l.length,'Hjemmesider')}${t(Customers.all().length,'Kunder')}${t(fmt(finSum('income',monthKey())-finSum('expense',monthKey())),'Resultat denne måned')}${t(Credits.unlimited()?'Ubegrænset':Credits.balance(),'Dine credits')}${t(l.reduce((n,p)=>n+nEdits(p),0),'Chat-ændringer i alt')}</div><div class="row" style="margin:1rem 0"><button class="btn" data-act="go" data-v="new">Opret ny hjemmeside</button><button class="btn ghost" data-act="go" data-v="templates">Se skabeloner</button></div><h3>Seneste hjemmesider</h3>${l.length?`<div class="grid">${l.slice(0,3).map(p=>`<div class="card"><h3>${esc(p.name)}</h3><button class="btn" data-act="open" data-id="${p.id}">Åbn</button></div>`).join('')}</div>`:'<p class="mu">Ingen endnu.</p>'}<h3 style="margin-top:1.5rem">Platformens status</h3>${CK.map(([o,x])=>`<div class="ck"><span class="${o?'ok':''}">${o?'✓':'○'}</span>${x}</div>`).join('')}`}

function vBuilder(){const p=getP();if(!p)return vPick('builder');const bl=p.site.blocks;
  const fl=(bi,k,v,x='')=>`<label>${LBL[k]||k}${(k==='text'||k==='d')?`<textarea data-b="${bi}" data-k="${k}" ${x}>${esc(v)}</textarea>`:`<input data-b="${bi}" data-k="${k}" ${x} value="${esc(v)}">`}</label>`;
  const card=(b,bi)=>`<div class="card" style="margin-bottom:.8rem"><div class="row"><strong>${BT[b.type]||b.type}</strong><span class="sp"></span><button class="btn ghost" data-act="bmove" data-i="${bi}" data-d="-1" ${bi?'':'disabled'}>↑</button><button class="btn ghost" data-act="bmove" data-i="${bi}" data-d="1" ${bi<bl.length-1?'':'disabled'}>↓</button>${b.type==='hero'?'':`<button class="btn ghost" data-act="brem" data-i="${bi}">Fjern</button>`}</div>${Object.keys(b).filter(k=>k!=='id'&&k!=='type').map(k=>Array.isArray(b[k])?b[k].map((it,ii)=>fl(bi,'t',it.t,`data-i="${ii}" data-ik="t"`)+fl(bi,'d',it.d,`data-i="${ii}" data-ik="d"`)).join(''):fl(bi,k,b[k])).join('')}</div>`;
  const adds=Object.keys(BT).filter(t=>!bl.some(b=>b.type===t)).map(t=>`<button class="btn ghost" data-act="badd" data-t="${t}">+ ${BT[t]}</button>`).join('');
  return `<div class="bar"><strong>AI Website Builder: ${esc(p.name)}</strong><span class="sp"></span><button class="btn ghost" data-act="unpick">Vælg anden</button><button class="btn ghost" data-act="undo" ${p.history.length?'':'disabled'}>Fortryd</button><button class="btn ghost" data-act="redo" ${p.future.length?'':'disabled'}>Gentag</button></div><div class="ed"><section class="chat" style="overflow:auto"><p class="mu">Ret felterne direkte. Ændringer gemmes med det samme, og preview opdateres.</p>${bl.map(card).join('')}<div class="row">${adds}</div></section><section class="pv">${frame(p)}</section></div>`}

function vTpl(){return `<h1>Skabeloner</h1><p class="mu">Start fra en skabelon, og tilpas den bagefter.</p><div class="grid">${TPL.map((t,i)=>`<div class="card"><h3>${t.n}</h3><p class="mu">${t.d}</p><p class="mu">Stil: ${t.s}</p><button class="btn" data-act="tpl" data-i="${i}">Brug skabelon</button></div>`).join('')}</div>`}

function vDom(){const l=Projects.all();
  return `<h1>Domæner og publicering</h1><p class="mu">Her gemmer du domænenavn og status og eksporterer hjemmesidens kode. Selve udgivelsen og DNS-tilslutningen kræver hosting og en server, som vi bygger senere.</p>`+(l.length?l.map(p=>`<div class="card" style="margin-bottom:.8rem"><div class="row"><strong>${esc(p.name)}</strong><span class="badge">${p.status==='ready'?'Klar til udgivelse':'Kladde'}</span></div><label>Domæne<input data-dom="${p.id}" placeholder="fx minvirksomhed.dk" value="${esc(p.domain||'')}"></label><p class="mu">${p.domain?'Domænet er gemt, men ikke tilsluttet endnu.':'Intet domæne valgt.'}</p><div class="row"><button class="btn ghost" data-act="rdy" data-id="${p.id}">${p.status==='ready'?'Sæt tilbage til kladde':'Markér klar til udgivelse'}</button></div>${S.out&&S.outId===p.id?`<label style="margin-top:1rem">HTML-kode (markér og kopiér)<textarea class="code" readonly>${esc(S.out)}</textarea></label>`:''}</div>`).join(''):'<p>Ingen hjemmesider endnu.</p>')}

function vCred(){return `<h1>Credits og abonnementer</h1><div class="card" style="margin-bottom:1rem"><span class="badge">OWNER / ADMIN</span><h3 style="margin-top:.6rem">Din konto: ubegrænsede credits</h3><p class="mu">Intet trækkes, når du selv genererer, tester eller redigerer.</p></div><h3>Credit-forbrug for kunder</h3><table><tr><th>Handling</th><th>Credits</th></tr><tr><td>Generér hjemmeside</td><td>${Credits.cost.generate}</td></tr><tr><td>Chat-ændring</td><td>${Credits.cost.edit}</td></tr></table><h3 style="margin-top:1.5rem">Abonnementer (udkast)</h3><table><tr><th>Plan</th><th>Credits pr. måned</th></tr>${PLANS.map(([n,c])=>`<tr><td>${n}</td><td>${c}</td></tr>`).join('')}</table><p class="mu">Der er ikke tilsluttet nogen betaling. Priser og betalingssystem tilføjes først, når du har godkendt det.</p>`}

function vCust(){const c=Customers.all(),l=Projects.all(),f=S.cf,po=(v)=>PLANS.map(([n])=>`<option ${v===n?'selected':''}>${n}</option>`).join('');
  return `<h1>Kunder og projekter</h1><div class="card form" style="margin-bottom:1rem"><h3>Ny kunde</h3><label>Navn<input data-g="name" value="${esc(f.name)}"></label><label>E-mail<input data-g="email" value="${esc(f.email)}"></label><label>Plan<select data-g="plan">${po(f.plan)}</select></label>${S.err?`<p class="err">${esc(S.err)}</p>`:''}<button class="btn" data-act="cadd">Tilføj kunde</button></div><h3>Kunder</h3>`+(c.length?`<table><tr><th>Kunde</th><th>Plan</th><th>Credits</th><th></th></tr>${c.map(u=>`<tr><td>${esc(u.name)}<div class="mu" style="margin:0">${esc(u.email)}</div></td><td><select data-cu="${u.id}" data-cf="plan">${po(u.plan)}</select></td><td>${u.credits}</td><td><div class="row"><button class="btn ghost" data-act="cc" data-id="${u.id}" data-n="-10">−10</button><button class="btn ghost" data-act="cc" data-id="${u.id}" data-n="10">+10</button><button class="btn ghost" data-act="cdel" data-id="${u.id}">${S.cdel===u.id?'Bekræft':'Slet'}</button></div></td></tr>`).join('')}</table>`:'<p class="mu">Ingen kunder endnu.</p>')+`<h3 style="margin-top:1.5rem">Projekter</h3>`+(l.length?`<table><tr><th>Hjemmeside</th><th>Kunde</th></tr>${l.map(p=>`<tr><td>${esc(p.name)}</td><td><select data-cp="${p.id}"><option value="">Intern (mig)</option>${c.map(u=>`<option value="${u.id}" ${p.customerId===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select></td></tr>`).join('')}</table>`:'<p class="mu">Ingen hjemmesider endnu.</p>')}

function vStats(){const l=Projects.all(),mx=Math.max(1,...l.map(nEdits)),t=(n,x)=>`<div class="card"><div class="mu">${x}</div><h1>${n}</h1></div>`;
  return `<h1>Statistik og analyser</h1><p class="mu">Oversigt over arbejdet på platformen. Besøgstal for udgivne hjemmesider kommer, når publicering er tilsluttet.</p><div class="grid" style="margin-bottom:1rem">${t(l.length,'Hjemmesider')}${t(Customers.all().length,'Kunder')}${t(l.reduce((n,p)=>n+nEdits(p),0),'Chat-ændringer')}</div>`+(l.length?`<table><tr><th>Hjemmeside</th><th>Chat-ændringer</th><th>Blokke</th></tr>${l.map(p=>`<tr><td>${esc(p.name)}</td><td><div class="bar2" style="width:${nEdits(p)/mx*100}%"></div>${nEdits(p)}</td><td>${p.site.blocks.length}</td></tr>`).join('')}</table>`:'')}

function vSet(){const s=Settings.get(),u=Session.user(),f=(k,t)=>`<label>${t}<input data-s="${k}" value="${esc(s[k])}"></label>`;
  return `<h1>Indstillinger</h1><div class="card form"><h3>Virksomhed</h3><p class="mu">Bruges som standard i nye hjemmesiders kontaktsektion.</p>${f('company','Virksomhedsnavn')}${f('email','E-mail')}${f('phone','Telefon')}${f('web','Hjemmeside')}<label>AI-adgangskode (samme som ACCESS_CODE på serveren)<input type="password" data-s="aiCode" value="${esc(s.aiCode||'')}"></label><label>Udseende<select data-s="theme">${[['auto','Følg enheden'],['light','Lyst'],['dark','Mørkt']].map(([v,t])=>`<option value="${v}" ${s.theme===v?'selected':''}>${t}</option>`).join('')}</select></label></div><div class="card form" style="margin-top:1rem"><h3>Konto</h3><p>${esc(u.name)} <span class="badge">${u.role.toUpperCase()}</span></p><h3>Tilslutninger</h3><p class="mu">AI: ${AI.mode==='api'?'AI-server (Claude) bruges, hvis den er sat op':'demo-tilstand (testgenerator), AI-serveren svarer ikke'}<br>Betalingssystem: ikke tilsluttet<br>Database og login: ikke tilsluttet, data gemmes i denne browser</p></div>`}

function vAdmin(){if(!Session.can())return '<h1>Admin Panel</h1><p>Du har ikke adgang.</p>';
  return `<h1>Admin Panel</h1><div class="grid" style="margin-bottom:1rem"><div class="card"><div class="mu">Roller</div><p><span class="badge">OWNER</span> og <span class="badge">ADMIN</span>: fuld adgang og ubegrænsede credits.<br><span class="badge">KUNDE</span>: egne hjemmesider og credits (kommer med login).</p></div><div class="card"><div class="mu">Data i denne browser</div><p>${Projects.all().length} hjemmesider, ${Customers.all().length} kunder</p></div></div><!--BK--><div class="card stack"><h3>Sikkerhedskopi</h3><p class="mu">Kopiér al data (hjemmesider, kunder, indstillinger) og gem teksten i en fil på din computer.</p><button class="btn" data-act="bk">Lav sikkerhedskopi</button>${S.out&&S.outId==='bk'?`<textarea class="code" readonly>${esc(S.out)}</textarea>`:''}<h3>Gendan</h3><textarea class="code" id="rs" placeholder="Indsæt sikkerhedskopi her">${esc(S.rv)}</textarea><button class="btn ghost" data-act="rs">${S.rc?'Bekræft: overskriv al data':'Gendan fra kopi'}</button>${S.msg?`<p class="${S.msg.startsWith('Fejl')?'err':''}">${esc(S.msg)}</p>`:''}</div>`}

/* ===== Finance (manuel registrering, ingen betalingssystem tilsluttet) ===== */
const Fin={all:()=>Storage.get('pw.finance',[]),save:l=>Storage.set('pw.finance',l)};
const fmt=n=>new Intl.NumberFormat('da-DK',{style:'currency',currency:'DKK',maximumFractionDigits:0}).format(n||0);
const monthKey=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
const today=()=>{const d=new Date();return monthKey(d)+'-'+String(d.getDate()).padStart(2,'0')};
const FCAT={income:['Hjemmeside','Abonnement','Vedligeholdelse','Andet'],expense:['Software','Hosting og domæner','Markedsføring','Løn og freelancere','Andet']};
const FPER=[['m','Denne måned'],['q','Seneste 3 måneder'],['y','I år'],['a','Alt']];
const inPer=(e,p)=>{const d=e.date||'',n=new Date();if(p==='a')return true;if(p==='y')return d.slice(0,4)===String(n.getFullYear());if(p==='m')return d.slice(0,7)===monthKey(n);return d>=monthKey(new Date(n.getFullYear(),n.getMonth()-2,1))+'-01'};
const finSum=(t,pre)=>Fin.all().filter(e=>e.type===t&&(e.date||'').startsWith(pre)).reduce((n,e)=>n+e.amount,0);
S.ff={type:'income',amount:'',date:today(),cat:'Hjemmeside',cust:'',note:''};S.fp='m';S.fdel=null;

function vFin(){const p=S.fp||'m',f=S.ff,cs=Customers.all();
  const L=Fin.all().filter(e=>inPer(e,p)).sort((a,b)=>b.date.localeCompare(a.date));
  const sm=t=>L.filter(e=>e.type===t).reduce((n,e)=>n+e.amount,0),inc=sm('income'),exp=sm('expense'),res=inc-exp;
  const payers=new Set(L.filter(e=>e.type==='income'&&e.cust).map(e=>e.cust)).size;
  const tile=(n,x,st='')=>`<div class="card"><div class="mu">${x}</div><h1 style="${st}">${n}</h1></div>`;
  const md=[...Array(6)].map((_,i)=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-5+i);const k=monthKey(d);return[k,finSum('income',k),finSum('expense',k)]});
  const mx=Math.max(1,...md.flatMap(x=>[x[1],x[2]]));
  const cn=id=>id?(cs.find(c=>c.id===id)||{name:'Slettet kunde'}).name:'Uden kunde';
  const byC={};L.filter(e=>e.type==='income').forEach(e=>{byC[e.cust||'']=(byC[e.cust||'']||0)+e.amount});
  const opt=(arr,v)=>arr.map(x=>`<option ${x===v?'selected':''}>${x}</option>`).join('');
  return `<h1>Finance</h1><p class="mu">Oversigt over indtægter og udgifter. Tallene er dem, du selv registrerer. Der er ikke tilsluttet noget betalingssystem eller nogen bank.</p>
<div class="row" style="margin-bottom:1rem">${FPER.map(([k,t])=>`<button class="btn ${p===k?'':'ghost'}" data-act="fp" data-p="${k}">${t}</button>`).join('')}</div>
<!--KPI--><div class="grid" style="margin-bottom:1rem">${tile(fmt(inc),'Indtægter')}${tile(fmt(exp),'Udgifter')}${tile(fmt(res),'Resultat',res<0?'color:#C0263A':'')}${tile(payers,'Betalende kunder')}${tile(payers?fmt(inc/payers):'–','Gns. indtægt pr. kunde')}</div>
<!--CH--><div class="card" style="margin-bottom:1rem"><h3>Seneste 6 måneder</h3><p class="mu">Øverste bjælke: indtægter. Nederste bjælke (rød): udgifter.</p>${md.map(([k,i,e])=>`<div style="display:grid;grid-template-columns:70px 1fr;gap:.6rem;margin:.5rem 0"><div>${new Date(k+'-01T12:00:00').toLocaleDateString('da-DK',{month:'short',year:'2-digit'})}</div><div><div class="bar2" style="width:${i/mx*100}%"></div><div class="bar2" style="width:${e/mx*100}%;background:#C0263A"></div><small class="mu">${fmt(i)} ind / ${fmt(e)} ud</small></div></div>`).join('')}</div>
<!--FORM--><div class="card form" style="margin-bottom:1rem"><h3>Ny postering</h3>
<label>Type<select data-ff="type"><option value="income" ${f.type==='income'?'selected':''}>Indtægt</option><option value="expense" ${f.type==='expense'?'selected':''}>Udgift</option></select></label>
<label>Beløb (kr.)<input data-ff="amount" inputmode="decimal" value="${esc(f.amount)}"></label>
<label>Dato<input type="date" data-ff="date" value="${esc(f.date)}"></label>
<label>Kategori<select data-ff="cat">${opt(FCAT[f.type],f.cat)}</select></label>
<label>Kunde (valgfri)<select data-ff="cust"><option value="">Ingen</option>${cs.map(c=>`<option value="${c.id}" ${f.cust===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>
<label>Note<input data-ff="note" value="${esc(f.note)}"></label>
${S.err?`<p class="err">${esc(S.err)}</p>`:''}<button class="btn" data-act="fadd">Tilføj</button></div>
<!--CUST--><h3>Indtægt pr. kunde</h3>${Object.keys(byC).length?`<table><tr><th>Kunde</th><th>Indtægt</th></tr>${Object.entries(byC).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${esc(cn(k))}</td><td>${fmt(v)}</td></tr>`).join('')}</table>`:'<p class="mu">Ingen indtægter i perioden.</p>'}
<!--LIST--><h3 style="margin-top:1.5rem">Posteringer</h3>${L.length?`<div style="overflow-x:auto"><table><tr><th>Dato</th><th>Type</th><th>Kategori</th><th>Kunde</th><th>Beløb</th><th></th></tr>${L.slice(0,30).map(e=>`<tr><td>${esc(e.date)}</td><td>${e.type==='income'?'Indtægt':'Udgift'}</td><td>${esc(e.cat)}${e.note?`<div class="mu" style="margin:0">${esc(e.note)}</div>`:''}</td><td>${esc(cn(e.cust))}</td><td>${e.type==='income'?'+':'−'}${fmt(e.amount)}</td><td><button class="btn ghost" data-act="fdel" data-id="${e.id}">${S.fdel===e.id?'Bekræft':'Slet'}</button></td></tr>`).join('')}</table></div>`:'<p class="mu">Ingen posteringer i perioden.</p>'}`}

document.addEventListener('input',e=>{const d=e.target.dataset;if(d.ff){S.ff[d.ff]=e.target.value;if(d.ff==='type'){S.ff.cat=FCAT[S.ff.type][0];render()}}});

const V={dash:vDash,list:vList,new:vNew,builder:vBuilder,edit:vEdit,templates:vTpl,domains:vDom,credits:vCred,customers:vCust,stats:vStats,finance:vFin,settings:vSet,admin:vAdmin};

function ext(a,b){const id=b.dataset.id,d=b.dataset;
  if(a==='go'){S.view=d.v;S.err='';S.out=null;S.msg='';S.rc=0;return 1}
  if(a==='pick'){S.view=d.t;S.id=id;return 1}
  if(a==='unpick'){S.id=null;return 1}
  if(a==='build'){S.view='builder';S.id=id;return 1}
  if(a==='tpl'){const t=TPL[+d.i];S.form={name:'',desc:t.d,style:t.s};S.view='new';S.err='';return 1}
  if(a==='bmove'||a==='brem'||a==='badd'){upd(S.id,q=>{q.history=[...q.history,structuredClone(q.site)].slice(-30);q.future=[];const bl=q.site.blocks,i=+d.i;
    if(a==='badd'){const ci=bl.findIndex(x=>x.type==='contact'),nb=mk[d.t](q.site.meta.title,'');(d.t!=='contact'&&ci>-1)?bl.splice(ci,0,nb):bl.push(nb)}
    else if(a==='brem'){if(bl[i].type!=='hero')bl.splice(i,1)}
    else{const j=i+ +d.d;if(j>=0&&j<bl.length)[bl[i],bl[j]]=[bl[j],bl[i]]}});return 1}
  if(a==='exp'){S.out=Renderer.html(Projects.all().find(p=>p.id===id));S.outId=id;return 1}
  if(a==='rdy'){upd(id,q=>{q.status=q.status==='ready'?'draft':'ready'});return 1}
  if(a==='cadd'){const f=S.cf;if(!f.name.trim()){S.err='Skriv et navn.';return 1}const pl=PLANS.find(p=>p[0]===f.plan)||PLANS[0];Customers.save([{id:uid(),name:f.name.trim(),email:f.email.trim(),plan:pl[0],credits:pl[1],createdAt:Date.now()},...Customers.all()]);S.cf={name:'',email:'',plan:'Gratis'};S.err='';return 1}
  if(a==='cc'){const c=Customers.all(),u=c.find(x=>x.id===id);if(u){u.credits=Math.max(0,u.credits+ +d.n);Customers.save(c)}return 1}
  if(a==='cdel'){if(S.cdel===id){Customers.save(Customers.all().filter(x=>x.id!==id));S.cdel=null}else S.cdel=id;return 1}
  if(a==='bk'){S.out=snap();S.outId='bk';return 1}
  if(a==='rs'){if(!S.rc){S.rc=1;S.msg='';return 1}S.rc=0;
    try{const x=JSON.parse(S.rv||'');if(x.app!=='primewebs'||!Array.isArray(x.projects))throw 0;Projects.save(x.projects);Customers.save(x.customers||[]);Storage.set('pw.settings',{...(x.settings||{}),aiCode:Settings.get().aiCode});Fin.save(Array.isArray(x.finance)?x.finance:[]);if(x.credits!=null)Storage.set('pw.credits',x.credits);S.rv='';S.msg='Gendannet: '+x.projects.length+' hjemmesider.'}catch(e){S.msg='Fejl: kopien kunne ikke læses.'}return 1}
}

function ext2(a,b){const d=b.dataset;
  if(a==='grp'){const n=Storage.get('pw.nav',{});n[d.g]=n[d.g]===0?1:0;Storage.set('pw.nav',n);return 1}
  if(a==='fp'){S.fp=d.p;return 1}
  if(a==='fadd'){const f=S.ff,amt=parseFloat(String(f.amount).replace(',','.'));
    if(!(amt>0)){S.err='Skriv et beløb større end 0.';return 1}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(f.date)){S.err='Vælg en dato.';return 1}
    Fin.save([{id:uid(),type:f.type,amount:Math.round(amt*100)/100,date:f.date,cat:f.cat,cust:f.cust||null,note:f.note.trim().slice(0,200)},...Fin.all()]);S.ff={...f,amount:'',note:''};S.err='';return 1}
  if(a==='fdel'){if(S.fdel===d.id){Fin.save(Fin.all().filter(e=>e.id!==d.id));S.fdel=null}else S.fdel=d.id;return 1}
  return 0}

function render(){
  const th=Settings.get().theme;if(th==='auto')delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=th;
  {const ac=Settings.get().accent,rs=document.documentElement.style;if(/^#[0-9a-fA-F]{6}$/.test(ac||'')){rs.setProperty('--ac',ac);rs.setProperty('--ai',lum(ac)>150?'#0E1320':'#fff');rs.setProperty('--so',ac+'26')}else['--ac','--ai','--so'].forEach(k=>rs.removeProperty(k))}
  const u=Session.user();
  const nav=`<aside class="side"><div class="logo">PRIME WEBS AI</div><input class="ms" data-q placeholder="Søg i menu…" aria-label="Søg i menu" value="${esc(S.q||'')}">${navHtml()}<div class="who"><strong>${esc(u.name)}</strong> <span class="badge">OWNER / ADMIN</span><div>${Credits.unlimited()?'∞ Ubegrænsede credits':Credits.balance()+' credits'}</div><div class="tag">AI: ${AI.mode==='api'?'AI-server':'demo (testgenerator)'}</div></div></aside>`;
  $('#app').innerHTML=`<div class="shell">${nav}<main class="main">${(V[S.view]||vList)()}</main></div>`;
  const c=$('.msgs');if(c)c.scrollTop=c.scrollHeight;
  const i=$('#chatin');if(i&&!S.busy)i.focus();
  const mq=$('[data-q]');if(S.q&&mq&&!i){mq.focus();mq.setSelectionRange(mq.value.length,mq.value.length)}
}

async function generate(){
  const f=S.form;
  if(!f.name.trim()){S.err='Skriv et navn til projektet.';return render()}
  if(Credits.balance()<Credits.cost.generate){S.err='Du har ikke nok credits.';return render()}
  S.err='';S.busy=true;render();
  let result;
  try { result=await AI.generate({name:f.name.trim(),description:f.desc.trim(),style:f.style,industry:f.ind||'',city:(f.city||'').trim(),services:(f.svc||'').trim(),tone:f.tone||'Professionel',language:f.lang||'Dansk',color:f.color||'',phone:(f.phone||'').trim()||(f.desc.match(RX_TEL)||[''])[0].trim()||Settings.get().phone,email:(f.email||'').trim()||(f.desc.match(RX_MAIL)||[''])[0]||Settings.get().email}); }
  catch(error){S.busy=false;S.err=error.message||'AI-generatoren kunne ikke kontaktes.';return render()}
  const site=result.site;
  Credits.spend('generate');
  const now=Date.now(),p={v:1,id:uid(),ownerId:Session.user().id,name:f.name.trim(),status:'draft',domain:null,plan:'free',createdAt:now,updatedAt:now,site,history:[],future:[],chat:[{r:'ai',t:'Din hjemmeside er klar. Skriv, hvad du vil ændre.'}]};
  if(result.reply)p.chat=[{r:'ai',t:result.reply}];
  Projects.save([p,...Projects.all()]);
  S.form={name:'',desc:'',style:'Moderne'};S.busy=false;S.view='edit';S.id=p.id;render();
}
async function send(t){
  t=(t||'').trim();if(!t||S.busy)return;const p=getP();
  upd(p.id,q=>q.chat.push({r:'u',t}));
  if(Credits.balance()<Credits.cost.edit){upd(p.id,q=>q.chat.push({r:'ai',t:'Du har ikke flere credits.'}));return render()}
  S.busy=true;render();
  try {
    const r=await AI.edit(p.site,t);
    upd(p.id,q=>{if(r.site){q.history=[...q.history,q.site].slice(-30);q.future=[];q.site=r.site;Credits.spend('edit')}q.chat.push({r:'ai',t:r.reply||'Ændringerne er udført.'})});
  } catch(error) {
    upd(p.id,q=>q.chat.push({r:'ai',t:'AI-fejl: '+(error.message||'Kunne ikke kontakte AI-generatoren.')}));
  }
  S.busy=false;render();
}
function hist(a){upd(S.id,q=>{const from=a==='undo'?q.history:q.future,to=a==='undo'?q.future:q.history;if(!from.length)return;to.push(q.site);q.site=from.pop()})}

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,id=b.dataset.id;
  if(ext2(a,b)||ext(a,b))return render();
  if(a==='gen')return generate();
  if(a==='send')return send($('#chatin').value);
  if(a==='chip')return send(b.dataset.t);
  if(a==='list'){S.view='list';S.del=null}
  else if(a==='new'){S.view='new';S.err=''}
  else if(a==='open'){S.view='edit';S.id=id}
  else if(a==='del'){if(S.del===id){Projects.save(Projects.all().filter(p=>p.id!==id));S.del=null}else S.del=id}
  else if(a==='undo'||a==='redo')hist(a);
  else if(a==='dev')S.device=b.dataset.d;
  render();
});
document.addEventListener('input',e=>{const d=e.target.dataset;if(d.f)S.form[d.f]=e.target.value;if(d.g)S.cf[d.g]=e.target.value;if(e.target.id==='rs')S.rv=e.target.value});
document.addEventListener('change',e=>{const d=e.target.dataset,v=e.target.value;
  if(d.b!==undefined){upd(S.id,q=>{q.history=[...q.history,structuredClone(q.site)].slice(-30);q.future=[];const b=q.site.blocks[+d.b];if(d.i!==undefined)b.items[+d.i][d.ik]=v;else b[d.k]=v})}
  else if(d.dom)upd(d.dom,q=>{q.domain=v.trim()||null});
  else if(d.cp)upd(d.cp,q=>{q.customerId=v||null});
  else if(d.cu){const c=Customers.all(),u=c.find(x=>x.id===d.cu);if(u){u[d.cf]=v;Customers.save(c)}}
  else if(d.s)Settings.set(d.s,v);
  else return;
  render()});
/* ===== Oprettelse: flere felter og bedre forståelse af beskrivelsen ===== */
const PAL={Blå:'#2540D9',Himmel:'#38A3F1',Turkis:'#0E9AA7',Mint:'#2BB48D',Grøn:'#1E8E5A',Gul:'#E3B505',Orange:'#E8730C',Rød:'#D12C3F',Pink:'#D6457F',Lilla:'#7B3FD1',Brun:'#8A5A3B',Guld:'#C9A24B',Navy:'#1E3A8A',Sort:'#111111'};
const INDS=['','Restaurant/café','Frisør/skønhed','Håndværker','Konsulent/rådgiver','Webshop/butik','Sundhed/træning'];
const TONES=['Professionel','Venlig','Eksklusiv','Energisk'];
const IND=[
 [/restaurant|café|cafe|bistro|pizza|sushi|takeaway|bageri|kaffe/,'Restaurant/café','Mad og stemning, du har lyst til at vende tilbage til.',['Frokost og aftensmad','Selskaber og arrangementer','Takeaway','Sæsonens menu'],['Kan jeg bestille bord?','Ja, ring eller skriv til os, så finder vi en tid, der passer.']],
 [/frisør|salon|klip|hår|barber|negle|skønhed|kosmetolog/,'Frisør/skønhed','Hos os går du ud med et resultat, du er glad for.',['Klip og styling','Farve og striber','Behandlinger','Rådgivning'],['Skal jeg bestille tid?','Ja, kontakt os, så finder vi et tidspunkt, der passer dig.']],
 [/håndværker|tømrer|maler|murer|vvs|elektriker|gulv|renovering|byg|montør|tag/,'Håndværker','Solidt håndværk og klare aftaler fra start til slut.',['Renovering','Nybyggeri og tilbygning','Reparation og service','Rådgivning og tilbud'],['Kan jeg få et tilbud?','Ja, beskriv opgaven, så vender vi tilbage med et tilbud.']],
 [/konsulent|rådgiv|coach|bogholder|revisor|advokat|jurid|regnskab|strategi/,'Konsulent/rådgiver','Klar rådgivning, der skaber værdi i hverdagen.',['Indledende afklaring','Rådgivning og analyse','Implementering','Løbende sparring'],['Hvordan starter vi?','Book en uforpligtende samtale, hvor vi afklarer dine behov.']],
 [/webshop|butik|shop|e-handel|produkt|tøj|smykke|boutique|gave/,'Webshop/butik','Produkter udvalgt med omtanke.',['Udvalg og nyheder','Levering','Retur og bytte','Kundeservice'],['Hvordan bestiller jeg?','Kontakt os, så hjælper vi dig gennem bestillingen.']],
 [/fysioterap|klinik|tandlæge|massage|kiropraktor|sundhed|træning|fitness|yoga|zoneterapi|psykolog/,'Sundhed/træning','Fokus på din trivsel, med tid og omsorg.',['Konsultation','Behandling og træning','Forløb tilpasset dig','Opfølgning'],['Skal jeg have en henvisning?','Det afhænger af ydelsen. Kontakt os, så guider vi dig.']]
];
const RX_MAIL=/[\w.+-]+@[\w-]+\.[\w.-]+/,RX_TEL=/(?:\+45\s?)?(?:\d{2}\s?){4}/;
function smartSite(i){
  const desc=String(i.description||''),n=i.name,txt=(desc+' '+n+' '+(i.services||'')).toLowerCase();
  const b=IND.find(x=>x[1]===i.industry)||IND.find(x=>x[0].test(txt))||[0,'','Vi hjælper dig godt i gang med en løsning, der passer til dine behov.',[],['Hvordan kommer jeg i gang?','Kontakt os, så aftaler vi en uforpligtende samtale.']];
  const city=(i.city||'').trim()||(desc.match(/\bi\s+([A-ZÆØÅ][\wæøåÆØÅ-]+)/)||[])[1]||'';
  const th={...(STYLES[i.style]||STYLES.Moderne)},tk=txt.split(/[^a-zæøå]+/);
  const has=k=>tk.some(w=>w===k||w===k+'t'||w===k+'e'||w===k+'ne'),pk=Object.keys(PAL).find(k=>has(k.toLowerCase())),ck=Object.keys(COLORS).find(has);
  const col=i.color||(pk&&PAL[pk])||(ck&&COLORS[ck]);if(col)th.accent=col;
  if(/mørk|dark/.test(txt))th.mode='dark';
  if(/elegant|klassisk|eksklusiv/.test(txt)||i.tone==='Eksklusiv')th.font='serif';
  const clean=desc.replace(RX_MAIL,'').replace(RX_TEL,'').replace(/\s+/g,' ').trim();
  const hero=mk.hero(n,'');hero.text=b[2]+(city?' Vi findes i '+city+'.':'')+' Kontakt os i dag for en uforpligtende samtale.';
  const svc=mk.services(),list=(i.services?i.services.split(',').map(x=>x.trim()).filter(Boolean):b[3]).slice(0,6);
  if(list.length)svc.items=list.map(x=>({t:x.charAt(0).toUpperCase()+x.slice(1),d:'Vi tilbyder '+x.toLowerCase()+' med fokus på kvalitet og din tilfredshed.'}));
  const faq=mk.faq();faq.items=[{t:b[4][0],d:b[4][1]},...faq.items].slice(0,5);
  const cta=mk.cta(n);if(i.tone==='Venlig')cta.cta='Skriv til os';if(i.tone==='Energisk')cta.cta='Kom i gang nu';
  const ct=mk.contact();ct.email=i.email||(desc.match(RX_MAIL)||[])[0]||Settings.get().email;ct.phone=i.phone||(desc.match(RX_TEL)||[''])[0].trim()||Settings.get().phone;
  return{v:1,meta:{title:n,theme:th},blocks:[hero,mk.features(),svc,mk.about(n,clean),mk.steps(),faq,cta,ct]}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-x="fcol"]');if(b){S.form={...S.form,color:b.dataset.c};render()}});
/* ===== Farver: hjemmesidens design og dashboardets accentfarve ===== */
const swatch=(x,n,h,on)=>`<button type="button" class="swb" data-x="${x}" data-c="${h}" title="${n}" aria-label="${n}" aria-pressed="${on}" style="background:${h}"></button>`;
function designCard(p){const t=p.site.meta.theme,ac=String(t.accent).toLowerCase();
  return `<div class="card" style="margin-bottom:.8rem"><strong>Design</strong><div class="sw" style="margin:.6rem 0">${Object.entries(PAL).map(([n,h])=>swatch('acc',n,h,ac===h.toLowerCase())).join('')}<input type="color" data-th="accent" value="${esc(t.accent)}" title="Egen farve" aria-label="Egen farve"></div><div class="row"><button class="btn ${t.mode==='light'?'':'ghost'}" data-x="mode" data-v="light">Lys</button><button class="btn ${t.mode==='dark'?'':'ghost'}" data-x="mode" data-v="dark">Mørk</button><button class="btn ${t.font==='sans'?'':'ghost'}" data-x="font" data-v="sans">Sans</button><button class="btn ${t.font==='serif'?'':'ghost'}" data-x="font" data-v="serif">Serif</button></div></div>`}
function setTheme(k,v){upd(S.id,q=>{q.history=[...q.history,structuredClone(q.site)].slice(-30);q.future=[];q.site.meta.theme[k]=v})}
document.addEventListener('click',e=>{const b=e.target.closest('[data-x]');if(!b)return;const d=b.dataset;
  if(d.x==='uiacc'){Settings.set('accent',d.c);render()}
  else if(d.x==='uireset'){Settings.set('accent','');render()}
  else if(d.x==='acc'){setTheme('accent',d.c);render()}
  else if(d.x==='mode'||d.x==='font'){setTheme(d.x,d.v);render()}});
document.addEventListener('change',e=>{const d=e.target.dataset;if(d.th&&/^#[0-9a-fA-F]{6}$/.test(e.target.value)){setTheme(d.th,e.target.value);render()}});
/* ===== Menu: farvegrupper, tællere og søgning ===== */
const GC={Overblik:'#2540D9',Hjemmesider:'#1E8E5A',Udgivelse:'#7B3FD1',Forretning:'#E8730C',System:'#6B7280'};
const CNT={list:()=>Projects.all().length,customers:()=>Customers.all().length};
document.addEventListener('input',e=>{if(e.target.dataset.q!==undefined){S.q=e.target.value;render()}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset.q!==undefined){const f=$('.side .nv');if(f){S.q='';f.click()}}});
/* ===== Menu v2: undermenuer, hjemmeside-vælger og egne sider til redigering ===== */
const PT={edit:'AI Chat Editor',builder:'AI Website Builder',customize:'Tilpas design',preview:'Forhåndsvisning',history:'Versionshistorik'};
GC.Redigering='#0E9AA7';
function projPick(){return `<select class="ms" data-proj aria-label="Valgt hjemmeside"><option value="">Vælg hjemmeside…</option>${Projects.all().map(p=>`<option value="${p.id}" ${p.id===S.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select>`}
function navHtml(){const q=(S.q||'').toLowerCase().trim(),st=Storage.get('pw.nav',{}),adm=['adminp','admin','backup'],can=k=>!adm.includes(k)||Session.can();
  const btn=(k,t,c='')=>`<button class="nv ${c} ${S.view===k?'on':''}" data-act="go" data-v="${k}"><span>${t}</span>${CNT[k]?`<span class="ct">${CNT[k]()}</span>`:''}</button>`;
  return NAV.map(([g,it])=>{
    const rows=it.filter(([k])=>can(k)).map(([k,t,ch])=>{
      if(!ch)return((!q||t.toLowerCase().includes(q))?btn(k,t):'')+(k==='list'?projBtns(q):'');
      const kids=ch.filter(([,ct])=>!q||ct.toLowerCase().includes(q)||t.toLowerCase().includes(q));if(!kids.length)return '';
      const v=st['s:'+k],open=q?true:(v===undefined?ch.some(c=>c[0]===S.view):v===1);
      return `<button class="nv par" data-act="sub" data-k="${k}" aria-expanded="${open}"><span>${t}</span><span>${open?'▾':'▸'}</span></button>${open?kids.map(([ck,ct])=>btn(ck,ct,'kid')).join(''):''}`}).join('');
    if(!rows)return '';const open=q?true:st[g]!==0;
    return `<div class="gp" style="--gc:${GC[g]}"><button class="gh" data-act="grp" data-g="${g}" aria-expanded="${open}"><span><i class="dot"></i>${g}</span><span>${open?'▾':'▸'}</span></button>${open?(g==='Redigering'?projPick():'')+rows:''}</div>`}).join('')}
const finMode=(m,title)=>{const h=vFin(),i=k=>h.indexOf('<!--'+k+'-->'),sl=(a,b)=>h.slice(i(a)+a.length+7,b?i(b):h.length);
  const head=h.slice(0,i('KPI')).replace('<h1>Finance</h1>','<h1>'+title+'</h1>');
  return head+(m==='o'?sl('KPI','FORM'):m==='l'?sl('FORM','CUST')+sl('LIST'):sl('CUST','LIST'))};
V.finance=()=>finMode('o','Finance: Overblik');V.finlist=()=>finMode('l','Finance: Posteringer');V.fincust=()=>finMode('c','Finance: Indtægt pr. kunde');
const _vAdm=vAdmin;
V.admin=()=>_vAdm().split('<!--BK-->')[0].replace('<h1>Admin Panel</h1>','<h1>Admin Panel: Roller og adgang</h1>');
V.backup=()=>{const p=_vAdm().split('<!--BK-->');return p.length>1?'<h1>Sikkerhedskopi og gendannelse</h1>'+p[1]:p[0]};
V.colors=()=>`<h1>Udseende og farver</h1><div class="card form"><h3>Farver i dashboardet</h3><p class="mu">Vælg en accentfarve til knapper og menu.</p><div class="sw">${Object.entries(PAL).map(([n,h])=>swatch('uiacc',n,h,(Settings.get().accent||'').toLowerCase()===h.toLowerCase())).join('')}</div><button class="btn ghost" data-x="uireset" style="margin-top:.8rem">Nulstil farve</button></div>`;
V.customize=()=>{const p=getP();if(!p)return vPick('customize');return `<div class="bar"><strong>Tilpas design: ${esc(p.name)}</strong><span class="sp"></span><button class="btn ghost" data-act="undo" ${p.history.length?'':'disabled'}>Fortryd</button><button class="btn ghost" data-act="redo" ${p.future.length?'':'disabled'}>Gentag</button></div><div class="ed"><section class="chat" style="overflow:auto">${designCard(p)}<p class="mu">Skift farve, lys eller mørk og skrifttype. Ændringer kan fortrydes.</p></section><section class="pv">${frame(p)}</section></div>`};
V.preview=()=>{const p=getP();if(!p)return vPick('preview');return `<div class="bar"><strong>Forhåndsvisning: ${esc(p.name)}</strong><span class="sp"></span><button class="btn ${S.device==='desktop'?'':'ghost'}" data-act="dev" data-d="desktop">Computer</button><button class="btn ${S.device==='mobile'?'':'ghost'}" data-act="dev" data-d="mobile">Mobil</button></div><div class="pv" style="height:78vh"><iframe class="${S.device}" title="Forhåndsvisning" sandbox srcdoc="${esc(Renderer.html(p))}"></iframe></div>`};
V.history=()=>{const p=getP();if(!p)return vPick('history');const sn=p.history.map((x,i)=>[i,x]).reverse();
  return `<h1>Versionshistorik: ${esc(p.name)}</h1><p class="mu">Hver ændring gemmer den tidligere version. Gendan en version, og du kan stadig fortryde bagefter.</p>`+(sn.length?`<table><tr><th>Version</th><th>Forside</th><th>Blokke</th><th>Farve</th><th></th></tr>${sn.map(([i,x])=>`<tr><td>#${i+1}</td><td>${esc((x.blocks.find(b=>b.type==='hero')||{}).title||'')}</td><td>${x.blocks.length}</td><td><span class="swb" style="display:inline-block;width:18px;height:18px;cursor:default;background:${esc(x.meta.theme.accent)}"></span> ${esc(x.meta.theme.accent)}</td><td><button class="btn ghost" data-x="hrest" data-i="${i}">Gendan</button></td></tr>`).join('')}</table>`:'<p class="mu">Ingen tidligere versioner endnu.</p>')};
V.export=()=>{const l=Projects.all();return `<h1>Eksportér hjemmesider</h1><p class="mu">Få den færdige hjemmeside som HTML-kode, som du kan lægge på din egen hosting.</p>`+(l.length?l.map(p=>`<div class="card" style="margin-bottom:.8rem"><div class="row"><strong>${esc(p.name)}</strong><span class="sp"></span><button class="btn" data-act="exp" data-id="${p.id}">Vis HTML-kode</button></div>${S.out&&S.outId===p.id?`<label style="margin-top:1rem">HTML-kode (markér og kopiér)<textarea class="code" readonly>${esc(S.out)}</textarea></label>`:''}</div>`).join(''):'<p class="mu">Ingen hjemmesider endnu.</p>')};
document.addEventListener('click',e=>{const b=e.target.closest('[data-act="sub"],[data-x="hrest"]');if(!b)return;const d=b.dataset;
  if(d.act==='sub'){const n=Storage.get('pw.nav',{}),it=NAV.flatMap(g=>g[1]).find(x=>x[0]===d.k),v=n['s:'+d.k],open=v===undefined?it[2].some(c=>c[0]===S.view):v===1;n['s:'+d.k]=open?0:1;Storage.set('pw.nav',n);render()}
  else{upd(S.id,q=>{const sn=q.history[+d.i];if(!sn)return;q.history=[...q.history,q.site].slice(-30);q.future=[];q.site=structuredClone(sn)});render()}});
document.addEventListener('change',e=>{if(e.target.dataset.proj!==undefined){S.id=e.target.value||null;render()}});
/* ===== Prompt-først oprettelse, gemte hjemmesider i menuen og priser ===== */
const PB=['edit','builder','customize','preview','history'];
const EXAMPLES=['Frisørsalon i Aarhus med grønne farver','Tømrerfirma i Odense, der laver tilbygninger','Café i København med frokost og kage','Konsulent, der hjælper små virksomheder med regnskab'];
function vNew(){const f={ind:'',city:'',svc:'',tone:'Professionel',color:'',lang:'Dansk',phone:'',email:'',...S.form};
  const inp=(k,t,x='')=>`<label>${t}<input data-f="${k}" value="${esc(f[k])}" ${x}></label>`;
  const sel=(k,t,arr)=>`<label>${t}<select data-f="${k}">${arr.map(o=>`<option value="${esc(o)}" ${f[k]===o?'selected':''}>${esc(o||'Find selv')}</option>`).join('')}</select></label>`;
  return `<h1>Opret ny hjemmeside</h1><div class="card form" style="max-width:720px"><label>Hvad skal hjemmesiden handle om?<textarea data-f="desc" id="nd" style="min-height:150px;font-size:1.05rem" placeholder="Beskriv virksomheden med dine egne ord. Fx: Vi er en frisørsalon i Aarhus med fokus på klip og farve. Vi vil gerne have en rolig, lys hjemmeside i grønne farver. Ring på 12 34 56 78.">${esc(f.desc)}</textarea></label><div class="row" style="margin:-.4rem 0 1rem">${EXAMPLES.map(x=>`<button type="button" class="chip" data-x="ex" data-t="${esc(x)}">${esc(x)}</button>`).join('')}</div>${inp('name','Virksomhedens navn','id="nn"')}<details data-more ${S.more?'open':''} style="margin-bottom:1rem"><summary style="cursor:pointer;font-weight:600;margin-bottom:.8rem">Flere indstillinger (valgfrit)</summary>${sel('ind','Branche',INDS)}${inp('city','By eller område')}${inp('svc','Ydelser (adskil med komma)')}${sel('tone','Tone',TONES)}${sel('style','Stil',Object.keys(STYLES))}${sel('lang','Sprog',['Dansk','English'])}<div style="margin-bottom:1rem"><strong>Farve</strong><div class="sw" style="margin-top:.4rem"><button type="button" class="btn ${f.color?'ghost':''}" data-x="fcol" data-c="">Lad AI vælge</button>${Object.entries(PAL).map(([n,h])=>`<button type="button" class="swb" data-x="fcol" data-c="${h}" title="${n}" aria-label="${n}" aria-pressed="${f.color===h}" style="background:${h}"></button>`).join('')}</div></div>${inp('phone','Telefon på hjemmesiden (valgfri)','placeholder="'+esc(Settings.get().phone)+'"')}${inp('email','E-mail på hjemmesiden (valgfri)','placeholder="'+esc(Settings.get().email)+'"')}</details>${S.err?`<p class="err">${esc(S.err)}</p>`:''}<button class="btn" data-act="gen" ${S.busy?'disabled':''}>${S.busy?'Genererer…':'Generér hjemmeside'}</button><p class="mu" style="margin-top:.8rem">Hjemmesiden gemmes automatisk under Mine hjemmesider i menuen.</p></div>`}
function projBtns(q){const all=Projects.all().filter(p=>!q||p.name.toLowerCase().includes(q)),sh=all.slice(0,12);
  return sh.map(p=>`<button class="nv kid" data-x="proj" data-id="${p.id}" title="Åbn ${esc(p.name)}" ${p.id===S.id&&PB.includes(S.view)?'aria-current="page"':''}><span>▪ ${esc(p.name)}</span></button>`).join('')+(all.length>12?`<button class="nv kid" data-act="go" data-v="list"><span>Se alle (${all.length})</span></button>`:'')}
V.credits=()=>{const own=Settings.get().ownerEmail,paid=PLANS.filter(p=>p[2]);
  return `<h1>Credits og abonnementer</h1><div class="card" style="margin-bottom:1.5rem;max-width:720px"><span class="badge">OWNER / ADMIN</span><h3 style="margin-top:.6rem">Gratis adgang: kun ejerens e-mail</h3><label>Ejerens e-mail<input data-s="ownerEmail" value="${esc(own)}"></label><p class="mu">Kontoen med denne e-mail har ubegrænsede credits og betaler aldrig. Der er endnu ikke noget login, så indtil videre får alle, der åbner dette dashboard, ejeradgang. Når login kommer, gælder gratis adgang kun for denne e-mail.</p></div><h3>Priser for kunder</h3><div class="grid" style="margin-bottom:1rem">${paid.map(([n,c,pr])=>`<div class="card"><h3>${n}</h3><h1>${pr} €<small class="mu"> / måned</small></h1><p>${c.toLocaleString('da-DK')} credits pr. måned</p><p class="mu">Svarer til cirka ${Math.floor(c/Credits.cost.generate)} nye hjemmesider eller ${c.toLocaleString('da-DK')} chat-ændringer.</p><a class="btn" href="mailto:${esc(own)}?subject=${encodeURIComponent('Bestilling af plan '+n)}">Kontakt for at bestille</a></div>`).join('')}</div><h3>Credit-forbrug</h3><table><tr><th>Handling</th><th>Credits</th></tr><tr><td>Generér hjemmeside</td><td>${Credits.cost.generate}</td></tr><tr><td>Chat-ændring</td><td>${Credits.cost.edit}</td></tr></table><p class="mu">Priserne vises kun. Der er ikke tilsluttet betaling endnu, og det sker først, når du godkender det.</p>`};
document.addEventListener('click',e=>{const b=e.target.closest('[data-x="proj"],[data-x="ex"]');if(!b)return;const d=b.dataset;
  if(d.x==='proj'){S.id=d.id;if(!PB.includes(S.view))S.view='edit';S.err=''}else S.form={...S.form,desc:d.t};render()});
document.addEventListener('toggle',e=>{if(e.target.dataset&&e.target.dataset.more!==undefined)S.more=e.target.open},true);
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='chatin')send(e.target.value)});
render();
