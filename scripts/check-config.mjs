import { dedication } from '../public/config.js';
import { validateConfig, targetTimestamp } from '../public/date.js';

try {
  const config = validateConfig(dedication);
  console.log(`Configuración válida. Fecha objetivo: ${new Date(targetTimestamp(config)).toISOString()}`);
} catch (error) {
  console.error(`Revisa public/config.js: ${error.message}`);
  process.exitCode = 1;
}
