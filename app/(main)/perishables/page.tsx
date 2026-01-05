import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { PerishablesList } from '@/components/perishables-list'

export default async function PerishablesSettingsPage() {
  const session = await auth()
  if (!session?.user?.householdId) {
    redirect('/login')
  }

  const perishables = await db.perishable.findMany({
    where: { householdId: session.user.householdId },
    orderBy: [
      { expirationDate: 'asc' },
      { displayName: 'asc' },
    ],
  })

  // Serialize dates for client component
  const serializedPerishables = perishables.map((p) => ({
    ...p,
    quantity: p.quantity ? p.quantity.toString() : null,
    expirationDate: p.expirationDate ? p.expirationDate.toISOString().split('T')[0] : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }))

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Perishables</h1>
        <p className="text-muted-foreground mt-2">
          Track items in your fridge and pantry. Items expiring soon will be prioritized in recipe suggestions.
        </p>
      </div>

      <PerishablesList initialPerishables={serializedPerishables} />
    </div>
  )
}
