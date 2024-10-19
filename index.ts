type PrefixTing = `${string}ting`;

// Compression function
async function compress(input: Uint8Array): Promise<Uint8Array> {
    const cs = new CompressionStream('gzip' as CompressionFormat);
    const writer = cs.writable.getWriter();
    writer.write(input);
    writer.close();
    return new Response(cs.readable).arrayBuffer().then(buffer => new Uint8Array(buffer));
}

// Decompression function
async function decompress(input: Uint8Array): Promise<Uint8Array> {
    const ds = new DecompressionStream('gzip' as CompressionFormat);
    const writer = ds.writable.getWriter();
    writer.write(input);
    writer.close();
    return new Response(ds.readable).arrayBuffer().then(buffer => new Uint8Array(buffer));
}

async function invalidateImageKey(prefix: string, imageKey: string, env: Env): Promise<void> {
    console.log(`Invalidating image key ${imageKey} for prefix ${prefix}`);

    // Remove the image from IMAGES_KV
    await env.IMAGES_KV.delete(imageKey);

    // Update PREFIX_TO_IMAGES_KV
    const prefixImageKeysJson = await env.PREFIX_TO_IMAGES_KV.get(prefix);
    if (prefixImageKeysJson) {
        let imageKeys = JSON.parse(prefixImageKeysJson) as string[];
        imageKeys = imageKeys.filter(key => key !== imageKey);
        await env.PREFIX_TO_IMAGES_KV.put(prefix, JSON.stringify(imageKeys));
    }
}

function createImagePrompt(action: string, breed?: string, environment?: string, time?: string): string {
    const dogBreed = breed || dogBreeds[Math.floor(Math.random() * dogBreeds.length)];
    const setting = environment || environments[Math.floor(Math.random() * environments.length)];
    const lighting = time || timeOfDay[Math.floor(Math.random() * timeOfDay.length)];

    return `A high-resolution photograph of a ${dogBreed} dog ${action} in a ${setting} during ${lighting}. 
    The image should showcase intricate details such as individual fur strands, reflections in the eyes, 
    and textures of the surrounding environment. The lighting should reflect the time of day, 
    and the composition should be professional, creating a lifelike and immersive scene 
    that captures the essence of the action and the beauty of the setting.`;
}

const dogBreeds = [
    'Labrador', 'German Shepherd', 'Golden Retriever', 'Bulldog', 'Beagle',
    'Poodle', 'Rottweiler', 'Boxer', 'Dachshund', 'Siberian Husky'
];

const environments = [
    'beach', 'forest', 'city park', 'snowy mountain', 'backyard',
    'meadow', 'living room', 'cafe', 'farm', 'autumn forest'
];

const timeOfDay = [
    'sunrise', 'midday', 'sunset', 'night', 'golden hour',
    'blue hour', 'overcast day', 'foggy morning', 'starry night', 'rainy afternoon'
];

const subdomainPrefixes: Set<string> = new Set([
    "adop",
    "bar",
    "bi",
    "boas",
    "cas",
    "chat",
    "coa",
    "da",
    "draf",
    "edi",
    "exis",
    "fit",
    "floa",
    "get",
    "hos",
    "hun",
    "inspec",
    "je",
    "let",
    "lin",
    "mee",
    "nes",
    "net",
    "opera",
    "pain",
    "pan",
    "pat",
    "poin",
    "put",
    "quo",
    "rat",
    "roo",
    "set",
    "sit",
    "spor",
    "star",
    "tes",
    "toas",
    "uni",
    "visi",
    "wai",
    "car",
    "char",
    "chea",
    "crea",
    "deba",
    "direc",
    "diver",
    "doub",
    "eleva",
    "fas",
    "flee",
    "flir",
    "inheri",
    "lis",
    "loca",
    "par",
    "pivo",
    "plan",
    "presen",
    "protec",
    "rela",
    "repor",
    "rota",
    "rou",
    "sor",
    "suppor",
    "trus",
    "upda",
]);

const IMAGES_PER_PREFIX = 250;
const MAX_DAILY_GENERATIONS = 60;

async function getImagePage(key: string, env: Env): Promise<string> {
    const compressedImage = await env.IMAGES_KV.get(key, 'arrayBuffer');
    if (!compressedImage) {
        throw new Error('Image not found');
    }

    // Extract the prefix from the key
    const prefix = key.split('_')[1]; // Assuming the key format is "image_prefix_timestamp_random"
    const action = `${prefix}ting`;
    const pageTitle = `${action.charAt(0).toUpperCase() + action.slice(1)} Dog`;

    // Decompress the image
    const decompressedImage = await decompress(new Uint8Array(compressedImage));
    const decoder = new TextDecoder();
    const base64Image = decoder.decode(decompressedImage);

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${pageTitle}</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background-color: #f0f0f0;
            }
            .image-container {
                max-width: 100%;
                max-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            img {
                max-width: 100%;
                max-height: 100vh;
                object-fit: contain;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }
            @media (max-width: 768px) {
                .image-container {
                    padding: 10px;
                }
            }
        </style>
    </head>
    <body>
        <div class="image-container">
            <img src="data:image/png;base64,${base64Image}" alt="Generated Image">
        </div>
    </body>
    </html>
    `;
}

async function handleSubdomainRequest(request: Request, env: Env, fallback: boolean = false): Promise<Response> {
    const url = new URL(request.url);
    const subdomain = url.hostname.split('.')[0];

    if (!subdomainPrefixes.has(subdomain)) {
        return new Response('Invalid subdomain', { status: 404 });
    }

    const prefixImageKeys = await env.PREFIX_TO_IMAGES_KV.get(subdomain);
    if (!prefixImageKeys) {
        return new Response('No images for this subdomain', { status: 404 });
    }

    const imageKeys = JSON.parse(prefixImageKeys) as string[];
    const randomImageKey = imageKeys[Math.floor(Math.random() * imageKeys.length)];

    try {
        const htmlContent = await getImagePage(randomImageKey, env);
        return new Response(htmlContent, {
            headers: addCorsHeaders(new Headers({
                'Content-Type': 'text/html',
                'Cache-Control': 'public, max-age=600', // Cache for 10 minutes
            })),
        });
    } catch (error) {
        if (fallback) return new Response("Internal server error", { status: 500 })

        console.error(`Error serving image ${randomImageKey}: ${error}`);

        // Invalidate the problematic image key
        await invalidateImageKey(subdomain, randomImageKey, env);

        // Try to serve another random image
        return handleSubdomainRequest(request, env, true);
    }
}

function addCorsHeaders(headers: Headers) {
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return headers
}

async function generateAndStoreFluxImage(model: BaseAiTextToImageModels, prompt: string, prefix: string, env: Env): Promise<string> {
    const jsonBody = {
        prompt,
        num_steps: 4,
        // width: size.width,
        // height: size.height
    } satisfies AiTextToImageInput;

    const response: AiTextToImageOutput = await env.AI.run(model, jsonBody, {} satisfies AiOptions);
    if (typeof response !== 'object' || response === null || !('image' in response)) {
        throw new Error('Unexpected response format from AI model');
    }

    const { image } = response as { image: string };
    if (typeof image !== 'string' || image.length === 0) {
        throw new Error('Image data is empty or not a string');
    }

    // Compress the base64 string
    const compressedImage = await new Response(image).arrayBuffer().then(buffer =>
        new Uint8Array(buffer)
    ).then(uint8Array =>
        compress(uint8Array)
    );

    const key = `image_${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Store the compressed image in IMAGES_KV
    await env.IMAGES_KV.put(key, compressedImage, {
        metadata: { contentType: 'application/gzip' }
    });

    return key;
}

async function getImage(env: Env, randomPrefix: string) {
    const action = `${randomPrefix}ting` as PrefixTing;
    const prompt = createImagePrompt(
        action,
        dogBreeds[Math.floor(Math.random() * dogBreeds.length)],
        environments[Math.floor(Math.random() * environments.length)],
        timeOfDay[Math.floor(Math.random() * timeOfDay.length)]
    );

    const imageKey = await generateAndStoreFluxImage("@cf/black-forest-labs/flux-1-schnell", prompt, randomPrefix, env);
    const htmlContent = await getImagePage(imageKey, env);

    // Store the new image key for the prefix
    const imageKeysJson = await env.PREFIX_TO_IMAGES_KV.get(randomPrefix);
    const imageKeys = imageKeysJson ? JSON.parse(imageKeysJson) : [];
    imageKeys.push(imageKey);
    await env.PREFIX_TO_IMAGES_KV.put(randomPrefix, JSON.stringify(imageKeys));

    return new Response(htmlContent, {
        headers: addCorsHeaders(new Headers({
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=600', // Cache for 10 minutes
        })),
    });
}

async function topUpImages(env: Env) {
    let generatedCount = 0;
    const prefixArray = Array.from(subdomainPrefixes);

    while (generatedCount < MAX_DAILY_GENERATIONS && prefixArray.length > 0) {
        // Randomly select a prefix
        const randomIndex = Math.floor(Math.random() * prefixArray.length);
        const prefix = prefixArray[randomIndex];

        const imageKeysJson = await env.PREFIX_TO_IMAGES_KV.get(prefix);
        let imageKeys = imageKeysJson ? JSON.parse(imageKeysJson) : [];

        if (imageKeys.length >= IMAGES_PER_PREFIX) {
            console.log(`Prefix ${prefix} already has ${imageKeys.length} images. Skipping.`);
            prefixArray.splice(randomIndex, 1); // Remove this prefix from consideration
            continue;
        }

        const imagesToGenerate = Math.min(
            IMAGES_PER_PREFIX - imageKeys.length,
            MAX_DAILY_GENERATIONS - generatedCount
        );
        console.log(`Generating ${imagesToGenerate} images for prefix ${prefix}`);


        for (let i = 0; i < imagesToGenerate; i++) {
            const action = `${prefix}ting` as PrefixTing;
            const prompt = createImagePrompt(
                action,
                dogBreeds[Math.floor(Math.random() * dogBreeds.length)],
                environments[Math.floor(Math.random() * environments.length)],
                timeOfDay[Math.floor(Math.random() * timeOfDay.length)]
            );

            try {
                const imageKey = await generateAndStoreFluxImage("@cf/black-forest-labs/flux-1-schnell", prompt, prefix, env);
                imageKeys.push(imageKey);
                generatedCount++;
            } catch (error) {
                console.error(`Failed to generate image for ${prefix}: ${error}`);
            }
        }

        await env.PREFIX_TO_IMAGES_KV.put(prefix, JSON.stringify(imageKeys));

        if (imageKeys.length >= IMAGES_PER_PREFIX) {
            prefixArray.splice(randomIndex, 1); // Remove this prefix from consideration
        }
    }

    console.log(`Generated ${generatedCount} images in total`);
}

async function getRandomSubdomainWithImages(env: Env): Promise<string | null> {
    const prefixArray = Array.from(subdomainPrefixes);
    while (prefixArray.length > 0) {
        const randomIndex = Math.floor(Math.random() * prefixArray.length);
        const prefix = prefixArray[randomIndex];

        const imageKeysJson = await env.PREFIX_TO_IMAGES_KV.get(prefix);
        if (imageKeysJson) {
            const imageKeys = JSON.parse(imageKeysJson) as string[];
            if (imageKeys.length > 0) {
                return prefix;
            }
        }

        prefixArray.splice(randomIndex, 1);
    }

    return null;
}

async function handleRequest(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const ip = env.ENVIRONMENT === 'dev' ? '127.0.0.1' : req.headers.get('cf-connecting-ip') ? req.headers.get('cf-connecting-ip') : req.headers.get('cf-connecting-ipv6')

    // Rate limit
    if (ip) {
        const { success } = await env.RATE_LIMITER.limit({ key: ip })
        if (!success) {
            return new Response("You are being rate limited", { status: 429 });
        }
    } else {
        return new Response("Internal server error", { status: 500 })
    }

    // Redirect to root path if not already there
    if (url.pathname !== "/") {
        return Response.redirect(`${url.origin}/`, 301);
    }

    // Check if it's a subdomain request or an IP address
    const hostParts = url.hostname.split('.');
    const isIPv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(url.hostname);
    const isIPv6 = url.hostname.includes(':');
    if (!isIPv4 && !isIPv6 && hostParts.length > 2) {
        console.log(hostParts);
        return handleSubdomainRequest(req, env);
    }

    // Fallback for root domain or IP address
    if (env.ENVIRONMENT !== 'dev') {
        const randomSubdomain = await getRandomSubdomainWithImages(env);
        if (randomSubdomain) {
            const redirectUrl = isIPv4 || isIPv6
                ? `https://${randomSubdomain}.${env.ROOT_DOMAIN}${url.pathname}`
                : `https://${randomSubdomain}.${url.hostname}${url.pathname}`;
            return Response.redirect(redirectUrl, 302);
        }
    }

    const randomPrefix = Array.from(subdomainPrefixes)[Math.floor(Math.random() * subdomainPrefixes.size)];

    try {
        return await getImage(env, randomPrefix);
    } catch (error) {
        console.error(`Failed to generate image: ${error}`);

        // If an image was generated but failed to be served, invalidate it
        if (typeof error === 'object' && error !== null && 'imageKey' in error) {
            await invalidateImageKey(randomPrefix, (error as { imageKey: string }).imageKey, env);
        }

        return new Response("Failed to generate image", { status: 500 });
    }
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        return handleRequest(request, env, ctx);
    },

    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
        ctx.waitUntil(topUpImages(env));
    }
};
