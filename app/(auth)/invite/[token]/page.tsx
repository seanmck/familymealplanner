import { db } from '@/lib/db'
import { hashToken } from '@/lib/api-auth'
import { InviteAcceptForm } from './invite-accept-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params
  const hashedToken = hashToken(token)

  const invitation = await db.invitation.findUnique({
    where: { token: hashedToken },
    include: { household: { select: { name: true } } },
  })

  // Invalid token
  if (!invitation) {
    return (
      <ErrorCard
        title="Invalid Invitation"
        message="This invitation link is invalid or has been removed."
      />
    )
  }

  // Already accepted
  if (invitation.status === 'ACCEPTED') {
    return (
      <Card className="w-full max-w-md mx-auto border-green-500/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Already Accepted</CardTitle>
          <CardDescription>
            This invitation has already been accepted. You can sign in to access
            your household.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Revoked
  if (invitation.status === 'REVOKED') {
    return (
      <ErrorCard
        title="Invitation Revoked"
        message="This invitation has been revoked. Please contact the person who invited you for a new invitation."
      />
    )
  }

  // Expired
  if (invitation.expiresAt < new Date()) {
    // Update status in background
    db.invitation
      .update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      })
      .catch(() => {})

    return (
      <ErrorCard
        title="Invitation Expired"
        message="This invitation has expired. Please ask for a new invitation."
      />
    )
  }

  // Check if user already exists
  const existingUser = await db.user.findUnique({
    where: { email: invitation.email },
  })

  return (
    <InviteAcceptForm
      token={token}
      email={invitation.email}
      householdName={invitation.household.name}
      inviterName={invitation.inviterName}
      role={invitation.role}
      hasExistingAccount={!!existingUser}
      existingUserHasHousehold={!!existingUser?.householdId}
    />
  )
}

function ErrorCard({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <Card className="w-full max-w-md mx-auto border-destructive/50">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button asChild variant="outline">
          <Link href="/">Go Home</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
