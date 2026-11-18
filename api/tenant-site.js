// Resolve published websites for requests routed from *.primewebs.site.
module.exports=async function handler(req,res){
 const slug=String(req.query&&req.query.slug||'').toLowerCase();
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return res.status(404).send('Website not found');
 const base=String(process.env.SUPABASE_URL||'').replace(/\/+$/,'');
 const key=String(process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||'');
 if(!base||!key)return res.status(503).send('Website hosting is not configured yet.');
 try{
  const url=base+'/rest/v1/published_sites?'+new URLSearchParams({select:'html',slug:'eq.'+slug,status:'eq.published',limit:'1'}).toString();
  const response=await fetch(url,{headers:{apikey:key,Authorization:'Bearer '+key,Accept:'application/json'}});
  if(!response.ok)return res.status(502).send('Website lookup failed.');
  const rows=await response.json();
  if(!Array.isArray(rows)||!rows[0]||typeof rows[0].html!=='string')return res.status(404).send('Website not found');
  res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=300');
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('X-Content-Type-Options','nosniff');
  return res.status(200).send(rows[0].html);
 }catch(error){return res.status(503).send('Website is temporarily unavailable.');}
};
