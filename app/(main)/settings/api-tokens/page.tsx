import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ApiTokenList } from './api-token-list'

export default async function ApiTokensSettingsPage() {
  const session = await auth()
  if (!session?.user?.householdId) {
    redirect('/login')
  }

  const tokens = await db.apiToken.findMany({
    where: { householdId: session.user.householdId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">API Tokens</h1>
        <p className="text-muted-foreground mt-2">
          Create tokens for external integrations like the Claude MCP server.
          Tokens are shown only once when created.
        </p>
      </div>
      <ApiTokenList initialTokens={tokens} />
    </div>
  )
}
