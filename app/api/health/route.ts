import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Railway polls this after each deploy and holds the old container in service
// until it returns 200, so it must verify the DB too — a booting app that can't
// reach Postgres is not healthy, and swapping traffic to it would take the site
// down (see railway.json healthcheckPath).
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok', database: 'connected' })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      { status: 'error', database: 'unreachable' },
      { status: 503 }
    )
  }
}
