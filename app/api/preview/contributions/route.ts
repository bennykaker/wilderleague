import {HostedStore} from '../../../../lib/tester/hosted-store'
import {getTesterStore,StoreError} from '../../../../lib/tester/store'
import {fetchLibraryChallenge} from '../../../../lib/tester/library'
import {receiveContribution} from '../../../../lib/tester/contributions'

export const runtime='nodejs'
export async function POST(request:Request) {
 try {
   const hosted=process.env.WILDERLEAGUE_PUBLIC==='1'
   if (!hosted && process.env.WILDERLEAGUE_PREVIEW!=='1') throw new StoreError('Submissions are disabled.',403)
   const result=await receiveContribution(request,hosted?new HostedStore():getTesterStore(),fetchLibraryChallenge)
   return Response.json(result,{status:201})
 } catch(err) {
   return Response.json({error:err instanceof StoreError?err.message:'Your submission could not be delivered. Please try again.'},{status:err instanceof StoreError?err.status:503})
 }
}
