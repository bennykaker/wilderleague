import {getCastingDirectory} from '../../../../lib/tester/catalogue'

export const dynamic = 'force-static'
export const revalidate = 3600
export const maxDuration = 120

// Build the public directory before deployment and serve the last successful
// version while the next one regenerates. No account data belongs in this route.
export async function GET() {
  if (process.env.WILDERLEAGUE_PUBLIC !== '1' && process.env.WILDERLEAGUE_PREVIEW !== '1') {
    return Response.json({error: 'Tester API is only available in preview mode.'}, {status: 403})
  }

  const directory = await getCastingDirectory()
  if (!directory.actors.length) throw new Error('The casting directory is empty.')
  return Response.json(directory)
}
