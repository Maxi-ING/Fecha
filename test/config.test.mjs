import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultConfig, validateConfig, targetTimestamp } from '../lib/config.mjs';

test('Lima resolves to UTC-5 independently of the visitor timezone', () => {
  const c = validateConfig({ ...defaultConfig(), date: '2026-12-25', time: '00:00', timezone: 'America/Lima' });
  assert.equal(new Date(targetTimestamp(c)).toISOString(), '2026-12-25T05:00:00.000Z');
});

test('DST zone resolves to its date-specific offset', () => {
  const c = { ...defaultConfig(), date: '2027-07-01', time: '18:30', timezone: 'Europe/Madrid' };
  assert.equal(new Date(targetTimestamp(validateConfig(c))).toISOString(), '2027-07-01T16:30:00.000Z');
  assert.equal(new Date(targetTimestamp(validateConfig({ ...c, date: '2027-01-01' }))).toISOString(), '2027-01-01T17:30:00.000Z');
});

test('reject nonexistent calendar dates, missing DST hours, unsupported zones and oversize text', () => {
  const c = defaultConfig();
  for (const value of [
    { date: '2027-02-29' }, { date: '2026-04-31' }, { time: '24:00' },
    { date: '2027-03-28', time: '02:30', timezone: 'Europe/Madrid' },
    { timezone: 'invalid' }, { message: 'a'.repeat(1601) }, { message: '' },
  ]) assert.throws(() => validateConfig({ ...c, ...value }));
});

test('leap dates work and HTML stays plain text without accepting extra fields', () => {
  const config = validateConfig({ ...defaultConfig(), date: '2028-02-29', title: '  <img src=x onerror=alert(1)>  ', admin: true });
  assert.equal(config.title, '<img src=x onerror=alert(1)>');
  assert.equal(config.admin, undefined);
});
