export type LifeRecord={source:string;birth:string|null;death:string|null;hasDeath:boolean}
// Do not treat a missing source record as evidence that an actor is living.
// A plausible birth date and no death statement are required for this preview.
export function eligibleForReboot(record:LifeRecord|undefined,today:string):boolean{
 if(!record||record.hasDeath||record.death||!record.birth)return false
 const born=Date.parse(record.birth),now=Date.parse(today)
 if(!Number.isFinite(born)||!Number.isFinite(now)||born>now)return false
 return (now-born)/(365.2425*86400000)<115
}
export const rebootRule='Cast a reboot made today. Living actors only; every role is open to any gender.'
