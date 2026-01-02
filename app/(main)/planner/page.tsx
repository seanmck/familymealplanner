import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { WeekView } from '@/components/week-view'
import { Calendar } from 'lucide-react'

export default async function PlannerPage() {
  const session = await auth()
  if (!session?.user?.householdId) {
    redirect('/login')
  }

  const recipes = await db.recipe.findMany({
    where: { householdId: session.user.householdId },
    include: {
      ratings: {
        include: {
          member: true,
        },
      },
    },
    orderBy: { title: 'asc' },
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calendar className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Weekly Planner</h1>
        </div>
        <p className="text-muted-foreground pl-13">
          Plan your family&apos;s meals for the week ahead
        </p>
      </div>

      <WeekView recipes={recipes} />
    </div>
  )
}
