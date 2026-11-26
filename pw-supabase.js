/* PRIME WEBS AI — Supabase Auth + cloud persistence.
   Only the public publishable key is used in the browser. */
(function () {
  const state = { client: null, user: null, profile: null, credits: null, ready: null, busy: false, loadPromise: null, lastProjects: [], lastCustomers: [], workspaceData: {finance:[],leads:[],images:{},invoices:[],invoiceDraft:{},invoiceDraftLines:[],financeProfile:{},creditBilling:'monthly',workMode:'clients'}, settingsData: {}, writeQueue: Promise.resolve(), writeError:null };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return c==='x'?r:(r&3|8); }));
  const isUuid = v => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));
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
    const next={...state.settingsData,finance:state.workspaceData.finance,leads:state.workspaceData.leads,images:state.workspaceData.images,invoices:state.workspaceData.invoices,invoiceDraft:state.workspaceData.invoiceDraft,invoiceDraftLines:state.workspaceData.invoiceDraftLines,invoiceDraftLinesUpdatedAt:state.workspaceData.invoiceDraftLinesUpdatedAt||0,financeProfile:state.workspaceData.financeProfile,financeProfileUpdatedAt:state.workspaceData.financeProfileUpdatedAt||0,creditBilling:state.workspaceData.creditBilling,workMode:state.workspaceData.workMode};
    const {error}=await state.client.from('user_settings').upsert({user_id:state.user.id,settings:next,updated_at:new Date().toISOString()});
    if(error)throw error;
    state.settingsData=next;
  }
  async function loadCloud() {
    // Serialize cloud loads: concurrent auth callbacks must never migrate the same
    // browser-local projects with newly generated IDs into duplicate database rows.
    if(state.loadPromise) return state.loadPromise;
    state.loadPromise=(async()=>{
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
    // Reconcile this browser's cache with Supabase on every login.
    // The old import ran only when the cloud table was empty, so local-only
    // projects could disappear as soon as one cloud project already existed.
    const cloudProjectsById=new Map(projects.map(p=>[String(p.id),p]));
    const projectPayload=[];
    for(const p of localProjects){
      if(!p||typeof p!=='object')continue;
      const localOwner=String(p._userId||p.ownerId||'');
      if(localOwner&&localOwner!==user.id)continue;
      if(!localOwner&&!isOwner)continue;
      if(!isUuid(p.id))p.id=uuid();
      const cloud=cloudProjectsById.get(String(p.id));
      const localUpdated=Number(p.updatedAt)||Date.parse(p.updatedAt)||0;
      const cloudUpdated=cloud?Date.parse(cloud.updated_at)||0:0;
      if(!cloud||localUpdated>cloudUpdated+1000){
        projectPayload.push({id:p.id,user_id:cloud?cloud.user_id:(localOwner||user.id),name:p.name||'Nyt projekt',status:p.status||'draft',domain:p.domain||null,plan:p.plan||null,site:p.site||{},history:p.history||[],future:p.future||[],chat:p.chat||[],updated_at:new Date(localUpdated||Date.now()).toISOString()});
      }
    }
    if(projectPayload.length){const {error}=await db.from('projects').upsert(projectPayload);if(error)throw error;}
    // Merge owner-managed customers without deleting cloud records.
    if(isOwner&&localCustomers.length){
      const cloudCustomersById=new Map(customers.map(c=>[String(c.id),c]));
      const customerPayload=[];
      for(const c of localCustomers){
        if(!c||typeof c!=='object'||(c._userId&&c._userId!==user.id))continue;
        if(!isUuid(c.id))c.id=uuid();
        const cloud=cloudCustomersById.get(String(c.id));
        const localUpdated=Number(c.updatedAt)||Date.parse(c.updatedAt)||0;
        const cloudUpdated=cloud?Date.parse(cloud.updated_at)||0:0;
        if(!cloud||localUpdated>cloudUpdated+1000){
          customerPayload.push({id:c.id,user_id:cloud?cloud.user_id:(c._userId||user.id),name:c.name||'',email:c.email||null,phone:c.phone||null,notes:c.notes||null,data:{plan:c.plan||'Gratis',credits:c.credits||0,createdAt:c.createdAt||Date.now()}});
        }
      }
      if(customerPayload.length){const {error}=await db.from('customers').upsert(customerPayload);if(error)throw error;}
    }
    const freshProjects = await rows('projects');
    const freshCustomers = await rows('customers');
    put('pw.projects', freshProjects.map(p=>({id:p.id,_userId:p.user_id,ownerId:p.user_id,name:p.name,status:p.status,domain:p.domain,plan:p.plan,site:p.site,history:p.history,future:p.future,chat:p.chat,createdAt:Date.parse(p.created_at)||Date.now(),updatedAt:Date.parse(p.updated_at)||Date.now()})));
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
      const cloudInvoices=Array.isArray(stored.invoices)?stored.invoices:[];
      const localInvoices=local('pw.invoices',[]);
      const cloudDraft=stored.invoiceDraft&&typeof stored.invoiceDraft==='object'?stored.invoiceDraft:{};
      const localDraft=local('pw.invoiceDraft',{});
      const cloudLines=Array.isArray(stored.invoiceDraftLines)?stored.invoiceDraftLines:[];
      const localLines=local('pw.invoiceDraftLines',[]);
      const cloudDraftUpdated=Number(cloudDraft.updatedAt)||0,localDraftUpdated=Number(localDraft.updatedAt)||0;
      const cloudLinesUpdated=Number(stored.invoiceDraftLinesUpdatedAt)||0,localLinesUpdated=Number(local('pw.invoiceDraftLinesUpdatedAt',0))||0;
      const cloudProfile=stored.financeProfile&&typeof stored.financeProfile==='object'?stored.financeProfile:{};
      const localProfile=local('pw.financeProfile',{});
      const cloudProfileUpdated=Number(stored.financeProfileUpdatedAt)||0,localProfileUpdated=Number(local('pw.financeProfileUpdatedAt',0))||0;
      // First-login migration: keep phone-entered Finance records and Ring leads.
      // Merge records left in an older device-local browser with cloud records.
      // This recovers Finance entries created before cross-device sync was enabled.
      state.workspaceData.finance=mergeRecords(cloudFinance,localFinance);
      // Merge browser-only imports into the owner-wide list without duplicates.
      state.workspaceData.leads=mergeLeads(cloudLeads,localLeads);
      state.workspaceData.images={...cloudImages,...localImages};
      const invoiceMap=new Map(cloudInvoices.filter(x=>x&&x.id).map(x=>[String(x.id),x]));
      localInvoices.filter(x=>x&&x.id).forEach(x=>{const old=invoiceMap.get(String(x.id));if(!old||(Number(x.updatedAt)||0)>(Number(old.updatedAt)||0))invoiceMap.set(String(x.id),x)});
      state.workspaceData.invoices=Array.from(invoiceMap.values());
      state.workspaceData.invoiceDraft=localDraftUpdated>cloudDraftUpdated?localDraft:(Object.keys(cloudDraft).length?cloudDraft:localDraft);
      state.workspaceData.invoiceDraftLines=localLinesUpdated>cloudLinesUpdated?localLines:(cloudLines.length?cloudLines:localLines);
      state.workspaceData.invoiceDraftLinesUpdatedAt=Math.max(cloudLinesUpdated,localLinesUpdated);
      state.workspaceData.financeProfile=localProfileUpdated>cloudProfileUpdated?localProfile:(Object.keys(cloudProfile).length?cloudProfile:localProfile);
      state.workspaceData.financeProfileUpdatedAt=Math.max(cloudProfileUpdated,localProfileUpdated);
      state.workspaceData.creditBilling=stored.creditBilling||local('pw.creditBilling','monthly');
      state.workspaceData.workMode=stored.workMode||local('pw.workMode','clients');
      put('pw.finance',state.workspaceData.finance);
      put('pw.leads',state.workspaceData.leads);
      put('pw.img',state.workspaceData.images);
      put('pw.invoices',state.workspaceData.invoices);
      put('pw.invoiceDraft',state.workspaceData.invoiceDraft);
      put('pw.invoiceDraftLines',state.workspaceData.invoiceDraftLines);
      put('pw.invoiceDraftLinesUpdatedAt',state.workspaceData.invoiceDraftLinesUpdatedAt);
      put('pw.financeProfile',state.workspaceData.financeProfile);
      put('pw.financeProfileUpdatedAt',state.workspaceData.financeProfileUpdatedAt);
      put('pw.creditBilling',state.workspaceData.creditBilling);
      put('pw.workMode',state.workspaceData.workMode);
      const cleanSettings={...stored};['finance','leads','images','invoices','invoiceDraft','invoiceDraftLines','invoiceDraftLinesUpdatedAt','financeProfile','financeProfileUpdatedAt','creditBilling','workMode'].forEach(k=>delete cleanSettings[k]);
      put('pw.settings',cleanSettings);
      if(!settings.data||!Array.isArray(stored.finance)||!Array.isArray(stored.leads)||!stored.images||state.workspaceData.leads.length!==cloudLeads.length||state.workspaceData.finance.length!==cloudFinance.length||Object.keys(state.workspaceData.images).length!==Object.keys(cloudImages).length||JSON.stringify(state.workspaceData.invoices)!==JSON.stringify(cloudInvoices)||JSON.stringify(state.workspaceData.invoiceDraft)!==JSON.stringify(cloudDraft)||JSON.stringify(state.workspaceData.invoiceDraftLines)!==JSON.stringify(cloudLines)||JSON.stringify(state.workspaceData.financeProfile)!==JSON.stringify(cloudProfile)||state.workspaceData.creditBilling!==(stored.creditBilling||'monthly')||state.workspaceData.workMode!==(stored.workMode||'clients')) await saveWorkspaceData();
    } else {
      state.settingsData={};
      put('pw.settings',settings.data&&settings.data.settings||{});
      state.workspaceData={finance:[],leads:[],images:{},invoices:[],invoiceDraft:{},invoiceDraftLines:[],financeProfile:{},creditBilling:'monthly',workMode:'clients'};
      put('pw.finance',[]);put('pw.leads',[]);put('pw.img',{});put('pw.invoices',[]);put('pw.invoiceDraft',{});put('pw.invoiceDraftLines',[]);put('pw.financeProfile',{});put('pw.creditBilling','monthly');put('pw.workMode','clients');put('pw.invoiceDraftLinesUpdatedAt',0);put('pw.financeProfileUpdatedAt',0);
    }
    })();
    try { return await state.loadPromise; }
    finally { state.loadPromise=null; }
  }
  const persist = (key, value) => {
    put(key,value);
    if (!state.client || !state.user) return;
    state.writeQueue=state.writeQueue.then(async()=>{
      const db=state.client,user=state.user;
      if(!user)return;
      state.writeError=null;window.__pwCloudError=null;
      if (key==='pw.projects' && Array.isArray(value)) {
        const list=value.map(p=>{ if(!isUuid(p.id)) p.id=uuid(); return p; });
        put(key,list);
        const payload=list.filter(p=>{const owner=String(p._userId||p.ownerId||user.id);return state.profile?.role==='owner'||owner===user.id;}).map(p=>({id:p.id,user_id:p._userId||p.ownerId||user.id,name:p.name||'Nyt projekt',status:p.status||'draft',domain:p.domain||null,plan:p.plan||null,site:p.site||{},history:p.history||[],future:p.future||[],chat:p.chat||[],updated_at:new Date(p.updatedAt||Date.now()).toISOString()}));
        if(payload.length){const {error}=await db.from('projects').upsert(payload);if(error)throw error;}
        state.lastProjects=payload.map(p=>p.id);
      } else if (key==='pw.customers' && Array.isArray(value)) {
        const list=value.map(c=>{ if(!isUuid(c.id)) c.id=uuid(); return c; });
        put(key,list);
        const payload=list.map(c=>({id:c.id,user_id:user.id,name:c.name||'',email:c.email||null,phone:c.phone||null,notes:c.notes||null,data:{plan:c.plan||'Gratis',credits:c.credits||0,createdAt:c.createdAt||Date.now()}}));
        if(payload.length){const {error}=await db.from('customers').upsert(payload);if(error)throw error;}
        state.lastCustomers=payload.map(c=>c.id);
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
      } else if(key==='pw.invoices'&&Array.isArray(value)) {
        const now=Date.now();state.workspaceData.invoices=value.map(x=>({...x,updatedAt:Number(x.updatedAt)||now}));put(key,state.workspaceData.invoices);await saveWorkspaceData();
      } else if(key==='pw.invoiceDraft'&&value&&typeof value==='object'&&!Array.isArray(value)) {
        state.workspaceData.invoiceDraft={...value,updatedAt:Date.now()};put(key,state.workspaceData.invoiceDraft);await saveWorkspaceData();
      } else if(key==='pw.invoiceDraftLines'&&Array.isArray(value)) {
        state.workspaceData.invoiceDraftLines=value;state.workspaceData.invoiceDraftLinesUpdatedAt=Date.now();put('pw.invoiceDraftLinesUpdatedAt',state.workspaceData.invoiceDraftLinesUpdatedAt);await saveWorkspaceData();
      } else if(key==='pw.financeProfile'&&value&&typeof value==='object'&&!Array.isArray(value)) {
        state.workspaceData.financeProfile=value;state.workspaceData.financeProfileUpdatedAt=Date.now();put('pw.financeProfileUpdatedAt',state.workspaceData.financeProfileUpdatedAt);await saveWorkspaceData();
      } else if(key==='pw.creditBilling') {
        state.workspaceData.creditBilling=value==='annual'?'annual':value==='six'?'six':'monthly';await saveWorkspaceData();
      } else if(key==='pw.workMode') {
        state.workspaceData.workMode=value==='own'?'own':'clients';await saveWorkspaceData();
      }
    }).catch(e=>{state.writeError=e;console.error('Supabase sync error:',e);window.__pwCloudError=e.message||'Cloud sync failed';if(window.render)window.render();});
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
    persistKey(key,value){return persist(key,value);},
    async flush(){await state.writeQueue;if(state.writeError)throw new Error(state.writeError.message||'Cloud sync failed');return true;},
    async deleteProject(id){if(!state.client||!state.user)throw new Error('Log ind igen.');const task=state.writeQueue.then(async()=>{const {error}=await state.client.from('projects').delete().eq('id',String(id));if(error)throw error;state.lastProjects=state.lastProjects.filter(x=>String(x)!==String(id));});state.writeQueue=task.catch(e=>{state.writeError=e;window.__pwCloudError=e.message||'Project delete failed';if(window.render)window.render();});await state.writeQueue;if(state.writeError)throw new Error(state.writeError.message||'Project delete failed');return true;},
    async deleteCustomer(id){if(!state.client||!state.user)throw new Error('Log ind igen.');const task=state.writeQueue.then(async()=>{const {error}=await state.client.from('customers').delete().eq('id',String(id));if(error)throw error;state.lastCustomers=state.lastCustomers.filter(x=>String(x)!==String(id));});state.writeQueue=task.catch(e=>{state.writeError=e;window.__pwCloudError=e.message||'Customer delete failed';if(window.render)window.render();});await state.writeQueue;if(state.writeError)throw new Error(state.writeError.message||'Customer delete failed');return true;},
    async spendCredits(amount,kind,description){if(!state.client||!state.user)return false;const {data,error}=await state.client.rpc('spend_credits',{p_amount:amount,p_kind:kind||'usage',p_description:description||''});if(error)throw error;state.credits={...state.credits,balance:data.balance,unlimited:data.unlimited};return !!data.success;}
  };
})();