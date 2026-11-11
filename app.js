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
const Session={user:()=>({id:'local',name:'Ejer',role:'owner'}),can:()=>['owner','admin'].includes(Session.user().role)};
// Credits: lokal tæller nu, regnskab + Stripe senere
const Credits={cost:{generate:10,edit:1},
  unlimited:()=>Session.can(),
  balance(){return this.unlimited()?Infinity:Storage.get('pw.credits',50)},
  spend(a){if(this.unlimited())return true;const b=this.balance(),c=this.cost[a];if(b<c)return false;Storage.set('pw.credits',b-c);return true}};
// Projects: repository, samme interface mod database senere
const Projects={all:()=>Storage.get('pw.projects',[]),save:l=>Storage.set('pw.projects',l)};
const Customers={all:()=>Storage.get('pw.customers',[]),save:l=>Storage.set('pw.customers',l)};
const Settings={d:{company:'PrimeWebs',email:'primewebssupport@gmail.com',phone:'+45 30 95 05 93',web:'https://primewebs.space',theme:'auto'},get(){return{...this.d,...Storage.get('pw.settings',{})}},set(k,v){Storage.set('pw.settings',{...Storage.get('pw.settings',{}),[k]:v})}};

/* ===== Lag 2: rigtig AI via sikker serverfunktion ===== */
const STYLES={Moderne:{accent:'#2540D9',font:'sans',mode:'light'},Elegant:{accent:'#9A6B2F',font:'serif',mode:'light'},Frisk:{accent:'#1E8E5A',font:'sans',mode:'light'},Mørk:{accent:'#8DA0FF',font:'sans',mode:'dark'}};
const COLORS={blå:'#2540D9',grøn:'#1E8E5A',rød:'#D12C3F',lilla:'#7B3FD1',orange:'#E8730C',sort:'#111111'};
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
  async generate({name,description,style}){await wait(900);
    return{v:1,meta:{title:name,theme:{...(STYLES[style]||STYLES.Moderne)}},
      blocks:[mk.hero(name,description),mk.features(),mk.services(),mk.about(name,description),mk.steps(),mk.faq(),mk.cta(name),mk.contact()]}},
  async edit(site,msg){await wait(500);
    const s=structuredClone(site),m=msg.toLowerCase(),th=s.meta.theme,name=s.meta.title,out=[];
    const q=(msg.match(/[“"„»]([^”"“«]+)[”"“«]/)||[])[1],hero=s.blocks.find(b=>b.type==='hero');
    const col=Object.keys(COLORS).find(k=>m.includes(k));
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

function vNew(){const f=S.form;
  return `<h1>Nyt projekt</h1><div class="card form"><label>Virksomhedens navn<input data-f="name" id="nn" value="${esc(f.name)}"></label><label>Hvad laver virksomheden?<textarea data-f="desc" id="nd">${esc(f.desc)}</textarea></label><label>Stil<select data-f="style" id="ns">${Object.keys(STYLES).map(k=>`<option ${f.style===k?'selected':''}>${k}</option>`).join('')}</select></label>${S.err?`<p class="err">${esc(S.err)}</p>`:''}<button class="btn" data-act="gen" ${S.busy?'disabled':''}>${S.busy?'Genererer…':'Generér hjemmeside (10 credits)'}</button></div>`}

function vEdit(){const p=getP();if(!p)return vPick('edit')
  const chips=['Skift farve til grøn','Gør siden mørk','Tilføj Om os','Skift overskrift til “Din lokale ekspert”'];
  return `<div class="bar"><button class="btn ghost" data-act="list">← Projekter</button><strong>${esc(p.name)}</strong><span class="sp"></span><button class="btn ghost" data-act="undo" ${p.history.length?'':'disabled'}>Fortryd</button><button class="btn ghost" data-act="redo" ${p.future.length?'':'disabled'}>Gentag</button><button class="btn ${S.device==='desktop'?'':'ghost'}" data-act="dev" data-d="desktop">Computer</button><button class="btn ${S.device==='mobile'?'':'ghost'}" data-act="dev" data-d="mobile">Mobil</button></div>
<div class="ed"><section class="chat"><div class="msgs">${p.chat.map(m=>`<div class="m ${m.r}">${esc(m.t)}</div>`).join('')}${S.busy?'<div class="m ai">Arbejder…</div>':''}</div><div class="chips">${chips.map(t=>`<button class="chip" data-act="chip" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div><div class="row"><input id="chatin" placeholder="Skriv en ændring…" ${S.busy?'disabled':''}><button class="btn" data-act="send" ${S.busy?'disabled':''}>Send</button></div></section><section class="pv"><iframe class="${S.device}" title="Live preview" sandbox srcdoc="${esc(Renderer.html(p))}"></iframe></section></div>`}

/* ===== Nye sider ===== */
const NAV=[['Arbejde',[['dash','Dashboard'],['list','Mine hjemmesider'],['new','Opret ny hjemmeside'],['builder','AI Website Builder'],['edit','AI Chat Editor'],['templates','Skabeloner']]],['Drift',[['domains','Domæner og publicering'],['credits','Credits og abonnementer'],['customers','Kunder og projekter'],['stats','Statistik og analyser']]],['System',[['settings','Indstillinger'],['admin','Admin Panel']]]];
const BT={hero:'Forside',features:'Fordele',about:'Om os',contact:'Kontakt',services:'Ydelser',steps:'Sådan foregår det',faq:'Spørgsmål og svar',cta:'Opfordring'},LBL={title:'Overskrift',text:'Tekst',cta:'Knaptekst',email:'E-mail',phone:'Telefon',t:'Titel',d:'Beskrivelse'};
const PLANS=[['Gratis',50],['Starter',500],['Pro',2000]];
const TPL=[{n:'Restaurant',s:'Elegant',d:'Hyggelig restaurant med lokale råvarer og sæsonens menu.'},{n:'Håndværker',s:'Moderne',d:'Pålidelig håndværker til nybyg, renovering og service.'},{n:'Frisør',s:'Frisk',d:'Frisørsalon med fokus på klip, farve og personlig rådgivning.'},{n:'Konsulent',s:'Mørk',d:'Selvstændig konsulent, der hjælper virksomheder med strategi og vækst.'}];
const CK=[[1,'AI-generator via sikker serverfunktion (API-nøgle kræves)'],[1,'Live preview og chat-redigering'],[1,'Bygger med direkte redigering af blokke'],[1,'Ejer/admin med ubegrænsede credits'],[1,'Kunder med egne credits (manuelt)'],[1,'Sikkerhedskopi og gendannelse'],[1,'Adgangskode, begrænsning og validering på AI-serveren'],[1,'Demo-tilstand, hvis AI-serveren ikke er sat op'],[0,'Login og database'],[0,'Rigtig publicering og egne domæner'],[0,'Betaling og abonnementer (kræver din godkendelse)']];
const nEdits=p=>p.chat.filter(m=>m.r==='u').length;
const snap=()=>JSON.stringify({app:'primewebs',v:1,at:new Date().toISOString(),projects:Projects.all(),customers:Customers.all(),settings:(({aiCode,...r})=>r)(Settings.get()),credits:Storage.get('pw.credits',50)},null,1);
const frame=p=>`<iframe title="Live preview" sandbox srcdoc="${esc(Renderer.html(p))}"></iframe>`;

function vPick(t){const l=Projects.all();return `<h1>${t==='edit'?'AI Chat Editor':'AI Website Builder'}</h1><p class="mu">Vælg en hjemmeside at arbejde på.</p>`+(l.length?`<div class="grid">${l.map(p=>`<div class="card"><h3>${esc(p.name)}</h3><button class="btn" data-act="pick" data-t="${t}" data-id="${p.id}">Vælg</button></div>`).join('')}</div>`:`<p>Du har ingen hjemmesider endnu.</p><button class="btn" data-act="go" data-v="new">Opret ny hjemmeside</button>`)}

function vDash(){const l=Projects.all(),u=Session.user(),t=(n,x)=>`<div class="card"><div class="mu">${x}</div><h1>${n}</h1></div>`;
  return `<h1>Dashboard</h1><p class="mu">Velkommen, ${esc(u.name)}. Rolle: ${u.role.toUpperCase()}.</p><div class="grid">${t(l.length,'Hjemmesider')}${t(Customers.all().length,'Kunder')}${t(Credits.unlimited()?'Ubegrænset':Credits.balance(),'Dine credits')}${t(l.reduce((n,p)=>n+nEdits(p),0),'Chat-ændringer i alt')}</div><div class="row" style="margin:1rem 0"><button class="btn" data-act="go" data-v="new">Opret ny hjemmeside</button><button class="btn ghost" data-act="go" data-v="templates">Se skabeloner</button></div><h3>Seneste hjemmesider</h3>${l.length?`<div class="grid">${l.slice(0,3).map(p=>`<div class="card"><h3>${esc(p.name)}</h3><button class="btn" data-act="open" data-id="${p.id}">Åbn</button></div>`).join('')}</div>`:'<p class="mu">Ingen endnu.</p>'}<h3 style="margin-top:1.5rem">Platformens status</h3>${CK.map(([o,x])=>`<div class="ck"><span class="${o?'ok':''}">${o?'✓':'○'}</span>${x}</div>`).join('')}`}

function vBuilder(){const p=getP();if(!p)return vPick('builder');const bl=p.site.blocks;
  const fl=(bi,k,v,x='')=>`<label>${LBL[k]||k}${(k==='text'||k==='d')?`<textarea data-b="${bi}" data-k="${k}" ${x}>${esc(v)}</textarea>`:`<input data-b="${bi}" data-k="${k}" ${x} value="${esc(v)}">`}</label>`;
  const card=(b,bi)=>`<div class="card" style="margin-bottom:.8rem"><div class="row"><strong>${BT[b.type]||b.type}</strong><span class="sp"></span><button class="btn ghost" data-act="bmove" data-i="${bi}" data-d="-1" ${bi?'':'disabled'}>↑</button><button class="btn ghost" data-act="bmove" data-i="${bi}" data-d="1" ${bi<bl.length-1?'':'disabled'}>↓</button>${b.type==='hero'?'':`<button class="btn ghost" data-act="brem" data-i="${bi}">Fjern</button>`}</div>${Object.keys(b).filter(k=>k!=='id'&&k!=='type').map(k=>Array.isArray(b[k])?b[k].map((it,ii)=>fl(bi,'t',it.t,`data-i="${ii}" data-ik="t"`)+fl(bi,'d',it.d,`data-i="${ii}" data-ik="d"`)).join(''):fl(bi,k,b[k])).join('')}</div>`;
  const adds=Object.keys(BT).filter(t=>!bl.some(b=>b.type===t)).map(t=>`<button class="btn ghost" data-act="badd" data-t="${t}">+ ${BT[t]}</button>`).join('');
  return `<div class="bar"><strong>AI Website Builder: ${esc(p.name)}</strong><span class="sp"></span><button class="btn ghost" data-act="unpick">Vælg anden</button><button class="btn ghost" data-act="undo" ${p.history.length?'':'disabled'}>Fortryd</button><button class="btn ghost" data-act="redo" ${p.future.length?'':'disabled'}>Gentag</button></div><div class="ed"><section class="chat" style="overflow:auto"><p class="mu">Ret felterne direkte. Ændringer gemmes med det samme, og preview opdateres.</p>${bl.map(card).join('')}<div class="row">${adds}</div></section><section class="pv">${frame(p)}</section></div>`}

function vTpl(){return `<h1>Skabeloner</h1><p class="mu">Start fra en skabelon, og tilpas den bagefter.</p><div class="grid">${TPL.map((t,i)=>`<div class="card"><h3>${t.n}</h3><p class="mu">${t.d}</p><p class="mu">Stil: ${t.s}</p><button class="btn" data-act="tpl" data-i="${i}">Brug skabelon</button></div>`).join('')}</div>`}

function vDom(){const l=Projects.all();
  return `<h1>Domæner og publicering</h1><p class="mu">Her gemmer du domænenavn og status og eksporterer hjemmesidens kode. Selve udgivelsen og DNS-tilslutningen kræver hosting og en server, som vi bygger senere.</p>`+(l.length?l.map(p=>`<div class="card" style="margin-bottom:.8rem"><div class="row"><strong>${esc(p.name)}</strong><span class="badge">${p.status==='ready'?'Klar til udgivelse':'Kladde'}</span></div><label>Domæne<input data-dom="${p.id}" placeholder="fx minvirksomhed.dk" value="${esc(p.domain||'')}"></label><p class="mu">${p.domain?'Domænet er gemt, men ikke tilsluttet endnu.':'Intet domæne valgt.'}</p><div class="row"><button class="btn ghost" data-act="rdy" data-id="${p.id}">${p.status==='ready'?'Sæt tilbage til kladde':'Markér klar til udgivelse'}</button><button class="btn" data-act="exp" data-id="${p.id}">Eksportér HTML</button></div>${S.out&&S.outId===p.id?`<label style="margin-top:1rem">HTML-kode (markér og kopiér)<textarea class="code" readonly>${esc(S.out)}</textarea></label>`:''}</div>`).join(''):'<p>Ingen hjemmesider endnu.</p>')}

function vCred(){return `<h1>Credits og abonnementer</h1><div class="card" style="margin-bottom:1rem"><span class="badge">OWNER / ADMIN</span><h3 style="margin-top:.6rem">Din konto: ubegrænsede credits</h3><p class="mu">Intet trækkes, når du selv genererer, tester eller redigerer.</p></div><h3>Credit-forbrug for kunder</h3><table><tr><th>Handling</th><th>Credits</th></tr><tr><td>Generér hjemmeside</td><td>${Credits.cost.generate}</td></tr><tr><td>Chat-ændring</td><td>${Credits.cost.edit}</td></tr></table><h3 style="margin-top:1.5rem">Abonnementer (udkast)</h3><table><tr><th>Plan</th><th>Credits pr. måned</th></tr>${PLANS.map(([n,c])=>`<tr><td>${n}</td><td>${c}</td></tr>`).join('')}</table><p class="mu">Der er ikke tilsluttet nogen betaling. Priser og betalingssystem tilføjes først, når du har godkendt det.</p>`}

function vCust(){const c=Customers.all(),l=Projects.all(),f=S.cf,po=(v)=>PLANS.map(([n])=>`<option ${v===n?'selected':''}>${n}</option>`).join('');
  return `<h1>Kunder og projekter</h1><div class="card form" style="margin-bottom:1rem"><h3>Ny kunde</h3><label>Navn<input data-g="name" value="${esc(f.name)}"></label><label>E-mail<input data-g="email" value="${esc(f.email)}"></label><label>Plan<select data-g="plan">${po(f.plan)}</select></label>${S.err?`<p class="err">${esc(S.err)}</p>`:''}<button class="btn" data-act="cadd">Tilføj kunde</button></div><h3>Kunder</h3>`+(c.length?`<table><tr><th>Kunde</th><th>Plan</th><th>Credits</th><th></th></tr>${c.map(u=>`<tr><td>${esc(u.name)}<div class="mu" style="margin:0">${esc(u.email)}</div></td><td><select data-cu="${u.id}" data-cf="plan">${po(u.plan)}</select></td><td>${u.credits}</td><td><div class="row"><button class="btn ghost" data-act="cc" data-id="${u.id}" data-n="-10">−10</button><button class="btn ghost" data-act="cc" data-id="${u.id}" data-n="10">+10</button><button class="btn ghost" data-act="cdel" data-id="${u.id}">${S.cdel===u.id?'Bekræft':'Slet'}</button></div></td></tr>`).join('')}</table>`:'<p class="mu">Ingen kunder endnu.</p>')+`<h3 style="margin-top:1.5rem">Projekter</h3>`+(l.length?`<table><tr><th>Hjemmeside</th><th>Kunde</th></tr>${l.map(p=>`<tr><td>${esc(p.name)}</td><td><select data-cp="${p.id}"><option value="">Intern (mig)</option>${c.map(u=>`<option value="${u.id}" ${p.customerId===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select></td></tr>`).join('')}</table>`:'<p class="mu">Ingen hjemmesider endnu.</p>')}

function vStats(){const l=Projects.all(),mx=Math.max(1,...l.map(nEdits)),t=(n,x)=>`<div class="card"><div class="mu">${x}</div><h1>${n}</h1></div>`;
  return `<h1>Statistik og analyser</h1><p class="mu">Oversigt over arbejdet på platformen. Besøgstal for udgivne hjemmesider kommer, når publicering er tilsluttet.</p><div class="grid" style="margin-bottom:1rem">${t(l.length,'Hjemmesider')}${t(Customers.all().length,'Kunder')}${t(l.reduce((n,p)=>n+nEdits(p),0),'Chat-ændringer')}</div>`+(l.length?`<table><tr><th>Hjemmeside</th><th>Chat-ændringer</th><th>Blokke</th></tr>${l.map(p=>`<tr><td>${esc(p.name)}</td><td><div class="bar2" style="width:${nEdits(p)/mx*100}%"></div>${nEdits(p)}</td><td>${p.site.blocks.length}</td></tr>`).join('')}</table>`:'')}

function vSet(){const s=Settings.get(),u=Session.user(),f=(k,t)=>`<label>${t}<input data-s="${k}" value="${esc(s[k])}"></label>`;
  return `<h1>Indstillinger</h1><div class="card form"><h3>Virksomhed</h3><p class="mu">Bruges som standard i nye hjemmesiders kontaktsektion.</p>${f('company','Virksomhedsnavn')}${f('email','E-mail')}${f('phone','Telefon')}${f('web','Hjemmeside')}<label>AI-adgangskode (samme som ACCESS_CODE på serveren)<input type="password" data-s="aiCode" value="${esc(s.aiCode||'')}"></label><label>Udseende<select data-s="theme">${[['auto','Følg enheden'],['light','Lyst'],['dark','Mørkt']].map(([v,t])=>`<option value="${v}" ${s.theme===v?'selected':''}>${t}</option>`).join('')}</select></label></div><div class="card form" style="margin-top:1rem"><h3>Konto</h3><p>${esc(u.name)} <span class="badge">${u.role.toUpperCase()}</span></p><h3>Tilslutninger</h3><p class="mu">AI: ${AI.mode==='api'?'AI-server (Claude) bruges, hvis den er sat op':'demo-tilstand (testgenerator), AI-serveren svarer ikke'}<br>Betalingssystem: ikke tilsluttet<br>Database og login: ikke tilsluttet, data gemmes i denne browser</p></div>`}

function vAdmin(){if(!Session.can())return '<h1>Admin Panel</h1><p>Du har ikke adgang.</p>';
  return `<h1>Admin Panel</h1><div class="grid" style="margin-bottom:1rem"><div class="card"><div class="mu">Roller</div><p><span class="badge">OWNER</span> og <span class="badge">ADMIN</span>: fuld adgang og ubegrænsede credits.<br><span class="badge">KUNDE</span>: egne hjemmesider og credits (kommer med login).</p></div><div class="card"><div class="mu">Data i denne browser</div><p>${Projects.all().length} hjemmesider, ${Customers.all().length} kunder</p></div></div><div class="card stack"><h3>Sikkerhedskopi</h3><p class="mu">Kopiér al data (hjemmesider, kunder, indstillinger) og gem teksten i en fil på din computer.</p><button class="btn" data-act="bk">Lav sikkerhedskopi</button>${S.out&&S.outId==='bk'?`<textarea class="code" readonly>${esc(S.out)}</textarea>`:''}<h3>Gendan</h3><textarea class="code" id="rs" placeholder="Indsæt sikkerhedskopi her">${esc(S.rv)}</textarea><button class="btn ghost" data-act="rs">${S.rc?'Bekræft: overskriv al data':'Gendan fra kopi'}</button>${S.msg?`<p class="${S.msg.startsWith('Fejl')?'err':''}">${esc(S.msg)}</p>`:''}</div>`}

const V={dash:vDash,list:vList,new:vNew,builder:vBuilder,edit:vEdit,templates:vTpl,domains:vDom,credits:vCred,customers:vCust,stats:vStats,settings:vSet,admin:vAdmin};

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
    try{const x=JSON.parse(S.rv||'');if(x.app!=='primewebs'||!Array.isArray(x.projects))throw 0;Projects.save(x.projects);Customers.save(x.customers||[]);Storage.set('pw.settings',{...(x.settings||{}),aiCode:Settings.get().aiCode});if(x.credits!=null)Storage.set('pw.credits',x.credits);S.rv='';S.msg='Gendannet: '+x.projects.length+' hjemmesider.'}catch(e){S.msg='Fejl: kopien kunne ikke læses.'}return 1}
}

function render(){
  const th=Settings.get().theme;if(th==='auto')delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=th;
  const u=Session.user();
  const nav=`<aside class="side"><div class="logo">PRIME WEBS AI</div>${NAV.map(([g,it])=>`<div class="grp">${g}</div>${it.filter(([k])=>k!=='admin'||Session.can()).map(([k,t])=>`<button class="nv ${S.view===k?'on':''}" data-act="go" data-v="${k}">${t}</button>`).join('')}`).join('')}<div class="who"><strong>${esc(u.name)}</strong> <span class="badge">OWNER / ADMIN</span><div>${Credits.unlimited()?'∞ Ubegrænsede credits':Credits.balance()+' credits'}</div><div class="tag">AI: ${AI.mode==='api'?'AI-server':'demo (testgenerator)'}</div></div></aside>`;
  $('#app').innerHTML=`<div class="shell">${nav}<main class="main">${(V[S.view]||vList)()}</main></div>`;
  const c=$('.msgs');if(c)c.scrollTop=c.scrollHeight;
  const i=$('#chatin');if(i&&!S.busy)i.focus();
}

async function generate(){
  const f=S.form;
  if(!f.name.trim()){S.err='Skriv et navn til projektet.';return render()}
  if(Credits.balance()<Credits.cost.generate){S.err='Du har ikke nok credits.';return render()}
  S.err='';S.busy=true;render();
  let result;
  try { result=await AI.generate({name:f.name.trim(),description:f.desc.trim(),style:f.style}); }
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
  if(ext(a,b))return render();
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
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='chatin')send(e.target.value)});
render();
