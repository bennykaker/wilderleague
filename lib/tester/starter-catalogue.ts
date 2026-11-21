import actorRows from '../../data/book-casting/starter-actors.json'
import {coreRosters,lorreMadMen} from './challenges'
import lorreStarters from '../../data/book-casting/starter-lorre-actors.json'
import {isBritish,type Catalogue,type TesterActor} from './model'
import {snlMembers} from './snl-members'

// A small slice of the verified actor catalogue ships with the casting room.
const actors:TesterActor[] = [...actorRows,...lorreStarters]
const pools:Record<string,string[]> = {}
for (const challenge of coreRosters) {
  pools[challenge.id] = actors.filter(actor=>challenge.pool==='all' ||
    (challenge.pool==='british' && isBritish(actor.nationality)) ||
    (challenge.pool==='snl' && snlMembers.has(actor.name.toLowerCase()))).map(actor=>actor.id)
}
pools[lorreMadMen.id] = lorreStarters.map(actor=>actor.id)
export const starterCatalogue:Catalogue = {actors,challenges:coreRosters,pools}
