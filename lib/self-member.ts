import type { Prisma } from '@prisma/client'

/**
 * The household owner signs up as a User, but ratings and feedback are keyed to
 * FamilyMember. Without a FamilyMember of their own, the primary user can't
 * review meals. These helpers keep every account linked to exactly one member.
 */

type Client = Prisma.TransactionClient

export function selfMemberName(name?: string | null, email?: string | null): string {
  const trimmedName = name?.trim()
  if (trimmedName) return trimmedName

  const localPart = email?.split('@')[0]?.trim()
  return localPart || 'Me'
}

interface EnsureSelfMemberArgs {
  userId: string
  householdId: string
  name?: string | null
  email?: string | null
}

/**
 * Creates the FamilyMember representing the signed-in user, unless one is
 * already linked. Idempotent, so it's safe to call on every household creation.
 */
export async function ensureSelfFamilyMember(
  client: Client,
  { userId, householdId, name, email }: EnsureSelfMemberArgs
) {
  const existing = await client.familyMember.findUnique({ where: { userId } })
  if (existing) return existing

  return client.familyMember.create({
    data: {
      name: selfMemberName(name, email),
      role: 'ADULT',
      householdId,
      userId,
    },
  })
}
