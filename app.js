if(typeof structuredClone!=='function')window.structuredClone=o=>JSON.parse(JSON.stringify(o));
/* ===== Lag 0: hjælpere ===== */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const $=s=>document.querySelector(s);

/* ===== Lag 1: adaptere (udskiftes senere med backend) ===== */
// Storage: browseren nu, database (fx Supabase) senere
const Storage={mem:{},
  get(k,d){try{const v=localStorage.getItem(k);if(!v)return d;const x=JSON.parse(v);return(x==null||Array.isArray(x)!==Array.isArray(d)||typeof x!==typeof d)?d:x}catch(e){return k in this.mem?this.mem[k]:d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){this.mem[k]=v}if(window.PWDB)window.PWDB.persistKey(k,v)}};
// Session og credits hentes fra Supabase efter login.
const Session={user:()=>({id:window.PWDB&&window.PWDB.user&&window.PWDB.user.id,name:(window.PWDB&&window.PWDB.profile&&window.PWDB.profile.display_name)||'Bruger',role:(window.PWDB&&window.PWDB.profile&&window.PWDB.profile.role)||'user',email:(window.PWDB&&window.PWDB.user&&window.PWDB.user.email)||''}),can:()=>['owner','admin'].includes(Session.user().role)};
const Credits={cost:{generate:10,edit:1},
  unlimited:()=>Session.can()||!!(window.PWDB&&window.PWDB.credits&&window.PWDB.credits.unlimited),
  balance(){return this.unlimited()?Infinity:(window.PWDB&&window.PWDB.credits?window.PWDB.credits.balance:Storage.get('pw.credits',50))},
  spend(a){if(this.unlimited())return true;const b=this.balance(),c=this.cost[a];if(b<c)return false;if(window.PWDB&&window.PWDB.spendCredits)window.PWDB.spendCredits(c,a,'PRIME WEBS AI '+a).then(ok=>{if(!ok)banner('Credits kunne ikke trækkes. Prøv igen.');if(window.render)window.render()}).catch(e=>banner(e.message));else Storage.set('pw.credits',b-c);return true}};
// Projects: repository, samme interface mod database senere
const Projects={all:()=>Storage.get('pw.projects',[]).map(fixP).filter(Boolean),save:l=>Storage.set('pw.projects',l)};
const Customers={all:()=>Storage.get('pw.customers',[]).map(fixC).filter(Boolean),save:l=>Storage.set('pw.customers',l)};
const Settings={d:{company:'PrimeWebs',email:'primewebssupport@gmail.com',phone:'+45 30 95 05 93',web:'https://primewebs.site',ownerEmail:'primewebssupport@gmail.com',theme:'auto'},get(){const s={...this.d,...Storage.get('pw.settings',{})};['company','email','phone','web','ownerEmail'].forEach(k=>{s[k]=String(s[k]??'')});return s},set(k,v){Storage.set('pw.settings',{...Storage.get('pw.settings',{}),[k]:v})}};

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
  gallery:()=>({id:uid(),type:'gallery',title:'Galleri',images:[]}),
  booking:()=>({id:uid(),type:'booking',title:'Book en tid',text:'Vælg en ydelse og send os din ønskede tid.',cta:'Book en tid'}),
  pricing:()=>({id:uid(),type:'pricing',title:'Priser og pakker',items:[{t:'Ydelse',d:'Beskriv ydelsen her.',price:'Kontakt os'}]}),
  team:()=>({id:uid(),type:'team',title:'Mød teamet',items:[{t:'Navn',d:'Rolle og ansvarsområde'}]}),
  reviews:()=>({id:uid(),type:'reviews',title:'Det siger vores kunder',items:[{name:'Kundenavn',text:'Indsæt en ægte kundeanmeldelse her.',rating:5}]}),
  map:()=>({id:uid(),type:'map',title:'Find os',address:''}),
  contact:()=>({id:uid(),type:'contact',title:'Kontakt',text:'Skriv eller ring, så vender vi hurtigt tilbage.',email:Settings.get().email,phone:Settings.get().phone}),
  legal:()=>({id:uid(),type:'legal',title:'Handelsbetingelser',text:'Omfang og aftale: [OPLYSNING MANGLER]\n\nPriser og betaling: [OPLYSNING MANGLER]\n\nLevering og udførelse: [OPLYSNING MANGLER]\n\nFortrydelse, afbestilling og reklamation: [OPLYSNING MANGLER]\n\nPrivatliv og kontakt: [OPLYSNING MANGLER]'})};
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
      s.pages=Array.isArray(s.pages)?s.pages:[];
      if(!s.pages.some(x=>x.slug==='booking'))s.pages.push({id:uid(),title:'Booking',slug:'booking',blocks:[{id:uid(),type:'booking',title:'Book en tid',text:'Vælg en ydelse og send os din ønskede tid.',cta:'Book en tid'}]});
      say('En separat bookingside med bookingformular er tilføjet');
    }
    if(!out.length)return{site:null,reply:'Testgeneratoren kan nu håndtere flere faste ændringer, men forstod ikke netop den formulering. Prøv fx: "Gør hele hjemmesiden rød med hvid tekst", "tilføj et galleri", "lav flere fordele", "skift overskriften til \"Velkommen\" eller "gør hjørnerne mere afrundede".'};
    return{site:s,reply:out.join('. ')+'.'};}
};

/* AI-lag: rigtig AI via /api/ai; falder tilbage til demo-tilstand, hvis serveren ikke er sat op */
const AI={mode:'api',
  async request(action,payload){
    const sessionResult=window.PWDB&&window.PWDB.client?await window.PWDB.client.auth.getSession():null;const token=sessionResult&&sessionResult.data&&sessionResult.data.session&&sessionResult.data.session.access_token;if(!token){const e=new Error('Log ind for at bruge AI-generatoren.');e.status=401;throw e}const response=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({action,...payload})});
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
  edit(site,message,history=[]){return this.run('edit',{site,message,history},async()=>{const r=await DemoAI.edit(site,message);return{site:r.site,reply:'Demo: '+r.reply}})}
};

/* ===== Lag 3: renderer (JSON -> HTML). Samme output bruges til udgivelse/eksport senere ===== */
const B={
  hero:b=>{const im=imgSrc(b.image);return `<section class="hero${im?' two':''}"><div><h1>${esc(b.title)}</h1><p>${esc(b.text)}</p><div class="actions"><a class="btn" href="${b.actionHref||'#kontakt'}">${esc(b.cta||'Kontakt os')}</a><a class="btn secondary" href="${b.servicesHref||'#kontakt'}">Se vores ydelser</a></div></div>${im?`<img src="${esc(im)}" alt="${esc(b.title)}">`:''}</section>`},
  features:b=>`<section><h2>${esc(b.title)}</h2><div class="g">${b.items.map(i=>`<div class="c"><h3>${esc(i.t)}</h3><p>${esc(i.d)}</p><a class="text-link" href="#kontakt">Spørg os om dette <span aria-hidden="true">→</span></a></div>`).join('')}</div></section>`,
  about:b=>{const im=imgSrc(b.image),tx=String(b.text||'').split(/\n\n+/).map(x=>`<p>${esc(x)}</p>`).join('');return `<section class="ab${im?' two':''}"><div><h2>${esc(b.title)}</h2>${tx}</div>${im?`<img src="${esc(im)}" alt="${esc(b.title)}">`:''}</section>`},
  services:b=>B.features(b),
  pricing:b=>`<section class="pricing-section"><h2>${esc(b.title||'Priser og pakker')}</h2><div class="g">${(b.items||[]).map(i=>`<article class="c pricing-card"><h3>${esc(i.t)}</h3><div class="price">${esc(i.price||'Kontakt os')}</div><p>${esc(i.d)}</p></article>`).join('')}</div></section>`,
  team:b=>`<section class="team-section"><h2>${esc(b.title||'Mød teamet')}</h2><div class="g">${(b.items||[]).map(i=>`<article class="c team-card"><h3>${esc(i.t)}</h3><p>${esc(i.d)}</p></article>`).join('')}</div></section>`,
  steps:b=>`<section><h2>${esc(b.title)}</h2><div class="g">${b.items.map((i,n)=>`<div class="c"><h3>${n+1}. ${esc(i.t)}</h3><p>${esc(i.d)}</p></div>`).join('')}</div></section>`,
  faq:b=>`<section><h2>${esc(b.title)}</h2>${b.items.map(i=>`<details class="c" style="margin-bottom:.6rem"><summary style="cursor:pointer;font-weight:600">${esc(i.t)}</summary><p>${esc(i.d)}</p></details>`).join('')}</section>`,
  cta:b=>`<section class="final-cta" style="text-align:center"><h2>${esc(b.title)}</h2><p>${esc(b.text)}</p><div class="actions" style="justify-content:center"><a class="btn" href="${b.actionHref||'#kontakt'}">${esc(b.cta||'Kontakt os nu')}</a><a class="btn secondary" href="${b.servicesHref||'#kontakt'}">Se ydelser</a></div></section>`,
  gallery:b=>{const im=(b.images||[]).map(imgSrc).filter(Boolean);return im.length?`<section><h2>${esc(b.title)}</h2><div class="gal">${im.map((u,n)=>`<img src="${esc(u)}" alt="${esc(b.title)} ${n+1}" loading="lazy">`).join('')}</div></section>`:''},
  booking:b=>`<section class="booking-cta"><h2>${esc(b.title||'Book en tid')}</h2><p>${esc(b.text||'Vælg en tid, der passer dig.')}</p><a class="btn" href="#booking">${esc(b.cta||'Book en tid')}</a></section>`,
  contact:b=>`<section class="contact-section"><h2>${esc(b.title||'Kontakt os')}</h2><p>${esc(b.text||'Vi glæder os til at høre fra dig.')}</p><div class="actions">${b.phone?`<a class="btn" href="tel:${esc(String(b.phone).replace(/[^+\\d]/g,''))}">Ring til os · ${esc(b.phone)}</a>`:''}${b.whatsapp?`<a class="btn whatsapp" href="https://wa.me/${esc(String(b.whatsapp).replace(/\\D/g,''))}" target="_blank" rel="noopener">Skriv på WhatsApp</a>`:''}${b.email?`<a class="btn secondary" href="mailto:${esc(b.email)}">Send e-mail</a>`:''}${b.address?`<a class="btn secondary" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}" target="_blank" rel="noopener">Find os på Google Maps</a>`:''}<a class="btn secondary" href="#top">Til toppen ↑</a></div><form id="pw-contact-form" class="contact-form"><h3>Send os en besked</h3><label>Dit navn<input name="name" autocomplete="name" required></label><label>Din e-mail<input name="email" type="email" autocomplete="email" required></label><label>Telefon (valgfrit)<input name="phone" type="tel" autocomplete="tel"></label><label>Hvad kan vi hjælpe med?<textarea name="message" rows="4" required></textarea></label><button class="btn" type="submit">Klargør besked</button><p id="pw-contact-note" class="form-note">Din e-mailapp åbnes med beskeden. Du skal selv trykke Send.</p></form></section>` ,
  reviews:b=>Array.isArray(b.items)&&b.items.length?`<section class="reviews-section"><h2>${esc(b.title||'Det siger vores kunder')}</h2><div class="g">${b.items.slice(0,8).map(x=>`<article class="c review">${Number(x.rating)>=1&&Number(x.rating)<=5?`<div aria-label="${Math.round(Number(x.rating))} ud af 5 stjerner" class="stars">${'★'.repeat(Math.round(Number(x.rating)))}</div>`:''}<p>“${esc(x.text)}”</p><strong>${esc(x.name)}</strong></article>`).join('')}</div></section>`:'' ,
  legal:b=>`<section class="legal-section"><h2>${esc(b.title||'Handelsbetingelser')}</h2>${String(b.text||'').split(/\n\n+/).map(part=>`<p>${esc(part).replace(/\n/g,'<br>')}</p>`).join('')}</section>`,
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
  const s=p.site;s.meta=s.meta||{};if(s.blocks.some(b=>b.type==='booking')){s.meta.bookingPublicKey=s.meta.bookingPublicKey||((crypto.randomUUID&&crypto.randomUUID())||('pw_'+Math.random().toString(36).slice(2)+Date.now().toString(36)));if(p.id){const all=Projects.all(),stored=all.find(x=>x.id===p.id);if(stored&&stored.site){stored.site.meta=stored.site.meta||{};stored.site.meta.bookingPublicKey=s.meta.bookingPublicKey;Projects.save(all);}}}const t=s.meta.theme||{},d=t.mode==='dark',a=/^#[0-9a-fA-F]{6}$/.test(t.accent)?t.accent:'#2540D9',bt=lum(a)>150?'#0E1320':'#fff';
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
  const legalPage=(Array.isArray(s.pages)?s.pages:[]).find(page=>/^(handelsbetingelser|terms|terms-and-conditions|betingelser)$/i.test(String(page.slug||'')));
  const hasLegal=!!legalPage||s.blocks.some(block=>block.type==='legal');

  const links=s.blocks.filter(b=>['services','pricing','team','about','features','gallery','contact','faq','reviews','map'].includes(b.type)).map(b=>'<a href="#'+(b.type==='contact'?'kontakt':'section-'+b.type+'-'+s.blocks.indexOf(b))+'">'+esc(BT[b.type]||b.type)+'</a>').join('')+pageLinks;
  const nav=links?'<nav aria-label="Hovedmenu">'+links+'<a class="nav-cta" href="#kontakt">Kontakt os</a></nav>':'';
  const red=!!t.background&&/^#(?:D12C3F|B82032|7A1F3D)$/i.test(t.background);
  const hero=s.blocks.find(b=>b.type==='hero')||{},about=s.blocks.find(b=>b.type==='about')||{},contact=s.blocks.find(b=>b.type==='contact')||{};
  const metaDesc=String(hero.text||about.text||('Læs mere om '+(s.meta.title||p.name)+'. Se vores ydelser og kontakt os.')).replace(/\s+/g,' ').trim().slice(0,300),seoTitle=String(s.meta.seoTitle||s.meta.title||p.name).trim().slice(0,160),seoDesc=String(s.meta.seoDescription||metaDesc).replace(/\s+/g,' ').trim().slice(0,300);
  const canonicalHost=String(p.domain||'').trim().replace(/^https?:\/\//i,'').replace(/\/.*$/,'').toLowerCase();
  const canonicalUrl=/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(canonicalHost)?'https://'+canonicalHost+'/':'';
  const businessSchema={ '@context':'https://schema.org','@type':'LocalBusiness',name:String(s.meta.title||p.name),description:metaDesc,...(contact.phone?{telephone:contact.phone}:{}),...(contact.email?{email:contact.email}:{})};
  const pageLang=/^(da|en|es|de|fr)$/i.test(String(s.meta.language||""))?String(s.meta.language).toLowerCase():"da";
  return `<!DOCTYPE html><html lang="${pageLang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(seoDesc)}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(seoTitle)}"><meta property="og:description" content="${esc(seoDesc)}"><meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="${a}">${canonicalUrl?`<link rel="canonical" href="${canonicalUrl}">`:``}<script type="application/ld+json">${JSON.stringify(businessSchema).replace(/</g,'\\u003c')}</script><title>${esc(seoTitle)}</title><style>
  *{box-sizing:border-box}.pw-page-view{min-height:70vh}.pw-page-heading{max-width:1100px;margin:0 auto;padding:2rem clamp(1rem,4vw,3rem) 0}.pw-back-link{display:inline-block;color:inherit;text-decoration:none;font-weight:750;margin-bottom:1rem}.pw-page-view[hidden]{display:none!important}html{scroll-behavior:smooth}body{margin:0;font-family:${f};background:${bgStyle};background-attachment:fixed;color:${fg};line-height:1.7}
  header{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:1.5rem;padding:1rem clamp(1rem,4vw,3rem);font-weight:800;background:${bg}E8;border-bottom:1px solid ${ln};backdrop-filter:blur(18px)}
  header .brand{color:${fg};font-weight:850;text-decoration:none;font-size:1.05rem;white-space:nowrap}header nav{display:flex;flex-wrap:wrap;align-items:center;gap:.55rem}header nav a{font-size:.88rem;text-decoration:none;font-weight:700;padding:.45rem .8rem;border-radius:999px;color:${fg};transition:background .2s}header nav a:hover{background:${sf}}header nav a.nav-cta{background:${a};color:${bt};padding:.65rem 1rem}.actions{display:flex;flex-wrap:wrap;gap:.8rem;align-items:center;margin-top:1.25rem}.btn.secondary{background:transparent;color:${fg};border:1px solid ${ln};box-shadow:none}.text-link{display:inline-flex;gap:.4rem;margin-top:.8rem;font-weight:800;text-decoration:none}.footer-links{display:flex;justify-content:center;gap:1.2rem;margin:.8rem 0}footer a{color:${fg};text-decoration:none;font-weight:700}footer small{opacity:.7}.contact-form{display:grid;gap:.9rem;max-width:680px;margin:2rem auto 0;padding:clamp(1rem,4vw,2rem);border:1px solid ${ln};border-radius:20px;background:${sf}B8}.contact-form label{display:grid;gap:.35rem;font-weight:700}.contact-form input,.contact-form textarea{width:100%;padding:.9rem 1rem;border:1px solid ${ln};border-radius:10px;background:${bg};color:${fg};font:inherit}.form-note{font-size:.85rem}.stars{color:#D49A22;letter-spacing:.12em}.review p{font-style:italic}.mobile-actions{display:none}.wa-float{position:fixed;right:22px;bottom:22px;z-index:8;padding:.85rem 1.1rem;border-radius:999px;background:#168B55;color:#fff;text-decoration:none;font-weight:800;box-shadow:0 8px 28px #0004}
  section{position:relative;isolation:isolate;padding:clamp(3.5rem,8vw,7rem) clamp(1.2rem,5vw,4rem);max-width:1200px;margin:0 auto}section:nth-of-type(even){background:linear-gradient(135deg,${sf}E8,${bg}C9);border:1px solid ${ln};border-radius:${t.radius==='large'?'30px':'22px'};margin-top:1.4rem;margin-bottom:1.4rem;box-shadow:0 24px 70px #0000000A}
  h1{font-size:clamp(2.7rem,7vw,5.5rem);line-height:1.01;letter-spacing:-.055em;margin:0 0 1.35rem;font-weight:850}h2{font-size:clamp(1.9rem,3.6vw,3rem);line-height:1.08;letter-spacing:-.04em;margin:0 0 1.6rem;font-weight:800}
  h3{line-height:1.25}p{color:${mu};max-width:68ch}.btn{display:inline-block;background:${a};color:${bt};padding:1rem 1.7rem;border-radius:${t.radius==='large'?'22px':'13px'};text-decoration:none;font-weight:800;box-shadow:0 12px 28px #00000020;transition:transform .2s,box-shadow .2s}.btn:hover{transform:translateY(-2px);box-shadow:0 16px 34px #00000028}
  .g{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1.25rem}.c{background:linear-gradient(145deg,${sf},${sf}E8);color:${fg};border:1px solid ${ln};border-radius:${t.radius==='large'?'26px':'18px'};padding:1.7rem;box-shadow:0 16px 38px #0000000D;transition:transform .22s,box-shadow .22s,border-color .22s}.c:hover{transform:translateY(-4px);box-shadow:0 20px 42px #00000016}
  a{color:${a}}footer{padding:2rem;text-align:center;color:${fg};background:${sf};border-top:1px solid ${ln}}
  .hero{position:relative;isolation:isolate;overflow:hidden;min-height:440px;display:flex;align-items:center;border:1px solid ${ln};border-radius:${t.radius==='large'?'34px':'24px'};margin-top:2rem;margin-bottom:2rem;background:radial-gradient(circle at 84% 18%,${a}30,transparent 34%),radial-gradient(circle at 12% 92%,${a}20,transparent 38%),linear-gradient(135deg,${sf},${bg});box-shadow:0 28px 90px #00000014}.hero:before{content:"";position:absolute;z-index:-1;width:340px;height:340px;border-radius:50%;right:-70px;top:-100px;background:${a}22;filter:blur(2px)}.hero:after{content:"";position:absolute;z-index:-1;width:220px;height:220px;border-radius:50%;right:22%;bottom:-130px;background:${a}18;filter:blur(4px)}.hero p{font-size:1.18rem;max-width:58ch}
  .hero.two,.ab.two{display:grid;grid-template-columns:1.05fr .95fr;gap:3rem;align-items:center}
  .hero img,.ab img{width:100%;border-radius:22px;object-fit:cover;aspect-ratio:4/3}
  .gal{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem}.gal img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:16px}
  details.c{margin-bottom:.7rem}summary{cursor:pointer;font-weight:700}
  ${red?'header,footer{background:'+bg+'}header nav a{color:'+fg+'} .btn{background:#FFFFFF;color:#8F1D2B} .c{background:'+sf+'}':''}
  @media(max-width:700px){header{align-items:flex-start;flex-direction:column;gap:.5rem;padding:.9rem 1rem}header nav{width:100%;gap:.35rem;overflow-wrap:anywhere}header nav a{padding:.4rem .55rem;font-size:.82rem}.actions{align-items:stretch}.actions .btn{width:100%}.mobile-actions{position:fixed;display:flex;left:0;right:0;bottom:0;z-index:9;gap:.5rem;padding:.65rem;background:${sf}F2;border-top:1px solid ${ln};backdrop-filter:blur(16px)}.mobile-actions a{flex:1;text-align:center;padding:.75rem .4rem;border-radius:12px;background:${a};color:${bt};font-weight:800;text-decoration:none}.wa-float{right:14px;bottom:84px}.contact-form{margin-bottom:2rem}.hero.two,.ab.two{grid-template-columns:1fr;gap:1.5rem}.hero{min-height:0}section{padding:3rem 1.2rem}section:nth-of-type(even){border-radius:18px;margin-top:.8rem;margin-bottom:.8rem}.g{grid-template-columns:1fr}.gal{grid-template-columns:repeat(2,minmax(0,1fr))}.btn{min-height:46px;display:inline-flex;align-items:center;justify-content:center}}@media(max-width:380px){h1{font-size:clamp(2.15rem,12vw,3rem)}header nav a{font-size:.76rem;padding:.35rem .45rem}.gal{grid-template-columns:1fr}}
  </style></head><body><header id="top"><a class="brand" href="#top">${esc(s.meta.title)}</a>${nav}</header><main id="pw-home">${body}</main>${pageViews}<footer><strong>${esc(s.meta.title)}</strong><div class="footer-links"><a href="#kontakt">Kontakt</a>${hasLegal?`<a href="${legalPage?'#page/'+esc(String(legalPage.slug)):'#section-legal-'+s.blocks.findIndex(block=>block.type==='legal')}">${s.meta.language==='en'?'Terms & Conditions':'Handelsbetingelser'}</a>`:''}<a href="#top">Til toppen ↑</a></div><small>© ${new Date().getFullYear()} ${esc(s.meta.title)}</small></footer>${(contact.phone||contact.whatsapp)?`<div class="mobile-actions">${contact.phone?`<a href="tel:${esc(String(contact.phone).replace(/[^+\\d]/g,''))}">Ring</a>`:''}${hasBooking?`<a href="#booking">Book tid</a>`:''}${contact.whatsapp?`<a href="https://wa.me/${esc(String(contact.whatsapp).replace(/\\D/g,''))}" target="_blank" rel="noopener">WhatsApp</a>`:''}</div>`:''}${contact.whatsapp?`<a class="wa-float" href="https://wa.me/${esc(String(contact.whatsapp).replace(/\\D/g,''))}" target="_blank" rel="noopener" aria-label="Skriv på WhatsApp">WhatsApp ↗</a>`:''}<script>(function(){const home=document.getElementById('pw-home');const views=[...document.querySelectorAll('.pw-page-view')];function route(){const m=location.hash.match(/^#page\\/([a-z0-9-]+)/i);const slug=m&&m[1];if(!home)return;if(slug){home.hidden=true;views.forEach(v=>v.hidden=v.dataset.page!==slug);const active=views.find(v=>v.dataset.page===slug);if(active){const h=active.querySelector('.pw-page-heading h1');document.title=(h?h.textContent:'')+' · '+${JSON.stringify(String(s.meta.title||p.name))};window.scrollTo(0,0)}else{home.hidden=false;views.forEach(v=>v.hidden=true)}}else if(location.hash!=='#booking'){home.hidden=false;views.forEach(v=>v.hidden=true)}}window.addEventListener('hashchange',route);route()})();</script>${bookingRuntime(s)}</body></html>`;
}};

/* ===== Lag 4: UI ===== */
let S={view:'dash',miniTab:'list',pricingPeriod:'monthly',cf:{name:'',email:'',plan:'Gratis'},out:null,outId:null,msg:'',rv:'',rc:0,cdel:null,id:null,device:'desktop',busy:false,err:'',del:null,fileTab:'index.html',dashSearch:'',dashFilter:'all',dashSort:'updated',renameId:null,renameValue:'',templateQuery:'',templateCategory:'Alle',form:{name:'',desc:'',style:'Moderne'}};
const getP=()=>Projects.all().find(p=>p.id===S.id);
const upd=(id,fn)=>{const l=Projects.all(),i=l.findIndex(p=>p.id===id);if(i<0)return;fn(l[i]);l[i].updatedAt=Date.now();Projects.save(l)};

function vList(){const l=Projects.all();
  if(!l.length)return `<div class="empty"><h1>Mine hjemmesider</h1><h3>Du har ingen projekter endnu</h3><p class="mu">Opret dit første projekt, og få en komplet hjemmeside på få sekunder.</p><button class="btn" data-act="new">Nyt projekt</button></div>`;
  return `<h1>Mine hjemmesider</h1><div class="grid">${l.map(p=>`<div class="card">${S.renameId===p.id?`<div class="dash-rename-inline"><input data-rename-input data-id="${p.id}" value="${esc(S.renameValue)}" aria-label="Nyt projektnavn" maxlength="80"><button class="btn" data-act="renameSave" data-id="${p.id}">Gem</button><button class="btn ghost" data-act="renameCancel">Annuller</button></div>`:`<h3>${esc(p.name)}</h3>`}<p class="mu">${p.status==='ready'?'Klar til udgivelse':'Kladde'}, ændret ${new Date(p.updatedAt).toLocaleDateString('da-DK')}</p><div class="row"><button class="btn" data-act="build" data-id="${p.id}">Rediger hjemmeside</button><button class="btn ghost" data-act="renameStart" data-id="${p.id}">Omdøb</button><button class="btn ghost" data-act="duplicate" data-id="${p.id}">Kopiér</button><button class="btn ghost" data-act="del" data-id="${p.id}">${S.del===p.id?'Bekræft sletning':'Slet'}</button></div></div>`).join('')}</div>`}


function vEdit(){const p=getP();if(!p)return vPick('edit');
  return `<div class="editor-workspace-head"><div><span class="dash-section-kicker">AI WEBSITE EDITOR</span><h1>${esc(p.name)}</h1><p class="mu">Beskriv ændringer, og følg resultatet i live-preview.</p></div><div class="row"><button class="btn ghost" data-act="go" data-v="builder">Visuel editor</button><button class="btn ghost" data-act="go" data-v="customize">Design</button><button class="btn ghost" data-act="go" data-v="preview">Forhåndsvisning</button><button class="btn ghost" data-act="go" data-v="files">Filer</button><button class="btn ghost" data-act="go" data-v="history">Versioner</button></div></div>
<div class="ed"><section class="chat"><div class="editor-section"><span class="badge">AI-chat</span><p class="mu">Skriv alt, hvad du vil ændre på hjemmesiden, i ét felt. Du kan bede om nye overskrifter, tekster, farver, billeder, ydelser, fordele, Om os, spørgsmål og svar, opfølgning eller kontaktoplysninger.</p></div><div class="msgs">${p.chat.map(m=>`<div class="m ${m.r}">${esc(m.t)}</div>`).join('')}${S.busy?'<div class="m ai">Arbejder…</div>':''}</div><div class="prompt-box"><textarea id="chatin" rows="4" placeholder="Beskriv med dine egne ord, hvad AI'en skal ændre på hjemmesiden…" ${S.busy?'disabled':''}></textarea><button class="btn" data-act="send" ${S.busy?'disabled':''}>Send ændring</button></div></section><section class="pv"><iframe title="Live preview" sandbox="allow-scripts" srcdoc="${esc(previewDoc(p))}"></iframe></section></div>`;
}

/* ===== Nye sider ===== */
const NAV=[
 ['Dashboard',[['dash','Dashboard']]],
 ['Ring',[['leadfinder','Automatisk Lead Finder'],['leadring','Leadliste / Ring'],['leadhistory','Lead History'],['onlycall','Only Call'],['ringcalendar','Opfølgningskalender']]],
 ['Domæner og publicering',[['domains','Domæner og publicering']]],
 ['Credits og abonnementer',[['credits','Credits og abonnementer']]],
 ['Finance',[['finance','Finance']]],
 ['Statistik og analyser',[['stats','Statistik og analyser']]],
 ['System',[
  ['settings','Indstillinger'],
  ['colors','Udseende og farver'],
  ['contact','Kontakt'],
  ['adminp','Admin Panel',[['admin','Roller og adgang'],['backup','Sikkerhedskopi']]]
 ]]
];
const BT={hero:'Forside',features:'Fordele',about:'Om os',contact:'Kontakt',services:'Ydelser',pricing:'Priser',team:'Team',steps:'Sådan foregår det',faq:'Spørgsmål og svar',cta:'Opfordring',gallery:'Galleri',booking:'Booking',reviews:'Anmeldelser',map:'Find os',legal:'Handelsbetingelser'},LBL={title:'Overskrift',text:'Tekst',cta:'Knaptekst',email:'E-mail',phone:'Telefon',t:'Titel',d:'Beskrivelse'};
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
const snap=()=>JSON.stringify({app:'primewebs',v:2,at:new Date().toISOString(),projects:Projects.all(),customers:Customers.all(),leads:LeadStore.all(),settings:(({aiCode,...r})=>r)(Settings.get()),finance:Fin.all(),images:Imgs.all(),credits:Storage.get('pw.credits',50)},null,2);
// Forhåndsvisningen ligger i en afskærmet ramme (srcdoc). Uden <base> sender et #-link rammen til dashboardets egen adresse, og rammen bliver hvid.
function previewDoc(p){return Renderer.html(p).replace('<head>','<head><base href="about:srcdoc">')}
const frame=p=>`<iframe title="Live preview" sandbox="allow-scripts" srcdoc="${esc(previewDoc(p))}"></iframe>`;

function vPick(t){const l=Projects.all();return `<h1>${PT[t]||'Vælg hjemmeside'}</h1><p class="mu">Vælg en hjemmeside at arbejde på.</p>`+(l.length?`<div class="grid">${l.map(p=>`<div class="card"><h3>${esc(p.name)}</h3><button class="btn" data-act="pick" data-t="${t}" data-id="${p.id}">Vælg</button></div>`).join('')}</div>`:`<p>Du har ingen hjemmesider endnu.</p><button class="btn" data-act="go" data-v="new">Opret ny hjemmeside</button>`)}

function duplicateProject(id){
 const source=Projects.all().find(p=>p.id===id);
 if(!source){banner('Projektet kunne ikke findes.');return}
 const copy=structuredClone(source),now=Date.now();
 copy.id=uid();copy.name=(String(source.name||'Hjemmeside').trim()+' (kopi)').slice(0,80);
 copy.status='draft';copy.domain=null;copy.createdAt=now;copy.updatedAt=now;
 copy.history=[];copy.future=[];copy.chat=[{r:'ai',t:'Kopi oprettet fra '+String(source.name||'det oprindelige projekt')+'. Originalen er bevaret uændret.'}];
 copy.customerId=null;copy.customer=null;copy.isPublished=false;delete copy.publishedAt;delete copy.publishedUrl;delete copy.liveUrl;
 if(copy.site&&Array.isArray(copy.site.blocks))copy.site.blocks=copy.site.blocks.map(b=>({...b,id:uid()}));
 Projects.save([copy,...Projects.all()]);
 S.id=copy.id;S.view='mini';S.miniTab='edit';S.err='';
 banner('Projektet er kopieret. Originalen er uændret.');
}
function vDash(){const all=Projects.all(),u=Session.user(),q=String(S.dashSearch||'').trim().toLowerCase(),filter=S.dashFilter||'all';
 const l=all.filter(p=>(!q||String(p.name||'').toLowerCase().includes(q)||String(p.domain||'').toLowerCase().includes(q))&&(filter==='all'||(filter==='published'&&(p.status==='published'||p.isPublished===true||!!p.publishedAt))||(filter==='ready'&&p.status==='ready')||(filter==='draft'&&p.status!=='ready'&&p.status!=='published'&&!p.isPublished&&!p.publishedAt)));const sort=S.dashSort||'updated';l.sort((a,b)=>sort==='name'?String(a.name||'').localeCompare(String(b.name||''),'da'):sort==='oldest'?Number(a.updatedAt||0)-Number(b.updatedAt||0):Number(b.updatedAt||0)-Number(a.updatedAt||0));
 const prompt=String(S.dashPrompt||'');
 return `<section class="dash-hero"><div class="dash-hero-copy"><span class="dash-eyebrow"><span class="dash-live-dot"></span> PRIME WEBS AI <span class="dash-eyebrow-sep">/</span> WORKSPACE</span><h1>Godt at se dig igen, ${esc(u.name)}.</h1><p>Beskriv din idé, så hjælper AI'en dig med at bygge den.</p></div><div class="dash-hero-side"><span class="dash-status-pill"><span class="dash-live-dot"></span> Workspace aktivt</span><div class="dash-hero-mark">PW<span>AI</span></div></div></section>
 <section class="dash-prompt-panel"><div class="dash-prompt-heading"><span class="dash-section-kicker">AI WEBSITE BUILDER</span><h2>Hvad skal vi bygge i dag?</h2><p>Beskriv din hjemmeside eller app med dine egne ord. AI'en går i gang med det samme.</p></div><textarea class="dash-prompt-input" data-dash-prompt rows="4" placeholder="Fx: Byg en moderne bookingside til en frisør i Málaga med priser, galleri og kontaktformular...">${esc(prompt)}</textarea><div class="dash-prompt-footer"><span class="mu">Tip: Skriv gerne branche, stil, funktioner og ønsker.</span><button class="btn ghost" data-act="go" data-v="templates">Se skabeloner</button><button class="btn dash-prompt-submit" data-act="dashGen" ${S.busy?'disabled':''}>${S.busy?'Arbejder…':'✦ Start byggeriet'}</button></div>${S.err?`<p class="err">${esc(S.err)}</p>`:''}</section>
  <div class="dash-section-head"><div><span class="dash-section-kicker">DIT ARBEJDE</span><h3>Dine projekter</h3></div><span class="mu">${all.length} i alt</span></div>
  ${all.length?`<section class="dash-project-tools"><input data-dash-search type="search" value="${esc(S.dashSearch||'')}" placeholder="Søg efter et projekt…" aria-label="Søg efter et projekt"><div class="dash-filter-row">${[['all','Alle'],['published','Udgivet'],['ready','Klar'],['draft','Kladder']].map(([v,t])=>`<button class="chip ${filter===v?'is-selected':''}" data-act="dashFilter" data-filter="${v}" aria-pressed="${filter===v}">${t}</button>`).join('')}</div><label class="dash-sort-label">Sortér efter<select data-dash-sort aria-label="Sortér projekter"><option value="updated" ${sort==='updated'?'selected':''}>Senest opdateret</option><option value="oldest" ${sort==='oldest'?'selected':''}>Ældst opdateret</option><option value="name" ${sort==='name'?'selected':''}>Navn A–Å</option></select></label></section>`:''}
  ${l.length?`<div class="grid dash-projects">${l.map(p=>{const active=p.status==='published'||p.isPublished===true||!!p.publishedAt;const status=active?'Udgivet':p.status==='ready'?'Klar til udgivelse':'Kladde';return `<article class="card dash-project-card"><div class="dash-project-symbol">✦</div><div class="dash-project-info">${S.renameId===p.id?`<div class="dash-rename-inline"><input data-rename-input data-id="${p.id}" value="${esc(S.renameValue)}" aria-label="Nyt projektnavn" maxlength="80"><button class="btn" data-act="renameSave" data-id="${p.id}">Gem</button><button class="btn ghost" data-act="renameCancel">Annuller</button></div>`:`<div class="dash-project-name">${esc(p.name)}</div>`}<span class="dash-project-meta"><span class="dash-project-status ${active?'is-active':''}">${status}</span><span>Opdateret ${new Date(p.updatedAt).toLocaleDateString('da-DK')}</span></span></div><div class="row dash-project-actions"><button class="btn dash-open-project" data-act="build" data-id="${p.id}">Rediger hjemmeside</button><button class="btn ghost" data-act="renameStart" data-id="${p.id}">Omdøb</button><button class="btn ghost" data-act="duplicate" data-id="${p.id}" aria-label="Kopiér ${esc(p.name)}">Kopiér</button><button class="btn dash-delete-project" data-act="del" data-id="${p.id}" aria-label="Slet projekt ${esc(p.name)}" title="Slet projekt">${S.del===p.id?'Bekræft sletning':'Slet hjemmeside'}</button></div></article>`}).join('')}</div>`:all.length?`<div class="card dash-empty"><strong>Ingen projekter matcher søgningen</strong><p class="mu">Prøv et andet navn eller vælg et andet filter.</p><button class="btn ghost" data-act="dashReset">Nulstil søgning</button></div>`:`<div class="card dash-empty"><div class="dash-empty-symbol">✦</div><strong>Din første hjemmeside starter her</strong><p class="mu">Beskriv din idé ovenfor, så opretter vi dit første projekt.</p></div>`}`}
function vBuilder(){
 const p=getP();if(!p)return vPick('builder');
 const pages=Array.isArray(p.site.pages)?p.site.pages:[],pageSlug=S.builderPage||'home';
 const activePage=pageSlug==='home'?null:pages.find(x=>x.slug===pageSlug);
 if(pageSlug!=='home'&&!activePage)S.builderPage='home';
 const currentSlug=activePage?pageSlug:'home',blocks=activePage?activePage.blocks:(p.site.blocks||[]);
 const field=(bi,k,v,extra='')=>{const attrs=`data-b="${bi}" data-k="${k}" data-page="${currentSlug}" ${extra}`;return ['text','d'].includes(k)?`<label class="block-field">${LBL[k]||k}<textarea ${attrs} rows="4">${esc(v??'')}</textarea></label>`:`<label class="block-field">${LBL[k]||k}<input ${attrs} value="${esc(v??'')}"></label>`};
 const itemFields=(bi,items)=>items.map((it,ii)=>`<div class="block-item-fields"><span class="block-item-number">${ii+1}</span><div>${it.name!==undefined?field(bi,'name',it.name,`data-i="${ii}" data-ik="name"`):field(bi,'t',it.t,`data-i="${ii}" data-ik="t"`)}${it.text!==undefined?field(bi,'text',it.text,`data-i="${ii}" data-ik="text"`):field(bi,'d',it.d,`data-i="${ii}" data-ik="d"`)}${it.price!==undefined?field(bi,'price',it.price,`data-i="${ii}" data-ik="price"`):''}${it.rating!==undefined?field(bi,'rating',it.rating,`data-i="${ii}" data-ik="rating"`):''}</div></div>`).join('');
 const cards=blocks.map((b,bi)=>`<article class="block-editor-card"><header><span class="block-editor-icon">${({hero:'✦',features:'▦',about:'◉',services:'⌘',steps:'↗',faq:'?',cta:'➜',gallery:'▧',contact:'✉',booking:'◷'})[b.type]||'▤'}</span><div><strong>${BT[b.type]||b.type}</strong><small>Sektion ${bi+1} af ${blocks.length}</small></div><span class="sp"></span><button class="btn ghost block-move" data-act="bmove" data-page="${currentSlug}" data-i="${bi}" data-d="-1" ${bi===0?'disabled':''} aria-label="Flyt sektion op">↑</button><button class="btn ghost block-move" data-act="bmove" data-page="${currentSlug}" data-i="${bi}" data-d="1" ${bi===blocks.length-1?'disabled':''} aria-label="Flyt sektion ned">↓</button>${b.type==='hero'||b.type==='contact'?'<span class="block-fixed-label">Fast sektion</span>':`<button class="btn ghost block-remove" data-act="brem" data-page="${currentSlug}" data-i="${bi}">Fjern</button>`}</header><div class="block-editor-fields">${Object.keys(b).filter(k=>!['id','type'].includes(k)).map(k=>Array.isArray(b[k])?(b[k].length&&typeof b[k][0]==='object'?itemFields(bi,b[k]):b[k].map((it,ii)=>`<label class="block-field">${k==='images'?'Billede URL':'Element'}<input data-b="${bi}" data-k="${k}" data-page="${currentSlug}" data-i="${ii}" value="${esc(it)}" placeholder="https://..."></label>`).join('')):field(bi,k,b[k])).join('')}</div></article>`).join('');
 const addTypes=['features','services','about','steps','faq','cta','gallery','booking','pricing','team','reviews','map','legal'];
 const pageOptions=[['home','Forside'],...pages.map(x=>[x.slug,x.title||x.slug])];
 return `<div class="editor-workspace-head"><div><span class="dash-section-kicker">VISUEL WEBSITE EDITOR</span><h1>${esc(p.name)}</h1><p class="mu">Redigér alle sider, sektioner, tekst og indhold direkte – ændringerne kan fortrydes.</p></div><div class="row"><button class="btn ghost" data-act="go" data-v="edit">AI Chat</button><button class="btn ghost" data-act="go" data-v="customize">Design & SEO</button><button class="btn ghost" data-act="go" data-v="files">Filer</button><button class="btn ghost" data-act="go" data-v="history">Versioner</button></div></div>
 <div class="builder-page-tools"><label>Redigér side<select data-builder-page>${pageOptions.map(([v,t])=>`<option value="${esc(v)}" ${v===currentSlug?'selected':''}>${esc(t)}</option>`).join('')}</select></label><label>Ny underside<input data-new-page-title value="${esc(S.newPageTitle||'')}" placeholder="Fx Om os, Priser eller Booking"></label><button class="btn" data-act="pageAdd">＋ Opret underside</button>${activePage?`<label>Sidens titel<input data-page-title value="${esc(activePage.title||'')}"></label><button class="btn ghost" data-act="pageRemove" data-page="${esc(currentSlug)}">${S.pageDelete===currentSlug?'Bekræft sletning':'Slet underside'}</button>`:''}</div>
 <div class="builder-workspace"><section class="builder-controls"><div class="builder-add-panel"><strong>Tilføj sektion til ${esc(activePage?activePage.title:'forsiden')}</strong><p class="mu">Vælg indhold, der skal føjes til den valgte side.</p><div class="builder-add-grid">${addTypes.filter(t=>!blocks.some(b=>b.type===t)).map(t=>`<button class="btn ghost" data-act="badd" data-page="${currentSlug}" data-t="${t}">＋ ${BT[t]||t}</button>`).join('')||'<span class="mu">Alle sektioner er allerede tilføjet.</span>'}</div></div><div class="block-editor-list">${cards||'<p class="mu">Denne side har ingen sektioner endnu. Tilføj en sektion ovenfor.</p>'}</div></section><section class="builder-preview"><div class="builder-preview-head"><strong>Live preview</strong><div class="row"><button class="chip ${S.device==='desktop'?'is-selected':''}" data-act="dev" data-d="desktop">Computer</button><button class="chip ${S.device==='tablet'?'is-selected':''}" data-act="dev" data-d="tablet">Tablet</button><button class="chip ${S.device==='mobile'?'is-selected':''}" data-act="dev" data-d="mobile">Mobil</button></div></div><div class="pv"><iframe class="${S.device}" title="Live website preview" sandbox="allow-scripts" srcdoc="${esc(previewDoc(p))}"></iframe></div></section></div>`;
}
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
function vCred(){return `<h1>Credits og abonnementer</h1><div class="card" style="margin-bottom:1rem"><span class="badge">OWNER / ADMIN</span><h3 style="margin-top:.6rem">Din konto: ubegrænsede credits</h3><p class="mu">Intet trækkes, når du selv genererer, tester eller redigerer.</p></div><h3>Credit-forbrug for kunder</h3><table><tr><th>Handling</th><th>Credits</th></tr><tr><td>Generér hjemmeside</td><td>${Credits.cost.generate}</td></tr><tr><td>Chat-ændring</td><td>${Credits.cost.edit}</td></tr></table><h3 style="margin-top:1.5rem">Abonnementer (udkast)</h3><table><tr><th>Plan</th><th>Credits pr. måned</th></tr>${PLANS.map(([n,c])=>`<tr><td>${n}</td><td>${c}</td></tr>`).join('')}</table><p class="mu">Der er ikke tilsluttet nogen betaling. Priser og betalingssystem tilføjes først, når du har godkendt det.</p>`}

function vCust(){const c=Customers.all(),l=Projects.all(),f=S.cf,po=(v)=>PLANS.map(([n])=>`<option ${v===n?'selected':''}>${n}</option>`).join('');
  return `<h1>Kundehjemmesider</h1><div class="card form" style="margin-bottom:1rem"><h3>Ny kunde</h3><label>Navn<input data-g="name" value="${esc(f.name)}"></label><label>E-mail<input data-g="email" value="${esc(f.email)}"></label><label>Plan<select data-g="plan">${po(f.plan)}</select></label>${S.err?`<p class="err">${esc(S.err)}</p>`:''}<button class="btn" data-act="cadd">Tilføj kunde</button></div><h3>Kunder</h3>`+(c.length?`<table><tr><th>Kunde</th><th>Plan</th><th>Credits</th><th></th></tr>${c.map(u=>`<tr><td>${esc(u.name)}<div class="mu" style="margin:0">${esc(u.email)}</div></td><td><select data-cu="${u.id}" data-cf="plan">${po(u.plan)}</select></td><td>${u.credits}</td><td><div class="row"><button class="btn ghost" data-act="cc" data-id="${u.id}" data-n="-10">−10</button><button class="btn ghost" data-act="cc" data-id="${u.id}" data-n="10">+10</button><button class="btn ghost" data-act="cdel" data-id="${u.id}">${S.cdel===u.id?'Bekræft':'Slet'}</button></div></td></tr>`).join('')}</table>`:'<p class="mu">Ingen kunder endnu.</p>')+`<h3 style="margin-top:1.5rem">Projekter</h3>`+(l.length?`<table><tr><th>Hjemmeside</th><th>Kunde</th></tr>${l.map(p=>`<tr><td>${esc(p.name)}</td><td><select data-cp="${p.id}"><option value="">Intern (mig)</option>${c.map(u=>`<option value="${u.id}" ${p.customerId===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select></td></tr>`).join('')}</table>`:'<p class="mu">Ingen hjemmesider endnu.</p>')}

function vStats(){const l=Projects.all(),cs=Customers.all(),leads=LeadStore.all(),ed=l.reduce((n,p)=>n+nEdits(p),0),blocks=l.reduce((n,p)=>n+(p.site.blocks||[]).length,0),calls=leads.reduce((n,x)=>n+(Array.isArray(x.callHistory)?x.callHistory.length:0),0),booked=leads.filter(x=>x.bookingAt).length,notInterested=leads.filter(x=>x.status==='not_interested').length,mx=Math.max(1,...l.map(nEdits)),tile=(v,k,d,icon)=>`<article class="insight-kpi"><span class="insight-kpi-icon">${icon}</span><div class="mu">${k}</div><strong>${v}</strong><small>${d}</small></article>`;
 return `<section class="insight-hero"><div class="insight-hero-copy"><span class="insight-eyebrow">PRIME WEBS AI · OVERBLIK</span><h1>Statistik & analyser</h1><p>Få et samlet overblik over dine projekter, kunder og AI-aktivitet.</p><div class="insight-tags"><span>✦ Projekter</span><span>✦ Kunder</span><span>✦ AI-aktivitet</span></div></div><div class="insight-hero-graphic" aria-hidden="true"><div class="insight-bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><small>INSIGHTS</small></div></section>
 <div class="insight-head"><div><h2>Platformens aktivitet</h2><p class="mu">Nøgletal baseret på dine gemte data.</p></div><span class="insight-local">● Data fra denne browser</span></div>
 <div class="insight-grid">${tile(l.length,'Hjemmesider','Oprettede projekter','▧')}${tile(cs.length,'Kunder','Registrerede kunder','♙')}${tile(ed,'AI-chatændringer','Registrerede redigeringer','✧')}${tile(blocks,'Website-sektioner','Sektioner i alle projekter','▤')}${tile(leads.length,'Gemte leads','Leads i din ringeliste','☎')}${tile(calls,'Opkaldsforsøg','Registreret i Only Call','↗')}${tile(booked,'Opfølgninger','Gemte aftaler på leads','◷')}${tile(notInterested,'Ikke interesseret','Leads sprunget over','−')}</div>
 <section class="insight-panel"><div class="insight-panel-head"><div><span class="insight-section-kicker">DINE WEBSITES</span><h2>Projektaktivitet</h2><p class="mu">Se aktivitet og indhold for hvert projekt.</p></div><span class="insight-count">${l.length} projekter</span></div>
 ${l.length?`<div class="insight-project-grid">${l.slice().sort((a,b)=>nEdits(b)-nEdits(a)).map(p=>{const edits=nEdits(p),sections=(p.site.blocks||[]).length;return `<article class="insight-project-card"><div class="insight-project-top"><span class="insight-project-icon">W</span><span class="insight-project-status">${p.status==='ready'?'● Klar':'● Kladde'}</span></div><h3>${esc(p.name)}</h3><div class="insight-project-stats"><span><strong>${sections}</strong> sektioner</span><span><strong>${edits}</strong> AI-ændringer</span></div><div class="insight-project-progress"><div><span>AI-aktivitet</span><strong>${edits}</strong></div><div class="insight-track"><i style="width:${edits/mx*100}%"></i></div></div></article>`}).join('')}</div>`:'<div class="insight-empty"><span>▧</span><strong>Ingen projekter endnu</strong><p class="mu">Når du opretter hjemmesider, vises deres aktivitet her.</p></div>'}</section>
 <section class="insight-panel"><div class="insight-panel-head"><div><span class="insight-section-kicker">CALL CENTER</span><h2>Lead- og opkaldsaktivitet</h2><p class="mu">Registreringer fra din ringeliste i denne browser.</p></div><span class="insight-count">${leads.filter(leadPhone).length} telefonnumre</span></div><p>Opkaldsforsøg: <strong>${calls}</strong> · Opfølgninger: <strong>${booked}</strong> · Ikke interesseret: <strong>${notInterested}</strong></p><button class="btn ghost" data-act="go" data-v="onlycall">Åbn Only Call →</button></section><p class="insight-foot">Besøgstal og konverteringer vises først, når publicering og webanalyse er tilsluttet. Statistikken bygger på lokale browserdata – ikke besøgstal fra offentlig trafik.</p>`}


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
document.addEventListener('change',e=>{const d=e.target.dataset;if(d.ff){S.ff[d.ff]=e.target.value;if(d.ff==='type'){S.ff.cat=FCAT[S.ff.type][0];render()}}});


/* ===== Lead management: create, history and calling ===== */
const LeadStore={
  all:()=>Storage.get('pw.leads',[]).filter(x=>x&&typeof x==='object'),
  save:list=>Storage.set('pw.leads',list),
  add(item){const list=this.all();this.save([{...item,id:uid(),createdAt:Date.now()},...list]);},
  remove(id){this.save(this.all().filter(x=>x.id!==id))}
};
// One-time import: user-supplied call-only leads for the Ring / Only Call workspace.
// Keep the visible lead record limited to company name and phone; uncertain source numbers are flagged internally.
const RING_IMPORT_2026_11_17 = [
  {
    "name": "La Nueva Zona",
    "phone": "+34600796968",
    "phoneUnverified": false
  },
  {
    "name": "Nutrifit CCN",
    "phone": "+34647123914",
    "phoneUnverified": false
  },
  {
    "name": "Club Boxeo Utrera",
    "phone": "+34627583269",
    "phoneUnverified": false
  },
  {
    "name": "Be in shape",
    "phone": "+34665117809",
    "phoneUnverified": false
  },
  {
    "name": "Canibal CrossBox | Tomares",
    "phone": "+34623533470",
    "phoneUnverified": false
  },
  {
    "name": "Dailylif Training Center 2.0",
    "phone": "+34697474811",
    "phoneUnverified": false
  },
  {
    "name": "Personal Gym, Gimnasio y G...",
    "phone": "+34954100809",
    "phoneUnverified": false
  },
  {
    "name": "CrossFit Kamikaze",
    "phone": "+34641141798",
    "phoneUnverified": false
  },
  {
    "name": "A&M Trainers S.L",
    "phone": "+34605397984",
    "phoneUnverified": false
  },
  {
    "name": "Rocódromo privado La Madri...",
    "phone": "+34651010101",
    "phoneUnverified": true
  },
  {
    "name": "Taekwondo Gerena",
    "phone": "+34654321987",
    "phoneUnverified": true
  },
  {
    "name": "Sevilla Fight Center",
    "phone": "+34612345678",
    "phoneUnverified": true
  },
  {
    "name": "Gym Coliseum",
    "phone": "+34611223344",
    "phoneUnverified": true
  },
  {
    "name": "Golden Center",
    "phone": "+34644005598",
    "phoneUnverified": false
  },
  {
    "name": "Strength Fit",
    "phone": "+34954000000",
    "phoneUnverified": true
  },
  {
    "name": "Sutemi La Algaba",
    "phone": "+34600112233",
    "phoneUnverified": true
  },
  {
    "name": "Natur Fitness Gym",
    "phone": "+34657057530",
    "phoneUnverified": false
  },
  {
    "name": "Polideportivo Municipal",
    "phone": "+34955000000",
    "phoneUnverified": true
  },
  {
    "name": "MB TRAINER Centro De Entre...",
    "phone": "+34677903348",
    "phoneUnverified": false
  },
  {
    "name": "Parque de calistenia",
    "phone": "+34698889999",
    "phoneUnverified": true
  },
  {
    "name": "Club Ciseco y Nuria",
    "phone": "+34600000000",
    "phoneUnverified": true
  },
  {
    "name": "Crossfit Rinoceronte",
    "phone": "+34611112222",
    "phoneUnverified": true
  },
  {
    "name": "Nivel 10",
    "phone": "+34622223333",
    "phoneUnverified": true
  },
  {
    "name": "Gimnasio municipal",
    "phone": "+34650763555",
    "phoneUnverified": false
  },
  {
    "name": "Street Workout Alcalá de Gu...",
    "phone": "+34633334444",
    "phoneUnverified": true
  },
  {
    "name": "Brooklyn Fitboxing Montequi...",
    "phone": "+34646481320",
    "phoneUnverified": false
  },
  {
    "name": "BodyWorks System Training ...",
    "phone": "+34689842851",
    "phoneUnverified": false
  },
  {
    "name": "Peluquería canina Elena Vázq...",
    "phone": "+34615193458",
    "phoneUnverified": false
  },
  {
    "name": "Peluquería canina Cannavaler",
    "phone": "+34644048223",
    "phoneUnverified": false
  },
  {
    "name": "Peluquería Canina María Lobay",
    "phone": "+34649696726",
    "phoneUnverified": false
  },
  {
    "name": "Peludog Marta Brito peluqu...",
    "phone": "+34692029724",
    "phoneUnverified": false
  },
  {
    "name": "Pattitas felices - Peluquería C...",
    "phone": "+34644303803",
    "phoneUnverified": false
  },
  {
    "name": "Peluquería Canina Clínica Mill...",
    "phone": "+34679578222",
    "phoneUnverified": false
  },
  {
    "name": "PELUQUERIA CANINA - CLUB...",
    "phone": "+34692029724",
    "phoneUnverified": false
  },
  {
    "name": "Encanto canino",
    "phone": "+34648416357",
    "phoneUnverified": false
  },
  {
    "name": "Peluquería Canina Mimadogs",
    "phone": "+34672138790",
    "phoneUnverified": false
  },
  {
    "name": "Lavamascotas 24h Torneo",
    "phone": "+34954907016",
    "phoneUnverified": false
  },
  {
    "name": "Peluquería Canina Entrenicle...",
    "phone": "+34640190843",
    "phoneUnverified": false
  },
  {
    "name": "Clean Dogs Sevilla",
    "phone": "+34625505314",
    "phoneUnverified": false
  },
  {
    "name": "Nayipets",
    "phone": "+34673199291",
    "phoneUnverified": false
  },
  {
    "name": "Para Mascotas",
    "phone": "+34659143940",
    "phoneUnverified": false
  },
  {
    "name": "Ohana Pet Shower",
    "phone": "+34682273420",
    "phoneUnverified": false
  },
  {
    "name": "Peluquería y estilista canina E...",
    "phone": "+34640101385",
    "phoneUnverified": false
  },
  {
    "name": "Le Bel Cane",
    "phone": "+34612345678",
    "phoneUnverified": true
  },
  {
    "name": "Noelia Cordones López",
    "phone": "+34954101980",
    "phoneUnverified": false
  },
  {
    "name": "Salon Estetica Canina Manoli...",
    "phone": "+34647419970",
    "phoneUnverified": false
  },
  {
    "name": "Glamour Canino Spa",
    "phone": "+34624119683",
    "phoneUnverified": false
  },
  {
    "name": "Las Huellas de Noah. Peluque...",
    "phone": "+34624248784",
    "phoneUnverified": false
  },
  {
    "name": "Residencia Canina",
    "phone": "+34954141235",
    "phoneUnverified": false
  },
  {
    "name": "Peluquería Canina Danacan",
    "phone": "+34962926735",
    "phoneUnverified": false
  },
  {
    "name": "Peluquería Stylo Canino",
    "phone": "+34629274182",
    "phoneUnverified": false
  },
  {
    "name": "Peluquería Canina Huellitas",
    "phone": "+34647699322",
    "phoneUnverified": false
  },
  {
    "name": "Junglanimal",
    "phone": "+34954535125",
    "phoneUnverified": false
  }
];
(()=>{
  const current=LeadStore.all();
  const key=x=>String(x.name||'').trim().toLocaleLowerCase()+'|'+String(x.phone||'').replace(/[^\\d+]/g,'');
  const known=new Set(current.map(key));
  const additions=RING_IMPORT_2026_11_17.filter(x=>!known.has(key(x))).map(x=>({...x,id:uid(),createdAt:Date.now(),callHistory:[]}));
  if(additions.length) LeadStore.save([...additions,...current]);
})();

S.leadForm={name:'',industry:'',city:'',address:'',website:'',phone:'',email:'',notes:''};
S.leadScan=S.leadScan||{city:'Málaga, Spain',industry:'hairdresser',limit:'50',noWebsiteOnly:true,loading:false,error:'',results:[],scannedAt:0};
const leadPhone=x=>String(x&&x.phone||'').replace(/[^\d+]/g,'');
const leadRing=x=>{const n=leadPhone(x);return n?'<a class="lead-call-btn" data-lead-call="'+esc(x.id)+'" href="tel:'+esc(n)+'"><span aria-hidden="true">☎</span><span>Ring nu</span></a>':'<button class="lead-call-btn" type="button" disabled>Intet nummer</button>'};
function vLeadFinder(){
 const f=S.leadForm||{},leads=LeadStore.all(),scan=S.leadScan||{city:'Málaga, Spain',industry:'hairdresser',limit:'50',noWebsiteOnly:true,loading:false,error:'',results:[]};
 const shown=(scan.results||[]).filter(x=>!scan.noWebsiteOnly||!x.website);
 const field=(k,label,placeholder='',type='text')=>'<label style="display:grid;gap:6px;font-weight:650">'+label+'<input data-lf="'+k+'" type="'+type+'" value="'+esc(f[k]||'')+'" placeholder="'+placeholder+'" style="width:100%;padding:13px;border:1px solid var(--line,#d9deea);border-radius:10px;background:var(--card,#fff);color:inherit"></label>';
 const scanResults=shown.length?'<div class="lead-scan-results">'+shown.map((x,i)=>'<article class="lead-scan-result"><div class="lead-scan-result-main"><strong>'+esc(x.name)+'</strong><span>'+esc([x.industry,x.city].filter(Boolean).join(' · '))+'</span><small>'+esc(x.address||'Adresse ikke registreret')+'</small><div class="lead-scan-tags">'+(x.website?'<span class="has-site">Hjemmeside fundet</span>':'<span class="no-site">Ingen hjemmeside registreret</span>')+(x.phone?'<span>☎ '+esc(x.phone)+'</span>':'')+(x.email?'<span>✉ '+esc(x.email)+'</span>':'')+'</div></div><button class="btn ghost" data-act="leadScanSave" data-i="'+i+'">Gem lead</button></article>').join('')+'</div>':'<div class="lead-empty">'+(scan.loading?'Søger efter virksomheder…':scan.results&&scan.results.length?'Ingen resultater matcher filteret.':'Vælg branche og område, og start en scanning.')+'</div>';
 return '<section class="lead-page"><div class="lead-hero"><div><span class="lead-kicker">PRIME WEBS AI · AUTOMATISK PROSPEKTERING</span><h1>Lead Finder</h1><p>Find lokale virksomheder – også virksomheder, hvor OpenStreetMap ikke har registreret en hjemmeside. Resultaterne kommer fra åbne OpenStreetMap-data.</p></div><div class="lead-hero-mark">⌕</div></div>'+
 '<div class="lead-panel lead-scan-panel"><div class="lead-panel-head"><div><h2>Automatisk virksomhedsscanner</h2><p>Gratis datakilde · ingen Google Maps-scraping · ingen API-nøgle.</p></div><span class="domain-status ready">OPEN DATA</span></div>'+
 '<div class="lead-scan-controls"><label>By eller område<input data-scan="city" value="'+esc(scan.city||'')+'" placeholder="Fx Málaga, Spain"></label><label>Branche<select data-scan="industry"><option value="hairdresser" '+(scan.industry==='hairdresser'?'selected':'')+'>Frisører</option><option value="beauty" '+(scan.industry==='beauty'?'selected':'')+'>Skønhedssaloner</option><option value="restaurant" '+(scan.industry==='restaurant'?'selected':'')+'>Restauranter og caféer</option><option value="auto" '+(scan.industry==='auto'?'selected':'')+'>Autoværksteder</option><option value="fitness" '+(scan.industry==='fitness'?'selected':'')+'>Fitnesscentre</option><option value="trades" '+(scan.industry==='trades'?'selected':'')+'>Håndværkere</option><option value="all" '+(scan.industry==='all'?'selected':'')+'>Alle virksomheder</option></select></label><label>Resultatgrænse<select data-scan="limit"><option value="25" '+(scan.limit==='25'?'selected':'')+'>25 virksomheder</option><option value="50" '+(scan.limit==='50'?'selected':'')+'>50 virksomheder</option><option value="100" '+(scan.limit==='100'?'selected':'')+'>100 virksomheder</option></select></label></div>'+
 '<div class="lead-scan-actions"><label class="lead-scan-check"><input type="checkbox" data-scan="noWebsiteOnly" '+(scan.noWebsiteOnly?'checked':'')+'> Vis kun virksomheder uden registreret hjemmeside</label><button class="btn" data-act="leadScan" '+(scan.loading?'disabled':'')+'>'+(scan.loading?'Scanner…':'⌕ Scan efter virksomheder')+'</button></div>'+
 (scan.error?'<p class="err" role="alert">'+esc(scan.error)+'</p>':'')+
 (scan.scannedAt?'<p class="mu">Seneste scanning: '+new Date(scan.scannedAt).toLocaleString('da-DK')+' · '+(scan.results||[]).length+' fundet · '+shown.length+' vist med nuværende filter</p>':'')+
 scanResults+
 (shown.length?'<div class="lead-scan-footer"><button class="btn ghost" data-act="leadScanSaveAll">Gem alle '+shown.length+' viste leads i Lead History</button><span class="mu">Dubletter springes over.</span></div>':'')+
 '<p class="lead-source-note">Datakvaliteten afhænger af OpenStreetMap-bidrag. Manglende hjemmeside betyder kun, at der ikke er registreret en hjemmeside i kilden – ikke et bevis på, at virksomheden ikke har en.</p></div>'+
 '<div class="settings-card" style="margin-bottom:18px"><div class="settings-card-head"><span class="settings-card-icon blue">＋</span><div><h2>Opret lead manuelt</h2><p>Tilføj en virksomhed, som scanneren ikke fandt.</p></div></div>'+
 '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">'+field('name','Virksomhedsnavn','Fx Málaga Auto Service')+field('industry','Branche','Fx autoværksted')+field('city','By / område','Fx Málaga')+field('address','Adresse','Gade, nummer og postnummer')+field('website','Hjemmeside','https://…','url')+field('phone','Telefon','Telefonnummer','tel')+field('email','E-mail','kontakt@virksomhed.dk','email')+'</div>'+
 '<label style="display:grid;gap:6px;margin-top:14px;font-weight:650">Noter<textarea data-lf="notes" rows="3" placeholder="Skriv noter om virksomheden…" style="width:100%;padding:13px;border:1px solid var(--line,#d9deea);border-radius:10px;background:var(--card,#fff);color:inherit">'+esc(f.notes||'')+'</textarea></label>'+
 (S.leadErr?'<p class="err">'+esc(S.leadErr)+'</p>':'')+
 '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:16px"><button class="btn" data-act="leadSave">＋ Gem lead</button><span class="mu">Gemte leads går videre til Ring og Only Call.</span></div></div>'+
 '<div class="settings-card"><div class="settings-card-head"><span class="settings-card-icon teal">◎</span><div><h2>Senest oprettede leads</h2><p>'+leads.length+' gemte virksomheder</p></div><span style="margin-left:auto"><button class="btn ghost" data-act="go" data-v="leadhistory">Se alle gemte leads →</button></span></div>'+
 (leads.length?'<div style="display:grid;gap:10px">'+leads.slice(0,5).map(x=>'<article class="lead-scan-result"><div class="lead-scan-result-main"><strong>'+esc(x.name)+'</strong><span>'+esc([x.industry,x.city].filter(Boolean).join(' · '))+'</span><small>'+esc(x.phone||'Intet telefonnummer')+'</small></div>'+leadRing(x)+'</article>').join('')+'</div>':'<p class="mu">Du har endnu ikke gemt nogen leads.</p>')+'</div></section>';
}
async function runLeadScan(){
 const scan=S.leadScan||{};const city=String(scan.city||'').trim();
 if(!city){scan.error='Skriv en by eller et område først.';scan.loading=false;return render()}
 scan.loading=true;scan.error='';scan.results=[];render();
 try{
  const params=new URLSearchParams({city,industry:scan.industry||'all',limit:String(scan.limit||50)});
  const response=await fetch('/api/lead-finder?'+params.toString(),{headers:{Accept:'application/json'}});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload.error||'Scanningen kunne ikke gennemføres.');
  scan.results=Array.isArray(payload.results)?payload.results:[];
  scan.scannedAt=Date.now();
  scan.source=payload.source||'OpenStreetMap';
  if(!scan.results.length)scan.error='Ingen virksomheder blev fundet i den valgte kategori. Prøv en bredere branche eller et andet område.';
 }catch(error){scan.error=error.message||'Kunne ikke hente virksomhedsdata.'}
 scan.loading=false;render();
}
function saveScannedLead(x){
 if(!x||!x.name)return false;
 const list=LeadStore.all(),norm=v=>String(v||'').trim().toLowerCase(),phone=v=>String(v||'').replace(/[^\d]/g,'');
 const duplicate=list.some(y=>(phone(x.phone)&&phone(y.phone)===phone(x.phone))||(!phone(x.phone)&&norm(y.name)===norm(x.name)&&norm(y.city)===norm(x.city)));
 if(duplicate)return false;
 LeadStore.add({name:x.name,industry:x.industry||'',city:x.city||'',address:x.address||'',website:x.website||'',phone:x.phone||'',email:x.email||'',source:'OpenStreetMap',sourceId:x.sourceId||'',noWebsite:!x.website,notes:'Fundet via OpenStreetMap. '+(!x.website?'Ingen hjemmeside er registreret i datakilden.':'Hjemmeside: '+x.website),status:'new'});
 return true;
}
function vLeadHistory(){
 const leads=LeadStore.all(),q=String(S.leadQuery||'').toLowerCase().trim(),list=leads.filter(x=>[x.name,x.industry,x.city,x.address,x.website,x.email,x.phone].join(' ').toLowerCase().includes(q));
 const calls=list.reduce((n,x)=>n+(Array.isArray(x.callHistory)?x.callHistory.length:0),0);
 return '<section class="lead-page"><div class="lead-hero"><div><span class="lead-kicker">PRIME WEBS AI · LEAD MANAGEMENT</span><h1>Lead History</h1><p>Alle dine leads, kontaktoplysninger og tidligere opkald samlet ét sted.</p></div><div class="lead-hero-mark">◷</div></div>'+
 '<div class="lead-stats"><div><small>Gemte leads</small><strong>'+leads.length+'</strong></div><div><small>Opkaldsforsøg</small><strong>'+calls+'</strong></div><div><small>Med telefonnummer</small><strong>'+leads.filter(x=>leadPhone(x)).length+'</strong></div></div>'+
 '<div class="lead-panel"><div class="lead-panel-head"><div><h2>Alle leads</h2><p>'+list.length+' vist</p></div><button class="btn" data-act="go" data-v="leadfinder">＋ Opret lead</button></div>'+
 '<input class="lead-search" data-lead-query type="search" value="'+esc(S.leadQuery||'')+'" placeholder="Søg virksomhed, branche, by eller telefonnummer…">'+
 (list.length?'<div class="lead-list">'+list.map(x=>{const h=Array.isArray(x.callHistory)?x.callHistory:[],last=h[0];return '<article class="lead-row"><div class="lead-avatar">'+esc(String(x.name||'?').trim().slice(0,1).toUpperCase())+'</div><div class="lead-main"><strong>'+esc(x.name)+'</strong><span>'+esc([x.industry,x.city].filter(Boolean).join(' · ')||'Virksomhed')+'</span><small>'+esc(x.phone||'Intet telefonnummer')+' · '+(last?'Seneste opkaldsforsøg '+new Date(last.at).toLocaleString('da-DK'):'Ikke ringet endnu')+'</small></div>'+leadRing(x)+'<button class="btn ghost" data-act="leadDelete" data-id="'+esc(x.id)+'">'+(S.leadDelete===x.id?'Bekræft':'Slet')+'</button></article>'}).join('')+'</div>':'<p class="lead-empty">'+(leads.length?'Ingen leads matcher søgningen.':'Ingen leads gemt endnu. Opret dit første lead for at komme i gang.')+'</p>')+'</div></section>';
}

function projectSeoAudit(p){
 const blocks=p.site.blocks||[],types=new Set(blocks.map(b=>b.type)),contact=blocks.find(b=>b.type==='contact')||{},hero=blocks.find(b=>b.type==='hero')||{},meta=p.site.meta||{};
 const checks=[
  ['SEO-titel',String(meta.seoTitle||'').trim().length>=20&&String(meta.seoTitle||'').trim().length<=65,'Skriv en unik SEO-titel på cirka 50–60 tegn i Design & SEO.'],
  ['Meta-beskrivelse',String(meta.seoDescription||'').trim().length>=80&&String(meta.seoDescription||'').trim().length<=180,'Skriv en konkret metabeskrivelse på cirka 140–160 tegn i Design & SEO.'],
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
function vLeadRing(){
 const all=LeadStore.all(),q=String(S.ringQuery||'').trim().toLowerCase(),list=all.filter(x=>[x.name,x.email,x.phone].join(' ').toLowerCase().includes(q));
 const attempts=all.reduce((n,x)=>n+(Array.isArray(x.callHistory)?x.callHistory.length:0),0),ready=all.filter(x=>leadPhone(x)).length;
 const recent=all.flatMap(x=>(Array.isArray(x.callHistory)?x.callHistory:[]).map(c=>({...c,leadName:x.name,leadId:x.id}))).sort((a,b)=>b.at-a.at).slice(0,8),f=S.leadForm||{};
 const field=(key,label,placeholder,type='text')=>'<label class="lead-add-field">'+label+'<input data-lf="'+key+'" type="'+type+'" value="'+esc(f[key]||'')+'" placeholder="'+placeholder+'"></label>';
 return '<section class="lead-page"><div class="lead-hero lead-call-hero"><div><span class="lead-kicker">PRIME WEBS AI · LEAD MANAGEMENT</span><h1>Ring</h1><p>Opret og gem leads her. Brug Only Call, når du vil ringe dig gennem listen.</p></div><div class="lead-hero-mark" aria-hidden="true">☎</div></div>'+
 '<div class="lead-stats"><div><small>Gemte leads</small><strong>'+all.length+'</strong></div><div><small>Klar til opkald</small><strong>'+ready+'</strong></div><div><small>Opkaldsforsøg</small><strong>'+attempts+'</strong></div></div>'+
 '<div class="ring-shortcuts"><button class="ring-shortcut primary" data-act="go" data-v="onlycall"><span class="ring-shortcut-icon">☎</span><span><strong>Open Only Call</strong><small>Ring ét lead ad gangen</small></span><b>→</b></button><button class="ring-shortcut" data-act="go" data-v="ringcalendar"><span class="ring-shortcut-icon">▦</span><span><strong>Kalender</strong><small>Se alle bookede tider og opfølgninger</small></span><b>→</b></button><button class="ring-shortcut" data-act="go" data-v="bookings"><span class="ring-shortcut-icon">▤</span><span><strong>Bookingforespørgsler</strong><small>Se forespørgsler fra kundernes hjemmesider</small></span><b>→</b></button></div>'+
 '<div class="lead-panel lead-add-panel"><div class="lead-panel-head"><div><h2>＋ Gem lead</h2><p>Tilføj virksomhedens oplysninger til din ringeliste.</p></div></div><div class="lead-add-grid">'+field('name','Virksomhedsnavn','Fx Málaga Auto Service')+field('phone','Telefonnummer','+34 600 000 000','tel')+field('email','E-mail','kontakt@virksomhed.dk','email')+'</div>'+
 '<label class="lead-add-field" style="display:block;margin-top:12px">Noter<textarea data-lf="notes" rows="2" placeholder="Noter om virksomheden…">'+esc(f.notes||'')+'</textarea></label>'+
 (S.leadErr?'<p class="err" role="alert">'+esc(S.leadErr)+'</p>':'')+'<div class="lead-add-actions"><button class="btn" data-act="leadSave">Gem lead</button><span class="mu">Denne side gemmer leads – den starter ikke opkald.</span></div></div>'+
 '<div class="lead-panel"><div class="lead-panel-head"><div><h2>Leadliste</h2><p>'+list.length+' virksomheder</p></div><button class="btn" data-act="go" data-v="onlycall">Åbn Only Call →</button></div><input class="lead-search" data-ring-query type="search" value="'+esc(S.ringQuery||'')+'" placeholder="Søg på navn, e-mail eller telefonnummer…">'+
 (list.length?'<div class="lead-list">'+list.map(x=>{const h=Array.isArray(x.callHistory)?x.callHistory:[],last=h[0];return '<article class="lead-row lead-call-row"><div class="lead-avatar">'+esc(String(x.name||'?').trim().slice(0,1).toUpperCase())+'</div><div class="lead-main"><strong>'+esc(x.name)+'</strong><span>'+esc(x.email||'Ingen e-mail')+'</span><small>'+esc(x.phone||'Intet telefonnummer')+'</small><em>'+(last?'Sidst ringet '+new Date(last.at).toLocaleString('da-DK'):'Ikke ringet endnu')+(x.status==='not_interested'?' · Ikke interesseret':'')+(x.bookingAt?' · Opfølgning '+new Date(x.bookingAt).toLocaleString('da-DK'):'')+'</em></div></article>'}).join('')+'</div>':'<p class="lead-empty">'+(all.length?'Ingen leads matcher søgningen.':'Du har ingen leads endnu.')+'</p>')+'</div>'+
 '<div class="lead-panel"><div class="lead-panel-head"><div><h2>Lead History</h2><p>Seneste opkaldsforsøg</p></div></div>'+(recent.length?'<div class="lead-call-log">'+recent.map(c=>'<div class="lead-log-row"><span class="lead-log-icon">☎</span><div><strong>'+esc(c.leadName)+'</strong><small>Opkald åbnet · '+new Date(c.at).toLocaleString('da-DK')+'</small></div><span class="lead-log-status">Startet</span></div>').join('')+'</div>':'<p class="lead-empty">Historikken vises, når du ringer fra Only Call.</p>')+'</div></section>';
}

function vOnlyCall(){
 const all=LeadStore.all(),now=Date.now(),queue=all.filter(x=>leadPhone(x)&&(!Number(x.retryAt)||Number(x.retryAt)<=now));
 let idx=queue.findIndex(x=>String(x.id)===String(S.onlyCallId));
 if(idx<0&&queue.length&&!S.onlyCallDone){idx=0;S.onlyCallId=queue[0].id}
 const lead=idx>=0?queue[idx]:null,attempts=all.reduce((n,x)=>n+(Array.isArray(x.callHistory)?x.callHistory.length:0),0);
 const date=String(S.onlyCallBookingDate||''),time=String(S.onlyCallBookingTime||'');
 return '<section class="lead-page onlycall-page"><div class="lead-hero lead-call-hero"><div><span class="lead-kicker">PRIME WEBS AI · CALL WORKSPACE</span><h1>Only Call</h1><p>Ét lead ad gangen. Ring direkte fra mobilen, registrér resultatet, og gem opfølgninger i kalenderen.</p><div class="ring-calendar-hero-actions"><button class="ring-top-button" data-act="go" data-v="leadring">Leadliste</button><button class="ring-top-button" data-act="go" data-v="ringcalendar">Kalender</button><button class="ring-top-button" data-act="go" data-v="bookings">Bookingforespørgsler</button></div></div><div class="lead-hero-mark">☎</div></div>'+
 '<div class="lead-stats"><div><small>Leads i køen</small><strong>'+queue.length+'</strong></div><div><small>Opkaldsforsøg</small><strong>'+attempts+'</strong></div><div><small>Position</small><strong>'+(lead?(idx+1)+' / '+queue.length:'0 / 0')+'</strong></div></div>'+
 (lead?'<article class="lead-panel onlycall-card"><div class="lead-kicker">AKTUELT LEAD</div><h2>'+esc(lead.name)+'</h2><p class="mu">'+esc([lead.industry,lead.city].filter(Boolean).join(' · ')||'Virksomhed')+'</p><div class="onlycall-details"><div><span>Telefon</span><strong>'+esc(lead.phone)+'</strong></div>'+(lead.email?'<div><span>E-mail</span><strong>'+esc(lead.email)+'</strong></div>':'')+(lead.website?'<div><span>Hjemmeside</span><strong>'+esc(lead.website)+'</strong></div>':'')+(lead.notes?'<div><span>Noter</span><strong>'+esc(lead.notes)+'</strong></div>':'')+(lead.bookingAt?'<div><span>Næste opfølgning</span><strong>'+new Date(lead.bookingAt).toLocaleString('da-DK')+'</strong></div>':'')+'</div>'+
 '<div class="onlycall-actions"><a class="ring-action call" data-lead-call="'+esc(lead.id)+'" href="tel:'+esc(leadPhone(lead))+'"><span>☎</span><strong>Call</strong></a><button class="ring-action next" data-act="onlyCallNext"><span>→</span><strong>Next Record</strong></button><button class="ring-action" data-act="onlyCallNoAnswer"><span>◷</span><strong>No Answer · Retry in 8h</strong></button><button class="ring-action skip" data-act="onlyCallSkip"><span>×</span><strong>Not Interested</strong></button><button class="ring-action book" data-act="onlyCallOpenBooking"><span>▦</span><strong>Book a Time</strong></button></div>'+
 (S.onlyCallBookingOpen?'<div class="ring-booking-form"><div><h3>Book a follow-up</h3><p class="mu">Vælg dato og klokkeslæt. Aftalen bliver gemt i din kalender.</p></div><div class="ring-booking-fields"><label class="lead-add-field">Dato<input data-only-book-date type="date" min="'+new Date().toISOString().slice(0,10)+'" value="'+esc(date)+'"></label><label class="lead-add-field">Tidspunkt<input data-only-book-time type="time" value="'+esc(time)+'"></label></div><button class="ring-action save" data-act="onlyCallBook"><span>✓</span><strong>Save Follow-up</strong></button></div>':'')+'</article>':'<div class="lead-panel"><h2>Ingen flere leads i ringekøen</h2><p class="mu">Tilføj nye leads fra Leadliste. Leads markeret Not Interested er slettet permanent.</p><button class="btn" data-act="go" data-v="leadring">Åbn Leadliste</button></div>')+
 '<div class="lead-panel"><div class="lead-panel-head"><div><h2>Ringekø</h2><p>'+all.filter(x=>x.status==='not_interested').length+' ikke interesseret · '+all.filter(x=>x.bookingAt).length+' opfølgninger gemt</p></div><button class="btn ghost" data-act="go" data-v="leadring">Tilbage til Ring</button></div></div></section>';
}
function vRingCalendar(){
 const all=LeadStore.all(),now=new Date(),month=String(S.ringCalendarMonth||[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0')].join('-'));
 const parts=month.split('-').map(Number),year=parts[0]||now.getFullYear(),mon=(parts[1]||now.getMonth()+1)-1;
 const selected=String(S.ringCalendarDay||[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-'));
 const fmtDate=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 const appointments=all.flatMap(lead=>{
   const history=Array.isArray(lead.bookingHistory)?lead.bookingHistory:[];
   const entries=history.length?history:(lead.bookingAt?[{bookedFor:lead.bookingAt}]:[]);
   return entries.map((item,index)=>({lead,at:item.bookedFor||item.at||lead.bookingAt,index})).filter(x=>x.at&&!Number.isNaN(new Date(x.at).getTime()));
 }).sort((a,b)=>new Date(a.at)-new Date(b.at));
 const byDay={};appointments.forEach(a=>{const key=fmtDate(new Date(a.at));(byDay[key]||(byDay[key]=[])).push(a)});
 const first=new Date(year,mon,1),offset=(first.getDay()+6)%7,start=new Date(year,mon,1-offset);
 const cells=Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);const key=fmtDate(d),inside=d.getMonth()===mon,items=byDay[key]||[];return '<button class="ring-calendar-day '+(inside?'':'outside')+' '+(key===selected?'selected':'')+'" data-act="ringCalendarDay" data-date="'+key+'"><span>'+d.getDate()+'</span>'+(items.length?'<i>'+items.length+'</i>':'')+'</button>'}).join('');
 const selectedItems=byDay[selected]||[];
 const upcoming=appointments.filter(a=>new Date(a.at)>=new Date(new Date().setHours(0,0,0,0))).slice(0,10);
 const eventRow=a=>'<article class="ring-event"><div class="ring-event-time"><strong>'+new Date(a.at).toLocaleTimeString('da-DK',{hour:'2-digit',minute:'2-digit'})+'</strong><small>'+new Date(a.at).toLocaleDateString('da-DK',{day:'2-digit',month:'short'})+'</small></div><div class="ring-event-info"><strong>'+esc(a.lead.name||'Lead')+'</strong><small>'+esc(a.lead.phone||'Intet telefonnummer')+(a.lead.city?' · '+esc(a.lead.city):'')+'</small></div>'+(leadPhone(a.lead)?'<a class="ring-event-call" href="tel:'+esc(leadPhone(a.lead))+'">Call</a>':'')+'</article>';
 return '<section class="lead-page ring-calendar-page"><div class="lead-hero lead-call-hero"><div><span class="lead-kicker">PRIME WEBS AI · RING CALENDAR</span><h1>Your Calendar</h1><p>Alle bookede opfølgninger fra Only Call samlet i én kalender.</p><div class="ring-calendar-hero-actions"><button class="ring-top-button" data-act="go" data-v="leadring">← Tilbage til Ring</button><button class="ring-top-button" data-act="go" data-v="onlycall">Åbn Only Call</button></div></div><div class="lead-hero-mark">▦</div></div>'+
 '<div class="ring-calendar-layout"><section class="lead-panel ring-month-panel"><div class="ring-month-head"><button class="ring-month-nav" data-act="ringCalendarPrev" aria-label="Forrige måned">‹</button><div><h2>'+first.toLocaleDateString('da-DK',{month:'long',year:'numeric'})+'</h2><p>'+appointments.length+' bookede opfølgninger i alt</p></div><button class="ring-month-nav" data-act="ringCalendarNext" aria-label="Næste måned">›</button></div><div class="ring-weekdays"><span>Man</span><span>Tir</span><span>Ons</span><span>Tor</span><span>Fre</span><span>Lør</span><span>Søn</span></div><div class="ring-calendar-grid">'+cells+'</div><div class="ring-calendar-legend"><i></i> Dag med booket opfølgning</div></section>'+
 '<section class="lead-panel ring-agenda-panel"><div class="ring-agenda-heading"><div><span class="lead-kicker">DAGENS OVERSIGT</span><h2>'+new Date(selected+'T12:00:00').toLocaleDateString('da-DK',{weekday:'long',day:'numeric',month:'long'})+'</h2></div><span class="ring-agenda-count">'+selectedItems.length+' aftaler</span></div>'+
 (selectedItems.length?'<div class="ring-event-list">'+selectedItems.map(eventRow).join('')+'</div>':'<div class="ring-calendar-empty"><span>▦</span><strong>Ingen aftaler denne dag</strong><p>Vælg en anden dato eller book en opfølgning i Only Call.</p></div>')+
 '<div class="ring-upcoming"><h3>Kommende opfølgninger</h3>'+(upcoming.length?upcoming.map(eventRow).join(''):'<p class="mu">Ingen bookede opfølgninger endnu.</p>')+'</div></section></div></section>';
}
const V={dash:vDash,list:vList,new:vNew,mini:vMini,builder:vBuilder,edit:vEdit,templates:vTpl,files:vFiles,domains:vDom,credits:vCred,customers:vCust,stats:vStats,finance:vFin,settings:vSet,admin:vAdmin,leadfinder:vLeadFinder,leadring:vLeadRing,leadhistory:vLeadHistory,onlycall:vOnlyCall,ringcalendar:vRingCalendar};
S.bookings=S.bookings||[];
V.bookings=()=>{const rows=S.bookings||[],pending=rows.filter(x=>x.status==='pending').length,status={pending:'Afventer',accepted:'Accepteret',declined:'Afvist',cancelled:'Annulleret'};return `<section class="finance-hero"><div class="finance-hero-copy"><span class="finance-eyebrow">PRIME WEBS AI · BOOKING</span><h1>Bookingforespørgsler</h1><p>Alle online bookingforespørgsler fra dine kunders hjemmesider samlet ét sted.</p><div class="finance-tags"><span>${rows.length} i alt</span><span>${pending} afventer</span></div></div></section><section class="finance-panel"><div class="finance-panel-head"><div><h2>Seneste forespørgsler</h2><p class="mu">En booking er først endeligt aftalt, når virksomheden har bekræftet den.</p></div><button class="btn ghost" data-act="bookRefresh">Opdater</button></div>${rows.length?`<div class="finance-table-wrap"><table><tr><th>Dato / tid</th><th>Projekt</th><th>Kunde</th><th>Ydelse</th><th>Status</th><th>Handling</th></tr>${rows.map(x=>`<tr><td>${esc(x.requested_date)}<br>${String(x.requested_time||'').slice(0,5)}</td><td>${esc(x.projects&&x.projects.name||'Hjemmeside')}</td><td><strong>${esc(x.customer_name)}</strong><div class="mu">${esc(x.customer_email)}</div>${esc(x.customer_phone||'')}</td><td>${esc(x.service)}${x.notes?`<div class="mu">${esc(x.notes)}</div>`:''}</td><td>${status[x.status]||esc(x.status)}</td><td>${x.status==='pending'?`<button class="btn" data-act="bookStatus" data-id="${x.id}" data-status="accepted">Accepter</button> <button class="btn ghost" data-act="bookStatus" data-id="${x.id}" data-status="declined">Afvis</button>`: `<button class="btn ghost" data-act="bookStatus" data-id="${x.id}" data-status="pending">Sæt til afventer</button>`}</td></tr>`).join('')}</table></div>`:'<div class="finance-chart-empty"><span>▦</span><strong>Ingen bookingforespørgsler endnu</strong><p>Når en kunde sender en booking fra en offentliggjort hjemmeside, vises den her.</p></div>'}</section>`};

function ext(a,b){const id=b.dataset.id,d=b.dataset;
  if(a==='go'){const inner=['list','templates','edit','builder','customize','media','preview','history','export','files'];if(inner.includes(d.v)){S.view='mini';S.miniTab=d.v}else S.view=d.v;if(d.v==='onlycall'&&!S.onlyCallId&&!S.onlyCallDone){const first=LeadStore.all().find(x=>leadPhone(x));S.onlyCallId=first?.id||null}S.err='';S.out=null;S.msg='';S.rc=0;return 1}
  if(a==='pick'){S.view='mini';S.miniTab=d.t==='builder'?'builder':d.t==='customize'?'customize':d.t==='media'?'media':d.t==='preview'?'preview':d.t==='history'?'history':'edit';S.id=id;return 1}
  if(a==='unpick'){S.id=null;return 1}
  if(a==='build'){S.view='mini';S.miniTab='edit';S.id=id;return 1}
  if(a==='tpl'){const t=TPL[+d.i];if(!t)return 1;S.form={name:'',desc:t.d,style:t.s,ind:t.industry||'',svc:'',tone:'Professionel'};S.view='new';S.err='';return 1}
  if(a==='dashFilter'){S.dashFilter=d.filter||'all';return 1}
  if(a==='dashReset'){S.dashSearch='';S.dashFilter='all';return 1}
  if(a==='templateFilter'){S.templateCategory=d.filter||'Alle';return 1}
  if(a==='fileTab'){S.fileTab=d.file||'index.html';return 1}
  if(a==='zipDownload'){const p=getP();if(p)downloadProjectZip(p);return 1}
  if(a==='fileDownload'){const p=getP();if(!p)return 1;const tab=d.file||'index.html',content=tab==='index.html'?Renderer.html(p):tab==='site.json'?JSON.stringify(p.site,null,2):tab==='SEO-CHECKLIST.md'?projectSeoAudit(p):'# '+p.name+'\n\nGenereret i PRIME WEBS AI.\n\n- index.html: hjemmeside\n- site.json: struktureret indhold og design\n- SEO-CHECKLIST.md: redaktionel tjekliste\n';const blob=new Blob([content],{type:tab.endsWith('.html')?'text/html;charset=utf-8':tab.endsWith('.json')?'application/json;charset=utf-8':'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=tab;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);return 1}
  if(a==='pageAdd'){const title=String(S.newPageTitle||'').trim().slice(0,100);if(!title){banner('Skriv en titel til den nye underside.');return 1}const slug=title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50);if(!slug){banner('Skriv en gyldig sidetitel.');return 1}if((getP()?.site.pages||[]).some(x=>x.slug===slug)){banner('Der findes allerede en underside med det navn.');return 1}upd(S.id,q=>{q.history=[...q.history,structuredClone(q.site)].slice(-30);q.future=[];q.site.pages=Array.isArray(q.site.pages)?q.site.pages:[];q.site.pages.push({id:uid(),title,slug,seoTitle:title,seoDescription:'',blocks:[mk.about(title,'')]})});S.builderPage=slug;S.newPageTitle='';S.pageDelete=null;return 1}
  if(a==='pageRemove'){if(S.pageDelete!==d.page){S.pageDelete=d.page;return 1}upd(S.id,q=>{q.history=[...q.history,structuredClone(q.site)].slice(-30);q.future=[];q.site.pages=(q.site.pages||[]).filter(x=>x.slug!==d.page)});S.builderPage='home';S.pageDelete=null;return 1}
  if(a==='bmove'||a==='brem'||a==='badd'){upd(S.id,q=>{q.history=[...q.history,structuredClone(q.site)].slice(-30);q.future=[];const page=d.page&&d.page!=='home'?(q.site.pages||[]).find(x=>x.slug===d.page):null,bl=page?page.blocks:q.site.blocks,i=+d.i;if(a==='badd'){const ci=bl.findIndex(x=>x.type==='contact'),nb=mk[d.t](q.site.meta.title,'');(d.t!=='contact'&&ci>-1)?bl.splice(ci,0,nb):bl.push(nb)}else if(a==='brem'){if(bl[i]&&bl[i].type!=='hero'&&bl[i].type!=='contact')bl.splice(i,1)}else{const j=i+ +d.d;if(i>=0&&j>=0&&j<bl.length)[bl[i],bl[j]]=[bl[j],bl[i]]}});return 1}
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


// Record that the tel: action was initiated; the browser cannot confirm whether a call connected.
document.addEventListener('click',e=>{
 const link=e.target.closest&&e.target.closest('[data-lead-call]');
 if(!link)return;
 const id=link.getAttribute('data-lead-call'),items=LeadStore.all(),lead=items.find(x=>String(x.id)===String(id));
 if(!lead)return;
 lead.callHistory=Array.isArray(lead.callHistory)?lead.callHistory:[];
 lead.callHistory.unshift({at:Date.now()});lead.callHistory=lead.callHistory.slice(0,100);
 LeadStore.save(items);
});
document.addEventListener('input',e=>{
 if(e.target.matches('[data-ring-query]')){S.ringQuery=e.target.value;const pos=e.target.selectionStart;render();const el=document.querySelector('[data-ring-query]');if(el){el.focus();el.setSelectionRange(pos,pos)}}
});

function ext2(a,b){const d=b.dataset;
  if(a==='domSearch'){S.domainQuery=String(document.querySelector('[data-dom-query]')?.value||'').trim();S.domSearched=true;return 1}
  if(a==='leadScan'){runLeadScan();return 1}
  if(a==='leadScanSave'){const i=Number(d.i),x=(S.leadScan&&S.leadScan.results||[]).filter(v=>!S.leadScan.noWebsiteOnly||!v.website)[i];if(x){const ok=saveScannedLead(x);banner(ok?'Lead gemt i Lead History.':'Leadet findes allerede i din liste.')}return 1}
  if(a==='leadScanSaveAll'){const xs=(S.leadScan&&S.leadScan.results||[]).filter(v=>!S.leadScan.noWebsiteOnly||!v.website);let added=0;xs.forEach(x=>{if(saveScannedLead(x))added++});banner(added+' nye leads gemt. Dubletter blev sprunget over.');return 1}
  if(a==='leadSave'){const f=S.leadForm||{},name=String(f.name||'').trim(),email=String(f.email||'').trim(),phone=String(f.phone||'').trim();if(!name){S.leadErr='Skriv virksomhedens navn.';return 1}if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){S.leadErr='Skriv en gyldig e-mailadresse.';return 1}if(phone&&!/^[+\d][\d\s().-]{4,}$/.test(phone)){S.leadErr='Skriv et gyldigt telefonnummer.';return 1}LeadStore.add({name,email,phone,industry:String(f.industry||'').trim(),city:String(f.city||'').trim(),website:String(f.website||'').trim(),notes:String(f.notes||'').trim(),status:'new'});S.leadForm={name:'',industry:'',city:'',address:'',website:'',phone:'',email:'',notes:''};S.leadErr='';S.ringQuery='';S.view='leadring';return 1}
  if(a==='onlyCallOpenBooking'){S.onlyCallBookingOpen=true;return 1}
  if(a==='ringCalendarDay'){S.ringCalendarDay=d.date||'';return 1}
  if(a==='ringCalendarPrev'||a==='ringCalendarNext'){const base=String(S.ringCalendarMonth||[new Date().getFullYear(),String(new Date().getMonth()+1).padStart(2,'0')].join('-')).split('-').map(Number);const dt=new Date(base[0],base[1]-1+(a==='ringCalendarPrev'?-1:1),1);S.ringCalendarMonth=[dt.getFullYear(),String(dt.getMonth()+1).padStart(2,'0')].join('-');return 1}
  if(a==='onlyCallNext'){S.onlyCallBookingOpen=false;const q=LeadStore.all().filter(x=>leadPhone(x)&&(!Number(x.retryAt)||Number(x.retryAt)<=Date.now())),i=q.findIndex(x=>String(x.id)===String(S.onlyCallId));S.onlyCallId=i>=0&&i+1<q.length?q[i+1].id:null;S.onlyCallDone=!(i>=0&&i+1<q.length);S.onlyCallBookingDate='';S.onlyCallBookingTime='';return 1}
  if(a==='onlyCallNoAnswer'){S.onlyCallBookingOpen=false;const all=LeadStore.all(),lead=all.find(x=>String(x.id)===String(S.onlyCallId));if(!lead)return 1;lead.retryAt=Date.now()+8*60*60*1000;lead.lastCallOutcome='no_answer';lead.callHistory=Array.isArray(lead.callHistory)?lead.callHistory:[];lead.callHistory.unshift({at:Date.now(),outcome:'no_answer',retryAt:lead.retryAt});LeadStore.save(all);const q=all.filter(x=>leadPhone(x)&&(!Number(x.retryAt)||Number(x.retryAt)<=Date.now()));const i=q.findIndex(x=>String(x.id)===String(S.onlyCallId));S.onlyCallId=i>=0&&i+1<q.length?q[i+1].id:null;S.onlyCallDone=!(i>=0&&i+1<q.length);S.onlyCallBookingDate='';S.onlyCallBookingTime='';banner('No Answer gemt. Leadet kommer tilbage i Ring om 8 timer.');return 1}
  if(a==='onlyCallSkip'){S.onlyCallBookingOpen=false;const all=LeadStore.all(),oldIndex=all.filter(x=>leadPhone(x)).findIndex(x=>String(x.id)===String(S.onlyCallId)),kept=all.filter(x=>String(x.id)!==String(S.onlyCallId));LeadStore.save(kept);const q=kept.filter(x=>leadPhone(x));S.onlyCallId=q[Math.min(oldIndex,q.length-1)]?.id||null;S.onlyCallDone=q.length===0;S.onlyCallBookingDate='';S.onlyCallBookingTime='';banner('Leadet er slettet permanent fra Ring.');return 1}
  if(a==='onlyCallBook'){const all=LeadStore.all(),lead=all.find(x=>String(x.id)===String(S.onlyCallId)),date=String(S.onlyCallBookingDate||''),time=String(S.onlyCallBookingTime||'');if(!lead)return 1;if(!date||!time){banner('Vælg både dato og tidspunkt.');return 1}const when=new Date(date+'T'+time);if(Number.isNaN(when.getTime())||when.getTime()<Date.now()){banner('Vælg et tidspunkt i fremtiden.');return 1}lead.bookingAt=when.toISOString();lead.status='callback';lead.bookingHistory=Array.isArray(lead.bookingHistory)?lead.bookingHistory:[];lead.bookingHistory.unshift({at:Date.now(),bookedFor:lead.bookingAt});LeadStore.save(all);S.onlyCallBookingOpen=false;S.onlyCallBookingDate='';S.onlyCallBookingTime='';banner('Opfølgningen er gemt i kalenderen.');return 1}
  if(a==='onlyCallReset'){S.onlyCallBookingOpen=false;const all=LeadStore.all();S.onlyCallId=all.find(x=>leadPhone(x))?.id||null;S.onlyCallDone=false;return 1}
  if(a==='leadDelete'){if(S.leadDelete===d.id){LeadStore.remove(d.id);S.leadDelete=null}else S.leadDelete=d.id;return 1}
  if(a==='grp'){const n=Storage.get('pw.nav',{});n[d.g]=n[d.g]===0?1:0;Storage.set('pw.nav',n);return 1}
  if(a==='miniTab'){S.view='mini';S.miniTab=d.tab;S.err='';S.out=null;return 1}
  if(a==='billing'){S.pricingPeriod=d.p==='annual'?'annual':'monthly';return 1}
  if(a==='fp'){S.fp=d.p;return 1}
  if(a==='fadd'){const f=S.ff,amt=parseFloat(String(f.amount).replace(',','.'));
    if(!(amt>0)){S.err='Skriv et beløb større end 0.';return 1}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(f.date)){S.err='Vælg en dato.';return 1}
    Fin.save([{id:uid(),type:f.type,amount:Math.round(amt*100)/100,date:f.date,cat:f.cat,cust:f.cust||null,note:f.note.trim().slice(0,200)},...Fin.all()]);S.ff={...f,amount:'',note:''};S.err='';return 1}
  if(a==='fdel'){if(S.fdel===d.id){Fin.save(Fin.all().filter(e=>e.id!==d.id));S.fdel=null}else S.fdel=d.id;return 1}
  return 0}

function render0(){
  const searchWasFocused=!!document.querySelector('[data-q]:focus');
  const th=Settings.get().theme;if(th==='auto')delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=th;
  {const ac=Settings.get().accent,rs=document.documentElement.style;if(/^#[0-9a-fA-F]{6}$/.test(ac||'')){rs.setProperty('--ac',ac);rs.setProperty('--ai',lum(ac)>150?'#0E1320':'#fff');rs.setProperty('--so',ac+'26')}else['--ac','--ai','--so'].forEach(k=>rs.removeProperty(k))}
  const u=Session.user();
  const nav=`<aside class="side"><div class="logo">PRIME WEBS AI</div><input class="ms" data-q placeholder="Søg i menu…" aria-label="Søg i menu" value="${esc(S.q||'')}">${navHtml()}<div class="who"><strong>${esc(u.name)}</strong> <span class="badge">OWNER / ADMIN</span><div>Dine credits: ${Credits.unlimited()?'Ubegrænsede':Credits.balance()}</div><div class="tag">AI: ${AI.mode==='api'?'AI-server':'demo (testgenerator)'}</div></div></aside>`;
  $('#app').innerHTML=`<div class="shell">${nav}<main class="main">${safeView()}</main></div>`;
  const c=$('.msgs');if(c)c.scrollTop=c.scrollHeight;
  const i=$('#chatin');if(i&&!S.busy)i.focus();
  const mq=$('[data-q]');if(searchWasFocused&&mq){mq.focus();mq.setSelectionRange(mq.value.length,mq.value.length)}
}

async function generate(){
  const f=S.form;
  if(!f.name.trim()){S.err='Skriv et navn til projektet.';return render()}
  if(Credits.balance()<Credits.cost.generate){S.err='Du har ikke nok credits.';return render()}
  S.err='';S.busy=true;render();
  let result;
  try { result=await AI.generate({name:f.name.trim(),description:f.desc.trim(),style:f.style,industry:f.ind||'',city:(f.city||'').trim(),services:(f.svc||'').trim(),tone:f.tone||'Professionel',language:f.lang||'Dansk',color:f.color||'',background:f.background||'',phone:(f.phone||'').trim()||(f.desc.match(RX_TEL)||[''])[0].trim()||Settings.get().phone,whatsapp:(f.whatsapp||'').trim(),email:(f.email||'').trim()||(f.desc.match(RX_MAIL)||[''])[0]||Settings.get().email}); }
  catch(error){S.busy=false;S.err=error.message||'AI-generatoren kunne ikke kontaktes.';return render()}
  const site=result.site;
  site.meta=site.meta&&typeof site.meta==='object'?site.meta:{};
  site.meta.language=({Dansk:'da',English:'en',Español:'es',Deutsch:'de',Français:'fr'})[f.lang||'Dansk']||'da';
  Credits.spend('generate');
  const now=Date.now(),p={v:1,id:uid(),ownerId:Session.user().id,name:f.name.trim(),status:'draft',domain:null,plan:'free',createdAt:now,updatedAt:now,site,history:[],future:[],chat:[{r:'ai',t:'Din hjemmeside er klar. Skriv, hvad du vil ændre.'}]};
  if(result.reply)p.chat=[{r:'ai',t:result.reply}];
  Projects.save([p,...Projects.all()]);
  S.form={name:'',desc:'',style:'Moderne'};S.busy=false;S.view='mini';S.miniTab='edit';S.id=p.id;render();
}
async function send(t){
  t=(t||'').trim();if(!t||S.busy)return;const p=getP();
  upd(p.id,q=>q.chat.push({r:'u',t}));
  if(Credits.balance()<Credits.cost.edit){upd(p.id,q=>q.chat.push({r:'ai',t:'Du har ikke flere credits.'}));return render()}
  S.busy=true;render();
  try {
    const r=await AI.edit(p.site,t,p.chat.slice(-10));keepImages(p.site,r.site);
    upd(p.id,q=>{if(r.site){q.history=[...q.history,q.site].slice(-30);q.future=[];q.site=r.site;Credits.spend('edit')}q.chat.push({r:'ai',t:r.reply||'Ændringerne er udført.'})});
  } catch(error) {
    upd(p.id,q=>q.chat.push({r:'ai',t:'AI-fejl: '+(error.message||'Kunne ikke kontakte AI-generatoren.')}));
  }
  S.busy=false;render();
}
function hist(a){upd(S.id,q=>{const from=a==='undo'?q.history:q.future,to=a==='undo'?q.future:q.history;if(!from.length)return;to.push(q.site);q.site=from.pop()})}

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,id=b.dataset.id;
  if(a==='bookRefresh'){window.PWDB.listBookings().then(x=>{S.bookings=x;render()}).catch(err=>banner('Kunne ikke hente bookinger: '+err.message));return}
  if(a==='bookStatus'){window.PWDB.updateBookingStatus(id,b.dataset.status).then(()=>window.PWDB.listBookings()).then(x=>{S.bookings=x;banner('Bookingstatus er opdateret.');render()}).catch(err=>banner('Kunne ikke opdatere booking: '+err.message));return}
  if(ext2(a,b)||ext(a,b))return render();
  if(a==='renameStart'){const p=Projects.all().find(x=>x.id===id);if(p){S.renameId=id;S.renameValue=p.name||''}return render()}
  if(a==='renameCancel'){S.renameId=null;S.renameValue='';return render()}
  if(a==='renameSave'){const name=String(S.renameValue||'').trim().slice(0,80),all=Projects.all(),p=all.find(x=>x.id===id);if(!p||!name){banner('Skriv et projektnavn før du gemmer.');return render()}p.name=name;p.updatedAt=Date.now();Projects.save(all);S.renameId=null;S.renameValue='';banner('Projektnavnet er opdateret.');return render()}
  if(a==='duplicate'){duplicateProject(id);return render()}
  if(a==='gen')return generate();
  if(a==='dashGen'){const prompt=String(S.dashPrompt||'').trim();if(!prompt){S.err='Beskriv først, hvad du gerne vil bygge.';return render()}const words=prompt.replace(/^(build|create|make|lav|byg|opret)\s+(a|an|en|et)?\s*(website|site|hjemmeside|app|applikation)?\s*(for|til)?\s*/i,'').trim().split(/\s+/).slice(0,6).join(' ');S.form={...S.form,name:(words||'Nyt projekt').slice(0,48),desc:prompt,style:'Moderne'};S.err='';return generate()}
  if(a==='send')return send($('#chatin').value);
  if(a==='list'){S.view='dash';S.del=null}
  else if(a==='new'){S.view='new';S.err=''}
  else if(a==='open'){S.view='mini';S.miniTab='edit';S.id=id}
  else if(a==='del'){if(S.del===id){Projects.save(Projects.all().filter(p=>p.id!==id));S.del=null;banner('Hjemmesiden er slettet fra dit workspace.')}else S.del=id}
  else if(a==='undo'||a==='redo')hist(a);
  else if(a==='dev')S.device=b.dataset.d;
  render();
});
document.addEventListener('input',e=>{const d=e.target.dataset;if(d.renameInput!==undefined)S.renameValue=e.target.value;if(d.f)S.form[d.f]=e.target.value;if(d.newPageTitle!==undefined)S.newPageTitle=e.target.value;if(e.target.matches('[data-dash-prompt]'))S.dashPrompt=e.target.value;if(e.target.matches('[data-dash-search]'))S.dashSearch=e.target.value;if(e.target.matches('[data-template-q]'))S.templateQuery=e.target.value;if(d.g)S.cf[d.g]=e.target.value;if(d.lf)S.leadForm[d.lf]=e.target.value;if(d.scan&&e.target.type!=='checkbox')S.leadScan[d.scan]=e.target.value;if(e.target.matches('[data-only-book-date]'))S.onlyCallBookingDate=e.target.value;if(e.target.matches('[data-only-book-time]'))S.onlyCallBookingTime=e.target.value;if(e.target.matches('[data-lead-query]'))S.leadQuery=e.target.value;if(e.target.id==='rs')S.rv=e.target.value});
document.addEventListener('input',e=>{if(e.target.matches('[data-dash-search],[data-template-q]')){const selector=e.target.matches('[data-dash-search]')?'[data-dash-search]':'[data-template-q]',value=e.target.value,at=e.target.selectionStart;render();const next=document.querySelector(selector);if(next){next.focus();try{next.setSelectionRange(at,at)}catch(_){}}}});
document.addEventListener('change',e=>{const d=e.target.dataset,v=e.target.value;
  if(d.scan){S.leadScan[d.scan]=e.target.type==='checkbox'?e.target.checked:v;render();return}
  if(d.dashSort!==undefined){S.dashSort=v;render();return}
  if(d.proj!==undefined){S.id=v||null;render();return}
  if(d.builderPage!==undefined){S.builderPage=v;S.pageDelete=null;render();return}
   if(d.pageTitle!==undefined){upd(S.id,q=>{q.history=[...q.history,structuredClone(q.site)].slice(-30);q.future=[];const pg=(q.site.pages||[]).find(x=>x.slug===S.builderPage);if(pg)pg.title=String(v||'').trim().slice(0,120)});render();return}
   if(d.b!==undefined){upd(S.id,q=>{q.history=[...q.history,structuredClone(q.site)].slice(-30);q.future=[];const pg=d.page&&d.page!=='home'?(q.site.pages||[]).find(x=>x.slug===d.page):null,bl=pg?pg.blocks:q.site.blocks,b=bl[+d.b];if(!b)return;if(d.i!==undefined){const arr=Array.isArray(b[d.k])?b[d.k]:b.items;if(d.ik)arr[+d.i][d.ik]=v;else arr[+d.i]=v}else b[d.k]=v})}
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
  const about=mk.about(n,clean),blocks=[hero,mk.features(),svc,about,mk.steps(),faq,cta];
  if(wantsBooking)blocks.push({id:uid(),type:'booking',title:'Book en tid',text:'Vælg en ydelse og send os din ønskede tid.',cta:'Book en tid'});
  blocks.push(ct);
  const pages=[
    {id:uid(),title:'Ydelser',slug:'ydelser',blocks:[structuredClone(svc)]},
    {id:uid(),title:'Om os',slug:'om-os',blocks:[structuredClone(about)]},
    {id:uid(),title:'Kontakt',slug:'kontakt',blocks:[structuredClone(ct)]},
    {id:uid(),title:'Handelsbetingelser',slug:'handelsbetingelser',blocks:[mk.legal()]}
  ];
  if(wantsBooking)pages.splice(3,0,{id:uid(),title:'Booking',slug:'booking',blocks:[{id:uid(),type:'booking',title:'Book en tid',text:'Vælg en ydelse og send os din ønskede tid.',cta:'Book en tid'}]});
  return{v:1,meta:{title:n,seoTitle:n+' | '+b[1],seoDescription:hero.text.slice(0,155),theme:th},blocks,pages}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-x="fcol"]');if(b){S.form={...S.form,color:b.dataset.c};render()}});
/* ===== Farver: hjemmesidens design og dashboardets accentfarve ===== */
const swatch=(x,n,h,on)=>`<button type="button" class="swb" data-x="${x}" data-c="${h}" title="${n}" aria-label="${n}" aria-pressed="${on}" style="background:${h}"></button>`;
function designCard(p){const t=p.site.meta.theme,ac=String(t.accent).toLowerCase(),meta=p.site.meta||{};
 return `<div class="card" style="margin-bottom:.8rem"><strong>Design</strong>
 <div class="sw" style="margin:.6rem 0"><span>Accentfarve</span>${Object.entries(PAL).map(([n,h])=>swatch('acc',n,h,ac===h.toLowerCase())).join('')}<input type="color" data-th="accent" value="${esc(t.accent||'#2540D9')}" title="Egen accentfarve" aria-label="Egen accentfarve"></div>
 <div class="sw" style="margin:.6rem 0"><span>Baggrundsfarve</span><input type="color" data-th="background" value="${/^#[0-9a-fA-F]{6}$/.test(t.background||'')?t.background:'#FFFFFF'}" title="Vælg hjemmesidens baggrundsfarve" aria-label="Vælg hjemmesidens baggrundsfarve"></div>
 <div class="row"><button class="btn ${t.mode==='light'?'':'ghost'}" data-x="mode" data-v="light">Lys</button><button class="btn ${t.mode==='dark'?'':'ghost'}" data-x="mode" data-v="dark">Mørk</button><button class="btn ${t.font==='sans'?'':'ghost'}" data-x="font" data-v="sans">Sans</button><button class="btn ${t.font==='serif'?'':'ghost'}" data-x="font" data-v="serif">Serif</button></div></div>
 <div class="card" style="margin-bottom:.8rem"><strong>SEO og deling</strong><p class="mu">Disse oplysninger vises i søgeresultater og når hjemmesiden deles.</p><label>SEO-titel<input data-seo="seoTitle" maxlength="65" value="${esc(meta.seoTitle||meta.title||p.name)}" placeholder="Virksomhedsnavn · vigtigste ydelse"></label><label>Meta-beskrivelse<textarea data-seo="seoDescription" rows="4" maxlength="300" placeholder="Beskriv virksomheden og hvad kunden kan få hjælp til.">${esc(meta.seoDescription||'')}</textarea></label><small class="mu">En god titel er typisk 50–60 tegn. En god beskrivelse er typisk 140–160 tegn.</small></div>`;
}
function setTheme(k,v){upd(S.id,q=>{q.history=[...q.history,structuredClone(q.site)].slice(-30);q.future=[];q.site.meta.theme[k]=v})}
document.addEventListener('click',e=>{const b=e.target.closest('[data-x]');if(!b)return;const d=b.dataset;
  if(d.x==='uiacc'){Settings.set('accent',d.c);render()}
  else if(d.x==='uireset'){Settings.set('accent','');render()}
  else if(d.x==='acc'){setTheme('accent',d.c);render()}
  else if(d.x==='designPreset'){applyDesignPreset(d.preset);render()}
  else if(d.x==='mode'||d.x==='font'){setTheme(d.x,d.v);render()}});
document.addEventListener('change',e=>{const d=e.target.dataset;if(d.seo){upd(S.id,q=>{q.history=[...q.history,structuredClone(q.site)].slice(-30);q.future=[];q.site.meta=q.site.meta||{};q.site.meta[d.seo]=String(e.target.value||'').trim().slice(0,d.seo==='seoTitle'?160:300)});render()}else if(d.uiColor&&/^#[0-9a-fA-F]{6}$/.test(e.target.value)){Settings.set('accent',e.target.value);render()}else if(d.s){Settings.set(d.s,e.target.value);render()}else if(d.th&&/^#[0-9a-fA-F]{6}$/.test(e.target.value)){setTheme(d.th,e.target.value);if(d.th==='background'){const n=parseInt(e.target.value.slice(1),16),r=(n>>16)&255,g=(n>>8)&255,b=n&255,bright=(r*299+g*587+b*114)/1000;setTheme('surface',bright>155?'#FFFFFF':'#252A35');setTheme('text',bright>155?'#111111':'#FFFFFF');}render()}});
/* ===== Menu: farvegrupper, tællere og søgning ===== */
const GC={Dashboard:'#2540D9','Domæner og publicering':'#0E9AA7','Credits og abonnementer':'#E8730C',Finance:'#1E8E5A',System:'#6B7280','Lead værktøjer':'#7B3FD1'};
const NC={dash:'#2540D9',domains:'#0E9AA7',credits:'#E8730C',finance:'#1E8E5A',stats:'#38A3F1',settings:'#6B7280',colors:'#D6457F',contact:'#0E9AA7',adminp:'#7B3FD1',admin:'#7B3FD1',backup:'#8A5A3B',leadfinder:'#7B3FD1',leadhistory:'#0E9AA7',leadring:'#1E8E5A'};
const CNT={list:()=>Projects.all().length,customers:()=>Customers.all().length,leadfinder:()=>LeadStore.all().length,onlycall:()=>LeadStore.all().filter(x=>leadPhone(x)&&x.status!=='not_interested').length};
document.addEventListener('input',e=>{if(e.target.dataset.q!==undefined){S.q=e.target.value;render()}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset.q!==undefined){const f=$('.side .nv:not(.par)');if(f){S.q='';f.click()}}});
/* ===== Menu v2: undermenuer, hjemmeside-vælger og egne sider til redigering ===== */
const PT={edit:'AI Chat Editor',builder:'AI Website Builder',customize:'Tilpas design',media:'Billeder',preview:'Forhåndsvisning',history:'Versionshistorik'};
GC.Redigering='#0E9AA7';
function projPick(){return `<select class="ms" data-proj aria-label="Valgt hjemmeside"><option value="">Vælg hjemmeside…</option>${Projects.all().map(p=>`<option value="${p.id}" ${p.id===S.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select>`}
const NAV_ICONS={
  dash:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  new:'<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8M12 18v4M12 8v6M9 11h6"/>',
  mini:'<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8M12 18v4M7 8h10"/>',
  customers:'<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  domains:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
  credits:'<circle cx="12" cy="12" r="9"/><path d="M16 8.5c-.7-.7-1.8-1.1-3.2-1.1-1.7 0-2.8.8-2.8 2s1 1.8 2.8 2.1 2.8.9 2.8 2.1-1.1 2-2.8 2c-1.4 0-2.5-.4-3.2-1.1M12.8 5.5v13"/>',
  stats:'<path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 6-7"/>',
  finance:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  settings:'<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.7Z"/>',
  colors:'<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.7-3.1 1.8 1.8 0 0 1 1.5-2.9H18a3 3 0 0 0 3-3c0-5-4-9-9-9Z"/><circle cx="7.5" cy="10" r="1"/><circle cx="11" cy="6.5" r="1"/><circle cx="16" cy="8" r="1"/>',
  contact:'<path d="M4 13v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="12" width="4" height="7" rx="2"/><rect x="17" y="12" width="4" height="7" rx="2"/><path d="M17 19a5 5 0 0 1-5 3h-1"/>',
  adminp:'<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
  admin:'<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.7Z"/>',
  leadfinder:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M8 10h5M10.5 7.5v5"/>',
  leadhistory:'<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  leadring:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.4 2.7a2 2 0 0 1-.6 1.7L7.2 9.8a16 16 0 0 0 7 7l1.7-1.7a2 2 0 0 1 1.7-.6l2.7.4a2 2 0 0 1 1.7 2Z"/>',
  group:'<path d="M4 5h16M4 12h16M4 19h16"/>'
};
function navIcon(k){return `<svg class="nav-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${NAV_ICONS[k]||NAV_ICONS.group}</svg>`}
function navHtml(){const q=(S.q||'').toLowerCase().trim(),st=Storage.get('pw.nav',{}),adm=['adminp','admin','backup'],can=k=>!adm.includes(k)||Session.can();
  const btn=(k,t,c='')=>`<button class="nv ${c} ${S.view===k?'on':''}" style="--ni:${NC[k]||'#6B7280'}" data-act="go" data-v="${k}"><span class="nv-label">${navIcon(k)}<span>${t}</span></span>${CNT[k]?`<span class="ct">${CNT[k]()}</span>`:''}</button>`;
  return NAV.map(([g,it])=>{
    if(g==='Dashboard'||g==='Domæner og publicering'||g==='Credits og abonnementer'||g==='Finance'||g==='Statistik og analyser'){
      const [k,t]=it[0];return can(k)&&(!q||t.toLowerCase().includes(q))?btn(k,t):'';
    }
    const rows=it.filter(([k])=>can(k)).map(([k,t,ch])=>{
      if(!ch)return((!q||t.toLowerCase().includes(q))?btn(k,t):'');
      const kids=ch.filter(([,ct])=>!q||ct.toLowerCase().includes(q)||t.toLowerCase().includes(q));if(!kids.length)return '';
      const v=st['s:'+k],open=q?true:(v===undefined?ch.some(c=>c[0]===S.view):v===1);
      return `<button class="nv par" data-act="sub" data-k="${k}" aria-expanded="${open}"><span class="nv-label">${navIcon(k)}<span>${t}</span></span><span>${open?'▾':'▸'}</span></button>${open?kids.map(([ck,ct])=>btn(ck,ct,'kid')).join(''):''}`}).join('');
    if(!rows)return '';const open=q?true:st[g]!==0;
    const gi=g==='Finance'?'finance':g==='System'?'settings':g==='Domæner og publicering'?'domains':'dash';
    return `<div class="gp" style="--gc:${GC[g]}"><button class="gh" data-act="grp" data-g="${g}" aria-expanded="${open}"><span class="gh-label">${navIcon(gi)}<span>${g}</span></span><span>${open?'▾':'▸'}</span></button>${open?(g==='Redigering'?projPick():'')+rows:''}</div>`}).join('')}
const finMode=(m,title)=>{const h=vFin(),i=k=>h.indexOf('<!--'+k+'-->'),sl=(a,b)=>h.slice(i(a)+a.length+7,b?i(b):h.length);
  const head=h.slice(0,i('KPI')).replace('<h1>Finance</h1>','<h1>'+title+'</h1>');
  return head+(m==='o'?sl('KPI','FORM'):m==='l'?sl('FORM','CUST')+sl('LIST'):sl('CUST','LIST'))};
V.finance=()=>vFin();V.finlist=()=>finMode('l','Finance: Posteringer');V.fincust=()=>finMode('c','Finance: Indtægt pr. kunde');
function vMini(){const key=S.miniTab||'edit',view=V[key];return typeof view==='function'&&key!=='mini'?view():vEdit()}

const _vAdm=vAdmin;
V.admin=()=>_vAdm().split('<!--BK-->')[0].replace('<h1>Admin Panel</h1>','<h1>Admin Panel: Roller og adgang</h1>');
V.backup=()=>{const p=_vAdm().split('<!--BK-->');return p.length>1?p[1]:p[0]};
V.colors=()=>{const ac=Settings.get().accent||'';return '<div class="colors-page"><section class="settings-hero"><div><span class="settings-eyebrow">PRIME WEBS AI / PERSONALISERING</span><h1>Udseende og farver</h1><p>Tilpas dashboardets accentfarve, så kontrolpanelet får dit eget udtryk.</p></div><div class="settings-hero-icon">◉</div></section><div class="settings-layout"><div class="settings-main"><section class="settings-card"><div class="settings-card-head"><span class="settings-card-icon violet">✦</span><div><h2>Vælg accentfarve</h2><p>Farven bruges på knapper, aktive menupunkter og markeringer.</p></div></div><div class="colors-grid">'+Object.entries(PAL).map(([n,h])=>'<button type="button" class="colors-choice '+(ac.toLowerCase()===h.toLowerCase()?'active':'')+'" data-x="uiacc" data-c="'+h+'" aria-label="'+n+'" aria-pressed="'+(ac.toLowerCase()===h.toLowerCase())+'"><span style="--swatch:'+h+'"></span><small>'+n+'</small>'+(ac.toLowerCase()===h.toLowerCase()?'<b>✓</b>':'')+'</button>').join('')+'</div><div class="settings-color-custom"><label class="settings-field"><span>Egen farve</span><input type="color" data-ui-color value="'+(/^#[0-9a-fA-F]{6}$/.test(ac)?ac:'#2540D9')+'"></label><div><strong>Din accentfarve</strong><p>Vælg en vilkårlig farve med farvevælgeren.</p></div></div><button class="btn ghost settings-reset" data-x="uireset">Nulstil til standardfarve</button></section></div><aside class="settings-side"><section class="settings-card"><span class="settings-overline">EKSEMPEL</span><h3>Sådan ser farven ud</h3><div class="color-preview"><div class="color-preview-top"><span></span><span></span><span></span></div><div class="color-preview-content"><div class="color-preview-nav" style="background:'+(ac||'#2540D9')+'"></div><div><i style="background:'+(ac||'#2540D9')+'"></i><i></i><i></i><button style="background:'+(ac||'#2540D9')+'">Knap</button></div></div></div><p class="settings-status-note">Farven påvirker dashboardet – ikke designet på kundernes hjemmesider.</p></section></aside></div></div>'};

const DESIGN_PRESETS={
 ocean:{label:'Ocean Studio',accent:'#38A3F1',background:'#071B2C',backgroundStyle:'linear-gradient(135deg,#071B2C 0%,#0B3D56 52%,#102A43 100%)',surface:'#123B52',text:'#F4FAFF',font:'sans',mode:'dark',radius:'large'},
 midnight:{label:'Midnight Luxury',accent:'#C9A24B',background:'#101018',backgroundStyle:'linear-gradient(135deg,#101018 0%,#24202B 55%,#15131D 100%)',surface:'#292431',text:'#FAF6EE',font:'serif',mode:'dark',radius:'large'},
 forest:{label:'Forest & Earth',accent:'#6BAA75',background:'#10251D',backgroundStyle:'linear-gradient(135deg,#10251D 0%,#1E4936 55%,#152E27 100%)',surface:'#254D3B',text:'#F4F8F1',font:'sans',mode:'dark',radius:'large'},
 warm:{label:'Warm Editorial',accent:'#C96B45',background:'#F5EBDD',backgroundStyle:'linear-gradient(135deg,#F5EBDD 0%,#E8C9AE 52%,#F8EFE5 100%)',surface:'#FFF9F1',text:'#2B211C',font:'serif',mode:'light',radius:'large'},
 rose:{label:'Modern Rose',accent:'#C94F83',background:'#2A1425',backgroundStyle:'linear-gradient(135deg,#2A1425 0%,#55243E 55%,#25162D 100%)',surface:'#4A263F',text:'#FFF5FA',font:'sans',mode:'dark',radius:'large'},
 clean:{label:'Clean Minimal',accent:'#2457D6',background:'#F4F7FB',backgroundStyle:'linear-gradient(135deg,#F4F7FB 0%,#E6EDF7 55%,#F8FAFD 100%)',surface:'#FFFFFF',text:'#172033',font:'sans',mode:'light',radius:'large'}
};
function applyDesignPreset(key){
 const preset=DESIGN_PRESETS[key];if(!preset||!getP())return;
 upd(S.id,q=>{q.history=[...q.history,structuredClone(q.site)].slice(-30);q.future=[];q.site.meta=q.site.meta||{};q.site.meta.theme={...(q.site.meta.theme||{}),...preset};});
 banner(preset.label+' anvendt. Du kan stadig tilpasse farverne manuelt.');
}
function designAgentPanel(p){
 const cards=Object.entries(DESIGN_PRESETS).map(([key,x])=>'<button type="button" class="design-agent-choice" data-x="designPreset" data-preset="'+key+'"><span class="design-agent-swatch" style="--da-accent:'+x.accent+';--da-bg:'+x.background+'"></span><strong>'+x.label+'</strong><small>'+x.mode+' · '+x.font+'</small></button>').join('');
 return '<section class="design-agent-panel"><div><span class="dash-section-kicker">PRIME WEBS AI · DESIGN AGENT</span><h3>Vælg en komplet designretning</h3><p class="mu">Gratis designmotor uden ekstra AI-API-kald. Anvender en sammenhængende farvepalette, baggrundsgradient, overflader og typografi på hele hjemmesiden.</p></div><div class="design-agent-grid">'+cards+'</div></section>';
}

V.customize=()=>{const p=getP();if(!p)return vPick('customize');return `<div class="bar"><strong>Tilpas design: ${esc(p.name)}</strong><span class="sp"></span><button class="btn ghost" data-act="undo" ${p.history.length?'':'disabled'}>Fortryd</button><button class="btn ghost" data-act="redo" ${p.future.length?'':'disabled'}>Gentag</button></div><div class="ed"><section class="chat" style="overflow:auto">${designAgentPanel(p)}${designCard(p)}<p class="mu">Skift farve, lys eller mørk og skrifttype. Ændringer kan fortrydes.</p></section><section class="pv">${frame(p)}</section></div>`};
V.preview=()=>{const p=getP();if(!p)return vPick('preview');return `<div class="bar"><strong>Forhåndsvisning: ${esc(p.name)}</strong><span class="sp"></span><button class="btn ${S.device==='desktop'?'':'ghost'}" data-act="dev" data-d="desktop">Computer</button><button class="btn ${S.device==='tablet'?'':'ghost'}" data-act="dev" data-d="tablet">Tablet</button><button class="btn ${S.device==='mobile'?'':'ghost'}" data-act="dev" data-d="mobile">Mobil</button></div><div class="pv" style="height:78vh"><iframe class="${S.device}" title="Forhåndsvisning" sandbox="allow-scripts" srcdoc="${esc(previewDoc(p))}"></iframe></div>`};
V.history=()=>{const p=getP();if(!p)return vPick('history');const sn=p.history.map((x,i)=>[i,x]).reverse();
  return `<h1>Versionshistorik: ${esc(p.name)}</h1><p class="mu">Hver ændring gemmer den tidligere version. Gendan en version, og du kan stadig fortryde bagefter.</p>`+(sn.length?`<table><tr><th>Version</th><th>Forside</th><th>Blokke</th><th>Farve</th><th></th></tr>${sn.map(([i,x])=>`<tr><td>#${i+1}</td><td>${esc((x.blocks.find(b=>b.type==='hero')||{}).title||'')}</td><td>${x.blocks.length}</td><td><span class="swb" style="display:inline-block;width:18px;height:18px;cursor:default;background:${esc(x.meta.theme.accent)}"></span> ${esc(x.meta.theme.accent)}</td><td><button class="btn ghost" data-x="hrest" data-i="${i}">Gendan</button></td></tr>`).join('')}</table>`:'<p class="mu">Ingen tidligere versioner endnu.</p>')};
V.export=()=>{const l=Projects.all();return `<h1>Eksportér hjemmesider</h1><p class="mu">Få den færdige hjemmeside som HTML-kode, som du kan lægge på din egen hosting.</p>`+(l.length?l.map(p=>`<div class="card" style="margin-bottom:.8rem"><div class="row"><strong>${esc(p.name)}</strong><span class="sp"></span><button class="btn" data-act="exp" data-id="${p.id}">Vis HTML-kode</button></div>${S.out&&S.outId===p.id?`<label style="margin-top:1rem">HTML-kode (markér og kopiér)<textarea class="code" readonly>${esc(S.out)}</textarea></label>`:''}</div>`).join(''):'<p class="mu">Ingen hjemmesider endnu.</p>')};
document.addEventListener('click',e=>{const b=e.target.closest('[data-act="sub"],[data-x="hrest"]');if(!b)return;const d=b.dataset;
  if(d.act==='sub'){const n=Storage.get('pw.nav',{}),it=NAV.flatMap(g=>g[1]).find(x=>x[0]===d.k),v=n['s:'+d.k],open=v===undefined?it[2].some(c=>c[0]===S.view):v===1;n['s:'+d.k]=open?0:1;Storage.set('pw.nav',n);render()}
  else{upd(S.id,q=>{const sn=q.history[+d.i];if(!sn)return;q.history=[...q.history,q.site].slice(-30);q.future=[];q.site=structuredClone(sn)});render()}});
document.addEventListener('change',e=>{if(e.target.dataset.proj!==undefined){S.id=e.target.value||null;render()}});
/* ===== Prompt-først oprettelse, gemte hjemmesider i menuen og priser ===== */
const PB=['edit'];
const EXAMPLES=['Frisørsalon i Aarhus med grønne farver','Tømrerfirma i Odense, der laver tilbygninger','Café i København med frokost og kage','Konsulent, der hjælper små virksomheder med regnskab'];
function vNew(){const f={ind:'',city:'',svc:'',tone:'Professionel',color:'',lang:'Dansk',phone:'',whatsapp:'',email:'',...S.form};
  const inp=(k,t,x='')=>`<label>${t}<input data-f="${k}" value="${esc(f[k])}" ${x}></label>`;
  const sel=(k,t,arr)=>`<label>${t}<select data-f="${k}">${arr.map(o=>`<option value="${esc(o)}" ${f[k]===o?'selected':''}>${esc(o||'Find selv')}</option>`).join('')}</select></label>`;
  return `<h1>Opret ny hjemmeside</h1><div class="card form" style="max-width:720px"><label>Hvad skal hjemmesiden handle om?<textarea data-f="desc" id="nd" style="min-height:150px;font-size:1.05rem" placeholder="Beskriv virksomheden med dine egne ord. Fx: Vi er en frisørsalon i Aarhus med fokus på klip og farve. Vi vil gerne have en rolig, lys hjemmeside i grønne farver. Ring på 12 34 56 78.">${esc(f.desc)}</textarea></label><div class="row" style="margin:-.4rem 0 1rem">${EXAMPLES.map(x=>`<button type="button" class="chip" data-x="ex" data-t="${esc(x)}">${esc(x)}</button>`).join('')}</div>${inp('name','Virksomhedens navn','id="nn"')}<details data-more ${S.more?'open':''} style="margin-bottom:1rem"><summary style="cursor:pointer;font-weight:600;margin-bottom:.8rem">Flere indstillinger (valgfrit)</summary>${sel('ind','Branche',INDS)}${inp('city','By eller område')}${inp('svc','Ydelser (adskil med komma)')}${sel('tone','Tone',TONES)}${sel('style','Stil',Object.keys(STYLES))}${sel('lang','Sprog',['Dansk','English','Español','Deutsch','Français'])}<div style="margin-bottom:1rem"><strong>Accentfarve</strong><div class="sw" style="margin-top:.4rem"><button type="button" class="btn ${f.color?'ghost':''}" data-x="fcol" data-c="">Lad AI vælge</button>${Object.entries(PAL).map(([n,h])=>`<button type="button" class="swb" data-x="fcol" data-c="${h}" title="${n}" aria-label="${n}" aria-pressed="${f.color===h}" style="background:${h}"></button>`).join('')}</div></div><label>Baggrundsfarve på hele hjemmesiden<input type="color" data-f="background" value="${/^#[0-9a-fA-F]{6}$/.test(f.background||'')?f.background:'#FFFFFF'}"></label>${inp('phone','Telefon på hjemmesiden (valgfri)','placeholder="'+esc(Settings.get().phone)+'"')}${inp('whatsapp','WhatsApp-nummer (kun hvis nummeret bruger WhatsApp)','placeholder="+45 12 34 56 78"')}${inp('email','E-mail på hjemmesiden (valgfri)','placeholder="'+esc(Settings.get().email)+'"')}</details>${S.err?`<p class="err">${esc(S.err)}</p>`:''}<button class="btn" data-act="gen" ${S.busy?'disabled':''}>${S.busy?'Genererer…':'Generér hjemmeside'}</button><p class="mu" style="margin-top:.8rem">Hjemmesiden gemmes automatisk under Mine hjemmesider i menuen.</p></div>`}
V.credits=()=>{const own=Settings.get().ownerEmail,p=S.pricingPeriod||'monthly',annual=p==='annual';
  return `<section class="pricing-hero"><div class="pricing-hero-copy"><span class="pricing-eyebrow">PRIME WEBS AI · PLANER & CREDITS</span><h1>Byg mere med AI. Gør dine idéer til hjemmesider.</h1><p>Vælg den plan, der passer til dit arbejde. Brug dine AI credits til at generere hjemmesider og forbedre dem direkte med AI-chat.</p><div class="pricing-hero-points"><span>✦ AI-hjemmesidegenerering</span><span>✦ Redigering med AI-chat</span><span>✦ Credits med tydeligt forbrug</span></div></div><div class="pricing-hero-art" aria-hidden="true"><div class="pricing-orbit pricing-orbit-one"></div><div class="pricing-orbit pricing-orbit-two"></div><div class="pricing-credit-orb"><strong>AI</strong><span>CREDITS</span></div></div></section>
  <div class="pricing-heading"><div><h2>Vælg din plan</h2><p class="mu">Sammenlign credits og priser. Du kan skifte visning mellem måned og år.</p></div><div class="pricing-period" role="group" aria-label="Betalingsperiode"><button class="btn ${annual?'ghost':''}" data-act="billing" data-p="monthly">Månedlig</button><button class="btn ${annual?'':'ghost'}" data-act="billing" data-p="annual">Årlig</button></div></div>
  <div class="pricing-grid">${PLANS.map(([n,c,pr])=>`<article class="card pricing-card ${n==='Pro'?'pricing-featured':''}">${n==='Pro'?'<span class="pricing-popular">MEST POPULÆR</span>':''}<h2>${n}</h2><div class="pricing-price">${pr?`<strong>€${annual?pr*12:pr}</strong><span>/ ${annual?'år':'måned'}</span>`:'<strong>Gratis</strong>'}</div><div class="pricing-annual"><span>${pr?(annual?'Svarende til pr. måned':'Årlig pris'):'Betaling'}</span><strong>${pr?(annual?`€${pr} / måned`:`€${(pr*12).toLocaleString('da-DK')} / år`):'Engangsadgang'}</strong></div><div class="pricing-credit"><strong>${c.toLocaleString('da-DK')}</strong><span>AI credits ${pr?'pr. måned':'i alt'}</span></div><ul class="pricing-features"><li>✓ ${c.toLocaleString('da-DK')} AI credits ${pr?'hver måned':'én gang'}</li><li>✓ AI-hjemmesidegenerering</li><li>✓ Redigering med AI-chat</li>${n==='Gratis'?'<li>✓ Gratis startplan</li>':''}</ul><a class="btn pricing-cta ${pr?'':'ghost'}" href="mailto:${esc(own)}?subject=${encodeURIComponent((pr?'Bestilling af plan ':'Gratis plan: ')+n+' ('+(annual?'årlig':'månedlig')+')')}">${pr?'Kontakt for at bestille':'Kontakt for at komme i gang'}</a></article>`).join('')}</div>
  <p class="mu pricing-note">Årsprisen er beregnet som 12 månedlige betalinger uden års-rabat. Betaling og automatisk abonnementsfornyelse er endnu ikke tilsluttet.</p>
  <div class="card pricing-owner"><span class="badge">OWNER / ADMIN</span><h3>Gratis adgang til ejerens konto</h3><label>Ejerens e-mail<input data-s="ownerEmail" value="${esc(own)}"></label><p class="mu">Ejerkontoen har ubegrænsede credits og betaler aldrig. Login og individuel kundeadgang er endnu ikke fuldt tilsluttet.</p></div>
  <section class="pricing-how"><div class="pricing-how-intro"><span class="pricing-eyebrow">SÅDAN BRUGER DU DEM</span><h2>Hvad kan dine AI credits bruges til?</h2><p class="mu">Credits er dit forbrug til AI-funktionerne. Du kan følge med i, hvad en handling koster, før du vælger den.</p></div><div class="pricing-how-grid"><article class="pricing-how-card"><span class="pricing-how-icon">✦</span><div><h3>Generér en hjemmeside</h3><p>Lav en ny hjemmeside ud fra en beskrivelse af virksomheden, dens stil og ydelser.</p><strong>${Credits.cost.generate} credits pr. generering</strong></div></article><article class="pricing-how-card"><span class="pricing-how-icon">↗</span><div><h3>Redigér med AI-chat</h3><p>Bed AI'en om at ændre tekst, farver, sektioner eller indhold på en eksisterende hjemmeside.</p><strong>${Credits.cost.edit} credits pr. chat-ændring</strong></div></article></div><p class="pricing-how-foot">Dine credits bruges på AI-handlinger – ikke på almindelig visning af dine gemte hjemmesider.</p></section>`;
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-x="proj"],[data-x="ex"]');if(!b)return;const d=b.dataset;
  if(d.x==='proj'){S.id=d.id;if(!PB.includes(S.view))S.view='edit';S.err=''}else S.form={...S.form,desc:d.t};render()});
document.addEventListener('toggle',e=>{if(e.target.dataset&&e.target.dataset.more!==undefined)S.more=e.target.open},true);
const _vA2=V.admin;
V.admin=()=>_vA2()+`<div class="card" style="margin-top:1rem;max-width:720px"><h3>Login og adgang</h3><p>${S.auth&&S.auth.enabled?'Login er aktivt. Kun den godkendte e-mail kan åbne dashboardet og bruge AI-generatoren.':'Login er ikke aktiveret endnu. Alle, der kender adressen, kan åbne dashboardet (men dine data ligger kun i din egen browser, og AI-generatoren kræver adgangskode). Se README for opsætning.'}</p>${S.auth&&S.auth.authenticated?`<p class="mu">Logget ind som ${esc(S.auth.email)}</p><a class="btn ghost" href="/api/auth/logout">Log ud</a>`:''}</div>`;
/* ===== Billeder i hjemmesider ===== */
const Imgs={all:()=>Storage.get('pw.img',{}),add(id,url){try{const m=this.all();m[id]=url;Storage.set('pw.img',m);return true}catch(e){return false}}};
function imgSrc(r){r=String(r||'');if(r.startsWith('img:'))return Imgs.all()[r.slice(4)]||'';return /^https?:\/\/[^\s"'<>]+$/i.test(r)?r:''}
function keepImages(o,n){if(!n||!o)return;(n.blocks||[]).forEach(b=>{const x=o.blocks.find(y=>y.id===b.id);if(x){if(x.image&&!b.image)b.image=x.image;if(x.images&&!b.images)b.images=x.images}})}
function fileToData(file){return new Promise((ok,no)=>{const fr=new FileReader();fr.onerror=()=>no(new Error('Filen kunne ikke læses'));fr.onload=()=>{const im=new Image();im.onerror=()=>no(new Error('Filen er ikke et billede'));im.onload=()=>{const k=Math.min(1,1280/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*k));c.height=Math.max(1,Math.round(im.height*k));const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(im,0,0,c.width,c.height);ok(c.toDataURL('image/jpeg',.82))};im.src=fr.result};fr.readAsDataURL(file)})}
function setImg(slot,val){upd(S.id,q=>{q.history=[...q.history,structuredClone(q.site)].slice(-30);q.future=[];const bl=q.site.blocks;
  if(slot==='gal'){let g=bl.find(x=>x.type==='gallery');if(!g){g=mk.gallery();const ci=bl.findIndex(x=>x.type==='contact');ci>-1?bl.splice(ci,0,g):bl.push(g)}g.images=[...(g.images||[]),val].slice(0,8)}
  else{const b=bl.find(x=>x.type===slot);if(b)b.image=val}})}
function delImg(slot,i){upd(S.id,q=>{q.history=[...q.history,structuredClone(q.site)].slice(-30);q.future=[];const bl=q.site.blocks;
  if(slot==='gal'){const g=bl.find(x=>x.type==='gallery');if(g){g.images.splice(i,1);if(!g.images.length)q.site.blocks=bl.filter(x=>x!==g)}}
  else{const b=bl.find(x=>x.type===slot);if(b)delete b.image}})}
V.media=()=>{const p=getP();if(!p)return vPick('media');const bl=p.site.blocks,h=bl.find(x=>x.type==='hero'),a=bl.find(x=>x.type==='about'),g=bl.find(x=>x.type==='gallery'),gi=(g&&g.images)||[];
  const th=r=>{const s=imgSrc(r);return s?`<img src="${esc(s)}" alt="" style="width:100%;max-height:160px;object-fit:cover;border-radius:10px;margin:.5rem 0">`:''};
  const sm=r=>{const s=imgSrc(r);return s?`<img src="${esc(s)}" alt="" style="width:96px;height:70px;object-fit:cover;border-radius:8px;display:block;margin-bottom:.3rem">`:''};
  const slot=(key,title,b,hint)=>b?`<div class="card" style="margin-bottom:.8rem"><strong>${title}</strong><p class="mu">${hint}</p>${th(b.image)}<label>Upload billede<input type="file" accept="image/*" data-up="${key}"></label><label>Eller billed-adresse (URL)<input data-url="${key}" placeholder="https://…" value="${esc(String(b.image||'').startsWith('http')?b.image:'')}"></label>${b.image?`<button class="btn ghost" data-x="imgdel" data-slot="${key}">Fjern billede</button>`:''}</div>`:`<div class="card" style="margin-bottom:.8rem"><strong>${title}</strong><p class="mu">Hjemmesiden har ingen blok til dette billede. Tilføj blokken under AI Website Builder.</p></div>`;
  return `<div class="bar"><strong>Billeder: ${esc(p.name)}</strong><span class="sp"></span><button class="btn ghost" data-act="undo" ${p.history.length?'':'disabled'}>Fortryd</button><button class="btn ghost" data-act="redo" ${p.future.length?'':'disabled'}>Gentag</button></div><div class="ed"><section class="chat" style="overflow:auto">${S.msg?`<p class="err">${esc(S.msg)}</p>`:''}${slot('hero','Forsidebillede',h,'Vises ved siden af overskriften.')}${slot('about','Billede til Om os',a,'Vises ved siden af teksten om virksomheden.')}<div class="card"><strong>Galleri</strong><p class="mu">Op til 8 billeder. ${gi.length}/8 tilføjet.</p><div class="sw" style="margin:.5rem 0">${gi.map((r,i)=>`<div style="width:96px">${sm(r)}<button class="btn ghost" data-x="imgdel" data-slot="gal" data-i="${i}" style="width:100%;padding:.3rem">Fjern</button></div>`).join('')}</div>${gi.length<8?`<label>Tilføj billede<input type="file" accept="image/*" data-up="gal"></label><label>Eller billed-adresse (URL)<input data-url="gal" placeholder="https://…"></label>`:''}</div></section><section class="pv">${frame(p)}</section></div>`};
document.addEventListener('change',async e=>{const t=e.target,d=t.dataset;
  if(d.up!==undefined&&t.files&&t.files[0]){const f=t.files[0];S.msg='';
    if(f.size>12*1024*1024){S.msg='Billedet er for stort (maks. 12 MB).';return render()}
    try{const url=await fileToData(f),id=uid();if(!Imgs.add(id,url)){S.msg='Browserens lager er fuldt. Fjern billeder, eller brug en billed-adresse i stedet.';return render()}setImg(d.up,'img:'+id)}catch(err){S.msg='Billedet kunne ikke bruges: '+err.message}
    render()}
  else if(d.url!==undefined){const v=t.value.trim();if(!v)return;if(!/^https?:\/\/[^\s"'<>]+$/i.test(v)){S.msg='Billed-adressen skal starte med https://';return render()}S.msg='';setImg(d.url,v);render()}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-x="imgdel"]');if(b){delImg(b.dataset.slot,+b.dataset.i);render()}});
/* ===== Stabilitet: datareparation, fejlbeskeder i stedet for hvide skærme, Kontakt ===== */
const arr=v=>Array.isArray(v)?v:[];
function fixP(p,i){if(!p||typeof p!=='object'||Array.isArray(p))return null;
  const name=String(p.name||'Uden navn').slice(0,160),ok=p.site&&typeof p.site==='object'&&Array.isArray(p.site.blocks);
  const site=ok?p.site:{v:1,meta:{title:name,theme:{...STYLES.Moderne}},blocks:[mk.hero(name,''),mk.contact()]};
  site.meta=site.meta&&typeof site.meta==='object'?site.meta:{};site.meta.title=String(site.meta.title||name);
  const t=site.meta.theme=site.meta.theme&&typeof site.meta.theme==='object'?site.meta.theme:{};
  if(!/^#[0-9a-fA-F]{6}$/.test(t.accent))t.accent='#2540D9';if(t.font!=='serif')t.font='sans';if(t.mode!=='dark')t.mode='light';
  site.blocks=site.blocks.filter(b=>b&&typeof b==='object'&&b.type).map((b,n)=>{const o={...b,id:String(b.id||'b'+n)};
    if(['features','services','steps','faq','team'].includes(o.type))o.items=arr(o.items).map(x=>({t:String((x&&x.t)||''),d:String((x&&x.d)||'')}));if(o.type==='pricing')o.items=arr(o.items).map(x=>({t:String((x&&x.t)||''),d:String((x&&x.d)||''),price:String((x&&x.price)||'')}));
    if(o.type==='gallery')o.images=arr(o.images).filter(x=>typeof x==='string');return o});
  const sane=a=>arr(a).filter(x=>x&&typeof x==='object'&&Array.isArray(x.blocks));
  return{...p,id:String(p.id||'p'+i),name,status:p.status==='ready'?'ready':'draft',site,history:sane(p.history),future:sane(p.future),chat:arr(p.chat).filter(m=>m&&typeof m.t==='string'),createdAt:p.createdAt||Date.now(),updatedAt:p.updatedAt||Date.now()}}
function fixC(c,i){if(!c||typeof c!=='object'||Array.isArray(c))return null;return{...c,id:String(c.id||'c'+i),name:String(c.name||'Uden navn'),email:String(c.email||''),plan:String(c.plan||'Gratis'),credits:Number.isFinite(+c.credits)?+c.credits:0}}
function fixF(e,i){if(!e||typeof e!=='object'||(e.type!=='income'&&e.type!=='expense')||!(+e.amount>0)||!Number.isFinite(+e.amount))return null;
  return{...e,id:String(e.id||'f'+i),amount:+e.amount,date:/^\d{4}-\d{2}-\d{2}$/.test(String(e.date))?e.date:today(),cat:String(e.cat||'Andet'),cust:e.cust||null,note:String(e.note||'')}}
function banner(m){let b=document.getElementById('errbar');if(!b){b=document.createElement('div');b.id='errbar';b.setAttribute('role','alert');b.style.cssText='position:fixed;left:50%;transform:translateX(-50%);top:12px;z-index:99;background:#C0263A;color:#fff;padding:.6rem 1rem;border-radius:10px;max-width:90vw;box-shadow:0 4px 16px rgba(0,0,0,.2)';document.body.appendChild(b)}b.innerHTML=esc(m)+' <button data-x="closeerr" style="margin-left:.6rem">Luk</button>'}
const errCard=e=>`<h1>Siden kunne ikke vises</h1><div class="card" style="max-width:640px"><p class="err">${esc((e&&e.message)||e)}</p><p>Dine data er ikke slettet. Prøv en anden side, eller gå tilbage til Dashboard.</p><div class="row"><button class="btn" data-act="go" data-v="dash">Til Dashboard</button><button class="btn ghost" data-act="go" data-v="list">Mine hjemmesider</button></div></div>`;
function safeView(){try{return(V[S.view]||vList)()}catch(e){console.error(e);return errCard(e)}}
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
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&e.target.id==='chatin'){e.preventDefault();send(e.target.value)}});
async function boot(){
  try{
    await window.PWDB.ready;
    if(!window.PWDB.user) return loginScreen();
    await window.PWDB.refresh();
    S.bookings=await window.PWDB.listBookings();
    S.auth={enabled:true,authenticated:true,email:window.PWDB.user.email};
    render();
  }catch(e){
    window.__pwInitError=e&&e.message||'Supabase kunne ikke indlæses';
    loginScreen();
  }
}
function loginScreen(){
  S.auth={enabled:false,authenticated:false,email:''};
  $('#app').innerHTML='<main class="main" style="max-width:520px;margin:8vh auto;padding:0 16px"><div class="card"><h1>PRIME WEBS AI</h1><h2>Log ind</h2><p class="mu">Log ind med din e-mail, eller brug ejerens admin-kode.</p><form id="pwEmailLogin" style="display:grid;gap:10px;margin:18px 0"><label>E-mail<input id="pwLoginEmail" type="email" autocomplete="email" required placeholder="Din e-mailadresse" style="width:100%;padding:12px;border:1px solid #bbb;border-radius:8px"></label><button class="btn" type="submit">Send login-kode</button></form><form id="pwOtpLogin" style="display:none;gap:10px;margin:12px 0"><label>6-cifret kode<input id="pwLoginOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="Kode fra din e-mail" style="width:100%;padding:12px;border:1px solid #bbb;border-radius:8px"></label><button class="btn" type="submit">Bekræft e-mailkode</button></form><div style="border-top:1px solid #ddd;margin:22px 0;padding-top:18px"><h3>Ejerlogin</h3><form id="pwAdminLogin" style="display:grid;gap:10px"><label>Admin-kode<input id="pwAdminCode" type="password" inputmode="numeric" autocomplete="current-password" required placeholder="Indtast admin-kode" style="width:100%;padding:12px;border:1px solid #bbb;border-radius:8px"></label><button class="btn" type="submit">Log ind som ejer</button></form></div><p id="pwLoginMessage" class="mu" role="status" aria-live="polite"></p></div></main>';
  const msg=document.getElementById('pwLoginMessage');
  const busy=on=>document.querySelectorAll('#pwEmailLogin button,#pwOtpLogin button,#pwAdminLogin button').forEach(b=>b.disabled=on);
  const finish=async()=>{await window.PWDB.refresh();S.auth={enabled:true,authenticated:true,email:window.PWDB.user&&window.PWDB.user.email||''};render();};
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
