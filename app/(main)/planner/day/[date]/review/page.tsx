import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { ReviewView } from './review-view'
import { parseDateString } from '@/lib/utils/dates'

interface Props {
  params: Promise<{ date: string }>
}

export default async function ReviewPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.householdId) {
    redirect('/login')
  }

  const { date: dateParam } = await params
  const date = parseDateString(dateParam)

  if (!date) {
    notFound()
  }

  const familyMembers = await db.familyMember.findMany({
    where: { householdId: session.user.householdId },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })

  // The signed-in user reviews their own dinner first, so put them on top
  const selfMemberId =
    familyMembers.find((member) => member.userId === session.user.id)?.id ?? null
  const orderedMembers = selfMemberId
    ? [
        ...familyMembers.filter((member) => member.id === selfMemberId),
        ...familyMembers.filter((member) => member.id !== selfMemberId),
      ]
    : familyMembers

  return (
    <ReviewView
      date={dateParam}
      familyMembers={orderedMembers}
      selfMemberId={selfMemberId}
    />
  )
}
