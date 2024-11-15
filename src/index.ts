import { v4 as uuidv4 } from 'uuid';

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
	"Access-Control-Max-Age": "86400",
}

// Removed duplicate default export
async function handleNewHookRequest(request: Request, env: Env): Promise<Response> {

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
			headers: { 'Content-Type': 'application/json', ...corsHeaders },
		});
	} catch (error) {
		return new Response(JSON.stringify({
			"status": false,
			"error": "Error while creating new hook",
			"log": error.message,
		}), { status: 500, headers: corsHeaders });
	}

}

async function handleNewRequest(request: Request, env: Env): Promise<Response> {

	const client = env.DB;

	try {

		let hookId = request.url.split('/r/').pop();

		if (hookId && hookId.includes('?')) {
			hookId = hookId.split('?')[0];
		}


		const url = new URL(request.url);
		const queryParams = Object.fromEntries(url.searchParams.entries());

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
			}), { status: 404, headers: corsHeaders});
		}

		let requestBody = "";

		if ( request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH' ) {

			if (request.headers.get('content-type') === 'application/json') {
				let jsonBody = await request.json();
				requestBody = JSON.stringify(jsonBody);
			} else if (request.headers.get('content-type') === 'application/x-www-form-urlencoded') {
				const formData = await request.formData();
				requestBody = JSON.stringify(Object.fromEntries(formData.entries()));
			} else {
				requestBody = await request.text();
			}

			if (!requestBody) {
				requestBody = "{}";
			}

		}

		let headersObject = Object.fromEntries(request.headers);
		headersObject['query_params'] = JSON.stringify(queryParams);
		let headers = JSON.stringify(headersObject);
		let method = request.method;

		let ip = request.headers.get('cf-connecting-ip');

		let requestID = uuidv4();

		const now_timestamp = new Date().toISOString();
		const insertQuery = `INSERT INTO requests
			(uuid, webhook_id, body, headers, ip, method, is_cron, updated_at, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`;
		await client.prepare(insertQuery).bind(requestID, hookId,requestBody, headers, ip, method, 0, now_timestamp, now_timestamp).run();
		return new Response(JSON.stringify({ status: true, id: requestID, webhook_id: webhookData.id }), {
			headers: { 'Content-Type': 'application/json', ...corsHeaders },
		});
	} catch (error) {
		return new Response(JSON.stringify({
			"status": false,
			"error": "Error while creating new hook",
			"log": error.message,
		}), { status: 500, headers: corsHeaders });
	}

}

async function handleWebhookListRequest(request: Request, env: Env): Promise<Response> {
	const client = env.DB;
	try {


		const selectQuery = `SELECT * FROM webhooks `;
		const webhooks = await client.prepare(selectQuery).all();
		if (!webhooks) {
			return new Response(JSON.stringify({
				"status": false,
				"error": "Webhooks not found",
			}), { status: 404, headers: corsHeaders });
		}

		const webhooks_list = webhooks.results

		return new Response(JSON.stringify({ status: true, webhooks: webhooks_list }), {
			headers: { 'Content-Type': 'application/json', ...corsHeaders },
		});
	} catch (error) {
		return new Response(JSON.stringify({
			"status": false,
			"error": "Error while fetching webhooks",
			"log": error.message,
		}), { status: 500, headers: corsHeaders });
	}
}

async function handleWebhookRequestsList(request: Request, env: Env): Promise<Response> {
	const client = env.DB;
	try {

		// query param
		let sort = request.url.split('?sort=').pop();

		let follow = ""
		if(sort === 'old') {
			follow = "ASC"
		} else {
			follow = "DESC"
		}

		const url = new URL(request.url);
		const webhookId = url.pathname.split('/webhook/')[1].split('/list')[0];

		if (!webhookId) {
			return new Response(JSON.stringify({
				"status": false,
				"error": "Webhook ID not found",
			}), { status: 400, headers: corsHeaders });
		}

		const selectQuery = `SELECT ip, method, uuid, created_at FROM requests WHERE webhook_id = ? ORDER BY created_at ${follow}`;
		const requests = await client.prepare(selectQuery).bind(webhookId).all();
		if (!requests) {
			return new Response(JSON.stringify({
				"status": false,
				"error": "Requests not found",
			}), { status: 404, headers: corsHeaders });
		}

		const webhook_requests = requests.results
		return new Response(JSON.stringify({ status: true, requests: webhook_requests }), {
			headers: { 'Content-Type': 'application/json', ...corsHeaders },
		});
	} catch (error) {
		return new Response(JSON.stringify({
			"status": false,
			"error": "Error while fetching requests",
			"log": error.message,
		}), { status: 500, headers: corsHeaders });
	}
}

async function handleRequestDetails(request: Request, env: Env): Promise<Response> {
	const client = env.DB;
	try {
		const url = new URL(request.url);
		const requestId = url.pathname.split('/request/')[1];

		if (!requestId) {
			return new Response(JSON.stringify({
				"status": false,
				"error": "Request ID not found",
			}), { status: 400, headers: corsHeaders });
		}

		const selectQuery = `SELECT * FROM requests WHERE uuid = ?`;
		const requestData = await client.prepare(selectQuery).bind(requestId).first();

		if (!requestData) {
			return new Response(JSON.stringify({
				"status": false,
				"error": "Request not found",
			}), { status: 404, headers: corsHeaders });
		}

		return new Response(JSON.stringify({ status: true, data: requestData }), {
			headers: { 'Content-Type': 'application/json', ...corsHeaders },
		});
	} catch (error) {
		return new Response(JSON.stringify({
			"status": false,
			"error": "Error while fetching request details",
			"log": error.message,
		}), { status: 500, headers: corsHeaders });
	}
}

async function handleOptions(request: Request): Promise<Response> {

	return new Response(null, {
		headers: {
			...corsHeaders,
			"Access-Control-Allow-Headers": request.headers.get(
				"Access-Control-Request-Headers"
			) || "",
		},
	});

}

export default {
	async fetch(request, env, ctx): Promise<Response> {

		if (request.method === "OPTIONS") {
			return handleOptions(request);
		}

		const url = new URL(request.url);
		if (url.pathname === '/new/hook') {
			return handleNewHookRequest(request, env);
		}
		const rPathMatch = url.pathname.match(/^\/r\/(.+)/);
		if (rPathMatch) {
			return handleNewRequest(request, env);
		}

		if (url.pathname === '/webhook/list') {
			return handleWebhookListRequest(request, env);
		}

		const webhookListMatch = url.pathname.match(/^\/webhook\/(.+)\/list/);
		if (webhookListMatch) {
			return handleWebhookRequestsList(request, env);
		}

		const requestDetailsMatch = url.pathname.match(/^\/request\/(.+)/);
		if (requestDetailsMatch) {
			return handleRequestDetails(request, env);
		}

		return new Response('Hello World!');
	},
} satisfies ExportedHandler<Env>;
