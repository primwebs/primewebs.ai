/* PRIME WEBS AI — Supabase Auth + cloud persistence.
   Only the public publishable key is used in the browser. */
(function () {
  const state = { client: null, user: null, profile: null, credits: null, ready: null, busy: false, lastProjects: [], lastCustomers: [], workspaceData: {finance:[],leads:[],images:{}}, settingsData: {}, writeQueue: Promise.resolve() };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return c==='x'?r:(r&3|8); }));
  const isUuid = v => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(String(v||''));
  const local = (key, fallback) => { try { const v=localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (_) { return fallback; } };
  const put = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} };
  const rows = async (table) => {
    const { data, error } = await state.client.from(table).select('*');
    if (error) throw error;
    return data || [];
  };
  const leadKey = x => String(x&&x.name||'').trim().toLocaleLowerCase()+'|'+String(x&&x.phone||'').replace(/[^\\d+]/g,'');
  function mergeRecords(primary, secondary) { const out=Array.isArray(primary)?primary.slice():[],seen=new Set(out.map(x=>String(x&&x.id||'')));for(const item of(Array.isArray(secondary)?secondary:[])){const id=String(item&&item.id||'');if(id&&!seen.has(id)){out.push(item);seen.add(id);}}return out; }
  function mergeLeads(primary, secondary) {
    const out=Array.isArray(primary)?primary.slice():[], seen=new Set(out.map(leadKey));
    for(const item of (Array.isArray(secondary)?secondary:[])){const k=leadKey(item);if(k!=='|'&&!seen.has(k)){out.push(item);seen.add(k);}}
    return out;
  }
  async function saveWorkspaceData() {
    if(!state.client||!state.user||state.profile?.role!=='owner')return;
    const next={...state.settingsData,finance:state.workspaceData.finance,leads:state.workspaceData.leads,images:state.workspaceData.images};
    const {error}=await state.client.from('user_settings').upsert({user_id:state.user.id,settings:next,updated_at:new Date().toISOString()});
    if(error)throw error;
    state.settingsData=next;
  }
  async function loadCloud() {
    const db=state.client, user=state.user;
    if (!user) return;
    const [profiles, projects, customers, settings, credits] = await Promise.all([
      rows('profiles'), rows('projects'), rows('customers'),
      db.from('user_settings').select('*').eq('user_id',user.id).maybeSingle(),
      db.from('credit_accounts').select('*').eq('user_id',user.id).maybeSingle()
    ]);
    if (settings.error) throw settings.error;
    if (credits.error) throw credits.error;
    state.profile = profiles.find(p=>p.id===user.id) || {id:user.id,email:user.email,role:'user'};
    state.credits = credits.data || {user_id:user.id,balance:50,unlimited:false};
    const isOwner = state.profile.role === 'owner';
    const localProjects = local('pw.projects',[]);
    const localCustomers = local('pw.customers',[]);
    if (isOwner && projects.length===0 && localProjects.length) {
      for (const p of localProjects) if (!isUuid(p.id)) p.id=uuid();
      const payload=localProjects.map(p=>({id:p.id,user_id:p._userId||user.id,name:p.name||'Nyt projekt',status:p.status||'draft',domain:p.domain||null,plan:p.plan||null,site:p.site||{},history:p.history||[],future:p.future||[],chat:p.chat||[],updated_at:new Date(p.updatedAt||Date.now()).toISOString()}));
      const {error}=await db.from('projects').upsert(payload); if(error) throw error;
    }
    if (isOwner && customers.length===0 && localCustomers.length) {
      for (const c of localCustomers) if (!isUuid(c.id)) c.id=uuid();
      const payload=localCustomers.map(c=>({id:c.id,user_id:c._userId||user.id,name:c.name||'',email:c.email||null,phone:c.phone||null,notes:c.notes||null,data:{plan:c.plan||'Gratis',credits:c.credits||0,createdAt:c.createdAt||Date.now()}}));
      const {error}=await db.from('customers').upsert(payload); if(error) throw error;
    }
    const freshProjects = await rows('projects');
    const freshCustomers = await rows('customers');
    put('pw.projects', freshProjects.map(p=>({id:p.id,_userId:p.user_id,name:p.name,status:p.status,domain:p.domain,plan:p.plan,site:p.site,history:p.history,future:p.future,chat:p.chat,createdAt:Date.parse(p.created_at)||Date.now(),updatedAt:Date.parse(p.updated_at)||Date.now()})));
    put('pw.customers', freshCustomers.map(c=>Object.assign({id:c.id,_userId:c.user_id,name:c.name,email:c.email||'',phone:c.phone||'',notes:c.notes||'',createdAt:Date.parse(c.created_at)||Date.now()},c.data||{})));
    state.lastProjects=freshProjects.map(p=>p.id);
    state.lastCustomers=freshCustomers.map(c=>c.id);
    if(isOwner){
      const stored=settings.data&&settings.data.settings&&typeof settings.data.settings==='object'?settings.data.settings:{};
      state.settingsData={...stored};
      const cloudFinance=Array.isArray(stored.finance)?stored.finance:[];
      const cloudLeads=Array.isArray(stored.leads)?stored.leads:[];
      const cloudImages=stored.images&&typeof stored.images==='object'?stored.images:{};
      const localFinance=local('pw.finance',[]);
      const localLeads=local('pw.leads',[]);
      const localImages=local('pw.img',{});
      // First-login migration: keep phone-entered Finance records and Ring leads.
      // Merge records left in an older device-local browser with cloud records.
      // This recovers Finance entries created before cross-device sync was enabled.
      state.workspaceData.finance=mergeRecords(cloudFinance,localFinance);
      // Merge browser-only imports into the owner-wide list without duplicates.
      state.workspaceData.leads=mergeLeads(cloudLeads,localLeads);
      state.workspaceData.images={...cloudImages,...localImages};
      put('pw.finance',state.workspaceData.finance);
      put('pw.leads',state.workspaceData.leads);
      put('pw.img',state.workspaceData.images);
      const cleanSettings={...stored};delete cleanSettings.finance;delete cleanSettings.leads;
      put('pw.settings',cleanSettings);
      if(!settings.data||!Array.isArray(stored.finance)||!Array.isArray(stored.leads)||!stored.images||state.workspaceData.leads.length!==cloudLeads.length||state.workspaceData.finance.length!==cloudFinance.length||Object.keys(state.workspaceData.images).length!==Object.keys(cloudImages).length) await saveWorkspaceData();
    } else {
      state.settingsData={};
      put('pw.settings',settings.data&&settings.data.settings||{});
      state.workspaceData={finance:[],leads:[],images:{}};
      put('pw.finance',[]);put('pw.leads',[]);put('pw.img',{});
    }
  }
  const persist = (key, value) => {
    put(key,value);
    if (!state.client || !state.user) return;
    state.writeQueue=state.writeQueue.then(async()=>{
      const db=state.client,user=state.user;
      if(!user)return;
      if (key==='pw.projects' && Array.isArray(value)) {
        const list=value.map(p=>{ if(!isUuid(p.id)) p.id=uuid(); return p; });
        put(key,list);
        const payload=list.map(p=>({id:p.id,user_id:user.id,name:p.name||'Nyt projekt',status:p.status||'draft',domain:p.domain||null,plan:p.plan||null,site:p.site||{},history:p.history||[],future:p.future||[],chat:p.chat||[],updated_at:new Date(p.updatedAt||Date.now()).toISOString()}));
        const currentIds=payload.map(p=>p.id), removed=state.lastProjects.filter(id=>!currentIds.includes(id));
        if(removed.length){const {error}=await db.from('projects').delete().in('id',removed);if(error)throw error;}
        if(payload.length){const {error}=await db.from('projects').upsert(payload);if(error)throw error;}
        state.lastProjects=currentIds;
      } else if (key==='pw.customers' && Array.isArray(value)) {
        const list=value.map(c=>{ if(!isUuid(c.id)) c.id=uuid(); return c; });
        put(key,list);
        const payload=list.map(c=>({id:c.id,user_id:user.id,name:c.name||'',email:c.email||null,phone:c.phone||null,notes:c.notes||null,data:{plan:c.plan||'Gratis',credits:c.credits||0,createdAt:c.createdAt||Date.now()}}));
        const currentIds=payload.map(c=>c.id), removed=state.lastCustomers.filter(id=>!currentIds.includes(id));
        if(removed.length){const {error}=await db.from('customers').delete().in('id',removed);if(error)throw error;}
        if(payload.length){const {error}=await db.from('customers').upsert(payload);if(error)throw error;}
        state.lastCustomers=currentIds;
      } else if(key==='pw.settings') {
        const safe={...value};delete safe.aiCode;delete safe.finance;delete safe.leads;
        state.settingsData={...state.settingsData,...safe};
        await saveWorkspaceData();
      } else if(key==='pw.finance'&&Array.isArray(value)) {
        state.workspaceData.finance=value;
        await saveWorkspaceData();
      } else if(key==='pw.leads'&&Array.isArray(value)) {
        state.workspaceData.leads=value;
        await saveWorkspaceData();
      } else if(key==='pw.img'&&value&&typeof value==='object'&&!Array.isArray(value)) {
        state.workspaceData.images=value;
        await saveWorkspaceData();
      }
    }).catch(e=>{console.error('Supabase sync error:',e);window.__pwCloudError=e.message||'Cloud sync failed';if(window.render)window.render();});
    return state.writeQueue;
  };
  state.ready = (async()=>{
    const cfgRes=await fetch('/api/supabase-config',{cache:'no-store'});
    if(!cfgRes.ok) throw new Error('Supabase-konfigurationen kunne ikke hentes.');
    const cfg=await cfgRes.json();
    if(!cfg.configured) throw new Error('Supabase mangler SUPABASE_URL eller SUPABASE_PUBLISHABLE_KEY i Vercel.');
    if(!window.supabase || !window.supabase.createClient) throw new Error('Supabase-klienten kunne ikke indlæses.');
    state.client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data,error}=await state.client.auth.getSession();
    if(error) throw error;
    state.user=data.session&&data.session.user||null;
    if(state.user) await loadCloud();
    state.client.auth.onAuthStateChange((event,session)=>{
      state.user=session&&session.user||null;
      if(event==='SIGNED_IN' && state.user) loadCloud().then(()=>{ if(window.render) window.render(); }).catch(e=>{window.__pwCloudError=e.message; if(window.render)window.render();});
      if(event==='SIGNED_OUT'){state.profile=null;state.credits=null;/* Keep cached workspace data safe; a transient auth refresh must never erase projects. */ if(window.loginScreen)window.loginScreen();}
    });
    return state;
  })();
  window.PWDB={
    get client(){return state.client;}, get user(){return state.user;}, get profile(){return state.profile;},
    get credits(){return state.credits;}, get ready(){return state.ready;},
    async adminCodeLogin(code){
      const response=await fetch('/api/auth/admin-code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:String(code||'')})});
      const data=await response.json().catch(()=>({error:'Serveren returnerede et ugyldigt svar.'}));
      if(!response.ok)throw new Error(data.error||'Admin-login kunne ikke gennemføres.');
      const {data:sessionData,error}=await state.client.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token});
      if(error)throw error;
      state.user=sessionData.user||sessionData.session&&sessionData.session.user||null;
      await loadCloud();
      return sessionData;
    },
    async sendEmailOtp(email){const clean=String(email||'').trim().toLowerCase();if(!clean)throw new Error('Skriv din e-mailadresse.');const {error}=await state.client.auth.signInWithOtp({email:clean,options:{shouldCreateUser:false}});if(error)throw error;},
    async verifyEmailOtp(email,token){const clean=String(email||'').trim().toLowerCase();const code=String(token||'').replace(/\s+/g,'');if(!/^\d{6}$/.test(code))throw new Error('Indtast den 6-cifrede kode fra e-mailen.');const {data,error}=await state.client.auth.verifyOtp({email:clean,token:code,type:'email'});if(error)throw error;if(data&&data.user)state.user=data.user;return data;},
    async signInPassword(email,password){const clean=String(email||'').trim().toLowerCase();const {data,error}=await state.client.auth.signInWithPassword({email:clean,password:String(password||'')});if(error)throw error;if(data&&data.user)state.user=data.user;return data;},
    async resetPassword(email){const clean=String(email||'').trim().toLowerCase();const {error}=await state.client.auth.resetPasswordForEmail(clean,{redirectTo:window.location.origin+'/?pw-reset=1'});if(error)throw error;},
    async updatePassword(password){const {data,error}=await state.client.auth.updateUser({password:String(password||'')});if(error)throw error;if(data&&data.user)state.user=data.user;return data;},
    async refresh(){await loadCloud();},
    async listBookings(){if(!state.client||!state.user)return [];const {data,error}=await state.client.from('booking_requests').select('*, projects(name)').order('created_at',{ascending:false}).limit(200);if(error)throw error;return data||[];},
    async updateBookingStatus(id,status){if(!state.client||!state.user)throw new Error('Log ind igen.');if(!['pending','accepted','declined','cancelled'].includes(status))throw new Error('Ugyldig bookingstatus.');const {error}=await state.client.from('booking_requests').update({status,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;return true;},
    async signUp(email,password){const clean=String(email||'').trim().toLowerCase();const {data,error}=await state.client.auth.signUp({email:clean,password:String(password||''),options:{emailRedirectTo:window.location.origin}});if(error)throw error;if(data&&data.session)state.user=data.user||data.session.user;return data;},
    async signInGoogle(){const {error}=await state.client.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}});if(error)throw error;},
    async signOut(){const {error}=await state.client.auth.signOut();if(error)throw error;},
    persistKey(key,value){persist(key,value);},
    async spendCredits(amount,kind,description){if(!state.client||!state.user)return false;const {data,error}=await state.client.rpc('spend_credits',{p_amount:amount,p_kind:kind||'usage',p_description:description||''});if(error)throw error;state.credits={...state.credits,balance:data.balance,unlimited:data.unlimited};return !!data.success;}
  };
})();