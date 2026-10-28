export type TesterActor={id:string;name:string;image:string;knownFor:string;biography:string;nationality:string;ethnicity?:string;gender?:string;descriptionTags?:string[];birthYear?:number}
export type TesterRole={id:string;name:string;originalActor:string;originalImage?:string;description:string}
export type Challenge={id:string;title:string;season:string;rule:string;roles:TesterRole[];source:string;pool:string}
export type Catalogue={titles?:{slug:string;title:string;type:string;year:number|null}[];challenges:Challenge[];actors:TesterActor[];pools:Record<string,string[]>}
export type CastInput={challengeId:string;picks:string[];pitch:string;publish:boolean}
export type CastSnapshot={challenge:Challenge;actors:TesterActor[];pitch:string}
export type User={id:string;username:string}
export type CastRecord={id:string;ownerId:string;username:string;challengeId:string;snapshot:CastSnapshot;published:boolean;createdAt:string;best:number;hear:number;myBest:boolean;myHear:boolean}
export function isBritish(value:string){return value.split(/[,;/|]/).some(s=>/^(british|united kingdom|uk|u\.k\.|england|english|scotland|scottish|wales|welsh|northern ireland|northern irish)$/i.test(s.trim()))}
export function validateCast(body:unknown,catalogue:Catalogue):CastInput{
 if(!body||typeof body!=='object')throw new Error('Invalid cast.')
 const b=body as Record<string,unknown>,c=catalogue.challenges.find(x=>x.id===b.challengeId)
 if(!c)throw new Error('Unknown challenge.')
 if(!Array.isArray(b.picks)||b.picks.length!==c.roles.length||!b.picks.every(x=>typeof x==='string'))throw new Error('Choose an actor for every role.')
 const picks=b.picks as string[],eligible=new Set(catalogue.pools[c.id])
 if(picks.some(x=>!eligible.has(x)))throw new Error('One of these actors is outside this challenge’s pool.')
 if(new Set(picks).size!==picks.length)throw new Error('Use each actor only once.')
 if(typeof b.pitch!=='string'||b.pitch.length>1000)throw new Error('Keep your casting rationale to 1,000 characters.')
 if(typeof b.publish!=='boolean')throw new Error('Choose whether to submit this cast.')
 return {challengeId:c.id,picks,pitch:b.pitch.trim(),publish:b.publish}
}
export function makeSnapshot(input:CastInput,catalogue:Catalogue):CastSnapshot{
 return {challenge:catalogue.challenges.find(c=>c.id===input.challengeId)!,actors:input.picks.map(id=>catalogue.actors.find(a=>a.id===id)!),pitch:input.pitch}
}
