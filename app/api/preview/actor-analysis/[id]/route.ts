import {analysisFields,readArchivedAnalysis,mergeAnalysis,type ActorAnalysis} from '../../../../../lib/tester/actor-analysis'
import {createServiceClient} from '../../../../../lib/supabase/service'

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  if (process.env.WILDERLEAGUE_PREVIEW!=='1' && process.env.WILDERLEAGUE_PUBLIC!=='1') {
    return Response.json({error:'Casting is unavailable.'},{status:403})
  }
  const {id} = await params
  if (!/^[1-9]\d{0,11}$/.test(id)) return Response.json({error:'Invalid actor ID.'},{status:400})
  const archived = await readArchivedAnalysis(id)
  try {
    const {data,error} = await createServiceClient().from('actors').select(analysisFields.join(',')).eq('tmdb_id',id).maybeSingle<ActorAnalysis>()
    if (error) throw error
    return Response.json({analysis:mergeAnalysis(data,archived)},{
      headers:{'Cache-Control':'public, max-age=300, s-maxage=3600'},
    })
  } catch {
    if (archived) return Response.json({analysis:archived},{headers:{'Cache-Control':'no-store'}})
    return Response.json({error:'Actor analysis could not be loaded.'},{status:503})
  }
}
