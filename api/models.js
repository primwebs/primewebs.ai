// PRIME WEBS AI — curated realistic, rotatable GLB models.
// Models by vinish.dev are CC BY 4.0: retain visible attribution in generated sites.
const BASE="https://models.vinish.dev/";
const CREDIT="https://vinish.dev/free-3d-models/";
const CATALOG={
 "barber-chair":{name:"Barber Chair",path:"barber-and-beauty-salon/barber-chair.glb",credit:'"Barber Chair" by vinish.dev',creditUrl:CREDIT+"barber-and-beauty-salon",license:"CC BY 4.0"},
 "barber-pole":{name:"Barber Pole",path:"barber-and-beauty-salon/barber-pole.glb",credit:'"Barber Pole" by vinish.dev',creditUrl:CREDIT+"barber-and-beauty-salon",license:"CC BY 4.0"},
 "salon-styling-chair":{name:"Salon Styling Chair",path:"barber-and-beauty-salon/salon-styling-chair.glb",credit:'"Salon Styling Chair" by vinish.dev',creditUrl:CREDIT+"barber-and-beauty-salon",license:"CC BY 4.0"},
 "shampoo-backwash-unit":{name:"Shampoo Backwash Unit",path:"barber-and-beauty-salon/shampoo-backwash-unit.glb",credit:'"Shampoo Backwash Unit" by vinish.dev',creditUrl:CREDIT+"barber-and-beauty-salon",license:"CC BY 4.0"},
 "car":{name:"Sport Sedan (grey)",path:"realistic-cars/sport-sedan.glb",credit:'"Sport Sedan" by vinish.dev',creditUrl:CREDIT+"realistic-cars",license:"CC BY 4.0"},
 "muscle-coupe":{name:"Shaker Hood Coupe",path:"muscle-cars/shaker-hood-coupe.glb",credit:'"Shaker Hood Coupe" by vinish.dev',creditUrl:CREDIT+"muscle-cars",license:"CC BY 4.0"},
 "car-lift":{name:"Two Post Car Lift",path:"garage-and-workshop/two-post-car-lift.glb",credit:'"Two Post Car Lift" by vinish.dev',creditUrl:CREDIT+"garage-and-workshop",license:"CC BY 4.0"},
 "tire-changer":{name:"Tire Changer",path:"garage-and-workshop/tire-changer.glb",credit:'"Tire Changer" by vinish.dev',creditUrl:CREDIT+"garage-and-workshop",license:"CC BY 4.0"},
 "v8-engine":{name:"V8 Engine",path:"engines-and-motors/v8-engine.glb",credit:'"V8 Engine" by vinish.dev',creditUrl:CREDIT+"engines-and-motors",license:"CC BY 4.0"},
 "alloy-wheel":{name:"Alloy Wheel and Tyre",path:"car-parts/alloy-wheel.glb",credit:'"Alloy Wheel" by vinish.dev',creditUrl:CREDIT+"car-parts",license:"CC BY 4.0"}
};
module.exports=async(req,res)=>{
 res.setHeader("Cache-Control","public, max-age=86400, stale-while-revalidate=604800");
 const asset=String((req.query&&req.query.asset)||(req.body&&req.body.asset)||"").toLowerCase();
 const item=CATALOG[asset];
 if(!item)return res.status(400).json({error:"Unknown curated model."});
 // Lightweight source check used during model-catalog validation.
 if(req.method==="GET"&&String(req.query&&req.query.check||"")==="1"){
  try{
   const upstream=await fetch(BASE+item.path,{method:"HEAD",signal:AbortSignal.timeout(12000)});
   return res.status(200).json({asset,name:item.name,ok:upstream.ok,status:upstream.status,contentType:upstream.headers.get("content-type"),contentLength:upstream.headers.get("content-length"),credit:item.credit,license:item.license});
  }catch(error){return res.status(502).json({asset,name:item.name,ok:false,error:String(error.message||"").slice(0,160)})}
 }
 // Stream the GLB through PrimeWebs. The upstream host only allows its own
 // origin via CORS, so browsers cannot load its model URLs directly.
 if(req.method==="GET"&&String(req.query&&req.query.download||"")==="1"){
  try{
   const upstream=await fetch(BASE+item.path,{signal:AbortSignal.timeout(25000)});
   if(!upstream.ok)return res.status(502).json({error:"3D model source returned HTTP "+upstream.status});
   const bytes=Buffer.from(await upstream.arrayBuffer());
   res.setHeader("Content-Type","model/gltf-binary");
   res.setHeader("Content-Length",String(bytes.length));
   res.setHeader("X-Content-Type-Options","nosniff");
   return res.status(200).send(bytes);
  }catch(error){return res.status(502).json({error:"Could not retrieve 3D model.",detail:String(error.message||"").slice(0,160)})}
 }
 if(req.method!=="POST")return res.status(405).json({error:"Use POST for model metadata or GET with download=1."});
 return res.status(200).json({...item,url:"https://primewebs.site/api/models?asset="+encodeURIComponent(asset)+"&download=1",format:"glb",provider:"vinish.dev"});
};
