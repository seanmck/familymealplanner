import { createHash, randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

/**
 * Hash an API token for storage/comparison
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Generate a new API token with a prefix for identification
 */
export function generateApiToken(): string {
  const token = randomBytes(32).toString('hex')
  return `ft_${token}`
}

interface AuthResult {
  householdId: string
}

/**
 * Validate an API token from the Authorization header
 * Returns the householdId if valid, null otherwise
 */
export async function validateApiToken(
  request: Request
): Promise<AuthResult | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)
  if (!token.startsWith('ft_')) {
    return null
  }

  const hashedToken = hashToken(token)

  const apiToken = await db.apiToken.findUnique({
    where: { token: hashedToken },
  })

  if (!apiToken) {
    return null
  }

  // Update last used timestamp (fire and forget)
  db.apiToken.update({
    where: { id: apiToken.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {
    // Ignore errors updating lastUsedAt
  })

  return { householdId: apiToken.householdId }
}

/**
 * Get authentication from either session or API token
 * Tries session auth first, falls back to token auth
 * Returns householdId if authenticated, null otherwise
 */
export async function getAuth(request: Request): Promise<AuthResult | null> {
  // Try session auth first
  const session = await auth()
  if (session?.user?.householdId) {
    return { householdId: session.user.householdId }
  }

  // Fall back to API token auth
  return validateApiToken(request)
}
