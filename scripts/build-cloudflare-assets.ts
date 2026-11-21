import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import path from 'node:path'
import {gunzipSync} from 'node:zlib'
import {actorArchive} from '../lib/tester/actor-analysis'

const target=path.resolve('.open-next/assets/actor-analysis')
mkdirSync(target,{recursive:true})
for(const [id,profile] of actorArchive()) {
  if (/^[1-9]\d{0,11}$/.test(id)) writeFileSync(path.join(target,id+'.json'),JSON.stringify(profile))
}

writeFileSync(path.resolve('.open-next/assets/casting-directory.json'),gunzipSync(readFileSync('data/actor-directory-fallback.json.gz')))
