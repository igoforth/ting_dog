// Generated by Wrangler by running `wrangler types --experimental-include-runtime --env production`

interface Env {
	PREFIX_TO_IMAGES_KV: KVNamespace;
	IMAGES_KV: KVNamespace;
	ENVIRONMENT: "prod";
	ROOT_DOMAIN: "ting.dog";
	RATE_LIMITER: RateLimit;
	AI: Ai;
}
