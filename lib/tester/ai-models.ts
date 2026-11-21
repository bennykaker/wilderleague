import {createHash} from 'node:crypto'

// USD per million tokens. Keep the model and its billing rates together.
const haiku = {
  id: 'claude-haiku-4-5-20251001', displayName: 'Claude Haiku 4.5',
  inputRate: 1, outputRate: 5,
}
const sonnet = {
  id: 'claude-sonnet-4-6', displayName: 'Claude Sonnet 4.6',
  inputRate: 3, outputRate: 15,
}

export const actorSearchModel = {...haiku, maxOutputTokens: 1600}
export const boardJudgeModel = {...haiku, maxOutputTokens: 96}
export const castReviewModel = {...sonnet, maxOutputTokens: 1000}

export function tokenCost(model: {inputRate: number; outputRate: number}, input: number, output: number) {
  return (input * model.inputRate + output * model.outputRate) / 1_000_000
}

// Existing saved searches and reviews use hashes that predate model selection.
const originalCacheModels = {actorSearch: haiku.id, castReview: sonnet.id}
export function modelCacheKey(task: keyof typeof originalCacheModels, modelId: string, input: string) {
  const content = modelId === originalCacheModels[task] ? input : JSON.stringify([task,modelId,input])
  return createHash('sha256').update(content).digest('hex')
}

export function actorSearchKey(phrase: string) {
  return modelCacheKey('actorSearch',actorSearchModel.id,'v1:'+phrase.toLowerCase())
}
