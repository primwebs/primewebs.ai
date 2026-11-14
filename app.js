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
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){this.mem[k]=v}}};
// Session: én lokal bruger nu, rigtigt login senere
const Session={user:()=>({id:'local',name:'Ejer',role:'owner',email:Settings.get().ownerEmail}),can:()=>['owner','admin'].includes(Session.user().role)};
// Credits: lokal tæller nu, regnskab + Stripe senere
const Credits={cost:{generate:10,edit:1},
  unlimited:()=>Session.can(),
  balance(){return this.unlimited()?Infinity:Storage.get('pw.credits',50)},
  spend(a){if(this.unlimited())return true;const b=this.balance(),c=this.cost[a];if(b<c)return false;Storage.set('pw.credits',b-c);return true}};
// Projects: repository, samme interface mod database senere
const Projects={all:()=>Storage.get('pw.projects',[]).map(fixP).filter(Boolean),save:l=>Storage.set('pw.projects',l)};
const Customers={all:()=>Storage.get('pw.customers',[]).map(fixC).filter(Boolean),save:l=>Storage.set('pw.customers',l)};
const Settings={d:{company:'PrimeWebs',email:'primewebssupport@gmail.com',phone:'+45 30 95 05 93',web:'https://primewebs.space',ownerEmail:'primewebssupport@gmail.com',theme:'auto'},get(){const s={...this.d,...Storage.get('pw.settings',{})};['company','email','phone','web','ownerEmail'].forEach(k=>{s[k]=String(s[k]??'')});return s},set(k,v){Storage.set('pw.settings',{...Storage.get('pw.settings',{}),[k]:v})}};

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
  hero:b=>{const im=imgSrc(b.image);return `<section class="hero${im?' two':''}"><div><h1>${esc(b.title)}</h1><p>${esc(b.text)}</p><a class="btn" href="#kontakt">${esc(b.cta)}</a></div>${im?`<img src="${esc(im)}" alt="${esc(b.title)}">`:''}</section>`},
  features:b=>`<section><h2>${esc(b.title)}</h2><div class="g">${b.items.map(i=>`<div class="c"><h3>${esc(i.t)}</h3><p>${esc(i.d)}</p></div>`).join('')}</div></section>`,
  about:b=>{const im=imgSrc(b.image),tx=String(b.text||'').split(/\n\n+/).map(x=>`<p>${esc(x)}</p>`).join('');return `<section class="ab${im?' two':''}"><div><h2>${esc(b.title)}</h2>${tx}</div>${im?`<img src="${esc(im)}" alt="${esc(b.title)}">`:''}</section>`},
  services:b=>B.features(b),
  steps:b=>`<section><h2>${esc(b.title)}</h2><div class="g">${b.items.map((i,n)=>`<div class="c"><h3>${n+1}. ${esc(i.t)}</h3><p>${esc(i.d)}</p></div>`).join('')}</div></section>`,
  faq:b=>`<section><h2>${esc(b.title)}</h2>${b.items.map(i=>`<details class="c" style="margin-bottom:.6rem"><summary style="cursor:pointer;font-weight:600">${esc(i.t)}</summary><p>${esc(i.d)}</p></details>`).join('')}</section>`,
  cta:b=>`<section style="text-align:center"><h2>${esc(b.title)}</h2><p>${esc(b.text)}</p><a class="btn" href="#kontakt">${esc(b.cta)}</a></section>`,
  gallery:b=>{const im=(b.images||[]).map(imgSrc).filter(Boolean);return im.length?`<section><h2>${esc(b.title)}</h2><div class="gal">${im.map((u,n)=>`<img src="${esc(u)}" alt="${esc(b.title)} ${n+1}" loading="lazy">`).join('')}</div></section>`:''},
  booking:b=>`<section class="booking-cta"><h2>${esc(b.title||'Book en tid')}</h2><p>${esc(b.text||'Vælg en tid, der passer dig.')}</p><a class="btn" href="?booking=1">${esc(b.cta||'Book en tid')}</a></section>`,
  contact:b=>`<section id="kontakt"><h2>${esc(b.title)}</h2><p>${esc(b.text)}</p><p><a href="tel:${esc(b.phone)}">${esc(b.phone)}</a><br><a href="mailto:${esc(b.email)}">${esc(b.email)}</a></p></section>`};
const bookingRuntime=site=>{
  const contact=site.blocks.find(b=>b.type==='contact')||{};
  const services=site.blocks.find(b=>b.type==='services');
  const choices=(services&&services.items||[]).map(x=>x.t).filter(Boolean);
  const cfg=JSON.stringify({title:site.meta.title||'Booking',email:contact.email||'',services:choices});
  return `<script>(function(){const c=${cfg};if(new URLSearchParams(location.search).get('booking')!=='1')return;
  const esc=s=>String(s||'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const today=new Date(),min=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
  document.body.innerHTML='<main style="max-width:720px;margin:0 auto;padding:clamp(24px,6vw,64px);font-family:inherit"><a href="./" style="text-decoration:none">← Tilbage til hjemmesiden</a><p style="margin-top:40px;color:#667085;font-weight:700;letter-spacing:.12em;font-size:12px">BOOKING</p><h1 style="font-size:clamp(34px,6vw,52px);line-height:1.1">Book en tid hos '+esc(c.title)+'</h1><p>Vælg en ydelse og ønsket tidspunkt. Din forespørgsel åbnes i din e-mail, så virksomheden kan bekræfte aftalen.</p><form id="pw-booking" style="display:grid;gap:16px;margin-top:28px"><label>Ydelse<select name="service" required style="display:block;width:100%;padding:14px;border:1px solid #ccd2dc;border-radius:10px;margin-top:6px">'+(c.services.length?c.services:['Aftale / konsultation']).map(x=>'<option>'+esc(x)+'</option>').join('')+'</select></label><label>Dato<input name="date" type="date" min="'+min+'" required style="display:block;width:100%;padding:14px;border:1px solid #ccd2dc;border-radius:10px;margin-top:6px"></label><label>Ønsket tidspunkt<select name="time" required style="display:block;width:100%;padding:14px;border:1px solid #ccd2dc;border-radius:10px;margin-top:6px">'+Array.from({length:18},(_,i)=>{const h=9+Math.floor(i/2),m=i%2?'30':'00';return '<option>'+String(h).padStart(2,'0')+':'+m+'</option>'}).join('')+'</select></label><label>Dit navn<input name="name" required autocomplete="name" style="display:block;width:100%;padding:14px;border:1px solid #ccd2dc;border-radius:10px;margin-top:6px"></label><label>E-mail<input name="email" type="email" required autocomplete="email" style="display:block;width:100%;padding:14px;border:1px solid #ccd2dc;border-radius:10px;margin-top:6px"></label><label>Telefon<input name="phone" type="tel" autocomplete="tel" style="display:block;width:100%;padding:14px;border:1px solid #ccd2dc;border-radius:10px;margin-top:6px"></label><button type="submit" style="border:0;border-radius:10px;padding:16px 20px;background:#2540D9;color:white;font-weight:750;font-size:16px;cursor:pointer">Send bookingforespørgsel</button><p id="pw-booking-note" style="font-size:13px;color:#667085">Aftalen er først bekræftet, når virksomheden har svaret.</p></form></main>';
  document.getElementById('pw-booking').addEventListener('submit',function(e){e.preventDefault();const d=Object.fromEntries(new FormData(this).entries());if(!c.email){document.getElementById('pw-booking-note').textContent='Virksomheden har endnu ikke angivet en e-mailadresse. Kontakt dem via hjemmesiden.';return}const subject='Bookingforespørgsel – '+c.title;const body='Bookingforespørgsel\\n\\nYdelse: '+d.service+'\\nDato: '+d.date+'\\nTid: '+d.time+'\\nNavn: '+d.name+'\\nE-mail: '+d.email+'\\nTelefon: '+d.phone+'\\n\\nSendt fra hjemmesidens bookingside.';location.href='mailto:'+encodeURIComponent(c.email)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);document.getElementById('pw-booking-note').textContent='Din e-mailapp åbnes med bookingforespørgslen. Tryk Send for at sende den.'});
  })();</script>`;
};
const lum=h=>{const n=parseInt(h.slice(1),16);return((n>>16&255)*299+(n>>8&255)*587+(n&255)*114)/1000};
const Renderer={html(p){
  const s=p.site,t=s.meta.theme||{},d=t.mode==='dark',a=/^#[0-9a-fA-F]{6}$/.test(t.accent)?t.accent:'#2540D9',bt=lum(a)>150?'#0E1320':'#fff';
  const f=t.font==='serif'?'Georgia,"Times New Roman",serif':'system-ui,-apple-system,"Segoe UI",sans-serif';
  const bg=/^#[0-9a-fA-F]{6}$/.test(t.background)?t.background:(d?'#0E1320':'#fff');
  const fg=/^#[0-9a-fA-F]{6}$/.test(t.text)?t.text:(d?'#E8ECF5':'#101828');
  const sf=/^#[0-9a-fA-F]{6}$/.test(t.surface)?t.surface:(d?'#171E30':'#F5F7FB');
  const mu=lum(fg)>150?'#F0F2F5':'#4B5565',ln=lum(bg)>150?'#D7DCE3':'#FFFFFF30';
  const body=s.blocks.map((b,i)=>{const html=(B[b.type]||(()=>''))(b);return html.replace('<section','<section id="section-'+b.type+'-'+i+'"')}).join('');
  const links=s.blocks.filter(b=>['services','about','features','gallery','contact'].includes(b.type)).map(b=>'<a href="#section-'+b.type+'-'+s.blocks.indexOf(b)+'">'+esc(BT[b.type]||b.type)+'</a>').join('');
  const nav=links?'<nav aria-label="Hovedmenu">'+links+'</nav>':'';
  const red=!!t.background&&/^#(?:D12C3F|B82032|7A1F3D)$/i.test(t.background);
  return `<!DOCTYPE html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(s.meta.title)}</title><style>
  *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:${f};background:${bg};color:${fg};line-height:1.65}
  header{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:1.5rem;padding:1rem clamp(1rem,4vw,3rem);font-weight:800;background:${bg};border-bottom:1px solid ${ln}}
  header nav{display:flex;flex-wrap:wrap;gap:1rem}header nav a{font-size:.9rem;text-decoration:none;font-weight:650}
  section{padding:clamp(3rem,7vw,6rem) clamp(1.2rem,5vw,4rem);max-width:1120px;margin:0 auto}
  h1{font-size:clamp(2.4rem,6vw,4.8rem);line-height:1.04;letter-spacing:-.04em;margin:0 0 1.2rem}h2{font-size:clamp(1.7rem,3vw,2.5rem);line-height:1.15;letter-spacing:-.025em;margin:0 0 1.4rem}
  h3{line-height:1.25}p{color:${mu};max-width:68ch}.btn{display:inline-block;background:${a};color:${bt};padding:.9rem 1.6rem;border-radius:${t.radius==='large'?'18px':'10px'};text-decoration:none;font-weight:750;box-shadow:0 8px 22px #00000018}
  .g{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1.1rem}.c{background:${sf};color:${fg};border:1px solid ${ln};border-radius:${t.radius==='large'?'22px':'14px'};padding:1.5rem;box-shadow:0 12px 32px #00000010}
  a{color:${a}}footer{padding:2rem;text-align:center;color:${fg};background:${sf};border-top:1px solid ${ln}}
  .hero{padding-top:clamp(5rem,12vw,9rem);padding-bottom:clamp(5rem,12vw,9rem)}.hero p{font-size:1.12rem}
  .hero.two,.ab.two{display:grid;grid-template-columns:1.05fr .95fr;gap:3rem;align-items:center}
  .hero img,.ab img{width:100%;border-radius:22px;object-fit:cover;aspect-ratio:4/3}
  .gal{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem}.gal img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:16px}
  details.c{margin-bottom:.7rem}summary{cursor:pointer;font-weight:700}
  ${red?'header,footer{background:'+bg+'}header nav a{color:'+fg+'} .btn{background:#FFFFFF;color:#8F1D2B} .c{background:'+sf+'}':''}
  @media(max-width:700px){header{align-items:flex-start;flex-direction:column;gap:.5rem}header nav{gap:.7rem}.hero.two,.ab.two{grid-template-columns:1fr}section{padding:3rem 1.2rem}}
  </style></head><body><header><span>${esc(s.meta.title)}</span>${nav}</header>${body}<footer>© ${esc(s.meta.title)}</footer>${bookingRuntime(s)}</body></html>`;
}};

/* ===== Lag 4: UI ===== */
let S={view:'dash',miniTab:'list',pricingPeriod:'monthly',cf:{name:'',email:'',plan:'Gratis'},out:null,outId:null,msg:'',rv:'',rc:0,cdel:null,id:null,device:'desktop',busy:false,err:'',del:null,form:{name:'',desc:'',style:'Moderne'}};
const getP=()=>Projects.all().find(p=>p.id===S.id);
const upd=(id,fn)=>{const l=Projects.all(),i=l.findIndex(p=>p.id===id);if(i<0)return;fn(l[i]);l[i].updatedAt=Date.now();Projects.save(l)};

function vList(){const l=Projects.all();
  if(!l.length)return `<div class="empty"><h1>Mine hjemmesider</h1><h3>Du har ingen projekter endnu</h3><p class="mu">Opret dit første projekt, og få en komplet hjemmeside på få sekunder.</p><button class="btn" data-act="new">Nyt projekt</button></div>`;
  return `<h1>Mine hjemmesider</h1><div class="grid">${l.map(p=>`<div class="card"><h3>${esc(p.name)}</h3><p class="mu">${p.status==='ready'?'Klar til udgivelse':'Kladde'}, ændret ${new Date(p.updatedAt).toLocaleDateString('da-DK')}</p><div class="row"><button class="btn" data-act="build" data-id="${p.id}">Rediger hjemmeside</button><button class="btn ghost" data-act="del" data-id="${p.id}">${S.del===p.id?'Bekræft sletning':'Slet'}</button></div></div>`).join('')}</div>`}


function vEdit(){const p=getP();if(!p)return vPick('edit');
  return `<div class="bar"><button class="btn ghost" data-act="list">← Mine hjemmesider</button><strong>${esc(p.name)}</strong></div>
<div class="ed"><section class="chat"><div class="editor-section"><span class="badge">Forside</span><p class="mu">Skriv alt, hvad du vil ændre på hjemmesiden, i ét felt. Du kan bede om nye overskrifter, tekster, farver, billeder, ydelser, fordele, Om os, spørgsmål og svar, opfølgning eller kontaktoplysninger.</p></div><div class="msgs">${p.chat.map(m=>`<div class="m ${m.r}">${esc(m.t)}</div>`).join('')}${S.busy?'<div class="m ai">Arbejder…</div>':''}</div><div class="prompt-box"><textarea id="chatin" rows="4" placeholder="Beskriv med dine egne ord, hvad AI'en skal ændre på hjemmesiden…" ${S.busy?'disabled':''}></textarea><button class="btn" data-act="send" ${S.busy?'disabled':''}>Send ændring</button></div></section><section class="pv"><iframe title="Live preview" sandbox="allow-scripts" srcdoc="${esc(previewDoc(p))}"></iframe></section></div>`;
}

/* ===== Nye sider ===== */
const NAV=[
 ['Dashboard',[['dash','Dashboard']]],
 ['Domæner og publicering',[['domains','Domæner og publicering']]],
 ['Credits og abonnementer',[['credits','Credits og abonnementer']]],
 ['Finance',[['finance','Finance'],['stats','Statistik og analyser']]],
 ['System',[
  ['settings','Indstillinger'],
  ['colors','Udseende og farver'],
  ['contact','Kontakt'],
  ['adminp','Admin Panel',[['admin','Roller og adgang'],['backup','Sikkerhedskopi']]]
 ]]
];
const BT={hero:'Forside',features:'Fordele',about:'Om os',contact:'Kontakt',services:'Ydelser',steps:'Sådan foregår det',faq:'Spørgsmål og svar',cta:'Opfordring',gallery:'Galleri'},LBL={title:'Overskrift',text:'Tekst',cta:'Knaptekst',email:'E-mail',phone:'Telefon',t:'Titel',d:'Beskrivelse'};
const PLANS=[['Gratis',50,0],['Starter',120,29],['Pro',250,67],['Business',500,126]];
const TPL=[{n:'Restaurant',s:'Elegant',d:'Hyggelig restaurant med lokale råvarer og sæsonens menu.'},{n:'Håndværker',s:'Moderne',d:'Pålidelig håndværker til nybyg, renovering og service.'},{n:'Frisør',s:'Frisk',d:'Frisørsalon med fokus på klip, farve og personlig rådgivning.'},{n:'Konsulent',s:'Mørk',d:'Selvstændig konsulent, der hjælper virksomheder med strategi og vækst.'}];
const CK=[[1,'AI-generator via sikker serverfunktion (API-nøgle kræves)'],[1,'Live preview og chat-redigering'],[1,'Bygger med direkte redigering af blokke'],[1,'Ejer/admin med ubegrænsede credits'],[1,'Kunder med egne credits (manuelt)'],[1,'Sikkerhedskopi og gendannelse'],[1,'Adgangskode, begrænsning og validering på AI-serveren'],[1,'Demo-tilstand, hvis AI-serveren ikke er sat op'],[0,'Login og database'],[0,'Rigtig publicering og egne domæner'],[0,'Betaling og abonnementer (kræver din godkendelse)']];
const nEdits=p=>p.chat.filter(m=>m.r==='u').length;
const snap=()=>JSON.stringify({app:'primewebs',v:1,at:new Date().toISOString(),projects:Projects.all(),customers:Customers.all(),settings:(({aiCode,...r})=>r)(Settings.get()),finance:Fin.all(),images:Imgs.all(),credits:Storage.get('pw.credits',50)},null,1);
// Forhåndsvisningen ligger i en afskærmet ramme (srcdoc). Uden <base> sender et #-link rammen til dashboardets egen adresse, og rammen bliver hvid.
function previewDoc(p){return Renderer.html(p).replace('<head>','<head><base href="about:srcdoc">')}
const frame=p=>`<iframe title="Live preview" sandbox="allow-scripts" srcdoc="${esc(previewDoc(p))}"></iframe>`;

function vPick(t){const l=Projects.all();return `<h1>${PT[t]||'Vælg hjemmeside'}</h1><p class="mu">Vælg en hjemmeside at arbejde på.</p>`+(l.length?`<div class="grid">${l.map(p=>`<div class="card"><h3>${esc(p.name)}</h3><button class="btn" data-act="pick" data-t="${t}" data-id="${p.id}">Vælg</button></div>`).join('')}</div>`:`<p>Du har ingen hjemmesider endnu.</p><button class="btn" data-act="go" data-v="new">Opret ny hjemmeside</button>`)}

function vDash(){const l=Projects.all(),u=Session.user(),currentMonth=monthKey(),previousMonth=monthKey(new Date(new Date().getFullYear(),new Date().getMonth()-1,1)),currentResult=finSum('income',currentMonth)-finSum('expense',currentMonth),previousResult=finSum('income',previousMonth)-finSum('expense',previousMonth),hasComparison=previousResult>0,change=hasComparison?Math.round((currentResult-previousResult)/Math.abs(previousResult)*100):null,trend=currentResult>0?(hasComparison?(change>0?'up':change<0?'down':'flat'):'up'):'down',trendText=currentResult>0?(hasComparison?(change>0?'↗ '+change+'% vs. sidste måned':change<0?'↘ '+Math.abs(change)+'% vs. sidste måned':'→ På niveau med sidste måned'):'↗ Overskud denne måned'):(currentResult<0?'Resultatet er negativt':'Ingen registreret profit'),t=(n,x,extra='')=>`<div class="card dash-kpi"><span class="dash-kpi-label">${x}</span><strong class="dash-kpi-value">${n}</strong>${extra}<span class="dash-kpi-accent" aria-hidden="true"></span></div>`;
  return `<section class="dash-hero"><div class="dash-hero-copy"><span class="dash-eyebrow"><span class="dash-live-dot"></span> PRIME WEBS AI <span class="dash-eyebrow-sep">/</span> WORKSPACE</span><h1>Godt at se dig igen, ${esc(u.name)}.</h1><p>Alle dine hjemmesider og værktøjer samlet ét sted.</p></div><div class="dash-hero-side"><span class="dash-status-pill"><span class="dash-live-dot"></span> Workspace aktivt</span><div class="dash-hero-mark">PW<span>AI</span></div></div></section>
  <div class="dash-kpis">${t(l.length,'Hjemmesider')}${t(Customers.all().length,'Kunder')}${t(fmt(currentResult),'Resultat denne måned',`<span class="dash-kpi-trend ${trend}" aria-label="Udvikling sammenlignet med sidste måned">${trendText}</span>`)}${t(Credits.unlimited()?'Ubegrænset':Credits.balance(),'Dine credits')}</div>
  <div class="dash-actions" style="display:flex;flex-wrap:wrap;gap:.75rem"><button class="btn dash-create-btn" data-act="go" data-v="new">＋ Create a new website</button><button class="btn" data-act="go" data-v="customers">Kundehjemmesider</button></div>
  <div class="dash-section-head"><div><span class="dash-section-kicker">DIT ARBEJDE</span><h3>Dine projekter</h3></div><span class="mu">${l.length} i alt</span></div>
  ${l.length?`<div class="grid dash-projects">${l.map(p=>{const active=p.status==='published'||p.isPublished===true||!!p.publishedAt;const status=active?'Aktiv':p.status==='ready'?'Klar til udgivelse':'Kladde';return `<article class="card dash-project-card"><div class="dash-project-symbol">✦</div><div class="dash-project-info"><div class="dash-project-name">${esc(p.name)}</div><span class="dash-project-meta"><span class="dash-project-status ${active?'is-active':''}">${status}</span><span>Opdateret ${new Date(p.updatedAt).toLocaleDateString('da-DK')}</span></span></div><button class="btn dash-open-project" data-act="build" data-id="${p.id}">Rediger hjemmeside</button></article>`}).join('')}</div>`:`<div class="card dash-empty"><div class="dash-empty-symbol">✦</div><strong>Din første hjemmeside starter her</strong><p class="mu">Opret en hjemmeside, og den vises automatisk her.</p></div>`}
  <div class="dash-health"><div class="dash-section-head"><div><span class="dash-section-kicker">SYSTEMOVERBLIK</span><h3>Platformens status</h3></div></div><div class="dash-health-grid">${CK.map(([o,x])=>`<div class="ck dash-health-item"><span class="dash-check ${o?'ok':''}">${o?'✓':'○'}</span><span>${x}</span></div>`).join('')}</div></div>`}

function vBuilder(){return vEdit()}

function vTpl(){return `<h1>Skabeloner</h1><p class="mu">Start fra en skabelon, og tilpas den bagefter.</p><div class="grid">${TPL.map((t,i)=>`<div class="card"><h3>${t.n}</h3><p class="mu">${t.d}</p><p class="mu">Stil: ${t.s}</p><button class="btn" data-act="tpl" data-i="${i}">Brug skabelon</button></div>`).join('')}</div>`}

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

function vStats(){const l=Projects.all(),cs=Customers.all(),ed=l.reduce((n,p)=>n+nEdits(p),0),blocks=l.reduce((n,p)=>n+(p.site.blocks||[]).length,0),mx=Math.max(1,...l.map(nEdits)),tile=(v,k,d,icon)=>`<article class="insight-kpi"><span class="insight-kpi-icon">${icon}</span><div class="mu">${k}</div><strong>${v}</strong><small>${d}</small></article>`;
 return `<section class="insight-hero"><div class="insight-hero-copy"><span class="insight-eyebrow">PRIME WEBS AI · OVERBLIK</span><h1>Statistik & analyser</h1><p>Få et samlet overblik over dine projekter, kunder og AI-aktivitet.</p><div class="insight-tags"><span>✦ Projekter</span><span>✦ Kunder</span><span>✦ AI-aktivitet</span></div></div><div class="insight-hero-graphic" aria-hidden="true"><div class="insight-bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><small>INSIGHTS</small></div></section>
 <div class="insight-head"><div><h2>Platformens aktivitet</h2><p class="mu">Nøgletal baseret på dine gemte data.</p></div><span class="insight-local">● Data fra denne browser</span></div>
 <div class="insight-grid">${tile(l.length,'Hjemmesider','Oprettede projekter','▧')}${tile(cs.length,'Kunder','Registrerede kunder','♙')}${tile(ed,'AI-chatændringer','Registrerede redigeringer','✧')}${tile(blocks,'Website-sektioner','Sektioner i alle projekter','▤')}</div>
 <section class="insight-panel"><div class="insight-panel-head"><div><span class="insight-section-kicker">DINE WEBSITES</span><h2>Projektaktivitet</h2><p class="mu">Se aktivitet og indhold for hvert projekt.</p></div><span class="insight-count">${l.length} projekter</span></div>
 ${l.length?`<div class="insight-project-grid">${l.slice().sort((a,b)=>nEdits(b)-nEdits(a)).map(p=>{const edits=nEdits(p),sections=(p.site.blocks||[]).length;return `<article class="insight-project-card"><div class="insight-project-top"><span class="insight-project-icon">W</span><span class="insight-project-status">${p.status==='ready'?'● Klar':'● Kladde'}</span></div><h3>${esc(p.name)}</h3><div class="insight-project-stats"><span><strong>${sections}</strong> sektioner</span><span><strong>${edits}</strong> AI-ændringer</span></div><div class="insight-project-progress"><div><span>AI-aktivitet</span><strong>${edits}</strong></div><div class="insight-track"><i style="width:${edits/mx*100}%"></i></div></div></article>`}).join('')}</div>`:'<div class="insight-empty"><span>▧</span><strong>Ingen projekter endnu</strong><p class="mu">Når du opretter hjemmesider, vises deres aktivitet her.</p></div>'}</section>
 <p class="insight-foot">Besøgstal og konverteringer vises først, når publicering og webanalyse er tilsluttet.</p>`}


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
  return `<section class="admin-hero"><div><span class="modern-eyebrow">PRIME WEBS AI · ADMINISTRATION</span><h1>Roller og adgang</h1><p>Et samlet overblik over brugerroller og adgangsniveauer. Avanceret brugeradministration er endnu ikke aktiveret.</p><div class="modern-tags"><span>♙ Brugerroller</span><span>⌑ Adgangskontrol</span><span>◉ Ejerområde</span></div></div><div class="admin-hero-art">♙<small>CONTROL</small></div></section>
  <div class="admin-role-grid"><article class="admin-role-card owner"><div class="admin-role-top"><span class="admin-role-icon">♛</span><span class="domain-status ready">Aktiv rolle</span></div><h2>Owner</h2><p>Fuld kontrol over PRIME WEBS AI, indstillinger og administration.</p><ul><li>Administrere alle projekter</li><li>Adgang til Finance og systemindstillinger</li><li>Ubegrænset adgang i ejerkontoen</li></ul></article><article class="admin-role-card"><div class="admin-role-top"><span class="admin-role-icon">♙</span><span class="domain-status">Klar til senere</span></div><h2>Admin</h2><p>Administratorrolle til medarbejdere, når brugerlogin og roller bliver implementeret.</p><ul><li>Administrere tildelte områder</li><li>Hjælpe med projekter og kunder</li><li>Adgang styres af fremtidige tilladelser</li></ul></article><article class="admin-role-card"><div class="admin-role-top"><span class="admin-role-icon">◎</span><span class="domain-status">Kommer senere</span></div><h2>Kunde</h2><p>Kundeadgang til egne hjemmesider og egne credits, når login er tilsluttet.</p><ul><li>Se egne hjemmesider</li><li>Redigere egne projekter</li><li>Ingen adgang til ejerens administration</li></ul></article></div>
  <div class="admin-notice"><span>ⓘ</span><div><strong>Roller er foreløbig visuelle</strong><p>Dashboardet bruger i øjeblikket en lokal ejer-session. Rigtig flerbruger-login, invitationer og detaljerede tilladelser er ikke aktiveret endnu.</p></div></div><!--BK--><section class="backup-hero"><div><span class="modern-eyebrow">PRIME WEBS AI · DATASIKKERHED</span><h1>Sikkerhedskopi</h1><p>Gem en kopi af dine projekter og indstillinger, så du kan gendanne dem senere.</p><div class="modern-tags"><span>▣ Manuel backup</span><span>↻ Gendannelse</span><span>⌑ Lokal data</span></div></div><div class="backup-hero-art">▣<small>BACKUP</small></div></section>
  <div class="backup-grid"><article class="backup-card"><span class="backup-card-icon">↓</span><span class="modern-kicker">EKSPORTÉR DATA</span><h2>Lav sikkerhedskopi</h2><p>Opret en kopi af hjemmesider, kunder, Finance-poster, billeder og relevante indstillinger. Gem filen et sikkert sted uden for dashboardet.</p><button class="btn" data-act="bk">Lav sikkerhedskopi</button>${S.out&&S.outId==='bk'?`<textarea class="code backup-output" readonly>${esc(S.out)}</textarea>`:''}</article><article class="backup-card restore"><span class="backup-card-icon">↻</span><span class="modern-kicker">IMPORTÉR DATA</span><h2>Gendan fra sikkerhedskopi</h2><p>Indsæt en tidligere backup. Gendannelse kan overskrive data, der ligger i dashboardet nu.</p><textarea class="code" id="rs" placeholder="Indsæt sikkerhedskopien her">${esc(S.rv)}</textarea><button class="btn ghost" data-act="rs">${S.rc?'Bekræft: overskriv al data':'Gendan fra kopi'}</button>${S.msg?`<p class="${S.msg.startsWith('Fejl')?'err':'backup-message'}">${esc(S.msg)}</p>`:''}</article></div>
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
 <div class="finance-kpi-grid">${tile(fmt(inc),'Indtægter','income','↗','Registreret i perioden')}${tile(fmt(exp),'Udgifter','expense','↘','Registreret i perioden')}${tile(fmt(res),'Resultat',res<0?'expense':'balance',res>=0?'＋':'−',res>=0?'Indtægter minus udgifter':'Udgifter overstiger indtægter')}${tile(payers,'Betalende kunder','customers','♙','Kunder med registreret indtægt')}${tile(payers?fmt(inc/payers):'–','Gns. indtægt pr. kunde','average','◎','Beregnet for perioden')}</div>
 <section class="finance-panel finance-chart-panel"><div class="finance-panel-head"><div><span class="finance-section-kicker">ØKONOMISK UDVIKLING</span><h2>Indtægter og udgifter</h2><p class="mu">${periodLabel} · måned for måned</p></div><div class="finance-legend"><span><i class="income-dot"></i>Indtægter</span><span><i class="expense-dot"></i>Udgifter</span></div></div>
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

const V={dash:vDash,list:vList,new:vNew,mini:vMini,builder:vBuilder,edit:vEdit,templates:vTpl,domains:vDom,credits:vCred,customers:vCust,stats:vStats,finance:vFin,settings:vSet,admin:vAdmin};

function ext(a,b){const id=b.dataset.id,d=b.dataset;
  if(a==='go'){const inner=['list','templates','edit','builder','customize','media','preview','history','export'];if(inner.includes(d.v)){S.view='mini';S.miniTab=d.v}else S.view=d.v;S.err='';S.out=null;S.msg='';S.rc=0;return 1}
  if(a==='pick'){S.view='mini';S.miniTab=d.t==='builder'?'builder':d.t==='customize'?'customize':d.t==='media'?'media':d.t==='preview'?'preview':d.t==='history'?'history':'edit';S.id=id;return 1}
  if(a==='unpick'){S.id=null;return 1}
  if(a==='build'){S.view='mini';S.miniTab='edit';S.id=id;return 1}
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
    try{const x=JSON.parse(S.rv||'');if(x.app!=='primewebs'||!Array.isArray(x.projects))throw 0;Projects.save(x.projects);Customers.save(x.customers||[]);Storage.set('pw.settings',{...(x.settings||{}),aiCode:Settings.get().aiCode});Fin.save(Array.isArray(x.finance)?x.finance:[]);{const im={};Object.entries(x.images||{}).forEach(([k,v])=>{if(/^[a-z0-9]{3,12}$/.test(k)&&/^data:image\/(jpeg|png|webp|gif);base64,/.test(v))im[k]=v});Storage.set('pw.img',im)}if(x.credits!=null)Storage.set('pw.credits',x.credits);S.rv='';S.msg='Gendannet: '+x.projects.length+' hjemmesider.'}catch(e){S.msg='Fejl: kopien kunne ikke læses.'}return 1}
}

function ext2(a,b){const d=b.dataset;
  if(a==='domSearch'){S.domainQuery=String(document.querySelector('[data-dom-query]')?.value||'').trim();S.domSearched=true;return 1}
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
  const nav=`<aside class="side"><div class="logo">PRIME WEBS AI</div><input class="ms" data-q placeholder="Søg i menu…" aria-label="Søg i menu" value="${esc(S.q||'')}">${navHtml()}<div class="who"><strong>${esc(u.name)}</strong> <span class="badge">OWNER / ADMIN</span><div>${Credits.unlimited()?'∞ Ubegrænsede credits':Credits.balance()+' credits'}</div><div class="tag">AI: ${AI.mode==='api'?'AI-server':'demo (testgenerator)'}</div></div></aside>`;
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
  try { result=await AI.generate({name:f.name.trim(),description:f.desc.trim(),style:f.style,industry:f.ind||'',city:(f.city||'').trim(),services:(f.svc||'').trim(),tone:f.tone||'Professionel',language:f.lang||'Dansk',color:f.color||'',background:f.background||'',phone:(f.phone||'').trim()||(f.desc.match(RX_TEL)||[''])[0].trim()||Settings.get().phone,email:(f.email||'').trim()||(f.desc.match(RX_MAIL)||[''])[0]||Settings.get().email}); }
  catch(error){S.busy=false;S.err=error.message||'AI-generatoren kunne ikke kontaktes.';return render()}
  const site=result.site;
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
    const r=await AI.edit(p.site,t);keepImages(p.site,r.site);
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
  if(a==='list'){S.view='dash';S.del=null}
  else if(a==='new'){S.view='new';S.err=''}
  else if(a==='open'){S.view='mini';S.miniTab='edit';S.id=id}
  else if(a==='del'){if(S.del===id){Projects.save(Projects.all().filter(p=>p.id!==id));S.del=null}else S.del=id}
  else if(a==='undo'||a==='redo')hist(a);
  else if(a==='dev')S.device=b.dataset.d;
  render();
});
document.addEventListener('input',e=>{const d=e.target.dataset;if(d.f)S.form[d.f]=e.target.value;if(d.g)S.cf[d.g]=e.target.value;if(e.target.id==='rs')S.rv=e.target.value});
document.addEventListener('change',e=>{const d=e.target.dataset,v=e.target.value;
  if(d.proj!==undefined){S.id=v||null;render();return}
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
const GC={Dashboard:'#2540D9','Domæner og publicering':'#0E9AA7','Credits og abonnementer':'#E8730C',Finance:'#1E8E5A',System:'#6B7280'};
const NC={dash:'#2540D9',domains:'#0E9AA7',credits:'#E8730C',finance:'#1E8E5A',stats:'#38A3F1',settings:'#6B7280',colors:'#D6457F',contact:'#0E9AA7',adminp:'#7B3FD1',admin:'#7B3FD1',backup:'#8A5A3B'};
const CNT={list:()=>Projects.all().length,customers:()=>Customers.all().length};
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
  group:'<path d="M4 5h16M4 12h16M4 19h16"/>'
};
function navIcon(k){return `<svg class="nav-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${NAV_ICONS[k]||NAV_ICONS.group}</svg>`}
function navHtml(){const q=(S.q||'').toLowerCase().trim(),st=Storage.get('pw.nav',{}),adm=['adminp','admin','backup'],can=k=>!adm.includes(k)||Session.can();
  const btn=(k,t,c='')=>`<button class="nv ${c} ${S.view===k?'on':''}" style="--ni:${NC[k]||'#6B7280'}" data-act="go" data-v="${k}"><span class="nv-label">${navIcon(k)}<span>${t}</span></span>${CNT[k]?`<span class="ct">${CNT[k]()}</span>`:''}</button>`;
  return NAV.map(([g,it])=>{
    if(g==='Dashboard'||g==='Domæner og publicering'||g==='Credits og abonnementer'){
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
function vMini(){return vEdit()}

const _vAdm=vAdmin;
V.admin=()=>_vAdm().split('<!--BK-->')[0].replace('<h1>Admin Panel</h1>','<h1>Admin Panel: Roller og adgang</h1>');
V.backup=()=>{const p=_vAdm().split('<!--BK-->');return p.length>1?p[1]:p[0]};
V.colors=()=>{const ac=Settings.get().accent||'';return '<div class="colors-page"><section class="settings-hero"><div><span class="settings-eyebrow">PRIME WEBS AI / PERSONALISERING</span><h1>Udseende og farver</h1><p>Tilpas dashboardets accentfarve, så kontrolpanelet får dit eget udtryk.</p></div><div class="settings-hero-icon">◉</div></section><div class="settings-layout"><div class="settings-main"><section class="settings-card"><div class="settings-card-head"><span class="settings-card-icon violet">✦</span><div><h2>Vælg accentfarve</h2><p>Farven bruges på knapper, aktive menupunkter og markeringer.</p></div></div><div class="colors-grid">'+Object.entries(PAL).map(([n,h])=>'<button type="button" class="colors-choice '+(ac.toLowerCase()===h.toLowerCase()?'active':'')+'" data-x="uiacc" data-c="'+h+'" aria-label="'+n+'" aria-pressed="'+(ac.toLowerCase()===h.toLowerCase())+'"><span style="--swatch:'+h+'"></span><small>'+n+'</small>'+(ac.toLowerCase()===h.toLowerCase()?'<b>✓</b>':'')+'</button>').join('')+'</div><div class="settings-color-custom"><label class="settings-field"><span>Egen farve</span><input type="color" data-ui-color value="'+(/^#[0-9a-fA-F]{6}$/.test(ac)?ac:'#2540D9')+'"></label><div><strong>Din accentfarve</strong><p>Vælg en vilkårlig farve med farvevælgeren.</p></div></div><button class="btn ghost settings-reset" data-x="uireset">Nulstil til standardfarve</button></section></div><aside class="settings-side"><section class="settings-card"><span class="settings-overline">EKSEMPEL</span><h3>Sådan ser farven ud</h3><div class="color-preview"><div class="color-preview-top"><span></span><span></span><span></span></div><div class="color-preview-content"><div class="color-preview-nav" style="background:'+(ac||'#2540D9')+'"></div><div><i style="background:'+(ac||'#2540D9')+'"></i><i></i><i></i><button style="background:'+(ac||'#2540D9')+'">Knap</button></div></div></div><p class="settings-status-note">Farven påvirker dashboardet – ikke designet på kundernes hjemmesider.</p></section></aside></div></div>'};
V.customize=()=>{const p=getP();if(!p)return vPick('customize');return `<div class="bar"><strong>Tilpas design: ${esc(p.name)}</strong><span class="sp"></span><button class="btn ghost" data-act="undo" ${p.history.length?'':'disabled'}>Fortryd</button><button class="btn ghost" data-act="redo" ${p.future.length?'':'disabled'}>Gentag</button></div><div class="ed"><section class="chat" style="overflow:auto">${designCard(p)}<p class="mu">Skift farve, lys eller mørk og skrifttype. Ændringer kan fortrydes.</p></section><section class="pv">${frame(p)}</section></div>`};
V.preview=()=>{const p=getP();if(!p)return vPick('preview');return `<div class="bar"><strong>Forhåndsvisning: ${esc(p.name)}</strong><span class="sp"></span><button class="btn ${S.device==='desktop'?'':'ghost'}" data-act="dev" data-d="desktop">Computer</button><button class="btn ${S.device==='mobile'?'':'ghost'}" data-act="dev" data-d="mobile">Mobil</button></div><div class="pv" style="height:78vh"><iframe class="${S.device}" title="Forhåndsvisning" sandbox="allow-scripts" srcdoc="${esc(previewDoc(p))}"></iframe></div>`};
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
function vNew(){const f={ind:'',city:'',svc:'',tone:'Professionel',color:'',lang:'Dansk',phone:'',email:'',...S.form};
  const inp=(k,t,x='')=>`<label>${t}<input data-f="${k}" value="${esc(f[k])}" ${x}></label>`;
  const sel=(k,t,arr)=>`<label>${t}<select data-f="${k}">${arr.map(o=>`<option value="${esc(o)}" ${f[k]===o?'selected':''}>${esc(o||'Find selv')}</option>`).join('')}</select></label>`;
  return `<h1>Opret ny hjemmeside</h1><div class="card form" style="max-width:720px"><label>Hvad skal hjemmesiden handle om?<textarea data-f="desc" id="nd" style="min-height:150px;font-size:1.05rem" placeholder="Beskriv virksomheden med dine egne ord. Fx: Vi er en frisørsalon i Aarhus med fokus på klip og farve. Vi vil gerne have en rolig, lys hjemmeside i grønne farver. Ring på 12 34 56 78.">${esc(f.desc)}</textarea></label><div class="row" style="margin:-.4rem 0 1rem">${EXAMPLES.map(x=>`<button type="button" class="chip" data-x="ex" data-t="${esc(x)}">${esc(x)}</button>`).join('')}</div>${inp('name','Virksomhedens navn','id="nn"')}<details data-more ${S.more?'open':''} style="margin-bottom:1rem"><summary style="cursor:pointer;font-weight:600;margin-bottom:.8rem">Flere indstillinger (valgfrit)</summary>${sel('ind','Branche',INDS)}${inp('city','By eller område')}${inp('svc','Ydelser (adskil med komma)')}${sel('tone','Tone',TONES)}${sel('style','Stil',Object.keys(STYLES))}${sel('lang','Sprog',['Dansk','English'])}<div style="margin-bottom:1rem"><strong>Accentfarve</strong><div class="sw" style="margin-top:.4rem"><button type="button" class="btn ${f.color?'ghost':''}" data-x="fcol" data-c="">Lad AI vælge</button>${Object.entries(PAL).map(([n,h])=>`<button type="button" class="swb" data-x="fcol" data-c="${h}" title="${n}" aria-label="${n}" aria-pressed="${f.color===h}" style="background:${h}"></button>`).join('')}</div></div><label>Baggrundsfarve på hele hjemmesiden<input type="color" data-f="background" value="${/^#[0-9a-fA-F]{6}$/.test(f.background||'')?f.background:'#FFFFFF'}"></label>${inp('phone','Telefon på hjemmesiden (valgfri)','placeholder="'+esc(Settings.get().phone)+'"')}${inp('email','E-mail på hjemmesiden (valgfri)','placeholder="'+esc(Settings.get().email)+'"')}</details>${S.err?`<p class="err">${esc(S.err)}</p>`:''}<button class="btn" data-act="gen" ${S.busy?'disabled':''}>${S.busy?'Genererer…':'Generér hjemmeside'}</button><p class="mu" style="margin-top:.8rem">Hjemmesiden gemmes automatisk under Mine hjemmesider i menuen.</p></div>`}
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
const Imgs={all:()=>Storage.get('pw.img',{}),add(id,url){try{const m=this.all();m[id]=url;localStorage.setItem('pw.img',JSON.stringify(m));return true}catch(e){return false}}};
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
    if(['features','services','steps','faq'].includes(o.type))o.items=arr(o.items).map(x=>({t:String((x&&x.t)||''),d:String((x&&x.d)||'')}));
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
V.contact=()=>{const s=Settings.get();return '<div class="contact-page"><section class="settings-hero"><div><span class="settings-eyebrow">PRIME WEBS AI / VIRKSOMHED</span><h1>Kontakt</h1><p>Virksomhedens kontaktoplysninger og support samlet ét sted.</p></div><div class="settings-hero-icon">✉</div></section><div class="contact-layout"><section class="settings-card"><div class="contact-profile-top"><div class="settings-avatar">PW</div><div><span class="settings-overline">VIRKSOMHEDSPROFIL</span><h2>'+esc(s.company)+'</h2><p>Officielle kontaktoplysninger</p></div></div><a class="contact-detail" href="mailto:'+esc(s.email)+'"><span class="contact-detail-icon">✉</span><span><small>E-MAIL</small><strong>'+esc(s.email)+'</strong></span><b>↗</b></a><a class="contact-detail" href="tel:'+esc(s.phone.replace(/\\s+/g,''))+'"><span class="contact-detail-icon">☎</span><span><small>TELEFON</small><strong>'+esc(s.phone)+'</strong></span><b>↗</b></a><a class="contact-detail" href="'+esc(s.web)+'" target="_blank" rel="noopener"><span class="contact-detail-icon">◎</span><span><small>HJEMMESIDE</small><strong>'+esc(s.web)+'</strong></span><b>↗</b></a><p class="settings-status-note">Du kan ændre oplysningerne under Indstillinger → Virksomhedsoplysninger.</p></section><section class="settings-card contact-message"><div class="settings-card-head"><span class="settings-card-icon violet">✉</span><div><h2>Send en besked</h2><p>Åbn en e-mail med din besked klar.</p></div></div><label class="settings-field"><span>Dit navn</span><input id="kn" placeholder="Skriv dit navn"></label><label class="settings-field"><span>Besked</span><textarea id="kb" rows="6" placeholder="Hvad kan vi hjælpe med?"></textarea></label><button class="btn contact-send" data-x="mail">Åbn i din mailapp <span>↗</span></button><p class="settings-status-note">Beskeden sendes først, når du selv trykker Send i din mailapp.</p></section></div></div>'};
document.addEventListener('click',e=>{const b=e.target.closest('[data-x="retry"],[data-x="home"],[data-x="closeerr"],[data-x="mail"]');if(!b)return;const x=b.dataset.x;
  if(x==='closeerr'){const r=document.getElementById('errbar');if(r)r.remove()}
  else if(x==='mail'){const n=($('#kn')||{}).value||'',m=($('#kb')||{}).value||'',a=document.createElement('a');a.href='mailto:'+Settings.get().email+'?subject='+encodeURIComponent('Henvendelse'+(n?' fra '+n:''))+'&body='+encodeURIComponent(m+(n?'\n\nMvh. '+n:''));a.click()}
  else{if(x==='home'){S.view='dash';S.err=''}render()}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&e.target.id==='chatin'){e.preventDefault();send(e.target.value)}});
async function boot(){
  try{const r=await fetch('/api/auth/me',{cache:'no-store'});if(r.ok){S.auth=await r.json();if(S.auth.enabled&&!S.auth.authenticated)return loginScreen()}}catch(e){}
  render()}
function loginScreen(){$('#app').innerHTML=`<main class="main" style="max-width:480px;margin:10vh auto"><div class="card"><h1>PRIME WEBS AI</h1><p class="mu">Kun ejeren har adgang. Log ind med den GitHub-konto, der har den godkendte e-mail.</p>${location.search.includes('login=denied')?'<p class="err">Den GitHub-konto har ikke adgang, eller login blev afbrudt.</p>':''}<a class="btn" href="/api/auth/login">Log ind med GitHub</a></div></main>`}
boot();
