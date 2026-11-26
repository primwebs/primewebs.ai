// PRIME WEBS AI — curated, directly hosted real-time GLB models.
// Models by vinish.dev, CC BY 4.0. Attribution must remain visible in the site.
const CATALOG={
 "barber-chair":{name:"Barber Chair",url:"https://models.vinish.dev/barber-and-beauty-salon/barber-chair.glb",credit:'"Barber Chair" by vinish.dev',creditUrl:"https://vinish.dev/free-3d-models/barber-and-beauty-salon",license:"CC BY 4.0"},
 "barber-pole":{name:"Barber Pole",url:"https://models.vinish.dev/barber-and-beauty-salon/barber-pole.glb",credit:'"Barber Pole" by vinish.dev',creditUrl:"https://vinish.dev/free-3d-models/barber-and-beauty-salon",license:"CC BY 4.0"},
 "car":{name:"Sport Sedan (grey)",url:"https://models.vinish.dev/realistic-cars/sport-sedan.glb",credit:'"Sport Sedan" by vinish.dev',creditUrl:"https://vinish.dev/free-3d-models/realistic-cars",license:"CC BY 4.0"},
 "engine":{name:"V8 Engine",url:"https://models.vinish.dev/engines-and-motors/v8-engine.glb",credit:'"V8 Engine" by vinish.dev',creditUrl:"https://vinish.dev/free-3d-models/engines-and-motors",license:"CC BY 4.0"}
};
module.exports=async(req,res)=>{
 res.setHeader("Cache-Control","public, max-age=86400, stale-while-revalidate=604800");
 if(req.method!=="POST")return res.status(405).json({error:"Use POST."});
 const item=CATALOG[String(req.body&&req.body.asset||"").toLowerCase()];
 if(!item)return res.status(400).json({error:"Unknown curated model."});
 return res.status(200).json({...item,format:"glb",provider:"vinish.dev"});
};
