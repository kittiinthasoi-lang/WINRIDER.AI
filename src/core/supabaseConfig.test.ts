import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSupabaseUrl, isPublicSupabaseKey } from './supabaseConfig';

test('public configuration supports custom domains but not URL credentials', () => {
  assert.equal(isSupabaseUrl('https://project.supabase.co'), true);
  assert.equal(isSupabaseUrl('https://auth.example.com'), true);
  for (const url of ['bad', 'http://project.supabase.co', 'https://key@auth.example.com', 'https://your-project.supabase.co', 'https://auth.example.com/?key=secret']) {
    assert.equal(isSupabaseUrl(url), false);
  }
});

test('server secrets cannot become browser keys', () => {
  const jwt = (role: string) => 'header.' + Buffer.from(JSON.stringify({ role })).toString('base64url') + '.signature';
  assert.equal(isPublicSupabaseKey('sb_publishable_example'), true);
  assert.equal(isPublicSupabaseKey(jwt('anon')), true);
  for (const key of ['', 'sb_secret_example', jwt('service_role'), jwt('authenticated'), 'bad']) {
    assert.equal(isPublicSupabaseKey(key), false);
  }
});
