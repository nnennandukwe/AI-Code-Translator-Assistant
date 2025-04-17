import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { translate } from './translator';

const server = fastify({ logger: true });

server.register(fastifyStatic, {
  root: path.join(__dirname, '../public'),
  prefix: '/',
});

server.get('/', (request, reply) => {
  reply.sendFile('index.html');
});

server.post('/translate', async (request, reply) => {
  const { code } = request.body as { code: string };
  const result = translate(code);
  return { code: result };
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