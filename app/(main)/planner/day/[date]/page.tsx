import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { DayView } from './day-view'
import { parseDateString } from '@/lib/utils/dates'

interface Props {
  params: Promise<{ date: string }>
}

export default async function DayPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.householdId) {
    redirect('/login')
  }

  const { date: dateParam } = await params
  const date = parseDateString(dateParam)

  if (!date) {
    notFound()
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

  const familyMembers = await db.familyMember.findMany({
    where: { householdId: session.user.householdId },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })

  return (
    <DayView
      date={dateParam}
      recipes={recipes}
      familyMembers={familyMembers}
    />
  )
}
