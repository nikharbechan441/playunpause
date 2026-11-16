import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { isChunkLoadError, tryAutoReloadForStaleChunk } from '../src/utils/chunkRecovery.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('isChunkLoadError matches dynamic import and chunk preload errors across browsers', () => {
  assert.equal(
    isChunkLoadError(
      new Error('Failed to fetch dynamically imported module: https://playunpause.com/assets/SafeKeypadVault-123.js')
    ),
    true
  );
  assert.equal(isChunkLoadError(new Error('Importing a module script failed.')), true);
  assert.equal(isChunkLoadError(new Error('error loading dynamically imported module')), true);
  assert.equal(isChunkLoadError(new Error('Unable to preload CSS for /assets/index.css')), true);
  assert.equal(isChunkLoadError(new Error('Loading chunk 42 failed.')), true);
  assert.equal(isChunkLoadError(new Error('Cannot read properties of undefined')), false);
});

test('tryAutoReloadForStaleChunk enforces online guard and cooldown', () => {
  assert.equal(tryAutoReloadForStaleChunk(), false);
});

test('App.jsx statically imports homepage StorageUnlockDeck instead of React.lazy', () => {
  const appSrc = fs.readFileSync(path.join(rootDir, 'src', 'App.jsx'), 'utf8');
  assert.match(appSrc, /import StorageUnlockDeck from '\.\/components\/StorageUnlockDeck\.jsx';/);
  assert.doesNotMatch(appSrc, /lazy\(loadStorageUnlockDeck\)/);
  assert.doesNotMatch(appSrc, /import\('\.\/components\/StorageUnlockDeck\.jsx'\)/);
});
