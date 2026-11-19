import CastingEntry from './CastingEntry'
export const dynamic='force-dynamic'
export default function TesterPage(){
 if(process.env.WILDERLEAGUE_PREVIEW!=='1'&&process.env.WILDERLEAGUE_PUBLIC!=='1')return <main>Tester preview is disabled.</main>
 return <CastingEntry publicMode={process.env.WILDERLEAGUE_PUBLIC==='1'}/>
}
