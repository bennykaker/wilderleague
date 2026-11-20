import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import files from '../data/actor-portraits/files.json'
import originals from '../data/actor-portraits/originals.json'
import starters from '../data/book-casting/starter-actors.json'

test('starter actors and named original performers have local portraits', () => {
  const images = [...starters.map(actor => actor.image), ...Object.values(originals)]
  for (const image of images) {
    const key = image.replace(/^https:\/\/image\.tmdb\.org\/t\/p\/(?:w\d+|original)\//, '')
    assert.ok(Object.hasOwn(files, key), image)
  }
})

test('every catalogue portrait points to a bundled WebP file', () => {
  for (const url of new Set(Object.values(files))) {
    assert.match(url, /^\/actor-portraits\/[\w-]+\.webp$/)
    const image = fs.readFileSync(path.join(process.cwd(), 'public', url))
    assert.equal(image.toString('ascii', 0, 4), 'RIFF', url)
    assert.equal(image.toString('ascii', 8, 12), 'WEBP', url)
  }
})
