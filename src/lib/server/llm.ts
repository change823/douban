import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '$env/dynamic/private';

// --- Types ---
interface LLMResponse {
  text: string;
  model: string;
}

export interface ApiKeys {
  google?: string;
  deepseek?: string;
  qwen?: string;
  doubao?: string;
  zhipu?: string;
  chatgpt?: string;
}

// --- Providers ---

async function callGemini(prompt: string, apiKey?: string): Promise<LLMResponse> {
  const key = apiKey || env.GOOGLE_API_KEY;
  if (!key) throw new Error("Missing GOOGLE_API_KEY");
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const result = await model.generateContent(prompt);
  const response = result.response;
  return { text: response.text(), model: 'Gemini 2.5 Flash' };
}

async function callDeepSeek(prompt: string, apiKey?: string): Promise<LLMResponse> {
  const key = apiKey || env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("Missing DEEPSEEK_API_KEY");

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ key }`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      stream: false
    })
  });

  if (!response.ok) throw new Error(`DeepSeek API Error: ${ response.status }`);
  const data = await response.json();
  return { text: data.choices[0].message.content, model: 'DeepSeek V3' };
}

async function callQwen(prompt: string, apiKey?: string): Promise<LLMResponse> {
  // Qwen via Alibaba DashScope (OpenAI Compatible)
  const key = apiKey || env.DASHSCOPE_API_KEY;
  if (!key) throw new Error("Missing DASHSCOPE_API_KEY");

  const model = env.DASHSCOPE_MODEL_ID || 'qwen-plus';

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ key }`
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) throw new Error(`Qwen API Error: ${ response.status }`);
  const data = await response.json();
  return { text: data.choices[0].message.content, model: `Qwen (${ model })` };
}

async function callDoubao(prompt: string, apiKey?: string): Promise<LLMResponse> {
  // Doubao via DOUBAO (OpenAI Compatible)
  const key = apiKey || env.DOUBAO_API_KEY;
  if (!key || !env.DOUBAO_ENDPOINT_ID_TEXT) throw new Error("Missing DOUBAO credentials");

  const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ key }`
    },
    body: JSON.stringify({
      model: env.DOUBAO_ENDPOINT_ID_TEXT,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) throw new Error(`Doubao API Error: ${ response.status }`);
  const data = await response.json();
  return { text: data.choices[0].message.content, model: 'Doubao' };
}

async function callZhipu(prompt: string, apiKey?: string): Promise<LLMResponse> {
  const key = apiKey || env.ZHIPU_API_KEY;
  if (!key) throw new Error("Missing ZHIPU_API_KEY");

  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ key }`
    },
    body: JSON.stringify({
      model: 'glm-4-plus',
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) throw new Error(`Zhipu API Error: ${ response.status }`);
  const data = await response.json();
  return { text: data.choices[0].message.content, model: 'GLM-4 Plus' };
}

async function callOpenAI(prompt: string, apiKey?: string): Promise<LLMResponse> {
  const key = apiKey || env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY");

  const model = env.OPENAI_MODEL_ID || 'gpt-5';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ key }`
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) throw new Error(`OpenAI API Error: ${ response.status }`);
  const data = await response.json();
  return { text: data.choices[0].message.content, model: `OpenAI (${ model })` };
}

/** 中转站：OpenAI 兼容接口，使用自定义 URL + 模型 + Key，可作为默认无需用户填 Key */
async function callRelay(prompt: string, _apiKey?: string): Promise<LLMResponse> {
  const baseUrl = (env.RELAY_BASE_URL || '').replace(/\/+$/, '');
  const model = env.RELAY_MODEL || 'gpt-4o';
  const key = env.RELAY_API_KEY;
  if (!baseUrl || !key) throw new Error("Missing RELAY_BASE_URL or RELAY_API_KEY");

  const url = /\/v1\/?$/.test(baseUrl) ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ key }`
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      stream: false
    })
  });

  if (!response.ok) throw new Error(`Relay API Error: ${ response.status } ${ response.statusText }`);

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  // 中转站可能强制返回 SSE 流式，需解析 data: {...} 行
  if (contentType.includes('text/event-stream') || text.trimStart().startsWith('data:')) {
    let content = '';
    for (const line of text.split('\n')) {
      const s = line.trim();
      if (s.startsWith('data:')) {
        const payload = s.slice(5).trim();
        if (payload === '[DONE]') break;
        try {
          const chunk = JSON.parse(payload);
          const choice = chunk.choices?.[0];
          if (choice?.delta?.content != null) content += choice.delta.content;
          if (choice?.message?.content != null) content += choice.message.content;
        } catch {
          // 忽略单行解析失败
        }
      }
    }
    return { text: content.trim(), model: `Relay (${ model })` };
  }

  const data = JSON.parse(text);
  return { text: data.choices?.[0]?.message?.content ?? '', model: `Relay (${ model })` };
}

// --- Main Router ---

export async function generateRoast(prompt: string, apiKeys?: ApiKeys): Promise<LLMResponse> {
  const providers: Array<{ name: string, fn: (p: string, k?: string) => Promise<LLMResponse>, key?: string }> = [];

  // 中转站优先：配置了 RELAY_* 时作为默认，用户无需填 Key
  if (env.RELAY_BASE_URL && env.RELAY_API_KEY) {
    providers.push({ name: 'Relay', fn: callRelay });
  }
  // Add providers if they have a key either in env or provided by user
  if (env.GOOGLE_API_KEY || apiKeys?.google) providers.push({ name: 'Gemini', fn: callGemini, key: apiKeys?.google });
  if (env.DEEPSEEK_API_KEY || apiKeys?.deepseek) providers.push({ name: 'DeepSeek', fn: callDeepSeek, key: apiKeys?.deepseek });
  if (env.DASHSCOPE_API_KEY || apiKeys?.qwen) providers.push({ name: 'Qwen', fn: callQwen, key: apiKeys?.qwen });
  if ((env.DOUBAO_API_KEY || apiKeys?.doubao) && env.DOUBAO_ENDPOINT_ID_TEXT) providers.push({ name: 'Doubao', fn: callDoubao, key: apiKeys?.doubao });
  if (env.ZHIPU_API_KEY || apiKeys?.zhipu) providers.push({ name: 'Zhipu', fn: callZhipu, key: apiKeys?.zhipu });
  if (env.OPENAI_API_KEY || apiKeys?.chatgpt) providers.push({ name: 'OpenAI', fn: callOpenAI, key: apiKeys?.chatgpt });

  if (providers.length === 0) {
    throw new Error('No LLM providers configured. Please provide an API Key or set one on the server.');
  }

  // Strategy: If user provides specific keys, ONLY use those providers.
  // This allows user to force a specific model/provider by only providing that key.
  const userProviders = providers.filter(p => p.key);
  const pool = userProviders.length > 0 ? userProviders : providers;

  const selected = pool[Math.floor(Math.random() * pool.length)];
  console.log(`[LLM] Selected Provider: ${ selected.name } ${ selected.key ? '(User Key)' : '(Server Key)' }`);

  try {
    return await selected.fn(prompt, selected.key);
  } catch (error) {
    console.error(`[LLM] Provider ${ selected.name } failed:`, error);

    // Fallback logic
    const backupPool = pool.filter(p => p.name !== selected.name);

    if (backupPool.length > 0) {
      const backup = backupPool[Math.floor(Math.random() * backupPool.length)];
      console.log(`[LLM] Falling back to: ${ backup.name }`);
      return await backup.fn(prompt, backup.key);
    }
    throw error;
  }
}
