import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { envs } from 'src/config';

// Envia el mensaje NATS "otbi.import.run" al microservicio que ya esta corriendo.
// No detiene el servicio. Uso: npm run import:otbi
async function main() {
  const client = ClientProxyFactory.create({
    transport: Transport.NATS,
    options: {
      servers: envs.natsServers,
      user: envs.natsUser,
      pass: envs.natsPass,
      timeout: 5000,
    },
  });

  try {
    const result = await lastValueFrom(
      client.send<{ started: boolean; message: string }>('otbi.import.run', {}),
    );
    console.log(result.message);
  } catch (error) {
    console.error('No se pudo solicitar la importacion:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

void main();
