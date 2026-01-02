import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { GroceryListView } from '@/components/grocery-list-view'
import { ShoppingCart } from 'lucide-react'

export default async function GroceriesPage() {
  const session = await auth()
  if (!session?.user?.householdId) {
    redirect('/login')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Grocery List</h1>
        </div>
        <p className="text-muted-foreground ml-13 pl-0.5">
          Your shopping list generated from your meal plan
        </p>
      </div>

      <GroceryListView />
    </div>
  )
}
