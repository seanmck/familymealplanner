'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { toast } from 'sonner'
import { Copy, Key, Trash2, AlertTriangle } from 'lucide-react'

interface ApiToken {
  id: string
  name: string
  createdAt: Date
  lastUsedAt: Date | null
}

interface ApiTokenListProps {
  initialTokens: ApiToken[]
}

export function ApiTokenList({ initialTokens }: ApiTokenListProps) {
  const router = useRouter()
  const [tokens, setTokens] = useState(initialTokens)
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!newName.trim()) return

    setIsCreating(true)
    try {
      const response = await fetch('/api/settings/api-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })

      if (!response.ok) throw new Error('Failed to create token')

      const data = await response.json()
      setTokens([{ ...data, createdAt: new Date(data.createdAt), lastUsedAt: null }, ...tokens])
      setNewlyCreatedToken(data.token)
      setNewName('')
      toast.success('API token created')
      router.refresh()
    } catch (error) {
      toast.error('Failed to create API token')
      console.error(error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const response = await fetch(`/api/settings/api-tokens/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete token')

      setTokens(tokens.filter((t) => t.id !== id))
      toast.success('API token revoked')
      router.refresh()
    } catch (error) {
      toast.error('Failed to revoke API token')
      console.error(error)
    } finally {
      setDeletingId(null)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Token copied to clipboard')
    } catch {
      toast.error('Failed to copy token')
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* New token alert */}
      {newlyCreatedToken && (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">
            Save your token now
          </AlertTitle>
          <AlertDescription className="mt-2">
            <p className="text-amber-700 dark:text-amber-300 mb-3">
              This token will only be shown once. Copy it now and store it securely.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-amber-100 dark:bg-amber-900/40 px-3 py-2 rounded text-sm font-mono break-all">
                {newlyCreatedToken}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(newlyCreatedToken)}
                className="shrink-0"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-amber-700 dark:text-amber-300"
              onClick={() => setNewlyCreatedToken(null)}
            >
              I&apos;ve saved the token
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Create token form */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Token</CardTitle>
          <CardDescription>
            Give your token a descriptive name to identify its purpose.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="tokenName" className="sr-only">
                Token Name
              </Label>
              <Input
                id="tokenName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Claude MCP Server"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <Button onClick={handleCreate} disabled={isCreating || !newName.trim()}>
              {isCreating ? 'Creating...' : 'Create Token'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Token list */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Active Tokens</h2>
        {tokens.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No API tokens yet. Create one above to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          tokens.map((token) => (
            <Card key={token.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Key className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{token.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Created {formatDate(token.createdAt)}
                        {token.lastUsedAt && (
                          <> · Last used {formatDate(token.lastUsedAt)}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(token.id)}
                    disabled={deletingId === token.id}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {deletingId === token.id ? 'Revoking...' : 'Revoke'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
