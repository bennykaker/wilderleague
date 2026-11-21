import {programmeRoster,weeklyReboot} from '../../lib/tester/board-programme'

export default function WeeklyReboot(){
  const week=weeklyReboot(),roles=programmeRoster(week.id)!.roles
  return <section className="weekly-reboot" aria-label="This week’s reboot">
    <div><p className="edition-line">This week’s reboot <span>Week of {week.dates}</span></p>
      <h2>{week.title}</h2><p>Who would you cast as {roles.slice(0,3).map(r=>r.name).join(', ').replace(/, ([^,]+)$/,' and $1')}?</p></div>
    <div className="edition-links"><a className="edition-play" href={'/?title='+encodeURIComponent(week.id)}>Cast this reboot</a>
      <a href={'/?board='+encodeURIComponent(week.id)}>See the weekly leaderboard</a></div>
  </section>
}
