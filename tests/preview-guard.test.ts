import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { proxy } from '../proxy'
test('preview blocks API requests, including scoring and writes',()=>{
 const previous=process.env.WILDERLEAGUE_PREVIEW
 process.env.WILDERLEAGUE_PREVIEW='1'
 try{
  for(const path of ['/api/score-cast','/api/submit-cast','/api/save-cast','/api/stripe/checkout']){
   const response=proxy(new NextRequest(`http://localhost${path}`,{method:'POST'}))
   assert.equal(response.status,403)
  }
 }finally{if(previous===undefined)delete process.env.WILDERLEAGUE_PREVIEW;else process.env.WILDERLEAGUE_PREVIEW=previous}
})
test('preview permits ordinary page navigation',()=>{
 const previous=process.env.WILDERLEAGUE_PREVIEW
 process.env.WILDERLEAGUE_PREVIEW='1'
 try{assert.equal(proxy(new NextRequest('http://localhost/quick-cast')).status,200);assert.equal(proxy(new NextRequest('http://localhost/api/preview/register')).status,200)}
 finally{if(previous===undefined)delete process.env.WILDERLEAGUE_PREVIEW;else process.env.WILDERLEAGUE_PREVIEW=previous}
})
