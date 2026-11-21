import test from 'node:test'
import assert from 'node:assert/strict'
import {archivedAnalysis,mergeAnalysis} from '../lib/tester/actor-analysis'

test('preserves saved notes and recovers missing columns from the same actor’s archive',()=>{
  const gosling = archivedAnalysis('30614')
  assert.ok(gosling?.casting_profile?.includes('Gosling'))
  assert.ok(gosling.signature_quality && gosling.weaknesses && gosling.best_cast_as)
  const profile = mergeAnalysis({casting_profile:'Updated casting notes.',signature_quality:' '},gosling)
  assert.equal(profile?.casting_profile,'Updated casting notes.')
  assert.equal(profile?.signature_quality,gosling.signature_quality)
  assert.equal(mergeAnalysis(null,gosling)?.casting_profile,gosling.casting_profile)
})

test('partial and missing write-ups stay distinct from full assessments',()=>{
  assert.deepEqual(mergeAnalysis({strengths:'Comic timing'}),{strengths:'Comic timing'})
  assert.equal(mergeAnalysis({casting_profile:'  '},archivedAnalysis('0')),null)
})
