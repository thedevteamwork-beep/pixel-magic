import type { LandingModel, TemplateItem, MediaId, TemplateFilters } from "@/types/landing";

/** Landing-page examples only; generation belongs to the separate product. */
export const templateModels: readonly LandingModel[] = [
  { name: "Kling", category: "video", symbol: "◉", description: "Motion and camera stories" },
  { name: "Veo", category: "video", symbol: "▱", description: "Scenes with a cinematic eye" },
  { name: "Seedance 2.5", category: "video", symbol: "✳", description: "Fresh perspectives in motion" },
  { name: "Wan", category: "video", symbol: "≈", description: "Playful moving worlds" },
  { name: "FLUX", category: "image", symbol: "ƒ", description: "A different way to picture it" },
  { name: "GPT Image 2", category: "image", symbol: "✺", description: "Everyday ideas, reimagined" },
  { name: "Seedance 2.0", category: "video", symbol: "✳", description: "A starting point for motion" },
  { name: "Kling 4.0", category: "video", symbol: "◉", description: "A new cinematic direction" },
];

export const discoveryTemplates: readonly TemplateItem[] = [
  {
    id: "firefly-promise",
    title: "Firefly promise",
    asset: "fairyWorldFilm",
    referenceAssets: ["fairyWorldReference"],
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["video", "portraits"],
    description: "A quiet twilight moment with a fairy and her fox companion.",
    tag: "Fantasy film",
    prompt: `A breathtaking magical animated film scene in an enchanted forest at blue-golden twilight. A little blonde fairy-like girl in a blue dress sits on a flower-covered mossy cliff ledge high above a glowing hidden forest, with the small fox resting close beside her. Beneath them, tiny warm-lit windows glow from miniature hidden homes in the rocks, while flowers, vines, and soft ferns frame the ledge. The girl gently moves her feet over the edge, breathing softly, her hair and dress touched by a light breeze. The fox lies beside her, blinking slowly, then gradually leans closer and gently places its head near her shoulder and arm in a tender, trusting way.

As the magical moment deepens, more and more golden fireflies gather and begin swirling in soft spirals around the girl and the fox. The deep blue-green light in the forest below pulses gently, as if the whole forest is breathing with living magic. Tiny glowing particles rise from the hidden forest depths, and a few luminous petals drift slowly through the foreground, passing close in front of the camera lens. The girl slowly closes her eyes for a moment and smiles softly, as if she can truly feel the magic surrounding her. Flowers sway, vines move gently, hidden windows flicker warmly, and the whole world becomes dreamier, brighter, and more alive without ever feeling chaotic.

Camera movement:
Begin with a wide cinematic reveal from slightly below the cliff, showing the full ledge, glowing hidden windows, and vast magical forest beyond. Then slowly rise and float closer in a soft elegant arc. Continue with a gentle romantic orbit around the girl and fox while the spiraling fireflies gather around them. Let glowing petals drift across the foreground for depth. Push in slowly toward a tender medium shot as the fox rests its head near her and she closes her eyes and smiles. End with a delicate drifting pullback that reveals the cliff again, now surrounded by swirling fireflies and softly pulsing forest light.

Motion style:
High-quality animated fantasy film, romantic flowing camera, no static pose, soft natural breathing, gentle leg movement, subtle emotional acting, fox leaning closer naturally, soft ear and tail motion, fireflies spiraling in motion, glowing petals drifting across the lens, flowers and vines swaying, dreamy magical atmosphere, emotional cinematic storytelling.`,
  },
  {
    id: "juliette-yoyo-freestyle",
    title: "Crimson freestyle",
    asset: "julietteYoYoFilm",
    referenceAssets: ["julietteCharacterReference", "julietteKeyframes"],
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["video", "portraits"],
    description: "A high-speed yo-yo performance lights up an abandoned hall.",
    tag: "Anime action",
    prompt: `Use @image2 as the exact sequential cinematic keyframe reference. Treat every panel as an independent animated shot with continuous motion flow between scenes. Use @image1 as character reference for Juliette, yo-yo freestyler in chaotic modern streetwear: deep crimson red oversized hoodie, cropped black bomber jacket with red accents and "JULIETTE" lettering on back, loose black cargo pants with chains and belt accents, chunky black-and-red sneakers, chains, layered choker and necklaces, finger tape, rings and bracelets, wild voluminous dark burgundy-red curly hair cascading down with explosive motion, hazel-green eyes with a smirking menacing expression. Height 149cm — tiny frame, overwhelming energy. No text, no label, no watermark, no logo.

15s hyper-dynamic yo-yo freestyle performance inside a giant abandoned industrial hall with graffiti, crimson and red neon lights, hanging cables, broken concrete, dust, and underground street atmosphere. Tiny playful girl with overwhelming energy performing impossibly stylish high-speed yo-yo tricks perfectly synced to aggressive electronic music. The yo-yo stays visible in every shot, creating glowing deep red string trails, orbital spirals, looping circles, finger binds, horizontal whips, neck tricks, off-axis tricks, sleeper tricks, and chaotic around-the-world combos. Continuous flawless combo flow, exaggerated anime physics, impossible airtime, hyper-fast footwork, and god-tier precision. Use aggressive shonen sakuga cinematography: whip pans, fisheye distortion, orbit camera movement, dutch angles, extreme low-angle hero shots, top-down rhythm shots, foreground yo-yo occlusion, rapid push-ins, and dramatic perspective exaggeration. Add speed lines, motion smears, crimson ink splash impacts, debris bursts, shockwaves, floor cracks, flying dust, and rhythmic motion blur. Build intensity toward a final slow-motion climax where Juliette launches the yo-yo into a massive spinning crimson orbital vortex before violently snapping it back into her hand, causing explosive environmental destruction and shockwaves. Style: modern painterly anime illustration, raw sakuga storyboard energy, stylized realism, visible rough brush strokes, semi-realistic anatomy, clean cinematic lighting, messy aggressive manga linework, monochrome sketch rendering with deep red and crimson accents.`,
  },
  {
    id: "forest-guardian",
    title: "Forest guardian",
    asset: "forestRescueFilm",
    referenceAssets: ["forestRescueReference"],
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["video"],
    description: "A quick-thinking monkey guides a curious baby to safety.",
    tag: "Adventure film",
    prompt: `A sequence of ultra-fast cinematic shots set in a lush tropical forest, captured on a 35mm lens, using tight close-ups to medium-close framing only, no wide shots, aggressive handheld motion, whip pans, snap zooms, immersive proximity, physically accurate motion and grounded interaction, rendered in high-end 3D cinematic style, natural skin tones, soft warm lighting balanced with green jungle tones (not overly yellow), subtle film grain, soft highlight bloom, volumetric light rays passing through dense foliage, emotional visual storytelling, no dialogue.

--- EVENT 1: FALL / SLIP (HIGH HOOK) ---
(1) Extreme close-up of a baby girl's small bare foot pressing into soft damp soil. Dirt slightly collapses and shifts near the edge of a small forest drop; particles fall downward as the camera shakes subtly.
(2) Tight handheld whip pan revealing the baby girl crawling curiously toward the unstable edge, hands pressing into loose soil and roots, with shallow depth of field isolating her movement.
(3) Extreme close-up of her hand losing grip as the soil breaks apart. Dirt and pebbles fall into the drop, with brief micro slow motion emphasizing the danger.
(4) Snap zoom to her face: eyes widening, lips parting, confusion turning into fear as soft filtered light hits her cheeks.
(5) Aggressive whip pan upward as a small monkey suddenly drops into frame from above, fast motion blur, branches shaking.
(6) Extreme close-up as the monkey firmly grabs the baby's clothing; fabric stretches under tension and dirt particles float mid-air.
(7) Macro detail of the monkey pulling with effort as the baby slides slightly backward, friction with the soil visible and leaves sticking to her skin.
(8) Tight handheld tracking as the baby is pulled safely back onto stable ground; movement steadies slightly as tension releases.

--- EVENT 2: SNAKE THREAT (TENSION ESCALATION) ---
(9) Whip pan to a close-up of a small snake slithering slowly through leaves toward the baby's hand, subtle hissing implied, shallow depth of field.
(10) Close-up of the baby reaching curiously toward the snake, fingers extended and unaware of danger.
(11) Sudden fast motion as the monkey jumps into frame from the side, with aggressive movement and a camera that struggles to follow.
(12) Extreme close-up as the monkey slaps the ground and pushes the snake away with a quick, sharp motion. Leaves scatter and the snake recoils rapidly.
(13) Tight shot of the startled baby pulling her hand back slightly, blinking and breathing unevenly.

--- EVENT 3: WATER / SLIP (FLOW + FINAL SAVE) ---
(14) Whip pan to ground level: the baby crawls near a small flowing stream, water shimmering with soft reflections over wet, slippery rocks.
(15) Extreme close-up of the baby's hand slipping on a wet stone, water splashing slightly as she begins to lose balance.
(16) Medium-tight handheld tracking as the baby slides toward the edge of the shallow stream, body tilting forward.
(17) Fast entry as the monkey grabs her arm just before she falls into the water, with strong physical contact and a slight splash.
(18) Macro close-up of water droplets on skin, dirt mixing with moisture, realistic texture.
(19) Tension release as both characters reach safe ground; the baby sits unsteadily, breathing softly and blinking.

--- FINAL EMOTIONAL BEAT ---
(20) Alternating tight close-ups of the baby and monkey looking at each other, the monkey tilting its head gently with a protective expression.
(21) Extreme close-up as the baby slowly reaches out and touches the monkey's fur, her fingers sinking slightly into its soft texture.
(22) Final cinematic slow push-in framing both characters in soft jungle light, floating particles and balanced green-warm grading as tension gives way to peace. No dialogue; cinematic finish.`,
  },
  {
    id: "aurelias-escape",
    title: "Aurelia’s escape",
    asset: "aureliaEscapeFilm",
    referenceAssets: ["aureliaEscapeReference"],
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["video", "portraits"],
    description: "A candlelit embrace turns into a fight for survival.",
    tag: "Fantasy film",
    prompt: `Use @q7G7OlKiKeD0DyvByx5s as Aurelia: maintain her exact face, wet dark hair, athletic warrior build, leather armor, realistic textures, and intense expression.\n\nA cinematic medieval interior scene at night. Aurelia and an original male companion stand close beside a wooden bed in a softly lit candle room. The mood begins calm and intimate, with gentle closeness and emotional tension. As they embrace, the man subtly shifts his posture, revealing hidden hostile intent. Aurelia senses something wrong through reflection and body tension. Her expression shifts from calm to alert. In a sudden movement, she pulls away just in time, avoiding a concealed attack motion. She quickly reaches to the bedside and grabs her short sword, stepping back into a guarded defensive stance. The atmosphere becomes tense and dramatic, with flickering candlelight, moving shadows, and strong cinematic contrast. Realistic motion, emotional acting, high-end fantasy realism, original non-copyrighted characters, no franchise elements.`,
  },
  {
    id: "paper-world-fashion-film",
    title: "Paper world",
    asset: "paperWorldFashionFilm",
    referenceAssets: ["paperWorldFashionReference"],
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["video", "portraits"],
    description: "A fashion chase pauses between the street and the page.",
    tag: "Fashion film",
    prompt: `26-second premium cinematic fashion TVC, realistic live action, luxury commercial film style, elegant European city, cool blue-gray palette, wet cobblestones, anamorphic lens, shallow depth of field, refined motion blur, sophisticated editorial pacing. Main character: Use the uploaded reference image as the identity and appearance reference for the protagonist. The young man’s face, hairstyle, body proportions, age appearance, and overall identity should match the uploaded image consistently throughout the entire film. Do not redesign or replace the person. Preserve the realism and natural characteristics of the uploaded person. Pursuers: one Black man and one red-haired white man, both wearing black suits, black ties and dark sunglasses. Poster woman: elegant long-haired woman wearing a dusty pink long-sleeve knit top and dark high-waisted denim pants.

[00:00-00:02] Open with a high aerial top-down view of a classic European metro entrance in cold morning light. The camera smoothly descends as the young man walks up the stairs, then transitions into a low-angle moving portrait. He scans the street and shifts from calm to alert. Smooth, controlled luxury-commercial cinematography.

[00:02-00:04] Track sideways through a crowded street beside the young man. Pedestrians pass close to the lens, creating soft foreground wipes and elegant motion blur. Reveal the two suited men moving through the crowd. Alternate between the young man noticing them, their sunglasses, polished shoes and controlled pursuit.

[00:04-00:07] The young man begins running. Use short premium TVC shots: over-the-shoulder tracking, low close-up of sneakers on wet pavement, side tracking through narrow streets, quick shots of the pursuers and a wide shot showing the distance between them. He collides gently with a passerby. At impact, enter elegant bullet time. The whole environment slows almost to a freeze. Papers, fabric, droplets, shopping items and small debris burst outward and remain suspended in the air. Surrounding pedestrians are frozen in expressive mid-reactions: widened eyes, open mouths, raised brows, half-turned heads, lifted hands, recoiling shoulders, a scarf caught mid-swing, a shopping bag pulled taut, hair and coat hems suspended in motion. One passerby looks shocked with lips parted, another is frozen mid-step, another twists backward in surprise while staring at the collision. The camera performs a smooth cinematic orbit around the frozen moment, emphasizing the suspended expressions, halted movement and dimensional stillness of the street. Only the young man continues moving at near-normal speed, breathing, looking forward and pushing through the nearly frozen scene.

[00:07-00:12] Follow the young man through the suspended street with a floating Steadicam movement. The bullet-time environment remains dense and visibly frozen: pedestrians paused mid-step, mid-turn and mid-gesture; faces hold shocked or confused expressions; raised hands, fluttering coats, loose hair, umbrellas, paper corners and droplets remain suspended in place. Emphasize the contrast between the moving young man and the frozen world around him. He passes close to people locked in startled expressions, someone bending slightly backward in surprise, someone frozen while reaching out, another person staring with widened eyes. Papers and tiny debris drift almost imperceptibly. He turns into a quiet side street and sees a giant static fashion poster on an old stone wall. Slowly dolly out to reveal the full poster. The woman stands on the viewer’s left, leaving early empty full-body space on the viewer’s right. The poster remains completely still and flat.

[00:12-00:14] Continue following him through the frozen street. He turns into a quiet side street and sees a giant static fashion poster on an old stone wall. Slowly dolly out to reveal the full poster. The woman stands on the viewer’s left, leaving a clearly empty full-body space on the viewer’s right. The poster remains completely still and flat.

[00:14-00:18] The street remains in continuous bullet time. In a wide three-quarter shot, the young man runs and makes a clean full-body leap directly toward the empty right side of the poster, not toward the woman. Do not show him touching the wall. A suspended sheet of paper passes close to the camera, creating a natural foreground wipe and seamless match cut. No portal, glow or magical effects. Reveal the same poster composition: the woman remains on the left, and the young man is now a full-size static printed model standing beside her on the right. Both are full body, equal adult scale, aligned on the same ground baseline, with similarly sized heads, a small gap and no overlap. His lighting, perspective and printed texture perfectly match the poster.

[00:18-00:22] The two suited men run into the frozen street and stop in front of the poster. They split toward opposite sides of the frame: one searches the left side while the other searches the right, checking behind pedestrians and around the wall. Use alternating close-ups of their puzzled expressions, slow head turns and sunglasses reflecting the poster. They look back at each other in disbelief, clearly shocked that the young man has disappeared. The young man and woman remain completely static inside the poster, standing side by side at equal scale. The pursuers fail to recognize him, then continue searching and walk out through opposite edges of the frame. Bullet time remains active, with pedestrians, papers and droplets still suspended.

[00:22-00:26] Hold briefly on the empty frozen street after the pursuers leave, then cut to a clean frontal shot of the poster. After a short pause, the young man becomes three-dimensional from his printed position on the right. He reaches toward the woman on the left and they make one coordinated full-body jump forward out of the poster together. They retain the same adult scale while crossing the image plane and regain natural depth, lighting and physical volume without portals or magical effects. Normal time resumes only when both are fully outside. Suspended objects fall and pedestrians continue their interrupted movements. The young man and woman land naturally, walk together toward the side of the frame and exit. Hold briefly on the now-empty poster, then fade to black.

Important direction: Bullet time continues from the collision until both characters fully exit the poster. The poster woman remains on the left. The young man enters the empty right side and appears beside her at the same adult scale. The poster remains completely static while they are inside it. Use framing, foreground wipes and match cuts instead of fantasy effects. Negative prompt: storyboard, comic panels, slideshow, fantasy portal, glowing magic, superhero effects, cheap CGI, violent collision, miniature man, child-sized man, man overlapping woman, man standing in front of woman, incorrect scale, mismatched head sizes, different ground baselines, moving poster characters, early end of bullet time, inconsistent faces, changing outfits, distorted anatomy.

Audio direction: Premium cinematic fashion-commercial sound design. Begin with restrained European city ambience, distant traffic, metro rumble, footsteps and soft fabric movement. Build subtle tension with minimal electronic pulses and elegant orchestral textures during the pursuit. At the collision, audio drops into deep muffled bullet-time: stretched impacts, slowed breathing, suspended droplets, distant low-frequency ambience and isolated floating-object sounds. Keep the soundscape sparse, immersive and refined. When the pursuers search the street, use muted footsteps, subtle suit movement and restrained tension. As the young man and woman jump out of the poster, introduce a smooth rising sound transition. The instant both fully enter the real world, restore full-speed city ambience, falling papers, footsteps and natural street sound. End with a soft cinematic musical resolve. No dialogue, no vocals, no loud action-movie drums, no comedic sound effects, no magical chimes, no aggressive trailer music.`,
  },
  {
    id: "manchester-derby-volley",
    title: "Derby winner",
    asset: "manchesterDerbyFilm",
    referenceAssets: ["manchesterDerbyCharacter", "manchesterDerbyBall", "manchesterDerbyStadium"],
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["video", "portraits", "marketing"],
    description: "A last-gasp volley turns Old Trafford red.",
    tag: "Sports film",
    prompt: `15-second cinematic football commercial, 4K ultra-HD realism, premium sports-ad aesthetic, teal-and-red cinematic color grade, anamorphic lens flares, stable image, no flicker, blur, ghosting, or distortion. Use reference image 1 as the exact identity and appearance reference for Sultan, a young Lebanese-Mediterranean male footballer with thick messy dark hair, smooth light olive skin, soft sharp jawline, dark brown eyes, youthful handsome face, and lean athletic build. Preserve his face, hair, skin tone, and proportions consistently in every shot. He wears the Manchester United home kit, number 10, “SULTAN” on the back, and black-and-red Nike Mercurial boots. Use reference image 2 for the official match ball: white panels, dark geometric star pattern, subtle red accents. Use reference image 3 for Old Trafford’s architecture and atmosphere: a packed 75,000-person crowd at dusk, fully illuminated floodlights, and rain mist in the air. The stadium reference is the first-frame visual direction. Manchester United versus Manchester City derby.

Shot 1 (0:00–0:02): Massive drone plunge over Old Trafford during the derby. Floodlights cut through the deep-blue dusk sky; red crowd flares glow in the stands. Dive rapidly to pitch level and speed-ramp to 40% at grass height. Cinematic anamorphic flares. Deafening stadium roar and echoing chants. Hard cut.

Shot 2 (0:02–0:04): Sultan traps a powerful driven cross on his chest while sprinting between Manchester City defenders in sky-blue kits. Low-angle 35mm Steadicam follows tightly from behind. “SULTAN 10” is visible across his back as he accelerates. Speed-ramp into full sprint. Wet boots scrape turf, heavy breathing, crowd anticipation. Hard cut.

Shot 3 (0:04–0:06): Extreme ankle-level close-up as Sultan plants his boot in wet grass and draws his right foot back for a volley. Macro detail: turf, water droplets and dirt burst upward in slow motion. Decelerate to 30% during the foot plant. Metal studs dig into turf. Violent whip pan upward.

Shot 4 (0:06–0:09): Sultan launches into a full-air volley and strikes the reference match ball with explosive power. His body is fully extended, left arm balancing in the air, jersey folds moving naturally. Low-angle 24mm hero shot; Manchester City defenders freeze behind him under the floodlights. Decelerate to 20% exactly at contact. Thunderous boot impact. Flash frame to white as a signature transition.

Shot 5 (0:09–0:11): Resolve from the white flash. The reference ball rockets through the air at 15% speed, trailing spinning turf particles. A 200mm telephoto lens tracks it toward the top corner. The Manchester City goalkeeper dives full stretch but is too late. The ball smashes into the top corner and the net erupts backward. Net snap, stadium explosion, commentators screaming.

Shot 6 (0:11–0:13): Sultan drops to his knees and slides across wet turf in front of the Stretford End. Arms spread wide, head tilted back, eyes closed, mouth open in pure euphoria. “SULTAN 10” is clearly visible on his back. Steadicam orbits left; warm floodlights rim his silhouette. Decelerate to 50%. 75,000 fans roar in unison; Manchester United chants dominate.

Shot 7 (0:13–0:15): Massive wide crane shot rises as Manchester United teammates rush to celebrate with Sultan. Old Trafford erupts in red crowd chaos: waving scarves, flashing cameras, stadium lights reflecting on wet grass. Ascend above the pitch to reveal the full stadium scale and derby victory. Crowd sustains echoing chants. Cinematic stadium ambience only; no music, no subtitles. Lock off the final frame.

Maintain exact facial consistency with reference image 1. Preserve hairstyle, facial structure, skin tone, youthful appearance, and natural proportions. Realistic football movement, wet-turf interaction, jersey fabric, and authentic stadium lighting.`,
  },
  {
    id: "rainy-city-vlog",
    title: "Rainy city vlog",
    asset: "cityVlogFilm",
    referenceAssets: ["cityVlogCharacter"],
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["video", "portraits"],
    description: "Breakfast, a wrong-train scare, rain, then a rooftop worth it.",
    tag: "Travel vlog",
    prompt: `@Image1 is the sole character identity reference. Generate a second, fully standalone 30-second, 16:9 horizontal photorealistic YouTube travel vlog: the girl has already left the hostel and is eating a simple breakfast in an unfamiliar city, crossing streets, riding the metro or a commuter train, briefly tired by the train window, arriving to find rain, crossing wet blocks under an umbrella, and finally climbing to a rooftop observation deck to see the golden city after the rain. This prompt must stand on its own even without reading the first one. The narrative is not a landmark advertisement but a traveler's real small actions, small troubles and emotional shifts across one day: a bit hungry, a bit rushed, a bit tired, thrown off rhythm by the rain, yet rewarded with a view worth it in the end.

[ABSOLUTE IDENTITY AND WARDROBE LOCK] The girl matches @Image1 one hundred percent: young East Asian woman, soft oval face, light natural skin, dark brown almond eyes, straight nose, natural pink lips, slim balanced build; black hair in a high loose bun with two long face-framing strands always hanging at the sides, and always four to five parallel silver hairpins on one side of her head; always wearing the same thin-framed dark burgundy oval glasses. Every shot keeps the same age, facial features, face width, eye spacing, glasses size, hairline, bun height, hairpin count, height, shoulder width and body proportions. From the very first frame she wears the complete street outfit from @Image1: deep navy loose short-sleeve T-shirt with a yellow retro bubble graphic and yellow arc across the chest; light-gray ultra-loose cargo pants with large side pockets; white knit fingerless gloves; red-blue plaid backpack straps with brown leather details; chunky white-gray sneakers. Within the thirty seconds she never changes clothes, removes the glasses, alters the hairstyle or adds another outer jacket. There is only one girl; no duplicate characters appear.

[UNIFIED CAMERA SYSTEM] All shots use the same Sony A7S III full-frame camera and the same Sony FE 24mm F1.4 GM prime, 84-degree diagonal field of view, straight lines stay straight, no fisheye. No lens swaps, no zooms, no digital push-ins, no telephoto compression, no drones, no commercial stabilizers. 4K-source texture, 24fps, natural motion blur around 1/50s shutter, S-Log3-style soft highlight rolloff, real skin texture, shadow detail without over-lifting. Allow slight high-ISO grain, auto-exposure breathing, brief focus hunting, small vertical bob from handheld steps and occasionally slightly off-center framing. The camera language always alternates between: static observation shots where she has placed the camera on a café table, the ground, a platform edge, the seat across from her on the train, an awning counter, a stair landing or a rooftop parapet; and close handheld selfie shots of the same camera in her hands. Every new position must let the viewer understand where the camera was placed — it must never feel like an invisible film crew is following her.

[CITY, WEATHER AND LIGHT] The city is real, lived-in, slightly unfamiliar: a small streetside breakfast table near the hostel, morning traffic and shop shutters; sidewalks and intersections; an ordinary metro entrance, fare gates, platform and a silver commuter train; fabric seats, handrails and rain-streaked windows inside the train; the awning at the arrival station exit; wet sidewalks, a crosswalk, a narrow alley or underpass; stairs leading to a rooftop observation deck; finally a readable city skyline. The first half is soft overcast with naturally cool colors; the metro interior has ordinary cool-white ceiling lights; rain begins on arrival, bringing blue-gray reflections and vehicle lights to the pavement; in the rooftop finale a low warm sun breaks through the clouds, drawing golden rim light on the side of her face, the edge of her glasses, her hair strands and the umbrella, while the city stays cooler. All light comes from the sky, shop windows, transit fixtures, train windows and the low sun.

[CONTROLLED MULTI-SHOT SEQUENCE] Shot 1, about 2.5 seconds. From the first frame the girl is already seated at a small streetside breakfast table near the hostel, in the complete @Image1 outfit, the plaid backpack on the chair beside her. The camera rests on the table near a paper cup and simple bread, low-angle medium-close, the cup rim softly out of focus. She glances at the street, takes a quick bite, chews slowly, then tells the camera: "Gotta eat something first, or I seriously won't make it." Keep the cup lid, the wrapper, distant traffic and her low, just-woke-up voice.

Hard cut. Shot 2, about 1.5 seconds. Camera placed at the sidewalk edge, very low to the ground; the chunky white-gray sneakers enter from close range; she steps past the lens, the plaid backpack swinging with her stride. A sole presses over a small patch of wet pavement — heel strike, weight shift and toe-off all clearly readable. The direction of motion pushes from the hostel street toward the metro entrance; city pedestrians remain background only and never block her.

Match-on-action cut. Shot 3, about two seconds. Camera resting on a low windowsill at a street corner, 24mm wide frame. She walks from near-frame into the depth of the sidewalk, briefly stops to check the map on her phone, then looks up searching for the entrance — not posing, genuinely navigating. She spots the metro sign, gives a small nod, pockets the phone. The fare-gate beep of the next shot pre-laps.

Hard cut. Shot 4, about 2.5 seconds. First a close insert of the transit card and gate reader: she pulls the single card from the backpack's side pocket, taps it, green light and mechanical click together. Cut to a low wide angle from behind the gates: she passes through, glances back to confirm the card is stowed, then quickens her pace toward the platform. Hand, card, bag and gate structure stay stable — nothing floats or duplicates.

Hard cut. Shot 5, about 2.5 seconds. Close handheld selfie on the platform; her face, glasses, bun, two long strands and silver hairpins clearly match @Image1. She waits behind the safety line as the silver train rushes in behind her; the airflow whips her face-framing strands, T-shirt hem and backpack straps. The camera takes one real small shake from the pressure wave; she looks at the train first, then at the lens, and says with an uncertain smile: "I really hope this is the right train." The train's roar covers the cut.

Hard cut. Shot 6, about 3.5 seconds. Camera placed on the seat opposite or a small window ledge, static 24mm medium shot. The girl sits by the rain-streaked window, backpack at her legs, city buildings and tunnel light-dark slide past outside. She leans her head lightly against the glass, eyes closed for a moment, shoulders dropping — real fatigue; the train's sway shifts her body and the backpack in slight sync. She opens her eyes again, lifts the phone to check the map, gives a small nod at the station name and murmurs to the camera: "Okay… looks right." Do not shoot the train like a luxury ad; keep blurred ordinary passengers in the background and the PA announcements.

Sound bridge. Shot 7, about 2.5 seconds. The train's low rumble dissolves into rain. Camera resting under the arrival station's exit awning, eye-level wide. The girl steps out from the stairs or doorway, sees the rain and pauses half a beat, looks up with a resigned smile. She pulls a folding umbrella from the backpack; on the first press it opens only halfway; she fixes the ribs by hand and it opens fully on the second try. She exhales: "Of course it's raining." The umbrella has real resistance and spring — it never pops open instantly.

Hard cut. Shot 8, about 2.5 seconds. Camera placed on the wet sidewalk near the crosswalk; the low-angle sense of following comes from her actively passing in front of the lens, not from a floating camera. Chunky soles step into shallow water, splashes spread outward obeying gravity, cargo-pant cuffs swing half a beat late, the plaid backpack carries inertia from her stride and the umbrella's wind drag. Passing pedestrians' legs and umbrellas create brief foreground occlusion; vehicle lights pull natural reflections across the wet surface.

Hard cut. Shot 9, about 2.5 seconds. She has set the camera on a low wall in an underpass or narrow alley. She walks toward the lens under the umbrella from a distance, passes it, stops, and picks the camera up into a close selfie. Her breathing is slightly fast, small raindrops sit on her glasses, the face-framing strands cling to her cheeks; she doesn't complain, just looks toward the stairs ahead and says: "Almost there." As her hand touches the camera, fingers briefly occlude the frame edge and exposure adjusts naturally.

Hard cut. Shot 10, about 2.5 seconds. Camera placed on a stair landing on the way to the roof, low wide angle. Umbrella stowed, she climbs; sole-to-step contact is explicit, body leaning slightly forward, backpack bouncing with each step. She breathes lightly as she passes the camera, reaches out and picks it up; the last few steps become handheld follow. The rooftop door opens, warm light spills through the gap, the rain sound begins to fade.

Hard cut. Shot 11, about 2.5 seconds. Camera resting static on the rooftop parapet or safety platform, wide frame. She enters from near-frame and stops at the safety railing; the wet city skyline spreads behind, the low sun breaking through clouds. She doesn't face the lens right away — she just quietly watches the city, shoulders slowly relaxing. Light rain still taps the umbrella and railing; golden reflections appear within the cool-toned city.

Hard cut. Shot 12, about three seconds. She lifts the same camera into a 24mm close side-angle selfie; her face is not a commercial beauty close-up but a real traveler's face with raindrops, natural pores and fatigue. Warm golden rim light falls on the glasses, the silver hairpins and the two long strands; the city behind stays readable but soft. She looks into the distance first, then gently turns her eyes to the lens and says very quietly: "But it was worth it." No freeze after the line — she keeps breathing and watching the city, wind moving stray hairs, T-shirt, backpack straps and umbrella fabric, distant traffic and clouds still in motion.

[YOUTUBE TRAVEL SHOOTING LOGIC] Every non-selfie shot must convince the viewer the girl placed the camera herself in advance. The breakfast shot keeps the table edge, cup or wrapper as near foreground; the sidewalk shot shows the curb and ground grain; the corner windowsill shot carries a hint of window frame; the behind-the-gates position shows the gate edge; the train-seat position keeps the opposite seat or ledge; the awning position shows water drops on the counter; the underpass position includes the low wall's edge; the stair position lets the nearest step fill the lower frame; the rooftop position shows the parapet or platform. When she sets the camera down she first nudges the framing by hand, then returns to her starting mark; after completing the action she approaches and picks it up, fingers causing a brief natural occlusion. Selfies carry arm weight, breath and walking pulse; static shots carry only ambient vibration and the slight tremor of trains, wind or footsteps. The camera never follows her through walls, floats or moves on its own without reason.

She is not a travel-commercial host on camera. At breakfast she is still sleepy and speaks only after chewing; searching for the metro she stops and turns to check rather than walking with a perfect smile; when the train arrives she instinctively looks at the train first, then remembers the lens; her fatigue in the carriage is not an exaggerated collapse but heavy eyelids, relaxing shoulders, forehead lightly touching glass; when the umbrella jams she freezes a beat, checks the ribs, then laughs at her own luck; on the stairs the breathing is real; on the roof she doesn't strike a pose immediately. Keep these imperfect reactions so the city is not a backdrop but an environment actively affecting her body and mood.

[IDENTITY AND PROP CONTINUITY] The plaid backpack sits on the neighboring chair at breakfast, goes onto her back as she leaves, and stays on both shoulders or briefly at her legs afterward; it never turns into a crossbody bag, a solid-color bag, or disappears. There is exactly one transit card: taken from the side pocket, tapped, returned to the same side pocket. The phone is pocketed after the street-corner map check and drawn from the same pocket again on the train. The folding umbrella stays stored in the backpack until arrival and is taken out for the first time at the station exit; once open it remains the same small dark umbrella in the rain, stowed before the stairs and carried in hand. The paper cup and breakfast exist only at the street table and never travel into the metro. Raindrops on the glasses appear after entering the rain and a few droplets remain on the roof; the train's front and doors, the fare gates, the platform safety line, the stairs and railings keep continuous structure within their shots.

[MOTION AND ENVIRONMENTAL PHYSICS] The train enters the platform with huge mass and air pressure; her face-framing strands, T-shirt hem, backpack straps and the handheld camera react to the same wind direction; she stands behind the safety line with stable footing. While riding, the scenery outside slides in one direction, tunnel lights pulse naturally, and the girl and backpack sway in slight phase with the carriage. Rain falls from above or diagonally; the umbrella canopy loads first, then springs; when wind shifts the umbrella angle her wrist and shoulder resist. Shoes striking shallow water throw low outward splashes; pant cuffs absorb a little water and darken; wet soles produce more careful footing on the stairs. Every body movement has heel contact, weight transfer, inertia and recovery — no gliding, no floating, no passing through crowds or buildings.

[SHOT LINKING AND TIME PROGRESSION] The breakfast shot ends with her picking up the backpack; the next shot's footsteps continue the same direction from the table action; wrapper rustle gradually yields to city footsteps. Her phone-pocketing gesture matches the transit card being drawn from the side pocket; as the gate light turns green, the train's braking sound pre-laps. The platform selfie's train wind becomes the sustained low rumble and rail rhythm of the interior shot. When she closes her eyes at the window the shot is allowed to linger — do not interrupt the fatigue with a new location; after the map confirmation, the PA and door chime carry the cut to the awning exit. The umbrella's spring-open sound triggers the low wet-pavement setup; the crosswalk's white bars geometrically match the underpass's depth lines. After "Almost there" she looks up toward the stairs; the next shot climbs along the same sightline. The rooftop door's warm light is not a sudden weather swap but the low sun briefly piercing as the rain clouds crack; the cool wet city gradually gains golden edges, time progressing naturally from a chilly overcast day to a post-rain evening.

[COMPOSITION AND FOCUS] The same 24mm keeps the environment readable in close selfies, her face never pressed to the frame edge, avoiding wide-angle stretch; static street positions sit about three to six meters from her so her action and its relationship to the city stay clear. Breakfast focus shifts briefly from the cup rim to her eyes; the gate insert focuses on card and hand; the platform selfie locks the nearer eye, with slight motion blur allowed on the train; interior focus holds her profile and glasses with soft rain-streak foreground; the wet-pavement shot focuses on shoes and splashes; the rooftop wide keeps girl, railing and skyline readable together, and the final selfie re-locks the eyes. Autofocus may breathe once briefly but must return quickly to the subject, never lingering blurred or mis-locking onto background pedestrians.

[REAL MATERIALS AND FINAL MOOD] Preserve natural skin pores, slight tiredness under the eyes, clear lens glass, wet hair strands, knit glove fibers, T-shirt cotton weave, cargo-pant creases, plaid fabric, leather details, rubber soles, paper cup, metal fare gates, train window glass, umbrella fabric and wet concrete as distinct materials. Rain never turns makeup into dramatic streaks; city reflections never over-neonize. The ending emotion comes from her breath and gaze once she stops rushing — not from slow motion, swelling music or an advertising smile; she is still a little tired, yet genuinely feels the day was worth it. Every shot makes character, place and current action instantly readable from its first frame, wasting no time on unrelated empty shots; the thirty seconds hold a single forward direction from breakfast to rooftop, clear causality and a real, naturally breathing rhythm.

[EDITING AND SOUND] The whole film uses clear hard cuts, match-on-action cuts and sound bridges — no dissolves, no flash-whites, no glitches, no morph transitions. Wrapper rustle links to footsteps, the gate beep leads to the platform, the train roar covers the interior cut, the train's low end turns into rain, and the rain fades on the roof. Dialogue is only the six quoted lines, with synced lips, breath and voice; no extra narration, subtitles, titles, stickers, logos, watermarks or social media UI. The music is a very light warm lo-fi pulse — slightly rhythmic in the metro section, lowered in the rain, and on the roof only one sustained warm piano chord remains; location sound always dominates.

[RESULT LOCK] Keep the emotional curve of a real YouTube travel vlog: a simple breakfast gives her a little energy, the city walk brings anticipation, transit wears her down, rain adds real trouble, and the rooftop view becomes a quiet reward. Keep the @Image1 identity and complete outfit consistent shot by shot, keep the Sony A7S III and the same 24mm prime perspective consistent, keep hands and feet correct, props singular, sole contact, bag weight, umbrella resistance, splashes, fabric and hair inertia. The ending must stay in living motion and never freeze into a poster.`,
  },
  {
    id: "sushi-first-bite",
    title: "First bite",
    asset: "sushiBiteFilm",
    referenceAssets: ["sushiBiteCharacter"],
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["video", "portraits"],
    description: "One bite of sushi: sour shock, near spit-out, then pure bliss.",
    tag: "Food reaction",
    prompt: `Cinematic 15-second single continuous handheld shot, no cuts. A fictional young East Asian woman in her early twenties, entirely original character resembling no real person, model or existing film character: sleek black hair pulled into a high tight ponytail with two long loose strands framing her face, soft natural makeup with muted rose lips, a chunky polished silver collar necklace, wearing a vivid green sheer mesh long-sleeve top draped off one bare shoulder over a matching green top (original designs, no brand tags). LOCATION: a cozy daytime sushi bistro (fictional place) — a long polished dark-wood counter with a woven rattan runner, warm cream walls with blank decorative scroll banners bearing NO readable writing, soft glowing cabinet lights, an open kitchen blurred in the background with sushi chefs working, a red orchid in a pot, and a large window flooded with bright midday light and lush green trees outside, gentle teal-and-warm film color cast. In front of her: a ceramic plate of assorted sushi, a small dish of soy sauce, a mound of pink pickled ginger, wooden chopsticks in her hand — all plain and unbranded. COMPOSITION: she sits in the RIGHT THIRD of the frame, never centered, in three-quarter view facing the window light, the long counter and blurred open kitchen stretching away into the left two-thirds with shallow-focus depth; shot from slightly BELOW her eye line across the countertop, the out-of-focus sushi plate and woven runner cutting the bottom edge of the frame; the frame holds a constant dutch tilt of about 10-12 degrees, horizon never leveling. CAMERA: light playful handheld, breathing and swaying on the operator's elbows against the counter, micro-jitter, slow unsteady slide along the counter edge closer to her face as the shot progresses, window light softly flaring the lens, never static. ACTION AND EMOTION TIMELINE — the opening action happens AT SECOND ZERO and the first emotion detonates at FULL comic intensity immediately, no build-up: 0–1s in the very first frames she lifts a whole SHRIMP NIGIRI — pale pink butterflied shrimp on a rice pillow — with her chopsticks and shoves it into her mouth in one bite; 1–4s the sour hit of vinegared rice and ginger strikes INSTANTLY — her face implodes, eyes screwed shut, lips puckered hard around full cheeks, shoulders shuddering, chopsticks clattering down onto the plate, one fist pounding the counter lightly, ponytail whipping as she shakes her head fast; 4–8s the sour turns to open disgust — face going flat with revulsion, chewing slower and slower, nose wrinkled, gagging slightly, tongue pushing the bite to her cheek, she grabs a napkin and lifts it to her lips ready to spit it out, eyes betrayed; 8–11s with the napkin at her mouth she suddenly freezes — eyebrows jump, eyes pop open, the flavor has turned — she lowers the napkin an inch, chews once, twice, slowly, suspicious but intrigued; 11–15s pure delight blooms — eyes closing in bliss, a huge glowing smile spreading as she chews, she melts back on the stool, kicks her feet lightly under the counter, hums with pleasure and reaches with her chopsticks for the next shrimp nigiri, cheeks flushed in the window light. Shallow depth of field, 35mm film texture, warm teal-tinted japanese-indie-film grade, soft grain, cozy slice-of-life cinema look. No captions, no subtitles, no readable text anywhere — blank scrolls, blank menus, no signage — no logos, no brands, no mascot figurines or recognizable characters of any kind, fictional location, no real people, no copyrighted characters.`,
  },
  {
    id: "led-mask-tiktok",
    title: "Glow mask",
    asset: "maskTiktokFilm",
    referenceAssets: ["maskTiktokModelA", "maskTiktokModelB", "maskTiktokMaskA", "maskTiktokMaskB"],
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["video", "marketing"],
    description: "A 10-minute glow-up, TikTok style.",
    tag: "Product ad",
    prompt: `TikTok-style vertical 9:16 marketing video. A trendy Korean woman in her mid 20s with sleek black hair in a claw clip, dewy glass skin, soft makeup, white ribbed tank. Minimal bathroom with warm vanity lights and small plants. She holds a glowing LED face mask, slips it on, the red light washing over her skin, then lifts it and taps her cheek, and says in clear English with a soft accent: "Ten minutes a day. My skin has never looked like this. I'm obsessed." Quick TikTok cuts: mask close-up, light turning on, glowing skin reveal, sparkle transition, natural sync sound English voiceover, glossy pop music. Use @Image3 and @Image4 for the LED light mask and use @Image1 and @Image2 for the model.`,
  },
  {
    id: "stadium-cam-goal",
    title: "Big screen goal",
    asset: "stadiumCamFilm",
    referenceAssets: ["stadiumCamCharacter"],
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["video", "portraits"],
    description: "The stadium cam finds a fan, and she takes the shot.",
    tag: "Sports film",
    prompt: `@Image1

[Camera View] Official television sports broadcast feed. High-angle professional zoom lens, smooth tripod-mounted tracking, no handheld jitter. The video features a permanent digital scoreboard overlay in the top-left (MATCHWEEK 24, NAS 2, SHB 1) and a "SSC 1 LIVE" television logo in the top-right, perfectly static.

[Candid Discovery] The broadcast camera cuts from the game to scan the crowd in natural, ambient daylight. It locks onto a stunning woman in a dark brown silk halter dress. She is surrounded by a diverse audience wearing everyday casual clothes (hoodies, jackets, t-shirts). She is casually eating a burger and holding a blue soda can. She incidentally glances up, catches her own image on the stadium's giant screen, and realizes the live camera is on her. She gives a surprised, cool smirk to the camera.

[The Transition] She quickly but calmly sets her burger and drink on her seat, stands up with athletic poise, and coolly vaults over the professional stadium railing onto the pitch. The broadcast camera pans smoothly to follow her movement from the stands to the grass.

[The Interaction] On the pitch, a professional soccer player in a white kit passes the ball directly to her feet. Despite wearing sharp high-heeled shoes, she expertly traps the ball and executes a powerful, professional-level strike. The ball arcs with high velocity into the top corner of the goal net.

[Audio & Finish] Audio is authentic stadium environment sound: the distant hum of thousands, the rustle of clothing, the sharp "thwack" of the high heel hitting the ball, and the massive roar of the crowd after the goal. She turns toward the lens with a radiant smile and playfully covers the camera with her hand, ending the broadcast segment.

[Technical Specs] Broadcast-quality 4K, 60fps, natural color grading, high-end optical zoom, photorealistic textures, clean TV graphics.`,
  },
  {
    id: "frozen-hunt",
    title: "Frozen hunt",
    asset: "frozenHuntFilm",
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["video"],
    description: "A rider lassos an ice beast across a dawn-lit plain.",
    tag: "Fantasy action",
    prompt: `Ultra epic wow visual with a thrilling clear crisp great lighting scene with a frozen grassland under a pale orange dawn, where a rider in layered wool armor and carved antler shoulder plates faces a long-necked ice predator with translucent fins and six running limbs, intense anticipation across the open plain. The camera begins at horse level, racing beside the rider as the beast charges from the right. The rider throws a rope harpoon into the beast’s shoulder fin, circles wide to avoid its bite, then uses the horse’s turn to pull the beast off line. Snow trails and breath plumes show direction clearly. The camera speeds up with a clean lead shot in front of the horse, a wide side sweep showing the rope tension, and a gradual overhead arc as the beast recovers and sprints again. Climax: the rider dismounts onto a boulder, anchors the rope, and the beast’s own speed brings it down in a slide of ice and snow. Ending: the horse slows, the beast stops struggling, and the rider cuts the rope loose as dawn light warms the plain`,
  },
  {
    id: "canyon-wrath",
    title: "Canyon wrath",
    asset: "canyonWrathFilm",
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["video"],
    description: "One arrow, one canyon, and a stampede at golden hour.",
    tag: "Action film",
    prompt: `Style and Cinematography:

A high-octane cinematic action sequence shot on 35mm film with a gritty, high-budget blockbuster aesthetic. The lighting is dominated by intense golden hour sunlight, creating deep shadows, brilliant sun flares, and a warm, saturated color palette. The film features heavy analog film grain and a visible high-noise floor to enhance the raw, visceral texture. High-fidelity VFX, realistic physics, and 8K resolution.

Sequence and Composition:

Shot 1 (Close-up): Cinematic close-up of a battle-hardened female warrior with a resolute expression. Her face is covered in sweat, grit, and dust, with a small bleeding cut on her cheek. She pulls a heavy black bow to full draw, a metallic arrow nocked against her fingers. Sharp focus on her intense gaze and the fine textures of her leather armor. Audio: Tense, rhythmic industrial heartbeat pulse and whistling wind.

Shot 2 (Extreme Macro): An extreme macro close-up of the warrior’s eye. The iris is intricately detailed, reflecting the sunlit canyon in the pupil. Long, dark eyelashes are dusted with fine particles. The camera captures a split-second blink of pure focus. Audio: Sound drops into a hollow, high-tension vacuum.

Shot 3 (Epic Wide Shot): A high-angle wide shot from the edge of a jagged cliff, looking down into a massive rocky canyon. A colossal herd of dark, prehistoric beasts is stampeding through the valley, kicking up massive clouds of volumetric dust that catch the golden sunlight. Audio: A sudden, deep orchestral swell with rising brass.

Shot 4 (High-Speed Tracking): The arrow is released. A high-speed tracking shot follows the black arrow from behind as it streaks through the air at terminal velocity. The rocky canyon walls blur past as the arrow flies toward the stampeding herd. Audio: A sharp, whip-like "whoosh" and a massive sonic boom.

Shot 5 (Ground-Level Impact): A low-angle, ground-level dynamic shot of the stampeding beasts. Hundreds of massive, muscular creatures thunder past the camera, their hooves churning up earth and debris. A shaky-cam effect simulates the ground vibrating with immense power. Audio: Earth-shattering percussive explosions and deep sub-bass rumbles.`,
  },
  {
    id: "hammy-mech-war",
    title: "Hammy's war",
    asset: "mechaWarFilm",
    referenceAssets: ["mechaWarBattlefield", "mechaWarAlien", "mechaWarPilot", "mechaWarMech"],
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["video"],
    description: "A hamster pilots a 30-meter mech into an alien swarm.",
    tag: "Sci-fi action",
    prompt: `🎨 Art Style

Hyper-cinematic sci-fi illustration with a gritty comic-book edge. Think Pacific Rim meets Borderlands — bold ink outlines on mechanical surfaces, painterly atmospheric lighting, deep contrast between cold steel blues and warm alien bioluminescence. Dramatic Dutch angles, lens flares, volumetric god rays cutting through alien smoke. Rendered in 8K with Unreal Engine 5 realism but with stylized exaggerated proportions for comedic-epic contrast. Color palette: deep space indigo, toxic neon green, plasma cyan, charred orange explosion bloom.

🌍 Environment — The Battlefield @Image1

An alien world at the edge of a dying star — cracked obsidian terrain veined with glowing magenta lava rivers. Colossal bioluminescent mushroom-trees tower like cathedrals, pulsing violet and teal. A sky of churning jade-green storm clouds, split by three blood-red moons hanging low on the horizon. The air shimmers with toxic spores drifting like snow. Scattered across the battlefield: crumbling alien ruins — monolithic black stone arches covered in etched glowing runes, half-submerged in the earth. A crater field pockmarked from centuries of war. The ground itself seems alive — quivering, organic, covered in a dark chitinous membrane that cracks and bleeds amber ichor under heavy weight.

👾 The Alien — The Vreth @Image2

A single Vreth stands 3 meters of wrong — six-limbed, dark maroon chitin cracked at the joints like old war armor, a faint purple iridescence catching the alien light. No eyes, just a crown of six amber sensory stalks that glow hotter the angrier it gets. Its mouth is a vertical slit that splits into four jaw-petals lined with obsidian serrated teeth, flaring wide in a constant shriek that makes metal vibrate. At low speed it moves with a twitchy, glitching jitter — unsettling, like a corrupted animation. At full sprint it drops to all six limbs and becomes something else entirely, closing ground at a speed that shouldn't exist, zagging off walls, feinting, never telegraphing. It bleeds amber that glows faintly in the dark. After it falls, the ground around it looks like a shattered lantern — horrible and beautiful at the same time.

🤖 The Mechanoid @Image4

A 90-ton bipedal war machine — brutalist, asymmetrical, and terrifying. Scratched matte-black tungsten armor plating bolted over a glowing blue fusion skeleton. One shoulder mounts a rotating six-barrel plasma Gatling cannon the size of a school bus. The other arm ends not in a hand but in a railgun barrel wrapped in electromagnetic coils crackling with white lightning. Its visor — a single horizontal slit of blazing red light — scans the battlefield with predatory intelligence. Battle damage is everywhere: a missing knee plate revealing pistons firing like exposed muscle, scorch marks across the chest, a dangling antenna sparking. On the chest plate, scratched crudely in the paint with tiny claws, the word "HAMMY'S". Steam vents from joints with every step. Stands 30 meters tall. Footsteps leave molten craters.

🐹 Hammy — The Pilot @Image3

Inside a cockpit built for something far larger sits Hammy — a 4-inch golden Syrian hamster with the energy of a warlord. Chubby cheek pouches stuffed (mid-battle snack, obviously). Wearing a teeny custom pilot suit — olive green, covered in tiny painted kill-count tallies. Oversized aviator goggles pushed up on his fuzzy forehead. One tiny paw grips a joystick. The other holds a sunflower seed he hasn't stopped eating. His eyes: jet black, absolutely unhinged with joy. A custom-stitched patch on his shoulder reads "ACE PILOT". When the cockpit hatch blows open at the end, steam swirls around him dramatically — and he is completely unbothered. Smug. Legendary.

⚔️ The Fight Scenes

0s – 5s

The stormy violet sky splits open as a blazing beam of white-orange energy crashes into the alien battlefield. The impact creates a massive crater, sending black crystal shards, glowing spores, green mist, and alien dust blasting outward. The Verth swarm nearby freezes, their emerald eyes glowing through the smoke.

5s – 10s

From inside the crater, Mechanoid slowly rises, towering over the battlefield like a walking war machine. Orange reactor vents ignite across its armor, shoulder missile pods unlock, and both arm-mounted weapons unfold with heavy mechanical snaps. Hundreds of red targeting lasers sweep across the charging Verth.

10s – 15s

The Verth swarm erupts into motion, crawling from caves, leaping from crystal cliffs, and charging across toxic rivers. Mechanoid activates Titan Barrage Mode. Its left-arm six-barrel rotary Gatling cannon spins violently and fires streams of blue-white plasma rounds, ripping through the first wave in explosive bursts of green alien energy.`,
  },
  {
    id: "neon",
    title: "Neon muse",
    asset: "portrait",
    mediaType: "video",
    model: "Kling",
    categories: ["video", "portraits"],
    description: "A close-up with a story to tell.",
    tag: "Portrait",
  },
  {
    id: "desert",
    title: "Desert drift",
    asset: "desert",
    mediaType: "video",
    model: "Veo",
    categories: ["video"],
    description: "Wide-open movie energy.",
    tag: "Cinematic",
  },
  {
    id: "product",
    title: "The soft launch",
    asset: "product",
    mediaType: "image",
    model: "FLUX",
    categories: ["image", "marketing"],
    description: "A product, beautifully reimagined.",
    tag: "Product",
  },
  {
    id: "ocean",
    title: "Out of office",
    asset: "ocean",
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["video"],
    description: "An instant escape.",
    tag: "Travel",
  },
  {
    id: "dream",
    title: "Otherworldly",
    asset: "ocean",
    mediaType: "video",
    model: "Wan",
    categories: ["video"],
    description: "A new shade of surreal.",
    tag: "Experimental",
    filter: "hue-rotate(65deg) saturate(1.3)",
  },
  {
    id: "editorial",
    title: "Cover story",
    asset: "portrait",
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image", "portraits"],
    description: "Find your main-character moment.",
    tag: "Editorial",
    filter: "grayscale(1) contrast(1.1)",
  },
  {
    id: "golden",
    title: "Golden hour cut",
    asset: "desert",
    mediaType: "video",
    model: "Kling",
    categories: ["video", "marketing"],
    description: "Your next campaign opener.",
    tag: "Campaign",
    filter: "sepia(.25) saturate(1.2)",
  },
  {
    id: "bloom",
    title: "Botanical dream",
    asset: "product",
    mediaType: "video",
    model: "Veo",
    categories: ["video", "marketing"],
    description: "A softer product story.",
    tag: "Beauty",
  },
  {
    id: "coastal",
    title: "Coastal state",
    asset: "ocean",
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["video"],
    description: "An easygoing little film.",
    tag: "Lifestyle",
    filter: "sepia(.2)",
  },
  {
    id: "after",
    title: "After hours",
    asset: "portrait",
    mediaType: "video",
    model: "Wan",
    categories: ["video", "portraits"],
    description: "Night lights, your way.",
    tag: "Nightlife",
    filter: "hue-rotate(25deg)",
  },
  {
    id: "object",
    title: "Object of desire",
    asset: "product",
    mediaType: "image",
    model: "FLUX",
    categories: ["image", "marketing"],
    description: "Elevate the everyday.",
    tag: "Still life",
    filter: "grayscale(.85)",
  },
  {
    id: "postcard",
    title: "A perfect nowhere",
    asset: "desert",
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image"],
    description: "Scenes worth getting lost in.",
    tag: "Landscape",
    filter: "sepia(.3)",
  },
  {
    id: "midnight-portrait",
    title: "Midnight portrait",
    asset: "portrait",
    mediaType: "video",
    model: "Kling",
    categories: ["video", "portraits"],
    description: "A little light. A whole new mood.",
    tag: "Portrait",
    filter: "hue-rotate(18deg)",
  },
  {
    id: "the-blue-cut",
    title: "The blue cut",
    asset: "ocean",
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["video"],
    description: "A little cinematic wanderlust.",
    tag: "Travel",
    filter: "saturate(.75)",
  },
  {
    id: "seedance-two",
    title: "The open road",
    asset: "desert",
    mediaType: "video",
    model: "Seedance 2.0",
    categories: ["video"],
    description: "Follow a moment somewhere new.",
    tag: "Adventure",
    filter: "sepia(.15)",
  },
  {
    id: "kling-four",
    title: "A closer feeling",
    asset: "portrait",
    mediaType: "video",
    model: "Kling 4.0",
    categories: ["video", "portraits"],
    description: "An intimate cinematic point of view.",
    tag: "Cinema",
    filter: "saturate(.8)",
  },
];

const imageCollection: readonly TemplateItem[] = [
  {
    id: "image-ghibli-portrait",
    title: "A storybook version of you",
    asset: "templateGhibli",
    referenceAssets: ["portrait"],
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image", "portraits"],
    description: "Turn your portrait into a hand-painted fantasy film still.",
    tag: "Portrait remix",
    prompt: "Use the uploaded photo as the identity reference and create a Ghibli-inspired, hand-painted Japanese fantasy animation portrait of the same person. Preserve their recognizable facial features, age, skin tone, hairstyle, and natural expression; do not copy the original photo's background. Show them from the waist up, slightly turned toward the viewer on a winding mossy forest path, wearing simple outdoors clothing and a small travel backpack. Surround them with oversized emerald leaves, tiny wildflowers, soft waterfalls, and a few small glowing forest spirits. Layered watercolor textures, delicate expressive ink outlines, warm cel-painted sunlight filtering through the canopy, subtle paper grain, rich greens and golden highlights, gentle wonder and storybook warmth. Clear subject separation, natural hands, polished cinematic composition. No text, logos, borders, extra people, or distorted features.",
  },
  {
    id: "image-ghibli-friends",
    title: "You two, in a storybook world",
    asset: "templateGhibliDuo",
    referenceAssets: ["portrait", "templateManRef"],
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image", "portraits"],
    description: "Combine two portraits in one hand-painted fantasy scene.",
    tag: "Two photo remix",
    prompt: "Use reference image 1 for the first person's identity and reference image 2 for the second person's identity. Create one cohesive Ghibli-inspired, hand-painted Japanese fantasy animation scene with both people together as close friends on a mossy forest path. Preserve each person's recognizable face, age, skin tone, hair, and distinguishing features; do not merge their faces or duplicate either person. Show both from the waist up, standing side by side and smiling naturally toward the viewer, in simple travel clothes with small backpacks. Surround them with oversized emerald leaves, tiny wildflowers, a delicate waterfall, and a few small glowing forest spirits. Layered watercolor paint, expressive clean ink outlines, warm cel-painted sunlight through the canopy, subtle paper grain, rich greens and golden highlights, cinematic storybook composition. Keep both faces unobstructed, anatomically natural, and equally clear. No text, logos, borders, or extra people.",
  },
  {
    id: "image-ghibli-sky-journey",
    title: "Your sky-island adventure",
    asset: "templateGhibliSky",
    referenceAssets: ["templateWomanRef"],
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image", "portraits"],
    description: "Turn your portrait into a windswept fantasy adventure.",
    tag: "Fantasy adventure",
    prompt: "Use the uploaded photo as the identity reference and depict the same person as the hero of a Ghibli-inspired, hand-painted Japanese fantasy animation adventure. Preserve their recognizable face, age, skin tone, hairstyle, and expression. Show them in a small wooden glider above a vast turquoise sea, looking back toward the viewer as their scarf and hair catch the wind. Below them, place a lush green floating island with waterfalls spilling into the clouds, a tiny old stone village, and distant birds. Wide cinematic composition, clear readable face and glider, layered watercolor skies, delicate expressive ink lines, soft cel-painted cloud shadows, bright late-afternoon sun, gentle film grain, joyful feeling of discovery. No text, logos, borders, extra characters, or distorted anatomy.",
  },
  {
    id: "image-jaipur-portrait",
    title: "Your Jaipur travel portrait",
    asset: "templateJaipur",
    referenceAssets: ["templateManRef"],
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image", "portraits"],
    description: "Put yourself in a realistic travel portrait at Jaipur’s Hawa Mahal.",
    tag: "Travel portrait",
    prompt: "Use the uploaded photo as the identity reference. Create a natural, photorealistic travel portrait of the same person standing in front of Hawa Mahal in Jaipur, India. Preserve their recognizable face, age, skin tone, hair, and build; do not copy the original background. Frame the person from mid-thigh up in the right foreground, relaxed and looking slightly toward the camera, wearing light, understated travel clothes and a dark crossbody bag. Show Hawa Mahal large and unmistakable across the left and center background, with its pink sandstone façade, rows of small jharokha windows, and corner towers clearly visible. Blue-hour sky with a soft lavender-pink horizon; warm architectural lights glow against the fading daylight. Eye-level phone-camera travel-photo composition, realistic skin and fabric, gentle depth of field while keeping the landmark sharp, candid yet polished vacation-photo color. No poster treatment, illustration, text, watermark, frame, extra fingers, or extra people in the foreground.",
  },
  {
    id: "image-skincare-campaign",
    title: "The clean-beauty hero shot",
    asset: "templateProductHero",
    referenceAssets: ["templateProductRef"],
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image"],
    description: "Turn a product photo into a polished skincare campaign image.",
    tag: "Product campaign",
    prompt: "Use the uploaded product photo as the exact product reference. Preserve its silhouette, proportions, cap, material, colors, label placement, and any existing brand marks; do not invent, alter, or misspell packaging text. Create a premium clean-beauty campaign photograph with the product upright, large, and centered on a pale travertine pedestal surrounded by a softly rippling water surface. Use a restrained sage-green and warm-ivory palette, one subtle olive branch, and a few small water droplets as supporting details. Soft morning sunlight enters from the upper left, creating refined natural shadows, realistic glass reflections, and a luminous studio background. Keep the full product sharply focused and legible with generous uncluttered negative space. High-end skincare editorial photography, polished e-commerce quality, vertical 4:5 composition. No extra products, hands, promotional copy, badges, watermark, or decorative clutter.",
  },
  {
    id: "image-soft-glam",
    title: "Soft-glam makeup",
    asset: "templateMakeupSoftglam",
    referenceAssets: ["templateMakeupBlackRef"],
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image", "portraits"],
    description: "Try a polished bronze-and-rose makeup look on your portrait.",
    tag: "Makeup transformation",
    prompt: "Use the uploaded portrait as the identity reference. Preserve the same adult woman's recognizable facial features, face shape, age, deep-brown skin, and natural proportions; change only her makeup, lighting, and background. Apply polished modern soft glam designed for deep skin: softly sculpted brows, luminous bronze-gold eyeshadow, fine lifted eyeliner, defined lashes, warm terracotta-rose blush, subtle golden cheekbone highlight, and rich berry-rose glossy lipstick. Keep natural skin texture visible and blend makeup professionally without airbrushing or exaggerated reshaping. Preserve her long braids and keep them neatly swept back from her face. Tight head-and-shoulders beauty portrait looking into camera, warm beige studio, diffused beauty-dish light with gentle catchlights, refined luxury-cosmetics editorial photography, sharp detail on eyes and lips. No text, logos, watermark, extra people, face reshaping, or heavy filters.",
  },
  {
    id: "image-satin-neckline",
    title: "Satin neckline",
    asset: "templateChestupEditorial",
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image", "portraits"],
    description: "A chest-up rooftop portrait with the outfit in focus, from text alone.",
    tag: "Fashion close-up",
    prompt: "Create a photorealistic chest-up fashion-editorial portrait of a fictional adult Black woman, age 29, with deep warm-brown skin, a short natural curly bob, dark eyes, and a confident relaxed expression. She wears an elegant fully opaque emerald satin evening dress with a tasteful deep V neckline and naturally visible cleavage, plus refined gold earrings. Crop from just below the bust to slightly above the head, keeping both face and neckline fully visible; give the satin neckline and upper-torso styling strong visual emphasis while keeping her eyes sharp and expressive. Place her on a modern rooftop at golden hour with a softly blurred city skyline and warm rim light on her curls. Realistic skin and satin, premium fashion-magazine photography, rich emerald and amber tones. Sensual but tasteful, fully clothed. No text, logos, watermark, nudity, lingerie, or extra people.",
  },
  {
    id: "image-plus-size-editorial",
    title: "Main-character energy",
    asset: "templatePlusSize",
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image", "portraits"],
    description: "A confident, body-positive golden-hour fashion portrait.",
    tag: "Fashion portrait",
    prompt: "Create a photorealistic premium fashion-editorial portrait of a fictional clearly adult plus-size East Asian woman in her early 30s, with light warm skin, a distinctive short straight black bob with blunt bangs, expressive dark eyes, and a poised friendly expression. Show her waist-up on a rooftop garden at golden hour, looking directly at camera. Dress her in a fully opaque cobalt-blue satin wrap blouse with a tasteful neckline and small silver earrings. Celebrate her natural plus-size body and proportions without slimming, reshaping, or hiding her figure; keep her stance relaxed and confident. Include a softly blurred city skyline, a few leafy rooftop plants, gentle sun flare, realistic skin texture, and believable satin folds. Crisp facial detail, flattering but authentic premium magazine photography, modern cobalt and warm-gold palette. No text, logos, watermark, nudity, lingerie, or extra people.",
  },
  {
    id: "image-ghibli-saree",
    title: "A saree in a storybook world",
    asset: "templateGhibliSaree",
    referenceAssets: ["templateWomanRef"],
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image", "portraits"],
    description: "Reimagine your portrait in a hand-painted fantasy and silk saree.",
    tag: "Fantasy portrait",
    prompt: "Use the uploaded portrait as the identity reference. Preserve the same clearly adult woman's recognizable facial features, age, skin tone, and natural proportions, while changing her clothing and setting. Depict her as the heroine of a hand-painted Japanese fantasy animation, wearing a graceful indigo silk saree with a vermilion blouse and fine antique-gold border, draped respectfully and accurately; add small gold earrings and jasmine flowers woven into her dark hair. Show her waist-up beside a clear forest stream, with a tiny footbridge, lush moss, delicate wildflowers, and a few softly glowing fireflies. Keep her face unobstructed and expressive, looking gently toward the viewer. Layered watercolor foliage, delicate expressive ink lines, soft cel-painted dappled sunlight, subtle paper texture, rich emerald, indigo, vermilion, and warm gold. Whimsical, serene, cinematic storybook illustration. No text, logos, watermark, extra people, distorted hands, or changes to her identity.",
  },
  {
    id: "image-collectible-figure",
    title: "Your collectible figure",
    asset: "templateCollectibleFigure",
    referenceAssets: ["templateManRef"],
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image", "portraits"],
    description: "Turn a portrait into a boxed mini figure with personal accessories.",
    tag: "Personalized collectible",
    prompt: "Use the uploaded portrait as the identity reference for a personalized collectible figure. Preserve the adult person's recognizable face, skin tone, hairstyle, glasses if present, and defining features, translating them into a polished high-quality 3D miniature with a friendly expression; do not make a different person. Show one full-body figure standing upright inside a clear-front collector box, wearing a smart casual outfit inspired by the reference photo. Arrange three miniature accessories in separate molded compartments that feel personal and useful, such as a camera, headphones, book, or coffee cup. Design premium matte packaging in forest green, warm ivory, and restrained metallic accents, with a blank clean nameplate and no readable text. Center the entire package against a softly lit neutral studio background. Realistic molded plastic reflections, precise accessory compartments, collectible-toy craftsmanship, crisp product photography. No extra figures, brands, logos, watermark, misspelled lettering, or cropped package edges.",
  },
  {
    id: "image-swimwear-campaign",
    title: "The resort swimwear campaign",
    asset: "templateSwimwearCampaign",
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image", "portraits", "marketing"],
    description: "A polished resort campaign that puts the swimsuit design first.",
    tag: "Swimwear editorial",
    prompt: "Create a photorealistic luxury swimwear campaign featuring one fictional clearly adult woman, age 28, with warm olive skin, long dark wavy hair, and a poised confident expression. Frame her from mid-thigh to slightly above the head so her face and the full swimsuit are clearly visible. She wears a tasteful fully lined, opaque deep-cobalt two-piece bikini with an elegant high-waisted bottom and supportive simple top. Make the swimsuit design the focus: show its precise cut, rich color, clean seams, supportive fit, and realistic fabric texture. Pose her naturally beside a modern Mediterranean pool, arms relaxed at her sides, with no sexualized posing. Use sunlit pale stone, turquoise water, and softly blurred greenery as a refined resort backdrop. Crisp natural daylight, realistic skin and textile detail, premium swimwear-brand photography, clean cobalt-and-aqua palette. Clearly adult model. No text, logos, watermark, nudity, transparency, lingerie styling, wardrobe malfunction, or extra people.",
  },
  {
    id: "image-gta-vice-city",
    title: "GTA VI: Vice City cover",
    asset: "templateGtaViceCity",
    referenceAssets: ["templateWomanRef"],
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image", "portraits"],
    description: "Turn your portrait into a neon Vice City game-cover fan poster.",
    tag: "Game poster",
    prompt: "Use the uploaded portrait as the identity reference for the clearly adult woman protagonist. Preserve her recognizable face, hair, skin tone, and identity. Create an original fan-made GTA VI-inspired Vice City cover illustration, not official game art. Avoid a close-up or collage layout: show her small-to-medium in scale on the far right, in three-quarter rear view looking over her shoulder so a little of her profile is visible. Let the sweeping neon South Florida scene dominate: a wet boulevard curves from foreground into the distance, an open-top lowrider is seen from behind at lower left, and Art Deco hotels, palms, a turquoise bay, and a pink-orange dusk sky fill the setting. Add only a distant helicopter silhouette. Use hot coral, cyan, magenta, and sunset gold, with cinematic painted lighting, crisp architectural silhouettes, textured brushwork, and a strong diagonal road leading the eye through the scene. Across the upper sky, add only the exact title “VICE CITY” in clean condensed white capitals with a coral shadow. Preserve clear negative space around the title and keep the protagonist visibly distinct from the background. No official game logos or characters, other readable copy, watermark, or extra foreground people.",
  },
  {
    id: "image-loud-drop-poster",
    title: "The loud drop poster",
    asset: "templateLoudDrop",
    referenceAssets: ["templateManRef"],
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image", "portraits", "marketing"],
    description: "Make a bold streetwear launch poster from your portrait.",
    tag: "Streetwear campaign",
    prompt: "Use the uploaded portrait as the identity reference for one clearly adult male streetwear model. Preserve his recognizable face, skin tone, and hair. Create a vertical 4:5 independent streetwear poster with an asymmetrical layout, not a centered headshot. Show the model full-body on the LEFT third, in three-quarter profile looking toward the right as he walks up a concrete skate ramp. Style him in a cobalt oversized hoodie, loose charcoal cargo trousers, and cream sneakers. Reserve the RIGHT half for typography: huge stacked yellow “DROP 04” letters, the exact condensed headline “BECAUSE WE’RE YOUNG & LOUD” above, and a torn-paper yellow star reading “NEW DROP” below. Use deep cobalt-blue screen-printed paper, rough halftone dots, photocopy grain, and taped corners; add one small red lollipop sticker beside the title. Keep the model full-length and separate from the text. Youth streetwear campaign art direction, vivid yellow-blue contrast, crisp readable type, tactile print texture. No real brand names, logos, extra people, watermark, or additional text.",
  },
  {
    id: "image-octopus-portrait",
    title: "The deep-sea encounter",
    asset: "templateOctopusPortrait",
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image", "portraits"],
    description: "An overhead underwater encounter with an octopus in full radial view.",
    tag: "Underwater surreal",
    prompt: "Create a photorealistic vertical underwater scene from a strict bird's-eye view, looking straight down through clear deep teal water. Show a lone fictional adult scuba diver from behind, small in the composition, floating horizontally above a pale sandy seabed; the diver's face is not visible. A huge orange-brown octopus spreads around the diver in a graceful radial pattern, its eight detailed tentacles curling outward in an organic spiral without gripping or harming the person. Make the tentacle geometry and scale the main subject, with the diver as a small human anchor for scale. Sunbeams enter from the upper left, surface ripples create moving highlights, a few fine bubbles rise, and the seabed fades to navy at the corners. Cinematic underwater documentary photography, realistic marine textures, strong burnt-orange versus teal contrast, serene and surreal rather than frightening. No close-up face, side profile, text, logos, watermark, blood, injury, or extra people.",
  },
  {
    id: "image-ceramics-campaign",
    title: "Playful ceramics campaign",
    asset: "templateCeramicsCampaign",
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image", "marketing"],
    description: "Style a handmade homeware collection as a polished product campaign.",
    tag: "Product campaign",
    prompt: "Create a premium vertical 4:5 direct-overhead flat-lay photograph for a boutique handmade ceramics collection. The camera looks straight down at a pale blush-pink tabletop with exactly four tactile glazed pieces in an asymmetrical diagonal arrangement and clear space between them: a tomato-red sculpted cup at upper left, a sunshine-yellow sun-face espresso cup at upper right, a shallow cream serving bowl with a cobalt-blue hand-painted floral rim across the lower center, and a pale lavender shell-shaped dish near the lower right. Do not overlap the objects or make them float; each casts a soft realistic shadow on the tabletop. Include only one folded natural linen napkin partly entering from the top edge. Show handmade glaze variation, tiny wheel-thrown irregularities, glossy highlights, and fine brushwork. Soft diffused studio light, editorial independent-homeware photography, playful yet premium. Strict overhead view with no horizon, typography, prices, logos, watermark, hands, or extra products.",
  },
  {
    id: "image-cheese-pull-editorial",
    title: "Flash & cheese pull",
    asset: "templateCheesePullEditorial",
    referenceAssets: ["templateWomanRef"],
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image", "portraits", "marketing"],
    description: "Turn your portrait into a playful, high-fashion snack campaign.",
    tag: "Food editorial",
    prompt: "Use the uploaded portrait as the identity reference for one clearly adult woman. Preserve her recognizable facial features, age, skin tone, and hair while creating a playful high-fashion food editorial. Crop close from mid-chest to just above her head, with her face large and fully visible in the center-right. She wears glossy black cat-eye sunglasses and small gold hoop earrings, with a relaxed mischievous expression as she bites into a crisp triangular slice of cheese pizza. Her hands hold the slice naturally in the foreground; pull several long glossy strands of melted mozzarella from the slice to her mouth so the cheese is the unmistakable visual hook. Give her neat deep-forest-green nail polish. Use a seamless saturated emerald-green studio background. Direct on-camera flash creates crisp highlights on the glasses, lips, fingers, and melted cheese, with hard-edged shadows behind her; add subtle candid 35mm point-and-shoot grain. Balance polished luxury-fashion art direction with spontaneous late-night snack energy. Realistic skin, natural hands, appetizing golden crust and stretchy cheese, sharp eyes and food. Vertical 4:5 composition. No text, logos, watermark, extra people, extra fingers, or messy food around the mouth.",
  },
  {
    id: "image-pet-royal-portrait",
    title: "A royal portrait of your pet",
    asset: "templatePetRoyal",
    referenceAssets: ["templateCatReference"],
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image", "portraits"],
    description: "Give your pet the old-master portrait treatment, preserving its likeness.",
    tag: "Pet portrait",
    prompt: "Use the uploaded pet photo as the identity reference. Preserve the same animal's recognizable face, fur pattern, eye color, and expression. Reimagine the pet as the subject of a dignified 17th-century royal oil portrait: chest-up, centered and facing forward, wearing a rich burgundy velvet mantle with a small antique-gold collar, seated against a dark forest-green backdrop with a subtle carved-wood frame edge. Use visible fine brushwork, deep chiaroscuro, warm directional light from the upper left, muted umber shadows, restrained gold accents, realistic whiskers and fur, and an elegant museum-quality composition. Keep the animal clearly recognizable and charming, not humanized. No crown, human hands, text, logos, watermark, or extra animals.",
  },
  {
    id: "image-sneaker-launch",
    title: "The sneaker launch shot",
    asset: "templateSneakerLaunch",
    referenceAssets: ["sneakers"],
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image", "marketing"],
    description: "Turn your shoe photo into a high-energy product campaign.",
    tag: "Product campaign",
    prompt: "Use the uploaded sneaker photo as the exact product reference. Preserve the shoe's silhouette, materials, colors, laces, stitching, sole, proportions, and existing marks; do not redesign it or invent logos. Create a premium action-sports campaign with one sneaker as the unmistakable hero, shown in a low-angle close-up at a diagonal from lower left to upper right, frozen just above a dark wet concrete surface. Add a clean arc of water droplets and a small burst of mist around the sole to imply motion, with a second matching shoe only as a softly blurred shape far in the background. Use a dramatic split-color environment: cool cobalt light from the right and warm tangerine rim light from the left, subtle city-night bokeh, rich dark shadows. Keep the full hero shoe sharp and visible, with realistic mesh, suede, rubber, stitching, and moisture. High-end global sneaker-launch photography, bold but uncluttered, vertical 4:5 composition. No text, prices, badges, extra products, changed product details, watermark, or people.",
  },
  {
    id: "image-tokyo-snowglobe",
    title: "A city in a snow globe",
    asset: "templateTokyoSnowglobe",
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image"],
    description: "Build a tiny winter-night Tokyo inside a glass keepsake.",
    tag: "Miniature world",
    prompt: "Create a premium photorealistic vertical 4:5 macro product image of a clear glass snow globe containing a miniature Tokyo night scene. Inside the sphere, include a compact red-and-white Tokyo Tower, traditional tiled rooftops, a narrow lantern-lit street, delicate pink cherry blossoms dusted with fine snow, and a small glowing full moon. Keep every building and tree fully inside the glass. Place the globe on a dark lacquered circular base against a simple midnight-blue studio surface. Shoot from a slightly low three-quarter angle, centering the sphere with generous deep-blue negative space around it; snow swirls inside the glass only. Cool moonlit highlights on the glass, warm amber windows in the miniature city, realistic reflections and refraction, luxurious collectible-object photography, crisp details, restrained navy, cherry-pink, and warm-gold palette. No hands, people outside the globe, text, labels, logos, watermark, or extra objects.",
  },
  {
    id: "image-basketball-manga",
    title: "The manga slam dunk",
    asset: "templateBasketballManga",
    referenceAssets: ["templateManRef"],
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image", "portraits"],
    description: "Turn a portrait into a high-impact original sports-manga action panel.",
    tag: "Manga action",
    prompt: "Use the uploaded portrait as the identity reference for one clearly adult male basketball player. Preserve his recognizable face, skin tone, and hair, translated into an original manga illustration. Create a dynamic vertical 4:5 Japanese sports-manga splash panel at the instant of a one-handed dunk. Shoot from an extreme low angle beneath the hoop: the player launches diagonally from lower left toward upper right, full body visible, face in three-quarter profile focused on the rim, orange ball raised in his right hand. Let the hoop cut across the upper-right corner while the backboard and arena lights recede dramatically. Use expressive black ink contours, energetic speed lines radiating from the ball, screentone halftone shadows, selective vivid orange on the ball and a small jersey accent, mostly black-white-gray art, and subtle printed-paper grain. Reduce the crowd to abstract silhouettes. High-impact original sports-manga illustration with clear anatomy and readable action. No existing manga characters, team logos, text, watermark, extra limbs, or extra foreground players.",
  },
  {
    id: "image-iceland-highlands",
    title: "Where the river begins",
    asset: "templateIcelandHighlands",
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image"],
    description: "A wide Icelandic highlands landscape at first light, from text alone.",
    tag: "Natural landscape",
    prompt: "Create a photorealistic wide 16:9 landscape photograph of the Icelandic highlands just after sunrise. A winding milky-turquoise glacial river leads from the lower foreground toward distant dark volcanic mountains; vivid moss-covered lava hills, a narrow white waterfall on the far right, and low ribbons of mist define the middle distance. The sky is pale apricot at the horizon, fading into cool blue-gray clouds, with a soft break of warm light touching the river and moss. No buildings, roads, people, vehicles, or human structures. Compose with a strong foreground-to-distance leading line, broad open sky in the upper third, natural scale, and believable geology. Premium travel-editorial photography, crisp natural textures, subtle atmospheric haze, balanced moss-green, slate, turquoise, and sunrise tones. Cinematic but realistic, no fantasy glow. No text, logos, watermark, or borders.",
  },
  {
    id: "image-quiet-park",
    title: "Under the old trees",
    asset: "templateQuietPark",
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image"],
    description: "A solitary figure beneath a deep canopy in a quiet park landscape.",
    tag: "Fine-art landscape",
    aspectRatio: 9 / 16,
    prompt: "Ultra-realistic surreal fine-art film photograph of a quiet park landscape under massive old trees, deep shadowed tree trunks in the foreground, a wide green lawn stretching into the distance, one solitary person sitting quietly on a wooden bench beneath the tree canopy, facing an open field and distant soft hills, moody natural daylight, cinematic solitude, calm contemplative atmosphere, dreamy but physically believable, realistic tree bark texture, realistic grass detail, realistic bench silhouette, soft atmospheric depth, muted green and charcoal color palette, subtle analog 35mm film grain, gentle halation in distant highlights, balanced exposure, preserved shadow detail under the trees, premium photographer aesthetic, full-frame camera look, 50mm lens, f/2.8, ISO 200, vertical composition, 9:16, 4K, photorealistic, no extra people, no animals, no vehicles, no buildings dominating the scene, no text, no watermark, no UI icons, no overlay buttons, no illustration, no anime look, no CGI, no fake glow, no excessive HDR, no oversaturated greens, no distorted trees, no warped bench",
  },
  {
    id: "image-korean-mini-super",
    title: "Mini Super, Seoul ’96",
    asset: "templateKoreanMiniSuper",
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image", "portraits"],
    description: "A 90s Seoul street portrait outside a neighborhood corner store.",
    tag: "Analog street portrait",
    prompt: "Create a photorealistic nostalgic 1990s 35mm point-and-shoot photograph with the moody urban feeling of a Korean or Hong Kong arthouse film. Center one fictional young adult Asian man with a lean athletic build, standing full length and looking directly at camera with a calm, stoic expression. He holds a simple ice cream popsicle near his mouth with one hand; his other hand rests casually in his pocket. Dress him in a crisp white ribbed tank top tucked into dark blue straight-leg jeans, a thin brown leather belt, and light cream canvas sneakers. Place him outside a cluttered, authentic South Korean mom-and-pop mini market. Above the entrance, show a prominent blue rectangular signboard with the exact white Korean text “강동미니수퍼”. Add a weathered teal-green awning, black plastic crates stacked on small red and gray plastic stools, and a glass-topped freezer with everyday grocery goods visible inside the dim shop. The ground is dark worn asphalt with a circular metal manhole cover in the foreground. Soft, flat overcast daylight; slightly desaturated cool teal-and-blue color; heavy visible 35mm grain, high-noise floor, and gentle low-fidelity compact-camera softness. Keep the man, storefront, sign, and street details naturally balanced in a vertical 4:5 frame. No extra people, extra signage, logos, watermark, or polished studio lighting.",
  },
  {
    id: "image-tech-couture-elevator",
    title: "Liquid chrome elevator",
    asset: "templateTechCouture",
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["image", "portraits"],
    description: "A 2040s couture editorial in a mirror-walled elevator, all electric pink and chrome.",
    tag: "Future fashion",
    prompt: "Create a photorealistic 2040s high-fashion editorial in a seamless mirror-walled elevator cube. One adult fashion model stands centered in a medium-wide, eye-level composition, her fingers delicately poised against a narrow chrome seam in the elevator wall. Style her in a sculptural radiant electric-pink couture outfit with polished liquid-chrome panels and accents; the silhouette is avant-garde, elegant, and fully clothed. Build a precise reflective environment from mirrored elevator panels, polished silver trim, white specular highlights, and clean geometric seams. Across the middle of the frame, send luminous horizontal light streaks from left to right along the panels while keeping the model crisp and clearly defined. Use a 32mm lens perspective without distortion. Light with a bright key from camera-right and soft top bounce; emphasize ultra-sleek glossy surfaces, accurate chrome reflections, fine film grain, and a restrained optical flare. Premium futuristic fashion-magazine art direction, vivid electric pink against silver and white. Vertical 4:5 composition. No visible text, logos, watermark, extra people, clutter, or warped reflections.",
  },
];

const seedanceCollection: readonly TemplateItem[] = [
  {
    id: "seed-ocean",
    title: "Ocean reverie",
    asset: "ocean",
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["video"],
    description: "An escape with a point of view.",
    tag: "Travel",
  },
  {
    id: "seed-desert",
    title: "The scenic route",
    asset: "desert",
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["video"],
    description: "Make a moment feel like a movie.",
    tag: "Cinema",
  },
  {
    id: "seed-portrait",
    title: "Afterglow",
    asset: "portrait",
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["video", "portraits"],
    description: "A little movement. A new mood.",
    tag: "Portrait",
  },
  {
    id: "seed-product",
    title: "The slow reveal",
    asset: "product",
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["video", "marketing"],
    description: "Give your product the spotlight.",
    tag: "Product",
  },
  {
    id: "seed-blue",
    title: "Blue hour drift",
    asset: "ocean",
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["video"],
    description: "A world between waking and dreaming.",
    tag: "Atmosphere",
    filter: "hue-rotate(20deg) saturate(.8)",
  },
  {
    id: "seed-away",
    title: "A world away",
    asset: "desert",
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["video"],
    description: "Your next opening scene.",
    tag: "Adventure",
    filter: "sepia(.25)",
  },
];

const marketingCollection: readonly TemplateItem[] = [
  {
    id: "market-launch",
    title: "The product launch",
    asset: "product",
    mediaType: "image",
    model: "FLUX",
    categories: ["marketing", "image"],
    description: "A launch-day hero image.",
    tag: "Product ad",
  },
  {
    id: "market-drop",
    title: "The fresh drop",
    asset: "sneakers",
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["marketing", "image"],
    description: "Built for your next collection.",
    tag: "Social",
  },
  {
    id: "market-beauty",
    title: "Beauty in motion",
    asset: "product",
    mediaType: "video",
    model: "Veo",
    categories: ["marketing", "video"],
    description: "A product film with a softer side.",
    tag: "Beauty ad",
  },
  {
    id: "market-bloom",
    title: "A brand in bloom",
    asset: "flowers",
    mediaType: "image",
    model: "GPT Image 2",
    categories: ["marketing", "image"],
    description: "A softer seasonal campaign.",
    tag: "Brand story",
  },
  {
    id: "market-travel",
    title: "Sell the feeling",
    asset: "ocean",
    mediaType: "video",
    model: "Seedance 2.5",
    categories: ["marketing", "video"],
    description: "A little wanderlust goes a long way.",
    tag: "Travel ad",
  },
  {
    id: "market-founder",
    title: "The face of the story",
    asset: "portrait",
    mediaType: "video",
    model: "Kling",
    categories: ["marketing", "video", "portraits"],
    description: "Put a person behind the brand.",
    tag: "Social reel",
  },
];

function variations(items: readonly TemplateItem[], names: readonly string[]): TemplateItem[] {
  return names.map((title, index) => ({
    ...items[index],
    id: `${items[index].id}-alternate`,
    title,
    filter: index % 3 === 0 ? "sepia(.2)" : items[index].filter,
  }));
}

const imageCollectionOpeningOrder = [
  "image-gta-vice-city",
  "image-satin-neckline",
  "image-ceramics-campaign",
  "image-ghibli-portrait",
  "image-cheese-pull-editorial",
  "image-loud-drop-poster",
  "image-octopus-portrait",
  "image-skincare-campaign",
  "image-ghibli-friends",
  "image-swimwear-campaign",
  "image-pet-royal-portrait",
  "image-sneaker-launch",
  "image-tokyo-snowglobe",
  "image-basketball-manga",
  "image-iceland-highlands",
  "image-quiet-park",
  "image-korean-mini-super",
  "image-tech-couture-elevator",
  "image-ghibli-sky-journey",
  "image-soft-glam",
  "image-jaipur-portrait",
];

export const imageTemplates: readonly TemplateItem[] = [...imageCollection].sort((a, b) => {
  const aOrder = imageCollectionOpeningOrder.indexOf(a.id);
  const bOrder = imageCollectionOpeningOrder.indexOf(b.id);
  return (
    (aOrder < 0 ? imageCollectionOpeningOrder.length : aOrder) -
    (bOrder < 0 ? imageCollectionOpeningOrder.length : bOrder)
  );
});

export const seedanceTemplates: readonly TemplateItem[] = [
  ...seedanceCollection,
  ...variations(seedanceCollection, ["Postcard in motion", "The long way home", "A closer look", "Soft focus story"]),
];

export const marketingTemplates: readonly TemplateItem[] = [
  ...marketingCollection,
  ...variations(marketingCollection, ["The signature shot", "Collection launch", "A softer sell", "The seasonal edit"]),
];

export type CreativeTool = {
  id: string;
  name: string;
  description: string;
  label: string;
  headline: readonly [string, string];
  artwork: "collage" | "motion" | "product" | "character";
  tone: "paper" | "forest" | "dark" | "plum" | "peach" | "sage";
  assets: readonly MediaId[];
  href: "#templates" | "#gpt-image-2" | "#marketing" | "/image?model=gpt2_generate" | "/video";
  filters?: TemplateFilters;
};

export const creativeTools = [
  {
    id: "image",
    name: "Image generator",
    description: "A thought, a reference, a whole new visual.",
    label: "Your image studio",
    headline: ["Dream it.", "See it."],
    artwork: "collage",
    tone: "paper",
    assets: ["architecture", "flowers", "product"],
    href: "/image?model=gpt2_generate",
  },
  {
    id: "video",
    name: "Video generator",
    description: "Give your next idea its first frame.",
    label: "The motion edit",
    headline: ["Make it", "move."],
    artwork: "motion",
    tone: "forest",
    assets: ["desert"],
    href: "/video",
  },
  {
    id: "seedance",
    name: "Seedance 2.0",
    description: "Take a still. Tell a different story.",
    label: "Seedance 2.0",
    headline: ["One frame.", "A whole story."],
    artwork: "motion",
    tone: "forest",
    assets: ["ocean"],
    href: "#templates",
    filters: { category: "video", model: "Seedance 2.0" },
  },
  {
    id: "kling",
    name: "Kling 4.0",
    description: "Start directing your next cinematic idea.",
    label: "Kling 4.0",
    headline: ["Direct the", "unexpected."],
    artwork: "motion",
    tone: "dark",
    assets: ["portrait"],
    href: "#templates",
    filters: { category: "video", model: "Kling 4.0" },
  },
  {
    id: "marketing",
    name: "Marketing Studio",
    description: "From product photo to campaign direction.",
    label: "Marketing Studio",
    headline: ["From product", "to obsession."],
    artwork: "product",
    tone: "plum",
    assets: ["product"],
    href: "#marketing",
  },
  {
    id: "character",
    name: "Character lab",
    description: "Same person. A whole new point of view.",
    label: "The character edit",
    headline: ["Meet your", "next self."],
    artwork: "character",
    tone: "peach",
    assets: ["portrait", "portrait"],
    href: "#templates",
    filters: { category: "portraits", model: "all" },
  },
  {
    id: "gpt",
    name: "GPT Image 2",
    description: "Find a look that could only be yours.",
    label: "GPT Image 2",
    headline: ["Every pixel.", "Your vision."],
    artwork: "collage",
    tone: "sage",
    assets: ["sneakers", "architecture", "flowers"],
    href: "/image?model=gpt2_generate",
  },
] as const satisfies readonly CreativeTool[];
