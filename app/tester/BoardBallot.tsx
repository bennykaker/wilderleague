import type {BoardRating,Vote} from '../../lib/tester/leaderboard'

export default function BoardBallot({rating,disabled,onVote}:{
  rating:BoardRating
  disabled:boolean
  onVote:(vote:Vote)=>void
}) {
  const {ai,score,mine,up,down}=rating
  const total=up+down
  return <section aria-label="Cast score and votes">
    <p><strong>{score===null?'Awaiting AI score':score.toFixed(1)+' / 100'}</strong>
      {ai!==null && <small> · Haiku {ai}/100{total>20?' · 50% audience weight':' · AI score only'}</small>}
    </p>
    <div className="actions">
      <button className={mine===1?'primary':undefined} disabled={disabled} aria-pressed={mine===1} onClick={()=>onVote(mine===1?0:1)}>Upvote · {up}</button>
      <button className={mine===-1?'primary':undefined} disabled={disabled} aria-pressed={mine===-1} onClick={()=>onVote(mine===-1?0:-1)}>Downvote · {down}</button>
    </div>
    <small>{total?Math.round(100*up/total)+'% approval · ':''}{total} {total===1?'vote':'votes'}
      {total<21?' · '+(21-total)+' more for 50% audience weight':''}</small>
  </section>
}
