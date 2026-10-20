import { HeartTree } from './tree.js';
import { dedication } from './config.js';
import { validateConfig, targetTimestamp } from './date.js';

const $ = id => document.getElementById(id);
const tree = new HeartTree($('tree'));
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let config;
let run = 0;
let timer;

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function typeText(element, text, token) {
  if (reduced.matches) { element.textContent = text; return; }
  element.textContent = '';
  element.classList.add('typing');
  const letters = Array.from(text);
  // Long messages complete at a reasonable pace too.
  const delay = Math.max(8, Math.min(32, 14000 / Math.max(letters.length, 1)));
  for (let i = 0; i < letters.length; i++) {
    if (token !== run) return;
    element.textContent += letters[i];
    await pause(letters[i] === '\n' ? 120 : delay);
  }
  element.classList.remove('typing');
}

function updateCountdown() {
  const remaining = Math.max(0, config.targetTimestamp - Date.now());
  $('countdown-label').textContent = remaining ? config.countdownLabel : 'Llegó tu día.';
  $('birthday-message').hidden = remaining > 0;
  $('time-left').hidden = remaining === 0;
  $('birthday-message').textContent = config.birthdayMessage;
  if (!remaining) return;
  const total = Math.floor(remaining / 1000);
  const values = [Math.floor(total / 86400), Math.floor(total / 3600) % 24, Math.floor(total / 60) % 60, total % 60];
  const labels = [['día', 'días'], ['hora', 'horas'], ['minuto', 'minutos'], ['segundo', 'segundos']];
  $('time-left').replaceChildren(...values.map((n, index) => {
    const unit = document.createElement('span');
    const value = document.createElement('strong');
    value.textContent = String(n).padStart(2, '0');
    unit.append(value, ` ${labels[index][n === 1 ? 0 : 1]}`);
    return unit;
  }));
}

async function start() {
  if (!config) return;
  const token = ++run;
  $('seed').hidden = true;
  $('replay').hidden = true;
  $('letter').classList.remove('revealed');
  $('countdown').classList.remove('revealed');
  const scene = document.querySelector('.scene');
  scene.classList.add('started');
  scene.classList.remove('tree-settled');
  for (const id of ['recipient', 'title', 'message', 'signature']) { $(id).textContent = ''; $(id).classList.remove('typing'); }
  // Full accessible text is available without announcing every typed letter.
  $('letter').setAttribute('aria-label', [config.recipient, config.title, config.message, config.signature].filter(Boolean).join('. '));
  tree.start();
  await pause(reduced.matches ? 0 : 4600);
  if (token !== run) return;
  scene.classList.add('tree-settled');
  await pause(reduced.matches ? 0 : 1600);
  if (token !== run) return;
  $('letter').classList.add('revealed');
  $('countdown').classList.add('revealed');
  for (const key of ['recipient', 'title', 'message', 'signature']) {
    if (token !== run) return;
    await typeText($(key), config[key], token);
    if (config[key] && !reduced.matches) await pause(180);
  }
  if (token === run) $('replay').hidden = false;
}

function loadConfig() {
  config = validateConfig(dedication);
  config.targetTimestamp = targetTimestamp(config);
  document.title = `${config.recipient || 'Una fecha especial'} ♥`;
  $('target-date').textContent = new Intl.DateTimeFormat('es', { timeZone: config.timezone, day: 'numeric', month: 'long', year: 'numeric' }).format(config.targetTimestamp);
  updateCountdown();
}

$('seed').addEventListener('click', start);
$('replay').addEventListener('click', start);

try {
  loadConfig();
  timer = setInterval(updateCountdown, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateCountdown(); });
} catch (error) {
  $('seed').hidden = true;
  $('load-error').hidden = false;
  $('load-error').textContent = error.message;
  clearInterval(timer);
}
