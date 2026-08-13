import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { FamilyMemberList } from './family-member-list'
import { InviteSection } from './invite-section'

export default async function FamilySettingsPage() {
  const session = await auth()
  if (!session?.user?.householdId) {
    redirect('/login')
  }

  const [members, invitations] = await Promise.all([
    db.familyMember.findMany({
      where: { householdId: session.user.householdId },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    }),
    db.invitation.findMany({
      where: { householdId: session.user.householdId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    }),
  ])

  const selfMemberId =
    members.find((member) => member.userId === session.user.id)?.id ?? null

  // Serialize dates for client component
  const serializedInvitations = invitations.map((inv) => ({
    ...inv,
    expiresAt: inv.expiresAt.toISOString(),
    createdAt: inv.createdAt.toISOString(),
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Family Members</h1>
        <p className="text-muted-foreground mt-2">
          Manage your household members and send invitations.
        </p>
      </div>

      {/* Invite Section */}
      <InviteSection initialInvitations={serializedInvitations} />

      {/* Existing Family Members */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Current Members</h2>
        <FamilyMemberList initialMembers={members} selfMemberId={selfMemberId} />
      </div>
    </div>
  )
}
