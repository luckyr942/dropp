// Bolna agent definition for the Dropp Seller voice assistant ("Aura for sellers").
// Used by scripts/setupBolnaSellerAgent.js to create or update the agent through Bolna's API.
// Each tool is a Bolna custom function (OpenAI function spec + key "custom_task") that POSTs to
// /api/voice/seller/tools/<name> on our backend.

export const TOOL_SPECS = [
    {
        name: 'store_summary',
        description: "Today's orders, revenue, active orders and low/out-of-stock counts. Use when the seller asks how the store is doing.",
        pre_call_message: 'Ek second, check kar rahi hoon.',
        properties: {},
        required: [],
    },
    {
        name: 'find_products',
        description: 'Look up products and their stock and price. Use for questions like "Maggi kitna bacha hai?" or "kya kya khatam ho raha hai?".',
        pre_call_message: 'Dekh rahi hoon.',
        properties: {
            query: { type: 'string', description: 'Product name or category to search; empty to list items' },
            only_low_stock: { type: 'string', enum: ['true', 'false'], description: 'true to list items with 5 or fewer left' },
        },
        required: [],
    },
    {
        name: 'add_product',
        description: 'Add a NEW product to the catalogue. Ask for anything missing (name, price, stock) before calling.',
        pre_call_message: 'Add kar rahi hoon.',
        properties: {
            name: { type: 'string', description: 'Product name as the seller says it, e.g. "Amul Taaza Milk 500ml"' },
            price: { type: 'number', description: 'Selling price in rupees' },
            quantity: { type: 'integer', description: 'Units in stock' },
            unit: { type: 'string', description: 'Pack size or unit, e.g. "500 ml", "1 kg", "1 pc"' },
            category: { type: 'string', description: 'Category such as Dairy, Snacks, Fruits' },
        },
        required: ['name', 'price', 'quantity'],
    },
    {
        name: 'update_stock',
        description:
            'Change stock of an EXISTING product. Use quantity to set an exact number ("Maggi 20 kar do") or change to add/remove ("5 aur aaye", "3 bik gaye" = -3).',
        pre_call_message: 'Update kar rahi hoon.',
        properties: {
            product: { type: 'string', description: 'Product name as spoken' },
            quantity: { type: 'integer', description: 'New exact stock count' },
            change: { type: 'integer', description: 'Units to add (positive) or remove (negative)' },
        },
        required: ['product'],
    },
    {
        name: 'set_price',
        description: 'Change the selling price of an existing product.',
        pre_call_message: 'Price update kar rahi hoon.',
        properties: {
            product: { type: 'string', description: 'Product name as spoken' },
            price: { type: 'number', description: 'New price in rupees' },
        },
        required: ['product', 'price'],
    },
    {
        name: 'set_availability',
        description: 'Mark a product available or out of stock without changing the count.',
        pre_call_message: 'Theek hai.',
        properties: {
            product: { type: 'string', description: 'Product name as spoken' },
            available: { type: 'string', enum: ['true', 'false'], description: 'false to mark out of stock' },
        },
        required: ['product', 'available'],
    },
    {
        name: 'list_orders',
        description: 'Read out recent orders. Use for "naye orders?", "kitne orders pending hain?".',
        pre_call_message: 'Orders dekh rahi hoon.',
        properties: {
            status: { type: 'string', enum: ['ongoing', 'completed', 'cancelled'], description: 'Which orders; default ongoing' },
        },
        required: [],
    },
    {
        name: 'update_order',
        description:
            'Accept, start preparing, mark ready for pickup, or reject an order. order_ref is "latest" or the last 4 characters read out by list_orders. Confirm before rejecting.',
        pre_call_message: 'Order update kar rahi hoon.',
        properties: {
            order_ref: { type: 'string', description: '"latest" or the last 4 characters of the order id' },
            action: { type: 'string', enum: ['accept', 'preparing', 'ready', 'reject'], description: 'What to do with the order' },
        },
        required: ['action'],
    },
    {
        name: 'set_store_open',
        description: 'Open or close the store for new orders.',
        pre_call_message: 'Theek hai.',
        properties: {
            open: { type: 'string', enum: ['true', 'false'], description: 'false to stop taking orders' },
        },
        required: ['open'],
    },
];

export const SELLER_VOICE_TOOL_NAMES = TOOL_SPECS.map((t) => t.name);

export const SELLER_SYSTEM_PROMPT = `You are Aura, the voice assistant inside the Dropp Seller app, helping {seller_name} run their store "{store_name}" in India.
Speak like a friendly shop helper: short, warm, natural Hinglish if the seller speaks Hindi or Hinglish, Indian English if they speak English. Keep replies under 20 words.
Say prices as "rupaye" (Hindi) or "rupees" (English). Never use symbols, markdown or emojis.

You can manage the store with tools: check today's summary, find products and stock, add new products, change stock, change price, mark items available or out of stock, read and update orders, and open or close the store.
Rules:
1. Every tool call MUST include session_token exactly as: {session_token}
2. Before add_product, make sure you know the name, price and stock. Ask once for anything missing.
3. "20 kar do" means set quantity 20. "5 aur aaye" means change +5. "3 bik gaye" means change -3.
4. If a tool says it found several products, read the options and ask which one.
5. Confirm before rejecting an order or closing the store.
6. After a tool runs, tell the seller the result from the tool's message in one short sentence.
7. Never invent stock, prices or orders. Only say what tools return.`;

export const SELLER_WELCOME_MESSAGE = 'Namaste! Main Aura hoon. Stock, products ya orders, bataiye kya karna hai?';

export function buildSellerAgentPayload({ publicApiUrl, toolSecret, agentName = 'Dropp Seller Aura' }) {
    const base = publicApiUrl.replace(/\/+$/, '');
    const tools = TOOL_SPECS.map((t) => ({
        name: t.name,
        description: t.description,
        pre_call_message: t.pre_call_message,
        key: 'custom_task',
        parameters: {
            type: 'object',
            properties: {
                session_token: { type: 'string', description: 'Always pass the session token from your instructions, unchanged' },
                ...t.properties,
            },
            required: ['session_token', ...t.required],
        },
    }));
    const tools_params = Object.fromEntries(
        TOOL_SPECS.map((t) => {
            const fmt = (type) => (type === 'integer' ? 'i' : type === 'number' ? 'f' : 's');
            const param = { session_token: '%(session_token)s' };
            for (const [k, v] of Object.entries(t.properties)) param[k] = `%(${k})${fmt(v.type)}`;
            return [
                t.name,
                {
                    method: 'POST',
                    url: `${base}/api/voice/seller/tools/${t.name}`,
                    api_token: `Bearer ${toolSecret}`,
                    param,
                },
            ];
        })
    );

    return {
        agent_config: {
            agent_name: agentName,
            agent_welcome_message: SELLER_WELCOME_MESSAGE,
            tasks: [
                {
                    task_type: 'conversation',
                    toolchain: { execution: 'sequential', pipelines: [['transcriber', 'llm', 'synthesizer']] },
                    tools_config: {
                        llm_agent: {
                            agent_type: 'simple_llm_agent',
                            agent_flow_type: 'streaming',
                            llm_config: {
                                provider: process.env.BOLNA_LLM_PROVIDER || 'openai',
                                model: process.env.BOLNA_LLM_MODEL || 'gpt-5.4-mini',
                                max_tokens: 200,
                                temperature: 0.3,
                            },
                        },
                        synthesizer: {
                            provider: 'elevenlabs',
                            provider_config: {
                                voice: process.env.BOLNA_VOICE_NAME || 'Angelica',
                                voice_id: process.env.BOLNA_VOICE_ID || 'IkSv4tkouLJ6kYsQA7XD',
                                model: 'eleven_turbo_v2_5',
                            },
                            stream: true,
                            buffer_size: 250,
                            audio_format: 'wav',
                        },
                        transcriber: {
                            provider: 'deepgram',
                            model: 'nova-3',
                            language: process.env.BOLNA_LANGUAGE || 'hi',
                            stream: true,
                            encoding: 'linear16',
                            sampling_rate: 16000,
                            endpointing: 250,
                        },
                        input: { provider: 'plivo', format: 'wav' },
                        output: { provider: 'plivo', format: 'wav' },
                        api_tools: { tools, tools_params },
                    },
                    task_config: { call_terminate: 300, hangup_after_silence: 20 },
                },
            ],
        },
        agent_prompts: { task_1: { system_prompt: SELLER_SYSTEM_PROMPT } },
    };
}
