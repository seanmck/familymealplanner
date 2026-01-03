'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Mail, Send, X, Clock, RotateCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Invitation {
  id: string
  email: string
  role: 'ADULT' | 'CHILD'
  status: string
  expiresAt: string
  createdAt: string
}

interface Props {
  initialInvitations: Invitation[]
}

export function InviteSection({ initialInvitations }: Props) {
  const router = useRouter()
  const [invitations, setInvitations] = useState(initialInvitations)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'ADULT' | 'CHILD'>('ADULT')
  const [isSending, setIsSending] = useState(false)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const pendingInvitations = invitations.filter((i) => i.status === 'PENDING')

  const handleInvite = async () => {
    if (!email.trim()) return

    setIsSending(true)
    try {
      const response = await fetch('/api/family/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }

      setInvitations([data, ...invitations])
      setEmail('')
      toast.success('Invitation sent!')
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to send invitation'
      )
    } finally {
      setIsSending(false)
    }
  }

  const handleRevoke = async (id: string) => {
    setRevokingId(id)
    try {
      const response = await fetch(`/api/family/invite/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to revoke')

      setInvitations(
        invitations.map((i) =>
          i.id === id ? { ...i, status: 'REVOKED' } : i
        )
      )
      toast.success('Invitation revoked')
      router.refresh()
    } catch {
      toast.error('Failed to revoke invitation')
    } finally {
      setRevokingId(null)
    }
  }

  const handleResend = async (id: string) => {
    setResendingId(id)
    try {
      const response = await fetch(`/api/family/invite/${id}`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to resend')

      // Update expiry in local state
      setInvitations(
        invitations.map((i) =>
          i.id === id
            ? {
                ...i,
                expiresAt: new Date(
                  Date.now() + 7 * 24 * 60 * 60 * 1000
                ).toISOString(),
              }
            : i
        )
      )
      toast.success('Invitation resent')
      router.refresh()
    } catch {
      toast.error('Failed to resend invitation')
    } finally {
      setResendingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite Family Member
          </CardTitle>
          <CardDescription>
            Send an email invitation to add someone to your household. They can
            create an account or link their existing account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="inviteEmail" className="sr-only">
                Email
              </Label>
              <Input
                id="inviteEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
            </div>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as 'ADULT' | 'CHILD')}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADULT">Adult</SelectItem>
                <SelectItem value="CHILD">Child</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleInvite}
              disabled={isSending || !email.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              {isSending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Pending Invitations
          </h3>
          {pendingInvitations.map((invite) => (
            <Card key={invite.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Expires{' '}
                        {formatDistanceToNow(new Date(invite.expiresAt), {
                          addSuffix: true,
                        })}
                        <Badge variant="secondary" className="ml-2">
                          {invite.role === 'CHILD' ? 'Child' : 'Adult'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResend(invite.id)}
                      disabled={resendingId === invite.id}
                    >
                      <RotateCw
                        className={`h-4 w-4 mr-1 ${resendingId === invite.id ? 'animate-spin' : ''}`}
                      />
                      Resend
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRevoke(invite.id)}
                      disabled={revokingId === invite.id}
                    >
                      <X className="h-4 w-4 mr-1" />
                      {revokingId === invite.id ? 'Revoking...' : 'Revoke'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
