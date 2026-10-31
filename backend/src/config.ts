import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name} (see .env.example)`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  cloudflare: {
    accountId: required('CF_ACCOUNT_ID'),
    apiToken: required('CF_API_TOKEN'),
    chatModel: process.env.CF_CHAT_MODEL ?? '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    embeddingModel: process.env.CF_EMBEDDING_MODEL ?? '@cf/baai/bge-base-en-v1.5',
  },
};
