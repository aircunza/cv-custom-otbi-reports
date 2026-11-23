import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  DATABASE_URL: string;
  NATS_SERVERS: string[];
  NATS_USER: string;
  NATS_PASS: string;
  OTBI_FILE_PATH: string;
  IMPORT_CRON: string;
  IMPORT_TIMEZONE: string;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    DATABASE_URL: joi.string().required(),
    NATS_SERVERS: joi.array().items(joi.string()).required(),
    NATS_USER: joi.string().required(),
    NATS_PASS: joi.string().required(),
    OTBI_FILE_PATH: joi.string().required(),
    IMPORT_CRON: joi.string().required(),
    IMPORT_TIMEZONE: joi.string().required(),
  })
  .unknown(true);

const result = envsSchema.validate({
  ...process.env,
  NATS_SERVERS: process.env.NATS_SERVERS?.split(','),
});

if (result.error) {
  throw new Error(`Config validation error: ${result.error.message}`);
}

const envVars = result.value as EnvVars;

export const envs = {
  port: envVars.PORT,
  databaseUrl: envVars.DATABASE_URL,
  natsServers: envVars.NATS_SERVERS,
  natsUser: envVars.NATS_USER,
  natsPass: envVars.NATS_PASS,
  otbiFilePath: envVars.OTBI_FILE_PATH,
  importCron: envVars.IMPORT_CRON,
  importTimezone: envVars.IMPORT_TIMEZONE,
};
