import {test} from 'node:test'
import assert from 'node:assert/strict'
import {eligibleForReboot,type LifeRecord} from '../lib/tester/reboot'
const record:LifeRecord={source:'https://www.wikidata.org/entity/Q1',birth:'1959-11-19',death:null,hasDeath:false}
test('reboot eligibility excludes deceased, unknown and implausibly old records',()=>{
 assert.equal(eligibleForReboot(record,'2026-10-26'),true)
 assert.equal(eligibleForReboot({...record,death:'2020-01-01'},'2026-10-26'),false)
 assert.equal(eligibleForReboot({...record,hasDeath:true},'2026-10-26'),false)
 assert.equal(eligibleForReboot(undefined,'2026-10-26'),false)
 assert.equal(eligibleForReboot({...record,birth:null},'2026-10-26'),false)
 assert.equal(eligibleForReboot({...record,birth:'1890-01-01'},'2026-10-26'),false)
 assert.equal(eligibleForReboot({...record,birth:'2030-01-01'},'2026-10-26'),false)
})
import {validateCast} from '../lib/tester/model'
import {challenges} from '../lib/tester/challenges'
import lifeStatus from '../lib/tester/life-status.json'
test('Janney remains eligible for Bartlet without a gender restriction',()=>{
 assert.equal(eligibleForReboot(lifeStatus.entries['19'],'2026-10-26'),true)
 assert.equal(eligibleForReboot(lifeStatus.entries['4566'],'2026-10-26'),false)
 const challenge=challenges[1],actors=challenge.roles.map((_,i)=>({id:String(i),name:i===0?'Allison Janney':'Actor '+i,image:'',knownFor:'',biography:'',nationality:'',gender:i===0?'female':'male'}))
 const input={challengeId:challenge.id,picks:actors.map(a=>a.id),pitch:'Allison Janney as Bartlet.',publish:false}
 assert.deepEqual(validateCast(input,{challenges:[challenge],actors,pools:{[challenge.id]:actors.map(a=>a.id)}}),input)
})
