import {challenges} from './challenges'
import {validateCast,type Catalogue,type CastInput} from './model'
export const JOURNEY_KEY='wl-guided-preview-v1'
export type SampleResult={challengeId:string;picks:string[];pitch:string;score:number}
export type Journey={stage:number;results:SampleResult[]}
export const emptyJourney=():Journey=>({stage:0,results:[]})
// Deliberately fixed demo values, never represented as assessment or used in rankings.
export function sampleResult(input:CastInput,cat:Catalogue):SampleResult{
 const valid=validateCast(input,cat),index=challenges.findIndex(c=>c.id===valid.challengeId)
 if(index<0)throw new Error('This is not an opening challenge.')
 return {challengeId:valid.challengeId,picks:valid.picks,pitch:valid.pitch,score:[82,78,86][index]}
}
export function recordResult(journey:Journey,result:SampleResult):Journey{
 if(journey.stage>=3||challenges[journey.stage].id!==result.challengeId)throw new Error('Finish the current challenge first.')
 return {...journey,results:[...journey.results.slice(0,journey.stage),result]}
}
export function continueJourney(journey:Journey):Journey{
 if(journey.stage>=3||!journey.results[journey.stage])return journey
 return {...journey,stage:journey.stage+1}
}
export function restoreJourney(raw:string|null,cat:Catalogue):Journey{
 try{const j=JSON.parse(raw||'null');if(!j||!Number.isInteger(j.stage)||j.stage<0||j.stage>3||!Array.isArray(j.results))return emptyJourney()
 const results:SampleResult[]=[]
 for(let i=0;i<Math.min(j.results.length,3);i++){if(j.results[i]?.challengeId!==challenges[i].id)break;try{results.push(sampleResult({...j.results[i],publish:false},cat))}catch{break}}
 return {stage:Math.min(j.stage,results.length),results}
 }catch{return emptyJourney()}
}
