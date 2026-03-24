import ActorBrowser from '../components/ActorBrowser'
import { getEnrichedActors } from '../data/enrichedActors'

export default function ActorsPage() {
  const actors = getEnrichedActors()
  return <ActorBrowser actors={actors} />
}
