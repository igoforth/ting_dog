# Ting Dog

Ting Dog is a Cloudflare Workers project that generates and serves AI-generated images of dogs performing various "-ting" actions (e.g., sitting, waiting, barking). The project uses subdomains to categorize different actions and provides a fun, interactive way to view unique dog images.

## Features

- AI-generated dog images based on "-ting" actions
- Subdomain-based routing for different actions
- Image caching and compression
- Rate limiting to prevent abuse
- Daily scheduled task to generate new images

## Setup

1. Install dependencies:
   npm install

2. Configure your `wrangler.toml` file with your Cloudflare account details and KV namespace IDs.

3. Deploy the worker:
   wrangler deploy

## Development

To run the project locally:

wrangler dev

## Deployment

The project is configured for both development and production environments. To deploy to production:

wrangler deploy --env production

## Environment Variables

- `ENVIRONMENT`: Set to "dev" for development and "prod" for production
- `ROOT_DOMAIN`: The root domain for the project (e.g., "ting.dog")

## KV Namespaces

The project uses two KV namespaces:

- `PREFIX_TO_IMAGES_KV`: Stores the mapping between prefixes and image keys
- `IMAGES_KV`: Stores the compressed images

## AI Integration

The project uses Cloudflare's AI capabilities to generate images. Make sure you have the necessary permissions and bindings set up in your Cloudflare account.

## Rate Limiting

Rate limiting is implemented to prevent abuse. The current configuration allows 1 request per 10 seconds per IP address.

## Custom Domains

The project is set up to work with multiple subdomains. Each subdomain corresponds to a different "-ting" action for the dogs.

## Contributing

Feel free to submit issues or pull requests if you have suggestions for improvements or find any bugs.

## License

[Add your chosen license here]
