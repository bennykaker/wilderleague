import {test} from 'node:test'
import assert from 'node:assert/strict'
import {describeActors,extractDescriptionTags} from '../lib/tester/description-search'
import type {TesterActor} from '../lib/tester/model'
const actor=(id:string,nationality:string,ethnicity:string,tags:string[]):TesterActor=>({id,name:id,image:'',knownFor:'',biography:'',nationality,ethnicity,descriptionTags:tags})
const actors=[actor('A','Irish','white',['intensity','warm']),actor('B','American','latino',['comedy','warm']),actor('C','British','white',['understated'])]
test('description search combines background and performance constraints',()=>{
 assert.deepEqual(describeActors(actors,'Irish actor').matches.map(m=>m.actor.id),['A'])
 assert.deepEqual(describeActors(actors,'Latino actor').matches.map(m=>m.actor.id),['B'])
 assert.deepEqual(describeActors(actors,'I want an angry Irish actor').matches.map(m=>m.actor.id),['A'])
 assert.deepEqual(describeActors(actors,'warm and funny').matches.map(m=>m.actor.id),['B'])
 assert.equal(describeActors(actors,'Irish funny actor').matches.length,0)
})
test('matches cite data and do not infer ethnicity from nationality or names',()=>{
 const noEthnicity=actor('Pedro Example','Mexican','',[])
 assert.equal(describeActors([noEthnicity],'Latino actor').matches.length,0)
 assert.match(describeActors(actors,'angry actor').matches[0].reasons[0],/intensity/)
 assert.equal(describeActors(actors.slice(1),'Irish actor').matches.length,0)
 assert.deepEqual(describeActors(actors,'telepathic actor').unrecognized,['telepathic'])
 assert.equal(describeActors(actors,'not Irish').matches.length,0)
})
test('profile indexing uses explicit descriptors and excludes simple negation',()=>{
 assert.deepEqual(extractDescriptionTags('comedy','Not warm. Has commanding presence.'),['comedy','commanding'])
 assert.equal(extractDescriptionTags('','A remarkable actor.').length,0)
})
