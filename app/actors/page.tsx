import {redirect} from 'next/navigation'
import ActorBrowser from '../components/ActorBrowser'
import { getEnrichedActors } from '../data/enrichedActors'

export default async function ActorsPage() {
  if(process.env.WILDERLEAGUE_PUBLIC==='1')redirect('/')
  const actors = await getEnrichedActors()
  return <ActorBrowser actors={actors} />
}
