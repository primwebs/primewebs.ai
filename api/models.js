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
 "alloy-wheel":{name:"Alloy Wheel and Tyre",path:"car-parts/alloy-wheel.glb",credit:'"Alloy Wheel" by vinish.dev',creditUrl:CREDIT+"car-parts",license:"CC BY 4.0"},
 "executive-sedan":{name:"Executive Sedan",path:"realistic-cars/executive-sedan.glb",credit:"\"Executive Sedan\" by vinish.dev",creditUrl:CREDIT+"realistic-cars",license:"CC BY 4.0"},
 "luxury-suv":{name:"Luxury SUV",path:"realistic-cars/luxury-suv.glb",credit:"\"Luxury SUV\" by vinish.dev",creditUrl:CREDIT+"realistic-cars",license:"CC BY 4.0"},
 "supercar":{name:"Mid-Engine Supercar",path:"realistic-cars/mid-engine-supercar.glb",credit:"\"Mid-Engine Supercar\" by vinish.dev",creditUrl:CREDIT+"realistic-cars",license:"CC BY 4.0"},
 "inline-four-engine":{name:"Inline-Four Engine",path:"engines-and-motors/inline-four-engine.glb",credit:"\"Inline-Four Engine\" by vinish.dev",creditUrl:CREDIT+"engines-and-motors",license:"CC BY 4.0"},
 "turbo-diesel-engine":{name:"Turbo Diesel Engine",path:"engines-and-motors/turbo-diesel-engine.glb",credit:"\"Turbo Diesel Engine\" by vinish.dev",creditUrl:CREDIT+"engines-and-motors",license:"CC BY 4.0"},
 "cordless-drill":{name:"Cordless Drill",path:"power-tools/cordless-drill.glb",credit:"\"Cordless Drill\" by vinish.dev",creditUrl:CREDIT+"power-tools",license:"CC BY 4.0"},
 "angle-grinder":{name:"Angle Grinder",path:"power-tools/angle-grinder.glb",credit:"\"Angle Grinder\" by vinish.dev",creditUrl:CREDIT+"power-tools",license:"CC BY 4.0"},
 "circular-saw":{name:"Circular Saw",path:"power-tools/circular-saw.glb",credit:"\"Circular Saw\" by vinish.dev",creditUrl:CREDIT+"power-tools",license:"CC BY 4.0"},
 "table-lamp":{name:"Table Lamp",path:"lamps/table-lamp.glb",credit:"\"Table Lamp\" by vinish.dev",creditUrl:CREDIT+"lamps",license:"CC BY 4.0"},
 "spring-arm-desk-lamp":{name:"Spring Arm Desk Lamp",path:"lamps/spring-arm-desk-lamp.glb",credit:"\"Spring Arm Desk Lamp\" by vinish.dev",creditUrl:CREDIT+"lamps",license:"CC BY 4.0"},
 "crystal-chandelier":{name:"Crystal Chandelier",path:"lamps/crystal-chandelier.glb",credit:"\"Crystal Chandelier\" by vinish.dev",creditUrl:CREDIT+"lamps",license:"CC BY 4.0"},
 "street-lamp":{name:"Modern LED Street Light",path:"street-lamps/modern-led-street-light.glb",credit:"\"Modern LED Street Light\" by vinish.dev",creditUrl:CREDIT+"street-lamps",license:"CC BY 4.0"},
 "rose":{name:"Red Rose",path:"flowers/rose.glb",credit:"\"Red Rose\" by vinish.dev",creditUrl:CREDIT+"flowers",license:"CC BY 4.0"},
 "rose-bouquet":{name:"Bouquet of Twelve Roses",path:"flowers/bouquet-of-twelve-roses.glb",credit:"\"Bouquet of Twelve Roses\" by vinish.dev",creditUrl:CREDIT+"flowers",license:"CC BY 4.0"},
 "fiddle-leaf-fig":{name:"Fiddle Leaf Fig",path:"indoor-plants/fiddle-leaf-fig.glb",credit:"\"Fiddle Leaf Fig\" by vinish.dev",creditUrl:CREDIT+"indoor-plants",license:"CC BY 4.0"},
 "excavator":{name:"Tracked Excavator",path:"construction/tracked-excavator.glb",credit:"\"Tracked Excavator\" by vinish.dev",creditUrl:CREDIT+"construction",license:"CC BY 4.0"},
 "bulldozer":{name:"Bulldozer",path:"construction/bulldozer.glb",credit:"\"Bulldozer\" by vinish.dev",creditUrl:CREDIT+"construction",license:"CC BY 4.0"},
 "pizzeria":{name:"Pizzeria",path:"diners-and-restaurants/pizzeria.glb",credit:"\"Pizzeria\" by vinish.dev",creditUrl:CREDIT+"diners-and-restaurants",license:"CC BY 4.0"},
 "mri-scanner":{name:"MRI Scanner",path:"medical-equipment/mri-scanner.glb",credit:"\"MRI Scanner\" by vinish.dev",creditUrl:CREDIT+"medical-equipment",license:"CC BY 4.0"},
 "hammer":{name:"Hammer",path:"hand-tools/hammer.glb",credit:"\"Hammer\" by vinish.dev",creditUrl:CREDIT+"hand-tools",license:"CC BY 4.0"},
 "wrench-set":{name:"Wrench Set",path:"hand-tools/wrench-set.glb",credit:"\"Wrench Set\" by vinish.dev",creditUrl:CREDIT+"hand-tools",license:"CC BY 4.0"},
};
module.exports=async(req,res)=>{
 res.setHeader("Cache-Control","public, max-age=86400, stale-while-revalidate=604800");
 if(req.method!=="POST")return res.status(405).json({error:"Use POST."});
 const item=CATALOG[String(req.body&&req.body.asset||"").toLowerCase()];
 if(!item)return res.status(400).json({error:"Unknown curated model."});
 return res.status(200).json({...item,url:BASE+item.path,format:"glb",provider:"vinish.dev"});
};
