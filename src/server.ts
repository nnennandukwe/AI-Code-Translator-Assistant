import 'dotenv/config';
import OpenAI from 'openai';
import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';

const server = fastify({ logger: true });
// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

server.register(fastifyStatic, {
  root: path.join(__dirname, '../public'),
  prefix: '/',
});

server.get('/', (request, reply) => {
  reply.sendFile('index.html');
});

server.post('/translate', async (request, reply) => {
  const { code } = request.body as { code: string };
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that converts JavaScript code to TypeScript.' },
        { role: 'user', content: `Translate the following JavaScript code to idiomatic TypeScript, adding type annotations where appropriate:\n\n${code}` }
      ],
      temperature: 0
    });
    const tsCode = (completion.choices[0].message.content)?.replace(/```typescript/g, '').replace(/```/g, '') || '';
    return { code: tsCode };
  } catch (err) {
    server.log.error(err);
    reply.status(500).send({ error: 'Translation failed.' });
  }
});

const start = async () => {
  try {
    await server.listen({ port: 3000 });
    server.log.info(`Server running at http://localhost:3000`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();