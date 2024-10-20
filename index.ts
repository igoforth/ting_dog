import { z } from "zod";

const MODEL = "@cf/black-forest-labs/flux-1-schnell";
const IMAGES_PER_PREFIX = 250;
const READY_IMAGE_KEY = "ready_image";
// eslint-disable-next-line regexp/no-unused-capturing-group
const IPV4_REGEX = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
const IPV6_REGEX =
  // eslint-disable-next-line regexp/no-unused-capturing-group
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+|::(ffff(:0{1,4})?:)?((25[0-5]|(2[0-4]|1?\d)?\d)\.){3}(25[0-5]|(2[0-4]|1?\d)?\d)|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1?\d)?\d)\.){3}(25[0-5]|(2[0-4]|1?\d)?\d))$/;

const defaultCorsOptions: CorsOptions = {
  origin: "*",
  methods: new Set<string>(["GET", "OPTIONS"]),
  allowedHeaders: new Set<string>([]),
  exposedHeaders: new Set<string>(["Content-Length", "Content-Type"]),
  maxAge: 600,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  credentials: false,
};

const dogBreeds = [
  "Labrador",
  "German Shepherd",
  "Golden Retriever",
  "Bulldog",
  "Beagle",
  "Poodle",
  "Rottweiler",
  "Boxer",
  "Dachshund",
  "Siberian Husky",
];

const environments = [
  "beach",
  "forest",
  "city park",
  "snowy mountain",
  "backyard",
  "meadow",
  "living room",
  "cafe",
  "farm",
  "autumn forest",
];

const timeOfDay = [
  "sunrise",
  "midday",
  "sunset",
  "night",
  "golden hour",
  "blue hour",
  "overcast day",
  "foggy morning",
  "starry night",
  "rainy afternoon",
];

const subdomainPrefixes: Set<string> = new Set([
  "adop",
  "bi",
  "boa",
  "boas",
  "car",
  "cas",
  "char",
  "chat",
  "chea",
  "coa",
  "construc",
  "contribu",
  "craf",
  "crea",
  "da",
  "deba",
  "direc",
  "diver",
  "doub",
  "draf",
  "edi",
  "eleva",
  "exci",
  "exis",
  "fas",
  "fit",
  "flee",
  "flir",
  "floa",
  "get",
  "hos",
  "hun",
  "inheri",
  "inspec",
  "interes",
  "jet",
  "let",
  "lif",
  "lin",
  "lis",
  "loca",
  "mee",
  "nes",
  "net",
  "opera",
  "pain",
  "pan",
  "par",
  "paren",
  "pat",
  "pet",
  "pivo",
  "plan",
  "poin",
  "presen",
  "protec",
  "protes",
  "put",
  "quo",
  "raf",
  "rat",
  "rela",
  "repor",
  "res",
  "roo",
  "rota",
  "rou",
  "scoo",
  "sculp",
  "set",
  "sit",
  "sor",
  "spor",
  "star",
  "suppor",
  "tes",
  "thirs",
  "toas",
  "trus",
  "uni",
  "upda",
  "visi",
  "wai",
]);

const ICON_BASE64_DATA =
  "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";

const htmlTemplate = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">{{PAGE_TITLE}}{{ICON_BASE64_DATA}}<style>body{margin:0;padding:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background-color:#f0f0f0}.image-container{max-width:100%;max-height:100vh;display:flex;justify-content:center;align-items:center}img{max-width:100%;max-height:100vh;object-fit:contain;box-shadow:0 4px 8px rgba(0,0,0,.1)}@media (max-width:768px){.image-container{padding:10px}}</style></head><body><div class="image-container">{{BASE64_IMAGE}}</div></body></html>`;

// Schemas
const CorsOptionsSchema = z
  .object({
    origin: z.union([
      z.string(),
      z.instanceof(Set).refine((set) => set.size > 0, "Set must not be empty"),
      z.instanceof(RegExp),
      z
        .function()
        .args(z.string())
        .returns(z.union([z.boolean(), z.promise(z.boolean())])),
    ]),
    methods: z
      .instanceof(Set)
      .refine((set) => set.size > 0, "Set must not be empty"),
    allowedHeaders: z.instanceof(Set),
    exposedHeaders: z
      .instanceof(Set)
      .refine((set) => set.size > 0, "Set must not be empty"),
    credentials: z.boolean(),
    maxAge: z.number(),
    preflightContinue: z.boolean(),
    optionsSuccessStatus: z.number(),
  })
  .partial();

const _DeferredTaskSchema = z.function().returns(z.promise(z.void()));

const ImageKeySchema = z.string().regex(/^image_[a-z]+_[a-z0-9]+$/);
const ReadyImageKeySchema = z.string().regex(/^ready_image_[a-z]+$/);
const CombinedImageKeySchema = z.union([ImageKeySchema, ReadyImageKeySchema]);
const ImageKeysSchema = z.array(CombinedImageKeySchema);
const MappingMetadata = z.object({
  lastUpdated: z.number(),
  count: z.number(),
});
const KVMappingSchema = z.object({
  value: z.union([ImageKeysSchema, z.null()]),
  metadata: z.union([MappingMetadata, z.null()]),
});

const ImageMetadata = z.object({
  contentType: z.enum(["application/gzip"]),
  prefix: z.string(),
  generatedAt: z.number(),
});
const KVImageSchema = z.object({
  value: z.instanceof(ArrayBuffer),
  metadata: z.union([ImageMetadata, z.null()]),
});

// Types
type CorsOptions = z.infer<typeof CorsOptionsSchema>;
type DeferredTask = z.infer<typeof _DeferredTaskSchema>;
type Mapping = z.infer<typeof KVMappingSchema>;
type Image = z.infer<typeof KVImageSchema>;

// HELPERS

const isString = (s: unknown): s is string =>
  typeof s === "string" || s instanceof String;

const getRandomArrayElement = <T>(array: T[]): T =>
  array[Math.floor(Math.random() * array.length)];

const getRandomSetElement = <T>(set: Set<T>): T => {
  return getRandomArrayElement<T>(Array.from(set));
};

const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  } // Fisher-Yates
  return shuffled;
};

const compress = async (input: Uint8Array): Promise<Uint8Array> => {
  const cs = new CompressionStream("gzip" as CompressionFormat);
  const writer = cs.writable.getWriter();
  writer.write(input);
  writer.close();
  const buffer = await new Response(cs.readable).arrayBuffer();
  return new Uint8Array(buffer);
};

const decompress = async (input: Uint8Array): Promise<Uint8Array> => {
  const ds = new DecompressionStream("gzip" as CompressionFormat);
  const writer = ds.writable.getWriter();
  writer.write(input);
  writer.close();
  const buffer = await new Response(ds.readable).arrayBuffer();
  return new Uint8Array(buffer);
};

const getImageKeysForSubdomain = async (
  subdomain: string,
  env: Env,
): Promise<string[]> => {
  try {
    const result = await env.PREFIX_TO_IMAGES_KV.getWithMetadata(
      subdomain,
      "json",
    );
    return KVMappingSchema.parse(result).value ?? [];
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Keys validation error:", error.errors);
    }
    return [];
  }
};

const getImagePage = (prefix: string, image: string): string => {
  const action = `${prefix}ting`;
  const pageTitle = `${action.charAt(0).toUpperCase() + action.slice(1)} Dog`;
  return htmlTemplate
    .replace("{{PAGE_TITLE}}", `<title>${pageTitle}</title>`)
    .replace(
      "{{BASE64_IMAGE}}",
      `<img src="data:image/png;base64,${image}" alt="Generated Image">`,
    )
    .replace(
      "{{ICON_BASE64_DATA}}",
      `<link rel="icon" href="data:image/png;base64,${ICON_BASE64_DATA}" type="image/png">`,
    );
};

const getBlankPage = (msg: string) => {
  return htmlTemplate
    .replace("{{PAGE_TITLE}}", "<title>Ting Dog</title>")
    .replace("{{BASE64_IMAGE}}", `<p>${msg}</p>`)
    .replace(
      "{{ICON_BASE64_DATA}}",
      `<link rel="icon" href="data:image/png;base64,${ICON_BASE64_DATA}" type="image/png">`,
    );
};

const createImagePrompt = (
  action: string,
  breed?: string,
  environment?: string,
  time?: string,
): string => {
  const dogBreed =
    breed || dogBreeds[Math.floor(Math.random() * dogBreeds.length)];
  const setting =
    environment ||
    environments[Math.floor(Math.random() * environments.length)];
  const lighting =
    time || timeOfDay[Math.floor(Math.random() * timeOfDay.length)];

  return `A high-resolution photograph of a ${dogBreed} dog ${action} in a ${setting} during ${lighting}. 
    The image should showcase intricate details such as individual fur strands, reflections in the eyes, 
    and textures of the surrounding environment. The lighting should reflect the time of day, 
    and the composition should be professional, creating a lifelike and immersive scene 
    that captures the essence of the action and the beauty of the setting.`;
};

const addImageKeyToSubdomain = async (
  key: string,
  subdomain: string,
  imageKeys: string[],
  env: Env,
): Promise<void> => {
  imageKeys.push(key);

  const metadata = {
    lastUpdated: Date.now(),
    count: imageKeys.length,
  } satisfies Mapping["metadata"];

  await env.PREFIX_TO_IMAGES_KV.put(subdomain, JSON.stringify(imageKeys), {
    metadata,
  } satisfies KVNamespacePutOptions);
};

const invalidateImageKey = async (
  badKey: string,
  subdomain: string,
  imageKeys: string[],
  env: Env,
): Promise<void> => {
  if (!badKey || !subdomain) {
    return;
  }

  try {
    // Remove the image from IMAGES_KV
    await env.IMAGES_KV.delete(badKey);

    // Remove the key from the key list
    const updatedImageKeys = imageKeys.filter(
      (key) => key !== badKey,
    ) satisfies Mapping["value"];

    const metadata = {
      lastUpdated: Date.now(),
      count: updatedImageKeys.length,
    } satisfies Mapping["metadata"];

    // Update PREFIX_TO_IMAGES_KV
    await env.PREFIX_TO_IMAGES_KV.put(
      subdomain,
      JSON.stringify(updatedImageKeys),
      { metadata } satisfies KVNamespacePutOptions,
    );
  } catch (error) {
    // Swallow
    console.error((error as Error).message ?? "");
  }
};

const getAnImage = async (
  key: string,
  env: Env,
  copyTo: string | undefined = undefined,
  deferredTasks: DeferredTask[] | undefined = undefined,
  decomp: boolean = true,
): Promise<string | undefined> => {
  const compressedImageResult = await env.IMAGES_KV.getWithMetadata(
    key,
    "arrayBuffer",
  );
  if (!compressedImageResult || compressedImageResult.value === null) {
    return undefined;
  }

  try {
    const compressedData = KVImageSchema.parse(compressedImageResult);

    if (copyTo) {
      // Copy image to new key
      const action = async () =>
        await env.IMAGES_KV.put(copyTo, compressedData.value, {
          metadata: compressedData.metadata,
        } satisfies KVNamespacePutOptions);
      if (deferredTasks && env.ENVIRONMENT === "dev") {
        deferredTasks.push(action);
      } else {
        await action();
      }
    }

    // Parse the image
    if (decomp) {
      // Decompress the image
      const decompressedImage = await decompress(
        new Uint8Array(compressedData.value),
      );
      const decoder = new TextDecoder();
      return decoder.decode(decompressedImage);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Image validation error:", error.errors);
      return undefined;
    }
    console.error(`Decompression error: ${(error as Error).message}`);
    return undefined;
  }
};

const prepareRandomImageForSubdomain = async (
  subdomain: string,
  imageKeys: string[],
  env: Env,
  deferredTasks: DeferredTask[] | undefined,
): Promise<void> => {
  if (imageKeys.length === 0) {
    return;
  }

  const key = getRandomArrayElement(imageKeys);
  await getAnImage(
    key,
    env,
    `${READY_IMAGE_KEY}_${subdomain}`,
    deferredTasks,
    false,
  );
};

// CORS

const isOriginAllowed = async (
  origin: string,
  allowedOrigin: CorsOptions["origin"],
): Promise<boolean> => {
  if (allowedOrigin instanceof Set) {
    return allowedOrigin.has(origin);
  } else if (isString(allowedOrigin)) {
    return origin === allowedOrigin;
  } else if (allowedOrigin instanceof RegExp) {
    return allowedOrigin.test(origin);
  } else if (typeof allowedOrigin === "function") {
    return await allowedOrigin(origin);
  }
  return !!allowedOrigin;
};

const configureOrigin = async (
  options: CorsOptions,
  reqOrigin: string | null,
): Promise<string[]> => {
  const headers: string[] = [];

  if (!options.origin || options.origin === "*") {
    headers.push("Access-Control-Allow-Origin: *");
  } else if (isString(options.origin)) {
    headers.push(
      `Access-Control-Allow-Origin: ${options.origin}`,
      "Vary: Origin",
    );
  } else {
    const isAllowed =
      reqOrigin && (await isOriginAllowed(reqOrigin, options.origin));
    headers.push(
      `Access-Control-Allow-Origin: ${isAllowed ? reqOrigin : "false"}`,
      "Vary: Origin",
    );
  }

  return headers;
};

const configureMethods = (options: CorsOptions): string =>
  `Access-Control-Allow-Methods: ${[...options.methods!].join(",")}`;

const configureCredentials = (options: CorsOptions): string | null =>
  options.credentials ? "Access-Control-Allow-Credentials: true" : null;

const configureAllowedHeaders = (
  options: CorsOptions,
  req: Request,
): string[] => {
  const headers: string[] = [];
  const allowedHeaders =
    options.allowedHeaders ||
    new Set(
      req.headers
        .get("Access-Control-Request-Headers")
        ?.split(",")
        .map((h) => h.trim()),
    );

  if (allowedHeaders.size > 0) {
    headers.push(
      `Access-Control-Allow-Headers: ${[...allowedHeaders].join(",")}`,
    );
  }

  if (!options.allowedHeaders) {
    headers.push("Vary: Access-Control-Request-Headers");
  }

  return headers;
};

const configureExposedHeaders = (options: CorsOptions): string | null =>
  options.exposedHeaders && options.exposedHeaders.size > 0
    ? `Access-Control-Expose-Headers: ${[...options.exposedHeaders].join(",")}`
    : null;

const configureMaxAge = (options: CorsOptions): string | null =>
  options.maxAge ? `Access-Control-Max-Age: ${options.maxAge}` : null;

const applyHeaders = (headers: (string | null)[], res: Response): void => {
  headers.forEach((header) => {
    if (header) {
      const [key, value] = header.split(": ");
      res.headers.append(key, value);
    }
  });
};

const cors = (options: Partial<CorsOptions>) => {
  const corsOptions = CorsOptionsSchema.parse({
    ...defaultCorsOptions,
    ...options,
    methods: new Set(options.methods || defaultCorsOptions.methods),
    allowedHeaders:
      options.allowedHeaders instanceof Set
        ? options.allowedHeaders
        : new Set(options.allowedHeaders),
    exposedHeaders:
      options.exposedHeaders instanceof Set
        ? options.exposedHeaders
        : new Set(options.exposedHeaders),
  });

  return {
    corsMiddleware: async (req: Request, res?: Response): Promise<Response> => {
      const originHeader = req.headers.get("Origin");
      const method = req.method.toUpperCase();

      let headers: (string | null)[] = [];

      // Handle origin asynchronously
      const originHeaders = await configureOrigin(corsOptions, originHeader);
      headers = headers.concat(originHeaders);

      if (method === "OPTIONS") {
        // Preflight request
        headers = headers.concat([
          configureCredentials(corsOptions),
          configureMethods(corsOptions),
          ...configureAllowedHeaders(corsOptions, req),
          configureMaxAge(corsOptions),
          configureExposedHeaders(corsOptions),
        ]);

        if (corsOptions.preflightContinue) {
          // Let the next middleware handle the OPTIONS request
          return new Response(null, {
            status: 204,
            headers: { "Content-Length": "0" },
          });
        } else {
          const res = new Response(null, {
            status: corsOptions.optionsSuccessStatus,
            headers: { "Content-Length": "0" },
          });
          applyHeaders(headers, res);
          return res;
        }
      } else {
        // Actual response
        headers = headers.concat([
          configureCredentials(corsOptions),
          configureExposedHeaders(corsOptions),
        ]);

        // If a response is provided, create a new Response with combined headers
        if (res) {
          const newHeaders = new Headers(res.headers);
          headers
            .filter((header): header is string => Boolean(header))
            .forEach((header) => {
              const [name, value] = header.split(": ");
              newHeaders.set(name, value);
            });

          return new Response(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers: newHeaders,
          });
        }

        // For non-OPTIONS requests, we'll apply the headers
        return new Response(null, {
          status: 200,
          headers: Object.fromEntries(
            headers
              .filter((header): header is string => Boolean(header))
              .map((header) => {
                const [name, value] = header.split(": ");
                return [name, value];
              }),
          ),
        });
      }
    },
  };
};

const generateImageForSubdomain = async (
  subdomain: string,
  imageKeys: string[] | undefined,
  env: Env,
  deferredTasks: DeferredTask[] | undefined,
) => {
  if (!imageKeys) {
    imageKeys = await getImageKeysForSubdomain(subdomain, env);
  }
  const action = `${subdomain}ting`;
  const key = `image_${subdomain}_${Math.random().toString(36).slice(7)}`;
  const prompt = createImagePrompt(
    action,
    getRandomArrayElement(dogBreeds),
    getRandomArrayElement(environments),
    getRandomArrayElement(timeOfDay),
  );

  const task1 = async () => {
    const { image } = (await env.AI.run(
      MODEL,
      { prompt },
      {} satisfies AiOptions,
    )) as unknown as { image: string };
    if (typeof image !== "string" || image.length === 0) {
      throw new Error("Image data is empty or not a string");
    }

    // Compress the base64 string
    const compressedImage = (await new Response(image)
      .arrayBuffer()
      .then((buffer) => new Uint8Array(buffer))
      .then((uint8Array) => compress(uint8Array))) satisfies Image["value"];

    // Store the compressed image in IMAGES_KV with metadata
    env.IMAGES_KV.put(key, compressedImage, {
      metadata: {
        contentType: "application/gzip",
        prefix: subdomain,
        generatedAt: Date.now(),
      } satisfies Image["metadata"],
    });
  };
  const task2 = async () =>
    await addImageKeyToSubdomain(key, subdomain, imageKeys.slice(), env);

  if (deferredTasks) {
    deferredTasks.push(task1, task2);
    return key;
  } else {
    await Promise.allSettled([task1(), task2()]);
  }
};

const debugImageForSubdomain = async (
  subdomain: string,
  imageKeys: string[] | undefined,
  env: Env,
  _deferredTasks: DeferredTask[] | undefined,
) => {
  if (!imageKeys) {
    imageKeys = await getImageKeysForSubdomain(subdomain, env);
  }
  const action = `${subdomain}ting`;
  const key = `image_${subdomain}_${Math.random().toString(36).slice(7)}`;
  const prompt = createImagePrompt(
    action,
    getRandomArrayElement(dogBreeds),
    getRandomArrayElement(environments),
    getRandomArrayElement(timeOfDay),
  );

  const { image } = (await env.AI.run(
    MODEL,
    { prompt },
    {} satisfies AiOptions,
  )) as unknown as { image: string };
  if (typeof image !== "string" || image.length === 0) {
    throw new Error("Image data is empty or not a string");
  }

  // Compress the base64 string
  const compressedImage = (await new Response(image)
    .arrayBuffer()
    .then((buffer) => new Uint8Array(buffer))
    .then((uint8Array) => compress(uint8Array))) satisfies Image["value"];

  // Store the compressed image in IMAGES_KV with metadata
  env.IMAGES_KV.put(key, compressedImage, {
    metadata: {
      contentType: "application/gzip",
      prefix: subdomain,
      generatedAt: Date.now(),
    } satisfies Image["metadata"],
  });

  await addImageKeyToSubdomain(key, subdomain, imageKeys.slice(), env);
  return image;
};

const addAnImage = async (env: Env, deferredTasks: DeferredTask[]) => {
  const subdomainArray = Array.from(subdomainPrefixes);
  const shuffledSubdomains = shuffleArray(subdomainArray);

  // Find the first non-full prefix
  for (const subdomain of shuffledSubdomains) {
    const imageKeys = await getImageKeysForSubdomain(subdomain, env);
    if (imageKeys.length < IMAGES_PER_PREFIX) {
      generateImageForSubdomain(subdomain, imageKeys, env, deferredTasks);
      prepareRandomImageForSubdomain(subdomain, imageKeys, env, deferredTasks);
      return;
    }
  }
};

const serveRandomImageFromSubdomain = async (
  subdomain: string,
  env: Env,
  deferredTasks: DeferredTask[],
): Promise<Response> => {
  let imageKeys: string[] | undefined;
  let imageKey: string | undefined;
  let image: string | undefined;
  try {
    imageKey = `${READY_IMAGE_KEY}_${subdomain}`;
    image = await getAnImage(imageKey, env);
    if (!image) {
      // cache miss on ready image
      console.log(`READ CACHE MISS ${subdomain}`);

      imageKeys = await getImageKeysForSubdomain(subdomain, env);
      if (imageKeys.length !== 0) {
        imageKey = getRandomArrayElement(imageKeys);
        image = await getAnImage(
          imageKey,
          env,
          `${READY_IMAGE_KEY}_${subdomain}`,
          deferredTasks,
        );
      }

      if (!image) {
        // cache miss on subdomain image
        console.log(`RAND CACHE MISS ${subdomain}`);

        // Generate a new image
        const res =
          env.ENVIRONMENT !== "dev"
            ? async () => {
                const img = await debugImageForSubdomain(
                  subdomain,
                  imageKeys,
                  env,
                  deferredTasks,
                );
                return getImagePage(subdomain, img);
              }
            : async () => {
                await generateImageForSubdomain(
                  subdomain,
                  imageKeys,
                  env,
                  deferredTasks,
                );
                return getBlankPage(
                  "Generating new image, please try again shortly",
                );
              };

        return new Response(await res(), {
          status: env.ENVIRONMENT !== "dev" ? 200 : 202,
          headers: {
            "Content-Type": "text/html;charset=UTF-8",
          },
        });
      }
    }
    return new Response(getImagePage(subdomain, image), {
      status: 200,
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
      },
    });
  } catch (error) {
    if (imageKey && imageKeys) {
      const key = imageKey;
      const keys = imageKeys;
      deferredTasks.push(
        async () => await invalidateImageKey(key, subdomain, keys, env),
      );
    }
    if (error instanceof z.ZodError) {
      console.error("Critical validation error:", error.errors);
      throw error;
    }
    console.error(`Critical error: ${(error as Error).message}`);
    throw error;
  }
};

const requestHandler = async (
  req: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> => {
  const url = new URL(req.url);
  const deferredTasks: DeferredTask[] = [];
  const ip =
    env.ENVIRONMENT === "dev"
      ? "127.0.0.1"
      : req.headers.get("cf-connecting-ip")
        ? req.headers.get("cf-connecting-ip")
        : req.headers.get("cf-connecting-ipv6");

  // Rate limit
  if (ip) {
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    if (!success) {
      return new Response("You are being rate limited", { status: 429 });
    }
  } else {
    return new Response("Internal server error", { status: 500 });
  }

  // Handle cors
  const c = cors(defaultCorsOptions).corsMiddleware;
  if (req.method === "OPTIONS") {
    return c(req);
  }

  // Redirect to root path if not already there
  if (url.pathname !== "/") {
    return c(req, Response.redirect(`${url.origin}/`, 301));
  }

  // Check if IP address
  const isIPv4 = IPV4_REGEX.test(url.hostname);
  const isIPv6 = IPV6_REGEX.test(url.hostname);
  if ((isIPv4 || isIPv6) && env.ENVIRONMENT !== "dev") {
    return c(req, new Response("Must request by domain", { status: 401 }));
  }

  // Check if root domain
  const hostParts = url.hostname.split(".");
  const isSubdomain = hostParts.length > 2 && hostParts[0] !== "www";
  const randomSubdomain = getRandomSetElement(subdomainPrefixes);

  if (!isSubdomain && env.ENVIRONMENT !== "dev") {
    // If not a subdomain, redirect to a random subdomain
    const newUrl = new URL(url);
    newUrl.hostname = `${randomSubdomain}.${hostParts.slice(-2).join(".")}`;
    return c(req, Response.redirect(newUrl.toString(), 302));
  }

  const subdomain = env.ENVIRONMENT === "dev" ? randomSubdomain : hostParts[0];

  try {
    const res = c(
      req,
      await serveRandomImageFromSubdomain(subdomain, env, deferredTasks),
    );
    ctx.waitUntil(Promise.allSettled(deferredTasks.map((task) => task())));
    return res;
  } catch {
    return c(req, new Response("Internal server error", { status: 500 }));
  }
};

export default {
  fetch: async (
    req: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> => await requestHandler(req, env, ctx),

  scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const deferredTasks: DeferredTask[] = [];
    ctx.waitUntil(
      addAnImage(env, deferredTasks).then(() =>
        Promise.allSettled(deferredTasks.map((task) => task())),
      ),
    );
  },
};
