import type { TemplateItem } from "@/types/landing";

/**
 * GPT Image 2 templates: shown on the home page and as starting points in the
 * image studio. Opening one loads its prompt (and any reference images) into
 * the studio with GPT Image 2 selected.
 */
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
    prompt:
      "Use the uploaded photo as the identity reference and create a Ghibli-inspired, hand-painted Japanese fantasy animation portrait of the same person. Preserve their recognizable facial features, age, skin tone, hairstyle, and natural expression; do not copy the original photo's background. Show them from the waist up, slightly turned toward the viewer on a winding mossy forest path, wearing simple outdoors clothing and a small travel backpack. Surround them with oversized emerald leaves, tiny wildflowers, soft waterfalls, and a few small glowing forest spirits. Layered watercolor textures, delicate expressive ink outlines, warm cel-painted sunlight filtering through the canopy, subtle paper grain, rich greens and golden highlights, gentle wonder and storybook warmth. Clear subject separation, natural hands, polished cinematic composition. No text, logos, borders, extra people, or distorted features.",
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
    prompt:
      "Use reference image 1 for the first person's identity and reference image 2 for the second person's identity. Create one cohesive Ghibli-inspired, hand-painted Japanese fantasy animation scene with both people together as close friends on a mossy forest path. Preserve each person's recognizable face, age, skin tone, hair, and distinguishing features; do not merge their faces or duplicate either person. Show both from the waist up, standing side by side and smiling naturally toward the viewer, in simple travel clothes with small backpacks. Surround them with oversized emerald leaves, tiny wildflowers, a delicate waterfall, and a few small glowing forest spirits. Layered watercolor paint, expressive clean ink outlines, warm cel-painted sunlight through the canopy, subtle paper grain, rich greens and golden highlights, cinematic storybook composition. Keep both faces unobstructed, anatomically natural, and equally clear. No text, logos, borders, or extra people.",
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
    prompt:
      "Use the uploaded photo as the identity reference and depict the same person as the hero of a Ghibli-inspired, hand-painted Japanese fantasy animation adventure. Preserve their recognizable face, age, skin tone, hairstyle, and expression. Show them in a small wooden glider above a vast turquoise sea, looking back toward the viewer as their scarf and hair catch the wind. Below them, place a lush green floating island with waterfalls spilling into the clouds, a tiny old stone village, and distant birds. Wide cinematic composition, clear readable face and glider, layered watercolor skies, delicate expressive ink lines, soft cel-painted cloud shadows, bright late-afternoon sun, gentle film grain, joyful feeling of discovery. No text, logos, borders, extra characters, or distorted anatomy.",
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
    prompt:
      "Use the uploaded photo as the identity reference. Create a natural, photorealistic travel portrait of the same person standing in front of Hawa Mahal in Jaipur, India. Preserve their recognizable face, age, skin tone, hair, and build; do not copy the original background. Frame the person from mid-thigh up in the right foreground, relaxed and looking slightly toward the camera, wearing light, understated travel clothes and a dark crossbody bag. Show Hawa Mahal large and unmistakable across the left and center background, with its pink sandstone façade, rows of small jharokha windows, and corner towers clearly visible. Blue-hour sky with a soft lavender-pink horizon; warm architectural lights glow against the fading daylight. Eye-level phone-camera travel-photo composition, realistic skin and fabric, gentle depth of field while keeping the landmark sharp, candid yet polished vacation-photo color. No poster treatment, illustration, text, watermark, frame, extra fingers, or extra people in the foreground.",
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
    prompt:
      "Use the uploaded product photo as the exact product reference. Preserve its silhouette, proportions, cap, material, colors, label placement, and any existing brand marks; do not invent, alter, or misspell packaging text. Create a premium clean-beauty campaign photograph with the product upright, large, and centered on a pale travertine pedestal surrounded by a softly rippling water surface. Use a restrained sage-green and warm-ivory palette, one subtle olive branch, and a few small water droplets as supporting details. Soft morning sunlight enters from the upper left, creating refined natural shadows, realistic glass reflections, and a luminous studio background. Keep the full product sharply focused and legible with generous uncluttered negative space. High-end skincare editorial photography, polished e-commerce quality, vertical 4:5 composition. No extra products, hands, promotional copy, badges, watermark, or decorative clutter.",
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
    prompt:
      "Use the uploaded portrait as the identity reference. Preserve the same adult woman's recognizable facial features, face shape, age, deep-brown skin, and natural proportions; change only her makeup, lighting, and background. Apply polished modern soft glam designed for deep skin: softly sculpted brows, luminous bronze-gold eyeshadow, fine lifted eyeliner, defined lashes, warm terracotta-rose blush, subtle golden cheekbone highlight, and rich berry-rose glossy lipstick. Keep natural skin texture visible and blend makeup professionally without airbrushing or exaggerated reshaping. Preserve her long braids and keep them neatly swept back from her face. Tight head-and-shoulders beauty portrait looking into camera, warm beige studio, diffused beauty-dish light with gentle catchlights, refined luxury-cosmetics editorial photography, sharp detail on eyes and lips. No text, logos, watermark, extra people, face reshaping, or heavy filters.",
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
    prompt:
      "Create a photorealistic chest-up fashion-editorial portrait of a fictional adult Black woman, age 29, with deep warm-brown skin, a short natural curly bob, dark eyes, and a confident relaxed expression. She wears an elegant fully opaque emerald satin evening dress with a tasteful deep V neckline and naturally visible cleavage, plus refined gold earrings. Crop from just below the bust to slightly above the head, keeping both face and neckline fully visible; give the satin neckline and upper-torso styling strong visual emphasis while keeping her eyes sharp and expressive. Place her on a modern rooftop at golden hour with a softly blurred city skyline and warm rim light on her curls. Realistic skin and satin, premium fashion-magazine photography, rich emerald and amber tones. Sensual but tasteful, fully clothed. No text, logos, watermark, nudity, lingerie, or extra people.",
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
    prompt:
      "Create a photorealistic premium fashion-editorial portrait of a fictional clearly adult plus-size East Asian woman in her early 30s, with light warm skin, a distinctive short straight black bob with blunt bangs, expressive dark eyes, and a poised friendly expression. Show her waist-up on a rooftop garden at golden hour, looking directly at camera. Dress her in a fully opaque cobalt-blue satin wrap blouse with a tasteful neckline and small silver earrings. Celebrate her natural plus-size body and proportions without slimming, reshaping, or hiding her figure; keep her stance relaxed and confident. Include a softly blurred city skyline, a few leafy rooftop plants, gentle sun flare, realistic skin texture, and believable satin folds. Crisp facial detail, flattering but authentic premium magazine photography, modern cobalt and warm-gold palette. No text, logos, watermark, nudity, lingerie, or extra people.",
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
    prompt:
      "Use the uploaded portrait as the identity reference. Preserve the same clearly adult woman's recognizable facial features, age, skin tone, and natural proportions, while changing her clothing and setting. Depict her as the heroine of a hand-painted Japanese fantasy animation, wearing a graceful indigo silk saree with a vermilion blouse and fine antique-gold border, draped respectfully and accurately; add small gold earrings and jasmine flowers woven into her dark hair. Show her waist-up beside a clear forest stream, with a tiny footbridge, lush moss, delicate wildflowers, and a few softly glowing fireflies. Keep her face unobstructed and expressive, looking gently toward the viewer. Layered watercolor foliage, delicate expressive ink lines, soft cel-painted dappled sunlight, subtle paper texture, rich emerald, indigo, vermilion, and warm gold. Whimsical, serene, cinematic storybook illustration. No text, logos, watermark, extra people, distorted hands, or changes to her identity.",
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
    prompt:
      "Use the uploaded portrait as the identity reference for a personalized collectible figure. Preserve the adult person's recognizable face, skin tone, hairstyle, glasses if present, and defining features, translating them into a polished high-quality 3D miniature with a friendly expression; do not make a different person. Show one full-body figure standing upright inside a clear-front collector box, wearing a smart casual outfit inspired by the reference photo. Arrange three miniature accessories in separate molded compartments that feel personal and useful, such as a camera, headphones, book, or coffee cup. Design premium matte packaging in forest green, warm ivory, and restrained metallic accents, with a blank clean nameplate and no readable text. Center the entire package against a softly lit neutral studio background. Realistic molded plastic reflections, precise accessory compartments, collectible-toy craftsmanship, crisp product photography. No extra figures, brands, logos, watermark, misspelled lettering, or cropped package edges.",
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
    prompt:
      "Create a photorealistic luxury swimwear campaign featuring one fictional clearly adult woman, age 28, with warm olive skin, long dark wavy hair, and a poised confident expression. Frame her from mid-thigh to slightly above the head so her face and the full swimsuit are clearly visible. She wears a tasteful fully lined, opaque deep-cobalt two-piece bikini with an elegant high-waisted bottom and supportive simple top. Make the swimsuit design the focus: show its precise cut, rich color, clean seams, supportive fit, and realistic fabric texture. Pose her naturally beside a modern Mediterranean pool, arms relaxed at her sides, with no sexualized posing. Use sunlit pale stone, turquoise water, and softly blurred greenery as a refined resort backdrop. Crisp natural daylight, realistic skin and textile detail, premium swimwear-brand photography, clean cobalt-and-aqua palette. Clearly adult model. No text, logos, watermark, nudity, transparency, lingerie styling, wardrobe malfunction, or extra people.",
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
    prompt:
      "Use the uploaded portrait as the identity reference for the clearly adult woman protagonist. Preserve her recognizable face, hair, skin tone, and identity. Create an original fan-made GTA VI-inspired Vice City cover illustration, not official game art. Avoid a close-up or collage layout: show her small-to-medium in scale on the far right, in three-quarter rear view looking over her shoulder so a little of her profile is visible. Let the sweeping neon South Florida scene dominate: a wet boulevard curves from foreground into the distance, an open-top lowrider is seen from behind at lower left, and Art Deco hotels, palms, a turquoise bay, and a pink-orange dusk sky fill the setting. Add only a distant helicopter silhouette. Use hot coral, cyan, magenta, and sunset gold, with cinematic painted lighting, crisp architectural silhouettes, textured brushwork, and a strong diagonal road leading the eye through the scene. Across the upper sky, add only the exact title “VICE CITY” in clean condensed white capitals with a coral shadow. Preserve clear negative space around the title and keep the protagonist visibly distinct from the background. No official game logos or characters, other readable copy, watermark, or extra foreground people.",
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
    prompt:
      "Use the uploaded portrait as the identity reference for one clearly adult male streetwear model. Preserve his recognizable face, skin tone, and hair. Create a vertical 4:5 independent streetwear poster with an asymmetrical layout, not a centered headshot. Show the model full-body on the LEFT third, in three-quarter profile looking toward the right as he walks up a concrete skate ramp. Style him in a cobalt oversized hoodie, loose charcoal cargo trousers, and cream sneakers. Reserve the RIGHT half for typography: huge stacked yellow “DROP 04” letters, the exact condensed headline “BECAUSE WE’RE YOUNG & LOUD” above, and a torn-paper yellow star reading “NEW DROP” below. Use deep cobalt-blue screen-printed paper, rough halftone dots, photocopy grain, and taped corners; add one small red lollipop sticker beside the title. Keep the model full-length and separate from the text. Youth streetwear campaign art direction, vivid yellow-blue contrast, crisp readable type, tactile print texture. No real brand names, logos, extra people, watermark, or additional text.",
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
    prompt:
      "Create a photorealistic vertical underwater scene from a strict bird's-eye view, looking straight down through clear deep teal water. Show a lone fictional adult scuba diver from behind, small in the composition, floating horizontally above a pale sandy seabed; the diver's face is not visible. A huge orange-brown octopus spreads around the diver in a graceful radial pattern, its eight detailed tentacles curling outward in an organic spiral without gripping or harming the person. Make the tentacle geometry and scale the main subject, with the diver as a small human anchor for scale. Sunbeams enter from the upper left, surface ripples create moving highlights, a few fine bubbles rise, and the seabed fades to navy at the corners. Cinematic underwater documentary photography, realistic marine textures, strong burnt-orange versus teal contrast, serene and surreal rather than frightening. No close-up face, side profile, text, logos, watermark, blood, injury, or extra people.",
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
    prompt:
      "Create a premium vertical 4:5 direct-overhead flat-lay photograph for a boutique handmade ceramics collection. The camera looks straight down at a pale blush-pink tabletop with exactly four tactile glazed pieces in an asymmetrical diagonal arrangement and clear space between them: a tomato-red sculpted cup at upper left, a sunshine-yellow sun-face espresso cup at upper right, a shallow cream serving bowl with a cobalt-blue hand-painted floral rim across the lower center, and a pale lavender shell-shaped dish near the lower right. Do not overlap the objects or make them float; each casts a soft realistic shadow on the tabletop. Include only one folded natural linen napkin partly entering from the top edge. Show handmade glaze variation, tiny wheel-thrown irregularities, glossy highlights, and fine brushwork. Soft diffused studio light, editorial independent-homeware photography, playful yet premium. Strict overhead view with no horizon, typography, prices, logos, watermark, hands, or extra products.",
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
    prompt:
      "Use the uploaded portrait as the identity reference for one clearly adult woman. Preserve her recognizable facial features, age, skin tone, and hair while creating a playful high-fashion food editorial. Crop close from mid-chest to just above her head, with her face large and fully visible in the center-right. She wears glossy black cat-eye sunglasses and small gold hoop earrings, with a relaxed mischievous expression as she bites into a crisp triangular slice of cheese pizza. Her hands hold the slice naturally in the foreground; pull several long glossy strands of melted mozzarella from the slice to her mouth so the cheese is the unmistakable visual hook. Give her neat deep-forest-green nail polish. Use a seamless saturated emerald-green studio background. Direct on-camera flash creates crisp highlights on the glasses, lips, fingers, and melted cheese, with hard-edged shadows behind her; add subtle candid 35mm point-and-shoot grain. Balance polished luxury-fashion art direction with spontaneous late-night snack energy. Realistic skin, natural hands, appetizing golden crust and stretchy cheese, sharp eyes and food. Vertical 4:5 composition. No text, logos, watermark, extra people, extra fingers, or messy food around the mouth.",
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
    prompt:
      "Use the uploaded pet photo as the identity reference. Preserve the same animal's recognizable face, fur pattern, eye color, and expression. Reimagine the pet as the subject of a dignified 17th-century royal oil portrait: chest-up, centered and facing forward, wearing a rich burgundy velvet mantle with a small antique-gold collar, seated against a dark forest-green backdrop with a subtle carved-wood frame edge. Use visible fine brushwork, deep chiaroscuro, warm directional light from the upper left, muted umber shadows, restrained gold accents, realistic whiskers and fur, and an elegant museum-quality composition. Keep the animal clearly recognizable and charming, not humanized. No crown, human hands, text, logos, watermark, or extra animals.",
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
    prompt:
      "Use the uploaded sneaker photo as the exact product reference. Preserve the shoe's silhouette, materials, colors, laces, stitching, sole, proportions, and existing marks; do not redesign it or invent logos. Create a premium action-sports campaign with one sneaker as the unmistakable hero, shown in a low-angle close-up at a diagonal from lower left to upper right, frozen just above a dark wet concrete surface. Add a clean arc of water droplets and a small burst of mist around the sole to imply motion, with a second matching shoe only as a softly blurred shape far in the background. Use a dramatic split-color environment: cool cobalt light from the right and warm tangerine rim light from the left, subtle city-night bokeh, rich dark shadows. Keep the full hero shoe sharp and visible, with realistic mesh, suede, rubber, stitching, and moisture. High-end global sneaker-launch photography, bold but uncluttered, vertical 4:5 composition. No text, prices, badges, extra products, changed product details, watermark, or people.",
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
    prompt:
      "Create a premium photorealistic vertical 4:5 macro product image of a clear glass snow globe containing a miniature Tokyo night scene. Inside the sphere, include a compact red-and-white Tokyo Tower, traditional tiled rooftops, a narrow lantern-lit street, delicate pink cherry blossoms dusted with fine snow, and a small glowing full moon. Keep every building and tree fully inside the glass. Place the globe on a dark lacquered circular base against a simple midnight-blue studio surface. Shoot from a slightly low three-quarter angle, centering the sphere with generous deep-blue negative space around it; snow swirls inside the glass only. Cool moonlit highlights on the glass, warm amber windows in the miniature city, realistic reflections and refraction, luxurious collectible-object photography, crisp details, restrained navy, cherry-pink, and warm-gold palette. No hands, people outside the globe, text, labels, logos, watermark, or extra objects.",
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
    prompt:
      "Use the uploaded portrait as the identity reference for one clearly adult male basketball player. Preserve his recognizable face, skin tone, and hair, translated into an original manga illustration. Create a dynamic vertical 4:5 Japanese sports-manga splash panel at the instant of a one-handed dunk. Shoot from an extreme low angle beneath the hoop: the player launches diagonally from lower left toward upper right, full body visible, face in three-quarter profile focused on the rim, orange ball raised in his right hand. Let the hoop cut across the upper-right corner while the backboard and arena lights recede dramatically. Use expressive black ink contours, energetic speed lines radiating from the ball, screentone halftone shadows, selective vivid orange on the ball and a small jersey accent, mostly black-white-gray art, and subtle printed-paper grain. Reduce the crowd to abstract silhouettes. High-impact original sports-manga illustration with clear anatomy and readable action. No existing manga characters, team logos, text, watermark, extra limbs, or extra foreground players.",
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
    prompt:
      "Create a photorealistic wide 16:9 landscape photograph of the Icelandic highlands just after sunrise. A winding milky-turquoise glacial river leads from the lower foreground toward distant dark volcanic mountains; vivid moss-covered lava hills, a narrow white waterfall on the far right, and low ribbons of mist define the middle distance. The sky is pale apricot at the horizon, fading into cool blue-gray clouds, with a soft break of warm light touching the river and moss. No buildings, roads, people, vehicles, or human structures. Compose with a strong foreground-to-distance leading line, broad open sky in the upper third, natural scale, and believable geology. Premium travel-editorial photography, crisp natural textures, subtle atmospheric haze, balanced moss-green, slate, turquoise, and sunrise tones. Cinematic but realistic, no fantasy glow. No text, logos, watermark, or borders.",
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
    prompt:
      "Ultra-realistic surreal fine-art film photograph of a quiet park landscape under massive old trees, deep shadowed tree trunks in the foreground, a wide green lawn stretching into the distance, one solitary person sitting quietly on a wooden bench beneath the tree canopy, facing an open field and distant soft hills, moody natural daylight, cinematic solitude, calm contemplative atmosphere, dreamy but physically believable, realistic tree bark texture, realistic grass detail, realistic bench silhouette, soft atmospheric depth, muted green and charcoal color palette, subtle analog 35mm film grain, gentle halation in distant highlights, balanced exposure, preserved shadow detail under the trees, premium photographer aesthetic, full-frame camera look, 50mm lens, f/2.8, ISO 200, vertical composition, 9:16, 4K, photorealistic, no extra people, no animals, no vehicles, no buildings dominating the scene, no text, no watermark, no UI icons, no overlay buttons, no illustration, no anime look, no CGI, no fake glow, no excessive HDR, no oversaturated greens, no distorted trees, no warped bench",
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
    prompt:
      "Create a photorealistic nostalgic 1990s 35mm point-and-shoot photograph with the moody urban feeling of a Korean or Hong Kong arthouse film. Center one fictional young adult Asian man with a lean athletic build, standing full length and looking directly at camera with a calm, stoic expression. He holds a simple ice cream popsicle near his mouth with one hand; his other hand rests casually in his pocket. Dress him in a crisp white ribbed tank top tucked into dark blue straight-leg jeans, a thin brown leather belt, and light cream canvas sneakers. Place him outside a cluttered, authentic South Korean mom-and-pop mini market. Above the entrance, show a prominent blue rectangular signboard with the exact white Korean text “강동미니수퍼”. Add a weathered teal-green awning, black plastic crates stacked on small red and gray plastic stools, and a glass-topped freezer with everyday grocery goods visible inside the dim shop. The ground is dark worn asphalt with a circular metal manhole cover in the foreground. Soft, flat overcast daylight; slightly desaturated cool teal-and-blue color; heavy visible 35mm grain, high-noise floor, and gentle low-fidelity compact-camera softness. Keep the man, storefront, sign, and street details naturally balanced in a vertical 4:5 frame. No extra people, extra signage, logos, watermark, or polished studio lighting.",
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
    prompt:
      "Create a photorealistic 2040s high-fashion editorial in a seamless mirror-walled elevator cube. One adult fashion model stands centered in a medium-wide, eye-level composition, her fingers delicately poised against a narrow chrome seam in the elevator wall. Style her in a sculptural radiant electric-pink couture outfit with polished liquid-chrome panels and accents; the silhouette is avant-garde, elegant, and fully clothed. Build a precise reflective environment from mirrored elevator panels, polished silver trim, white specular highlights, and clean geometric seams. Across the middle of the frame, send luminous horizontal light streaks from left to right along the panels while keeping the model crisp and clearly defined. Use a 32mm lens perspective without distortion. Light with a bright key from camera-right and soft top bounce; emphasize ultra-sleek glossy surfaces, accurate chrome reflections, fine film grain, and a restrained optical flare. Premium futuristic fashion-magazine art direction, vivid electric pink against silver and white. Vertical 4:5 composition. No visible text, logos, watermark, extra people, clutter, or warped reflections.",
  },
];

const imageCollectionOpeningOrder = [
  "image-gta-vice-city",
  "image-jaipur-portrait",
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
];

export const imageTemplates: readonly TemplateItem[] = [...imageCollection].sort((a, b) => {
  const aOrder = imageCollectionOpeningOrder.indexOf(a.id);
  const bOrder = imageCollectionOpeningOrder.indexOf(b.id);
  return (
    (aOrder < 0 ? imageCollectionOpeningOrder.length : aOrder) -
    (bOrder < 0 ? imageCollectionOpeningOrder.length : bOrder)
  );
});
