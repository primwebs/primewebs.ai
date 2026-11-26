// PRIME WEBS AI — open-license image search via Openverse
// Only commercial-use licenses are requested. Attribution metadata is returned
// with every selected asset and rendered alongside it on the generated website.
const cache = new Map();
module.exports = async (req,res) => {
  res.setHeader("Cache-Control","public, max-age=300, stale-while-revalidate=3600");
  if(req.method!=="POST")return res.status(405).json({error:"Use POST."});
  const body=req.body||{};
  const query=String(body.query||"").trim().slice(0,180);
  const limit=Math.max(1,Math.min(8,Number(body.limit)||6));
  if(!query)return res.status(400).json({error:"Image search query is required."});
  const key=query.toLowerCase()+"|"+limit;
  const cached=cache.get(key);
  if(cached&&Date.now()-cached.at<6*60*60*1000)return res.status(200).json(cached.value);
  try{
    const params=new URLSearchParams({q:query,page_size:String(limit),license_type:"commercial",filter_dead:"true",mature:"false",size:"large"});
    const upstream=await fetch("https://api.openverse.org/v1/images/?" + params.toString(),{headers:{"Accept":"application/json"},signal:AbortSignal.timeout(18000)});
    if(!upstream.ok)throw new Error("Openverse image search returned HTTP "+upstream.status);
    const data=await upstream.json();
    const images=(Array.isArray(data.results)?data.results:[]).filter(x=>x&&x.url&&/^https:\/\//i.test(x.url)&&x.license_url&&x.foreign_landing_url).map(x=>({
      url:x.url,
      attribution:String(x.attribution||((x.title||"Image")+" by "+(x.creator||"unknown creator")+" ("+(x.license||"open license")+").")).slice(0,240),
      creditUrl:x.foreign_landing_url,
      license:x.license,
      licenseUrl:x.license_url,
      creator:x.creator||""
    })).slice(0,limit);
    const value={images,source:"Openverse"};
    cache.set(key,{at:Date.now(),value});
    if(cache.size>300)cache.delete(cache.keys().next().value);
    return res.status(200).json(value);
  }catch(error){return res.status(503).json({error:"Image search is temporarily unavailable.",detail:String(error.message||"").slice(0,180),images:[]});}
};