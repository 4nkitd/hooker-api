import { v4 as uuidv4 } from 'uuid';

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
		const now_timestamp = new Date().toISOString();
		const insertQuery = ` INSERT INTO webhooks
			( uuid, user_id, description, active, total_req_count, is_redirect, custom_js, salt, updated_at, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`;
		await client.prepare(insertQuery).bind(snowflakeId, null, null, 1, 0, 0, null, null, now_timestamp, now_timestamp).run();

		return new Response(JSON.stringify({ status: true, id: snowflakeId }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return new Response(JSON.stringify({
			"status": false,
			"error": "Error while creating new hook",
			"log": error.message,
		}), { status: 500 });
	}

}

async function handleNewRequest(request: Request, env: Env): Promise<Response> {

	const client = env.DB;

	try {

		let hookId = request.url.split('/r/').pop();

		if (!hookId) {
			return new Response(JSON.stringify({
				"status": false,
				"error": "Hook ID not found",
			}), { status: 400 });
		}

		const selectQuery = `SELECT * FROM webhooks WHERE uuid = ?`;
		const webhookData = await client.prepare(selectQuery).bind(hookId).first();

		if (!webhookData) {
			return new Response(JSON.stringify({
				"status": false,
				"error": "Webhook not found",
			}), { status: 404 });
		}

		let requestbody = await request.json();
		let headers = JSON.stringify(request.headers);
		let method = request.method;
		let ip = request.headers.get('cf-connecting-ip');

		let requestID = uuidv4();

		const now_timestamp = new Date().toISOString();
		const insertQuery = `INSERT INTO requests
			(uuid,webhook_id, body, headers, ip, method, is_cron, updated_at, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`;
		await client.prepare(insertQuery).bind(requestID, hookId, JSON.stringify(requestbody), headers, ip, method, 0, now_timestamp, now_timestamp).run();
		return new Response(JSON.stringify({ status: true, id: requestID, webhhok: webhookData }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return new Response(JSON.stringify({
			"status": false,
			"error": "Error while creating new hook",
			"log": error.message,
		}), { status: 500 });
	}

}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname === '/new/hook') {
			return handleNewHookRequest(request, env);
		}
		const rPathMatch = url.pathname.match(/^\/r\/(.+)/);
		if (rPathMatch) {
			return handleNewRequest(request, env);
		}
		return new Response('Hello World!');
	},
} satisfies ExportedHandler<Env>;
