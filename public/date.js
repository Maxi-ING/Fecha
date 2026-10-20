function partsAt(timestamp, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(timestamp);
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
}

/** Resolve a wall-clock date in its IANA zone, rejecting nonexistent DST times. */
export function targetTimestamp(config) {
  const wall = Date.parse(`${config.date}T${config.time}:00Z`);
  if (!Number.isFinite(wall)) throw new Error('La fecha no es válida.');
  let guess = wall;
  for (let i = 0; i < 4; i++) guess += wall - partsAt(guess, config.timezone);
  if (partsAt(guess, config.timezone) !== wall) {
    throw new Error('Esa hora no existe en la zona horaria seleccionada. Elige otra hora.');
  }
  return guess;
}

/** Valida el archivo de configuración antes del despliegue y en el navegador. */
export function validateConfig(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Completa los campos de configuración.');
  const limits = { recipient: 100, title: 120, message: 1600, signature: 120, countdownLabel: 100, birthdayMessage: 300 };
  const config = {};
  for (const [key, max] of Object.entries(limits)) {
    if (typeof input[key] !== 'string' || input[key].trim().length > max) {
      throw new Error(`Revisa el campo ${key}: máximo ${max} caracteres.`);
    }
    config[key] = input[key].trim();
  }
  if (!config.message || !config.birthdayMessage) throw new Error('Escribe el mensaje y la felicitación de cumpleaños.');
  if (typeof input.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('Elige una fecha válida.');
  const day = new Date(`${input.date}T12:00:00Z`);
  if (!Number.isFinite(+day) || day.toISOString().slice(0, 10) !== input.date || +input.date.slice(0, 4) < 1900 || +input.date.slice(0, 4) > 2200) {
    throw new Error('Elige una fecha real entre 1900 y 2200.');
  }
  if (typeof input.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) throw new Error('Elige una hora válida.');
  if (typeof input.timezone !== 'string' || !input.timezone.trim()) throw new Error('Escribe una zona horaria IANA válida.');
  try { new Intl.DateTimeFormat('es', { timeZone: input.timezone }); }
  catch { throw new Error('La zona horaria no es válida. Ejemplo: America/Lima.'); }
  Object.assign(config, { date: input.date, time: input.time, timezone: input.timezone });
  targetTimestamp(config);
  return config;
}
