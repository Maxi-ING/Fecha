export const TIME_ZONES = [
  'America/Lima', 'America/Bogota', 'America/Mexico_City', 'America/Argentina/Buenos_Aires',
  'America/Santiago', 'America/Caracas', 'America/La_Paz', 'America/Guayaquil',
  'America/Montevideo', 'America/Asuncion', 'America/Santo_Domingo', 'America/Panama',
  'America/Guatemala', 'America/Costa_Rica', 'America/El_Salvador', 'America/Tegucigalpa',
  'America/Managua', 'America/New_York', 'America/Los_Angeles', 'Europe/Madrid', 'UTC',
];

/** Start with a date in the future; it becomes fixed on the first server run. */
export function defaultConfig() {
  const next = new Date(Date.now() + 5 * 86400000);
  return {
    recipient: 'Para el amor de mi vida',
    title: 'Tu día está por llegar. ♥',
    message: 'Falta muy poco para tu cumpleaños, y no puedo esperar para celebrarlo contigo.\n\nPara llenarte de abrazos, de besos y de pequeñas sorpresas.\n\nGracias por existir y hacer mis días más bonitos.',
    signature: 'Con todo mi cariño.',
    countdownLabel: 'Esperando tu cumple…',
    birthdayMessage: '¡Feliz cumpleaños! Hoy el mundo es un poquito más bonito gracias a ti. ♥',
    date: next.toISOString().slice(0, 10),
    time: '00:00',
    timezone: 'America/Lima',
  };
}

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

/** Accept only the editable, bounded text/date fields. Content is rendered as text. */
export function validateConfig(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Completa el formulario.');
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
  if (!TIME_ZONES.includes(input.timezone)) throw new Error('Elige una zona horaria de la lista.');
  Object.assign(config, { date: input.date, time: input.time, timezone: input.timezone });
  targetTimestamp(config);
  return config;
}
