import { v4 as uuidv4 } from 'uuid';
import { Client } from 'pg';

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// Removed duplicate default export
async function handleNewHookRequest(request: Request, env: Env): Promise<Response> {
	if (request.method !== 'POST') {
		return new Response('Method Not Allowed', { status: 405 });
	}

	const client = env.DB;

	try {
		const snowflakeId = uuidv4();
		const insertQuery = ` INSERT INTO webhooks
			(uuid, user_id, description, active, total_req_count, is_redirect, custom_js, salt, updated_at, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
		`;
		await client.prepare(insertQuery).bind(snowflakeId, null, null, 1, 0, 0, null, null).run();

		return new Response(JSON.stringify({ id: snowflakeId }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return new Response('Internal Server Error', { status: 500 });
	}

}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname === '/new/hook') {
			return handleNewHookRequest(request, env);
		}
		return new Response('Hello World!');
	},
} satisfies ExportedHandler<Env>;
