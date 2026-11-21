import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {modelCacheKey,actorSearchKey} from '../lib/tester/ai-models'

test('existing model results keep their saved keys and a different model gets its own result',()=>{
  const phrase='A Chris Traeger type'
  const searchInput='v1:a chris traeger type'
  const reviewInput='{"title":"Guards! Guards!"}'
  const oldKey=(input:string)=>createHash('sha256').update(input).digest('hex')
  assert.equal(modelCacheKey('actorSearch','claude-haiku-4-5-20251001',searchInput),oldKey(searchInput))
  assert.equal(modelCacheKey('castReview','claude-sonnet-4-6',reviewInput),oldKey(reviewInput))
  assert.equal(actorSearchKey(phrase),actorSearchKey(phrase.toLowerCase()))
  assert.notEqual(modelCacheKey('actorSearch','another-model',searchInput),oldKey(searchInput))
  assert.notEqual(modelCacheKey('castReview','another-model',reviewInput),oldKey(reviewInput))
})
