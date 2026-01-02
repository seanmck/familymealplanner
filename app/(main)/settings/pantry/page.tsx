import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { PantryStaplesList } from '@/components/pantry-staples-list'

export default async function PantrySettingsPage() {
  const session = await auth()
  if (!session?.user?.householdId) {
    redirect('/login')
  }

  const staples = await db.pantryStaple.findMany({
    where: { householdId: session.user.householdId },
    orderBy: { displayName: 'asc' },
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Pantry Staples</h1>
        <p className="text-muted-foreground mt-2">
          Items you always have on hand that should be excluded from grocery lists.
        </p>
      </div>

      <PantryStaplesList initialStaples={staples} />
    </div>
  )
}
