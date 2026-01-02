import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { FamilyMemberList } from './family-member-list'

export default async function FamilySettingsPage() {
  const session = await auth()
  if (!session?.user?.householdId) {
    redirect('/login')
  }

  const members = await db.familyMember.findMany({
    where: { householdId: session.user.householdId },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Family Members</h1>
        <p className="text-muted-foreground mt-2">
          Manage your household members. Each member can rate recipes to help
          track family preferences.
        </p>
      </div>
      <FamilyMemberList initialMembers={members} />
    </div>
  )
}
