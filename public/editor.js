const $ = id => document.getElementById(id);
let csrf;
let dirty = false;

function status(id, message, error = false) {
  $(id).textContent = message;
  $(id).classList.toggle('error', error);
}

async function request(url, method = 'GET', body) {
  const response = await fetch(url, {
    method, credentials: 'same-origin', cache: 'no-store',
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || 'No se pudo completar la operación.'), { status: response.status });
  return result;
}

function showLogin(message = '') {
  csrf = undefined;
  $('login-panel').hidden = false;
  $('editor-panel').hidden = true;
  $('logout').hidden = true;
  // Do not leave an expired editor's content in its hidden form.
  $('edit-form').reset();
  status('login-status', message, Boolean(message));
}

async function openEditor(session) {
  const draft = dirty ? Object.fromEntries(new FormData($('edit-form'))) : null;
  csrf = session.csrf;
  const config = draft || await request('/api/config');
  const zones = session.timezones.map(zone => {
    const option = document.createElement('option');
    option.value = zone;
    option.textContent = zone === 'America/Lima' ? 'Perú · Lima' : zone.replaceAll('_', ' ').replace('/', ' · ');
    return option;
  });
  $('timezone-input').replaceChildren(...zones);
  for (const [key, value] of Object.entries(config)) {
    const field = $('edit-form').elements.namedItem(key);
    if (field) field.value = value;
  }
  updateCount();
  dirty = Boolean(draft);
  $('password').value = '';
  $('login-panel').hidden = true;
  $('editor-panel').hidden = false;
  $('logout').hidden = false;
  status('save-status', draft ? 'Sesión recuperada. Tus cambios siguen aquí; vuelve a guardar.' : 'Los cambios se publican al guardar.');
}

function updateCount() { $('character-count').textContent = `${$('message-input').value.length} / 1600`; }

$('login-form').addEventListener('submit', async event => {
  event.preventDefault();
  $('login-button').disabled = true;
  status('login-status', 'Entrando…');
  try { await openEditor(await request('/api/session', 'POST', { password: $('password').value })); }
  catch (error) { status('login-status', error.message, true); }
  finally { $('login-button').disabled = false; }
});

$('edit-form').addEventListener('input', () => {
  dirty = true;
  updateCount();
  status('save-status', 'Tienes cambios sin guardar.');
});

$('edit-form').addEventListener('submit', async event => {
  event.preventDefault();
  $('save-button').disabled = true;
  $('save-button').textContent = 'Guardando…';
  // Freeze the form during the request so newly typed changes cannot be lost.
  const fields = [...$('edit-form').querySelectorAll('input, textarea, select')];
  const data = Object.fromEntries(new FormData($('edit-form')));
  fields.forEach(field => { field.disabled = true; });
  status('save-status', 'Guardando tu dedicatoria…');
  try {
    await request('/api/config', 'PUT', data);
    dirty = false;
    status('save-status', 'Listo. Tu dedicatoria ya está actualizada.');
  } catch (error) {
    // Preserve unsaved edits on session expiry until the user logs in again.
    status('save-status', error.message, true);
    if (error.status === 401) {
      $('login-panel').hidden = false;
      status('login-status', 'Tu sesión terminó. Entra de nuevo y vuelve a guardar.', true);
      $('password').focus();
    }
  } finally {
    fields.forEach(field => { field.disabled = false; });
    $('save-button').disabled = false;
    $('save-button').textContent = 'Guardar cambios ↗';
  }
});

$('logout').addEventListener('click', async () => {
  if (dirty && !window.confirm('Tienes cambios sin guardar. ¿Quieres cerrar sesión de todas formas?')) return;
  try { await request('/api/session', 'DELETE'); dirty = false; showLogin(); }
  catch (error) { status('save-status', error.message, true); }
});

window.addEventListener('beforeunload', event => {
  if (dirty) { event.preventDefault(); event.returnValue = ''; }
});

try { await openEditor(await request('/api/session')); }
catch (error) { showLogin(error.status === 401 ? '' : 'No se pudo conectar. Recarga la página para intentarlo de nuevo.'); }
