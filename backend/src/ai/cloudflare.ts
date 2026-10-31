import { config } from '../config';

// Workers AI OpenAI-compatible endpoints.
const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${config.cloudflare.accountId}/ai/v1`;

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string | Record<string, unknown> };
}

export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

export interface ToolDefinition {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.cloudflare.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Cloudflare AI ${path} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export async function embed(texts: string[]): Promise<number[][]> {
  const res = await post<{ data: { embedding: number[]; index: number }[] }>('/embeddings', {
    model: config.cloudflare.embeddingModel,
    input: texts,
  });
  return res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
}

export async function chat(
  messages: ChatMessage[],
  tools?: ToolDefinition[],
  options: ChatOptions = {},
): Promise<{ content: string | null; tool_calls?: ToolCall[] }> {
  const res = await post<{ choices: { message: { content: string | null; tool_calls?: ToolCall[] } }[] }>(
    '/chat/completions',
    {
      model: config.cloudflare.chatModel,
      messages,
      tools,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature,
    },
  );
  return res.choices[0].message;
}

/** Asks the model for JSON and parses the first {...} block in its reply. */
export async function chatJson(messages: ChatMessage[], options: ChatOptions = {}): Promise<unknown> {
  const reply = await chat(messages, undefined, { temperature: 0, ...options });
  const text = reply.content ?? '';
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('Model did not return JSON');
  return JSON.parse(text.slice(start, end + 1));
}
