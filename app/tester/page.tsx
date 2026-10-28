import TesterApp from './TesterApp'
import {getTesterCatalogue} from '../../lib/tester/catalogue'
export const dynamic='force-dynamic'
export default async function TesterPage(){
 if(process.env.WILDERLEAGUE_PREVIEW!=='1'&&process.env.WILDERLEAGUE_PUBLIC!=='1')return <main>Tester preview is disabled.</main>
 try{return <TesterApp data={await getTesterCatalogue()} publicMode={process.env.WILDERLEAGUE_PUBLIC==='1'}/>}
 catch(error){console.error('Tester catalogue failed',error instanceof Error?error.message:'Unknown error');return <main style={{padding:40}}>The preview catalogue could not load. Please refresh to try again.</main>}
}
