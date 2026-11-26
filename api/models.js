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
 "v8-engine":{name:"V8 Engine",path:"engines-and-motors/v8-engine.glb",credit:'"V8 Engine" by vinish.dev',creditUrl:CREDIT+"engines-and-motors",license:"CC BY 4.0"},
 "alloy-wheel":{name:"Alloy Wheel and Tyre",path:"car-parts/alloy-wheel.glb",credit:'"Alloy Wheel" by vinish.dev',creditUrl:CREDIT+"car-parts",license:"CC BY 4.0"}
};
module.exports=async(req,res)=>{
 res.setHeader("Cache-Control","public, max-age=86400, stale-while-revalidate=604800");
 if(req.method!=="POST")return res.status(405).json({error:"Use POST."});
 const item=CATALOG[String(req.body&&req.body.asset||"").toLowerCase()];
 if(!item)return res.status(400).json({error:"Unknown curated model."});
 return res.status(200).json({...item,url:BASE+item.path,format:"glb",provider:"vinish.dev"});
};
