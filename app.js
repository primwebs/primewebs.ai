if(typeof structuredClone!=='function')window.structuredClone=o=>JSON.parse(JSON.stringify(o));
/* ===== Lag 0: hjælpere ===== */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function imgSrc(value){
  if(typeof value!=='string'||!value.trim())return '';
  const src=value.trim();
  if(/^data:image\/(?:jpeg|png|webp|gif|svg\+xml);base64,/i.test(src)||/^https?:\/\//i.test(src)||src.startsWith('/'))return src;
  const stored=Storage.get('pw.img',{});
  return stored&&typeof stored[src]==='string'?stored[src]:'';
}
const uid=()=>Math.random().toString(36).slice(2,9);
const newProjectId=()=>window.crypto&&typeof window.crypto.randomUUID==='function'?window.crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16)});
const isProjectUuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));
function normalizeProjectIds(list){
  let changed=false;
  const projects=(Array.isArray(list)?list:[]).map(p=>{
    if(!p||typeof p!=='object'||isProjectUuid(p.id))return p;
    const previous=String(p.id||''),next=newProjectId();
    p.id=next;
    if(previous&&String(S.id||'')===previous)S.id=next;
    if(previous&&String(Storage.get('pw.activeProject',''))===previous)Storage.set('pw.activeProject',next);
    changed=true;
    return p;
  });
  return{projects,changed};
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const $=s=>document.querySelector(s);

/* ===== Lag 1: adaptere (udskiftes senere med backend) ===== */
// Storage: browseren nu, database (fx Supabase) senere
const Storage={mem:{},
  get(k,d){try{const v=localStorage.getItem(k);if(!v)return d;const x=JSON.parse(v);return(x==null||Array.isArray(x)!==Array.isArray(d)||typeof x!==typeof d)?d:x}catch(e){return k in this.mem?this.mem[k]:d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){this.mem[k]=v}if(window.PWDB)window.PWDB.persistKey(k,v)}};
// Session og credits hentes fra Supabase efter login.
const Session={user:()=>({id:window.PWDB&&window.PWDB.user&&window.PWDB.user.id,name:(window.PWDB&&window.PWDB.profile&&window.PWDB.profile.display_name)||'Bruger',role:(window.PWDB&&window.PWDB.profile&&window.PWDB.profile.role)||'user',email:(window.PWDB&&window.PWDB.user&&window.PWDB.user.email)||''}),can:()=>['owner','admin'].includes(Session.user().role)};
const Credits={cost:{generate:6,edit:1},
  unlimited:()=>Session.can()||!!(window.PWDB&&window.PWDB.credits&&window.PWDB.credits.unlimited),
  balance(){return this.unlimited()?Infinity:(window.PWDB&&window.PWDB.credits?window.PWDB.credits.balance:Storage.get('pw.credits',50))},
  spend(a){if(this.unlimited())return true;const b=this.balance(),c=this.cost[a];if(b<c)return false;if(window.PWDB&&window.PWDB.spendCredits)window.PWDB.spendCredits(c,a,'PRIME WEBS AI '+a).then(ok=>{if(!ok)banner('Credits kunne ikke trækkes. Prøv igen.');if(window.render)window.render()}).catch(e=>banner(e.message));else Storage.set('pw.credits',b-c);return true}};
// Projects: repository, samme interface mod database senere
function projectContentKey(p){
  // IDs are deliberately excluded: this key detects the same saved website
  // copied into Supabase under multiple IDs, while preserving genuinely
  // different versions of a project (including the two distinct barbershops).
  return JSON.stringify([
    p.name||'',p.status||'draft',p.domain||null,p.plan||null,
    p.site||{},p.history||[],p.future||[],p.chat||[]
  ]);
}
function dedupeProjectRecords(list){
  const active=String(S.id||Storage.get('pw.activeProject','')||'');
  const byContent=new Map();
  // Supabase does not guarantee row order. Pick one stable canonical ID for
  // identical copies so a dashboard card never changes identity between loads.
  const ordered=(Array.isArray(list)?list:[]).slice().sort((a,b)=>{
    const createdA=Number(a.createdAt||0),createdB=Number(b.createdAt||0);
    if(createdA!==createdB)return createdA-createdB;
    return String(a.id||'').localeCompare(String(b.id||''));
  });
  for(const p of ordered){
    const key=projectContentKey(p),old=byContent.get(key);
    if(!old || String(p.id)===active)byContent.set(key,p);
  }
  return Array.from(byContent.values());
}
function projectFingerprint(p){
  const value=projectContentKey(p);let hash=2166136261;
  for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),16777619);
  return (hash>>>0).toString(16);
}
const Projects={
  all(){
    const result=normalizeProjectIds(Storage.get('pw.projects',[]).map(fixP).filter(Boolean));
    const unique=dedupeProjectRecords(result.projects);
    if(result.changed||unique.length!==result.projects.length)Storage.set('pw.projects',unique);
    return unique;
  },
  save(list){
    const result=normalizeProjectIds(dedupeProjectRecords((Array.isArray(list)?list:[]).map(fixP).filter(Boolean)));
    Storage.set('pw.projects',result.projects);
  }
};
// Defensive record normalizers used by the project/customer repositories.
function fixP(value){
  if(!value || typeof value!=='object' || Array.isArray(value)) return null;
  const p={...value};
  p.id=String(p.id||'');
  p.name=String(p.name||'Untitled website');
  p.site=p.site&&typeof p.site==='object'?p.site:{};
  p.site.blocks=Array.isArray(p.site.blocks)?p.site.blocks:[];
  p.site.meta=p.site.meta&&typeof p.site.meta==='object'?p.site.meta:{};
  p.chat=Array.isArray(p.chat)?p.chat:[];
  return p;
}
function fixC(value){
  if(!value || typeof value!=='object' || Array.isArray(value)) return null;
  return {...value,id:String(value.id||''),name:String(value.name||''),email:String(value.email||'')};
}
const Customers={all:()=>Storage.get('pw.customers',[]).map(fixC).filter(Boolean),save:l=>Storage.set('pw.customers',l)};
const Settings={d:{company:'PrimeWebs',email:'primewebssupport@gmail.com',phone:'+45 30 95 05 93',web:'https://primewebs.site',ownerEmail:'primewebssupport@gmail.com',theme:'auto'},get(){const s={...this.d,...Storage.get('pw.settings',{})};['company','email','phone','web','ownerEmail'].forEach(k=>{s[k]=String(s[k]??'')});return s},set(k,v){Storage.set('pw.settings',{...Storage.get('pw.settings',{}),[k]:v})}};

/* ===== Lag 2: rigtig AI via sikker serverfunktion ===== */
const STYLES={Moderne:{accent:'#2540D9',font:'sans',mode:'light'},Elegant:{accent:'#9A6B2F',font:'serif',mode:'light'},Frisk:{accent:'#1E8E5A',font:'sans',mode:'light'},Mørk:{accent:'#8DA0FF',font:'sans',mode:'dark'},Natur:{accent:'#3F7D4E',font:'sans',mode:'light'},Hav:{accent:'#0E7C86',font:'sans',mode:'light'},Solnedgang:{accent:'#E8730C',font:'sans',mode:'light'},Rosa:{accent:'#D6457F',font:'sans',mode:'light'},Lavendel:{accent:'#7B3FD1',font:'sans',mode:'light'},Premium:{accent:'#C9A24B',font:'serif',mode:'dark'}};
const COLORS={blå:'#2540D9',grøn:'#1E8E5A',rød:'#D12C3F',lilla:'#7B3FD1',orange:'#E8730C',sort:'#111111',gul:'#E3B505',turkis:'#0E9AA7',pink:'#D6457F',lyserød:'#E58BB0',brun:'#8A5A3B',grå:'#6B7280',navy:'#1E3A8A',marineblå:'#1E3A8A',guld:'#C9A24B',mint:'#2BB48D',bordeaux:'#7A1F3D',himmelblå:'#38A3F1'};
const mk={
  hero:(n,d)=>({id:uid(),type:'hero',title:'Velkommen til '+n,text:(d?d+' ':'')+'Vi hjælper dig godt i gang med en løsning, der passer til dine behov. Kontakt os i dag for en uforpligtende samtale.',cta:'Kontakt os'}),
  threeD:(n)=>({id:uid(),type:'threeD',title:'Oplev det i 3D',text:'Et interaktivt 3D-element, der giver hjemmesiden dybde.',shape:'orb',color:'#6D7CFF',modelData:'',modelFormat:'glb',modelName:''}),
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
  gallery:()=>({id:uid(),type:'gallery',title:'Galleri',images:[]}),
  booking:()=>({id:uid(),type:'booking',title:'Book en tid',text:'Vælg en ydelse og send os din ønskede tid.',cta:'Book en tid'}),
  pricing:()=>({id:uid(),type:'pricing',title:'Priser og pakker',items:[{t:'Ydelse',d:'Beskriv ydelsen her.',price:'Kontakt os'}]}),
  team:()=>({id:uid(),type:'team',title:'Mød teamet',items:[{t:'Navn',d:'Rolle og ansvarsområde'}]}),
  reviews:()=>({id:uid(),type:'reviews',title:'Det siger vores kunder',items:[{name:'Kundenavn',text:'Indsæt en ægte kundeanmeldelse her.',rating:5}]}),
  map:()=>({id:uid(),type:'map',title:'Find os',address:''}),
  contact:()=>({id:uid(),type:'contact',title:'Kontakt',text:'Skriv eller ring, så vender vi hurtigt tilbage.',email:Settings.get().email,phone:Settings.get().phone})};
const DemoAI={mode:'test',
  async generate(input){await wait(500);return smartSite(input)},
  async edit(site,msg){await wait(250);
    const s=structuredClone(site),m=String(msg||'').toLowerCase(),th=s.meta.theme,name=s.meta.title,out=[];
    const quoted=(msg.match(/[“"„»]([^”"“«]+)[”"“«]/)||[])[1];
    const say=x=>out.push(x);
    const colorNames={...COLORS,hvid:'#FFFFFF',hvidt:'#FFFFFF',creme:'#F7F1E8',koksgrå:'#292D32'};
    const colorKey=Object.keys(colorNames).sort((x,y)=>y.length-x.length).find(k=>m.includes(k));
    const hex=(msg.match(/#[0-9a-f]{6}\b/i)||[])[0];
    const wantsColor=/farve|farver|tema|design|baggrund|baggrunde|rød|rødt|grøn|blå|sort|hvid|orange|pink|lilla|gul|turkis|bordeaux/.test(m);
    const bgRequest=/baggrund|baggrundsfarve|baggrunden/.test(m);
    if((hex||colorKey)&&wantsColor){
      const c=hex||colorNames[colorKey];
      th.accent=c;
      if(bgRequest){
        th.background=c;
        const n=parseInt(c.slice(1),16),r=(n>>16)&255,g=(n>>8)&255,b=n&255,bright=(r*299+g*587+b*114)/1000;
        th.surface=bright>155?'#FFFFFF':'#252A35';th.text=bright>155?'#111111':'#FFFFFF';th.mode='light';
        say('Baggrundsfarven er ændret');
      } else if(/hele|overalt|alt skal være|gennemgående|tema/.test(m)){
        th.background=c;
        th.surface=/rød|bordeaux/.test(m)?(c.toLowerCase()==='#7a1f3d'?'#5D172E':'#B82032'):c;
        th.text=/sort tekst|sort skrift|sort font/.test(m)?'#111111':(/hvid tekst|hvid skrift|hvid font/.test(m)?'#FFFFFF':(c.toLowerCase()==='#ffffff'?'#111111':'#FFFFFF'));
        th.mode='light';
        say('Hele hjemmesidens farvetema er ændret');
      } else say('Hjemmesidens accentfarve er ændret');
    }
    if(/hvid tekst|hvid skrift|hvid font/.test(m)){th.text='#FFFFFF';say('Teksten er gjort hvid')}
    if(/sort tekst|sort skrift|sort font/.test(m)){th.text='#111111';say('Teksten er gjort sort')}
    if(/mørk/.test(m)){th.mode='dark';say('Siden er sat i mørk tilstand')}
    else if(/\blys\b|lyst/.test(m)){th.mode='light';say('Siden er sat i lys tilstand')}
    if(/serif|elegant|klassisk/.test(m)){th.font='serif';say('Skriften er ændret til serif')}
    else if(/sans|moderne/.test(m)){th.font='sans';say('Skriften er ændret til sans-serif')}
    const hero=s.blocks.find(x=>x.type==='hero');
    if(hero){
      if(/overskrift|headline|titel/.test(m)&&quoted){hero.title=quoted;say('Forsidens overskrift er ændret')}
      if(/tekst|beskrivelse|brødtekst/.test(m)&&quoted){hero.text=quoted;say('Forsidens tekst er ændret')}
      if(/knap|call.to.action/.test(m)&&quoted){hero.cta=quoted;say('Forsidens knaptekst er ændret')}
      if(/kortere overskrift/.test(m)){hero.title=name;say('Overskriften er gjort kortere')}
    }
    const add=/tilføj|opret|indsæt|lav også|lav en/.test(m),remove=/fjern|slet|tag .* væk/.test(m);
    const sectionMap=[
      [['kontakt','kontaktsektion'],'contact','Kontakt'],
      [['fordele','fordelssektion'],'features','Fordele'],
      [['om os','om-sektion'],'about','Om os'],
      [['ydelser','services'],'services','Ydelser'],
      [['sådan foregår','proces','trin'],'steps','Sådan foregår det'],
      [['faq','spørgsmål og svar','ofte stillede'],'faq','FAQ'],
      [['opfordring','call to action','cta'],'cta','Opfordring'],
      [['galleri','billeder','portfolio'],'gallery','Galleri']
    ];
    for(const [words,type,label] of sectionMap){
      if(!words.some(w=>m.includes(w)))continue;
      const exists=s.blocks.some(x=>x.type===type);
      if(add&&!exists){
        const nb=type==='about'?mk.about(name,''):type==='cta'?mk.cta(name):mk[type]();
        const ci=s.blocks.findIndex(x=>x.type==='contact');
        if(type!=='contact'&&ci>=0)s.blocks.splice(ci,0,nb);else s.blocks.push(nb);
        say(label+'-sektionen er tilføjet');
      } else if(remove&&exists&&type!=='hero'&&type!=='contact'){
        s.blocks=s.blocks.filter(x=>x.type!==type);say(label+'-sektionen er fjernet');
      }
    }
    if(/flere fordele|flere kort|flere ydelser/.test(m)){
      const block=s.blocks.find(x=>x.type==='features'||x.type==='services');
      if(block){const base=block.items[0]||{t:'Personlig service',d:'Kontakt os for en løsning, der passer til dine behov.'};block.items=[...block.items,{...base,t:'Fleksible løsninger'},{...base,t:'Personlig rådgivning'}].slice(0,8);say('Flere indholdskort er tilføjet')}
    }
    if(/mere professionel|mere detaljeret|mere indhold|uddyb/.test(m)){
      const f=s.blocks.find(x=>x.type==='features');
      if(f&&f.items.length<6)f.items=[...f.items,{t:'Gennemtænkt kvalitet',d:'Vi lægger vægt på tydelig kommunikation, godt håndværk og en løsning, der passer til opgaven.'}];
      say('Indholdet er udbygget med mere forklarende tekst og flere detaljer');
    }
    if(/centrer|centreret/.test(m)){th.align='center';say('Layoutet er sat mere centralt')}
    if(/afrundede hjørner|runde hjørner/.test(m)){th.radius='large';say('Kort og knapper får mere afrundede hjørner')}
    if(/fjern billeder|uden billeder/.test(m)){
      s.blocks.forEach(x=>{if(x.image)delete x.image;if(x.type==='gallery')x.images=[]});say('Billeder er fjernet fra hjemmesiden');
    }
    if(/\bbook(?:ing)?\s*(?:system|funktion|side)?\b|bestil\s+(?:en\s+)?tid|book\s+(?:en\s+)?tid|tidsbestilling|online\s+booking|lav\s+(?:et\s+)?booking(?:system|funktion|side)?/i.test(m)){
      if(!s.blocks.some(x=>x.type==='booking')){
        const ci=s.blocks.findIndex(x=>x.type==='contact');
        const block={id:uid(),type:'booking',title:'Book en tid',text:'Vælg en ydelse og send os din ønskede tid.',cta:'Book en tid'};
        ci>=0?s.blocks.splice(ci,0,block):s.blocks.push(block);
      }
      say('En separat bookingside med bookingformular er tilføjet');
    }
    if(!out.length)return{site:null,reply:'Testgeneratoren kan nu håndtere flere faste ændringer, men forstod ikke netop den formulering. Prøv fx: "Gør hele hjemmesiden rød med hvid tekst", "tilføj et galleri", "lav flere fordele", "skift overskriften til \"Velkommen\" eller "gør hjørnerne mere afrundede".'};
    return{site:s,reply:out.join('. ')+'.'};}
};

/* AI-lag: rigtig AI via /api/ai; falder tilbage til demo-tilstand, hvis serveren ikke er sat op */
const AI={mode:'api',
  async request(action,payload){
    let sessionResult=window.PWDB&&window.PWDB.client?await window.PWDB.client.auth.getSession():null;let token=sessionResult&&sessionResult.data&&sessionResult.data.session&&sessionResult.data.session.access_token;if(!token&&window.PWDB&&window.PWDB.client){const refreshed=await window.PWDB.client.auth.refreshSession();token=refreshed&&refreshed.data&&refreshed.data.session&&refreshed.data.session.access_token}if(!token){const e=new Error('Din login-session kunne ikke fornyes. Log ind igen, hvis problemet fortsætter.');e.status=401;throw e}let response=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({action,...payload})});if(response.status===401&&window.PWDB&&window.PWDB.client){const refreshed=await window.PWDB.client.auth.refreshSession();const nextToken=refreshed&&refreshed.data&&refreshed.data.session&&refreshed.data.session.access_token;if(nextToken)response=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+nextToken},body:JSON.stringify({action,...payload})})}
    const raw=await response.text();let data;try{data=JSON.parse(raw)}catch(_){data={error:'Serveren returnerede ikke JSON (HTTP '+response.status+'). '+String(raw||'').replace(/<[^>]*>/g,' ').slice(0,180)}}
    if(!response.ok){const e=new Error(data.error||'AI-forbindelsen fejlede ('+response.status+').');e.status=response.status;throw e}
    return data;
  },
  async run(action,payload,demo){
    try{const r=await this.request(action,payload);this.mode='api';return r}
    catch(e){
      // Never silently replace real AI with the local demo generator.
      // Surface the real server/provider error so configuration problems can be fixed.
      this.mode='error';
      throw e;
    }
  },
  generate(input){return this.run('generate',input,async()=>({site:await DemoAI.generate(input),reply:'Demo-tilstand: AI-serveren er ikke sat op endnu, så siden er lavet af testgeneratoren.'}))},
  edit(site,message,history=[]){return this.run('edit',{site,message,history},async()=>{const r=await DemoAI.edit(site,message);return{site:r.site,reply:'Demo: '+r.reply}})}
};

/* ===== Lag 3: renderer (JSON -> HTML). Samme output bruges til udgivelse/eksport senere ===== */
const B={
  hero:b=>{const im=imgSrc(b.image);return `<section class="hero${im?' two':''}"><div><h1>${esc(b.title)}</h1><p>${esc(b.text)}</p><div class="actions"><a class="btn" href="${b.actionHref||'#kontakt'}">${esc(b.cta||'Kontakt os')}</a><a class="btn secondary" href="${b.servicesHref||'#kontakt'}">Se vores ydelser</a></div></div>${im?`<figure><img src="${esc(im)}" alt="${esc(b.title)}"><figcaption>${b.imageAttribution?`<a href="${esc(b.imageCreditUrl||'#')}" target="_blank" rel="noopener">${esc(b.imageAttribution)}</a>`:''}</figcaption></figure>`:''}</section>`},
  features:b=>`<section><h2>${esc(b.title)}</h2><div class="g">${b.items.map(i=>`<article class="c">${i.image?`<img class="pw-card-image" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px;margin-bottom:1rem" src="${esc(imgSrc(i.image))}" alt="${esc(i.imageAlt||i.t||b.title)}" loading="lazy">`:''}<h3>${esc(i.t)}</h3><p>${esc(i.d)}</p>${i.imageAttribution?`<small class="pw-image-credit"><a href="${esc(i.imageCreditUrl||'#')}" target="_blank" rel="noopener">${esc(i.imageAttribution)}</a></small>`:''}<a class="text-link" href="#kontakt">Spørg os om dette <span aria-hidden="true">→</span></a></article>`).join('')}</div></section>`,
  about:b=>{const im=imgSrc(b.image),tx=String(b.text||'').split(/\n\n+/).map(x=>`<p>${esc(x)}</p>`).join('');return `<section class="ab${im?' two':''}"><div><h2>${esc(b.title)}</h2>${tx}</div>${im?`<figure><img src="${esc(im)}" alt="${esc(b.title)}"><figcaption>${b.imageAttribution?`<a href="${esc(b.imageCreditUrl||'#')}" target="_blank" rel="noopener">${esc(b.imageAttribution)}</a>`:''}</figcaption></figure>`:''}</section>`},
  services:b=>B.features(b),
  pricing:b=>`<section class="pricing-section"><h2>${esc(b.title||'Priser og pakker')}</h2><div class="g">${(b.items||[]).map(i=>`<article class="c pricing-card"><h3>${esc(i.t)}</h3><div class="price">${esc(i.price||'Kontakt os')}</div><p>${esc(i.d)}</p></article>`).join('')}</div></section>`,
  team:b=>`<section class="team-section"><h2>${esc(b.title||'Mød teamet')}</h2><div class="g">${(b.items||[]).map(i=>`<article class="c team-card"><h3>${esc(i.t)}</h3><p>${esc(i.d)}</p></article>`).join('')}</div></section>`,
  steps:b=>`<section><h2>${esc(b.title)}</h2><div class="g">${b.items.map((i,n)=>`<div class="c"><h3>${n+1}. ${esc(i.t)}</h3><p>${esc(i.d)}</p></div>`).join('')}</div></section>`,
  faq:b=>`<section><h2>${esc(b.title)}</h2>${b.items.map(i=>`<details class="c" style="margin-bottom:.6rem"><summary style="cursor:pointer;font-weight:600">${esc(i.t)}</summary><p>${esc(i.d)}</p></details>`).join('')}</section>`,
  cta:b=>`<section class="final-cta" style="text-align:center"><h2>${esc(b.title)}</h2><p>${esc(b.text)}</p><div class="actions" style="justify-content:center"><a class="btn" href="${b.actionHref||'#kontakt'}">${esc(b.cta||'Kontakt os nu')}</a><a class="btn secondary" href="${b.servicesHref||'#kontakt'}">Se ydelser</a></div></section>`,
  gallery:b=>{const im=(b.images||[]).filter(entry=>typeof entry==='string'?!!imgSrc(entry):!!(entry&&imgSrc(entry.url)));return im.length?`<section><h2>${esc(b.title)}</h2><div class="gal">${im.map((entry,n)=>{const u=typeof entry==='string'?entry:entry.url;return `<figure><img src="${esc(u)}" alt="${esc(b.title)} ${n+1}" loading="lazy"><figcaption>${entry&&entry.attribution?`<a href="${esc(entry.creditUrl||'#')}" target="_blank" rel="noopener">${esc(entry.attribution)}</a>`:''}</figcaption></figure>`}).join('')}</div></section>`:''},
  booking:b=>`<section class="booking-cta"><h2>${esc(b.title||'Book en tid')}</h2><p>${esc(b.text||'Vælg en tid, der passer dig.')}</p><a class="btn" href="#booking">${esc(b.cta||'Book en tid')}</a></section>`,
  threeD:b=>{const shape=['orb','torus','box','knot','barber-pole','shampoo-bottle','scissors','barber-chair','car','wheel','engine','paint-roller','paint-bucket','work-lamp','ceiling-lamp'].includes(b.shape)?b.shape:'orb',color=/^#[0-9a-fA-F]{6}$/.test(b.color||'')?b.color:'#6D7CFF',model=typeof b.modelData==='string'&&b.modelData.startsWith('data:')?b.modelData:(typeof b.modelUrl==='string'&&/^https:\/\/(?:models\.vinish\.dev|cdn\.3dassets\.dev)\//i.test(b.modelUrl)?b.modelUrl:(typeof b.modelUrl==='string'&&/^https:\/\/primewebs\.site\/api\/models\?asset=[a-z0-9-]+&download=1$/i.test(b.modelUrl)?b.modelUrl:'')),format=b.modelFormat==='gltf'?'gltf':'glb',fallbackArt=shape==='car'?'<svg viewBox="0 0 640 300"><path d="M80 190l30-70q12-26 42-32l94-22q22-6 45 0l95 26q28 8 45 34l36 64v34H80z" stroke="currentColor" stroke-width="13" stroke-linejoin="round"/><path d="M185 92l-35 76h290l-40-58-93-25zM80 190h432" stroke="currentColor" stroke-width="10" fill="none"/><circle cx="180" cy="220" r="38" stroke="currentColor" stroke-width="13"/><circle cx="420" cy="220" r="38" stroke="currentColor" stroke-width="13"/></svg>':shape==='engine'?'<svg viewBox="0 0 500 360"><path d="M110 110h280v160H110zM150 70h200v40H150zM80 150h30v100H80zM390 150h35v100h-35z" stroke="currentColor" stroke-width="12" fill="none"/><path d="M150 110V55h45v55m35 0V55h45v55m35 0V55h45v55M155 270v35h190v-35" stroke="currentColor" stroke-width="12" fill="none"/><circle cx="250" cy="190" r="45" stroke="currentColor" stroke-width="12" fill="none"/></svg>':shape==='wheel'?'<svg viewBox="0 0 360 360"><circle cx="180" cy="180" r="140" stroke="currentColor" stroke-width="26" fill="none"/><circle cx="180" cy="180" r="88" stroke="currentColor" stroke-width="14" fill="none"/><circle cx="180" cy="180" r="28" stroke="currentColor" stroke-width="12" fill="none"/><path d="M180 40v112m0 56v112M40 180h112m56 0h112M81 81l79 79m40 40 79 79M279 81l-79 79m-40 40-79 79" stroke="currentColor" stroke-width="12"/></svg>':shape==='barber-chair'?'<svg viewBox="0 0 360 420"><path d="M105 80q0-35 35-35h80q35 0 35 35v110H105zM85 190h190v48H85zM100 238v45m160-45v45M180 285v50m-85 35h170" stroke="currentColor" stroke-width="14" fill="none" stroke-linecap="round"/></svg>':shape==='paint-roller'?'<svg viewBox="0 0 420 360"><rect x="55" y="55" width="235" height="90" rx="24" stroke="currentColor" stroke-width="14" fill="none"/><path d="M290 100h55v130H210v75" stroke="currentColor" stroke-width="14" fill="none" stroke-linecap="round"/></svg>':shape==='paint-bucket'?'<svg viewBox="0 0 360 360"><path d="M80 105h200l-20 205H100zM90 105q90-95 180 0M75 105h210" stroke="currentColor" stroke-width="14" fill="none" stroke-linejoin="round"/></svg>':(shape==='work-lamp'||shape==='ceiling-lamp')?'<svg viewBox="0 0 360 360"><path d="M180 35v90m0 0 85 70-55 25-30-95m0 0-80 90m80-90v125m-90 65h180" stroke="currentColor" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M210 180h100l-35 65h-95z" stroke="currentColor" stroke-width="12" fill="none"/></svg>':'<svg viewBox="0 0 360 360"><path d="M65 180h230M180 65v230" stroke="currentColor" stroke-width="12" fill="none"/></svg>';return `<section class="pw-3d-section"><div class="pw-3d-copy"><span class="pw-3d-kicker">INTERACTIVE 3D</span><h2>${esc(b.title||'Oplev det i 3D')}</h2><p>${esc(b.text||'Et levende 3D-element, der giver hjemmesiden dybde.')}</p></div><div class="pw-three-scene" data-pw-three data-shape="${shape}" data-color="${color}" data-model-src="${esc(model)}" data-model-format="${format}" role="group" aria-label="${esc(b.title||'Interaktiv 3D-illustration')}" ><div class="pw-three-fallback" aria-hidden="true">${fallbackArt}</div><div class="pw-three-controls" aria-label="3D-kontroller"><button type="button" data-3d-zoom="-1" aria-label="Zoom ud">−</button><button type="button" data-3d-reset aria-label="Nulstil visning">Nulstil</button><button type="button" data-3d-zoom="1" aria-label="Zoom ind">+</button><button type="button" data-3d-auto aria-pressed="true">Auto rotation</button></div></div></section>`},
  contact:b=>`<section class="contact-section"><h2>${esc(b.title||'Kontakt os')}</h2><p>${esc(b.text||'Vi glæder os til at høre fra dig.')}</p><div class="actions">${b.phone?`<a class="btn" href="tel:${esc(String(b.phone).replace(/[^+\\d]/g,''))}">Ring til os · ${esc(b.phone)}</a>`:''}${b.whatsapp&&b.phone?`<a class="btn whatsapp" href="https://wa.me/${esc(String(b.whatsapp).replace(/\\D/g,''))}" target="_blank" rel="noopener">Skriv på WhatsApp</a>`:''}${b.email?`<a class="btn secondary" href="mailto:${esc(b.email)}">Send e-mail</a>`:''}${b.address?`<a class="btn secondary" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}" target="_blank" rel="noopener">Find os på Google Maps</a>`:''}<a class="btn secondary" href="#top">Til toppen ↑</a></div><form id="pw-contact-form" class="contact-form"><h3>Send os en besked</h3><label>Dit navn<input name="name" autocomplete="name" required></label><label>Din e-mail<input name="email" type="email" autocomplete="email" required></label><label>Telefon (valgfrit)<input name="phone" type="tel" autocomplete="tel"></label><label>Hvad kan vi hjælpe med?<textarea name="message" rows="4" required></textarea></label><button class="btn" type="submit">Klargør besked</button><p id="pw-contact-note" class="form-note">Din e-mailapp åbnes med beskeden. Du skal selv trykke Send.</p></form></section>` ,
  reviews:b=>Array.isArray(b.items)&&b.items.length?`<section class="reviews-section"><h2>${esc(b.title||'Det siger vores kunder')}</h2><div class="g">${b.items.slice(0,8).map(x=>`<article class="c review">${Number(x.rating)>=1&&Number(x.rating)<=5?`<div aria-label="${Math.round(Number(x.rating))} ud af 5 stjerner" class="stars">${'★'.repeat(Math.round(Number(x.rating)))}</div>`:''}<p>“${esc(x.text)}”</p><strong>${esc(x.name)}</strong></article>`).join('')}</div></section>`:'' ,
  map:b=>b.address?`<section class="map-section"><h2>${esc(b.title||'Find os')}</h2><p>${esc(b.address)}</p><a class="btn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}" target="_blank" rel="noopener">Åbn rutevejledning i Google Maps ↗</a></section>`:''};
const bookingRuntime=site=>{
  const contact=site.blocks.find(b=>b.type==='contact')||{};
  const services=site.blocks.find(b=>b.type==='services');
  const choices=(services&&services.items||[]).map(x=>x.t).filter(Boolean);
  const theme=site.meta.theme||{};
  const validHex=x=>/^#[0-9a-fA-F]{6}$/.test(x||'');
  const cfg=JSON.stringify({title:site.meta.title||'Booking',email:contact.email||'',phone:contact.phone||'',services:choices,siteKey:site.meta.bookingPublicKey||'',accent:validHex(theme.accent)?theme.accent:'#2540D9',surface:validHex(theme.surface)?theme.surface:'#FFFFFF',text:validHex(theme.text)?theme.text:'#182230',background:validHex(theme.background)?theme.background:'#F3F5FA',mode:theme.mode==='dark'?'dark':'light'});
  return `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"><\/script><script>(function(){const c=${cfg};const home=document.body.innerHTML;let bookingClientPromise=null;async function submitBooking(d){if(!bookingClientPromise){bookingClientPromise=fetch('/api/supabase-config',{cache:'no-store'}).then(r=>r.json()).then(x=>{if(!x.configured||!window.supabase||!c.siteKey)throw new Error('Online booking er ikke konfigureret for denne hjemmeside endnu.');return window.supabase.createClient(x.supabaseUrl,x.supabasePublishableKey)})}const client=await bookingClientPromise;const {data,error}=await client.rpc('submit_booking',{p_site_key:c.siteKey,p_service:d.service,p_requested_date:d.date,p_requested_time:d.time,p_customer_name:d.name,p_customer_email:d.email,p_customer_phone:d.phone||null,p_notes:d.notes||null});if(error)throw error;return data;}function render(){
  if(location.hash!=='#booking'){if(document.getElementById('pw-booking-page')){document.body.innerHTML=home;document.title=c.title;}return;}
  const esc=s=>String(s||'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const today=new Date(),min=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
  const dark=c.mode==='dark',muted=dark?'#B8C1D2':'#586579',line=dark?'#FFFFFF25':'#17203318';
  document.title='Booking · '+c.title;
  document.body.innerHTML='<main id="pw-booking-page" style="min-height:100vh;background:linear-gradient(145deg,'+c.background+','+c.surface+');color:'+c.text+';font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:clamp(18px,5vw,56px) 16px"><div style="max-width:760px;margin:0 auto"><a href="#" style="display:inline-flex;gap:8px;align-items:center;color:'+c.text+';text-decoration:none;font-weight:700">← Tilbage til hjemmesiden</a><div style="margin-top:28px;padding:clamp(22px,5vw,44px);border:1px solid '+line+';border-radius:26px;background:'+c.surface+';box-shadow:0 24px 70px #00000012"><div style="display:inline-flex;padding:7px 12px;border-radius:99px;background:'+c.accent+'18;color:'+c.accent+';font-size:12px;font-weight:800;letter-spacing:.12em">BOOKINGFORESPØRGSEL</div><h1 style="font-size:clamp(32px,6vw,48px);line-height:1.08;letter-spacing:-.04em;margin:18px 0 12px">Book en tid hos '+esc(c.title)+'</h1><p style="color:'+muted+';line-height:1.65;margin:0 0 26px">Fortæl os, hvilken ydelse du ønsker, og hvornår det passer dig. Virksomheden vender tilbage for at bekræfte tidspunktet.</p><form id="pw-booking" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px"><label style="display:grid;gap:7px;font-weight:700">Ydelse<select name="service" required style="min-width:0;width:100%;padding:14px;border:1px solid '+line+';border-radius:12px;background:'+c.surface+';color:'+c.text+';font:inherit;grid-column:1/-1">'+(c.services.length?c.services:['Aftale / konsultation']).map(x=>'<option>'+esc(x)+'</option>').join('')+'</select></label><label style="display:grid;gap:7px;font-weight:700">Ønsket dato<input name="date" type="date" min="'+min+'" required style="min-width:0;width:100%;padding:14px;border:1px solid '+line+';border-radius:12px;background:'+c.surface+';color:'+c.text+';font:inherit"></label><label style="display:grid;gap:7px;font-weight:700">Ønsket tidspunkt<input name="time" type="time" required style="min-width:0;width:100%;padding:14px;border:1px solid '+line+';border-radius:12px;background:'+c.surface+';color:'+c.text+';font:inherit"></label><label style="display:grid;gap:7px;font-weight:700">Dit navn<input name="name" required autocomplete="name" maxlength="120" style="min-width:0;width:100%;padding:14px;border:1px solid '+line+';border-radius:12px;background:'+c.surface+';color:'+c.text+';font:inherit"></label><label style="display:grid;gap:7px;font-weight:700">E-mail<input name="email" type="email" required autocomplete="email" maxlength="160" style="min-width:0;width:100%;padding:14px;border:1px solid '+line+';border-radius:12px;background:'+c.surface+';color:'+c.text+';font:inherit"></label><label style="display:grid;gap:7px;font-weight:700">Telefon (valgfrit)<input name="phone" type="tel" autocomplete="tel" maxlength="40" style="min-width:0;width:100%;padding:14px;border:1px solid '+line+';border-radius:12px;background:'+c.surface+';color:'+c.text+';font:inherit"></label><label style="display:grid;gap:7px;font-weight:700;grid-column:1/-1">Besked eller særlige ønsker (valgfrit)<textarea name="notes" rows="3" maxlength="1000" style="width:100%;padding:14px;border:1px solid '+line+';border-radius:12px;background:'+c.surface+';color:'+c.text+';font:inherit;resize:vertical"></textarea></label><button type="submit" style="grid-column:1/-1;border:0;border-radius:13px;padding:16px 20px;background:'+c.accent+';color:#fff;font-weight:800;font-size:16px;cursor:pointer">Fortsæt til e-mail og send forespørgsel →</button><p id="pw-booking-note" role="status" style="grid-column:1/-1;color:'+muted+';font-size:13px;margin:0">Bemærk: Din tid er først reserveret, når virksomheden har bekræftet den.</p></form></div><p style="text-align:center;color:'+muted+';font-size:12px;margin:18px 0">Bookingforespørgsel til '+esc(c.title)+'</p></div></main><style>@media(max-width:560px){#pw-booking form{grid-template-columns:1fr}#pw-booking label,#pw-booking button,#pw-booking-note{grid-column:1!important}}</style>';
  document.getElementById('pw-booking').addEventListener('submit',async function(e){e.preventDefault();const form=this,button=form.querySelector('button[type="submit"]'),note=document.getElementById('pw-booking-note'),d=Object.fromEntries(new FormData(form).entries());if(button.disabled)return;button.disabled=true;button.textContent='Sender bookingforespørgsel…';note.textContent='Gemmer din forespørgsel sikkert…';try{await submitBooking(d);form.reset();note.textContent='Tak! Din bookingforespørgsel er modtaget. Virksomheden vender tilbage for at bekræfte tidspunktet.';button.textContent='Forespørgsel sendt ✓';}catch(err){note.textContent=(err&&err.message)||'Vi kunne ikke gemme forespørgslen. Prøv igen eller kontakt virksomheden direkte.';button.disabled=false;button.textContent='Send bookingforespørgsel →';}});
  }
  document.addEventListener('submit',function(e){if(e.target&&e.target.id==='pw-contact-form'){e.preventDefault();const d=Object.fromEntries(new FormData(e.target).entries());if(!c.email){document.getElementById('pw-contact-note').textContent='Virksomheden har endnu ikke angivet en e-mailadresse. Brug telefon eller WhatsApp.';return}const subject='Henvendelse fra hjemmesiden – '+c.title;const body='Navn: '+d.name+'\\nE-mail: '+d.email+'\\nTelefon: '+d.phone+'\\n\\nBesked:\\n'+d.message;location.href='mailto:'+encodeURIComponent(c.email)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);document.getElementById('pw-contact-note').textContent='Din e-mailapp åbnes. Tryk Send for at sende beskeden.'}});
  window.addEventListener('hashchange',render);if(location.hash==='#booking')render();
  })();</script>`;
};
const lum=h=>{const n=parseInt(h.slice(1),16);return((n>>16&255)*299+(n>>8&255)*587+(n&255)*114)/1000};
const Renderer={html(p){
  const s=p.site;s.meta=s.meta||{};s.meta.animation=s.meta.animation&&typeof s.meta.animation==='object'?s.meta.animation:{level:'immersive',scroll:true,floatingImages:true,threeD:true,animatedText:true};const animLevel=['none','subtle','advanced','immersive'].includes(s.meta.animation.level)?s.meta.animation.level:'immersive';if(s.blocks.some(b=>b.type==='booking')){s.meta.bookingPublicKey=s.meta.bookingPublicKey||((crypto.randomUUID&&crypto.randomUUID())||('pw_'+Math.random().toString(36).slice(2)+Date.now().toString(36)));if(p.id){const all=Projects.all(),stored=all.find(x=>x.id===p.id);if(stored&&stored.site){stored.site.meta=stored.site.meta||{};stored.site.meta.bookingPublicKey=s.meta.bookingPublicKey;Projects.save(all);}}}const t=s.meta.theme||{},d=t.mode==='dark',a=/^#[0-9a-fA-F]{6}$/.test(t.accent)?t.accent:'#2540D9',bt=lum(a)>150?'#0E1320':'#fff';
  const f=t.font==='serif'?'Georgia,"Times New Roman",serif':'system-ui,-apple-system,"Segoe UI",sans-serif';
  const bg=/^#[0-9a-fA-F]{6}$/.test(t.background)?t.background:(d?'#0E1320':'#fff');
  const bgStyle=typeof t.backgroundStyle==='string'&&/^(linear|radial)-gradient\([#a-zA-Z0-9.% ,()-]+\)$/.test(t.backgroundStyle)?t.backgroundStyle:bg;
  const fg=/^#[0-9a-fA-F]{6}$/.test(t.text)?t.text:(d?'#E8ECF5':'#101828');
  const sf=/^#[0-9a-fA-F]{6}$/.test(t.surface)?t.surface:(d?'#171E30':'#F5F7FB');
  const mu=lum(fg)>150?'#F0F2F5':'#4B5565',ln=lum(bg)>150?'#D7DCE3':'#FFFFFF30';
  const hasBooking=s.blocks.some(b=>b.type==='booking');
  const serviceIndex=s.blocks.findIndex(b=>['services','features'].includes(b.type));
  const serviceTarget=serviceIndex>=0?'#section-'+s.blocks[serviceIndex].type+'-'+serviceIndex:'#kontakt';
  const body=s.blocks.map((b,i)=>{const block={...b};block.servicesHref=serviceTarget;if(['hero','cta'].includes(block.type)&&/book|bestil|tid/i.test(String(block.cta||''))&&hasBooking)block.actionHref='#booking';const html=(B[block.type]||(()=>''))(block);const anchor=block.type==='contact'?'kontakt':'section-'+block.type+'-'+i;return html.replace('<section','<section id="'+anchor+'"')}).join('');
  const pageViews=(Array.isArray(s.pages)?s.pages:[]).slice(0,8).map(page=>{
    const slug=String(page.slug||'').toLowerCase().replace(/[^a-z0-9-]/g,'');
    if(!slug||!Array.isArray(page.blocks))return '';
    const content=page.blocks.map((b,i)=>{const block={...b};const html=(B[block.type]||(()=>''))(block);return html.replace('<section','<section id="page-'+slug+'-'+i+'"')}).join('');
    return '<main class="pw-page-view" data-page="'+esc(slug)+'" hidden><div class="pw-page-heading"><a class="pw-back-link" href="#top">← '+(s.meta.language==='en'?'Back to home':'Tilbage til forsiden')+'</a><h1>'+esc(page.title||slug)+'</h1></div>'+content+'</main>';
  }).join('');
  const pageLinks=(Array.isArray(s.pages)?s.pages:[]).slice(0,8).map(page=>'<a href="#page/'+esc(String(page.slug||'').toLowerCase().replace(/[^a-z0-9-]/g,''))+'">'+esc(page.title||page.slug)+'</a>').join('');

  const links=s.blocks.filter(b=>['services','pricing','team','about','features','gallery','contact','faq','reviews','map'].includes(b.type)).map(b=>'<a href="#'+(b.type==='contact'?'kontakt':'section-'+b.type+'-'+s.blocks.indexOf(b))+'">'+esc(BT[b.type]||b.type)+'</a>').join('')+pageLinks;
  const nav=links?'<button class="pw-menu-toggle" type="button" aria-label="Åbn menu" aria-expanded="false" aria-controls="pw-site-nav"><span></span><span></span><span></span></button><nav id="pw-site-nav" aria-label="Hovedmenu">'+links+'<a class="nav-cta" href="#kontakt">Kontakt os</a></nav>':'';
  const red=!!t.background&&/^#(?:D12C3F|B82032|7A1F3D)$/i.test(t.background);
  const hero=s.blocks.find(b=>b.type==='hero')||{},about=s.blocks.find(b=>b.type==='about')||{},contact=s.blocks.find(b=>b.type==='contact')||{};
  const metaDesc=String(hero.text||about.text||('Læs mere om '+(s.meta.title||p.name)+'. Se vores ydelser og kontakt os.')).replace(/\s+/g,' ').trim().slice(0,300);
  const canonicalHost=String(p.domain||'').trim().replace(/^https?:\/\//i,'').replace(/\/.*$/,'').toLowerCase();
  const canonicalUrl=/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(canonicalHost)?'https://'+canonicalHost+'/':'';
  const businessSchema={ '@context':'https://schema.org','@type':'LocalBusiness',name:String(s.meta.title||p.name),description:metaDesc,...(contact.phone?{telephone:contact.phone}:{}),...(contact.email?{email:contact.email}:{})};
  const pageLang=/^(da|en|es|de|fr)$/i.test(String(s.meta.language||""))?String(s.meta.language).toLowerCase():"da";
  return `<!DOCTYPE html><html lang="${pageLang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(metaDesc)}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(s.meta.title||p.name)}"><meta property="og:description" content="${esc(metaDesc)}"><meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="${a}">${canonicalUrl?`<link rel="canonical" href="${canonicalUrl}">`:``}<script type="application/ld+json">${JSON.stringify(businessSchema).replace(/</g,'\\u003c')}</script><title>${esc(s.meta.title||p.name)}</title><style>
  *{box-sizing:border-box}.pw-page-view{min-height:70vh}.pw-page-heading{max-width:1100px;margin:0 auto;padding:2rem clamp(1rem,4vw,3rem) 0}.pw-back-link{display:inline-block;color:inherit;text-decoration:none;font-weight:750;margin-bottom:1rem}.pw-page-view[hidden]{display:none!important}html{scroll-behavior:smooth}body{margin:0;font-family:${f};background:${bgStyle};background-attachment:fixed;color:${fg};line-height:1.7}
  .pw-motion-none .pw-reveal,.pw-motion-none .pw-text-reveal{opacity:1!important;transform:none!important;filter:none!important}.pw-reveal{opacity:0;transform:translate3d(0,28px,0);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1)}.pw-reveal.pw-visible{opacity:1;transform:none}.pw-text-reveal{opacity:0;transform:translateY(18px);filter:blur(5px);transition:opacity .75s ease,transform .75s ease,filter .75s ease}.pw-text-reveal.pw-visible{opacity:1;transform:none;filter:none}.pw-motion-subtle .pw-reveal{transition-duration:.45s}.pw-motion-immersive .hero-section{position:relative;isolation:isolate;overflow:hidden}.pw-motion-immersive .hero-section:after{content:"";position:absolute;z-index:-1;width:clamp(180px,34vw,420px);aspect-ratio:1;right:-8%;top:5%;border-radius:50%;border:1px solid currentColor;opacity:.14;box-shadow:0 0 0 24px #ffffff08,0 0 0 58px #ffffff06,0 0 0 100px #ffffff04;animation:pw-orbit 18s linear infinite}.pw-motion-immersive img{transition:transform .8s cubic-bezier(.2,.7,.2,1),filter .8s ease;will-change:transform}.pw-motion-immersive img:hover{transform:perspective(900px) rotateY(-5deg) rotateX(3deg) translateY(-5px);filter:drop-shadow(0 18px 22px #00000020)}.pw-motion-immersive .card,.pw-motion-immersive article{transform-style:preserve-3d;transition:transform .35s ease,box-shadow .35s ease}.pw-motion-immersive .card:hover,.pw-motion-immersive article:hover{transform:perspective(1000px) rotateX(1.5deg) rotateY(-1.5deg) translateY(-3px);box-shadow:0 22px 48px #00000018}.pw-motion-immersive .hero-section{background-image:radial-gradient(ellipse at 90% 10%,#ffffff20,transparent 42%)}@keyframes pw-orbit{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}.pw-reveal,.pw-text-reveal{opacity:1!important;transform:none!important;filter:none!important}}
  header{position:relative;top:auto;z-index:10;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem clamp(1rem,4vw,3rem);font-weight:800;background:${bg};border-bottom:1px solid ${ln}}.pw-menu-toggle{display:none;align-items:center;justify-content:center;flex-direction:column;gap:5px;width:44px;height:44px;padding:10px;border:1px solid ${ln};border-radius:12px;background:${sf};color:${fg};cursor:pointer}.pw-menu-toggle span{display:block;width:20px;height:2px;border-radius:2px;background:currentColor;transition:transform .2s,opacity .2s}.pw-menu-toggle[aria-expanded=true] span:first-child{transform:translateY(7px) rotate(45deg)}.pw-menu-toggle[aria-expanded=true] span:nth-child(2){opacity:0}.pw-menu-toggle[aria-expanded=true] span:last-child{transform:translateY(-7px) rotate(-45deg)}
  header .brand{color:${fg};font-weight:850;text-decoration:none;font-size:1.05rem;white-space:nowrap}header nav{display:flex;flex-wrap:wrap;align-items:center;gap:.55rem}header nav a{font-size:.88rem;text-decoration:none;font-weight:700;padding:.45rem .8rem;border-radius:999px;color:${fg};transition:background .2s}header nav a:hover{background:${sf}}header nav a.nav-cta{background:${a};color:${bt};padding:.65rem 1rem}.actions{display:flex;flex-wrap:wrap;gap:.8rem;align-items:center;margin-top:1.25rem}.btn.secondary{background:transparent;color:${fg};border:1px solid ${ln};box-shadow:none}.text-link{display:inline-flex;gap:.4rem;margin-top:.8rem;font-weight:800;text-decoration:none}.footer-links{display:flex;justify-content:center;gap:1.2rem;margin:.8rem 0}footer a{color:${fg};text-decoration:none;font-weight:700}footer small{opacity:.7}.contact-form{display:grid;gap:.9rem;max-width:680px;margin:2rem auto 0;padding:clamp(1rem,4vw,2rem);border:1px solid ${ln};border-radius:20px;background:${sf}B8}.contact-form label{display:grid;gap:.35rem;font-weight:700}.contact-form input,.contact-form textarea{width:100%;padding:.9rem 1rem;border:1px solid ${ln};border-radius:10px;background:${bg};color:${fg};font:inherit}.form-note{font-size:.85rem}.stars{color:#D49A22;letter-spacing:.12em}.review p{font-style:italic}.mobile-actions{display:none}.wa-float{position:fixed;right:22px;bottom:22px;z-index:8;padding:.85rem 1.1rem;border-radius:999px;background:#168B55;color:#fff;text-decoration:none;font-weight:800;box-shadow:0 8px 28px #0004}
  section{position:relative;isolation:isolate;padding:clamp(3.5rem,8vw,7rem) clamp(1.2rem,5vw,4rem);max-width:1200px;margin:0 auto}section:nth-of-type(even){background:linear-gradient(135deg,${sf}E8,${bg}C9);border:1px solid ${ln};border-radius:${t.radius==='large'?'30px':'22px'};margin-top:1.4rem;margin-bottom:1.4rem;box-shadow:0 24px 70px #0000000A}
  h1{font-size:clamp(2.7rem,7vw,5.5rem);line-height:1.01;letter-spacing:-.055em;margin:0 0 1.35rem;font-weight:850}h2{font-size:clamp(1.9rem,3.6vw,3rem);line-height:1.08;letter-spacing:-.04em;margin:0 0 1.6rem;font-weight:800}
  h3{line-height:1.25}p{color:${mu};max-width:68ch}.btn{display:inline-block;background:${a};color:${bt};padding:1rem 1.7rem;border-radius:${t.radius==='large'?'22px':'13px'};text-decoration:none;font-weight:800;box-shadow:0 12px 28px #00000020;transition:transform .2s,box-shadow .2s}.btn:hover{transform:translateY(-2px);box-shadow:0 16px 34px #00000028}
  .g{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1.25rem}.c{background:linear-gradient(145deg,${sf},${sf}E8);color:${fg};border:1px solid ${ln};border-radius:${t.radius==='large'?'26px':'18px'};padding:1.7rem;box-shadow:0 16px 38px #0000000D;transition:transform .22s,box-shadow .22s,border-color .22s}.c:hover{transform:translateY(-4px);box-shadow:0 20px 42px #00000016}
  a{color:${a}}footer{padding:2rem;text-align:center;color:${fg};background:${sf};border-top:1px solid ${ln}}
  .hero.two{position:relative;isolation:isolate;display:flex;align-items:center;min-height:clamp(430px,62vw,680px);overflow:hidden;border-radius:var(--radius,24px);background:#101827}.hero.two>figure{position:absolute;inset:0;width:100%;height:100%;margin:0;z-index:-1}.hero.two>figure:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,15,28,.88),rgba(8,15,28,.48) 58%,rgba(8,15,28,.18))}.hero.two>figure img{width:100%;height:100%;object-fit:cover;object-position:center}.hero.two>div{position:relative;z-index:1;max-width:760px;padding:clamp(2rem,6vw,5.5rem);color:#fff}.hero.two h1,.hero.two p{color:#fff}.hero.two h1{font-size:clamp(2.5rem,5vw,5rem);line-height:1.02;max-width:14ch}.hero.two p{font-size:clamp(1rem,1.6vw,1.2rem);max-width:62ch}.hero.two .btn.secondary{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.55);color:#fff}.hero.two figcaption{position:absolute;right:1rem;bottom:.6rem;z-index:2;color:#fff;font-size:.68rem;opacity:.85}.hero.two figcaption a{color:#fff}@media(max-width:700px){.hero.two{min-height:540px}.hero.two>div{padding:2rem 1.3rem}.hero.two h1{font-size:clamp(2.2rem,10vw,3.4rem)}}.hero{position:relative;isolation:isolate;overflow:hidden;min-height:440px;display:flex;align-items:center;border:1px solid ${ln};border-radius:${t.radius==='large'?'34px':'24px'};margin-top:2rem;margin-bottom:2rem;background:radial-gradient(circle at 84% 18%,${a}30,transparent 34%),radial-gradient(circle at 12% 92%,${a}20,transparent 38%),linear-gradient(135deg,${sf},${bg});box-shadow:0 28px 90px #00000014}.hero:before{content:"";position:absolute;z-index:-1;width:340px;height:340px;border-radius:50%;right:-70px;top:-100px;background:${a}22;filter:blur(2px)}.hero:after{content:"";position:absolute;z-index:-1;width:220px;height:220px;border-radius:50%;right:22%;bottom:-130px;background:${a}18;filter:blur(4px)}.hero p{font-size:1.18rem;max-width:58ch}
  .hero.two,.ab.two{display:grid;grid-template-columns:1.05fr .95fr;gap:3rem;align-items:center}
  .hero img,.ab img{width:100%;border-radius:22px;object-fit:cover;aspect-ratio:4/3}
  .gal{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem}.gal img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:16px}
  details.c{margin-bottom:.7rem}summary{cursor:pointer;font-weight:700}
  ${red?'header,footer{background:'+bg+'}header nav a{color:'+fg+'} .btn{background:#FFFFFF;color:#8F1D2B} .c{background:'+sf+'}':''}
    .pw-3d-section{display:grid;grid-template-columns:minmax(0,.9fr) minmax(280px,1.1fr);align-items:center;gap:clamp(1.5rem,4vw,3.5rem);max-width:1200px}.pw-3d-copy{min-width:0}.pw-3d-kicker{display:inline-flex;align-items:center;font-size:.72rem;font-weight:850;letter-spacing:.16em;color:${a};margin-bottom:1rem}.pw-three-scene{position:relative;isolation:isolate;min-width:0;width:100%;height:clamp(280px,36vw,440px);min-height:280px;overflow:hidden;border:1px solid ${ln};border-radius:28px;background:radial-gradient(circle at 50% 42%,${a}28,transparent 58%),linear-gradient(145deg,${sf},${bg});box-shadow:0 28px 80px #00000018;touch-action:pan-y}.pw-three-scene canvas{position:absolute;inset:0;display:block;width:100%;height:100%;outline:none;pointer-events:auto;cursor:grab}.pw-three-scene:active canvas{cursor:grabbing}.pw-three-controls{position:absolute;z-index:2;right:12px;bottom:12px;display:flex;align-items:center;gap:6px;padding:6px;border:1px solid #FFFFFF35;border-radius:14px;background:#111827B8;backdrop-filter:blur(12px)}.pw-three-controls button{min-width:34px;min-height:34px;padding:0 9px;border:1px solid #FFFFFF35;border-radius:9px;background:#FFFFFF18;color:#fff;font:700 14px system-ui;cursor:pointer}.pw-three-controls button[aria-pressed=true]{background:${a};color:${bt}}.pw-three-fallback{position:absolute;inset:8%;display:grid;place-items:center;background:none;filter:none;pointer-events:none;color:${a};opacity:.82}.pw-three-fallback svg{width:88%;height:88%;max-height:340px;overflow:visible;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round}.pw-three-ready .pw-three-fallback{display:none}.pw-three-fallback-only .pw-three-fallback{display:grid}@media(max-width:700px){.pw-3d-section{grid-template-columns:1fr;gap:1rem}.pw-three-scene{height:300px;min-height:300px}}
@media(max-width:900px){header{position:relative;top:auto;align-items:center;flex-direction:row;flex-wrap:wrap;gap:.5rem;padding:.9rem 1rem}.pw-menu-toggle{display:flex;margin-left:auto}header nav{display:none;flex:0 0 100%;width:100%;flex-direction:column;align-items:stretch;gap:.25rem;padding:.5rem 0 0;overflow:visible}header nav.is-open{display:flex}header nav a{display:block;padding:.65rem .75rem;font-size:.9rem;white-space:normal;border-radius:9px}.actions{align-items:stretch}.actions .btn{width:100%}.mobile-actions{position:fixed;display:flex;left:0;right:0;bottom:0;z-index:9;gap:.5rem;padding:.65rem;background:${sf}F2;border-top:1px solid ${ln};backdrop-filter:blur(16px)}.mobile-actions a{flex:1;text-align:center;padding:.75rem .4rem;border-radius:12px;background:${a};color:${bt};font-weight:800;text-decoration:none}.wa-float{right:14px;bottom:84px}.contact-form{margin-bottom:2rem}.hero.two,.ab.two{grid-template-columns:1fr;gap:1.5rem}.hero{min-height:0}section{padding:3rem 1.2rem}section:nth-of-type(even){border-radius:18px;margin-top:.8rem;margin-bottom:.8rem}.g{grid-template-columns:1fr}.gal{grid-template-columns:repeat(2,minmax(0,1fr))}.btn{min-height:46px;display:inline-flex;align-items:center;justify-content:center}}@media(max-width:380px){h1{font-size:clamp(2.15rem,12vw,3rem)}header nav a{font-size:.76rem;padding:.35rem .45rem}.gal{grid-template-columns:1fr}}
  </style></head><body class="pw-motion-${animLevel}"><header id="top"><a class="brand" href="#top">${esc(s.meta.title)}</a>${nav}</header><main id="pw-home">${body}</main>${pageViews}<footer><strong>${esc(s.meta.title)}</strong><div class="footer-links"><a href="#kontakt">Kontakt</a><a href="#top">Til toppen ↑</a></div><small>© ${new Date().getFullYear()} ${esc(s.meta.title)}</small>${s.blocks.some(b=>b&&b.modelProvider==='Poly Haven')?'<small>3D assets powered by Poly Haven</small>':''}</footer>${contact.phone?`<div class="mobile-actions"><a href="tel:${esc(String(contact.phone).replace(/[^+\\d]/g,''))}">Ring</a>${hasBooking?`<a href="#booking">Book tid</a>`:''}${contact.whatsapp?`<a href="https://wa.me/${esc(String(contact.whatsapp).replace(/\\D/g,''))}" target="_blank" rel="noopener">WhatsApp</a>`:''}</div>`:''}${contact.whatsapp?`<a class="wa-float" href="https://wa.me/${esc(String(contact.whatsapp).replace(/\\D/g,''))}" target="_blank" rel="noopener" aria-label="Skriv på WhatsApp">WhatsApp ↗</a>`:''}<script>(function(){const home=document.getElementById('pw-home');const views=[...document.querySelectorAll('.pw-page-view')];const menuBtn=document.querySelector('.pw-menu-toggle'),siteNav=document.getElementById('pw-site-nav');if(menuBtn&&siteNav){menuBtn.addEventListener('click',()=>{const open=menuBtn.getAttribute('aria-expanded')!=='true';menuBtn.setAttribute('aria-expanded',String(open));menuBtn.setAttribute('aria-label',open?'Luk menu':'Åbn menu');siteNav.classList.toggle('is-open',open)});siteNav.addEventListener('click',e=>{if(e.target.closest('a')){menuBtn.setAttribute('aria-expanded','false');menuBtn.setAttribute('aria-label','Åbn menu');siteNav.classList.remove('is-open')}})}function route(){const m=location.hash.match(/^#page\\/([a-z0-9-]+)/i);const slug=m&&m[1];if(!home)return;if(slug){home.hidden=true;views.forEach(v=>v.hidden=v.dataset.page!==slug);const active=views.find(v=>v.dataset.page===slug);if(active){const h=active.querySelector('.pw-page-heading h1');document.title=(h?h.textContent:'')+' · '+${JSON.stringify(String(s.meta.title||p.name))};window.scrollTo(0,0)}else{home.hidden=false;views.forEach(v=>v.hidden=true)}}else if(location.hash!=='#booking'){home.hidden=false;views.forEach(v=>v.hidden=true)}}window.addEventListener('hashchange',route);route()})();</script><script>(function(){const level='${animLevel}';if(level==='none'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const roots=[...document.querySelectorAll('main#pw-home > section, .pw-page-view section')];roots.forEach((el,i)=>{el.classList.add('pw-reveal');el.style.transitionDelay=Math.min(i*70,350)+'ms'});document.querySelectorAll('h1,h2').forEach((el,i)=>{el.classList.add('pw-text-reveal');el.style.transitionDelay=Math.min(i*45,250)+'ms'});const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('pw-visible');io.unobserve(entry.target)}}),{threshold:.12,rootMargin:'0px 0px -35px 0px'});document.querySelectorAll('.pw-reveal,.pw-text-reveal').forEach(el=>io.observe(el));if(level==='immersive'&&window.matchMedia('(pointer:fine)').matches){document.querySelectorAll('.pw-motion-immersive .card,.pw-motion-immersive article').forEach(el=>{el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;el.style.transform='perspective(1000px) rotateX('+(-y*3)+'deg) rotateY('+(x*3)+'deg) translateY(-3px)'});el.addEventListener('pointerleave',()=>{el.style.transform=''})})}})();</script><script type="module">(async()=>{
const hosts=[...document.querySelectorAll('[data-pw-three]')].filter(h=>!h.dataset.modelSrc);
if(!hosts.length)return;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let T;
try{try{T=await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js')}catch(e){T=await import('https://unpkg.com/three@0.170.0/build/three.module.js')}}catch(e){hosts.forEach(h=>{h.classList.add('pw-three-fallback-only');h.dataset.pwThreeStatus='library-load-failed'});return}
const {Scene,PerspectiveCamera,WebGLRenderer,Mesh,MeshStandardMaterial,MeshPhysicalMaterial,AmbientLight,HemisphereLight,DirectionalLight,Group,TorusGeometry,SphereGeometry,BoxGeometry,CylinderGeometry,ConeGeometry,LatheGeometry,Vector2,Shape,ExtrudeGeometry,MathUtils}=T;
hosts.forEach(host=>{
 let renderer,ro,io,raf=0;
 try{
  const scene=new Scene(),camera=new PerspectiveCamera(34,1,.1,100);camera.position.set(0,.15,6.1);
  renderer=new WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));renderer.setSize(host.clientWidth||440,host.clientHeight||330);renderer.setClearColor(0x000000,0);
  if('outputColorSpace'in renderer)renderer.outputColorSpace=T.SRGBColorSpace;
  if('toneMapping'in renderer){renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12}
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;host.appendChild(renderer.domElement);
  const root=new Group();scene.add(root);
  const mats={
   paint:new MeshPhysicalMaterial({color:host.dataset.color||'#B78A52',metalness:.48,roughness:.24,clearcoat:.9,clearcoatRoughness:.16}),
   leather:new MeshPhysicalMaterial({color:'#242832',roughness:.56,metalness:.04,clearcoat:.18}),
   seam:new MeshStandardMaterial({color:'#777E89',roughness:.78}),
   rubber:new MeshStandardMaterial({color:'#171A20',roughness:.86}),
   metal:new MeshStandardMaterial({color:'#AEB8C6',metalness:.9,roughness:.22}),
   chrome:new MeshPhysicalMaterial({color:'#DCE4EF',metalness:1,roughness:.13,clearcoat:1}),
   dark:new MeshStandardMaterial({color:'#252B35',metalness:.55,roughness:.38}),
   glass:new MeshPhysicalMaterial({color:'#8DB7D5',metalness:.28,roughness:.12,transmission:.08,transparent:true,opacity:.78}),
   red:new MeshStandardMaterial({color:'#B92F42',metalness:.32,roughness:.3}),
   white:new MeshStandardMaterial({color:'#F2F3F5',roughness:.42}),
   accent:new MeshStandardMaterial({color:host.dataset.color||'#B78A52',metalness:.35,roughness:.32})
  };
  const add=(g,m,x=0,y=0,z=0,rx=0,ry=0,rz=0,parent=root)=>{const o=new Mesh(g,m);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o};
  const box=(w,h,d,m,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>add(new BoxGeometry(w,h,d,2,2,2),m,x,y,z,rx,ry,rz);
  const cyl=(rt,rb,h,m,x=0,y=0,z=0,segments=48,rx=0,ry=0,rz=0)=>add(new CylinderGeometry(rt,rb,h,segments),m,x,y,z,rx,ry,rz);
  const torus=(r,t,m,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>add(new TorusGeometry(r,t,16,64),m,x,y,z,rx,ry,rz);
  const shape=host.dataset.shape||'orb';
  const makeChair=()=>{
   const metal=mats.chrome,leather=mats.leather;
   // Wide five-star castor base and hydraulic lift
   cyl(.18,.2,.28,mats.dark,0,-1.12,0,40);
   cyl(.105,.13,.55,metal,0,-.78,0,32);
   cyl(.25,.19,.12,mats.dark,0,-.48,0,40);
   for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const x=Math.cos(a)*.58,z=Math.sin(a)*.58;box(.72,.075,.11,metal,x,-1.12,z,0,-a,0);cyl(.105,.105,.09,mats.rubber,x,-1.19,z,24,Math.PI/2)}
   // Seat cushion and thick backrest
   box(1.42,.25,1.02,leather,0,-.25,.02,-.04,0,0);
   box(1.3,.11,.92,mats.seam,0,-.39,.02);
   box(1.34,1.22,.25,leather,0,.42,-.42,-.13,0,0);
   box(1.2,1.08,.08,mats.dark,0,.43,-.275,-.13);
   // Headrest and chrome support
   box(.58,.38,.19,leather,0,1.13,-.39,-.13);
   cyl(.045,.045,.38,metal,0,.93,-.37,20);
   // Arm rests, supports and foot rest
   for(const side of [-1,1]){
    const x=side*.78;
    cyl(.045,.045,.62,metal,x,.03,-.02,20,0,0,Math.PI/2);
    box(.16,.12,.9,leather,x,.39,.02);
    cyl(.055,.055,.48,metal,side*.61,-.08,-.12,20,0,0,Math.PI/2);
   }
   box(1.1,.12,.24,metal,0,-.58,.48);
   box(1.18,.13,.32,mats.dark,0,-.52,.49);
   // Visible upholstery piping
   for(const z of [-.43,.47])torus(.12,.018,mats.seam,0,-.12,z,Math.PI/2);
  };
  const makeCar=()=>{
   // Sculpted side profile extruded across vehicle width
   const profile=new Shape();profile.moveTo(-1.48,-.2);profile.lineTo(-1.42,.05);profile.quadraticCurveTo(-1.32,.3,-.98,.34);profile.lineTo(-.55,.78);profile.quadraticCurveTo(-.35,.94,.02,.94);profile.lineTo(.65,.9);profile.quadraticCurveTo(.88,.85,1.02,.58);profile.lineTo(1.35,.42);profile.quadraticCurveTo(1.48,.35,1.5,.12);profile.lineTo(1.46,-.2);profile.closePath();
   const body=add(new ExtrudeGeometry(profile,{depth:1.12,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:.075,bevelThickness:.07}),mats.paint,0,0,-.56);body.geometry.computeVertexNormals();
   // Roof / cabin glass
   const cabin=new Shape();cabin.moveTo(-.72,.43);cabin.lineTo(-.42,.78);cabin.quadraticCurveTo(-.3,.85,-.05,.85);cabin.lineTo(.53,.81);cabin.quadraticCurveTo(.68,.78,.8,.48);cabin.closePath();
   add(new ExtrudeGeometry(cabin,{depth:.91,bevelEnabled:true,bevelSegments:3,bevelSize:.025,bevelThickness:.025}),mats.dark,0,0,-.455);
   box(.04,.36,.86,mats.glass,-.08,.64,0,0,0,.04);
   box(.04,.34,.86,mats.glass,.49,.63,0,0,0,-.08);
   // wheels with layered sidewalls, alloy hubs and spokes
   for(const x of [-.91, .96])for(const z of [-.61,.61]){
    torus(.31,.115,mats.rubber,x,-.26,z,Math.PI/2);
    torus(.225,.025,mats.seam,x,-.26,z*1.015,Math.PI/2);
    cyl(.205,.205,.105,mats.chrome,x,-.26,z,48,Math.PI/2);
    cyl(.155,.155,.115,mats.dark,x,-.26,z*1.04,40,Math.PI/2);
    for(let k=0;k<10;k++){const a=k*Math.PI/5;box(.045,.29,.045,mats.chrome,x+Math.cos(a)*.1,-.26+Math.sin(a)*.1,z*1.055,0,0,a)}
    cyl(.07,.07,.13,mats.chrome,x,-.26,z*1.08,32,Math.PI/2);
   }
   // lights, grille, mirrors and bumpers
   box(.42,.14,.035,mats.dark,1.43,.08,0);
   for(const z of [-.37,.37]){box(.2,.13,.045,mats.white,1.48,.2,z);box(.18,.1,.05,mats.red,-1.49,.05,z);box(.13,.1,.12,mats.paint,.12,.53,z*1.05)}
   box(.18,.08,1.12,mats.chrome,1.48,-.18,0);
   box(.16,.07,1.12,mats.dark,-1.48,-.2,0);
   // side door lines and handles
   for(const z of [-.575,.575]){box(.012,.38,.012,mats.dark,-.25,-.02,z);box(.12,.025,.025,mats.chrome,.12,.18,z)}
  };
  const makeWheel=()=>{
   torus(.92,.24,mats.rubber);
   torus(.91,.025,mats.seam,0,0,.02);
   cyl(.65,.65,.24,mats.chrome,0,0,0,64,Math.PI/2);
   cyl(.56,.56,.26,mats.dark,0,0,.02,64,Math.PI/2);
   torus(.47,.035,mats.chrome,0,0,.17);
   for(let i=0;i<10;i++){const a=i*Math.PI/5;const spoke=box(.075,.72,.075,mats.chrome,Math.cos(a)*.25,Math.sin(a)*.25,.18,0,0,a);spoke.scale.y=.72}
   cyl(.22,.22,.3,mats.chrome,0,0,.2,48,Math.PI/2);
   cyl(.12,.12,.31,mats.dark,0,0,.22,40,Math.PI/2);
   // tread blocks around circumference
   for(let i=0;i<36;i++){const a=i*Math.PI*2/36;box(.12,.08,.38,mats.dark,Math.cos(a)*1.13,Math.sin(a)*1.13,0,0,0,a)}
  };
  const makeEngine=()=>{
   box(1.5,1.08,.92,mats.dark);
   box(1.18,.16,.98,mats.chrome,0,.58,0);
   for(let i=0;i<4;i++){const x=-.48+i*.32;cyl(.14,.14,.55,mats.chrome,x,.86,0,28);cyl(.18,.18,.12,mats.red,x,1.2,0,28);box(.18,.08,.16,mats.dark,x,1.31,0)}
   torus(.52,.075,mats.chrome,0,-.08,.51);
   cyl(.22,.22,.2,mats.dark,0,-.08,.53,40,Math.PI/2);
   for(let i=0;i<5;i++)box(.08,.62,.07,mats.chrome,-.78+i*.39,-.05,-.51);
   // hoses, pulleys and belt
   torus(.25,.045,mats.rubber,.52,-.55,.2,Math.PI/2);
   cyl(.2,.2,.13,mats.chrome,.52,-.55,.2,32,Math.PI/2);
   for(let i=0;i<3;i++)torus(.12+i*.09,.025,mats.rubber,-.55+i*.13,-.7,.15,Math.PI/2);
  };
  const makePole=()=>{cyl(.3,.3,2.15,mats.white);for(let i=0;i<9;i++){const y=-.88+i*.22;torus(.305,.055,i%2?mats.red:new MeshStandardMaterial({color:'#3268D8',metalness:.25,roughness:.35}),0,y,0,Math.PI/2)}cyl(.36,.36,.14,mats.chrome,0,1.14,0);cyl(.36,.36,.14,mats.chrome,0,-1.14,0)}
  const makeBottle=()=>{const pts=[new Vector2(0,-.95),new Vector2(.32,-.95),new Vector2(.48,-.82),new Vector2(.49,.55),new Vector2(.42,.72),new Vector2(.2,.78),new Vector2(.18,1.04),new Vector2(.25,1.08),new Vector2(.25,1.2),new Vector2(.0,1.2)];add(new LatheGeometry(pts,64),mats.paint);cyl(.23,.23,.12,mats.chrome,0,1.19,0,40);box(.48,.42,.025,mats.white,0,-.08,.465);box(.22,.08,.035,mats.accent,0,.02,.49)}
  const makeScissors=()=>{for(const x of [-.26,.26]){torus(.22,.065,mats.chrome,x,-.73,.04);torus(.14,.018,mats.dark,x,-.73,.1)}const blade=(x,rz)=>{const sh=new Shape();sh.moveTo(-.07,-.38);sh.lineTo(.07,-.38);sh.quadraticCurveTo(.12,.38,0,1.02);sh.quadraticCurveTo(-.1,.35,-.07,-.38);sh.closePath();add(new ExtrudeGeometry(sh,{depth:.035,bevelEnabled:true,bevelSegments:2,bevelSize:.018,bevelThickness:.018}),mats.chrome,x,0,.02,0,0,rz)};blade(-.12,-.13);blade(.12,.13);cyl(.09,.09,.12,mats.red,0,-.5,.09,32,Math.PI/2)};
  const makePaintRoller=()=>{cyl(.045,.045,1.22,mats.chrome,-.12,-.18,0,24,0,0,-.12);cyl(.065,.065,.28,mats.dark,-.2,-.79,0,24);cyl(.18,.18,.62,mats.white,.38,.52,0,48,0,0,Math.PI/2);torus(.18,.025,mats.seam,.38,.52,-.31,Math.PI/2);torus(.18,.025,mats.seam,.38,.52,.31,Math.PI/2);cyl(.035,.035,.58,mats.chrome,.38,.52,0,20,Math.PI/2);box(.12,.12,.14,mats.dark,.02,-.72,0)};
  const makePaintBucket=()=>{cyl(.62,.48,1.05,mats.red,0,-.38,0,48);cyl(.63,.63,.09,mats.chrome,0,.17,0,48);cyl(.51,.51,.05,mats.white,0,.2,0,48);torus(.62,.035,mats.chrome,0,.16,0);for(const x of [-.52,.52])cyl(.035,.035,.54,mats.chrome,x,.48,0,16,0,0,Math.PI/2)};
  const makeWorkLamp=()=>{cyl(.48,.48,.13,mats.dark,0,-1.02,0,40);cyl(.12,.12,.72,mats.chrome,0,-.58,0,24);cyl(.075,.075,.62,mats.chrome,0,-.14,0,24,0,0,.3);cyl(.28,.28,.28,mats.dark,.18,.22,0,32,0,0,Math.PI/2);const shade=new ConeGeometry(.42,.58,48,1,true);add(shade,mats.chrome,.18,.52,0,0,0,Math.PI);cyl(.24,.24,.035,mats.white,.18,.24,.01,40,Math.PI/2);};
  const makeCeilingLamp=()=>{cyl(.28,.28,.12,mats.chrome,0,.9,0,40);cyl(.045,.045,.75,mats.chrome,0,.48,0,24);const shade=new ConeGeometry(.82,.52,56,1,true);add(shade,mats.dark,0,.05,0,0,0,Math.PI);cyl(.48,.48,.04,mats.white,0,-.18,0,48)}
  if(shape==='barber-chair')makeChair();
  else if(shape==='car')makeCar();
  else if(shape==='wheel')makeWheel();
  else if(shape==='engine')makeEngine();
  else if(shape==='barber-pole')makePole();
  else if(shape==='shampoo-bottle')makeBottle();
  else if(shape==='scissors')makeScissors();
  else if(shape==='paint-roller')makePaintRoller();
  else if(shape==='paint-bucket')makePaintBucket();
  else if(shape==='work-lamp')makeWorkLamp();
  else if(shape==='ceiling-lamp')makeCeilingLamp();
  else if(shape==='torus'){torus(1,.3,mats.paint);torus(.56,.06,mats.chrome,0,0,.12)}
  else if(shape==='box'){box(1.55,1.55,1.55,mats.paint);const cage=box(1.68,1.68,1.68,mats.chrome,0,0,0);cage.material=new MeshStandardMaterial({color:'#FFFFFF',wireframe:true,transparent:true,opacity:.2})}
  else if(shape==='knot')add(new T.TorusKnotGeometry(.85,.25,180,24),mats.paint);
  else add(new SphereGeometry(1.12,64,48),mats.paint);
  scene.add(new HemisphereLight(0xeaf2ff,0x31394a,1.25));
  const key=new DirectionalLight(0xffffff,3.2);key.position.set(4,6,6);key.castShadow=true;scene.add(key);
  const fill=new DirectionalLight(0x8db8ff,1.5);fill.position.set(-5,1,4);scene.add(fill);
  const rim=new DirectionalLight(0xffd5a1,2);rim.position.set(1,3,-5);scene.add(rim);
  let visible=true,frame=0,auto=true,dragging=false,lastX=0,lastY=0,pinch=0,scrollTarget=0;const pointers=new Map();
  const updateScrollPose=()=>{const r=host.getBoundingClientRect(),vh=Math.max(1,window.innerHeight||1);scrollTarget=Math.max(-1,Math.min(1,((vh-r.top)/(vh+r.height)-.5)*2));};
  updateScrollPose();window.addEventListener('scroll',updateScrollPose,{passive:true});window.addEventListener('resize',updateScrollPose,{passive:true});
  const resize=()=>{const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)};
  ro=new ResizeObserver(resize);ro.observe(host);
  const clamp=()=>{camera.position.z=Math.max(3.2,Math.min(9,camera.position.z))};
  const reset=()=>{root.rotation.set(0,0,0);camera.position.set(0,.15,6.1)};
  const draw=()=>{if(!visible||host.dataset.pwGlbLoaded==='true')return;raf=0;root.rotation.y+=(scrollTarget*.72-root.rotation.y)*.012;if(!reduced&&auto)root.rotation.y+=.0038;if(!reduced&&auto)root.rotation.x+=(scrollTarget*.13+Math.sin(frame*.006)*.025-root.rotation.x)*.025;frame++;renderer.render(scene,camera);if(!reduced)raf=requestAnimationFrame(draw)};
  io=new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible&&!raf)draw();else if(!visible&&raf){cancelAnimationFrame(raf);raf=0}});io.observe(host);
  host.style.touchAction='pan-y';host.style.cursor='grab';
  host.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;auto=false;const autoButton=host.querySelector('[data-3d-auto]');if(autoButton){autoButton.setAttribute('aria-pressed','false');autoButton.textContent='Rotation paused'}host.style.cursor='grabbing';pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});host.setPointerCapture(e.pointerId);if(pointers.size===1){dragging=true;lastX=e.clientX;lastY=e.clientY}else{dragging=false;const p=[...pointers.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}});
  const pointerEnd=e=>{pointers.delete(e.pointerId);dragging=pointers.size===1;if(dragging){const p=[...pointers.values()][0];lastX=p.x;lastY=p.y}else pinch=0};
  host.addEventListener('pointerup',e=>{pointerEnd(e);host.style.cursor='grab'});host.addEventListener('pointercancel',e=>{pointerEnd(e);host.style.cursor='grab'});
  host.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinch)camera.position.z=MathUtils.clamp(camera.position.z+(pinch-d)*.016,3.2,9);pinch=d;return}if(dragging){root.rotation.y+=(e.clientX-lastX)*.008;root.rotation.x+=(e.clientY-lastY)*.008;lastX=e.clientX;lastY=e.clientY}});
  // Let the page receive wheel/trackpad scrolling; zoom remains available through controls and touch pinch.
  host.addEventListener('dblclick',reset);
  host.querySelectorAll('[data-3d-zoom]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();camera.position.z=MathUtils.clamp(camera.position.z+(Number(btn.dataset['3dZoom'])<0 ? 0.65 : -0.65),3.2,9)}));
  const rb=host.querySelector('[data-3d-reset]');if(rb)rb.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();reset()});
  const ab=host.querySelector('[data-3d-auto]');if(ab)ab.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();auto=!auto;ab.setAttribute('aria-pressed',String(auto));ab.textContent=auto?'Auto rotation':'Rotation paused'});
  resize();draw();host.classList.add('pw-three-ready');host.dataset.pwThreeStatus='rendered';
 }catch(e){if(raf)cancelAnimationFrame(raf);if(ro)ro.disconnect();if(io)io.disconnect();if(renderer)renderer.dispose();host.classList.remove('pw-three-ready');host.classList.add('pw-three-fallback-only');host.dataset.pwThreeStatus='webgl-render-failed'}
});
})();<\/script><script type="module">(async()=>{
const hosts=[...document.querySelectorAll('[data-pw-three][data-model-src]')].filter(h=>h.dataset.modelSrc);
if(!hosts.length)return;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let THREE,GLTFLoader;
try{THREE=await import('https://esm.sh/three@0.170.0');({GLTFLoader}=await import('https://esm.sh/three@0.170.0/examples/jsm/loaders/GLTFLoader.js'))}catch(e){hosts.forEach(h=>{h.classList.add('pw-three-ready');h.dataset.pwThreeStatus='procedural-fallback'});return}
hosts.forEach(host=>{
 let renderer,ro,io,raf=0;
 try{
  const {Scene,PerspectiveCamera,WebGLRenderer,AmbientLight,HemisphereLight,DirectionalLight,Box3,Vector3,Group,MathUtils}=THREE;
  const scene=new Scene(),camera=new PerspectiveCamera(36,1,.1,1000);camera.position.set(0,.12,5.8);
  renderer=new WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));renderer.setSize(host.clientWidth||420,host.clientHeight||320);renderer.setClearColor(0x000000,0);
  if('outputColorSpace'in renderer)renderer.outputColorSpace=THREE.SRGBColorSpace;
  if('toneMapping'in renderer){renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12}
  renderer.domElement.style.visibility='hidden';
  host.appendChild(renderer.domElement);
  scene.add(new AmbientLight(0xffffff,1.1),new HemisphereLight(0xeaf2ff,0x303747,1.2));
  const key=new DirectionalLight(0xffffff,2.8);key.position.set(3,5,6);scene.add(key);
  const fill=new DirectionalLight(0x9abaff,1.35);fill.position.set(-4,-2,3);scene.add(fill);
  const rim=new DirectionalLight(0xffd6a4,1.6);rim.position.set(1,3,-5);scene.add(rim);
  const root=new Group();scene.add(root);
  const loader=new GLTFLoader(),src=host.dataset.modelSrc,comma=src.indexOf(',');
  let baseDistance=5.8,detachWheel=null,wheelHome=null,wheelOffset=0,wheelTarget=0;
  const ready=gltf=>{
   root.add(gltf.scene);
   host.dataset.pwGlbLoaded='true';
   for(const canvas of host.querySelectorAll('canvas'))if(canvas!==renderer.domElement)canvas.remove();
   renderer.domElement.style.visibility='visible';
   const bounds=new Box3().setFromObject(root),size=bounds.getSize(new Vector3()),center=bounds.getCenter(new Vector3()),max=Math.max(size.x,size.y,size.z)||1;
   root.position.sub(center);root.scale.setScalar(2.65/max);
   baseDistance=Math.max(4.2,Math.min(8.5,2.65*2.15));camera.position.set(0,.12,baseDistance);
   gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(!m)return;if(m.map)m.map.colorSpace=THREE.SRGBColorSpace;if(m.emissiveMap)m.emissiveMap.colorSpace=THREE.SRGBColorSpace;});}});
   const wheel=root.getObjectByName('Wheel_FL')||root.getObjectByName('Wheel_FR');
   if(wheel){detachWheel=wheel;wheelHome=wheel.position.clone();const controls=host.querySelector('.pw-three-controls');if(controls){const action=document.createElement('button');action.type='button';action.textContent='Afmonter hjul';action.setAttribute('aria-label','Afmonter eller monter forhjulet');action.dataset.wheelAction='1';action.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();wheelTarget=wheelTarget?0:1;action.textContent=wheelTarget?'Monter hjul':'Afmonter hjul';});controls.insertBefore(action,controls.querySelector('[data-3d-auto]')||null);}}
   host.classList.add('pw-three-ready');host.dataset.pwThreeStatus='model-rendered';
  };
  const fail=()=>{if(renderer){renderer.dispose();renderer.domElement.remove()}host.removeAttribute('data-model-src');host.classList.remove('pw-three-ready');host.classList.add('pw-three-fallback-only');host.dataset.pwThreeStatus='model-load-failed';};
  if(/^https:\/\//i.test(src)){loader.load(src,ready,undefined,fail)}else{if(comma<0)throw new Error('Invalid embedded model');const raw=atob(src.slice(comma+1)),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);if(host.dataset.modelFormat==='gltf')loader.parse(new TextDecoder().decode(bytes),'',ready,fail);else loader.parse(bytes.buffer,'',ready,fail)}
  let visible=true,auto=true,dragging=false,lastX=0,lastY=0,pinch=0,scrollTarget=0;const pointers=new Map();const updateScrollPose=()=>{const r=host.getBoundingClientRect(),vh=Math.max(1,window.innerHeight||1);scrollTarget=Math.max(-1,Math.min(1,((vh-r.top)/(vh+r.height)-.5)*2));};updateScrollPose();window.addEventListener('scroll',updateScrollPose,{passive:true});window.addEventListener('resize',updateScrollPose,{passive:true});
  const resize=()=>{const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)};
  ro=new ResizeObserver(resize);ro.observe(host);
  const reset=()=>{root.rotation.set(0,0,0);camera.position.set(0,.12,baseDistance)};
  const draw=()=>{if(!visible)return;raf=0;root.rotation.y+=(scrollTarget*.9-root.rotation.y)*.012;if(!reduced&&auto)root.rotation.y+=.0035;root.rotation.x+=(scrollTarget*.12-root.rotation.x)*.02;if(detachWheel&&wheelHome){wheelOffset+=(wheelTarget-wheelOffset)*.09;const side=Math.sign(wheelHome.x)||-1;detachWheel.position.set(wheelHome.x+side*.9*wheelOffset,wheelHome.y-.2*wheelOffset,wheelHome.z+.12*wheelOffset);}renderer.render(scene,camera);if(!reduced)raf=requestAnimationFrame(draw)};
  io=new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible&&!raf)draw();else if(!visible&&raf){cancelAnimationFrame(raf);raf=0}});io.observe(host);
  host.style.touchAction='pan-y';host.style.cursor='grab';
  host.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;auto=false;const autoButton=host.querySelector('[data-3d-auto]');if(autoButton){autoButton.setAttribute('aria-pressed','false');autoButton.textContent='Rotation paused'}host.style.cursor='grabbing';pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});host.setPointerCapture(e.pointerId);if(pointers.size===1){dragging=true;lastX=e.clientX;lastY=e.clientY}else{dragging=false;const p=[...pointers.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}});
  const end=e=>{pointers.delete(e.pointerId);dragging=pointers.size===1;if(dragging){const p=[...pointers.values()][0];lastX=p.x;lastY=p.y}else pinch=0};
  host.addEventListener('pointerup',e=>{end(e);host.style.cursor='grab'});host.addEventListener('pointercancel',e=>{end(e);host.style.cursor='grab'});
  host.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinch)camera.position.z=MathUtils.clamp(camera.position.z+(pinch-d)*.016,2.8,10);pinch=d;return}if(dragging){root.rotation.y+=(e.clientX-lastX)*.008;root.rotation.x+=(e.clientY-lastY)*.008;lastX=e.clientX;lastY=e.clientY}});
  // Do not intercept wheel/trackpad input: scrolling over the model must scroll the website.
  host.addEventListener('dblclick',reset);
  host.querySelectorAll('[data-3d-zoom]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();camera.position.z=MathUtils.clamp(camera.position.z+(Number(btn.dataset['3dZoom'])<0 ? .65 : -.65),2.8,10)}));
  const rb=host.querySelector('[data-3d-reset]');if(rb)rb.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();reset()});
  const ab=host.querySelector('[data-3d-auto]');if(ab)ab.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();auto=!auto;ab.setAttribute('aria-pressed',String(auto));ab.textContent=auto?'Auto rotation':'Rotation paused'});
  resize();draw();
 }catch(e){if(raf)cancelAnimationFrame(raf);if(ro)ro.disconnect();if(io)io.disconnect();if(renderer){renderer.dispose();renderer.domElement.remove()}host.classList.add('pw-three-ready');host.dataset.pwThreeStatus='procedural-fallback'}
});
})();<\/script></script>${bookingRuntime(s)}</body></html>`;
}};

/* ===== Lag 4: UI ===== */
let S={view:'dash',miniTab:'list',pricingPeriod:'monthly',cf:{name:'',email:'',plan:'Gratis'},out:null,outId:null,msg:'',rv:'',rc:0,cdel:null,id:Storage.get('pw.activeProject',''),device:'desktop',busy:false,err:'',del:null,fileTab:'index.html',dashSearch:'',dashFilter:'all',dashSort:'updated',renameId:null,renameValue:'',templateQuery:'',templateCategory:'Alle',form:{name:'',desc:'',style:'Moderne'}};
const getP=()=>{const all=Projects.all();let p=S.id!=null?all.find(x=>String(x.id)===String(S.id)):null;if(!p){const saved=Storage.get('pw.activeProject','');p=saved?all.find(x=>String(x.id)===String(saved)):null;if(p)S.id=p.id}if(p){S.id=p.id;Storage.set('pw.activeProject',p.id)}return p||null};
const PW_PROJECT_DIAGNOSTICS=new URLSearchParams(location.search).get('pwdiag')==='1';
function pwProjectDiag(step,details={}){
  if(!PW_PROJECT_DIAGNOSTICS)return;
  const state={time:new Date().toISOString(),step,...details};
  window.__pwProjectDiagnostics=state;
  let panel=document.getElementById('pw-project-diagnostics');
  if(!panel){
    panel=document.createElement('pre');
    panel.id='pw-project-diagnostics';
    panel.style.cssText='position:fixed;z-index:2147483647;left:8px;right:8px;bottom:8px;max-height:38vh;overflow:auto;margin:0;padding:10px;border:2px solid #f0c64b;border-radius:9px;background:#10131b;color:#fff;font:11px/1.4 ui-monospace,SFMono-Regular,monospace;white-space:pre-wrap;overflow-wrap:anywhere;box-shadow:0 4px 24px #0008;pointer-events:none';
    document.body.appendChild(panel);
  }
  panel.textContent='PRIME WEBS AI · FEJLFINDING\\n'+JSON.stringify(state,null,2);
}
function openSavedProject(id,fingerprint){
  const all=Projects.all();
  let chosen=all.find(p=>String(p.id)===String(id));
  let resolvedBy='id';
  // A stale dashboard link can outlive a cloud ID refresh. Resolve it against
  // the saved project's content fingerprint rather than failing or opening
  // an arbitrary project.
  if(!chosen&&fingerprint){
    chosen=all.find(p=>projectFingerprint(p)===String(fingerprint));
    if(chosen)resolvedBy='content-fingerprint';
  }
  pwProjectDiag('project-lookup',{requestedId:String(id),projectCount:all.length,found:!!chosen,resolvedBy:chosen?resolvedBy:null,viewBefore:S.view});
  if(!chosen){S.id=null;Storage.set('pw.activeProject','');S.view='dash';S.err='';banner('Projektet kunne ikke findes i dine gemte data. Dine hjemmesider er bevaret.');return false}
  S.id=chosen.id;Storage.set('pw.activeProject',chosen.id);
  S.view='edit';S.miniTab='edit';S.msg='';S.err='';S.del=null;S.busy=false;
  pwProjectDiag('project-selected',{selectedId:S.id,view:S.view,chatCount:Array.isArray(chosen.chat)?chosen.chat.length:null,resolvedBy});
  return true;
}
function openProjectRoute(){
  const match=String(window.location.hash||'').match(/^#project\/([0-9a-f-]{36})$/i);
  if(!match)return false;
  openSavedProject(match[1]);
  window.history.replaceState(null,'',window.location.pathname+window.location.search);
  render();
  return true;
}
window.addEventListener('hashchange',openProjectRoute);
// Direct capture-phase project opening: this runs before every delegated bubble handler,
// so dashboard overlays or unrelated click handlers cannot swallow the project action.
function openProjectImmediately(id,fingerprint){
  pwProjectDiag('open-start',{requestedId:String(id),fingerprint:fingerprint||null,view:S.view});
  const opened=openSavedProject(id,fingerprint);
  if(!opened){pwProjectDiag('open-failed',{requestedId:String(id),view:S.view});render();return false}
  try{window.history.replaceState(null,'',window.location.pathname+window.location.search)}catch(_){}
  render();
  const selected=getP();
  pwProjectDiag('open-rendered',{selectedId:S.id,view:S.view,projectFound:!!selected,chatCount:selected&&Array.isArray(selected.chat)?selected.chat.length:null});
  return true;
}
document.addEventListener('click',function(e){
  const target=e.target&&e.target.nodeType===1?e.target:e.target&&e.target.parentElement;
  const opener=target&&target.closest&&target.closest('[data-project-open-id],a[href^="#project/"]');
  if(PW_PROJECT_DIAGNOSTICS)pwProjectDiag('click-capture',{targetTag:target&&target.tagName||null,targetClass:target&&String(target.className||'').slice(0,100)||'',openerFound:!!opener,openerTag:opener&&opener.tagName||null,openerClass:opener&&String(opener.className||'').slice(0,100)||''});
  if(!opener)return;
  const hrefId=opener.getAttribute('href')||'';
  let id=opener.getAttribute('data-project-open-id')||hrefId.slice('#project/'.length);
  const fingerprint=opener.getAttribute('data-project-fingerprint')||'';
  try{id=decodeURIComponent(id)}catch(_){}
  if(!id)return;
  e.preventDefault();
  e.stopImmediatePropagation();
  pwProjectDiag('project-link-captured',{requestedId:id,fingerprint:fingerprint||null,href:hrefId||null});
  openProjectImmediately(id,fingerprint);
},true);
document.addEventListener('change',function(e){
  const select=e.target&&e.target.closest&&e.target.closest('[data-project-open-select]');
  if(PW_PROJECT_DIAGNOSTICS)pwProjectDiag('select-change',{selectFound:!!select,value:select&&select.value||null});
  if(!select||!select.value)return;
  e.stopImmediatePropagation();
  openProjectImmediately(select.value);
},true);
const upd=(id,fn)=>{if(!id)return false;const l=Projects.all(),i=l.findIndex(p=>String(p.id)===String(id));if(i<0)return false;fn(l[i]);l[i].updatedAt=Date.now();Projects.save(l);return true};

function vList(){const l=Projects.all();
  if(!l.length)return `<div class="empty"><h1>Mine hjemmesider</h1><h3>Du har ingen projekter endnu</h3><p class="mu">Opret dit første projekt, og få en komplet hjemmeside på få sekunder.</p><button class="btn" data-act="new">Nyt projekt</button></div>`;
  return `<h1>Mine hjemmesider</h1><div class="grid">${l.map(p=>`<div class="card">${S.renameId===p.id?`<div class="dash-rename-inline"><input data-rename-input data-id="${p.id}" value="${esc(S.renameValue)}" aria-label="Nyt projektnavn" maxlength="80"><button class="btn" data-act="renameSave" data-id="${p.id}">Gem</button><button class="btn ghost" data-act="renameCancel">Annuller</button></div>`:`<h3>${esc(p.name)}</h3>`}<p class="mu">${p.status==='ready'?'Klar til udgivelse':'Kladde'}, ændret ${new Date(p.updatedAt).toLocaleDateString('da-DK')}</p><div class="row dash-project-actions"><a class="btn" href="#project/${encodeURIComponent(p.id)}" data-project-open-id="${esc(p.id)}" data-project-fingerprint="${projectFingerprint(p)}">Rediger hjemmeside</a><button class="btn dash-delete-project" type="button" data-act="del" data-id="${p.id}">Delete</button></div></div>`).join('')}</div>`}


function vEdit(){const p=getP();if(!p)return `<section class="card" style="max-width:760px"><h1>Hjemmesiden kunne ikke indlæses</h1><p>Editoren er blevet på denne side. Dine gemte projekter er ikke slettet. Gå til Dashboard og vælg projektet igen, eller prøv at genindlæse.</p><button class="btn" data-act="go" data-v="dash">Til Dashboard</button></section>`;
  setTimeout(()=>{const box=document.querySelector('[data-chat-messages]');if(box)box.scrollTop=box.scrollHeight},0);
  return `<div class="editor-workspace-head"><div><span class="dash-section-kicker">AI WEBSITE EDITOR</span><h1>${esc(p.name)}</h1><p class="mu">Beskriv dine ønsker i chatten. Gemini arbejder på hjemmesiden, mens Claude hjælper med at formulere et naturligt svar.</p></div><div class="row"><button class="btn ghost" data-act="go" data-v="builder">Visuel editor</button><button class="btn ghost" data-act="go" data-v="customize">Design</button><button class="btn ghost" data-act="go" data-v="media">Billeder</button><button class="btn ghost" data-act="go" data-v="preview">Forhåndsvisning</button><button class="btn ghost" data-act="go" data-v="files">Filer</button><button class="btn ghost" data-act="go" data-v="history">Versioner</button></div></div>
<div class="ed"><section class="chat"><div class="editor-section"><span class="badge">PRIME WEBS AI · ASSISTENT</span><p class="mu">Skriv helt almindeligt, som du ville gøre i ChatGPT. Du kan stille spørgsmål eller bede AI'en om at bygge og ændre hjemmesiden. Samtalen gemmes sammen med projektet.</p></div><div class="msgs" data-chat-messages aria-live="polite">${p.chat.map(m=>`<article class="m ${m.r==='u'?'u':'ai'}"><span class="m-label">${m.r==='u'?'Dig':'PRIME WEBS AI'}</span><div class="m-body">${esc(m.t)}</div></article>`).join('')}${S.busy?'<article class="m ai typing" role="status"><span class="m-label">PRIME WEBS AI · ARBEJDER</span><div class="m-body">'+esc(S.chatStatus||'Jeg arbejder på din hjemmeside…')+' <span class="typing-dots" aria-hidden="true"><i></i><i></i><i></i></span></div></article>':''}</div><form class="prompt-box" id="chat-form"><textarea id="chatin" rows="3" aria-label="Skriv en besked til PRIME WEBS AI" placeholder="Skriv en besked eller beskriv, hvad du vil ændre…" ${S.busy?'disabled':''}></textarea><button class="btn" type="submit" ${S.busy?'disabled':''}>${S.busy?'Arbejder…':'Send besked'}</button></form></section><section class="pv"><iframe title="Live preview" sandbox="allow-scripts" srcdoc="${esc(previewDoc(p))}"></iframe></section></div>`;
}

/* ===== Nye sider ===== */
const NAV=[
 ['Workspace',[
  ['dash','Dashboard'],
  ['new','Builder'],
  ['templates','Templates'],
  ['leads','Lead Finder'],
  ['domains','Domains'],
  ['finance','Finance'],
  ['university','University']
 ]],
 ['Growth',[
  ['customers','Clients'],
  ['bookings','Bookings'],
  ['stats','Analytics']
 ]],
 ['Manage',[
  ['credits','Plans & Credits']
 ]],
 ['Learn & Support',[
  ['help','Help Center']
 ]],
 ['Settings',[
  ['settings','Settings'],
  ['colors','Appearance'],
  ['contact','Contact'],
  ['adminp','Admin Panel',[['admin','Roles & access'],['backup','Backup']]]
 ]]
];
const BT={hero:'Forside',features:'Fordele',about:'Om os',contact:'Kontakt',services:'Ydelser',pricing:'Priser',team:'Team',steps:'Sådan foregår det',faq:'Spørgsmål og svar',cta:'Opfordring',gallery:'Galleri',booking:'Booking',reviews:'Anmeldelser',map:'Find os',threeD:'Interaktiv 3D'},LBL={title:'Overskrift',text:'Tekst',cta:'Knaptekst',email:'E-mail',phone:'Telefon',t:'Titel',d:'Beskrivelse'};
const PLANS=[['Gratis',50,0],['Starter',120,29],['Pro',250,67],['Business',500,126]];
const TPL=[
 {n:'Restaurant',s:'Elegant',d:'Restaurant med menu, bordforespørgsler, galleri og kontakt.',c:'Mad & drikke',industry:'Restaurant/café'},
 {n:'Café & bageri',s:'Natur',d:'Varm café eller bager med sortiment, åbningstider og lokation.',c:'Mad & drikke',industry:'Restaurant/café'},
 {n:'Håndværker',s:'Moderne',d:'Professionel håndværkerside med ydelser, arbejdsproces og tilbudsforespørgsel.',c:'Lokale services',industry:'Håndværker'},
 {n:'Malerfirma',s:'Premium',d:'Eksklusiv malerside med serviceoversigt, før/efter-galleri og tilbud.',c:'Lokale services',industry:'Håndværker'},
 {n:'Frisør & barber',s:'Frisk',d:'Moderne salon med behandlinger, priser, galleri og tidsbestilling.',c:'Skønhed',industry:'Frisør/skønhed'},
 {n:'Skønhedsklinik',s:'Rosa',d:'Elegant klinik med behandlinger, personale, FAQ og booking.',c:'Skønhed',industry:'Frisør/skønhed'},
 {n:'Konsulent',s:'Mørk',d:'Professionel rådgivningsside med ekspertise, ydelser og kontakt.',c:'Professionelle',industry:'Konsulent/rådgiver'},
 {n:'Ejendomsmægler',s:'Premium',d:'Premium ejendomsside med boligpræsentation, områder og kontakt.',c:'Professionelle',industry:'Konsulent/rådgiver'},
 {n:'Webshop',s:'Moderne',d:'Produktside med kategorier, produktfordele, levering og kundeservice.',c:'Handel',industry:'Webshop/butik'},
 {n:'Fitness & træning',s:'Hav',d:'Træningsside med hold, medlemsfordele, instruktører og tilmelding.',c:'Sundhed',industry:'Sundhed/træning'},
 {n:'Klinik',s:'Natur',d:'Tryg klinikside med behandlinger, praktisk info og kontakt.',c:'Sundhed',industry:'Sundhed/træning'},
 {n:'Portfolio',s:'Lavendel',d:'Personlig portfolio med projekter, kompetencer og kontakt.',c:'Kreative',industry:'Konsulent/rådgiver'}
];
const CK=[[1,'AI-generator via sikker serverfunktion (API-nøgle kræves)'],[1,'Live preview og chat-redigering'],[1,'Bygger med direkte redigering af blokke'],[1,'Ejer/admin med creditforbrug registreret pr. AI-handling'],[1,'Kunder med egne credits (manuelt)'],[1,'Sikkerhedskopi og gendannelse'],[1,'Adgangskode, begrænsning og validering på AI-serveren'],[1,'Demo-tilstand, hvis AI-serveren ikke er sat op'],[0,'Login og database'],[0,'Rigtig publicering og egne domæner'],[0,'Betaling og abonnementer (kræver din godkendelse)']];
const nEdits=p=>p.chat.filter(m=>m.r==='u').length;
const snap=()=>JSON.stringify({app:'primewebs',v:2,at:new Date().toISOString(),projects:Projects.all(),customers:Customers.all(),leads:[],settings:(({aiCode,...r})=>r)(Settings.get()),finance:Fin.all(),images:Imgs.all(),credits:Storage.get('pw.credits',50)},null,2);
// Forhåndsvisningen ligger i en afskærmet ramme (srcdoc). Uden <base> sender et #-link rammen til dashboardets egen adresse, og rammen bliver hvid.
function previewDoc(p){return Renderer.html(p).replace('<head>','<head><base href="about:srcdoc">')}
const frame=p=>`<iframe title="Live preview" sandbox="allow-scripts" srcdoc="${esc(previewDoc(p))}"></iframe>`;

function vPick(t){const mode=Storage.get('pw.workMode','clients')==='own'?'own':'clients',l=Projects.all().filter(p=>(p.workspaceMode||'clients')===mode);return `<h1>${PT[t]||'Vælg hjemmeside'}</h1><p class="mu">Vælg en hjemmeside at arbejde på.</p>`+(l.length?`<div class="grid">${l.map(p=>`<div class="card"><h3>${esc(p.name)}</h3><button class="btn" data-act="pick" data-t="${t}" data-id="${p.id}">Vælg</button></div>`).join('')}</div>`:`<p>Du har ingen hjemmesider endnu.</p><button class="btn" data-act="go" data-v="new">Opret ny hjemmeside</button>`)}

function duplicateProject(id){
 const source=Projects.all().find(p=>p.id===id);
 if(!source){banner('Projektet kunne ikke findes.');return}
 const copy=structuredClone(source),now=Date.now();
 copy.id=newProjectId();copy.name=(String(source.name||'Hjemmeside').trim()+' (kopi)').slice(0,80);
 copy.status='draft';copy.domain=null;copy.createdAt=now;copy.updatedAt=now;
 copy.history=[];copy.future=[];copy.chat=[{r:'ai',t:'Kopi oprettet fra '+String(source.name||'det oprindelige projekt')+'. Originalen er bevaret uændret.'}];
 copy.customerId=null;copy.customer=null;copy.isPublished=false;delete copy.publishedAt;delete copy.publishedUrl;delete copy.liveUrl;
 if(copy.site&&Array.isArray(copy.site.blocks))copy.site.blocks=copy.site.blocks.map(b=>({...b,id:uid()}));
 Projects.save([copy,...Projects.all()]);
 S.id=copy.id;Storage.set('pw.activeProject',copy.id);S.view='builder';S.miniTab='edit';S.err='';
 banner('Projektet er kopieret. Originalen er uændret.');
}
function vDash(){
 const workMode=Storage.get('pw.workMode','clients')==='own'?'own':'clients',all=Projects.all().filter(p=>(p.workspaceMode||'clients')===workMode),q=String(S.dashSearch||'').trim().toLowerCase(),filter=S.dashFilter||'all';
 const l=all.filter(p=>(!q||String(p.name||'').toLowerCase().includes(q)||String(p.domain||'').toLowerCase().includes(q))&&(filter==='all'||(filter==='published'&&(p.status==='published'||p.isPublished===true||!!p.publishedAt))||(filter==='ready'&&p.status==='ready')||(filter==='draft'&&p.status!=='ready'&&p.status!=='published'&&!p.isPublished&&!p.publishedAt)));
 const sort=S.dashSort||'updated';l.sort((a,b)=>sort==='name'?String(a.name||'').localeCompare(String(b.name||''),'da'):sort==='oldest'?Number(a.updatedAt||0)-Number(b.updatedAt||0):Number(b.updatedAt||0)-Number(a.updatedAt||0));
 const prompt=String(S.dashPrompt||'');
 const cards=l.map(p=>{const live=p.status==='published'||p.isPublished===true||!!p.publishedAt;return `<article class="sd-project-card" data-id="${esc(p.id)}"><div class="sd-project-preview"><iframe title="Preview: ${esc(p.name)}" sandbox="allow-scripts" loading="lazy" srcdoc="${esc(previewDoc(p))}"></iframe><span class="sd-project-state ${live?'live':'draft'}"><i></i>${live?'Live':'Draft'}</span><span class="sd-project-open">Open project ↗</span><a class="sd-project-open-target" href="#project/${encodeURIComponent(p.id)}" data-project-open-id="${esc(p.id)}" data-project-fingerprint="${projectFingerprint(p)}" aria-label="Open ${esc(p.name)}"></a></div><div class="sd-project-card-foot"><div><strong>${esc(p.name)}</strong><small>${esc(p.domain|| (live?'Published website':'Updated '+new Date(p.updatedAt||Date.now()).toLocaleDateString('en-GB')))}</small></div><div class="sd-project-actions"><a class="sd-edit-project-btn" href="#project/${encodeURIComponent(p.id)}" data-project-open-id="${esc(p.id)}" data-project-fingerprint="${projectFingerprint(p)}" aria-label="Rediger hjemmeside: ${esc(p.name)}">Rediger hjemmeside</a><button class="sd-delete-project" type="button" data-act="del" data-id="${esc(p.id)}">Delete</button></div></div></article>`}).join('');
 return `<div class="sd-dashboard">
  <section class="sd-welcome">
   <button class="sd-own-app" data-act="workMode" data-mode="${workMode==='own'?'clients':'own'}"><span class="sd-new-pill">NEW</span><span>${workMode==='own'?'Build for clients':'Build for yourself — launch your own app'}</span><b>→</b></button>
   <h1>${workMode==='own'?'What are you building?':"What's on your mind?"}</h1>
   <p>${workMode==='own'?'Describe your idea and build your own website, app or digital product.':'Describe a site for your client and watch PRIME WEBS AI build it — no code, no designers.'}</p>
   <div class="sd-compose">
    <textarea data-dash-prompt rows="2" aria-label="Describe your website" placeholder="Make ${workMode==='own'?'an app for my business...':'a website for...'}">${esc(prompt)}</textarea>
    <div class="sd-compose-actions"><button class="sd-compose-add" data-act="go" data-v="templates" aria-label="Browse templates" title="Browse templates">＋</button><span class="sp"></span><button class="sd-compose-send" data-act="dashGen" ${S.busy?'disabled':''} aria-label="Start building" title="Start building">${S.busy?'…':'➤'}</button></div>
   </div>
   ${S.err?`<p class="err sd-compose-error">${esc(S.err)}</p>`:''}
  </section>
  <section class="sd-project-library">
   <div class="sd-library-head"><div class="sd-library-title"><h2>My projects</h2><span>${l.length} ${l.length===1?'project':'projects'}</span></div><label class="sd-project-search"><span>⌕</span><input data-dash-search type="search" value="${esc(S.dashSearch||'')}" placeholder="Search projects" aria-label="Search projects"></label></div>
   <div class="sd-project-open-fallback"><label><span>Open a saved project directly</span><select data-project-open-select aria-label="Choose a saved project"><option value="">Choose a website…</option>${all.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('')}</select></label></div>
   ${all.length?`<div class="sd-project-filter"><button class="${filter==='all'?'active':''}" data-act="dashFilter" data-filter="all">All</button><button class="${filter==='published'?'active':''}" data-act="dashFilter" data-filter="published">Live</button><button class="${filter==='draft'?'active':''}" data-act="dashFilter" data-filter="draft">Drafts</button><select data-dash-sort aria-label="Sort projects"><option value="updated" ${sort==='updated'?'selected':''}>Recently updated</option><option value="oldest" ${sort==='oldest'?'selected':''}>Oldest</option><option value="name" ${sort==='name'?'selected':''}>Name</option></select></div>${cards?'<div class="sd-project-grid">'+cards+'</div>':'<div class="sd-no-projects">No projects match your search.</div>'}`:`<div class="sd-empty-projects"><div class="sd-empty-icon">✦</div><strong>Your projects will appear here</strong><p>Describe what you want to build above to create your first website.</p></div>`}
  </section>
 </div>`;
}
function vBuilder(){const p=getP();if(!p)return vPick('builder');const blocks=p.site.blocks||[];
 const field=(bi,k,v,extra='')=>`<label class="block-field">${LBL[k]||k}<input data-b="${bi}" data-k="${k}" ${extra} value="${esc(v??'')}"></label>`;
 const itemFields=(bi,items)=>items.map((it,ii)=>`<div class="block-item-fields"><span class="block-item-number">${ii+1}</span><div>${it.name!==undefined?field(bi,'name',it.name,`data-i="${ii}" data-ik="name"`):field(bi,'t',it.t,`data-i="${ii}" data-ik="t"`)}${it.text!==undefined?field(bi,'text',it.text,`data-i="${ii}" data-ik="text"`):field(bi,'d',it.d,`data-i="${ii}" data-ik="d"`)}${it.price!==undefined?field(bi,'price',it.price,`data-i="${ii}" data-ik="price"`):''}${it.rating!==undefined?field(bi,'rating',it.rating,`data-i="${ii}" data-ik="rating"`):''}</div></div>`).join('');
 const cards=blocks.map((b,bi)=>`<article class="block-editor-card"><header><span class="block-editor-icon">${({hero:'✦',features:'▦',about:'◉',services:'⌘',steps:'↗',faq:'?',cta:'➜',gallery:'▧',contact:'✉',booking:'◷'})[b.type]||'▤'}</span><div><strong>${BT[b.type]||b.type}</strong><small>Sektion ${bi+1} af ${blocks.length}</small></div><span class="sp"></span><button class="btn ghost block-move" data-act="bmove" data-i="${bi}" data-d="-1" ${bi===0?'disabled':''} aria-label="Flyt sektion op">↑</button><button class="btn ghost block-move" data-act="bmove" data-i="${bi}" data-d="1" ${bi===blocks.length-1?'disabled':''} aria-label="Flyt sektion ned">↓</button>${b.type==='hero'||b.type==='contact'?'<span class="block-fixed-label">Fast sektion</span>':`<button class="btn ghost block-remove" data-act="brem" data-i="${bi}">Fjern</button>`}</header><div class="block-editor-fields">${Object.keys(b).filter(k=>!['id','type','modelData','modelFormat','modelName'].includes(k)).map(k=>Array.isArray(b[k])?(b[k].length&&typeof b[k][0]==='object'?itemFields(bi,b[k]):b[k].map((it,ii)=>`<label class="block-field">${k==='images'?'Billede URL':'Element'}<input data-b="${bi}" data-k="${k}" data-i="${ii}" value="${esc(it)}" placeholder="https://..."></label>`).join('')):k==='shape'&&b.type==='threeD'?`<label class="block-field">3D-objekt<select data-b="${bi}" data-k="shape"><option value="barber-chair" ${b.shape==='barber-chair'?'selected':''}>Barberstol</option><option value="barber-pole" ${b.shape==='barber-pole'?'selected':''}>Barberstang</option><option value="scissors" ${b.shape==='scissors'?'selected':''}>Frisørsaks</option><option value="shampoo-bottle" ${b.shape==='shampoo-bottle'?'selected':''}>Shampoo-flaske</option><option value="car" ${b.shape==='car'?'selected':''}>Bil</option><option value="wheel" ${b.shape==='wheel'?'selected':''}>Bildæk / hjul</option><option value="engine" ${b.shape==='engine'?'selected':''}>Motor</option><option value="orb" ${b.shape==='orb'?'selected':''}>3D-kugle</option><option value="torus" ${b.shape==='torus'?'selected':''}>3D-ring</option><option value="box" ${b.shape==='box'?'selected':''}>3D-form</option><option value="knot" ${b.shape==='knot'?'selected':''}>3D-design</option></select></label>`:field(bi,k,b[k])).join('')}</div>${b.type==='threeD'?`<div class="block-editor-fields"><label class="block-field">3D-model (GLB eller GLTF)<input type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" data-three-model="${bi}"><small>Upload en selvstændig model. GLTF-filer skal have indlejrede data-URI'er; eksterne teksturer/filer understøttes ikke endnu. Maks. 2 MB.</small></label>${b.modelName?`<div class="block-field"><strong>Valgt model: ${esc(b.modelName)}</strong><button type="button" class="btn ghost" data-act="threeModelRemove" data-i="${bi}">Fjern model</button></div>`:'<p class="mu">Ingen egen model valgt – den indbyggede 3D-figur vises i stedet.</p>'}</div>`:''}</article>`).join('');
 const addTypes=['features','services','about','steps','faq','cta','gallery','booking','pricing','team','reviews','map','threeD'];
 const anim=p.site.meta.animation||{level:'immersive'};const level=anim.level||'immersive';
 return `<div class="editor-workspace-head"><div><span class="dash-section-kicker">PRIME WEBS AI · WEBSITE STUDIO</span><h1>${esc(p.name)}</h1><p class="mu">Byg, redigér og se resultatet ét sted – med AI-chat og live preview side om side.</p></div><div class="row"><button class="btn ghost" data-act="go" data-v="customize">Design</button><button class="btn ghost" data-act="go" data-v="media">Billeder</button><button class="btn ghost" data-act="go" data-v="files">Filer</button><button class="btn ghost" data-act="go" data-v="history">Versioner</button><button class="btn ghost" data-act="go" data-v="code">Kode</button></div></div>
<section class="ed builder-ai-workspace">
 <section class="chat builder-ai-chat">
  <div class="editor-section"><span class="badge">✦ PRIME AI</span><h3>Hvad skal vi ændre?</h3><p class="mu">Beskriv ændringer med dine egne ord. AI'en opdaterer hjemmesiden og viser resultatet i previewet.</p></div>
  <div class="builder-ai-private-status" role="status">${S.busy?'Arbejder på din hjemmeside…':'Klar til din næste ændring.'}</div>
  <div class="msgs builder-ai-messages" data-chat-messages aria-live="polite">${(Array.isArray(p.chat)?p.chat:[]).map(m=>'<article class="m '+(m.r==='u'?'u':'ai')+'"><span class="m-label">'+(m.r==='u'?'Dig':'PRIME WEBS AI')+'</span><div class="m-body">'+esc(m.t)+'</div></article>').join('')}${S.busy?'<article class="m ai typing" role="status"><span class="m-label">PRIME WEBS AI</span><div class="m-body">AI’en arbejder på din hjemmeside <span class="typing-dots" aria-hidden="true"><i></i><i></i><i></i></span></div></article>':''}</div>
  <div class="prompt-box builder-ai-prompt"><textarea id="chatin" rows="3" aria-label="Skriv en besked til AI-generatoren" placeholder="Fx: Gør forsiden mere eksklusiv, tilføj en prissektion eller skift farver…" ${S.busy?'disabled':''}></textarea><button class="btn" data-act="send" ${S.busy?'disabled':''}>Send til AI ↗</button></div>
 </section>
 <section class="builder-preview builder-ai-preview"><div class="builder-preview-head"><div><strong>Live preview</strong><small class="mu">Opdateres efter AI-ændringer</small></div><div class="row"><button class="chip ${S.device==='desktop'?'is-selected':''}" data-act="dev" data-d="desktop">Computer</button><button class="chip ${S.device==='mobile'?'is-selected':''}" data-act="dev" data-d="mobile">Mobil</button></div></div><div class="pv"><iframe class="${S.device}" title="Live website preview" sandbox="allow-scripts" srcdoc="${esc(previewDoc(p))}"></iframe></div></section>
</section>`;
}


function vCode(){const p=getP();if(!p)return vPick('code');const tab=S.fileTab||'site.json';const files=[['site.json','JSON','Alle sektioner, tekster, farver og 3D-indstillinger i struktureret form.'],['index.html','HTML','Den genererede hjemmesidekode.'],['README.md','DOCS','Projektoversigt.'],['SEO-CHECKLIST.md','SEO','SEO-tjekliste.']];const html=Renderer.html(p);const data=tab==='index.html'?html:tab==='README.md'?'# '+p.name+'\\n\\nPRIME WEBS AI projektkode.':tab==='SEO-CHECKLIST.md'?projectSeoAudit(p):JSON.stringify(p.site,null,2);return '<section class="file-workspace-head"><div><span class="dash-section-kicker">PRIME WEBS AI · AVANCERET</span><h1>'+esc(p.name)+' / Kode</h1><p class="mu">Alle tekniske detaljer, sektioner, tekster, farver og 3D-indstillinger er samlet her – væk fra Design og live preview.</p></div><div class="row"><button class="btn ghost" data-act="go" data-v="builder">← Tilbage til Design</button><button class="btn" data-act="zipDownload">Download komplet ZIP</button></div></section><div class="file-workspace"><aside class="file-tree"><strong>Kildefiler</strong>'+files.map(x=>'<button class="file-tree-item '+(tab===x[0]?'active':'')+'" data-act="fileTab" data-file="'+x[0]+'"><span class="file-type">'+x[1]+'</span>'+x[0]+'</button>').join('')+'</aside><section class="file-viewer"><header><div><strong>'+tab+'</strong><small>'+((files.find(x=>x[0]===tab)||[])[2]||'')+'</small></div><span class="file-readonly">READ ONLY</span></header><textarea class="code file-code" readonly spellcheck="false">'+esc(data)+'</textarea><footer><span class="mu">'+data.length.toLocaleString('da-DK')+' tegn</span><button class="btn ghost" data-act="fileDownload" data-file="'+tab+'">Download fil</button></footer></section></div>'}
function vTpl(){const q=String(S.templateQuery||'').trim().toLowerCase(),cat=S.templateCategory||'Alle',cats=['Alle',...new Set(TPL.map(t=>t.c))],list=TPL.map((t,i)=>({...t,i})).filter(t=>(cat==='Alle'||t.c===cat)&&(!q||[t.n,t.d,t.c,t.industry].join(' ').toLowerCase().includes(q)));
 return `<section class="template-library-hero"><div><span class="dash-section-kicker">PRIME WEBS AI · DESIGNBIBLIOTEK</span><h1>Skabelonbibliotek</h1><p>Start med et professionelt udgangspunkt. Tilpas indhold, farver og sektioner bagefter.</p></div><span class="template-count">${TPL.length} skabeloner</span></section><section class="template-library-tools"><input type="search" data-template-q value="${esc(S.templateQuery||'')}" placeholder="Søg i skabeloner…" aria-label="Søg i skabeloner"><div class="dash-filter-row">${cats.map(c=>`<button class="chip ${cat===c?'is-selected':''}" data-act="templateFilter" data-filter="${esc(c)}" aria-pressed="${cat===c}">${esc(c)}</button>`).join('')}</div></section><div class="template-library-grid">${list.map(t=>`<article class="template-card"><div class="template-card-art template-art-${t.i%6}"><span>${esc(t.n)}</span><small>${esc(t.c)}</small><div class="template-art-lines"><i></i><i></i><i></i></div></div><div class="template-card-body"><div class="template-card-meta"><span>${esc(t.c)}</span><span>Stil: ${esc(t.s)}</span></div><h3>${esc(t.n)}</h3><p>${esc(t.d)}</p><button class="btn" data-act="tpl" data-i="${t.i}">Brug skabelon</button></div></article>`).join('')||'<div class="card"><strong>Ingen skabeloner fundet</strong><p class="mu">Prøv et andet søgeord eller en anden kategori.</p></div>'}</div>`;
}

function vDom(){
  const l=Projects.all(),q=String(S.domainQuery||'');
  const ext=['.com','.es','.dk','.net','.org','.io','.ai','.shop'];
  const prices=[{"tld":".com","reg":"$12.08","renew":"$19.98","note":"25 % rabat på første år"},{"tld":".net","reg":"$12.48","renew":"$18.58","note":"17 % rabat på første år"},{"tld":".org","reg":"$8.48","renew":"$18.98","note":"41 % rabat på første år"},{"tld":".io","reg":"$29.98","renew":"$75.98","note":"55 % rabat på første år"},{"tld":".co","reg":"$19.98","renew":"$45.48","note":"48 % rabat på første år"},{"tld":".ai","reg":"$89.98","renew":"$114.98","note":"Minimum 2 års registrering"}];
  return `<section class="domain-store-hero">
    <div class="domain-store-copy"><span class="domain-store-eyebrow"><i></i> PRIME WEBS AI · DOMÆNECENTER</span>
      <h1>Find dit næste <em>domæne.</em></h1>
      <p>Find den perfekte adresse til din hjemmeside. Søg, sammenlign og administrér dine domæner – samlet ét sted.</p>
      <div class="domain-store-trust"><span>✓ Enkel administration</span><span>✓ Klar til DNS & SSL</span><span>✓ Samlet overblik</span></div>
    </div><div class="domain-store-orbit" aria-hidden="true"><div class="domain-orbit-ring ring-one"></div><div class="domain-orbit-ring ring-two"></div><div class="domain-orbit-core">.com</div><span class="domain-orbit-tag tag-one">.es</span><span class="domain-orbit-tag tag-two">.ai</span></div>
  </section>
  <section class="domain-search-panel">
    <div class="domain-search-heading"><div><span class="domain-store-kicker">DOMÆNESØGNING</span><h2>Hvilket navn har du i tankerne?</h2><p>Indtast et navn for at klargøre søgningen.</p></div><span class="domain-search-status"><i></i> Søgetjeneste klargøres</span></div>
    <form class="domain-search-form" onsubmit="return false">
      <span class="domain-search-glass">⌕</span><input data-dom-query type="search" value="${esc(q)}" placeholder="Skriv dit ønskede domæne, fx minvirksomhed" aria-label="Søg efter et domæne">
      <button class="btn domain-search-button" type="button" data-act="domSearch">Søg domæne <span>→</span></button>
    </form>
    <div class="domain-tld-row"><span>POPULÆRE ENDELSER</span>${ext.map(x=>`<span class="domain-tld">${x}</span>`).join('')}</div>
    ${S.domSearched?`<div class="domain-no-results"><span class="domain-no-results-icon">⌕</span><div><strong>Søgning er snart klar</strong><p>Domænesøgning er endnu ikke aktiveret. Der vises derfor ingen ledighed eller priser endnu. Din søgning “${esc(q)}” er ikke sendt til en udbyder.</p><span class="domain-coming-label"><i></i> Kommer snart</span></div></div>`:''}
  </section>
  <div class="domain-store-section-head"><div><span class="domain-store-kicker">KOMMER TIL DOMÆNECENTERET</span><h2>Alt til dine domæner</h2><p>De vigtigste værktøjer er gjort klar til aktivering.</p></div></div>
  <div class="domain-feature-grid">
    <article class="domain-feature-card"><span class="domain-feature-icon purple">⌕</span><span class="domain-feature-label">SØG & FIND</span><h3>Find dit domæne</h3><p>Søg efter navne og sammenlign forskellige domæneendelser, når søgetjenesten aktiveres.</p><span class="domain-feature-state">Klargjort til senere</span></article>
    <article class="domain-feature-card"><span class="domain-feature-icon blue">＋</span><span class="domain-feature-label">REGISTRERING</span><h3>Køb et domæne</h3><p>Et samlet købsflow med pris, registreringsperiode og fornyelse bliver tilsluttet senere.</p><button class="btn domain-buy-button" type="button" disabled title="Domænekøb aktiveres senere">Køb domæne <span>↗</span></button></article>
    <article class="domain-feature-card"><span class="domain-feature-icon teal">◎</span><span class="domain-feature-label">ADMINISTRATION</span><h3>Administrér domæner</h3><p>Hold styr på ejerskab, fornyelsesdatoer, DNS-indstillinger og SSL-status.</p><span class="domain-feature-state">Klargjort til senere</span></article>
  </div>
<section class="domain-price-section"><div class="domain-store-section-head"><div><span class="domain-store-kicker">PRISOVERSIGT · NAMECHEAP</span><h2>Populære domænepriser</h2><p>Offentlige referencepriser – registrering og fornyelse vist hver for sig.</p></div><span class="domain-price-currency">USD / ÅR</span></div><div class="domain-price-grid"><article class="domain-price-card"><div class="domain-price-card-top"><strong>.com</strong><span class="domain-price-ref">Prisreference</span></div><div class="domain-price-reg"><span>Første år</span><strong>$12.08</strong></div><div class="domain-price-renew"><span>Fornyelse pr. år</span><strong>$19.98</strong></div><p>25 % rabat på første år</p><button class="btn domain-buy-button" type="button" disabled>Køb .com <span>↗</span></button></article><article class="domain-price-card"><div class="domain-price-card-top"><strong>.net</strong><span class="domain-price-ref">Prisreference</span></div><div class="domain-price-reg"><span>Første år</span><strong>$12.48</strong></div><div class="domain-price-renew"><span>Fornyelse pr. år</span><strong>$18.58</strong></div><p>17 % rabat på første år</p><button class="btn domain-buy-button" type="button" disabled>Køb .net <span>↗</span></button></article><article class="domain-price-card"><div class="domain-price-card-top"><strong>.org</strong><span class="domain-price-ref">Prisreference</span></div><div class="domain-price-reg"><span>Første år</span><strong>$8.48</strong></div><div class="domain-price-renew"><span>Fornyelse pr. år</span><strong>$18.98</strong></div><p>41 % rabat på første år</p><button class="btn domain-buy-button" type="button" disabled>Køb .org <span>↗</span></button></article><article class="domain-price-card"><div class="domain-price-card-top"><strong>.io</strong><span class="domain-price-ref">Prisreference</span></div><div class="domain-price-reg"><span>Første år</span><strong>$29.98</strong></div><div class="domain-price-renew"><span>Fornyelse pr. år</span><strong>$75.98</strong></div><p>55 % rabat på første år</p><button class="btn domain-buy-button" type="button" disabled>Køb .io <span>↗</span></button></article><article class="domain-price-card"><div class="domain-price-card-top"><strong>.co</strong><span class="domain-price-ref">Prisreference</span></div><div class="domain-price-reg"><span>Første år</span><strong>$19.98</strong></div><div class="domain-price-renew"><span>Fornyelse pr. år</span><strong>$45.48</strong></div><p>48 % rabat på første år</p><button class="btn domain-buy-button" type="button" disabled>Køb .co <span>↗</span></button></article><article class="domain-price-card"><div class="domain-price-card-top"><strong>.ai</strong><span class="domain-price-ref">Prisreference</span></div><div class="domain-price-reg"><span>Første år</span><strong>$89.98</strong></div><div class="domain-price-renew"><span>Fornyelse pr. år</span><strong>$114.98</strong></div><p>Minimum 2 års registrering</p><button class="btn domain-buy-button" type="button" disabled>Køb .ai <span>↗</span></button></article></div><p class="domain-price-disclaimer">Priserne er hentet fra Namecheaps offentlige prisliste og vises kun som reference. De er i USD, kan ændres, kan være kampagnepriser og er ikke et live tilbud fra PRIME WEBS AI. Tilgængelighed, moms og endelig pris skal bekræftes ved aktivering.</p></section>
    <section class="domain-managed-section"><div class="domain-store-section-head"><div><span class="domain-store-kicker">DIT WORKSPACE</span><h2>Dine hjemmesider</h2><p>Domæner og projekter samlet i dit workspace.</p></div><span class="domain-managed-count">${l.length} ${l.length===1?'projekt':'projekter'}</span></div>
    ${l.length?`<div class="domains-grid">${l.map(p=>`<article class="domain-card domain-managed-card"><div class="domain-card-top"><span class="domain-icon">◎</span><span class="domain-status ${p.status==='ready'?'ready':''}">${p.status==='ready'?'Klar til udgivelse':'Kladde'}</span></div><h3>${esc(p.name)}</h3><p class="domain-project-note">Hjemmeside · projekt</p><label class="domain-field">Dit domæne<input data-dom="${p.id}" placeholder="fx minvirksomhed.dk" value="${esc(p.domain||'')}"></label><div class="domain-connection"><span class="domain-connection-dot"></span><span>${p.domain?'Domænenavn gemt · ikke tilsluttet':'Intet domæne tilføjet endnu'}</span></div><div class="domain-card-actions"><button class="btn ghost" data-act="rdy" data-id="${p.id}">${p.status==='ready'?'Sæt tilbage til kladde':'Markér klar til udgivelse'}</button></div></article>`).join('')}</div>`:`<div class="domain-empty"><span>◎</span><h3>Dine projekter vises her</h3><p>Opret en hjemmeside, og administrér dens domæne fra dette område.</p><button class="btn" data-act="go" data-v="new">Opret hjemmeside</button></div>`}
  </section>
  <div class="domain-store-note"><span>ⓘ</span><div><strong>Designet er klar – forbindelserne aktiveres senere</strong><p>Domænesøgning, betaling, registrering, DNS-verifikation og SSL er endnu ikke tilsluttet. Prisoversigten er kun en offentlig reference – der foretages ingen søgninger eller køb i denne version.</p></div></div>`;
}
function vCred(){
 const plans=[
  {name:'Starter',description:'For freelancers getting started with lead generation',price:25,credits:100,searches:5,features:['100 AI credits / month','Lead generation (5 searches / mo)','50 results per search','Invoicing (full access)','AI website generation'],button:'Get Starter'},
  {name:'Pro',description:'For agencies scaling their outreach pipeline',price:50,credits:200,searches:25,features:['200 AI credits / month','Lead generation (25 searches / mo)','50 results per search','Invoicing (full access)','AI website generation','Priority support'],button:'Current plan',popular:true},
  {name:'Business',description:'For teams with high-volume prospecting needs',price:100,credits:500,searches:100,features:['500 AI credits / month','Lead generation (100 searches / mo)','50 results per search','Invoicing (full access)','AI website generation','Priority support'],button:'Get Business'}
 ];
 const check='<span class="pw-credit-check" aria-hidden="true">✓</span>';
 const billing=Storage.get('pw.creditBilling','monthly');
 const multiplier=billing==='six'?.8:billing==='annual'?.67:1;
 const period=billing==='six'?'6-Month':billing==='annual'?'Annual':'Monthly';
 const saving=billing==='six'?'Save ~20%':billing==='annual'?'Save ~33%':'';
 const money=n=>'$'+(n*multiplier).toFixed(2).replace(/\.00$/,'');
 return `<section class="pw-credits-page">
 <style>
 .pw-credits-page{max-width:1180px;margin:0 auto;padding:30px 24px 54px;color:#182238}
 .pw-credits-page *{box-sizing:border-box}
 .pw-credits-head{text-align:center;margin:4px auto 30px;max-width:760px}
 .pw-credits-head h1{font-size:clamp(36px,5vw,56px);letter-spacing:-.055em;line-height:1.02;margin:8px 0 12px;background:linear-gradient(100deg,#172033 25%,#8b83db 85%);-webkit-background-clip:text;background-clip:text;color:transparent}
 .pw-credits-head p{color:#68748a;font-size:15px;line-height:1.65;margin:0}
 .pw-credit-subscription{max-width:900px;margin:0 auto 30px;padding:18px 22px;border:1px solid #e7eaf2;border-radius:18px;background:linear-gradient(110deg,#fff,#f6f7ff);display:flex;align-items:center;justify-content:space-between;gap:15px;box-shadow:0 12px 32px #1720330a}
 .pw-credit-subscription-main{display:flex;align-items:center;gap:14px;min-width:0}
 .pw-credit-subscription-icon{width:48px;height:48px;flex:0 0 48px;display:grid;place-items:center;border-radius:15px;background:#eef0ff;color:#5969c9;font-size:24px}
 .pw-credit-subscription strong{display:block;font-size:16px}
 .pw-credit-subscription small{display:block;color:#778196;margin-top:4px;line-height:1.45}
 .pw-credit-unlimited{font-weight:800;color:#4758bd;white-space:nowrap}
 .pw-credit-section-title{text-align:center;margin:30px 0 16px}
 .pw-credit-section-title h2{font-size:22px;letter-spacing:-.035em;margin:0 0 6px}
 .pw-credit-section-title p{color:#7a8497;margin:0;font-size:13px}
 .pw-credit-usage{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;max-width:760px;margin:0 auto 30px}
 .pw-credit-usage article{padding:17px 20px;border:1px solid #e7eaf1;border-radius:16px;background:#fff;display:flex;align-items:center;gap:15px}
 .pw-credit-usage .usage-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:#f0f2ff;color:#5667c5;font-size:20px}
 .pw-credit-usage b{display:block;font-size:24px;letter-spacing:-.04em}
 .pw-credit-usage small{display:block;color:#778196;margin-top:3px}
 .pw-credit-billing{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin:0 auto 22px}
 .pw-credit-billing button{border:1px solid #e4e8f1;background:#fff;color:#536078;border-radius:999px;padding:10px 16px;font:700 13px inherit;cursor:pointer}
 .pw-credit-billing button.active{background:#eef1ff;border-color:#cdd4ff;color:#344eb2}
 .pw-credit-billing button small{font-size:10px;color:#16845b;margin-left:5px}
 .pw-credit-plans{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:stretch}
 .pw-credit-plan{position:relative;display:flex;flex-direction:column;padding:25px 23px 22px;border:1px solid #e6e9f0;border-radius:23px;background:linear-gradient(160deg,#fff,#fafbff);box-shadow:0 12px 34px #17203309;min-width:0}
 .pw-credit-plan.popular{background:linear-gradient(155deg,#315fe5 0%,#293fc0 60%,#352f91 100%);border-color:#3156d7;color:#fff;box-shadow:0 18px 44px #304fc733;transform:translateY(-7px)}
 .pw-credit-plan h3{font-size:21px;margin:0 0 7px;letter-spacing:-.03em}
 .pw-credit-plan .plan-desc{font-size:12px;line-height:1.5;color:#788397;min-height:38px;margin:0 0 18px}
 .pw-credit-plan.popular .plan-desc{color:#dce5ff}
 .pw-credit-plan .plan-price{font-size:46px;font-weight:850;letter-spacing:-.065em;line-height:1;margin:0 0 17px}
 .pw-credit-plan .plan-price small{font-size:13px;font-weight:500;letter-spacing:0;color:#778196}
 .pw-credit-plan.popular .plan-price small{color:#dce5ff}
 .pw-credit-plan .plan-metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:19px}
 .pw-credit-plan .plan-metrics div{padding:12px 8px;border-radius:13px;background:#f2f4fa;text-align:center}
 .pw-credit-plan.popular .plan-metrics div{background:#ffffff19}
 .pw-credit-plan .plan-metrics b{display:block;font-size:20px;letter-spacing:-.03em}
 .pw-credit-plan .plan-metrics small{display:block;font-size:10px;line-height:1.35;color:#758096;margin-top:3px}
 .pw-credit-plan.popular .plan-metrics small{color:#e1e7ff}
 .pw-credit-plan ul{list-style:none;padding:16px 0 0;margin:0;border-top:1px solid #e9ecf2;display:grid;gap:12px;flex:1}
 .pw-credit-plan.popular ul{border-color:#ffffff35}
 .pw-credit-plan li{display:flex;align-items:flex-start;gap:9px;font-size:12px;line-height:1.45;color:#4f5a70}
 .pw-credit-plan.popular li{color:#f3f5ff}
 .pw-credit-check{color:#6b7bd2;font-weight:900}
 .pw-credit-plan.popular .pw-credit-check{color:#fff}
 .pw-credit-popular{display:inline-flex;align-self:flex-start;padding:6px 10px;border-radius:99px;background:#ffffff20;color:#fff;font-size:10px;font-weight:800;letter-spacing:.06em;margin-bottom:15px}
 .pw-credit-plan button{width:100%;margin-top:22px;padding:13px 15px;border:1px solid #dfe4ef;border-radius:12px;background:#fff;color:#26365c;font-weight:750;font-size:13px;cursor:not-allowed;opacity:.85}
 .pw-credit-plan.popular button{background:#ffffffde;border-color:#ffffffde;color:#2d429e}
 .pw-credit-plan button:disabled{opacity:.8}
 .pw-credit-note{max-width:900px;margin:22px auto 0;padding:14px 16px;border-radius:13px;background:#f5f7fc;border:1px solid #e7ebf4;color:#6d7890;font-size:12px;line-height:1.6}
 .pw-credit-note strong{color:#3f4b68}
 @media(max-width:850px){.pw-credit-plans{grid-template-columns:1fr;max-width:520px;margin:auto}.pw-credit-plan.popular{transform:none;order:-1}}
 @media(max-width:560px){.pw-credits-page{padding:20px 13px 36px}.pw-credit-subscription{align-items:flex-start;padding:15px}.pw-credit-unlimited{font-size:12px}.pw-credit-usage{grid-template-columns:1fr}.pw-credit-plan{padding:22px 19px}}
 </style>
 <header class="pw-credits-head"><h1>Your Plan</h1><p>Unlock the full power of PRIME WEBS AI. Build websites, make AI-powered edits and manage your projects from one place.</p></header>
 <div class="pw-credit-subscription"><div class="pw-credit-subscription-main"><span class="pw-credit-subscription-icon">♛</span><div><strong>Owner workspace · Unlimited access</strong><small>Your owner account keeps unlimited credits. Your own website builds and edits do not use credits.</small></div></div><div class="pw-credit-unlimited">∞ Unlimited</div></div>
 <div class="pw-credit-section-title"><h2>How credits work</h2><p>Simple, predictable usage for every customer.</p></div>
 <div class="pw-credit-usage"><article><span class="usage-icon">✦</span><div><b>6 credits</b><small>Generate one website</small></div></article><article><span class="usage-icon">↗</span><div><b>1 credit</b><small>Make one AI edit or change</small></div></article></div>
 <div class="pw-credit-section-title"><h2>Choose your plan</h2><p>${period} billing ${saving?'· '+saving:''} · Pick the credit allowance that fits your needs.</p></div>
 <div class="pw-credit-billing"><button type="button" data-act="pwCreditBilling" data-billing="monthly" class="${billing==='monthly'?'active':''}">Monthly</button><button type="button" data-act="pwCreditBilling" data-billing="six" class="${billing==='six'?'active':''}">6-Month <small>Save ~20%</small></button><button type="button" data-act="pwCreditBilling" data-billing="annual" class="${billing==='annual'?'active':''}">Annual <small>Save ~33%</small></button></div>
 <div class="pw-credit-plans">${plans.map(p=>`<article class="pw-credit-plan ${p.popular?'popular':''}">${p.popular?'<span class="pw-credit-popular">★ MOST POPULAR</span>':''}<h3>${p.name}</h3><p class="plan-desc">${p.description}</p><div class="plan-price">${money(p.price)}<small> /mo</small></div><div class="plan-metrics"><div><b>${p.credits}</b><small>AI credits / month</small></div><div><b>${p.searches}</b><small>searches / month</small></div></div><ul>${p.features.map(x=>'<li>'+check+x+'</li>').join('')}</ul><button type="button" disabled>${p.button} · Coming soon</button></article>`).join('')}</div>
 <div class="pw-credit-note"><strong>Important:</strong> Subscription checkout and payment processing are not connected yet, so these plans are displayed as a pricing preview only. Lead Finder search allowances will become active when its verified data provider is connected. Your OWNER / ADMIN unlimited-credit access is preserved.</div>
 </section>`;
}

function vCust(){const c=Customers.all(),l=Projects.all(),f=S.cf,po=(v)=>PLANS.map(([n])=>`<option ${v===n?'selected':''}>${n}</option>`).join('');
  return `<h1>Kundehjemmesider</h1><div class="card form" style="margin-bottom:1rem"><h3>Ny kunde</h3><label>Navn<input data-g="name" value="${esc(f.name)}"></label><label>E-mail<input data-g="email" value="${esc(f.email)}"></label><label>Plan<select data-g="plan">${po(f.plan)}</select></label>${S.err?`<p class="err">${esc(S.err)}</p>`:''}<button class="btn" data-act="cadd">Tilføj kunde</button></div><h3>Kunder</h3>`+(c.length?`<table><tr><th>Kunde</th><th>Plan</th><th>Credits</th><th></th></tr>${c.map(u=>`<tr><td>${esc(u.name)}<div class="mu" style="margin:0">${esc(u.email)}</div></td><td><select data-cu="${u.id}" data-cf="plan">${po(u.plan)}</select></td><td>${u.credits}</td><td><div class="row"><button class="btn ghost" data-act="cc" data-id="${u.id}" data-n="-10">−10</button><button class="btn ghost" data-act="cc" data-id="${u.id}" data-n="10">+10</button><button class="btn ghost" data-act="cdel" data-id="${u.id}">${S.cdel===u.id?'Bekræft':'Slet'}</button></div></td></tr>`).join('')}</table>`:'<p class="mu">Ingen kunder endnu.</p>')+`<h3 style="margin-top:1.5rem">Projekter</h3>`+(l.length?`<table><tr><th>Hjemmeside</th><th>Kunde</th></tr>${l.map(p=>`<tr><td>${esc(p.name)}</td><td><select data-cp="${p.id}"><option value="">Intern (mig)</option>${c.map(u=>`<option value="${u.id}" ${p.customerId===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select></td></tr>`).join('')}</table>`:'<p class="mu">Ingen hjemmesider endnu.</p>')}

function vStats(){const l=Projects.all(),cs=Customers.all(),ed=l.reduce((n,p)=>n+nEdits(p),0),blocks=l.reduce((n,p)=>n+(p.site.blocks||[]).length,0),mx=Math.max(1,...l.map(nEdits)),tile=(v,k,d,icon)=>`<article class="insight-kpi"><span class="insight-kpi-icon">${icon}</span><div class="mu">${k}</div><strong>${v}</strong><small>${d}</small></article>`;
 return `<section class="insight-hero"><div class="insight-hero-copy"><span class="insight-eyebrow">PRIME WEBS AI · OVERBLIK</span><h1>Statistik & analyser</h1><p>Få et samlet overblik over dine projekter, kunder og AI-aktivitet.</p><div class="insight-tags"><span>✦ Projekter</span><span>✦ Kunder</span><span>✦ AI-aktivitet</span></div></div><div class="insight-hero-graphic" aria-hidden="true"><div class="insight-bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><small>INSIGHTS</small></div></section>
 <div class="insight-head"><div><h2>Platformens aktivitet</h2><p class="mu">Nøgletal baseret på dine gemte data.</p></div><span class="insight-local">● Data fra denne browser</span></div>
 <div class="insight-grid">${tile(l.length,'Hjemmesider','Oprettede projekter','▧')}${tile(cs.length,'Kunder','Registrerede kunder','♙')}${tile(ed,'AI-chatændringer','Registrerede redigeringer','✧')}${tile(blocks,'Website-sektioner','Sektioner i alle projekter','▤')}</div>
 <section class="insight-panel"><div class="insight-panel-head"><div><span class="insight-section-kicker">DINE WEBSITES</span><h2>Projektaktivitet</h2><p class="mu">Se aktivitet og indhold for hvert projekt.</p></div><span class="insight-count">${l.length} projekter</span></div>
 ${l.length?`<div class="insight-project-grid">${l.slice().sort((a,b)=>nEdits(b)-nEdits(a)).map(p=>{const edits=nEdits(p),sections=(p.site.blocks||[]).length;return `<article class="insight-project-card"><div class="insight-project-top"><span class="insight-project-icon">W</span><span class="insight-project-status">${p.status==='ready'?'● Klar':'● Kladde'}</span></div><h3>${esc(p.name)}</h3><div class="insight-project-stats"><span><strong>${sections}</strong> sektioner</span><span><strong>${edits}</strong> AI-ændringer</span></div><div class="insight-project-progress"><div><span>AI-aktivitet</span><strong>${edits}</strong></div><div class="insight-track"><i style="width:${edits/mx*100}%"></i></div></div></article>`}).join('')}</div>`:'<div class="insight-empty"><span>▧</span><strong>Ingen projekter endnu</strong><p class="mu">Når du opretter hjemmesider, vises deres aktivitet her.</p></div>'}</section><p class="insight-foot">Besøgstal og konverteringer vises først, når publicering og webanalyse er tilsluttet. Statistikken bygger på lokale browserdata – ikke besøgstal fra offentlig trafik.</p>`}


function vSet(){const s=Settings.get(),u=Session.user(),role=u.role==='owner'?'Ejer':'Administrator',aiReady=AI.mode==='api';
 const field=(k,t,type='text',hint='')=>`<label class="settings-field"><span>${t}</span><input type="${type}" data-s="${k}" value="${esc(s[k]||'')}" autocomplete="off">${hint?`<small>${hint}</small>`:''}</label>`;
 return `<section class="settings-hero"><div><span class="settings-eyebrow">PRIME WEBS AI · KONTROLPANEL</span><h1>Indstillinger</h1><p>Administrér virksomhedsoplysninger, konto, AI-forbindelse og udseende ét sted.</p></div><div class="settings-hero-icon" aria-hidden="true">⚙</div></section>
 <section class="settings-account"><div class="settings-avatar">PW</div><div class="settings-account-copy"><span class="settings-overline">AKTIV KONTO</span><h2>${esc(u.name)}</h2><p>${esc(u.email||s.ownerEmail||'Ejerkonto')}</p></div><span class="settings-role"><i></i>${role}</span></section>
 <div class="settings-layout"><div class="settings-main">
 <section class="settings-card"><div class="settings-card-head"><span class="settings-card-icon blue">▣</span><div><h2>Virksomhedsoplysninger</h2><p>Oplysninger, der bruges som standard på nye hjemmesider.</p></div></div><div class="settings-fields">${field('company','Virksomhedsnavn')}${field('email','Kontakt-e-mail','email')}${field('phone','Telefonnummer','tel')}${field('web','Hjemmeside','url')}</div></section>
 <section class="settings-card"><div class="settings-card-head"><span class="settings-card-icon violet">✧</span><div><h2>AI-forbindelse</h2><p>Adgangskode til godkendelse af kald til din AI-server.</p></div><span class="settings-state ${aiReady?'configured':'demo'}"><i></i>${aiReady?'Servertilstand valgt':'Demo-tilstand'}</span></div>
 <label class="settings-field settings-secret"><span>AI-adgangskode</span><input type="password" data-s="aiCode" value="${esc(s.aiCode||'')}" autocomplete="new-password" placeholder="Indtast serverens ACCESS_CODE"><small>Skal svare til værdien af ACCESS_CODE på serveren. Det er ikke din Claude API-nøgle eller din ejeradgangskode.</small></label>
 <div class="settings-info"><strong>Hvor finder jeg den?</strong><p>Den skal være konfigureret som en miljøvariabel på serveren, der håndterer <code>/api/ai</code>. Hvis ingen serverkode er konfigureret, kan feltet ikke aktivere AI alene.</p></div></section>
 <section class="settings-card"><div class="settings-card-head"><span class="settings-card-icon teal">◐</span><div><h2>Udseende</h2><p>Vælg, hvordan dashboardet skal vises.</p></div></div><label class="settings-field"><span>Farvetema</span><select data-s="theme">${[['auto','Følg enhedens indstillinger'],['light','Lyst tema'],['dark','Mørkt tema']].map(([v,t])=>`<option value="${v}" ${s.theme===v?'selected':''}>${t}</option>`).join('')}</select></label></section>
 </div><aside class="settings-side"><section class="settings-card settings-status-card"><span class="settings-overline">SYSTEMSTATUS</span><h3>Forbindelser</h3><div class="settings-status-row"><span>AI-server</span><b class="${aiReady?'status-neutral':'status-demo'}">${aiReady?'API-rute valgt':'Demo'}</b></div><div class="settings-status-row"><span>Betaling</span><b class="status-muted">Ikke tilsluttet</b></div><div class="settings-status-row"><span>Database</span><b class="status-muted">Ikke tilsluttet</b></div><div class="settings-status-row"><span>Login</span><b class="status-muted">Lokal ejerprofil</b></div><p class="settings-status-note">Serverens faktiske tilgængelighed er ikke live-testet her. Projektdata gemmes aktuelt i denne browser.</p></section>
 <section class="settings-card settings-help-card"><span class="settings-help-icon">i</span><h3>Om dine indstillinger</h3><p>Ændringer gemmes automatisk, når du forlader et felt eller vælger en ny indstilling.</p><p>Hold AI-adgangskoden privat. Den gemmes i projektets lokale browserindstillinger i den nuværende version.</p></section></aside></div>`}


function vAdmin(){if(!Session.can())return '<h1>Admin Panel</h1><p>Du har ikke adgang.</p>';
  return `<section class="admin-hero"><div><span class="modern-eyebrow">PRIME WEBS AI · ADMINISTRATION</span><h1>Roller og adgang</h1><p>Et samlet overblik over brugerroller og adgangsniveauer. Supabase-login og cloud-database er tilsluttet; invitationer og detaljeret rolleadministration mangler stadig.</p><div class="modern-tags"><span>♙ Brugerroller</span><span>⌑ Adgangskontrol</span><span>◉ Ejerområde</span></div></div><div class="admin-hero-art">♙<small>CONTROL</small></div></section>
  <div class="admin-role-grid"><article class="admin-role-card owner"><div class="admin-role-top"><span class="admin-role-icon">♛</span><span class="domain-status ready">Aktiv rolle</span></div><h2>Owner</h2><p>Fuld kontrol over PRIME WEBS AI, indstillinger og administration.</p><ul><li>Administrere alle projekter</li><li>Adgang til Finance og systemindstillinger</li><li>Ubegrænset adgang i ejerkontoen</li></ul></article><article class="admin-role-card"><div class="admin-role-top"><span class="admin-role-icon">♙</span><span class="domain-status">Klar til senere</span></div><h2>Admin</h2><p>Administratorrolle til medarbejdere, når invitationsflow og rollebaserede tilladelser er færdige.</p><ul><li>Administrere tildelte områder</li><li>Hjælpe med projekter og kunder</li><li>Adgang styres af fremtidige tilladelser</li></ul></article><article class="admin-role-card"><div class="admin-role-top"><span class="admin-role-icon">◎</span><span class="domain-status">Kommer senere</span></div><h2>Kunde</h2><p>Kundeadgang til egne hjemmesider og credits. Kundens selvbetjeningsområde og projektbegrænsninger mangler stadig.</p><ul><li>Se egne hjemmesider</li><li>Redigere egne projekter</li><li>Ingen adgang til ejerens administration</li></ul></article></div>
  <div class="admin-notice"><span>ⓘ</span><div><strong>Login og cloud-data er allerede tilsluttet</strong><p>Admin-kode og Supabase-login virker. Det næste trin er at bygge brugerinvitationer, en rigtig brugerliste, rolleændringer og adgang pr. projekt. Ejerlogin-koden ændres ikke.</p></div></div><!--BK--><section class="backup-hero"><div><span class="modern-eyebrow">PRIME WEBS AI · DATASIKKERHED</span><h1>Sikkerhedskopi</h1><p>Gem en kopi af dine projekter og indstillinger, så du kan gendanne dem senere.</p><div class="modern-tags"><span>▣ Manuel backup</span><span>↻ Gendannelse</span><span>⌑ Lokal data</span></div></div><div class="backup-hero-art">▣<small>BACKUP</small></div></section>
  <div class="backup-grid"><article class="backup-card"><span class="backup-card-icon">↓</span><span class="modern-kicker">EKSPORTÉR DATA</span><h2>Lav sikkerhedskopi</h2><p>Opret en kopi af hjemmesider, kunder, Finance-poster, billeder og relevante indstillinger. Gem filen et sikkert sted uden for dashboardet.</p><div class="row"><button class="btn" data-act="bk">Forbered sikkerhedskopi</button><button class="btn ghost" data-act="bkDownload">Download backup-fil (.json)</button></div>${S.out&&S.outId==='bk'?`<textarea class="code backup-output" readonly>${esc(S.out)}</textarea>`:''}</article><article class="backup-card restore"><span class="backup-card-icon">↻</span><span class="modern-kicker">IMPORTÉR DATA</span><h2>Gendan fra sikkerhedskopi</h2><p>Indsæt en tidligere backup. Gendannelse kan overskrive data, der ligger i dashboardet nu.</p><textarea class="code" id="rs" placeholder="Indsæt sikkerhedskopien her">${esc(S.rv)}</textarea><button class="btn ghost" data-act="rs">${S.rc?'Bekræft: overskriv al data':'Gendan fra kopi'}</button>${S.msg?`<p class="${S.msg.startsWith('Fejl')?'err':'backup-message'}">${esc(S.msg)}</p>`:''}</article></div>
  <div class="backup-warning"><span>!</span><div><strong>Vigtigt før gendannelse</strong><p>Download eller kopiér en aktuel backup først. Gendannelse erstatter de relevante lokale data med indholdet fra den valgte kopi.</p></div></div>`;
}

/* ===== Finance (manuel registrering, ingen betalingssystem tilsluttet) ===== */
const Fin={all:()=>Storage.get('pw.finance',[]).map(fixF).filter(Boolean),save:l=>Storage.set('pw.finance',l)};
const fmt=n=>new Intl.NumberFormat('da-DK',{style:'currency',currency:'DKK',maximumFractionDigits:0}).format(n||0);
const monthKey=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
const today=()=>{const d=new Date();return monthKey(d)+'-'+String(d.getDate()).padStart(2,'0')};
const FCAT={income:['Hjemmeside','Abonnement','Vedligeholdelse','Andet'],expense:['Software','Hosting og domæner','Markedsføring','Løn og freelancere','Andet']};
const FPER=[['m1','Seneste måned'],['m3','Seneste 3 måneder'],['m6','Seneste 6 måneder']];
const inPer=(e,p)=>{const d=e.date||'',n=new Date(),months=p==='m6'?6:p==='m3'?3:1,start=new Date(n.getFullYear(),n.getMonth()-(months-1),1);return d>=monthKey(start)+'-01'&&d<=today()};
const finSum=(t,pre)=>Fin.all().filter(e=>e.type===t&&(e.date||'').startsWith(pre)).reduce((n,e)=>n+e.amount,0);
S.ff={type:'income',amount:'',date:today(),cat:'Hjemmeside',cust:'',note:''};S.fp='m6';S.fdel=null;

function vFin(){const p=S.fp||'m6',f=S.ff,cs=Customers.all(),months=p==='m1'?1:p==='m3'?3:6,periodLabel=p==='m1'?'Seneste måned':p==='m3'?'Seneste 3 måneder':'Seneste 6 måneder';
 const L=Fin.all().filter(e=>inPer(e,p)).sort((a,b)=>b.date.localeCompare(a.date)),sm=t=>L.filter(e=>e.type===t).reduce((n,e)=>n+e.amount,0),inc=sm('income'),exp=sm('expense'),res=inc-exp,payers=new Set(L.filter(e=>e.type==='income'&&e.cust).map(e=>e.cust)).size;
 const md=Array.from({length:months},(_,i)=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-(months-1-i));const k=monthKey(d);return[k,finSum('income',k),finSum('expense',k)]}),mx=Math.max(1,...md.flatMap(x=>[x[1],x[2]]));
 const cn=id=>id?(cs.find(c=>c.id===id)||{name:'Slettet kunde'}).name:'Uden kunde',byC={};L.filter(e=>e.type==='income').forEach(e=>{byC[e.cust||'']=(byC[e.cust||'']||0)+e.amount});
 const opt=(arr,v)=>arr.map(x=>`<option ${x===v?'selected':''}>${x}</option>`).join(''),tile=(n,x,kind,ico,sub)=>`<article class="finance-kpi ${kind}"><span class="finance-icon">${ico}</span><div class="mu">${x}</div><strong>${n}</strong><small>${sub}</small></article>`;
 return `<section class="finance-hero"><div class="finance-hero-copy"><span class="finance-eyebrow">PRIME WEBS AI · ØKONOMI</span><h1>Finance & overblik</h1><p>Følg virksomhedens registrerede indtægter, udgifter og resultat fra ét samlet overblik.</p><div class="finance-tags"><span>↗ Indtægter</span><span>↘ Udgifter</span><span>◎ Resultat</span></div></div><div class="finance-hero-art" aria-hidden="true"><div class="finance-hero-ring"></div><div class="finance-hero-orb">€<small>FINANCE</small></div></div></section>
 <div class="finance-toolbar"><div><h2>Økonomisk overblik</h2><p class="mu">Vælg en periode for at opdatere nøgletal og grafer.</p></div><span class="finance-period-label">Viser: ${periodLabel}</span></div>
 <div class="finance-period" role="group" aria-label="Vælg periode">${FPER.map(([k,t])=>`<button type="button" class="finance-period-btn ${p===k?'active':''}" data-act="fp" data-p="${k}" aria-pressed="${p===k}">${t}</button>`).join('')}</div>
 <div class="finance-kpi-grid">${tile(fmt(inc),'Indtægter','income','↗','Registreret i perioden')}${tile(fmt(exp),'Udgifter','expense','↘','Registreret i perioden')}${tile(fmt(res),'Resultat',res<0?'expense':'balance',res>=0?'＋':'−',res>=0?'Indtægter minus udgifter':'Udgifter overstiger indtægter')}${tile(payers,'Betalende kunder','customers','♙','Kunder med registreret indtægt')}${tile(payers?fmt(inc/payers):'–','Gns. indtægt pr. kunde','average','◎','Beregnet for perioden')}${tile(Projects.all().length,'Hjemmesider','customers','▧','Oprettede projekter')}${tile(Customers.all().length,'Kunder','customers','♙','Registrerede kunder')}</div>
 
 <section class="finance-business-strip"><div class="finance-business-heading"><div><span class="finance-section-kicker">PLATFORMENS AKTIVITET</span><h2>Forretning og ressourcer</h2><p class="mu">Et samlet overblik over dine projekter, kunder og tilgængelige AI-credits.</p></div><span class="finance-business-badge">WORKSPACE</span></div>
 <div class="finance-business-grid">
 <article class="finance-business-card"><span class="finance-business-icon">▧</span><div><small>Hjemmesider og projekter</small><strong>${Projects.all().length}</strong><span>Oprettede projekter i alt</span></div></article>
 <article class="finance-business-card"><span class="finance-business-icon">♙</span><div><small>Kunder</small><strong>${cs.length}</strong><span>Registrerede kunder</span></div></article>
 <article class="finance-business-card"><span class="finance-business-icon">⌕</span><div><small>Gemte leads</small><strong>${Storage.get('pw.leads',[]).length}</strong><span>Leads i Lead History</span></div></article>
 <article class="finance-business-card"><span class="finance-business-icon">✦</span><div><small>Tilgængelige AI-credits</small><strong>${Credits.unlimited()?'Ubegrænsede':Credits.balance()}</strong><span>Credits på denne konto</span></div></article>
 </div></section>
 <section class="finance-insights-grid">
 <div class="finance-panel finance-breakdown-panel"><div class="finance-panel-head"><div><span class="finance-section-kicker">INDTÆGTER OG UDGIFTER</span><h2>Fordeling efter kategori</h2><p class="mu">Baseret på registrerede posteringer i perioden.</p></div></div>
 ${['income','expense'].map(type=>{const rows={};L.filter(e=>e.type===type).forEach(e=>rows[e.cat||'Andet']=(rows[e.cat||'Andet']||0)+e.amount);const total=type==='income'?inc:exp;return `<div class="finance-category-group"><div class="finance-category-title"><span class="finance-pill ${type}">${type==='income'?'Indtægter':'Udgifter'}</span><strong>${fmt(total)}</strong></div>${Object.entries(rows).sort((a,b)=>b[1]-a[1]).map(([name,value])=>`<div class="finance-category-row"><div><span>${esc(name)}</span><strong>${fmt(value)}</strong></div><div class="finance-category-track"><i class="${type}" style="width:${total?value/total*100:0}%"></i></div></div>`).join('')||'<p class="finance-empty-note">Ingen registreringer endnu.</p>'}</div>`}).join('')}
 </div>
 <div class="finance-panel finance-health-panel"><div class="finance-panel-head"><div><span class="finance-section-kicker">NØGLETAL</span><h2>Økonomisk sundhed</h2><p class="mu">Beregnet ud fra dine registrerede tal.</p></div></div>
 <div class="finance-health-row"><span>Resultatmargin</span><strong>${inc?Math.round(res/inc*100)+'%':'–'}</strong></div>
 <div class="finance-health-row"><span>Gennemsnitlig indtægt pr. postering</span><strong>${L.filter(e=>e.type==='income').length?fmt(inc/L.filter(e=>e.type==='income').length):'–'}</strong></div>
 <div class="finance-health-row"><span>Indtægtsposteringer</span><strong>${L.filter(e=>e.type==='income').length}</strong></div>
 <div class="finance-health-row"><span>Udgiftsposteringer</span><strong>${L.filter(e=>e.type==='expense').length}</strong></div>
 <div class="finance-health-note">Disse nøgletal er baseret på manuelle registreringer – ikke bankdata.</div>
 </div></section> <section class="finance-panel finance-chart-panel"><div class="finance-panel-head"><div><span class="finance-section-kicker">ØKONOMISK UDVIKLING</span><h2>Indtægter og udgifter</h2><p class="mu">${periodLabel} · måned for måned</p></div><div class="finance-legend"><span><i class="income-dot"></i>Indtægter</span><span><i class="expense-dot"></i>Udgifter</span></div></div>
 ${L.length? `<div class="finance-chart finance-chart-${months}">${md.map(([k,i,e])=>`<div class="finance-chart-col"><div class="finance-chart-values"><span>${fmt(i)}</span><span>${fmt(e)}</span></div><div class="finance-chart-bars"><i class="finance-income-bar" style="height:${i?Math.max(4,i/mx*100):0}%"></i><i class="finance-expense-bar" style="height:${e?Math.max(4,e/mx*100):0}%"></i></div><small>${new Date(k+'-01T12:00:00').toLocaleDateString('da-DK',{month:'short',year:months===1?'numeric':undefined})}</small></div>`).join('')}</div>`:'<div class="finance-chart-empty"><span>▥</span><strong>Ingen posteringer i denne periode</strong><p>Registrér en indtægt eller udgift, så vises udviklingen her.</p></div>'}</section>
 <section class="finance-entry-panel"><div class="finance-entry-heading"><div><span class="finance-section-kicker">HOLD STYR PÅ ØKONOMIEN</span><h2>Ny postering</h2><p>Tilføj en indtægt eller udgift til dit regnskab.</p></div><span class="finance-entry-symbol">＋</span></div>
 <div class="finance-entry-type"><label for="finance-type">Posteringstype</label><select id="finance-type" data-ff="type"><option value="income" ${f.type==='income'?'selected':''}>↗ Indtægt</option><option value="expense" ${f.type==='expense'?'selected':''}>↘ Udgift</option></select></div>
 <div class="finance-form-grid"><label>Beløb (kr.)<input data-ff="amount" inputmode="decimal" placeholder="F.eks. 1.500" value="${esc(f.amount)}"></label><label>Dato<input type="date" data-ff="date" value="${esc(f.date)}"></label><label>Kategori<select data-ff="cat">${opt(FCAT[f.type],f.cat)}</select></label><label>Kunde (valgfri)<select data-ff="cust"><option value="">Ingen kunde</option>${cs.map(c=>`<option value="${c.id}" ${f.cust===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label class="finance-note-field">Note (valgfri)<input data-ff="note" placeholder="Tilføj en kort beskrivelse" value="${esc(f.note)}"></label></div>
 ${S.err?`<p class="err finance-error">${esc(S.err)}</p>`:''}<div class="finance-entry-actions"><span class="mu">Posteringen gemmes i dine lokale data.</span><button class="btn" data-act="fadd">＋ Tilføj postering</button></div></section>
 <section class="finance-lower"><div class="finance-panel"><div class="finance-panel-head"><div><span class="finance-section-kicker">KUNDER</span><h2>Indtægt pr. kunde</h2><p class="mu">Fordeling af indtægter i den valgte periode.</p></div></div>
 ${Object.keys(byC).length?`<div class="finance-customer-list">${Object.entries(byC).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="finance-customer-row"><span>${esc(cn(k))}</span><strong>${fmt(v)}</strong><div class="finance-customer-track"><i style="width:${v/Math.max(1,...Object.values(byC))*100}%"></i></div></div>`).join('')}</div>`:'<p class="finance-empty-note">Ingen kundeindtægter i perioden.</p>'}</div>
 <div class="finance-panel"><div class="finance-panel-head"><div><span class="finance-section-kicker">POSTERINGER</span><h2>Seneste posteringer</h2><p class="mu">Op til 30 poster i den valgte periode.</p></div><span class="finance-count">${L.length}</span></div>
 ${L.length?`<div class="finance-table-wrap"><table><tr><th>Dato</th><th>Type</th><th>Kategori</th><th>Kunde</th><th>Beløb</th><th></th></tr>${L.slice(0,30).map(e=>`<tr><td>${esc(e.date)}</td><td><span class="finance-pill ${e.type}">${e.type==='income'?'Indtægt':'Udgift'}</span></td><td>${esc(e.cat)}${e.note?`<div class="mu" style="margin:0">${esc(e.note)}</div>`:''}</td><td>${esc(cn(e.cust))}</td><td class="finance-amount ${e.type}">${e.type==='income'?'+':'−'}${fmt(e.amount)}</td><td><button class="btn ghost" data-act="fdel" data-id="${e.id}">${S.fdel===e.id?'Bekræft':'Slet'}</button></td></tr>`).join('')}</table></div>`:'<p class="finance-empty-note">Ingen posteringer i perioden.</p>'}</div></section>
 <p class="finance-foot">Tallene bygger på dine egne manuelle registreringer. Bank, betalingssystem og automatisk bogføring er endnu ikke tilsluttet.</p>`}


document.addEventListener('input',e=>{const d=e.target.dataset;if(d.ff){S.ff[d.ff]=e.target.value;if(d.ff==='type'){S.ff.cat=FCAT[S.ff.type][0];render()}}});
document.addEventListener('change',e=>{const d=e.target.dataset;if(e.target.matches('[data-dash-sort]')){S.dashSort=e.target.value;render();return}if(d.ff){S.ff[d.ff]=e.target.value;if(d.ff==='type'){S.ff.cat=FCAT[S.ff.type][0];render()}}});


function projectSeoAudit(p){
 const blocks=p.site.blocks||[],types=new Set(blocks.map(b=>b.type)),contact=blocks.find(b=>b.type==='contact')||{},hero=blocks.find(b=>b.type==='hero')||{};
 const checks=[
 ['Forsideoverskrift',!!String(hero.title||'').trim(),'Tilføj en tydelig H1-overskrift, der beskriver virksomheden og dens vigtigste ydelse.'],
 ['Kontaktoplysninger',!!(contact.phone||contact.email),'Tilføj virksomhedens rigtige telefonnummer og/eller e-mail.'],
 ['Ydelsesoversigt',types.has('services'),'Beskriv konkrete ydelser med korte, unikke forklaringer.'],
 ['Kontaktsektion',types.has('contact'),'Tilføj en kontaktsektion med en tydelig kontaktmulighed.'],
 ['FAQ-indhold',types.has('faq'),'Tilføj relevante spørgsmål og svar, som kunder faktisk søger efter.'],
 ['Billeder',blocks.some(b=>b.image||(b.images||[]).length),'Brug relevante, optimerede billeder med beskrivende alt-tekst.'],
 ['Lokal relevans',!!(p.site.meta&&p.site.meta.title),'Brug virksomhedsnavn og korrekt serviceområde naturligt i sidens indhold.'],
 ['Booking',types.has('booking'),'Tilføj kun booking, hvis virksomheden reelt tager imod tidsbestillinger.']
 ];
 return '# SEO- og kvalitetsrapport: '+p.name+'\n\nGenereret af PRIME WEBS AI. Dette er en redaktionel tjekliste – ikke en måling fra Google eller et løfte om placeringer.\n\n## Kontrolpunkter\n\n'+checks.map(([n,ok,h])=>'- ['+(ok?'x':' ')+'] **'+n+'** — '+(ok?'Fundet i hjemmesidens indhold.':h)).join('\n')+'\n\n## Anbefalinger før publicering\n\n- Kontrollér virksomhedsnavn, adresse, telefon, e-mail og åbningstider.\n- Skriv en unik sidetitel og metabeskrivelse til den færdige hjemmeside.\n- Kontrollér mobilvisning, kontrast, tastaturnavigation og formularer.\n- Tilføj korrekte juridiske oplysninger og privatlivspolitik, hvor det er relevant.\n- Tilslut eget domæne, HTTPS og Google Search Console efter publicering.\n- Test alle links og kontakt-/bookingflows med rigtige modtageroplysninger.\n';
}
function zipCrc32(bytes){let c=-1;for(let i=0;i<bytes.length;i++){c^=bytes[i];for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xEDB88320:0)}return(c^-1)>>>0}
function makeZip(files){
 const enc=new TextEncoder(),local=[],central=[];let offset=0;
 const u16=v=>[v&255,(v>>>8)&255],u32=v=>[v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];
 for(const f of files){const name=enc.encode(f.name),data=typeof f.data==='string'?enc.encode(f.data):f.data,crc=zipCrc32(data);
  const head=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...name]);
  local.push(head,data);const dir=new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...name]);
  central.push(dir);offset+=head.length+data.length;
 }
 const centralSize=central.reduce((n,x)=>n+x.length,0),end=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(centralSize),...u32(offset),...u16(0)]);
 return new Blob([...local,...central,end],{type:'application/zip'});
}
function downloadProjectZip(p){
 const files=[],html=Renderer.html(p);let packaged=html,n=0;
 const dataUrls=[...new Set((html.match(/data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+/g)||[]))];
 for(const url of dataUrls){const m=url.match(/^data:image\/(jpeg|png|webp|gif);base64,([\s\S]+)$/);if(!m)continue;const bin=atob(m[2]),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);const ext=m[1]==='jpeg'?'jpg':m[1],path='assets/images/image-'+(++n)+'.'+ext;files.push({name:path,data:bytes});packaged=packaged.split(url).join(path)}
 files.unshift({name:'index.html',data:packaged},{name:'site.json',data:JSON.stringify(p.site,null,2)},{name:'images.json',data:JSON.stringify(Imgs.all(),null,2)},{name:'SEO-CHECKLIST.md',data:projectSeoAudit(p)},{name:'README.md',data:'# '+p.name+'\n\nWebsite export from PRIME WEBS AI.\n\n- Open index.html to preview the website.\n- site.json contains the editable website structure.\n- Images embedded in the generated HTML are included in assets/images/.\n- Review all contact details, links, legal pages, forms and booking settings before publishing.\n\nThis export is static HTML. Dynamic form delivery, booking storage, analytics, authentication and domain hosting require separate services and configuration.\n'});
 const host=String(p.domain||'').trim().replace(/^https?:\/\//i,'').replace(/\/.*$/,'').toLowerCase();
 if(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(host)){files.push({name:'sitemap.xml',data:'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://'+host+'/</loc></url></urlset>'},{name:'robots.txt',data:'User-agent: *\nAllow: /\nSitemap: https://'+host+'/sitemap.xml\n'})}
 const blob=makeZip(files),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(String(p.name||'website').toLowerCase().replace(/[^a-z0-9æøå-]+/g,'-').replace(/^-|-$/g,'')||'website')+'.zip';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function vFiles(){
 const p=getP();if(!p)return vPick('files');
 const tab=S.fileTab||'index.html',files=[['index.html','HTML','Den færdige hjemmeside, som kan eksporteres.'],['site.json','JSON','Struktureret kilde til hjemmesideindhold og design.'],['README.md','DOCS','Kort projektbeskrivelse og filoversigt.'],['SEO-CHECKLIST.md','SEO','Tjekliste over indhold og publiceringsklarhed.']];
 const html=Renderer.html(p),data=tab==='index.html'?html:tab==='site.json'?JSON.stringify(p.site,null,2):tab==='SEO-CHECKLIST.md'?projectSeoAudit(p):'# '+p.name+'\n\nDette projekt er oprettet i PRIME WEBS AI.\n\n- index.html – genereret hjemmeside.\n- site.json – struktur, sektioner og designtema.\n- SEO-CHECKLIST.md – redaktionel SEO- og kvalitetskontrol.\n- Projektet kan redigeres i AI Chat eller Visuel editor.\n';
 const ext=tab.split('.').pop();
 return '<section class="file-workspace-head"><div><span class="dash-section-kicker">PROJECT WORKSPACE · FILES</span><h1>'+esc(p.name)+' / Filer</h1><p class="mu">Se, gennemgå og eksportér hjemmesidens filer. ZIP-eksporten indeholder HTML, JSON, billeder og en SEO-tjekliste.</p></div><div class="row"><button class="btn ghost" data-act="go" data-v="builder">Visuel editor</button><button class="btn ghost" data-act="go" data-v="edit">AI Chat</button><button class="btn" data-act="zipDownload">Download komplet ZIP</button></div></section><div class="file-workspace"><aside class="file-tree"><strong>Projektfiler</strong><small>ROOT / '+esc(p.name.toLowerCase().replace(/[^a-z0-9-]+/g,'-'))+'</small>'+files.map(x=>'<button class="file-tree-item '+(tab===x[0]?'active':'')+'" data-act="fileTab" data-file="'+x[0]+'"><span class="file-type">'+x[1]+'</span>'+x[0]+'</button>').join('')+'</aside><section class="file-viewer"><header><div><strong>'+tab+'</strong><small>'+((files.find(x=>x[0]===tab)||[])[2]||'')+'</small></div><span class="file-readonly">READ ONLY</span></header><textarea class="code file-code" readonly spellcheck="false">'+esc(data)+'</textarea><footer><span class="mu">'+data.length.toLocaleString('da-DK')+' tegn · '+ext.toUpperCase()+'</span><button class="btn ghost" data-act="fileDownload" data-file="'+tab+'">Download '+tab+'</button><button class="btn" data-act="zipDownload">Download ZIP</button></footer></section></div>';
}
function vLeads(){
 const leads=Storage.get('pw.leads',[]).filter(x=>x&&typeof x==='object'&&!Array.isArray(x));
 const q=String(S.leadFilter||'').trim().toLowerCase();
 const rows=leads.filter(x=>!q||[x.company,x.city,x.category,x.website,x.email,x.phone].join(' ').toLowerCase().includes(q));
 const field=(key,label,placeholder='')=>'<label class="lead-field"><span>'+label+'</span><input data-lead="'+key+'" placeholder="'+placeholder+'"></label>';
 return '<section class="lead-hero"><div><span class="finance-eyebrow">PRIME WEBS AI · GROWTH</span><h1>Lead Finder</h1><p>Find lokale virksomheder, undersøg deres online tilstedeværelse, og gem potentielle kunder ét sted.</p><div class="finance-tags"><span>'+leads.length+' gemte leads</span><span>Google Maps-søgning</span><span>CRM-liste</span></div></div><div class="lead-hero-orb" aria-hidden="true">⌕</div></section>'+
 '<section class="lead-panel lead-search-panel"><div class="finance-panel-head"><div><span class="finance-section-kicker">FIND VIRKSOMHEDER</span><h2>Søg efter lokale virksomheder</h2><p class="mu">Søgningen åbner Google Maps med dine søgeord. Automatisk dataindsamling og live lead-resultater kræver en tilsluttet virksomhedsdatakilde.</p></div></div>'+
 '<div class="lead-search-grid">'+field('category','Branche eller virksomhedstype','Fx malere, frisører, mekanikere')+field('city','By eller område','Fx Málaga, Fuengirola')+'</div><button class="btn" type="button" data-act="leadSearch">Søg virksomheder på Google Maps ↗</button></section>'+
 '<section class="lead-panel lead-add-panel"><div class="finance-panel-head"><div><span class="finance-section-kicker">LEAD MANAGEMENT</span><h2>Gem en potentiel kunde</h2><p class="mu">Tilføj oplysninger, når du har fundet en relevant virksomhed.</p></div></div><div class="lead-form-grid">'+field('company','Virksomhedens navn','Virksomhedsnavn')+field('leadCity','By','By')+field('leadCategory','Branche','Branche')+field('website','Hjemmeside','https://')+field('phone','Telefon','Telefonnummer')+field('email','E-mail','E-mailadresse')+'</div><button class="btn" type="button" data-act="leadSave">＋ Gem lead</button></section>'+
 '<section class="lead-panel"><div class="finance-panel-head"><div><span class="finance-section-kicker">DIN PIPELINE</span><h2>Gemte leads</h2><p class="mu">Dine leads gemmes i PRIME WEBS AI-workspace.</p></div><span class="finance-business-badge">'+rows.length+' vist</span></div><input class="lead-filter" type="search" data-lead-filter placeholder="Søg i dine gemte leads…" value="'+esc(S.leadFilter||'')+'">'+(rows.length?'<div class="finance-table-wrap"><table><thead><tr><th>Virksomhed</th><th>Branche / by</th><th>Kontakt</th><th>Website</th><th></th></tr></thead><tbody>'+rows.map(x=>'<tr><td><strong>'+esc(x.company||'Ukendt virksomhed')+'</strong></td><td>'+esc([x.category,x.city].filter(Boolean).join(' · '))+'</td><td>'+esc(x.phone||'')+(x.email?'<div class="mu">'+esc(x.email)+'</div>':'')+'</td><td>'+(x.website?'<a href="'+esc(/^https?:\/\//i.test(x.website)?x.website:'https://'+x.website)+'" target="_blank" rel="noopener">'+esc(x.website)+'</a>':'—')+'</td><td><button class="btn ghost" data-act="leadDelete" data-id="'+esc(x.id)+'">Slet</button></td></tr>').join('')+'</tbody></table></div>':'<div class="finance-chart-empty"><span>⌕</span><strong>Ingen gemte leads endnu</strong><p>Søg efter virksomheder, og gem de relevante kontakter her.</p></div>')+'</section>';
}
const V={leads:vLeads,dash:vDash,list:vDash,builder:vBuilder,code:vCode,edit:vEdit,templates:vTpl,files:vFiles,credits:vCred,customers:vCust,stats:vStats,finance:vFin,settings:vSet,admin:vAdmin};
S.bookings=S.bookings||[];
V.bookings=()=>{const rows=S.bookings||[],pending=rows.filter(x=>x.status==='pending').length,status={pending:'Afventer',accepted:'Accepteret',declined:'Afvist',cancelled:'Annulleret'};return `<section class="finance-hero"><div class="finance-hero-copy"><span class="finance-eyebrow">PRIME WEBS AI · BOOKING</span><h1>Bookingforespørgsler</h1><p>Alle online bookingforespørgsler fra dine kunders hjemmesider samlet ét sted.</p><div class="finance-tags"><span>${rows.length} i alt</span><span>${pending} afventer</span></div></div></section><section class="finance-panel"><div class="finance-panel-head"><div><h2>Seneste forespørgsler</h2><p class="mu">En booking er først endeligt aftalt, når virksomheden har bekræftet den.</p></div><button class="btn ghost" data-act="bookRefresh">Opdater</button></div>${rows.length?`<div class="finance-table-wrap"><table><tr><th>Dato / tid</th><th>Projekt</th><th>Kunde</th><th>Ydelse</th><th>Status</th><th>Handling</th></tr>${rows.map(x=>`<tr><td>${esc(x.requested_date)}<br>${String(x.requested_time||'').slice(0,5)}</td><td>${esc(x.projects&&x.projects.name||'Hjemmeside')}</td><td><strong>${esc(x.customer_name)}</strong><div class="mu">${esc(x.customer_email)}</div>${esc(x.customer_phone||'')}</td><td>${esc(x.service)}${x.notes?`<div class="mu">${esc(x.notes)}</div>`:''}</td><td>${status[x.status]||esc(x.status)}</td><td>${x.status==='pending'?`<button class="btn" data-act="bookStatus" data-id="${x.id}" data-status="accepted">Accepter</button> <button class="btn ghost" data-act="bookStatus" data-id="${x.id}" data-status="declined">Afvis</button>`: `<button class="btn ghost" data-act="bookStatus" data-id="${x.id}" data-status="pending">Sæt til afventer</button>`}</td></tr>`).join('')}</table></div>`:'<div class="finance-chart-empty"><span>▦</span><strong>Ingen bookingforespørgsler endnu</strong><p>Når en kunde sender en booking fra en offentliggjort hjemmeside, vises den her.</p></div>'}</section>`};

function ext(a,b){const id=b.dataset.id,d=b.dataset;
  if(a==='animationLevel'){const allowed=['none','subtle','advanced','immersive'];if(!allowed.includes(d.level))return 1;upd(S.id,q=>{q.site.meta=q.site.meta||{};q.site.meta.animation={level:d.level,scroll:d.level!=='none',floatingImages:d.level==='advanced'||d.level==='immersive',threeD:d.level==='immersive',animatedText:d.level!=='none'}});return 1}
  if(a==='go'){
     const target=d.v||'dash';
     if(target==='dash'||target==='list')S.view='dash';
     else if(target==='adminp')S.view='admin';
     else if(target==='edit'){S.view=S.id?'edit':'dash';S.miniTab='edit'}
     else if(target==='builder'){S.view=S.id?'builder':'new';S.miniTab='builder'}
     else if(['customize','media','preview','history','export'].includes(target)){S.view='builder';S.miniTab=target}
     else S.view=target;
     S.err='';S.out=null;S.msg='';S.rc=0;return 1;
   }
  if(a==='pick'||a==='build'){const chosen=Projects.all().find(p=>String(p.id)===String(id));if(!chosen){S.id=null;Storage.set('pw.activeProject','');S.view='dash';S.miniTab='edit';banner('Projektet kunne ikke åbnes. Dine gemte projekter er bevaret.');return 1}S.id=chosen.id;Storage.set('pw.activeProject',chosen.id);S.view=d.t==='edit'?'edit':'builder';S.miniTab=a==='build'?'edit':(d.t==='builder'?'builder':d.t==='customize'?'customize':d.t==='media'?'media':d.t==='preview'?'preview':d.t==='history'?'history':'edit');S.msg='';S.err='';S.del=null;return 1}
  if(a==='unpick'){S.id=null;return 1}
  if(a==='tpl'){const t=TPL[+d.i];if(!t)return 1;S.form={name:'',desc:t.d,style:t.s,ind:t.industry||'',svc:'',tone:'Professionel'};S.view='new';S.err='';return 1}
  if(a==='workMode'){Storage.set('pw.workMode',d.mode==='own'?'own':'clients');S.dashPrompt='';S.err='';S.view='list';return render()}
  if(a==='dashFilter'){S.dashFilter=d.filter||'all';return 1}
  if(a==='dashReset'){S.dashSearch='';S.dashFilter='all';return 1}
  if(a==='templateFilter'){S.templateCategory=d.filter||'Alle';return 1}
  if(a==='fileTab'){S.fileTab=d.file||'index.html';return 1}
  if(a==='zipDownload'){const p=getP();if(p)downloadProjectZip(p);return 1}
  if(a==='fileDownload'){const p=getP();if(!p)return 1;const tab=d.file||'index.html',content=tab==='index.html'?Renderer.html(p):tab==='site.json'?JSON.stringify(p.site,null,2):tab==='SEO-CHECKLIST.md'?projectSeoAudit(p):'# '+p.name+'\n\nGenereret i PRIME WEBS AI.\n\n- index.html: hjemmeside\n- site.json: struktureret indhold og design\n- SEO-CHECKLIST.md: redaktionel tjekliste\n';const blob=new Blob([content],{type:tab.endsWith('.html')?'text/html;charset=utf-8':tab.endsWith('.json')?'application/json;charset=utf-8':'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=tab;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);return 1}
  if(a==='threeModelRemove'){upd(S.id,q=>{const block=q.site.blocks[+d.i];if(!block||block.type!=='threeD')return;q.history=[...q.history,structuredClone(q.site)].slice(-30);q.future=[];block.modelData='';block.modelName='';block.modelFormat='glb'});return 1}
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
  if(a==='bkDownload'){const data=snap(),blob=new Blob([data],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a'),stamp=new Date().toISOString().replace(/[:.]/g,'-');a.href=url;a.download='primewebs-backup-'+stamp+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);S.msg='Sikkerhedskopien er downloadet.';return 1}
  if(a==='rs'){if(!S.rc){S.rc=1;S.msg='';return 1}S.rc=0;
    try{const x=JSON.parse(S.rv||'');if(x.app!=='primewebs'||!Array.isArray(x.projects))throw 0;Projects.save(x.projects);Customers.save(x.customers||[]);if(Array.isArray(x.leads))Storage.set('pw.leads',x.leads.filter(v=>v&&typeof v==='object'&&!Array.isArray(v)).slice(0,5000));Storage.set('pw.settings',{...(x.settings||{}),aiCode:Settings.get().aiCode});Fin.save(Array.isArray(x.finance)?x.finance:[]);{const im={};Object.entries(x.images||{}).forEach(([k,v])=>{if(/^[a-z0-9]{3,12}$/.test(k)&&/^data:image\/(jpeg|png|webp|gif);base64,/.test(v))im[k]=v});Storage.set('pw.img',im)}if(x.credits!=null)Storage.set('pw.credits',x.credits);S.rv='';S.msg='Gendannet: '+x.projects.length+' hjemmesider.'}catch(e){S.msg='Fejl: kopien kunne ikke læses.'}return 1}
}


function ext2(a,b){const d=b.dataset;
  if(a==='leadSearch'){const category=String(document.querySelector('[data-lead="category"]')?.value||'').trim(),city=String(document.querySelector('[data-lead="city"]')?.value||'').trim();if(!category||!city){banner('Skriv både virksomhedstype og by.');return 1}window.open('https://www.google.com/maps/search/'+encodeURIComponent(category+' in '+city),'_blank','noopener');return 1}
  if(a==='leadSave'){const get=k=>String(document.querySelector('[data-lead="'+k+'"]')?.value||'').trim();const company=get('company');if(!company){banner('Skriv virksomhedens navn før du gemmer.');return 1}const leads=Storage.get('pw.leads',[]);leads.unshift({id:uid(),company,city:get('leadCity'),category:get('leadCategory'),website:get('website'),phone:get('phone'),email:get('email'),createdAt:Date.now(),source:'manual'});Storage.set('pw.leads',leads.slice(0,5000));banner('Lead gemt i din pipeline.');return 1}
  if(a==='leadDelete'){const leads=Storage.get('pw.leads',[]);Storage.set('pw.leads',leads.filter(x=>String(x.id)!==String(d.id)));banner('Lead slettet.');return 1}
  if(a==='domSearch'){S.domainQuery=String(document.querySelector('[data-dom-query]')?.value||'').trim();S.domSearched=true;return 1}

  if(a==='grp'){const n=Storage.get('pw.nav',{});n[d.g]=n[d.g]===0?1:0;Storage.set('pw.nav',n);return 1}
  if(a==='miniTab'){S.view='builder';S.miniTab=d.tab;S.err='';S.out=null;return 1}
  if(a==='billing'){S.pricingPeriod=['monthly','sixmonth','annual'].includes(d.p)?d.p:'monthly';return 1}
  if(a==='fp'){S.fp=d.p;return 1}
  if(a==='fadd'){const f=S.ff,amt=parseFloat(String(f.amount).replace(',','.'));
    if(!(amt>0)){S.err='Skriv et beløb større end 0.';return 1}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(f.date)){S.err='Vælg en dato.';return 1}
    Fin.save([{id:uid(),type:f.type,amount:Math.round(amt*100)/100,date:f.date,cat:f.cat,cust:f.cust||null,note:f.note.trim().slice(0,200)},...Fin.all()]);S.ff={...f,amount:'',note:''};S.err='';return 1}
  if(a==='fdel'){if(S.fdel===d.id){Fin.save(Fin.all().filter(e=>e.id!==d.id));S.fdel=null}else S.fdel=d.id;return 1}
  return 0}


V.whatsnew=()=>`<section class="sd-page-hero"><div><span class="sd-eyebrow">PRIME WEBS AI · UPDATES</span><h1>What's new</h1><p>New features and improvements in your workspace.</p></div></section><div class="sd-help-grid"><article class="sd-help-card"><h2>Website Studio</h2><p>Build, edit and preview your websites from one workspace.</p><button class="btn" data-act="go" data-v="new">Open Builder</button></article><article class="sd-help-card"><h2>Dashboard refresh</h2><p>A cleaner project workspace inspired by modern AI website builders.</p><button class="btn ghost" data-act="go" data-v="dash">Open Dashboard</button></article></div>`;
V.university=()=>`<section class="sd-page-hero"><div><span class="sd-eyebrow">PRIME WEBS AI · LEARN</span><h1>University</h1><p>Practical guides to building, improving and launching better websites.</p></div><div class="sd-hero-symbol">✦</div></section><div class="sd-learning-grid"><a class="sd-learning-card" href="https://sitedrop.ai/tutorials" target="_blank" rel="noopener"><span>01 · GETTING STARTED</span><h2>Your first website</h2><p>Plan a website, choose a direction and turn a brief into a working first draft.</p><b>Explore learning resources ↗</b></a><a class="sd-learning-card" href="https://sitedrop.ai/tutorials" target="_blank" rel="noopener"><span>02 · DESIGN & EDITING</span><h2>Design and refine</h2><p>Learn how to structure sections, improve copy, work with images and polish responsive layouts.</p><b>Explore learning resources ↗</b></a><a class="sd-learning-card" href="https://sitedrop.ai/tutorials" target="_blank" rel="noopener"><span>03 · PUBLISHING</span><h2>Prepare to launch</h2><p>Understand domains, hosting, forms, quality checks and what a live website needs.</p><b>Explore learning resources ↗</b></a></div><p class="mu">Learning links open external resources. PRIME WEBS AI's own course library is not yet connected.</p>`;
V.help=()=>`<section class="sd-page-hero"><div><span class="sd-eyebrow">PRIME WEBS AI · SUPPORT</span><h1>Help Center</h1><p>Find your way around the workspace and get help with the most common tasks.</p></div><div class="sd-hero-symbol">?</div></section><div class="sd-help-grid"><article class="sd-help-card"><h2>Building a website</h2><p>Start in Builder, describe the business and its goals, then generate a first draft. Open the project in Website Studio to edit it.</p><button class="btn" data-act="go" data-v="new">Open Builder</button></article><article class="sd-help-card"><h2>Editing a website</h2><p>Use AI Chat Editor for prompt-based changes, Visual Editor for sections, and Live Preview to check the result.</p><button class="btn ghost" data-act="go" data-v="edit">Open Website Studio</button></article><article class="sd-help-card"><h2>Projects and customers</h2><p>Keep customer details and website projects organised in the workspace. Check project ownership before sharing anything.</p><button class="btn ghost" data-act="go" data-v="customers">Open Clients</button></article><article class="sd-help-card"><h2>Domains and publishing</h2><p>Review the domain workspace for current project settings. Live domain purchasing and automated publishing are not connected yet.</p><button class="btn ghost" data-act="go" data-v="domains">Open Domains</button></article></div><section class="sd-help-contact"><div><h2>Need a hand?</h2><p>Contact the PRIME WEBS AI team for assistance with your workspace.</p></div><a class="btn" href="mailto:primewebssupport@gmail.com">Contact support ↗</a></section>`;
function render0(){
  const searchWasFocused=!!document.querySelector('[data-q]:focus');
  const th=Settings.get().theme;if(th==='auto')delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=th;
  {const ac=Settings.get().accent,rs=document.documentElement.style;if(/^#[0-9a-fA-F]{6}$/.test(ac||'')){rs.setProperty('--ac',ac);rs.setProperty('--ai',lum(ac)>150?'#0E1320':'#fff');rs.setProperty('--so',ac+'26')}else['--ac','--ai','--so'].forEach(k=>rs.removeProperty(k))}
  const u=Session.user();
  const nav=`<aside class="side sd-sidebar"><a class="sd-brand" href="#" data-act="go" data-v="dash"><span class="sd-brand-mark">▰</span><span>PRIME WEBS</span></a><div class="sd-sidebar-nav">${navHtml()}</div><div class="sd-sidebar-bottom"><button class="sd-mode-card" data-act="workMode" data-mode="${Storage.get('pw.workMode','clients')==='own'?'clients':'own'}"><span class="sd-mode-icon">◉</span><span><strong>${Storage.get('pw.workMode','clients')==='own'?'For yourself':'For Clients'}</strong><small>${Storage.get('pw.workMode','clients')==='own'?'Build your own app':'Build & sell to businesses'}</small></span><b>⌄</b></button><button class="sd-credit-card" type="button" data-act="go" data-v="credits" aria-label="Open credits, usage and subscription"><span class="sd-credit-icon">✣</span><span><strong>${Credits.unlimited()?'∞':Credits.balance()} credits</strong><small>Remaining · View plan & billing</small></span><b>→</b></button><button class="sd-user-card" data-act="go" data-v="settings"><span class="sd-avatar">${esc((u.name||'U').trim().charAt(0).toUpperCase())}</span><span><strong>${esc(u.name||'Account')}</strong><small>Pro · Monthly</small></span><b>↗</b></button><div class="sd-sidebar-weather"><span>☼</span><span>PRIME WEBS AI</span><small>${AI.mode==='api'?'AI connected':'Workspace'}</small></div></div></aside>`;
  $('#app').innerHTML=`<div class="shell">${nav}<main class="main">${safeView()}</main></div>`;
  // Dashboard preview and edit actions use the same delegated handler.
  // This keeps one click path for every project card and avoids competing listeners.
  const c=$('.msgs');if(c)c.scrollTop=c.scrollHeight;
  const i=$('#chatin');if(i&&!S.busy)i.focus();
  const mq=$('[data-q]');if(searchWasFocused&&mq){mq.focus();mq.setSelectionRange(mq.value.length,mq.value.length)}
}

function ensureIndustry3D(site,prompt,previousSite){
  if(!site||!Array.isArray(site.blocks))return site;
  const text=String(prompt||'').toLowerCase();
  const removing=/\\b(remove|delete|fjern|slet)\\b.{0,30}\\b(3d|three.?d|model|modeller)\\b/.test(text);
  const barber=/barber|barbershop|frisør|frisørsalon|hairdresser|hair salon|hårsalon/.test(text);
  const salon=/salon|skønhedsklinik|beauty clinic|beauty salon|kosmetolog|negletekniker|nail studio|spa|wellness/.test(text);
  const mechanic=/mekaniker|automekaniker|automekanik|bilmekanik|autoværksted|bilværksted|bilmekaniker|garage|car repair|auto repair|mechanic|automotive/.test(text);
  const tire=/dæk|bildæk|hjul|tire|tyre|wheel/.test(text);
  const architecture=/arkitekt|arkitektur|architecture|interior design|indretningsarkitekt|ejendomsudvikling|property development/.test(text);
  const ecommerce=/webshop|e-commerce|ecommerce|online store|produktbrand|product brand|product design|møbler|furniture|smykker|jewelry|ure|watches/.test(text);
  const technology=/teknologi|technology|software|saas|app development|it company|tech company|gaming|spiludvikling|game studio/.test(text);
  const fitness=/fitness|fitnesscenter|gym|personlig træner|personal trainer|yoga|pilates|sportsklub|sports club/.test(text);
  const painter=/maler|malerfirma|malerarbejde|maling|paint(er|ing)?|decorator/.test(text);
  const lighting=/lampe|lamper|belysning|lighting|light fixtures|lamp shop/.test(text);
  const explicit=/\\b3d\\b|three.?d|interaktiv.{0,12}(model|figur|objekt)|drej.{0,12}(model|objekt)/.test(text);
  const old=previousSite&&Array.isArray(previousSite.blocks)?previousSite.blocks.filter(b=>b&&b.type==='threeD'): [];
  if(!removing&&old.length){
    const present=new Set(site.blocks.filter(b=>b&&b.type==='threeD').map(b=>b.shape));
    old.forEach(b=>{
      if(site.blocks.filter(x=>x&&x.type==='threeD').length>=2)return;
      if(!present.has(b.shape)){
        const ci=site.blocks.findIndex(x=>x&&x.type==='contact');
        site.blocks.splice(ci<0?site.blocks.length:ci,0,structuredClone(b));
        present.add(b.shape);
      }
    });
  }
  if(removing)return site;
  let wanted=[];
  if(barber)wanted=['barber-chair','barber-pole'];
  else if(mechanic)wanted=tire?['car','wheel']:['car','engine'];
  else if(tire)wanted=['wheel','car'];
  else if(salon)wanted=['shampoo-bottle','scissors'];
  else if(architecture)wanted=['box','knot'];
  else if(ecommerce)wanted=['box','orb'];
  else if(technology)wanted=['torus','knot'];
  else if(fitness)wanted=['orb','torus'];
  else if(painter)wanted=['paint-roller','paint-bucket'];
  else if(lighting)wanted=['work-lamp','ceiling-lamp'];
  else if(explicit)wanted=['orb'];
  // Enforce industry-to-object matching: an auto/engine object must never appear on a barber site.
  if(barber){
    const scenes=site.blocks.filter(b=>b&&b.type==='threeD');
    if(scenes.length){
      scenes[0].shape='barber-chair';
      scenes[0].modelData='';
      scenes[0].modelUrl='';
      scenes[0].modelName='Barber Shop Chair 01';
      scenes[0].title=String(site.meta&&site.meta.language||'da').toLowerCase().startsWith('en')?'Real 3D barber chair':'Ægte 3D-barberstol';
      scenes[0].text=String(site.meta&&site.meta.language||'da').toLowerCase().startsWith('en')?'Explore a detailed, real-world barber chair in 3D. Scroll to see it rotate.':'Oplev en detaljeret barberstol i 3D. Scroll ned, og se den dreje rundt.';
      scenes.slice(1).forEach(b=>{b.shape='barber-pole';b.modelData='';b.modelUrl='';b.modelAsset=''});
    }
  }
  // A mechanic site must never keep AI-generated generic orb/bubble scenes.
  // Reuse its first two 3D blocks and force them to a car + engine (or wheel for tyre shops).
  if(mechanic){
    const mechanicAssets=tire?['car','alloy-wheel']:['car','v8-engine'];
    const mechanicShapes=tire?['car','wheel']:['car','engine'];
    let scenes=site.blocks.filter(b=>b&&b.type==='threeD');
    while(scenes.length<2){
      const block={id:uid(),type:'threeD',shape:mechanicShapes[scenes.length],color:'#3B82F6',modelData:'',modelUrl:'',modelFormat:'glb'};
      const ci=site.blocks.findIndex(b=>b&&b.type==='contact');
      site.blocks.splice(ci<0?site.blocks.length:ci,0,block);
      scenes.push(block);
    }
    scenes=scenes.slice(0,2);
    const mechanicEnglish=String(site.meta&&site.meta.language||'da').toLowerCase().startsWith('en');
    const titles=mechanicEnglish?['Interactive 3D car','Detailed 3D engine']:['Interaktiv 3D-bil','Detaljeret 3D-motor'];
    scenes.forEach((block,index)=>{
      block.shape=mechanicShapes[index];
      block.modelAsset=mechanicAssets[index];
      block.modelData='';
      block.modelUrl='';
      block.modelFormat='glb';
      block.title=tire&&index===1?(mechanicEnglish?'Real alloy wheel and tyre':'Rigtigt alufælg og dæk'):titles[index];
      block.text=mechanicEnglish?'Drag with your mouse to rotate. Scroll down to zoom in and scroll up to zoom out.':'Træk med musen for at dreje modellen. Scroll ned for at zoome ind og op for at zoome ud.';
      block.color='#3B82F6';
    });
    const keep=new Set(scenes);
    site.blocks=site.blocks.filter(b=>!b||b.type!=='threeD'||keep.has(b));
  }
  if(painter||lighting){
    const shapes=painter?['paint-roller','paint-bucket']:['work-lamp','ceiling-lamp'];
    const scenes=site.blocks.filter(b=>b&&b.type==='threeD');
    while(scenes.length<2){const b={id:uid(),type:'threeD',shape:shapes[scenes.length],color:painter?'#D58A35':'#D6B45A',modelData:'',modelUrl:''};const ci=site.blocks.findIndex(x=>x&&x.type==='contact');site.blocks.splice(ci<0?site.blocks.length:ci,0,b);scenes.push(b)}
    const industryEnglish=String(site.meta&&site.meta.language||'da').toLowerCase().startsWith('en');
    scenes.slice(0,2).forEach((b,i)=>{b.shape=shapes[i];b.modelData='';b.modelUrl='';b.modelAsset='';b.modelFormat='glb';b.title=painter?(industryEnglish?'Interactive paint roller':'Interaktiv malerrulle'): (industryEnglish?'Interactive work lamp':'Interaktiv arbejdslampe');b.text=painter?(industryEnglish?'Explore painting tools in interactive 3D.':'Udforsk professionelt malerværktøj i interaktiv 3D.'): (industryEnglish?'Explore professional lighting in interactive 3D.':'Udforsk professionel belysning i interaktiv 3D.');b.color=painter?'#D58A35':'#D6B45A'});
    const keep=new Set(scenes.slice(0,2));site.blocks=site.blocks.filter(b=>!b||b.type!=='threeD'||keep.has(b));
  }
  const have=new Set(site.blocks.filter(b=>b&&b.type==='threeD').map(b=>b.shape));
  const english=String(site.meta&&site.meta.language||'da').toLowerCase().startsWith('en');
  const names=english?{
    'barber-chair':'Interactive barber chair','barber-pole':'Classic barber pole',
    car:'Interactive 3D car',engine:'Detailed 3D engine',
    'shampoo-bottle':'3D product display',scissors:'Interactive 3D scissors',
    box:'Interactive 3D form',knot:'3D design object',orb:'Interactive 3D model',torus:'Moving 3D form'
  }:{
    'barber-chair':'Interaktiv barberstol','barber-pole':'Klassisk barberstang',
    car:'Interaktiv 3D-bil',engine:'Detaljeret 3D-motor',
    'shampoo-bottle':'3D-produktvisning',scissors:'Interaktiv 3D-saks',
    box:'Interaktiv 3D-form',knot:'3D-designobjekt',orb:'Interaktiv 3D-model',torus:'3D-form i bevægelse'
  };
  const color=barber?'#C9A24B':mechanic?'#3B82F6':salon?'#D66B9B':architecture?'#A88A67':ecommerce?'#C9A24B':technology?'#6D7CFF':fitness?'#20A58A':'#6D7CFF';
  wanted.filter(shape=>!have.has(shape)).slice(0,Math.max(0,2-site.blocks.filter(b=>b&&b.type==='threeD').length)).forEach(shape=>{
    const block={id:uid(),type:'threeD',title:names[shape]||'Interaktiv 3D-model',text:english?'Rotate the model with your mouse or finger, and use zoom to explore the details.':'Drej modellen med musen eller fingeren, og brug zoom til at se detaljerne.',shape,color,modelData:'',modelFormat:'glb',modelName:''};
    const ci=site.blocks.findIndex(b=>b&&b.type==='contact');
    site.blocks.splice(ci<0?site.blocks.length:ci,0,block);
  });
  if(wanted.length){
    site.meta=site.meta||{};
    site.meta.animation={...(site.meta.animation||{}),level:'immersive',threeD:true};
  }
  return site;
}
// Industry-aware, openly licensed image enrichment. Images are searched on the server;
// only commercial-use licenses are requested and each image keeps visible attribution.
function ensureIndustryImages(site, prompt) {
  if (!site || !Array.isArray(site.blocks)) return site;
  const validImage = value => typeof value === 'string' &&
    (/^https?:\/\//i.test(value.trim()) || /^data:image\/(?:jpeg|png|webp|gif);base64,/i.test(value.trim()) || value.trim().startsWith('/'));
  const cleanBlocks = blocks => (Array.isArray(blocks)?blocks:[]).map(block => {
    if (!block || typeof block !== 'object') return block;
    const copy = { ...block };
    if (typeof copy.image === 'string' && !validImage(copy.image)) delete copy.image;
    if (Array.isArray(copy.images)) copy.images = copy.images.filter(x => validImage(typeof x === 'string' ? x : x && x.url));
    if(Array.isArray(copy.items))copy.items=copy.items.map(item=>{if(!item||typeof item!=='object')return item;const next={...item};if(next.image&&!validImage(next.image))delete next.image;return next});
    return copy;
  });
  site.blocks=cleanBlocks(site.blocks);
  if(Array.isArray(site.pages))site.pages=site.pages.map(page=>page&&typeof page==='object'?{...page,blocks:cleanBlocks(page.blocks)}:page);
  return site;
}
function imageSearchTerms(prompt) {
  const p=String(prompt||'').toLowerCase();
  const groups=[
    [/massør|massoer|massage|massage therapist|masseur|masseuse|massageklinik|sportsmassage|wellness massage/,'authentic real photograph of a professional massage therapist giving a back massage in a calm premium treatment room, natural light, real human therapist and client'],
    [/fysioterapeut|physiotherapist|physiotherapy|fysioterapi|physical therapy/,'real photograph of a physiotherapist working with a patient in a modern rehabilitation clinic, authentic professional treatment'],
    [/barber|barbershop|frisør|frisørsalon|hairdresser|hair salon/,'barber shop barber cutting hair'],
    [/mekaniker|autoværksted|bilværksted|garage|car repair|auto repair|mechanic/,'mechanic repairing vehicle'],
    [/dæk|bildæk|tire|tyre/,'real close-up photograph of premium car tyre and alloy wheel'],
    [/maler|painting|painter|decorator/,'house painting contractor'],
    [/lampe|lamper|belysning|lighting|light fixtures|lamp shop/,'lighting showroom lamp'],
    [/tømrer|carpenter|snedker|woodwork/,'professional carpenter woodworking custom joinery workshop'],
    [/elektriker|electrician|el-installatør/,'licensed electrician installing electrical equipment'],
    [/vvs|blikkenslager|plumber|plumbing/,'professional plumber pipe installation bathroom'],
    [/bygge|construction|entreprenør|contractor|murer|bricklayer/,'professional construction team building renovation'],
    [/restaurant|café|cafe|bistro|pizza|sushi|catering/,'restaurant chef preparing food modern restaurant interior'],
    [/frisør|salon|skønhed|beauty|spa|nail/,'professional beauty salon hair styling manicure'],
    [/fitness|gym|træning|yoga|pilates|personal trainer/,'modern fitness studio personal training'],
    [/tandlæge|dentist|klinik|fysioterapi|clinic|læge|doctor/,'modern dental medical clinic professional'],
    [/advokat|lawyer|jurist|accountant|revisor|consultant/,'professional law office business consulting workspace'],
    [/ejendom|estate|realtor|bolig|property/,'modern real estate home interior property agent'],
    [/hotel|overnatning|bed and breakfast|bnb/,'boutique hotel room interior hospitality'],
    [/fotograf|photographer|photo studio/,'professional photographer camera photo studio'],
    [/webshop|butik|shop|fashion|tøj|clothing|jewelry|smykker/,'modern retail boutique product display'],
    [/have|landskab|gardener|landscaping|gartner/,'professional gardener landscaping garden maintenance'],
    [/rengøring|cleaning|cleaner/,'professional cleaning service modern home'],
    [/hund|dog|dyrlæge|veterinarian|pet/,'veterinary clinic pet care dog grooming'],
    [/transport|logistik|delivery|flyttefirma|moving/,'professional logistics delivery van warehouse'],
    [/software|saas|technology|tech|it company|gaming/,'modern technology software team workstation'],
    [/accountant|bogholder|revisor|regnskab|accounting/,'professional accountant working with financial reports in modern office'],
    [/advokat|lawyer|law firm|jurist/,'professional lawyer in contemporary law office'],
    [/autoværksted|bilforhandler|car dealer|used cars|biludlejning|car rental/,'modern car showroom and professional automotive service workshop'],
    [/blomster|florist|flower shop/,'florist arranging fresh flowers in a flower studio'],
    [/event|bryllup|wedding|fest|party|venue/,'elegant event venue decorated for a celebration'],
    [/skole|kursus|undervisning|education|tutor|school/,'modern classroom and professional teacher helping students'],
    [/arkitekt|architecture|interior design|indretningsarkitekt/,'architectural interior design studio with material samples'],
    [/tattoo|tatovering/,'professional tattoo artist working in a clean tattoo studio'],
    [/dyrehandel|pet shop|grooming|hundesalon/,'professional dog grooming salon and pet care'],
    [/flytning|moving company|storage|opbevaring/,'professional moving team carrying furniture into a home'],
    [/autoværksted|mechanic|car repair/,'professional mechanic inspecting a vehicle on a workshop lift']
  ];
  const match=groups.find(([re])=>re.test(p));
  const brand=String(prompt||'').slice(0,120);
  return match?[match[1],brand+' business professional workspace',match[1]+' real commercial photography']:['professional small business team workplace',brand+' business services','real professional photography for '+brand];
}
async function enrichIndustryModels(site,prompt){
 if(!site||!Array.isArray(site.blocks))return site;
 const p=String(prompt||'').toLowerCase();
 const barber=/barber|barbershop|barber shop|frisør|frisørsalon|hairdresser|hair salon|hårsalon/.test(p);
 const salon=!barber&&/frisør|frisørsalon|hairdresser|hair salon|skønhedssalon|beauty salon|salon/.test(p);
 const tire=/dæk|bildæk|dækcenter|tire|tyre|fælg|alloy wheel/.test(p);
 const mechanic=/mekaniker|autoværksted|bilværksted|bilmekaniker|garage|car repair|auto repair|mechanic|automotive/.test(p)||tire;
 const muscleCar=/mustang|muscle car|muscle coupe|amerikansk muskelbil|amerikansk sportsvogn/.test(p);
 let assets=barber?['barber-chair','barber-pole']:salon?['salon-styling-chair','shampoo-backwash-unit']:mechanic?(tire?['car','alloy-wheel','tire-changer']:muscleCar?['muscle-coupe','v8-engine','car-lift','tire-changer']:['car','v8-engine','car-lift','tire-changer']):[];
 if(!assets.length)return site;
 const english=String(site.meta&&site.meta.language||'').toLowerCase().startsWith('en');
 const titles={
  'barber-chair':english?'Real 3D barber chair':'Ægte 3D-barberstol',
  'barber-pole':english?'Classic barber pole':'Klassisk barberstang',
  'salon-styling-chair':english?'Real salon styling chair':'Ægte frisørstol',
  'shampoo-backwash-unit':english?'Shampoo wash station':'Vaske- og shampoo-station',
  car:english?'Explore the grey sport sedan in 3D':'Udforsk den grå sports-sedan i 3D',
  'v8-engine':english?'Detailed V8 engine':'Detaljeret V8-motor',
  'alloy-wheel':english?'Real tyre and alloy wheel':'Rigtigt bildæk med alufælg',
  'muscle-coupe':english?'Detailed American muscle coupe':'Detaljeret amerikansk muscle coupé',
  'car-lift':english?'Two-post workshop car lift':'To-søjlet autolift',
  'tire-changer':english?'Professional tyre changing machine':'Professionel dækskiftemaskine'
 };
 const descriptions={
  'barber-chair':'Hydraulic Barber Chair by vinish.dev, CC BY 4.0.',
  'barber-pole':'Barber Pole by vinish.dev, CC BY 4.0.',
  'salon-styling-chair':'Salon Styling Chair by vinish.dev, CC BY 4.0.',
  'shampoo-backwash-unit':'Shampoo Backwash Unit by vinish.dev, CC BY 4.0.',
  car:'Sport Sedan by vinish.dev, CC BY 4.0.',
  'v8-engine':'V8 Engine by vinish.dev, CC BY 4.0.',
  'alloy-wheel':'Alloy Wheel by vinish.dev, CC BY 4.0.',
  'muscle-coupe':'Shaker Hood Coupe by vinish.dev, CC BY 4.0.',
  'car-lift':'Two Post Car Lift by vinish.dev, CC BY 4.0.',
  'tire-changer':'Tire Changer by vinish.dev, CC BY 4.0.'
 };
 for(const asset of assets){
  const shape=asset==='barber-chair'?'barber-chair':asset==='barber-pole'?'barber-pole':asset==='salon-styling-chair'?'barber-chair':asset==='shampoo-backwash-unit'?'shampoo-bottle':asset==='car'||asset==='muscle-coupe'?'car':asset==='v8-engine'?'engine':asset==='car-lift'?'work-lamp':asset==='tire-changer'?'wheel':'wheel';
  let block=site.blocks.find(x=>x&&x.type==='threeD'&&(x.modelAsset===asset||x.shape===shape));
  if(!block){block={id:uid(),type:'threeD',shape};const ci=site.blocks.findIndex(x=>x&&x.type==='contact');site.blocks.splice(ci<0?site.blocks.length:ci,0,block)}
  block.shape=shape;block.modelData='';block.modelUrl='';block.modelFormat='glb';block.modelAsset=asset;
  block.modelProvider='vinish.dev';block.modelLicense='CC BY 4.0';
  block.title=titles[asset];
  block.text=(english?'Drag to rotate the real 3D model. Use the controls to zoom; scroll the page normally. ':'Træk for at dreje den rigtige 3D-model. Brug knapperne til zoom, og scroll normalt på hjemmesiden. ')+descriptions[asset];
 }
 await Promise.all(site.blocks.filter(x=>x&&x.type==='threeD'&&assets.includes(x.modelAsset)).map(async block=>{
  try{const r=await fetch('/api/models',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({asset:block.modelAsset})});if(!r.ok)throw new Error('Model API returned '+r.status);const m=await r.json();if(m&&m.url){block.modelUrl=m.url;block.modelFormat='glb';block.modelProvider=m.provider;block.modelLicense=m.license;block.modelCredit=m.credit;block.modelCreditUrl=m.creditUrl;block.modelName=m.name}}
  catch(e){console.warn('Curated 3D model unavailable:',e&&e.message||e)}
 }));
 return site;
}
async function enrichIndustryImages(site,prompt,replaceGeneratedImages=false) {
  ensureIndustryImages(site,prompt);
  if(!site||!Array.isArray(site.blocks))return site;
  // On a brand-new website, replace AI-supplied/legacy remote stock images with
  // fresh industry-matched, attributed Openverse photos. Keep embedded user uploads.
  if(replaceGeneratedImages){
    const clearGeneratedImages=blocks=>(Array.isArray(blocks)?blocks:[]).map(block=>{
      if(!block||typeof block!=='object')return block;
      const copy={...block};
      if(typeof copy.image==='string'&&(copy.image.startsWith('http://')||copy.image.startsWith('https://'))){
        delete copy.image;delete copy.imageAttribution;delete copy.imageCreditUrl;delete copy.imageAlt;
      }
      if(Array.isArray(copy.images))copy.images=copy.images.filter(item=>{
        const url=typeof item==='string'?item:item&&item.url;
        return typeof url==='string'&&!(url.startsWith('http://')||url.startsWith('https://'));
      });
      if(Array.isArray(copy.items))copy.items=copy.items.map(item=>{
        if(!item||typeof item!=='object')return item;
        const next={...item};
        if(typeof next.image==='string'&&(next.image.startsWith('http://')||next.image.startsWith('https://'))){
          delete next.image;delete next.imageAttribution;delete next.imageCreditUrl;delete next.imageAlt;
        }
        return next;
      });
      return copy;
    });
    site.blocks=clearGeneratedImages(site.blocks);
    if(Array.isArray(site.pages))site.pages=site.pages.map(page=>page&&typeof page==='object'?{...page,blocks:clearGeneratedImages(page.blocks)}:page);
  }
  const heroBlock=site.blocks.find(b=>b&&b.type==='hero');
  const explicitHeroImage=/hero|forside|baggrund|background|cover|banner/i.test(String(prompt||''));
  const needsHero=!!heroBlock&&(!heroBlock.image||explicitHeroImage);
  const gallery=site.blocks.find(b=>b&&b.type==='gallery');
  const explicitImageRequest=/billede|billeder|foto|photos|images|image|gallery|galleri|picture|visuals/i.test(String(prompt||''));
  const needsGallery=explicitImageRequest||!gallery||!Array.isArray(gallery.images)||gallery.images.length<3;
  if(!needsHero&&!needsGallery)return site;
  try{
    const terms=imageSearchTerms(prompt);
    const responses=await Promise.all(terms.slice(0,3).map(query=>fetch('/api/images',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,limit:8})}).then(r=>r.ok?r.json():null).catch(()=>null)));
    const media=responses.flatMap(r=>r&&Array.isArray(r.images)?r.images:[]);
    const unique=Array.from(new Map(media.filter(x=>x&&x.url).map(x=>[x.url,x])).values());
    if(!unique.length)return site;
    const hero=site.blocks.find(b=>b&&b.type==='hero');
    if(hero&&needsHero){const x=unique.shift();hero.image=x.url;hero.imageAttribution=x.attribution;hero.imageCreditUrl=x.creditUrl;}
    const about=site.blocks.find(b=>b&&b.type==='about');
    if(about&&!about.image&&unique.length){const x=unique.shift();about.image=x.url;about.imageAttribution=x.attribution;about.imageCreditUrl=x.creditUrl;}
    // Give image-led service/feature cards their own relevant real photos, not just a hero and a gallery.
    for(const section of site.blocks.filter(b=>b&&['services','features'].includes(b.type))){
      for(const item of (Array.isArray(section.items)?section.items:[])){
        if(!item.image&&unique.length){const x=unique.shift();item.image=x.url;item.imageAlt=item.t||section.title||'Business service';item.imageAttribution=x.attribution;item.imageCreditUrl=x.creditUrl;}
      }
    }
    // Apply the same industry imagery to generated sub-pages, not only the homepage.
    for(const page of (Array.isArray(site.pages)?site.pages:[])){
      if(!page||!Array.isArray(page.blocks))continue;
      const pageHero=page.blocks.find(b=>b&&b.type==='hero');
      if(pageHero&&!pageHero.image&&unique.length){const x=unique.shift();pageHero.image=x.url;pageHero.imageAttribution=x.attribution;pageHero.imageCreditUrl=x.creditUrl;}
      for(const section of page.blocks.filter(b=>b&&['services','features'].includes(b.type))){
        for(const item of (Array.isArray(section.items)?section.items:[]))if(!item.image&&unique.length){const x=unique.shift();item.image=x.url;item.imageAlt=item.t||section.title||page.title||'Business service';item.imageAttribution=x.attribution;item.imageCreditUrl=x.creditUrl;}
      }
    }
    if(needsGallery){
      const images=unique.slice(0,6).map(x=>({url:x.url,attribution:x.attribution,creditUrl:x.creditUrl}));
      if(images.length){
        if(!gallery)site.blocks.push({id:'gallery-'+Math.random().toString(36).slice(2,9),type:'gallery',title:'Galleri',images});
        else gallery.images=images;
      }
    }
  }catch(error){console.warn('Industry image search unavailable:',error&&error.message||error)}
  return site;
}
function keepImages(previousSite, nextSite) {
  if (!nextSite || !Array.isArray(nextSite.blocks)) return nextSite;
  const previous = new Map(((previousSite && previousSite.blocks) || [])
    .filter(block => block && block.id).map(block => [String(block.id), block]));
  nextSite.blocks = nextSite.blocks.map(block => {
    if (!block || typeof block !== 'object') return block;
    const old = previous.get(String(block.id));
    if (!old) return block;
    const copy = { ...block };
    if (!copy.image && old.image) copy.image = old.image;
    if ((!Array.isArray(copy.images) || !copy.images.length) && Array.isArray(old.images)) copy.images = old.images;
    return copy;
  });
  return nextSite;
}
async function generate(){
  // Prevent duplicate project creation when mobile taps are delivered twice.
  if(S.busy)return;
  const f=S.form;
  if(!f.name.trim()){S.err='Skriv et navn til projektet.';return render()}
  if(!String(f.desc||'').trim()){S.err='Beskriv først hjemmesiden, du vil bygge.';return render()}
  if(Credits.balance()<Credits.cost.generate){S.err='Du har ikke nok credits.';return render()}
  S.err='';S.busy=true;render();
  let result;
  try { result=await AI.generate({name:f.name.trim(),description:f.desc.trim(),style:f.style,industry:f.ind||'',city:(f.city||'').trim(),services:(f.svc||'').trim(),tone:f.tone||'Professionel',language:f.lang||'Dansk',color:f.color||'',background:f.background||'',phone:(f.phone||'').trim()||(f.desc.match(RX_TEL)||[''])[0].trim()||Settings.get().phone,email:(f.email||'').trim()||(f.desc.match(RX_MAIL)||[''])[0]||Settings.get().email}); }
  catch(error){S.busy=false;S.err=error.message||'AI-generatoren kunne ikke kontaktes.';return render()}
  if(!result||!result.site||!Array.isArray(result.site.blocks)){S.busy=false;S.err='Generatoren returnerede ikke en gyldig hjemmeside. Prøv igen.';return render()}
  const site=result.site;
  site.meta=site.meta&&typeof site.meta==='object'?site.meta:{};
  site.meta.language=({Dansk:'da',English:'en',Español:'es',Deutsch:'de',Français:'fr'})[f.lang||'Dansk']||'da';
  const promptText=[f.name,f.desc,f.ind,f.svc].filter(Boolean).join(' ');
  ensureIndustry3D(site,promptText);
  await enrichIndustryImages(site,promptText,true);await enrichIndustryModels(site,promptText);
  Credits.spend('generate');
  const now=Date.now(),p={v:1,id:newProjectId(),ownerId:Session.user().id,workspaceMode:Storage.get('pw.workMode','clients')==='own'?'own':'clients',name:f.name.trim(),status:'draft',domain:null,plan:'free',createdAt:now,updatedAt:now,site,history:[],future:[],chat:[{r:'u',t:f.desc.trim()},{r:'ai',t:(result.reply||'Din hjemmeside er klar. Skriv, hvad du vil ændre.')}]};
  if(result.reply)p.chat=[{r:'u',t:f.desc.trim()},{r:'ai',t:result.reply}];
  Projects.save([p,...Projects.all()]);
  S.id=p.id;Storage.set('pw.activeProject',p.id);
  S.form={name:'',desc:'',style:'Moderne'};S.busy=false;S.view='builder';S.miniTab='edit';S.id=p.id;render();
}
async function send(t){
  t=String(t||'').trim();if(!t||S.busy)return;
  const p=getP();
  if(!p||!p.id){S.busy=false;S.err='Den valgte hjemmeside kunne ikke genfindes. Din besked er ikke sendt. Gå til Dashboard, og åbn projektet igen.';banner(S.err);render();return}
  if(Credits.balance()<Credits.cost.edit){upd(p.id,q=>{q.chat=Array.isArray(q.chat)?q.chat:[];q.chat.push({r:'u',t},{r:'ai',t:'Du har ikke flere credits til at udføre ændringen. Din besked er gemt.'})});return render()}
  const conversation=[...(p.chat||[]).slice(-13),{r:'u',t}];
  upd(p.id,q=>{q.chat=Array.isArray(q.chat)?q.chat:[];q.chat.push({r:'u',t})});
  S.busy=true;S.chatStatus='Jeg har modtaget din besked. Jeg arbejder på hjemmesiden nu…';render();
  try {
    const r=await AI.edit(p.site,t,conversation);
    if(!r||!r.site||!Array.isArray(r.site.blocks)){
      const reply=String(r&&r.reply||'Jeg kunne ikke bekræfte, at ændringen blev gennemført. Prøv at formulere ønsket lidt anderledes.');
      upd(p.id,q=>{q.chat=Array.isArray(q.chat)?q.chat:[];q.chat.push({r:'ai',t:reply})});
    } else {
      r.site=ensureIndustry3D(r.site,t,p.site);keepImages(p.site,r.site);r.site=await enrichIndustryImages(r.site,[p.name,t].join(' '));r.site=await enrichIndustryModels(r.site,[p.name,t].join(' '));
      const reply=String(r.reply||'Færdigt — jeg har opdateret hjemmesiden efter din besked. Kig i previewet, og fortæl mig, hvis du vil have flere ændringer.');
      upd(p.id,q=>{q.chat=Array.isArray(q.chat)?q.chat:[];q.history=[...(q.history||[]),q.site].slice(-30);q.future=[];q.site=r.site;q.chat.push({r:'ai',t:reply});Credits.spend('edit')});
    }
  } catch(error) {
    upd(p.id,q=>{q.chat=Array.isArray(q.chat)?q.chat:[];q.chat.push({r:'ai',t:'Jeg kunne ikke gennemføre ændringen: '+(error.message||'AI-forbindelsen svarede ikke. Din hjemmeside er ikke ændret.')})});
  }
  S.busy=false;S.chatStatus='';render();
}
function hist(a){upd(S.id,q=>{const from=a==='undo'?q.history:q.future,to=a==='undo'?q.future:q.history;if(!from.length)return;to.push(q.site);q.site=from.pop()})}

document.addEventListener('click',e=>{
  const target=e.target&&e.target.nodeType===1?e.target:e.target&&e.target.parentElement;
  const b=target&&target.closest&&target.closest('[data-act]');
  if(!b)return;
  const a=b.dataset.act,id=b.dataset.id;
  if(a==='bookRefresh'){window.PWDB.listBookings().then(x=>{S.bookings=x;render()}).catch(err=>banner('Kunne ikke hente bookinger: '+err.message));return}
  if(a==='bookStatus'){window.PWDB.updateBookingStatus(id,b.dataset.status).then(()=>window.PWDB.listBookings()).then(x=>{S.bookings=x;banner('Bookingstatus er opdateret.');render()}).catch(err=>banner('Kunne ikke opdatere booking: '+err.message));return}
  if(a==='grp'){const st=Storage.get('pw.nav',{});st[b.dataset.g]=st[b.dataset.g]===0?1:0;Storage.set('pw.nav',st);return render()}
  if(a==='sub'){const st=Storage.get('pw.nav',{}),k='s:'+b.dataset.k;st[k]=st[k]===1?0:1;Storage.set('pw.nav',st);return render()}
  if(ext2(a,b)||ext(a,b))return render();
  if(a==='renameStart'){const p=Projects.all().find(x=>x.id===id);if(p){S.renameId=id;S.renameValue=p.name||''}return render()}
  if(a==='renameCancel'){S.renameId=null;S.renameValue='';return render()}
  if(a==='renameSave'){const name=String(S.renameValue||'').trim().slice(0,80),all=Projects.all(),p=all.find(x=>x.id===id);if(!p||!name){banner('Skriv et projektnavn før du gemmer.');return render()}p.name=name;p.updatedAt=Date.now();Projects.save(all);S.renameId=null;S.renameValue='';banner('Projektnavnet er opdateret.');return render()}
  if(a==='duplicate'){duplicateProject(id);return render()}
  if(a==='gen')return generate();
  if(a==='dashGen'){const prompt=String(S.dashPrompt||'').trim();if(!prompt){S.err='Beskriv først, hvad du gerne vil bygge.';return render()}const words=prompt.replace(/^(build|create|make|lav|byg|opret)\s+(a|an|en|et)?\s*(website|site|hjemmeside|app|applikation)?\s*(for|til)?\s*/i,'').trim().split(/\s+/).slice(0,6).join(' ');S.form={...S.form,name:(words||'Nyt projekt').slice(0,48),desc:prompt,style:'Moderne'};S.err='';S.view='new';return generate()}

  if(a==='list'){S.view='dash';S.del=null}
  else if(a==='new'){S.view='new';S.err=''}
  else if(a==='del'){Projects.save(Projects.all().filter(p=>String(p.id)!==String(id)));if(String(S.id)===String(id)){S.id=null;Storage.set('pw.activeProject',null)}S.del=null;banner('Project deleted from your workspace.')}
  else if(a==='undo'||a==='redo')hist(a);
  else if(a==='dev')S.device=b.dataset.d;
  render();
});
document.addEventListener('input',e=>{const d=e.target.dataset;if(d.renameInput!==undefined)S.renameValue=e.target.value;if(d.f)S.form[d.f]=e.target.value;if(e.target.matches('[data-dash-prompt]'))S.dashPrompt=e.target.value;if(e.target.matches('[data-dash-search]'))S.dashSearch=e.target.value;if(e.target.matches('[data-template-q]'))S.templateQuery=e.target.value;if(d.g)S.cf[d.g]=e.target.value;if(d.lf)S.leadForm[d.lf]=e.target.value;if(e.target.matches('[data-only-book-date]'))S.onlyCallBookingDate=e.target.value;if(e.target.matches('[data-only-book-time]'))S.onlyCallBookingTime=e.target.value;if(e.target.matches('[data-lead-query]'))S.leadQuery=e.target.value;if(e.target.id==='rs')S.rv=e.target.value});
document.addEventListener('input',e=>{if(e.target.matches('[data-dash-search],[data-template-q]')){const selector=e.target.matches('[data-dash-search]')?'[data-dash-search]':'[data-template-q]',value=e.target.value,at=e.target.selectionStart;render();const next=document.querySelector(selector);if(next){next.focus();try{next.setSelectionRange(at,at)}catch(_){}}}});
document.addEventListener('change',e=>{const d=e.target.dataset,v=e.target.value;
  if(d.dashSort!==undefined){S.dashSort=v;render();return}
  if(d.proj!==undefined){const p=Projects.all().find(x=>String(x.id)===String(v));S.id=p?p.id:null;Storage.set('pw.activeProject',S.id);if(p){S.view='builder';if(!['edit','builder','customize','media','preview','history'].includes(S.miniTab))S.miniTab='edit'}render();return}
  if(d.b!==undefined){upd(S.id,q=>{q.history=[...q.history,structuredClone(q.site)].slice(-30);q.future=[];const b=q.site.blocks[+d.b];if(d.i!==undefined){const arr=Array.isArray(b[d.k])?b[d.k]:b.items;if(d.ik)arr[+d.i][d.ik]=v;else arr[+d.i]=v}else b[d.k]=v})}
  else if(d.dom)upd(d.dom,q=>{q.domain=v.trim()||null});
  else if(d.cp)upd(d.cp,q=>{q.customerId=v||null});
  else if(d.cu){const c=Customers.all(),u=c.find(x=>x.id===d.cu);if(u){u[d.cf]=v;Customers.save(c)}}
  else if(d.s)Settings.set(d.s,v);
  else if(e.target.matches('[data-lead-query]'))S.leadQuery=v;
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
  if(/^#[0-9a-f]{6}$/i.test(i.background||'')){
    const bg=i.background,lumBg=parseInt(bg.slice(1),16);
    const r=(lumBg>>16)&255,g=(lumBg>>8)&255,bgB=lumBg&255,brightness=(r*299+g*587+bgB*114)/1000;
    th.background=bg;th.surface=brightness>155?'#FFFFFF':'#252A35';
    th.text=brightness>155?'#111111':'#FFFFFF';th.mode='light';
  }
  if(/hele hjemmesiden.*rød|rød.*hele hjemmesiden|alt.*rødt|gennemgående.*rød|rødt farvetema|rød baggrund/.test(txt)){
    th.accent='#D12C3F';th.background='#D12C3F';th.surface='#B82032';
    th.text=/sort tekst|sort skrift|sort font/.test(txt)?'#111111':'#FFFFFF';
  } else if(/hele hjemmesiden.*grøn|grøn.*hele hjemmesiden|grønt farvetema|grøn baggrund/.test(txt)){
    th.accent='#1E8E5A';th.background='#1E8E5A';th.surface='#176F45';
    th.text=/sort tekst|sort skrift|sort font/.test(txt)?'#111111':'#FFFFFF';
  } else if(/hvid tekst|hvid skrift/.test(txt))th.text='#FFFFFF';
  else if(/sort tekst|sort skrift/.test(txt))th.text='#111111';
  if(/mørk|dark/.test(txt))th.mode='dark';
  if(/elegant|klassisk|eksklusiv/.test(txt)||i.tone==='Eksklusiv')th.font='serif';
  const clean=desc.replace(RX_MAIL,'').replace(RX_TEL,'').replace(/\s+/g,' ').trim();
  const hero=mk.hero(n,'');hero.text=b[2]+(city?' Vi findes i '+city+'.':'')+' Kontakt os i dag for en uforpligtende samtale.';
  const svc=mk.services(),list=(i.services?i.services.split(',').map(x=>x.trim()).filter(Boolean):b[3]).slice(0,6);
  if(list.length)svc.items=list.map(x=>({t:x.charAt(0).toUpperCase()+x.slice(1),d:'Vi tilbyder '+x.toLowerCase()+' med fokus på kvalitet og din tilfredshed.'}));
  const faq=mk.faq();faq.items=[{t:b[4][0],d:b[4][1]},...faq.items].slice(0,5);
  const cta=mk.cta(n);if(i.tone==='Venlig')cta.cta='Skriv til os';if(i.tone==='Energisk')cta.cta='Kom i gang nu';
  const wantsBooking=/\bbook(?:ing)?\s*(?:system|funktion|side)?\b|bestil\s+(?:en\s+)?tid|book\s+(?:en\s+)?tid|tidsbestilling|online\s+booking|lav\s+(?:et\s+)?booking(?:system|funktion|side)?/i.test(txt);
  const ct=mk.contact();ct.email=i.email||(desc.match(RX_MAIL)||[])[0]||Settings.get().email;ct.phone=i.phone||(desc.match(RX_TEL)||[''])[0].trim()||Settings.get().phone;
  const blocks=[hero,mk.features(),svc,mk.about(n,clean),mk.steps(),faq,cta];
  if(wantsBooking)blocks.push({id:uid(),type:'booking',title:'Book en tid',text:'Vælg en ydelse og send os din ønskede tid.',cta:'Book en tid'});
  blocks.push(ct);
  return{v:1,meta:{title:n,theme:th},blocks}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-x="fcol"]');if(b){S.form={...S.form,color:b.dataset.c};render()}});
/* ===== Farver: hjemmesidens design og dashboardets accentfarve ===== */
const swatch=(x,n,h,on)=>`<button type="button" class="swb" data-x="${x}" data-c="${h}" title="${n}" aria-label="${n}" aria-pressed="${on}" style="background:${h}"></button>`;
function designCard(p){const t=p.site.meta.theme,ac=String(t.accent).toLowerCase();
  return `<div class="card" style="margin-bottom:.8rem"><strong>Design</strong>
  <div class="sw" style="margin:.6rem 0"><span>Accentfarve</span>${Object.entries(PAL).map(([n,h])=>swatch('acc',n,h,ac===h.toLowerCase())).join('')}<input type="color" data-th="accent" value="${esc(t.accent||'#2540D9')}" title="Egen accentfarve" aria-label="Egen accentfarve"></div>
  <div class="sw" style="margin:.6rem 0"><span>Baggrundsfarve</span><input type="color" data-th="background" value="${/^#[0-9a-fA-F]{6}$/.test(t.background||'')?t.background:'#FFFFFF'}" title="Vælg hjemmesidens baggrundsfarve" aria-label="Vælg hjemmesidens baggrundsfarve"></div>
  <div class="row"><button class="btn ${t.mode==='light'?'':'ghost'}" data-x="mode" data-v="light">Lys</button><button class="btn ${t.mode==='dark'?'':'ghost'}" data-x="mode" data-v="dark">Mørk</button><button class="btn ${t.font==='sans'?'':'ghost'}" data-x="font" data-v="sans">Sans</button><button class="btn ${t.font==='serif'?'':'ghost'}" data-x="font" data-v="serif">Serif</button></div></div>`}
function setTheme(k,v){upd(S.id,q=>{q.history=[...q.history,structuredClone(q.site)].slice(-30);q.future=[];q.site.meta.theme[k]=v})}
document.addEventListener('click',e=>{const b=e.target.closest('[data-x]');if(!b)return;const d=b.dataset;
  if(d.x==='uiacc'){Settings.set('accent',d.c);render()}
  else if(d.x==='uireset'){Settings.set('accent','');render()}
  else if(d.x==='acc'){setTheme('accent',d.c);render()}
  else if(d.x==='mode'||d.x==='font'){setTheme(d.x,d.v);render()}});
document.addEventListener('change',e=>{const d=e.target.dataset;if(d.uiColor&&/^#[0-9a-fA-F]{6}$/.test(e.target.value)){Settings.set('accent',e.target.value);render()}else if(d.s){Settings.set(d.s,e.target.value);render()}else if(d.th&&/^#[0-9a-fA-F]{6}$/.test(e.target.value)){setTheme(d.th,e.target.value);if(d.th==='background'){const n=parseInt(e.target.value.slice(1),16),r=(n>>16)&255,g=(n>>8)&255,b=n&255,bright=(r*299+g*587+b*114)/1000;setTheme('surface',bright>155?'#FFFFFF':'#252A35');setTheme('text',bright>155?'#111111':'#FFFFFF');}render()}});
/* ===== Menu: farvegrupper, tællere og søgning ===== */
const GC={Dashboard:'#2540D9','Domæner og publicering':'#0E9AA7','Credits og abonnementer':'#E8730C',Finance:'#1E8E5A',System:'#6B7280','Lead værktøjer':'#7B3FD1'};
const NC={leads:'#8B6CFF',dash:'#2540D9',domains:'#0E9AA7',credits:'#E8730C',finance:'#1E8E5A',stats:'#38A3F1',settings:'#6B7280',colors:'#D6457F',contact:'#0E9AA7',adminp:'#7B3FD1',admin:'#7B3FD1',backup:'#8A5A3B'};
const CNT={list:()=>Projects.all().length,customers:()=>Customers.all().length,leads:()=>Storage.get('pw.leads',[]).length};
document.addEventListener('input',e=>{if(e.target.dataset.q!==undefined){S.q=e.target.value;render()}});
document.addEventListener('change',e=>{if(e.target.dataset.leadFilter!==undefined){S.leadFilter=e.target.value;render()}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset.q!==undefined){const f=$('.side .nv:not(.par)');if(f){S.q='';f.click()}}});
/* ===== Menu v2: undermenuer, hjemmeside-vælger og egne sider til redigering ===== */
const PT={edit:'AI Chat Editor',builder:'AI Website Builder',customize:'Tilpas design',media:'Billeder',preview:'Forhåndsvisning',history:'Versionshistorik'};
GC.Redigering='#0E9AA7';
function projPick(){return `<select class="ms" data-proj aria-label="Valgt hjemmeside"><option value="">Vælg hjemmeside…</option>${Projects.all().map(p=>`<option value="${p.id}" ${String(p.id)===String(S.id)?'selected':''}>${esc(p.name)}</option>`).join('')}</select>`}
const NAV_ICONS={
  dash:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  new:'<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8M12 18v4M12 8v6M9 11h6"/>',
  mini:'<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8M12 18v4M7 8h10"/>',
  customers:'<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  leads:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M8 10.5h5M10.5 8v5"/>',
  domains:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
  credits:'<circle cx="12" cy="12" r="9"/><path d="M16 8.5c-.7-.7-1.8-1.1-3.2-1.1-1.7 0-2.8.8-2.8 2s1 1.8 2.8 2.1 2.8.9 2.8 2.1-1.1 2-2.8 2c-1.4 0-2.5-.4-3.2-1.1M12.8 5.5v13"/>',
  stats:'<path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 6-7"/>',
  finance:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  settings:'<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.7Z"/>',
  colors:'<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.7-3.1 1.8 1.8 0 0 1 1.5-2.9H18a3 3 0 0 0 3-3c0-5-4-9-9-9Z"/><circle cx="7.5" cy="10" r="1"/><circle cx="11" cy="6.5" r="1"/><circle cx="16" cy="8" r="1"/>',
  contact:'<path d="M4 13v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="12" width="4" height="7" rx="2"/><rect x="17" y="12" width="4" height="7" rx="2"/><path d="M17 19a5 5 0 0 1-5 3h-1"/>',
  adminp:'<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
  admin:'<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.7Z"/>',

  group:'<path d="M4 5h16M4 12h16M4 19h16"/>'
};
function navIcon(k){return `<svg class="nav-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${NAV_ICONS[k]||NAV_ICONS.group}</svg>`}
function navHtml(){
 const mode=Storage.get('pw.workMode','clients')==='own'?'own':'clients';
 const item=(key,label)=>`<button class="sd-side-link ${(S.view===key||(key==='dash'&&S.view==='list')||(S.view==='mini'&&S.miniTab===key))?'active':''}" data-act="go" data-v="${key}"><span class="sd-side-icon">${navIcon(key)}</span><span>${label}</span>${key==='new'?'<em>NEW</em>':''}</button>`;
 return `<div class="sd-side-section-label">MENU</div>
 ${item('dash','Dashboard')}${item('new','Builder')}${item('leads','Lead Finder')}${item('domains','Domains')}${item('finance','Finance')}${item('whatsnew',"What's new")}${item('help','Help')}
 <div class="sd-side-account-label">ACCOUNT</div>${item('settings','Settings')}`;
}
const finMode=(m,title)=>{const h=vFin(),i=k=>h.indexOf('<!--'+k+'-->'),sl=(a,b)=>h.slice(i(a)+a.length+7,b?i(b):h.length);
  const head=h.slice(0,i('KPI')).replace('<h1>Finance</h1>','<h1>'+title+'</h1>');
  return head+(m==='o'?sl('KPI','FORM'):m==='l'?sl('FORM','CUST')+sl('LIST'):sl('CUST','LIST'))};
const PW_FIN_KEY='pw.financeProfile';function pwFinData(){var p=Storage.get(PW_FIN_KEY,{step:1,business:'',person:'',email:'',phone:'',method:'card'});if(p.method==='stripe'||p.method==='mastercard')p.method='card';if(p.version!==2){p.methods=Array.isArray(p.methods)?p.methods:(p.method==='paypal'?['paypal']:['card']);p.completed=false;p.step=1;p.version=2;Storage.set(PW_FIN_KEY,p)}return p}
V.finance=()=>vFin();V.finance=function(){
var css="<style>\n.pw-finance-page{max-width:900px;margin:0 auto;padding:28px 22px;color:#182230}\n.pw-finance-page .pw-page-head{margin:0 0 25px}\n.pw-finance-page .pw-eyebrow{font-size:11px;font-weight:800;letter-spacing:.13em;color:#667085}\n.pw-finance-page .pw-page-head h1{font-size:34px;line-height:1.15;letter-spacing:-.035em;margin:9px 0;color:#111827}\n.pw-finance-page .pw-page-head p,.pw-finance-page .pw-fin-card>p{color:#667085;line-height:1.6;margin:0}\n.pw-finance-page .pw-stepper{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 20px}\n.pw-finance-page .pw-step{display:flex;align-items:center;gap:10px;padding:12px;border:1px solid #e5eaf1;border-radius:12px;background:#fff;color:#667085}\n.pw-finance-page .pw-step>span{display:grid;place-items:center;width:28px;height:28px;flex:0 0 28px;border-radius:50%;background:#f1f4f9;font-weight:800}\n.pw-finance-page .pw-step b{font-size:13px}\n.pw-finance-page .pw-step.active{border-color:#4058d6;background:#f7f8ff;color:#24358c}\n.pw-finance-page .pw-step.active>span,.pw-finance-page .pw-step.done>span{background:#4058d6;color:#fff}\n.pw-finance-page .pw-fin-card{padding:28px;border:1px solid #e6eaf0;border-radius:17px;background:#fff;box-shadow:0 12px 34px #1720330a}\n.pw-finance-page .pw-fin-card h2{font-size:21px;margin:0 0 7px;color:#111827}\n.pw-finance-page .pw-fin-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:17px;margin-top:22px}\n.pw-finance-page .pw-fin-field{display:grid;gap:8px;font-size:13px;font-weight:700;color:#344054}\n.pw-finance-page .pw-fin-field input{box-sizing:border-box;width:100%;min-height:46px;padding:11px 13px;border:1px solid #d9e0e9;border-radius:10px;font:inherit;font-weight:400}\n.pw-finance-page .pw-method-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin-top:22px}\n.pw-finance-page .pw-method{display:flex;align-items:center;gap:12px;min-height:62px;padding:16px;border:1px solid #e0e6ef;border-radius:12px;cursor:pointer;font-weight:700}\n.pw-finance-page .pw-method:has(input:checked){border-color:#4058d6;background:#f7f8ff}\n.pw-finance-page .pw-method small{margin-left:auto;color:#667085;font-weight:500}\n.pw-finance-page .pw-info-note{margin-top:17px;padding:13px 15px;border-radius:10px;background:#f5f7fb;color:#667085;font-size:12px;line-height:1.55}\n.pw-finance-page .pw-review-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 22px;margin-top:20px}\n.pw-finance-page .pw-review-list>div{display:flex;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid #edf0f4;font-size:13px}\n.pw-finance-page .pw-review-list>div span{color:#667085}.pw-finance-page .pw-review-list>div b{text-align:right;overflow-wrap:anywhere}\n.pw-finance-page .pw-fin-actions{display:flex;align-items:center;gap:12px;margin-top:25px;padding-top:19px;border-top:1px solid #edf0f4}\n.pw-finance-page .pw-fin-actions .sp{flex:1}\n.pw-finance-page .pw-fin-actions .btn{min-height:43px;padding:0 20px;border-radius:10px;font-weight:700}\n.pw-finance-page .pw-live-pill{display:inline-block;margin-bottom:12px;padding:6px 9px;border-radius:20px;background:#eaf8f0;color:#16804a;font-size:10px;font-weight:800}\n@media(max-width:640px){.pw-finance-page{padding:18px 12px}.pw-finance-page .pw-step{display:grid;justify-items:center;gap:6px;padding:10px 3px}.pw-finance-page .pw-step b{font-size:11px}.pw-finance-page .pw-fin-fields,.pw-finance-page .pw-review-list,.pw-finance-page .pw-method-list{grid-template-columns:1fr}.pw-finance-page .pw-fin-card{padding:20px}}\n</style>";
var p=pwFinData(),n=Math.max(1,Math.min(3,+p.step||1));
var methods=['paypal','card'];
var selected=Array.isArray(p.methods)?p.methods:(p.method==='paypal'?['paypal']:['card']);
var methodLabel=function(v){return v==='paypal'?'PayPal':'Credit or debit card (Visa / Mastercard)'};
var methodList=selected.map(methodLabel).join(', ');
var field=function(k,label,type){return '<label class="pw-fin-field"><span>'+label+' *</span><input data-pw-fin="'+k+'" type="'+type+'" value="'+esc(p[k]||'')+'" required autocomplete="'+(k==='business'?'organization':k==='person'?'name':k==='email'?'email':'tel')+'"></label>'};
var steps=['Business Info','Payment Method','Review'];
var stepper='<div class="pw-stepper" aria-label="Setup progress">'+steps.map(function(x,i){return '<div class="pw-step '+(n===i+1?'active':n>i+1?'done':'')+'"><span>'+(n>i+1?'✓':i+1)+'</span><b>'+x+'</b></div>'}).join('')+'</div>';
var head='<header class="pw-page-head"><span class="pw-eyebrow">PRIME WEBS AI · FINANCE</span><h1>Set Up Your Business Details</h1><p>Set up your invoice details in three simple steps.</p></header>';
var body='';
if(n===1){
 body='<h2>Business Info</h2><p>Enter the details that should appear on your invoices.</p><div class="pw-fin-fields">'+field('business','Business Name','text')+field('person','Your Name','text')+field('email','Email','email')+field('phone','Phone Number','tel')+'</div>';
}else if(n===2){
 body='<h2>Payment Method</h2><p>Choose how your customers can pay invoices you send from PRIME WEBS AI. You can select one or both.</p><div class="pw-method-list">'+methods.map(function(m){return '<label class="pw-method"><input type="checkbox" data-pw-fin-method="'+m+'" '+(selected.includes(m)?'checked':'')+'> <span>'+(m==='paypal'?'PayPal':'Credit or debit card')+'</span>'+(m==='card'?'<small>Visa · Mastercard</small>':'')+'</label>'}).join('')+'</div><div class="pw-info-note">Card payments require a connected payment provider such as Stripe. PayPal requires a connected PayPal business account. Saving your choices here does not activate payment processing.</div>';
}else{
 body='<h2>Review &amp; Save</h2><p>Check your business details and payment methods before saving.</p><div class="pw-review-list">'+[['Business Name',p.business],['Your Name',p.person],['Email',p.email],['Phone Number',p.phone],['Payment Methods',methodList||'None selected']].map(function(x){return '<div><span>'+x[0]+'</span><b>'+esc(x[1]||'—')+'</b></div>'}).join('')+'</div><div class="pw-info-note">When you save, these details will be stored as your invoice business profile. Payment collection will only work after the relevant provider connection is completed.</div>';
}
if(p.completed){
 return css+'<section class="pw-finance-page"><header class="pw-page-head"><span class="pw-eyebrow">PRIME WEBS AI · FINANCE</span><h1>Business Details Saved</h1><p>Your invoice business profile has been saved.</p></header><section class="pw-fin-card"><div class="pw-live-pill">SAVED</div><div class="pw-review-list">'+[['Business Name',p.business],['Your Name',p.person],['Email',p.email],['Phone Number',p.phone],['Payment Methods',methodList]].map(function(x){return '<div><span>'+x[0]+'</span><b>'+esc(x[1]||'—')+'</b></div>'}).join('')+'</div><div class="pw-info-note">Payment processing is not active until the selected providers are connected and configured.</div><div class="pw-fin-actions"><button class="btn ghost" data-act="pwFinEdit">Edit Details</button><span class="sp"></span><button class="btn" data-act="go" data-v="invoices">Open Invoices →</button></div></section></section>';
}
return '<section class="pw-finance-page">'+head+stepper+'<section class="pw-fin-card">'+body+'<div class="pw-fin-actions">'+(n>1?'<button class="btn ghost" data-act="pwFinBack">Back</button>':'')+'<span class="sp"></span><button class="btn" data-act="'+(n===3?'pwFinFinish':'pwFinNext')+'">'+(n===3?'Save Profile':'Next →')+'</button></div></section></section>';
};
document.addEventListener('input',function(e){var k=e.target.dataset.pwFin;if(k){var p=pwFinData();p[k]=e.target.value;Storage.set(PW_FIN_KEY,p)}});
document.addEventListener('change',function(e){var k=e.target.dataset.pwFin;if(k){var p=pwFinData();p[k]=e.target.value;Storage.set(PW_FIN_KEY,p)}var m=e.target.dataset.pwFinMethod;if(m){var p=pwFinData();var arr=Array.isArray(p.methods)?p.methods:(p.method==='paypal'?['paypal']:['card']);p.methods=e.target.checked?Array.from(new Set(arr.concat(m))):arr.filter(function(x){return x!==m});p.method=p.methods[0]||'';Storage.set(PW_FIN_KEY,p)}});
document.addEventListener('click',function(e){var b=e.target.closest('[data-act]');if(!b)return;var a=b.dataset.act;if(a==='pwFinEdit'){var p=pwFinData();p.completed=false;p.step=1;Storage.set(PW_FIN_KEY,p);render()}if(a==='pwFinNext'){var p=pwFinData();if(+p.step===1&&(!p.business.trim()||!p.person.trim()||!p.email.trim()||!p.phone.trim())){banner('Complete all four Business Info fields first.');return}if(+p.step===2&&!(p.methods&&p.methods.length)){banner('Select PayPal, card, or both before continuing.');return}p.step=Math.min(3,(+p.step||1)+1);Storage.set(PW_FIN_KEY,p);render()}if(a==='pwFinBack'){var p=pwFinData();p.step=Math.max(1,(+p.step||1)-1);Storage.set(PW_FIN_KEY,p);render()}if(a==='pwFinFinish'){var p=pwFinData();if(!p.business.trim()||!p.person.trim()||!p.email.trim()||!p.phone.trim()||!(p.methods&&p.methods.length)){banner('Complete Business Info and select at least one payment method.');p.step=1;Storage.set(PW_FIN_KEY,p);render();return}p.completed=true;p.savedAt=new Date().toISOString();Storage.set(PW_FIN_KEY,p);banner('Business profile saved. Payment processing still needs provider setup.');render()}});
V.domains=function(){var ps=Projects.all(),ds=ps.filter(function(p){return String(p.domain||'').trim()}),un=ps.filter(function(p){return !String(p.domain||'').trim()});return '<section class="pw-domains-page"><header class="pw-page-head pw-domain-head"><div><span class="pw-eyebrow">PRIME WEBS AI · WORKSPACE</span><h1>Domains</h1><p>Every web address you have connected or saved, and which website it is intended for.</p></div><button class="btn" data-act="pwDomainFocus">＋ Connect a domain</button></header><div class="pw-domain-stats"><article><small>Live</small><b>0</b></article><article><small>Needs attention</small><b>'+ds.length+'</b></article><article><small>Not attached</small><b>'+un.length+'</b></article><article><small>Expiring soon</small><b>0</b></article></div><section class="pw-domain-list">'+(ds.length?ds.map(function(p){return '<article class="pw-domain-row"><span>◎</span><div class="pw-domain-main"><b>'+esc(p.domain)+'</b><small>Intended for '+esc(p.name)+' · Saved in workspace</small></div><span class="pw-domain-status">Needs DNS verification</span><button class="btn ghost" data-act="pwDomainRemove" data-id="'+esc(p.id)+'">Remove</button></article>'}).join(''):'<div class="pw-empty"><h2>No domains connected yet</h2><p>Connect a domain you already own, or save one to a project. Live registrar purchase and DNS checks are not available yet.</p></div>')+'</section><section class="pw-domain-add" id="pw-domain-connect"><div><h2>Connect a domain to a website</h2><p>Save the domain and project association. We will show the DNS setup instructions next; saving does not change DNS.</p></div><label>Domain name<input data-dom-query placeholder="example.com" autocomplete="url"></label><label>Website<select data-pw-domain-project><option value="">Choose a project</option>'+ps.map(function(p){return '<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>'}).join('')+'</select></label><button class="btn" data-act="pwDomainAttach">Save domain</button></section><p class="pw-inline-note">Status is not verified until DNS records are checked by a domain provider. PRIME WEBS AI does not currently purchase domains, change DNS, issue SSL certificates or publish sites to custom domains.</p></section>'};
V.leads=function(){var leads=Storage.get('pw.leads',[]).filter(function(x){return x&&typeof x==='object'}),q=String(S.leadFilter||'').toLowerCase(),rows=leads.filter(function(x){return [x.company,x.city,x.category,x.website,x.email,x.phone].join(' ').toLowerCase().includes(q)}),f=function(k,l,ph){return '<label class="pw-lead-field"><span>'+l+'</span><input data-lead="'+k+'" placeholder="'+ph+'"></label>'};return '<section class="pw-leads-page"><div class="pw-lead-topline"><span class="pw-eyebrow">PRIME WEBS AI · LEAD GENERATION</span><span class="pw-lead-usage">'+leads.length+' saved leads</span></div><header class="pw-lead-hero"><span class="pw-live-pill">LEAD FINDER</span><h1>Find your next <em>$1,000 client.</em></h1><p>Search a business category in any city. Review websites and contact details, then save qualified leads.</p><div class="pw-lead-search">'+f('category','BUSINESS TYPE','e.g. Painters, Barbershops, Dentists')+f('city','LOCATION','City, country or region')+'<button class="btn" data-act="leadSearch">⌕ Find Leads →</button></div><div class="pw-popular"><span>POPULAR</span>'+['Painters','Barbershops','Dental Practices','Restaurants','Auto Repair','Pet Groomers'].map(function(x){return '<button type="button" data-act="pwLeadPreset" data-value="'+x+'">'+x+'</button>'}).join('')+'</div></header><div class="pw-tip"><b>✦</b><span><strong>Tip: Target specific niches and smaller towns.</strong><small>Less saturated businesses can be easier to reach with a relevant offer.</small></span></div><section class="pw-lead-save"><h2>Save a business to your list</h2><div class="pw-lead-save-grid">'+f('company','BUSINESS NAME','Business name')+f('leadCity','CITY','City')+f('leadCategory','CATEGORY','Industry')+f('website','WEBSITE','https://')+f('phone','PHONE','Phone')+f('email','EMAIL','Email')+'</div><button class="btn" data-act="leadSave">＋ Save lead</button></section><section class="pw-lead-results"><div class="pw-section-head"><h2>My saved leads</h2><input type="search" data-lead-filter placeholder="Search saved leads" value="'+esc(S.leadFilter||'')+'"></div>'+(rows.length?'<div class="pw-lead-table-wrap"><table><thead><tr><th>Business</th><th>Category / city</th><th>Contact</th><th>Website</th><th></th></tr></thead><tbody>'+rows.map(function(x){return '<tr><td><b>'+esc(x.company||'Unknown')+'</b></td><td>'+esc([x.category,x.city].filter(Boolean).join(' · '))+'</td><td>'+esc(x.phone||'')+'<small>'+esc(x.email||'')+'</small></td><td>'+esc(x.website||'—')+'</td><td><button class="btn ghost" data-act="leadDelete" data-id="'+esc(x.id)+'">Delete</button></td></tr>'}).join('')+'</tbody></table></div>':'<div class="pw-empty"><h3>No saved leads yet</h3><p>Search for businesses and save the ones you want to contact.</p></div>')+'</section><p class="pw-inline-note">Live verified results, contact enrichment and search credits require a licensed business-data provider. The Find Leads action opens Google Maps; this page does not scrape or claim verified results.</p></section>'};
document.addEventListener('click',function(e){var b=e.target.closest('[data-act]');if(!b)return;var a=b.dataset.act,d=b.dataset;if(a==='pwDomainSearch'){banner('Domain purchasing and availability checks are not connected yet.')}if(a==='pwDomainFocus'){document.getElementById('pw-domain-connect')?.scrollIntoView({behavior:'smooth',block:'center'});document.querySelector('[data-dom-query]')?.focus()}if(a==='pwDomainRemove'){var removeId=d.id;upd(removeId,function(p){p.domain=null});banner('Domain association removed. The external domain itself is unchanged.');render()}if(a==='pwDomainAttach'){var domain=String(document.querySelector('[data-dom-query]')?.value||'').trim().toLowerCase().replaceAll('https://','').replaceAll('http://','').replaceAll('/',''),id=document.querySelector('[data-pw-domain-project]')?.value;if(!domain||!id){banner('Enter a domain and choose a project.');return}var labels=domain.split('.');if(labels.length<2||labels.some(function(part){return !part||part.length>63||!/^[a-z0-9-]+$/i.test(part)||part.startsWith('-')||part.endsWith('-')})){banner('Enter a valid domain, for example example.com.');return}if(Projects.all().some(function(p){return p.id!==id&&String(p.domain||'').toLowerCase()===domain})){banner('This domain is already assigned to another project.');return}upd(id,function(p){p.domain=domain});banner('Domain saved to project. DNS verification is still required.');render()}if(a==='pwFinEdit'){var p=pwFinData();p.completed=false;p.step=1;Storage.set(PW_FIN_KEY,p);render()}if(a==='pwLeadPreset'){var i=document.querySelector('[data-lead="category"]');if(i)i.value=d.value}});
V.new=function(){
 var f={name:'',desc:'',...S.form},ex=[['Restaurant or café','Menu, photo gallery and table reservations.'],['Salon or spa','Services, pricing and online booking.'],['Clinic or practice','Treatments, team and appointment requests.'],['Home services','Service areas and quote request form.']];
 var kind=String(f.ind||'Business'),name=String(f.name||'Your Business'),photo=kind==='Store'?'photo-1441986300917-64674bd600d8':kind==='Portfolio'?'photo-1497366754035-f200968a6e72':/restaurant|café/i.test(f.desc||'')?'photo-1517248135467-4c7edcad34c4':/salon|spa|beauty/i.test(f.desc||'')?'photo-1522337360788-8b13dee7a37e':/clinic|medical|dentist/i.test(f.desc||'')?'photo-1576091160399-112ba8d25d1d':'photo-1600585154340-be6161a56a0c';
 var site='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;color:#182238;background:#fff}.nav{height:58px;padding:0 6%;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eee;font-size:12px}.brand{font-weight:800;letter-spacing:-.4px}.links{display:flex;gap:20px;color:#657087}.cta{background:#347ce5;color:white;padding:10px 16px;border-radius:7px;font-weight:700}.hero{display:grid;grid-template-columns:1fr 1fr;min-height:290px;align-items:center;gap:24px;padding:38px 7%}.eyebrow{color:#347ce5;font-size:9px;letter-spacing:2px;font-weight:800}.hero h1{font-size:clamp(26px,4vw,45px);line-height:1.05;letter-spacing:-1.8px;margin:14px 0}.hero p{font-size:12px;color:#667085;line-height:1.7;max-width:340px}.hero img{width:100%;height:235px;object-fit:cover;border-radius:12px}.stats{display:flex;gap:28px;margin-top:20px;font-size:10px;color:#718096}.stats b{display:block;color:#182238;font-size:17px}.section{padding:24px 7% 35px;background:#f7f8fb}.section h2{font-size:21px;letter-spacing:-.7px}.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}.tile{background:#fff;border:1px solid #edf0f5;border-radius:10px;overflow:hidden}.tile img{width:100%;height:95px;object-fit:cover}.tile b{display:block;padding:10px;font-size:11px}.foot{padding:18px 7%;font-size:10px;color:#8791a2}@media(max-width:540px){.links{display:none}.hero{grid-template-columns:1fr;padding:25px 6%}.hero img{height:145px}.tiles{grid-template-columns:1fr 1fr}.section{padding:20px 6%}}</style></head><body><header class="nav"><span class="brand">✦ '+name+'</span><span class="links">Home　 About　 Services　 Contact</span><span class="cta">Get in touch</span></header><main><section class="hero"><div><span class="eyebrow">WELCOME TO '+name.toUpperCase()+'</span><h1>Quality you can see.<br>Service you can trust.</h1><p>A modern, welcoming website built around your business, your services and the people you serve.</p><span class="cta">Discover more →</span><div class="stats"><span><b>10+</b>Years experience</span><span><b>5★</b>Client service</span><span><b>100%</b>Dedicated</span></div></div><img src="https://images.unsplash.com/'+photo+'?auto=format&fit=crop&w=1000&q=85" alt="Business preview"></section><section class="section"><span class="eyebrow">WHAT WE DO</span><h2>Designed around your needs</h2><div class="tiles"><article class="tile"><img src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=500&q=80"><b>Professional service</b></article><article class="tile"><img src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=500&q=80"><b>Personal attention</b></article><article class="tile"><img src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=500&q=80"><b>Quality results</b></article></div></section></main><footer class="foot">Website concept preview · Built with PRIME WEBS AI</footer></body></html>';
 var frame=S.busy
 ? '<div class="pw-build-preview-state" role="status"><div class="pw-build-orbit"><i></i><i></i><i></i></div><span class="pw-build-kicker">PRIME WEBS AI · BUILD ENGINE</span><h2>Building your website</h2><p>Your live preview will appear here as soon as the AI has finished generating it.</p><div class="pw-build-progress"><i></i></div><small>Generating structure, content and design…</small></div>'
 : '<iframe class="pw-live-site-preview" title="Website design preview" sandbox="allow-same-origin" srcdoc="'+esc(site)+'"></iframe>';
 return '<section class="pw-builder-page"><header class="pw-builder-top"><button class="btn ghost" data-act="go" data-v="dash">←</button><b>PRIME WEBS AI · Website Builder</b><span class="sp"></span><span class="pw-save-indicator">'+(S.busy?'● AI is building':'● Ready to build')+'</span><button class="btn ghost" data-act="go" data-v="preview">Preview</button><button class="btn ghost" data-act="go" data-v="files">Code</button></header><div class="pw-builder-workspace"><aside class="pw-builder-controls"><div class="pw-builder-intro"><span class="pw-build-kicker">YOUR NEXT WEBSITE STARTS HERE</span><h1>Let’s build your website</h1><p>Tell PRIME WEBS AI what you need. Your request stays visible while the website is being created.</p></div><b class="pw-example-label">✧ Choose a starting point</b><div class="pw-builder-types">'+['Business','Startup','Portfolio','Store'].map(function(x){return '<button type="button" class="'+(kind===x?'selected':'')+'" data-act="pwBuilderType" data-value="'+x+'">'+x+'</button>'}).join('')+'</div><div class="pw-builder-examples">'+ex.map(function(x){return '<button type="button" data-x="ex" data-t="'+x[0]+'. '+x[1]+'"><b>'+x[0]+'</b><small>'+x[1]+'</small></button>'}).join('')+'</div><label class="pw-builder-prompt"><span class="pw-prompt-label">YOUR MESSAGE</span><textarea data-f="desc" placeholder="Describe the website you want to build…">'+esc(f.desc||'')+'</textarea><span class="pw-prompt-actions"><small>Be as detailed as you like</small><button class="btn" data-act="gen" '+(S.busy?'disabled':'')+'>'+(S.busy?'Building…':'↑ Build website')+'</button></span></label><label class="pw-builder-name">Business / project name<input data-f="name" value="'+esc(f.name||'')+'" placeholder="Your business name"></label>'+(S.busy?'<section class="pw-build-chat" aria-live="polite"><div class="pw-build-chat-head"><span class="pw-ai-avatar">✦</span><div><b>PRIME WEBS AI</b><small>Working on your website</small></div><span class="pw-live-dot"></span></div><div class="pw-build-user-message"><small>YOUR REQUEST</small><p>'+esc(f.desc||'')+'</p></div><div class="pw-build-thinking"><span class="pw-thinking-dots"><i></i><i></i><i></i></span><div><b>Creating your website</b><small>Planning the layout, writing content and preparing the live preview.</small></div></div></section>':'')+(S.err?'<p class="err">'+esc(S.err)+'</p>':'')+'</aside><section class="pw-builder-preview"><div class="pw-preview-browser"><span>● ● ●</span><b>'+esc((f.name||'yourbusiness')+'.com')+'</b><span class="pw-preview-label">'+(S.busy?'BUILDING · PREVIEW ON ITS WAY':'LIVE DESIGN PREVIEW')+'</span></div>'+frame+'</section></div></section>';
};
function errCard(e){
  const message=(e&&e.message)||String(e||'Ukendt fejl');
  const detail=e&&e.stack?String(e.stack):'';
  return '<section class="finance-panel" role="alert" style="max-width:760px;margin:3rem auto;padding:2rem"><span class="finance-section-kicker">PRIME WEBS AI · FEJL I VISNING</span><h1>Dette område kunne ikke indlæses</h1><p class="mu">Dine gemte data er bevaret. Fejlen er vist her, så den ikke bliver skjult af en ekstra opstartsfejl.</p><pre class="code" style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(message)+'</pre>'+(detail?'<details><summary>Tekniske detaljer</summary><pre class="code" style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(detail)+'</pre></details>':'')+'<div class="row" style="margin-top:1rem"><button class="btn" data-x="retry">Prøv igen</button><button class="btn ghost" data-act="go" data-v="dash">Til Dashboard</button></div></section>';
}
function safeView(){try{return(V[S.view]||vList)()}catch(e){console.error('PRIME WEBS AI view error:',e);pwProjectDiag('view-render-error',{view:S.view,selectedId:S.id||null,error:e&&e.message||String(e)});return errCard(e)}}
function fatal(e){console.error(e);let raw='';try{raw=Object.keys(localStorage).filter(k=>k.startsWith('pw.')).map(k=>k+' = '+localStorage.getItem(k)).join('\n\n')}catch(x){}
  $('#app').innerHTML=`<main class="main" style="max-width:720px;margin:6vh auto"><div class="card"><h1>Noget gik galt</h1><p class="err">${esc((e&&e.message)||e)}</p><p>Dine data er ikke slettet. Prøv igen, eller kopiér dem herfra til en fil som sikkerhed.</p><div class="row"><button class="btn" data-x="retry">Prøv igen</button><button class="btn ghost" data-x="home">Til Dashboard</button></div><label style="margin-top:1rem">Dine data (markér og kopiér)<textarea class="code" readonly>${esc(raw)}</textarea></label></div></main>`}
function render(){try{render0()}catch(e){fatal(e)}}
window.addEventListener('error',e=>banner('Der opstod en fejl: '+(e.message||'ukendt')));
window.addEventListener('unhandledrejection',e=>banner('Der opstod en fejl: '+((e.reason&&e.reason.message)||e.reason)));
{const _g=generate,_s=send;
 generate=async function(){try{await _g()}catch(e){S.busy=false;S.err='Kunne ikke oprette hjemmesiden: '+((e&&e.message)||e);render()}};
 send=async function(t){try{await _s(t)}catch(e){S.busy=false;banner('Kunne ikke gennemføre ændringen: '+((e&&e.message)||e));render()}}}
V.contact=()=>{const s=Settings.get();return '<div class="contact-page"><section class="settings-hero"><div><span class="settings-eyebrow">PRIME WEBS AI / VIRKSOMHED</span><h1>Kontakt</h1><p>Virksomhedens kontaktoplysninger og support samlet ét sted.</p></div><div class="settings-hero-icon">✉</div></section><div class="contact-layout"><section class="settings-card"><div class="contact-profile-top"><div class="settings-avatar">PW</div><div><span class="settings-overline">VIRKSOMHEDSPROFIL</span><h2>'+esc(s.company)+'</h2><p>Officielle kontaktoplysninger</p></div></div><a class="contact-detail" href="mailto:'+esc(s.email)+'"><span class="contact-detail-icon">✉</span><span><small>E-MAIL</small><strong>'+esc(s.email)+'</strong></span><b>↗</b></a><a class="contact-detail" href="tel:'+esc(s.phone.replace(/\s+/g,''))+'"><span class="contact-detail-icon">☎</span><span><small>TELEFON</small><strong>'+esc(s.phone)+'</strong></span><b>↗</b></a><a class="contact-detail" href="'+esc(s.web)+'" target="_blank" rel="noopener"><span class="contact-detail-icon">◎</span><span><small>HJEMMESIDE</small><strong>'+esc(s.web)+'</strong></span><b>↗</b></a><p class="settings-status-note">Du kan ændre oplysningerne under Indstillinger → Virksomhedsoplysninger.</p></section><section class="settings-card contact-message"><div class="settings-card-head"><span class="settings-card-icon violet">✉</span><div><h2>Send en besked</h2><p>Åbn en e-mail med din besked klar.</p></div></div><label class="settings-field"><span>Dit navn</span><input id="kn" placeholder="Skriv dit navn"></label><label class="settings-field"><span>Besked</span><textarea id="kb" rows="6" placeholder="Hvad kan vi hjælpe med?"></textarea></label><button class="btn contact-send" data-x="mail">Åbn i din mailapp <span>↗</span></button><p class="settings-status-note">Beskeden sendes først, når du selv trykker Send i din mailapp.</p></section></div></div>'};
document.addEventListener('click',e=>{const b=e.target.closest('[data-x="retry"],[data-x="home"],[data-x="closeerr"],[data-x="mail"]');if(!b)return;const x=b.dataset.x;
  if(x==='closeerr'){const r=document.getElementById('errbar');if(r)r.remove()}
  else if(x==='mail'){const n=($('#kn')||{}).value||'',m=($('#kb')||{}).value||'',a=document.createElement('a');a.href='mailto:'+Settings.get().email+'?subject='+encodeURIComponent('Henvendelse'+(n?' fra '+n:''))+'&body='+encodeURIComponent(m+(n?'\n\nMvh. '+n:''));a.click()}
  else{if(x==='home'){S.view='dash';S.err=''}render()}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&e.target.id==='chatin'){e.preventDefault();const form=document.getElementById('chat-form');if(form&&form.requestSubmit)form.requestSubmit()}});
document.addEventListener('submit',e=>{if(e.target&&e.target.id==='chat-form'){e.preventDefault();const input=e.target.querySelector('#chatin'),value=String(input&&input.value||'').trim();if(!value||S.busy)return;if(input)input.value='';send(value);}});
async function boot(){
  try{
    await window.PWDB.ready;
    if(!window.PWDB.user) return loginScreen();
    // PWDB.ready already restores the Supabase session and loads cloud data.
    // Do not immediately run a second cloud refresh during startup: it duplicates
    // the same queries/migrations and can prevent the dashboard from rendering.
    S.bookings=await window.PWDB.listBookings();
    S.auth={enabled:true,authenticated:true,email:window.PWDB.user.email};
    if(!openProjectRoute())render();
  }catch(e){
    window.__pwInitError=e&&e.message||'Supabase kunne ikke indlæses';
    // A cloud refresh/load failure is not proof that the user is signed out.
    // Keep the current workspace visible and let the user retry instead of ejecting them.
    if(window.PWDB&&window.PWDB.user){
      S.auth={enabled:true,authenticated:true,email:window.PWDB.user.email||''};
      render();
      setTimeout(()=>banner('Forbindelsen til cloud-data fejlede: '+window.__pwInitError+'. Dine lokale projektdata er bevaret. Genindlæs siden eller prøv igen.'),0);
    }else loginScreen();
  }
}
function loginScreen(){
  S.auth={enabled:false,authenticated:false,email:''};
  $('#app').innerHTML='<main class="main" style="max-width:520px;margin:8vh auto;padding:0 16px"><div class="card"><h1>PRIME WEBS AI</h1><h2>Log ind</h2><p class="mu">Log ind med din e-mail, eller brug ejerens admin-kode.</p><form id="pwEmailLogin" style="display:grid;gap:10px;margin:18px 0"><label>E-mail<input id="pwLoginEmail" type="email" autocomplete="email" required placeholder="Din e-mailadresse" style="width:100%;padding:12px;border:1px solid #bbb;border-radius:8px"></label><button class="btn" type="submit">Send login-kode</button></form><form id="pwOtpLogin" style="display:none;gap:10px;margin:12px 0"><label>6-cifret kode<input id="pwLoginOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="Kode fra din e-mail" style="width:100%;padding:12px;border:1px solid #bbb;border-radius:8px"></label><button class="btn" type="submit">Bekræft e-mailkode</button></form><div style="border-top:1px solid #ddd;margin:22px 0;padding-top:18px"><h3>Ejerlogin</h3><form id="pwAdminLogin" style="display:grid;gap:10px"><label>Admin-kode<input id="pwAdminCode" type="password" inputmode="numeric" autocomplete="current-password" required placeholder="Indtast admin-kode" style="width:100%;padding:12px;border:1px solid #bbb;border-radius:8px"></label><button class="btn" type="submit">Log ind som ejer</button></form></div><p id="pwLoginMessage" class="mu" role="status" aria-live="polite"></p></div></main>';
  const msg=document.getElementById('pwLoginMessage');
  const busy=on=>document.querySelectorAll('#pwEmailLogin button,#pwOtpLogin button,#pwAdminLogin button').forEach(b=>b.disabled=on);
  const finish=async()=>{await window.PWDB.refresh();S.auth={enabled:true,authenticated:true,email:window.PWDB.user&&window.PWDB.user.email||''};if(!openProjectRoute())render();};
  document.getElementById('pwEmailLogin').addEventListener('submit',async e=>{
    e.preventDefault();busy(true);msg.textContent='Sender login-kode…';
    try{await window.PWDB.sendEmailOtp(document.getElementById('pwLoginEmail').value);document.getElementById('pwOtpLogin').style.display='grid';msg.textContent='Koden er sendt. Tjek din e-mail.';}
    catch(err){msg.textContent=err.message||'Kunne ikke sende login-koden.';}
    finally{busy(false);}
  });
  document.getElementById('pwOtpLogin').addEventListener('submit',async e=>{
    e.preventDefault();busy(true);msg.textContent='Bekræfter…';
    try{await window.PWDB.verifyEmailOtp(document.getElementById('pwLoginEmail').value,document.getElementById('pwLoginOtp').value);await finish();}
    catch(err){msg.textContent=err.message||'E-mailkoden kunne ikke bekræftes.';busy(false);}
  });
  document.getElementById('pwAdminLogin').addEventListener('submit',async e=>{
    e.preventDefault();busy(true);msg.textContent='Logger ejer ind…';
    try{await window.PWDB.adminCodeLogin(document.getElementById('pwAdminCode').value);await finish();}
    catch(err){msg.textContent=err.message||'Admin-login kunne ikke gennemføres.';busy(false);}
  });
}

boot();

document.addEventListener('click',function(e){var b=e.target.closest('[data-act="pwBuilderType"]');if(!b)return;S.form={...S.form,ind:b.dataset.value};render()});

/* ===== Invoice workspace: saved business profile, quick invoice drafts and printable invoices ===== */
const PW_INVOICES_KEY='pw.invoices';
const pwInvoices=()=>Storage.get(PW_INVOICES_KEY,[]).filter(x=>x&&typeof x==='object');
const pwInvMoney=(n,c)=>new Intl.NumberFormat('da-DK',{style:'currency',currency:c||'EUR'}).format(Number(n)||0);
function pwInvoiceHTML(inv){
 const escH=esc,lines=(inv.lines||[]).map(x=>'<tr><td>'+escH(x.description)+'</td><td class="num">'+Number(x.qty||0)+'</td><td class="num">'+pwInvMoney(x.price,inv.currency)+'</td><td class="num">'+pwInvMoney((+x.qty||0)*(+x.price||0),inv.currency)+'</td></tr>').join('');
 const sub=(inv.lines||[]).reduce((n,x)=>n+(+x.qty||0)*(+x.price||0),0),tax=sub*(+inv.tax||0)/100,total=sub+tax;
 return '<!doctype html><html><head><meta charset="utf-8"><title>Invoice '+escH(inv.number)+'</title><style>body{font:14px/1.5 Inter,Arial,sans-serif;color:#202b3b;margin:0;background:#f4f6f9}.sheet{max-width:850px;margin:32px auto;padding:54px;background:white;box-shadow:0 8px 36px #15233a12}header{display:flex;justify-content:space-between;gap:30px;border-bottom:1px solid #e5eaf0;padding-bottom:28px}h1{font-size:34px;letter-spacing:-1px;margin:0 0 8px}h2{font-size:14px;text-transform:uppercase;letter-spacing:1px;color:#7b8797}p{margin:3px 0}.meta{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:28px 0}.meta section{padding:16px;background:#f7f9fc;border-radius:12px}table{width:100%;border-collapse:collapse;margin-top:28px}th,td{text-align:left;padding:13px 9px;border-bottom:1px solid #e9edf2}.num{text-align:right}.totals{margin:22px 0 0 auto;max-width:300px}.totals div{display:flex;justify-content:space-between;padding:6px 0}.grand{font-size:21px;font-weight:800;border-top:2px solid #243a59;margin-top:8px;padding-top:12px}.foot{margin-top:48px;padding-top:18px;border-top:1px solid #e9edf2;color:#7b8797;font-size:12px}.print{position:fixed;right:24px;top:20px;border:0;border-radius:9px;background:#345e9c;color:white;padding:12px 18px;font-weight:700;cursor:pointer}@media print{body{background:white}.sheet{margin:0 auto;box-shadow:none;padding:20mm}.print{display:none}}</style></head><body><button class="print" onclick="window.print()">Print / Save PDF</button><main class="sheet"><header><div><h1>INVOICE</h1><strong>'+escH(inv.number)+'</strong><p>Issue date: '+escH(inv.date)+'</p><p>Due date: '+escH(inv.due)+'</p></div><div style="text-align:right"><h2>From</h2><strong>'+escH(inv.business||'Your business')+'</strong><p>'+escH(inv.person||'')+'</p><p>'+escH(inv.email||'')+'</p><p>'+escH(inv.phone||'')+'</p><p>'+escH(inv.address||'')+'</p><p>'+escH(inv.taxId||'')+'</p></div></header><div class="meta"><section><h2>Bill to</h2><strong>'+escH(inv.client||'Client')+'</strong><p>'+escH(inv.clientEmail||'')+'</p><p>'+escH(inv.clientAddress||'')+'</p></section><section><h2>Payment details</h2><p>'+escH(inv.payment||'Please contact us for payment details')+'</p><p>'+escH(inv.reference||'')+'</p></section></div><table><thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Total</th></tr></thead><tbody>'+lines+'</tbody></table><div class="totals"><div><span>Subtotal</span><b>'+pwInvMoney(sub,inv.currency)+'</b></div><div><span>VAT ('+Number(inv.tax||0)+'%)</span><b>'+pwInvMoney(tax,inv.currency)+'</b></div><div class="grand"><span>Total due</span><span>'+pwInvMoney(total,inv.currency)+'</span></div></div><p style="margin-top:34px">'+escH(inv.note||'Thank you for your business.')+'</p><div class="foot">'+escH(inv.business||'')+' · '+escH(inv.email||'')+' · '+escH(inv.phone||'')+'</div></main></body></html>';
}
function vInvoice(){
 const p=pwFinData(),items=Storage.get('pw.invoiceDraftLines',[{description:'Website design and development',qty:1,price:''}]),saved=pwInvoices(),d=Storage.get('pw.invoiceDraft',{}),total=items.reduce((n,x)=>n+(+x.qty||0)*(+x.price||0),0),tax=total*(+(d.tax||0))/100;
 const field=(key,label,type='text',placeholder='')=>'<label class="pw-inv-field"><span>'+label+'</span><input data-inv="'+key+'" type="'+type+'" value="'+esc(d[key]||'')+'" placeholder="'+placeholder+'"></label>';
 return '<section class="pw-invoice-page"><header class="pw-invoice-hero"><div><span class="pw-eyebrow">PRIME WEBS AI · CLIENT BILLING</span><h1>Invoices, made simple.</h1><p>Save your business details once. Prepare a polished invoice in minutes, then print it as PDF or open a ready-to-send email.</p></div><div class="pw-invoice-hero-mark">INV<span>01</span></div></header><div class="pw-invoice-layout"><section class="pw-invoice-compose"><div class="pw-invoice-section-head"><div><span class="pw-eyebrow">01 · YOUR BUSINESS</span><h2>Invoice profile</h2><p>These details are reused on every invoice.</p></div><span class="pw-invoice-status">'+(p.completed?'Saved profile':'Setup needed')+'</span></div><div class="pw-invoice-fields">'+[['business','Business name'],['person','Your name'],['email','Business email'],['phone','Phone'],['address','Business address'],['taxId','VAT / tax number']].map(x=>'<label class="pw-inv-field"><span>'+x[1]+'</span><input data-pw-inv-profile="'+x[0]+'" value="'+esc(p[x[0]]||'')+'" placeholder="'+x[1]+'"></label>').join('')+'</div><div class="pw-invoice-section-head"><div><span class="pw-eyebrow">02 · CLIENT DETAILS</span><h2>Who are you billing?</h2><p>Add the client information and invoice dates.</p></div></div><div class="pw-invoice-fields">'+field('client','Client / company')+field('clientEmail','Client email','email')+field('clientAddress','Client address')+field('number','Invoice number','text','INV-0001')+field('date','Issue date','date')+field('due','Due date','date')+'</div><div class="pw-invoice-section-head"><div><span class="pw-eyebrow">03 · LINE ITEMS</span><h2>What are you charging for?</h2><p>Add services, quantities and prices.</p></div><button class="btn ghost" data-act="pwInvAddLine">＋ Add line</button></div><div class="pw-invoice-lines">'+items.map((x,i)=>'<div class="pw-invoice-line"><label><span>Description</span><input data-inv-line="description" data-i="'+i+'" value="'+esc(x.description||'')+'" placeholder="Service or product"></label><label><span>Qty</span><input data-inv-line="qty" data-i="'+i+'" type="number" min="0" step="1" value="'+esc(x.qty??1)+'"></label><label><span>Unit price</span><input data-inv-line="price" data-i="'+i+'" type="number" min="0" step=".01" value="'+esc(x.price||'')+'" placeholder="0.00"></label><button class="pw-inv-remove" data-act="pwInvRemoveLine" data-i="'+i+'" aria-label="Remove line">×</button></div>').join('')+'</div><div class="pw-invoice-fields pw-invoice-bottom-fields">'+field('currency','Currency','text','EUR or DKK')+field('tax','VAT %','number','0')+field('payment','Payment details')+field('note','Note')+'</div><div class="pw-invoice-total"><span>Subtotal · '+(d.currency||'EUR')+'</span><strong>'+pwInvMoney(total,d.currency||'EUR')+'</strong><span>VAT · '+Number(d.tax||0)+'%</span><strong>'+pwInvMoney(tax,d.currency||'EUR')+'</strong><span>Total due</span><strong>'+pwInvMoney(total+tax,d.currency||'EUR')+'</strong></div><div class="pw-invoice-actions"><button class="btn ghost" data-act="pwInvSave">Save draft</button><button class="btn" data-act="pwInvPrint">Preview / Save PDF</button><button class="btn" data-act="pwInvEmail">Prepare email</button></div><p class="pw-inline-note">Invoices are saved in this browser workspace. PDF export uses your browser print dialog. Email opens a prefilled draft; the invoice PDF must be attached manually. Direct email delivery and tax compliance checks are not connected.</p></section><aside class="pw-invoice-side"><div class="pw-invoice-section-head"><div><span class="pw-eyebrow">YOUR WORKSPACE</span><h2>Saved invoices</h2><p>'+saved.length+' saved invoice'+(saved.length===1?'':'s')+'</p></div></div>'+(saved.length?saved.slice().reverse().map(x=>'<article class="pw-invoice-saved"><div><strong>'+esc(x.number)+'</strong><span>'+esc(x.client||'Client')+'</span><small>'+esc(x.date||'')+' · '+pwInvMoney((x.total||0),x.currency||'EUR')+'</small></div><div class="pw-invoice-saved-actions"><button class="btn ghost" data-act="pwInvLoad" data-id="'+esc(x.id)+'">Open</button><button class="btn ghost" data-act="pwInvPrintSaved" data-id="'+esc(x.id)+'">PDF</button></div></article>').join(''):'<div class="pw-empty"><h3>No invoices yet</h3><p>Your saved drafts will appear here.</p></div>')+'</aside></div></section>';
}
V.invoices=vInvoice;
function pwInvCurrent(){
 const p=pwFinData(),d=Storage.get('pw.invoiceDraft',{}),lines=Storage.get('pw.invoiceDraftLines',[{description:'Website design and development',qty:1,price:''}]),number=d.number||('INV-'+new Date().getFullYear()+'-'+String(pwInvoices().length+1).padStart(4,'0'));
 const sub=lines.reduce((n,x)=>n+(+x.qty||0)*(+x.price||0),0),tax=sub*(+d.tax||0)/100;
 return {...p,...d,id:d.id||uid(),number,person:p.person,email:p.email,phone:p.phone,lines:lines.filter(x=>x.description||+x.price),total:sub+tax};
}
document.addEventListener('input',function(e){
 const k=e.target.dataset.pwInvProfile;if(k){const p=pwFinData();p[k]=e.target.value;Storage.set(PW_FIN_KEY,p);return}
 const d=e.target.dataset;if(d.inv){const v=Storage.get('pw.invoiceDraft',{});v[d.inv]=e.target.value;Storage.set('pw.invoiceDraft',v)}
 if(d.invLine!==undefined){const a=Storage.get('pw.invoiceDraftLines',[{description:'',qty:1,price:''}]);a[+d.i][d.invLine]=e.target.value;Storage.set('pw.invoiceDraftLines',a)}
});
document.addEventListener('change',function(e){const d=e.target.dataset;if(d.inv){const v=Storage.get('pw.invoiceDraft',{});v[d.inv]=e.target.value;Storage.set('pw.invoiceDraft',v)}if(d.invLine!==undefined){const a=Storage.get('pw.invoiceDraftLines',[{description:'',qty:1,price:''}]);a[+d.i][d.invLine]=e.target.value;Storage.set('pw.invoiceDraftLines',a)}});
document.addEventListener('click',function(e){
 const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
 if(a==='pwCreditBilling'){Storage.set('pw.creditBilling',b.dataset.billing||'monthly');render();return}
 if(a==='pwInvAddLine'){const x=Storage.get('pw.invoiceDraftLines',[{description:'',qty:1,price:''}]);x.push({description:'',qty:1,price:''});Storage.set('pw.invoiceDraftLines',x);render()}
 if(a==='pwInvRemoveLine'){const x=Storage.get('pw.invoiceDraftLines',[]);x.splice(+b.dataset.i,1);Storage.set('pw.invoiceDraftLines',x.length?x:[{description:'',qty:1,price:''}]);render()}
 if(a==='pwInvSave'){const inv=pwInvCurrent();if(!inv.client||!inv.email){const d=Storage.get('pw.invoiceDraft',{});if(!d.client||!d.clientEmail){banner('Add the client name and email before saving the invoice.');return}}const list=pwInvoices(),at=list.findIndex(x=>x.id===inv.id);if(at>=0)list[at]=inv;else list.push(inv);Storage.set(PW_INVOICES_KEY,list);Storage.set('pw.invoiceDraft',{...Storage.get('pw.invoiceDraft',{}),id:inv.id,number:inv.number});banner('Invoice draft saved.');render()}
 if(a==='pwInvPrint'||a==='pwInvPrintSaved'){let inv;if(a==='pwInvPrintSaved')inv=pwInvoices().find(x=>x.id===b.dataset.id);else inv=pwInvCurrent();if(!inv){banner('Invoice not found.');return}const w=window.open('','_blank');if(!w){banner('Allow pop-ups to open the printable invoice.');return}w.document.open();w.document.write(pwInvoiceHTML(inv));w.document.close()}
 if(a==='pwInvEmail'){const inv=pwInvCurrent();if(!inv.clientEmail){banner('Add the client email first.');return}const body='Hello '+(inv.client||'')+',\n\nPlease find your invoice '+inv.number+' for '+pwInvMoney(inv.total,inv.currency||'EUR')+'.\nDue date: '+(inv.due||'Please contact us')+'.\n\nThank you,\n'+(inv.business||inv.person||'');window.location.href='mailto:'+encodeURIComponent(inv.clientEmail)+'?subject='+encodeURIComponent('Invoice '+inv.number)+'&body='+encodeURIComponent(body)}
 if(a==='pwInvLoad'){const inv=pwInvoices().find(x=>x.id===b.dataset.id);if(inv){const {id,number,client,clientEmail,clientAddress,date,due,currency,tax,payment,note}=inv;Storage.set('pw.invoiceDraft',{id,number,client,clientEmail,clientAddress,date,due,currency,tax,payment,note});Storage.set('pw.invoiceDraftLines',inv.lines||[]);render()}}
});
