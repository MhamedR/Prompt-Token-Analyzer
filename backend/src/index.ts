import { createApp } from './app.js';
import { env } from './config/env.js';

const app = await createApp();

app.listen(env.port, () => {
  console.log(`Prompt Token Analyzer API listening on http://localhost:${env.port}`);
});
