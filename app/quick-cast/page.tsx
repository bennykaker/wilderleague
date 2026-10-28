import QuickCast from './QuickCast'
import { getQuickCastData } from '../../lib/quick-cast/data'
export const dynamic = 'force-dynamic'
export default async function QuickCastPage() {
  return <QuickCast data={await getQuickCastData()} startInGame />
}
