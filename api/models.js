// Resolve vetted CC0 Poly Haven GLTF models for PRIME WEBS AI.
module.exports=async(req,res)=>{
 res.setHeader("Cache-Control","public, max-age=3600, stale-while-revalidate=86400");
 if(req.method!=="POST")return res.status(405).json({error:"Use POST."});
 const asset=String(req.body&&req.body.asset||"");
 const catalog={"BarberShopChair_01":{name:"Barber Shop Chair 01",type:"barber-chair"},"covered_car":{name:"Covered Car",type:"car"},"old_tyre":{name:"Old Tyre",type:"wheel"}};
 if(!catalog[asset])return res.status(400).json({error:"Unknown model asset."});
 try{
  const response=await fetch("https://api.polyhaven.com/files/"+encodeURIComponent(asset),{headers:{"User-Agent":"PRIME-WEBS-AI/1.0 (+https://primewebs.site)","Accept":"application/json"},signal:AbortSignal.timeout(18000)});
  if(!response.ok)throw new Error("Poly Haven returned HTTP "+response.status);
  const tree=await response.json(),candidates=[];
  const walk=(node,path=[])=>{
   if(!node||typeof node!=="object")return;
   if(typeof node.url==="string"&&/^https:\/\//i.test(node.url))candidates.push({url:node.url,path:path.join("/"),size:Number(node.size)||0});
   for(const [key,value] of Object.entries(node))if(key!=="url"&&key!=="md5"&&key!=="size")walk(value,[...path,key]);
  };
  walk(tree);
  const chosen=candidates.filter(x=>/\.(?:gltf|glb)(?:\?|$)/i.test(x.url)).sort((x,y)=>x.size-y.size)[0];
  if(!chosen)throw new Error("No direct GLTF file was listed for this asset.");
  return res.status(200).json({name:catalog[asset].name,url:chosen.url,format:/\.glb(?:\?|$)/i.test(chosen.url)?"glb":"gltf",provider:"Poly Haven",license:"CC0",credit:"Powered by Poly Haven"});
 }catch(error){return res.status(503).json({error:"The 3D model is temporarily unavailable.",detail:String(error.message||"").slice(0,180)});}
};