'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Users,
  Mail,
  Lock,
  User,
  Loader2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'

interface Props {
  token: string
  email: string
  householdName: string
  inviterName: string | null
  role: 'ADULT' | 'CHILD'
  hasExistingAccount: boolean
  existingUserHasHousehold: boolean
}

export function InviteAcceptForm({
  token,
  email,
  householdName,
  inviterName,
  hasExistingAccount,
  existingUserHasHousehold,
}: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Case: User already in different household
  if (existingUserHasHousehold) {
    return (
      <Card className="w-full max-w-md mx-auto border-amber-500/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle>Already in a Household</CardTitle>
          <CardDescription>
            The account for <strong>{email}</strong> is already a member of a
            different household. You&apos;ll need to leave your current household
            before joining a new one.
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Accept invitation
      const response = await fetch(`/api/invites/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: hasExistingAccount ? undefined : name,
          password: hasExistingAccount ? undefined : password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to accept invitation')
        return
      }

      if (hasExistingAccount) {
        // Redirect existing users to login
        router.push('/login?message=invitation-accepted')
      } else {
        // Auto sign in new users
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })

        if (result?.error) {
          // Fallback to login page if auto-signin fails
          router.push('/login?message=account-created')
        } else {
          router.push('/planner')
          router.refresh()
        }
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <CardTitle>Join {householdName}</CardTitle>
          <CardDescription className="mt-2">
            {inviterName
              ? `${inviterName} invited you to join their household`
              : "You've been invited to join this household"}
          </CardDescription>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Email (readonly) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="pl-10 bg-muted"
              />
            </div>
          </div>

          {hasExistingAccount ? (
            <Alert>
              <AlertDescription>
                An account with this email already exists. Click below to join
                the household, then sign in.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="pl-10"
                    required
                    minLength={8}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  At least 8 characters
                </p>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Joining...
              </>
            ) : hasExistingAccount ? (
              'Join Household'
            ) : (
              'Create Account & Join'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
