import {createHash} from 'node:crypto'
export function houseCastId(boardId:string,slot:number){
  const h=createHash('sha256').update('wilderleague:house:v1:'+boardId+'/'+slot).digest('hex')
  return h.slice(0,8)+'-'+h.slice(8,12)+'-5'+h.slice(13,16)+'-a'+h.slice(17,20)+'-'+h.slice(20,32)
}
