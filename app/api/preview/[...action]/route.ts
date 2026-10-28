import {HostedStore} from '../../../../lib/tester/hosted-store'
import {getTesterCatalogue} from '../../../../lib/tester/catalogue'
import {getTesterStore} from '../../../../lib/tester/store'
import {createTesterApi} from '../../../../lib/tester/api'
export const runtime='nodejs'
export const maxDuration=120
export const dynamic='force-dynamic'
async function handle(request:Request){
 if(process.env.WILDERLEAGUE_PREVIEW!=='1'&&process.env.WILDERLEAGUE_PUBLIC!=='1')return Response.json({error:'Tester API is only available in preview mode.'},{status:403})
 return createTesterApi(process.env.WILDERLEAGUE_PUBLIC==='1'?new HostedStore():getTesterStore(),getTesterCatalogue)(request)
}
export const GET=handle
export const POST=handle
