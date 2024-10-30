/* eslint-disable prettier/prettier */
import { gunzipSync, gzipSync, type ZlibOptions } from "node:zlib";
import { DurableObject } from "cloudflare:workers";
import { z } from "zod";

const createDebugLogger = (env: Env) => {
  return (...args: any[]) => {
    if (env.ENVIRONMENT === 'dev') {
      console.debug('[DEBUG]', ...args);
    }
  };
};

const MODEL = "@cf/black-forest-labs/flux-1-schnell";
const IMAGES_PER_PREFIX = 250;
const READY_IMAGE_KEY = "ready_image";
// eslint-disable-next-line regexp/no-unused-capturing-group, regexp/no-empty-alternative
const IPV4_REGEX = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
const IPV6_REGEX =
  // eslint-disable-next-line regexp/no-unused-capturing-group
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+|::(ffff(:0{1,4})?:)?((25[0-5]|(2[0-4]|1?\d)?\d)\.){3}(25[0-5]|(2[0-4]|1?\d)?\d)|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1?\d)?\d)\.){3}(25[0-5]|(2[0-4]|1?\d)?\d))$/;

// Define limited set of allowed transformations
// const TRANSFORM_PRESETS: Record<
//   "social" | "thumbnail" | "preview",
//   ImageTransform & ImageOutputOptions
// > = {
//   // For social media cards (1200x630)
//   social: {
//     width: 1200,
//     height: 630,
//     fit: "cover",
//     gravity: "auto",
//     format: "image/webp",
//     quality: 85,
//   },
//   // For thumbnail previews (400x400)
//   thumbnail: {
//     width: 400,
//     height: 400,
//     fit: "cover",
//     gravity: "auto",
//     format: "image/webp",
//     quality: 80,
//   },
//   // For full previews (800x800)
//   preview: {
//     width: 800,
//     height: 800,
//     fit: "contain",
//     gravity: "auto",
//     format: "image/webp",
//     quality: 85,
//   },
// };

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

const htmlTemplate = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">{{PAGE_TITLE}}{{ICON_BASE64_DATA}}<style>body{margin:0;padding:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background-color:#f0f0f0}.image-container{max-width:100%;max-height:100vh;display:flex;justify-content:center;align-items:center}img{max-width:100%;max-height:100vh;object-fit:contain;box-shadow:0 4px 8px rgb(0 0 0 / .1)}@media (max-width:768px){.image-container{padding:10px}}</style></head><body><div class="image-container">{{BASE64_IMAGE}}</div></body></html>`;

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
const ImageKeysSchema = z.union([z.array(CombinedImageKeySchema), z.null()]);
const MappingMetadata = z.object({
  lastUpdated: z.number(),
  count: z.number(),
});
const KVMappingSchema = z.object({
  value: ImageKeysSchema,
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

// Functional composition helpers that allow different types between steps
type Function<A, B> = (arg: A) => B
const compose = <A, B, C>(
  f: Function<B, C>,
  g: Function<A, B>
): Function<A, C> => x => f(g(x))

const compose3 = <A, B, C, D>(
  f: Function<C, D>,
  g: Function<B, C>,
  h: Function<A, B>
): Function<A, D> => x => f(g(h(x)))

// Basic transformations
const textToBytes = (str: string): Uint8Array =>
  new TextEncoder().encode(str)

const bytesToText = (bytes: Uint8Array): string =>
  new TextDecoder().decode(bytes)

// const bytesToBinary = (bytes: Uint8Array): string =>
//   String.fromCharCode.apply(null, bytes)

const bytesToBinary = (bytes: Uint8Array): string => {
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return binary;
};

const binaryToBytes = (binary: string): Uint8Array =>
  Uint8Array.from(binary, char => char.charCodeAt(0))

// Core base64 operations
const binaryToBase64 = (str: string): string => btoa(str)
const base64ToBinary = (str: string): string => atob(str)

// Main functions using composition
const toBase64 = (input: string | Uint8Array): string => {
  if (input instanceof Uint8Array) {
    return compose(
      binaryToBase64,
      bytesToBinary
    )(input)
  }

  try {
    return binaryToBase64(input)
  } catch {
    return compose3(
      binaryToBase64,
      bytesToBinary,
      textToBytes
    )(input)
  }
}

const fromBase64 = (str: string, returnUint8Array = false): string | Uint8Array => {
  const bytes = compose(
    binaryToBytes,
    base64ToBinary
  )(str)

  if (returnUint8Array) {
    return bytes
  }

  try {
    return bytesToText(bytes)
  } catch {
    return base64ToBinary(str)
  }
}

// Update array conversions to use new implementation
const arrayToB64 = (arr: Uint8Array): string => toBase64(arr)
const arrayFromB64 = (str: string): Uint8Array => fromBase64(str, true) as Uint8Array

/**
 * Implementation of xoshiro128** algorithm with extended functionality
 * This is a high-quality, fast random number generator with Set support
 */
class Xoshiro128ss {
  private state: Uint32Array;

  constructor(seed: number) {
    // Initialize the generator state with splitmix64
    this.state = new Uint32Array(4);
    let tmp = seed;
    for (let i = 0; i < 4; i++) {
      tmp = this.mix32(tmp);
      this.state[i] = tmp;
    }
  }

  private mix32(x: number): number {
    x = ((x >>> 16) ^ x) * 0x45d9f3b;
    x = ((x >>> 16) ^ x) * 0x45d9f3b;
    x = (x >>> 16) ^ x;
    return x >>> 0;
  }

  private rotl(x: number, k: number): number {
    return (x << k) | (x >>> (32 - k));
  }

  /**
   * Generate next random number
   * @returns number between 0 and 1
   */
  public next(): number {
    const result = this.rotl(this.state[1] * 5, 7) * 9;
    const t = this.state[1] << 9;
    this.state[2] ^= this.state[0];
    this.state[3] ^= this.state[1];
    this.state[1] ^= this.state[2];
    this.state[0] ^= this.state[3];
    this.state[2] ^= t;
    this.state[3] = this.rotl(this.state[3], 11);
    return (result >>> 0) / 4294967296;
  }

  /**
   * Get a random integer between min and max (inclusive)
   */
  public range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Get a random item from an array
   */
  public pick<T>(array: T[]): T {
    return array[this.range(0, array.length - 1)];
  }

  /**
   * Get a random item from a Set
   */
  public pickFromSet<T>(set: Set<T>): T {
    const index = this.range(0, set.size - 1);
    let current = 0;
    for (const item of set) {
      if (current === index) return item;
      current++;
    }
    throw new Error('Set is empty');
  }

  /**
   * Get n random items from an array
   */
  public sample<T>(array: T[], n: number): T[] {
    if (n > array.length) {
      throw new Error('Sample size cannot be larger than array length');
    }
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.range(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result.slice(0, n);
  }

  /**
   * Get n random items from a Set
   */
  public sampleFromSet<T>(set: Set<T>, n: number): Set<T> {
    if (n > set.size) {
      throw new Error('Sample size cannot be larger than set size');
    }
    return new Set(this.sample(Array.from(set), n));
  }

  /**
   * Generate a random boolean with given probability
   */
  public boolean(probability = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Shuffle an array deterministically
   */
  public shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.range(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

/**
 * Session manager with improved random number generation
 */
class SessionManager {
  private readonly ip: string;
  private readonly timestamp: number;
  private readonly timeWindow: number;
  public readonly sessionId: string;
  public readonly random: Xoshiro128ss;
  public readonly expiresAt: number;
  public readonly createdAt: number;

  constructor(ip: string, options: { timestamp?: number, timeWindow?: number } = {}) {
    this.ip = this.normalizeIP(ip);
    this.timestamp = options.timestamp ?? Date.now();
    this.timeWindow = options.timeWindow ?? 10 * 1000; // 10 seconds

    const timeWindowStart = Math.floor(this.timestamp / this.timeWindow) * this.timeWindow;
    const compositeString = `${timeWindowStart}:${this.ip}`;
    const hash = this.simpleHash(compositeString);

    this.sessionId = hash.toString(36);
    this.random = new Xoshiro128ss(hash);
    this.expiresAt = timeWindowStart + this.timeWindow;
    this.createdAt = this.timestamp;
  }

  private normalizeIP(ip: string): string {
    if (!ip || ip === "unknown") {
      throw new Error('Valid IP address is required');
    }
    return ip.includes(':') ? this.normalizeIPv6(ip) : ip;
  }

  private normalizeIPv6(ipv6: string): string {
    return ipv6.startsWith('::ffff:') ? ipv6.slice(7) : ipv6.toLowerCase();
  }

  private simpleHash(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  public isValid(): { isValid: boolean; reason?: string; expiresIn?: number } {
    const currentTimestamp = Date.now();
    const isValid = currentTimestamp < this.expiresAt;

    return {
      isValid,
      reason: isValid ? undefined : 'Session expired',
      expiresIn: Math.max(0, this.expiresAt - currentTimestamp)
    };
  }

  /**
   * Generate a deterministic value based on a specific key
   */
  public deterministicValue(key: string): string {
    const compositeString = `${this.sessionId}:${key}`;
    const hash = this.simpleHash(compositeString);
    return hash.toString(36);
  }
}

export class ImageCoordinator extends DurableObject<Env> {
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT = 5000; // 5 seconds in milliseconds
  private readonly debug;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    this.env = env;
    this.debug = createDebugLogger(env);

    this.debug("ImageCoordinator initialized", {
      id: this.ctx.id.toString(),
      maxRetries: this.MAX_RETRIES,
      timeout: this.TIMEOUT
    });
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    retries = this.MAX_RETRIES
  ): Promise<T> {
    this.debug("Starting retry operation", {
      maxRetries: retries,
      timeout: this.TIMEOUT
    });

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.debug("Attempting operation", {
          attempt,
          maxRetries: retries
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Operation timed out')), this.TIMEOUT)
        );
        const operationPromise = operation();
        const result = await Promise.race([operationPromise, timeoutPromise]);

        this.debug("Operation completed successfully", {
          attempt,
          succeeded: true
        });

        return result as T;
      } catch (error) {
        this.debug("Operation attempt failed", {
          attempt,
          maxRetries: retries,
          error: error instanceof Error ? error.message : 'Unknown error',
          willRetry: attempt < retries
        });

        if (attempt === retries) throw error;

        const backoffTime = 2 ** (attempt - 1) * 1000;
        this.debug("Initiating exponential backoff", {
          attempt,
          backoffTime
        });

        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
    throw new Error('Should not reach here');
  }

  async get(): Promise<ArrayBuffer | undefined> {
    this.debug("Starting get operation", {
      id: this.ctx.id.toString()
    });

    try {
      const result = await this.retryOperation(async () => {
        this.debug("Attempting to retrieve cached image", {
          id: this.ctx.id.toString()
        });

        const cachedImage = await this.ctx.storage.get<ArrayBuffer>(
          this.ctx.id.toString(),
          {} satisfies DurableObjectGetOptions
        );

        if (!cachedImage) {
          this.debug("Cache miss - image not found", {
            id: this.ctx.id.toString()
          });
          throw new Error('Image not found');
        }

        this.debug("Successfully retrieved cached image", {
          id: this.ctx.id.toString(),
          size: cachedImage.byteLength
        });

        return cachedImage;
      });
      return result;
    } catch (error) {
      this.debug("Failed to get image", {
        id: this.ctx.id.toString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return undefined;
    }
  }

  async put(buffer: ArrayBuffer): Promise<boolean> {
    this.debug("Starting put operation", {
      id: this.ctx.id.toString(),
      bufferSize: buffer.byteLength
    });

    try {
      // Store the image in memory
      this.debug("Storing image in memory", {
        id: this.ctx.id.toString()
      });

      await this.ctx.storage.put(
        this.ctx.id.toString(),
        buffer,
        {} satisfies DurableObjectPutOptions
      );

      const alarmTime = Date.now() + 5 * 60 * 1000; // 5 minutes
      this.debug("Setting cleanup alarm", {
        id: this.ctx.id.toString(),
        alarmTime,
        timeoutMinutes: 5
      });

      await this.ctx.storage.setAlarm(
        alarmTime,
        {} satisfies DurableObjectSetAlarmOptions
      );

      this.debug("Successfully stored image and set alarm", {
        id: this.ctx.id.toString()
      });

      return true;
    } catch (error) {
      this.debug("Failed to store image", {
        id: this.ctx.id.toString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  async alarm(): Promise<void> {
    this.debug("Alarm triggered - starting cleanup", {
      id: this.ctx.id.toString()
    });

    try {
      await this.ctx.storage.delete(
        this.ctx.id.toString(),
        {} satisfies DurableObjectPutOptions
      );

      this.debug("Deleted stored image", {
        id: this.ctx.id.toString()
      });

      await this.ctx.storage.deleteAlarm({} satisfies DurableObjectSetAlarmOptions);

      this.debug("Deleted alarm", {
        id: this.ctx.id.toString()
      });
    } catch (error) {
      this.debug("Error during cleanup", {
        id: this.ctx.id.toString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// HELPERS

const isString = (s: unknown): s is string =>
  typeof s === "string" || s instanceof String;

/**
 * Compresses data using GZIP compression synchronously
 * @param input - The data to compress as an ArrayBuffer
 * @param validate - Optional validation function
 * @returns Compressed data as an ArrayBuffer
 * @throws Error if input is invalid or compression fails
 */
const compress = (
  input: ArrayBuffer,
  validate?: (input: ArrayBuffer) => boolean
): ArrayBuffer => {
  // Input validation
  if (!input || input.byteLength === 0) {
    throw new Error("Empty input provided for compression");
  }

  // Custom validation if provided
  if (validate && !validate(input)) {
    throw new Error("Input failed custom validation");
  }

  // Convert ArrayBuffer to Buffer for zlib operations
  const inputBuffer = Buffer.from(input);

  // Perform synchronous compression
  const compressed = gzipSync(inputBuffer, {
    level: 6,
    memLevel: 8,
  } satisfies ZlibOptions);

  // Convert back to ArrayBuffer
  return compressed.buffer.slice(
    compressed.byteOffset,
    compressed.byteOffset + compressed.byteLength
  );
}

/**
 * Decompresses GZIP compressed data synchronously
 * @param input - The compressed data as an ArrayBuffer
 * @param validate - Optional validation function
 * @returns Decompressed data as an ArrayBuffer
 * @throws Error if input is invalid or decompression fails
 */
const decompress = (
  input: ArrayBuffer,
  validate?: (input: ArrayBuffer) => boolean
): ArrayBuffer => {
  // Input validation
  if (!input || input.byteLength === 0) {
    throw new Error("Empty input provided for decompression");
  }

  // Verify GZIP magic number
  const header = new Uint8Array(input.slice(0, 2));
  if (header[0] !== 0x1f || header[1] !== 0x8b) {
    throw new Error("Invalid GZIP header");
  }

  // Custom validation if provided
  if (validate && !validate(input)) {
    throw new Error("Input failed custom validation");
  }

  // Convert ArrayBuffer to Buffer for zlib operations
  const inputBuffer = Buffer.from(input);

  // Perform synchronous decompression
  const decompressed = gunzipSync(inputBuffer);

  // Verify output
  if (decompressed.length === 0) {
    throw new Error("Decompression resulted in empty data");
  }

  // Convert back to ArrayBuffer
  return decompressed.buffer.slice(
    decompressed.byteOffset,
    decompressed.byteOffset + decompressed.byteLength
  );
}

const getClientIP = (req: Request, env: Env): string | undefined => {
  return env.ENVIRONMENT === "prod"
    ? req.headers.get("cf-connecting-ip") || req.headers.get("cf-connecting-ipv6") || undefined
    : env.ENVIRONMENT === 'dev' ? '127.0.0.1' : undefined;
}

const deferOrExecute = async (
  task: () => Promise<void>,
  deferredTasks: DeferredTask[] | undefined,
  env: Env,
): Promise<void> => {
  const debug = createDebugLogger(env);
  if (deferredTasks && env.ENVIRONMENT !== "prod") {
    debug("Queuing operation for later", {
      currentTaskCount: deferredTasks.length
    });
    deferredTasks.push(task);
  } else {
    debug("Executing operation immediately");
    await task();
  }
};

const getImagePage = (
  prefix: string,
  image: string,
  url: URL,
): string => {
  const action = `${prefix}ting`;
  const pageTitle = `${action.charAt(0).toUpperCase() + action.slice(1)} Dog`;
  const previewUrl = `${url.origin}/image.png`;
  const description = `A randomly generated image of a dog ${action}. View adorable AI-generated dog pictures.`;

  return htmlTemplate
    .replace(
      "{{PAGE_TITLE}}",
      `
      <title>${pageTitle}</title>
      <meta name="title" content="${pageTitle}">
      <meta name="description" content="${description}">
      <meta name="keywords" content="dog, ${action}, AI generated, pet pictures, cute dogs, ${prefix} dog">
      <meta name="robots" content="index, follow">
      <meta name="language" content="English">
      <meta name="author" content="Dog Image Generator">
      <meta name="theme-color" content="#f0f0f0">
      <meta property="og:title" content="${pageTitle}">
      <meta property="og:description" content="${description}">
      <meta property="og:image" content="${previewUrl}">
      <meta property="og:image:width" content="1200">
      <meta property="og:image:height" content="630">
      <meta property="og:image:alt" content="Generated Dog Image">
      <meta property="og:type" content="website">
      <meta property="og:url" content="${url.href}">
      <meta property="og:site_name" content="Dog Image Generator">
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="${pageTitle}">
      <meta name="twitter:description" content="${description}">
      <meta name="twitter:image" content="${previewUrl}">
      <meta name="twitter:image:alt" content="A dog ${action}">
      <meta name="mobile-web-app-capable" content="yes">
      <meta name="apple-mobile-web-app-status-bar-style" content="default">
      <meta name="apple-mobile-web-app-title" content="${pageTitle}">
      <meta name="format-detection" content="telephone=no">
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "ImageObject",
          "name": "${pageTitle}",
          "description": "${description}",
          "contentUrl": "${previewUrl}",
          "thumbnailUrl": "${previewUrl}",
          "datePublished": "${new Date().toISOString()}",
          "uploadDate": "${new Date().toISOString()}"
        }
      </script>
    `,
    )
    .replace(
      "{{BASE64_IMAGE}}",
      `<img 
        src="data:image/png;base64,${image}" 
        alt="A dog ${action}"
        loading="lazy"
        decoding="async"
        fetchpriority="high"
        srcset="${previewUrl}"
      >`,
    )
    .replace(
      "{{ICON_BASE64_DATA}}",
      `<link rel="icon" href="data:image/png;base64,${ICON_BASE64_DATA}" type="image/png">
       <link rel="apple-touch-icon" href="data:image/png;base64,${ICON_BASE64_DATA}">`,
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

const invalidateImageKey = async (
  badKey: string,
  subdomain: string,
  imageKeys: string[] | undefined,
  env: Env,
): Promise<void> => {
  const debug = createDebugLogger(env);
  let keys = imageKeys || undefined;
  if (!keys) {
    const result = await env.PREFIX_TO_IMAGES_KV.get(
      subdomain,
      "json",
    );

    // Safe type assertion to handle potential non-array values
    keys = Array.isArray(result) ? result : [];
  }

  debug("Starting invalidateImageKey", {
    badKey,
    subdomain,
    currentKeysCount: keys.length
  });

  if (!badKey || !subdomain) {
    debug("Invalid parameters provided", {
      hasBadKey: !!badKey,
      hasSubdomain: !!subdomain
    });
    return;
  }

  try {
    debug("Removing image from IMAGES_KV", {
      key: badKey
    });

    await env.IMAGES_KV.delete(badKey);

    debug("Image deleted from IMAGES_KV", {
      key: badKey
    });

    // Remove the key from the key list
    const originalKeyCount = keys.length;
    const updatedImageKeys = keys.filter(
      (key) => key !== badKey,
    ) satisfies Mapping["value"];

    debug("Filtered out bad key from image keys", {
      originalCount: originalKeyCount,
      newCount: updatedImageKeys.length,
      keysRemoved: originalKeyCount - updatedImageKeys.length,
      keyWasPresent: originalKeyCount !== updatedImageKeys.length
    });

    const metadata = {
      lastUpdated: Date.now(),
      count: updatedImageKeys.length,
    } satisfies Mapping["metadata"];

    debug("Updating PREFIX_TO_IMAGES_KV", {
      subdomain,
      newKeyCount: updatedImageKeys.length,
      lastUpdated: metadata.lastUpdated
    });

    // Update PREFIX_TO_IMAGES_KV
    await env.PREFIX_TO_IMAGES_KV.put(
      subdomain,
      JSON.stringify(updatedImageKeys),
      { metadata } satisfies KVNamespacePutOptions,
    );

    debug("Successfully updated PREFIX_TO_IMAGES_KV", {
      subdomain,
      finalKeyCount: updatedImageKeys.length
    });

  } catch (error) {
    debug("Error during image key invalidation", {
      badKey,
      subdomain,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      errorMessage: (error as Error).message ?? "Unknown error"
    });

    // Swallow
    console.error((error as Error).message ?? "");
  }
};

const servePreviewImage = async (
  session: SessionManager,
  subdomain: string,
  env: Env,
  deferredTasks: DeferredTask[],
): Promise<Response | undefined> => {
  const key = `${READY_IMAGE_KEY}_${subdomain}`;
  const debug = createDebugLogger(env);

  debug("Starting servePreviewImage", {
    subdomain,
    environment: env.ENVIRONMENT
  });

  const compressedImageResult = await env.IMAGES_KV.get(key, "arrayBuffer");

  debug("Retrieved compressed image result", {
    key,
    // hasResult: !!compressedImageResult,
    hasValue: !!compressedImageResult,
    valueSize: compressedImageResult?.byteLength
  });

  let bytes: Uint8Array;
  if (compressedImageResult !== null) {
    debug("Processing compressed image from KV", {
      key,
      compressedSize: compressedImageResult.byteLength
    });

    try {
      const decompressedData = decompress(compressedImageResult);
      debug("Image decompression successful", {
        key,
        compressedSize: compressedImageResult.byteLength,
        decompressedSize: decompressedData.byteLength
      });

      bytes = new Uint8Array(decompressedData);

      debug("Base64 decoding completed", {
        key,
        finalSize: bytes.length
      });

    } catch (error) {
      debug("Decompression error occurred", {
        key,
        errorType: (error as Error).constructor.name,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error(`Decompression error: ${(error as Error).message}`);
      await deferOrExecute(
        async () => {
          await invalidateImageKey(key, subdomain, undefined, env);
        },
        deferredTasks,
        env,
      );
      return undefined;
    }
  } else {
    debug("Attempting to fetch image from coordinator", {
      session: session.sessionId,
    });

    const coordinator = env.IMAGE_COORDINATOR.get(
      env.IMAGE_COORDINATOR.idFromName(session.sessionId)
    ) as DurableObjectStub<ImageCoordinator>;

    const imageData = await coordinator.get() as unknown as ArrayBuffer;

    debug("Coordinator image fetch result", {
      session: session.sessionId,
      hasImageData: !!imageData,
      dataSize: imageData?.byteLength
    });

    if (!imageData) {
      debug("No image data found in coordinator", {
        session: session.sessionId,
        key
      });
      return undefined;
    }

    bytes = new Uint8Array(imageData);
    debug("Image data retrieved from coordinator", {
      session: session.sessionId,
      finalSize: bytes.length
    });
  }

  debug("Serving image response", {
    key,
    session: session.sessionId,
    imageSize: bytes.length,
  });

  // Return the image directly with PNG content type
  return new Response(bytes, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=10',  // Cache for 10 seconds
    }
  });
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

const getImageKeysForSubdomain = async (
  subdomain: string,
  env: Env,
  deferredTasks: DeferredTask[] | undefined,
  validate: boolean = true
): Promise<string[]> => {
  const debug = createDebugLogger(env);
  try {
    const result = await env.PREFIX_TO_IMAGES_KV.get(
      subdomain,
      "json",
    );

    // Safe type assertion to handle potential non-array values
    const rawKeys = Array.isArray(result) ? result : [];

    // Attempt to parse and log invalid keys before validation
    const invalidKeys = rawKeys.filter(key => {
      try {
        CombinedImageKeySchema.parse(key);
        return false;
      } catch {
        return true;
      }
    });

    if (validate && invalidKeys.length > 0) {
      debug("Found invalid image keys:", {
        subdomain,
        invalidKeys,
        invalidKeyPatterns: invalidKeys.map(key => ({
          key,
          matchesImageKey: key.match(/^image_[a-z]+_[a-z0-9]+$/) !== null,
          matchesReadyImageKey: key.match(/^ready_image_[a-z]+$/) !== null
        }))
      });

      await deferOrExecute(async () => {
        await Promise.all(
          invalidKeys.map(invalidKey =>
            invalidateImageKey(invalidKey, subdomain, rawKeys, env)
          )
        );
      }, deferredTasks, env);
    }

    return ImageKeysSchema.parse(result) ?? [];
  } catch (error) {
    if (error instanceof z.ZodError) {
      debug("Keys validation error:", {
        subdomain,
        errors: error.errors,
        errorPaths: error.errors.map(e => ({
          path: e.path,
          message: e.message,
          code: e.code
        }))
      });
    } else {
      debug("Unexpected error while fetching image keys:", {
        subdomain,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    return [];
  }
};

const getAnImage = async (
  subdomain: string,
  key: string,
  imageKeys: string[] | undefined,
  env: Env,
  copyTo: string | undefined = undefined,
  deferredTasks: DeferredTask[] | undefined = undefined,
  decomp: boolean = true,
): Promise<string | undefined> => {
  const debug = createDebugLogger(env);
  debug("Starting getAnImage", {
    key,
    copyTo,
    hasDeferredTasks: !!deferredTasks,
    decompress: decomp,
    environment: env.ENVIRONMENT
  });

  // Atomic get operation
  let compressedImageResult: ArrayBuffer | null;
  try {
    compressedImageResult = await env.IMAGES_KV.get(key, "arrayBuffer");
  } catch (error) {
    debug("Error retrieving image from KV", {
      key,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return undefined;
  }

  if (compressedImageResult === null) {
    debug("Image not found in KV", { key });
    if (!key.startsWith('ready')) {
      await deferOrExecute(
        () => invalidateImageKey(key, subdomain, imageKeys, env),
        deferredTasks,
        env,
      );
    }
    return undefined;
  }

  debug("Retrieved compressed image from KV", {
    key,
    dataSize: compressedImageResult.byteLength
  });

  // Handle copy operation first, before any transformation
  if (copyTo) {
    debug("Setting up image copy operation", {
      fromKey: key,
      toKey: copyTo,
      isDeferredMode: !!deferredTasks && env.ENVIRONMENT === "dev"
    });

    const copyOperation = async () => {
      try {
        // Verify source still exists before copying
        const verifySource = await env.IMAGES_KV.get(key, "arrayBuffer");
        if (verifySource === null) {
          debug("Source image no longer exists during copy", {
            fromKey: key,
            toKey: copyTo
          });
          return;
        }

        await env.IMAGES_KV.put(copyTo, compressedImageResult, {
          // Optional: Add metadata or expiration
          expirationTtl: 86400 // 24 hours, adjust as needed
        } satisfies KVNamespacePutOptions);

        debug("Image copy completed", {
          fromKey: key,
          toKey: copyTo,
          dataSize: compressedImageResult.byteLength
        });
      } catch (error) {
        debug("Image copy failed", {
          fromKey: key,
          toKey: copyTo,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Optionally handle copy failure
      }
    };

    await deferOrExecute(copyOperation, deferredTasks, env);
  }

  // Handle decompression if requested
  if (decomp) {
    try {
      debug("Starting image decompression", {
        key,
        compressedSize: compressedImageResult.byteLength
      });

      const decompressed = decompress(compressedImageResult);
      const decoded = binaryToBase64(bytesToBinary(new Uint8Array(decompressed)));

      debug("Image decompression completed", {
        key,
        compressedSize: compressedImageResult.byteLength,
        decompressedSize: decompressed.byteLength,
        decodedLength: decoded.length
      });

      return decoded;
    } catch (error) {
      if (error instanceof z.ZodError) {
        debug("Image validation failed", {
          key,
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
        console.error("Image validation error:", error.errors);
      } else {
        debug("Decompression error occurred", {
          key,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error("Decompression error:",
          error instanceof Error ? error.message : 'Unknown error');
      }

      await deferOrExecute(
        () => invalidateImageKey(key, subdomain, imageKeys, env),
        deferredTasks,
        env,
      );
      return undefined;
    }
  }

  debug("Skipping decompression as requested", {
    key,
    dataSize: compressedImageResult.byteLength
  });
  return binaryToBase64(bytesToBinary(new Uint8Array(compressedImageResult)));
};

const prepareRandomImageForSubdomain = async (
  session: SessionManager,
  subdomain: string,
  imageKeys: string[],
  env: Env,
  deferredTasks: DeferredTask[] | undefined,
): Promise<void> => {
  if (imageKeys.length === 0) {
    return;
  }

  const key = session.random.pick(imageKeys);
  await getAnImage(
    subdomain,
    key,
    imageKeys,
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
  session: SessionManager,
  subdomain: string,
  imageKeys: string[] | undefined,
  env: Env,
  deferredTasks: DeferredTask[] | undefined,
) => {
  const debug = createDebugLogger(env);

  debug("Starting generateImageForSubdomain", {
    subdomain,
    hasExistingKeys: !!imageKeys,
    hasDeferredTasks: !!deferredTasks
  });

  if (!imageKeys) {
    debug("Fetching image keys for subdomain", { subdomain });
    imageKeys = await getImageKeysForSubdomain(subdomain, env, deferredTasks);
    debug("Retrieved image keys", {
      subdomain,
      keyCount: imageKeys.length
    });
  }

  const action = `${subdomain}ting`;
  const key = `image_${subdomain}_${Math.random().toString(36).slice(7)}`;

  debug("Generated image parameters", {
    key,
    action,
    subdomain
  });

  const selectedBreed = session.random.pick(dogBreeds);
  const selectedEnvironment = session.random.pick(environments);
  const selectedTime = session.random.pick(timeOfDay);

  const prompt = createImagePrompt(
    action,
    selectedBreed,
    selectedEnvironment,
    selectedTime
  );

  debug("Created image prompt", {
    action,
    breed: selectedBreed,
    environment: selectedEnvironment,
    timeOfDay: selectedTime,
    promptLength: prompt.length
  });

  const task1 = async () => {
    debug("Starting AI image generation task", {
      model: MODEL,
      key
    });

    const { image } = (await env.AI.run(
      MODEL as BaseAiTextToImageModels & "@cf/black-forest-labs/flux-1-schnell",
      { prompt },
      {} satisfies AiOptions,
    )) as unknown as { image: string };

    debug("AI generation completed", {
      hasImage: !!image,
      imageLength: image?.length
    });

    if (typeof image !== "string" || image.length === 0) {
      debug("Image generation failed", {
        imageType: typeof image,
        isEmpty: image?.length === 0
      });
      throw new Error("Image data is empty or not a string");
    }

    debug("Converting base64 to buffer", {
      originalLength: image.length
    });

    const buffer = Buffer.from(image, 'base64') as ArrayBuffer;

    debug("Storing image in coordinator", {
      session: session.sessionId,
      bufferSize: buffer.byteLength
    });

    await (env.IMAGE_COORDINATOR.get(env.IMAGE_COORDINATOR.idFromName(session.sessionId)) as DurableObjectStub<ImageCoordinator>).put(buffer);

    debug("Compressing image", {
      originalSize: buffer.byteLength
    });

    const compressedImage = compress(arrayFromB64(image)) satisfies Image["value"];

    debug("Image compressed", {
      key,
      originalSize: image.length,
      compressedSize: compressedImage.byteLength,
      compressionRatio: compressedImage.byteLength / image.length
    });

    debug("Storing compressed image in KV", {
      key,
      size: compressedImage.byteLength
    });

    await env.IMAGES_KV.put(key, compressedImage, {
      metadata: {
        contentType: "application/gzip",
        prefix: subdomain,
        generatedAt: Date.now(),
      } satisfies Image["metadata"],
    });

    debug("Image storage completed", { key });
  };

  const task2 = async () => {
    debug("Starting key addition task", {
      key,
      subdomain,
      existingKeysCount: imageKeys!.length
    });

    await addImageKeyToSubdomain(key, subdomain, imageKeys!.slice(), env);

    debug("Key addition completed", {
      key,
      subdomain
    });
  };

  await deferOrExecute(task1, deferredTasks, env);
  await deferOrExecute(task2, deferredTasks, env);
};

const debugImageForSubdomain = async (
  session: SessionManager,
  subdomain: string,
  imageKeys: string[] | undefined,
  env: Env,
  deferredTasks: DeferredTask[] | undefined,
) => {
  const debug = createDebugLogger(env);

  debug("Starting debugImageForSubdomain", {
    subdomain,
    hasExistingKeys: !!imageKeys
  });

  if (!imageKeys) {
    debug("Fetching image keys for subdomain", { subdomain });
    imageKeys = await getImageKeysForSubdomain(subdomain, env, deferredTasks);
    debug("Retrieved image keys", {
      subdomain,
      keyCount: imageKeys.length
    });
  }

  const action = `${subdomain}ting`;
  const key = `image_${subdomain}_${Math.random().toString(36).slice(7)}`;

  debug("Generated image key", {
    key,
    action
  });

  const selectedBreed = session.random.pick(dogBreeds);
  const selectedEnvironment = session.random.pick(environments);
  const selectedTime = session.random.pick(timeOfDay);

  const prompt = createImagePrompt(
    action,
    selectedBreed,
    selectedEnvironment,
    selectedTime
  );

  debug("Created image prompt", {
    action,
    breed: selectedBreed,
    environment: selectedEnvironment,
    timeOfDay: selectedTime,
    promptLength: prompt.length
  });

  debug("Initiating AI image generation", {
    model: MODEL,
    subdomain
  });

  const { image } = (await env.AI.run(
    MODEL as BaseAiTextToImageModels & "@cf/black-forest-labs/flux-1-schnell",
    { prompt },
    {} satisfies AiOptions,
  )) as unknown as { image: string };

  debug("AI generation completed", {
    hasImage: !!image,
    imageLength: image?.length
  });

  if (typeof image !== "string" || image.length === 0) {
    debug("Image generation failed", {
      imageType: typeof image,
      isEmpty: image?.length === 0
    });
    throw new Error("Image data is empty or not a string");
  }

  debug("Converting base64 to buffer", {
    originalLength: image.length
  });

  const buffer = Buffer.from(image, 'base64') as ArrayBuffer;

  debug("Storing image in coordinator", {
    session: session.sessionId,
    bufferSize: buffer.byteLength
  });

  await (env.IMAGE_COORDINATOR.get(env.IMAGE_COORDINATOR.idFromName(session.sessionId)) as DurableObjectStub<ImageCoordinator>).put(buffer);

  debug("Compressing image", {
    originalSize: buffer.byteLength
  });

  const compressedImage = compress(arrayFromB64(image)) satisfies Image["value"];

  debug("Image compressed", {
    originalSize: buffer.byteLength,
    compressedSize: compressedImage.byteLength,
    compressionRatio: compressedImage.byteLength / buffer.byteLength
  });

  debug("Storing compressed image in KV", {
    key,
    subdomain,
    size: compressedImage.byteLength
  });

  await env.IMAGES_KV.put(key, compressedImage, {
    metadata: {
      contentType: "application/gzip",
      prefix: subdomain,
      generatedAt: Date.now(),
    } satisfies Image["metadata"],
  });

  debug("Adding image key to subdomain", {
    key,
    subdomain,
    existingKeysCount: imageKeys.length
  });

  await addImageKeyToSubdomain(key, subdomain, imageKeys.slice(), env);

  debug("Debug image generation completed successfully", {
    key,
    subdomain,
    finalImageSize: compressedImage.byteLength
  });

  return image;
};

const addAnImage = async (session: SessionManager, env: Env, deferredTasks: DeferredTask[]) => {
  const debug = createDebugLogger(env);

  debug("Starting addAnImage", {
    totalSubdomains: subdomainPrefixes.size,
    imagesPerPrefix: IMAGES_PER_PREFIX
  });

  const subdomainArray = Array.from(subdomainPrefixes);
  const shuffledSubdomains = session.random.shuffle(subdomainArray);

  debug("Prepared shuffled subdomains", {
    subdomainCount: shuffledSubdomains.length
  });

  // Find the first non-full prefix
  for (const subdomain of shuffledSubdomains) {
    debug("Checking subdomain capacity", { subdomain });

    const imageKeys = await getImageKeysForSubdomain(subdomain, env, deferredTasks);
    debug("Retrieved current images for subdomain", {
      subdomain,
      currentImages: imageKeys.length,
      capacity: IMAGES_PER_PREFIX,
      isFull: imageKeys.length >= IMAGES_PER_PREFIX
    });

    if (imageKeys.length < IMAGES_PER_PREFIX) {
      debug("Found available subdomain for new image", {
        subdomain,
        currentCount: imageKeys.length,
        maxCount: IMAGES_PER_PREFIX,
        remainingCapacity: IMAGES_PER_PREFIX - imageKeys.length
      });

      debug("Initiating image generation", {
        subdomain,
        existingKeys: imageKeys.length
      });
      generateImageForSubdomain(session, subdomain, imageKeys, env, deferredTasks);

      debug("Preparing random image for subdomain", {
        subdomain,
        deferredTasksCount: deferredTasks.length
      });
      prepareRandomImageForSubdomain(session, subdomain, imageKeys, env, deferredTasks);

      debug("Successfully scheduled image addition", {
        subdomain,
        totalDeferredTasks: deferredTasks.length
      });
      return;
    }
  }

  debug("No available subdomains found for new image", {
    checkedSubdomains: shuffledSubdomains.length,
    allFull: true
  });
};

const serveRandomImageFromSubdomain = async (
  session: SessionManager,
  url: URL,
  subdomain: string,
  env: Env,
  deferredTasks: DeferredTask[],
): Promise<Response> => {
  const debug = createDebugLogger(env);

  debug("Starting serveRandomImageFromSubdomain", {
    url: url.toString(),
    subdomain,
    environment: env.ENVIRONMENT
  });

  let imageKeys: string[] | undefined;
  let imageKey: string | undefined;
  let image: string | undefined;

  try {
    imageKey = `${READY_IMAGE_KEY}_${subdomain}`;
    debug("Attempting to get ready image", { imageKey });

    image = await getAnImage(subdomain, imageKey, imageKeys, env);
    debug("Ready image fetch result", {
      imageKey,
      foundImage: !!image
    });

    if (!image) {
      debug("Cache miss on ready image", { subdomain });

      debug("Fetching image keys for subdomain", { subdomain });
      imageKeys = await getImageKeysForSubdomain(subdomain, env, deferredTasks);
      debug("Retrieved image keys", {
        subdomain,
        keyCount: imageKeys.length
      });

      if (imageKeys.length !== 0) {
        imageKey = session.random.pick(imageKeys);
        debug("Selected random image key", {
          imageKey,
          totalKeys: imageKeys.length
        });

        image = await getAnImage(
          subdomain,
          imageKey,
          imageKeys,
          env,
          `${READY_IMAGE_KEY}_${subdomain}`,
          deferredTasks,
        );
        debug("Random image fetch result", {
          imageKey,
          foundImage: !!image
        });
      }

      if (!image) {
        debug("Cache miss on subdomain image, generating new image", {
          subdomain,
          environment: env.ENVIRONMENT
        });

        const res =
          env.ENVIRONMENT !== "dev"
            ? async () => {
              debug("Generating debug image for development", { subdomain });
              const img = await debugImageForSubdomain(
                session,
                subdomain,
                imageKeys,
                env,
                deferredTasks,
              );
              debug("Debug image generated successfully");
              return getImagePage(subdomain, img, url);
            }
            : async () => {
              debug("Triggering production image generation", { subdomain });
              await generateImageForSubdomain(
                session,
                subdomain,
                imageKeys,
                env,
                deferredTasks,
              );
              debug("Production image generation initiated");
              return getBlankPage(
                "Generating new image, please try again shortly",
              );
            };

        const responseContent = await res();
        debug("Returning generation response", {
          status: env.ENVIRONMENT !== "dev" ? 200 : 202
        });

        return new Response(responseContent, {
          status: env.ENVIRONMENT !== "dev" ? 200 : 202,
          headers: {
            "Content-Type": "text/html;charset=UTF-8",
          },
        });
      }
    }

    debug("Serving existing image", {
      subdomain,
      imageKey,
      status: 200
    });

    return new Response(getImagePage(subdomain, image, url), {
      status: 200,
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
      },
    });
  } catch (error) {
    debug("Error in serveRandomImageFromSubdomain", {
      subdomain,
      imageKey,
      errorType: error instanceof z.ZodError ? 'ZodError' : 'GeneralError',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });

    if (imageKey && imageKeys) {
      debug("Scheduling image key invalidation", {
        imageKey,
        subdomain,
        totalKeys: imageKeys.length
      });
      const key = imageKey;
      const keys = imageKeys;
      await deferOrExecute(async () => await invalidateImageKey(key, subdomain, keys, env), deferredTasks, env);
    }

    if (error instanceof z.ZodError) {
      debug("Validation error encountered", {
        errors: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      });
      console.error("Critical validation error:", error.errors);
      throw error;
    }

    debug("Critical error encountered", {
      error: (error as Error).message
    });
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
  const allowedPaths = ["/image.png"]
  const deferredTasks: DeferredTask[] = [];
  const ip = getClientIP(req, env);
  const debug = createDebugLogger(env)

  debug("Request received", {
    url: req.url,
    method: req.method,
    ip,
    pathname: url.pathname,
  });

  // Rate limit
  if (ip) {
    let success;
    if (url.pathname.startsWith("/image.png")) {
      debug("Applying image rate limit for IP", { ip });
      success = (await env.RATE_LIMITER_IMAGES.limit({ key: ip })).success;
    } else {
      debug("Applying general rate limit for IP", { ip });
      success = (await env.RATE_LIMITER.limit({ key: ip })).success;
    }
    if (!success) {
      debug("Rate limit exceeded", { ip });
      return new Response("You are being rate limited", { status: 429 });
    }
  } else {
    debug("No IP address found in request");
    return new Response("Internal server error", { status: 500 });
  }

  const headers = Object.fromEntries(req.headers.entries());

  debug("Request headers", {
    headers,
    headerCount: Object.keys(headers).length
  });

  // WAF
  if (url.pathname !== "/" && !allowedPaths.includes(url.pathname)) {
    return new Response(undefined, { status: 404 });
  }

  // Handle cors
  const c = cors(defaultCorsOptions).corsMiddleware;
  if (req.method === "OPTIONS") {
    debug("Handling OPTIONS request");
    return c(req);
  }

  // Check if IP address
  const isIPv4 = IPV4_REGEX.test(url.hostname);
  const isIPv6 = IPV6_REGEX.test(url.hostname);
  debug("Hostname validation", { hostname: url.hostname, isIPv4, isIPv6 });

  if ((isIPv4 || isIPv6) && env.ENVIRONMENT !== "dev") {
    debug("Rejecting IP-based hostname access", { hostname: url.hostname });
    return c(req, new Response("Must request by domain", { status: 401 }));
  }

  // Get short-lived deterministic session
  const session = new SessionManager(ip);

  // Check if root domain
  const hostParts = url.hostname.split(".");
  const isSubdomain = subdomainPrefixes.has(hostParts[0])
  const randomSubdomain = session.random.pickFromSet(subdomainPrefixes);
  debug("Domain analysis", {
    hostname: url.hostname,
    hostParts,
    isSubdomain,
    randomSubdomain
  });

  if (!isSubdomain && env.ENVIRONMENT !== "dev") {
    // If not a subdomain, redirect to a random subdomain
    const newUrl = new URL(url);
    newUrl.hostname = `${randomSubdomain}.${env.ROOT_DOMAIN}`;
    debug("Redirecting to random subdomain", {
      from: url.hostname,
      to: newUrl.hostname
    });
    return c(req, Response.redirect(newUrl.toString(), 302));
  }

  const subdomain = env.ENVIRONMENT === "dev" ? randomSubdomain : hostParts[0];
  if (!subdomainPrefixes.has(subdomain)) {
    return c(req, new Response("Image not found", { status: 404 }));
  }
  debug("Final subdomain determination", { subdomain });

  if (url.pathname.startsWith("/image.png")) {
    const previewResponse = await servePreviewImage(session, subdomain, env, deferredTasks);
    if (previewResponse) {
      debug("Preview image served successfully", { subdomain });
      return previewResponse;
    }
    debug("Image not found", { subdomain });
    return c(req, new Response("Image not found", { status: 404 }));
  }

  try {
    debug("Attempting to serve random image", { subdomain });
    const res = c(
      req,
      await serveRandomImageFromSubdomain(session, url, subdomain, env, deferredTasks),
    );
    debug("Image served successfully", { subdomain });

    if (env.ENVIRONMENT === 'dev') {
      debug("Executing deferred tasks", { taskCount: deferredTasks.length });
      ctx.waitUntil(
        Promise.allSettled(deferredTasks.map((task) => task()) ?? []),
      );
    }

    return res;
  } catch (error) {
    debug("Error serving random image", {
      subdomain,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return c(req, new Response("Internal server error", { status: 500 }));
  }
};

export default {
  fetch: async (
    req: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> => await requestHandler(req, env, ctx),

  scheduled(event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    const deferredTasks: DeferredTask[] = [];
    const session = new SessionManager(Math.random().toString())
    addAnImage(session, env, deferredTasks);
  },
};
