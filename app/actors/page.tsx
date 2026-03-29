import ActorBrowser from '../components/ActorBrowser'
import { getEnrichedActors } from '../data/enrichedActors'

export default async function ActorsPage() {
  const actors = await getEnrichedActors()
  return <ActorBrowser actors={actors} />
}
