'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface PantryStaple {
  id: string
  name: string
  displayName: string
}

interface PantryStaplesListProps {
  initialStaples: PantryStaple[]
}

// Common staples for quick add
const COMMON_STAPLES = [
  'Salt',
  'Pepper',
  'Olive Oil',
  'Vegetable Oil',
  'Butter',
  'Garlic',
  'Onion',
  'Sugar',
  'Flour',
  'Rice',
  'Pasta',
  'Soy Sauce',
  'Vinegar',
  'Eggs',
  'Milk',
]

export function PantryStaplesList({ initialStaples }: PantryStaplesListProps) {
  const [staples, setStaples] = useState<PantryStaple[]>(initialStaples)
  const [newStaple, setNewStaple] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async (name?: string) => {
    const stapleName = name || newStaple.trim()
    if (!stapleName) return

    // Check if already exists
    if (staples.some((s) => s.name.toLowerCase() === stapleName.toLowerCase())) {
      toast.error('This staple already exists')
      return
    }

    setIsAdding(true)
    try {
      const response = await fetch('/api/pantry-staples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: stapleName }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add staple')
      }

      const staple = await response.json()
      setStaples((prev) => [...prev, staple].sort((a, b) => a.displayName.localeCompare(b.displayName)))
      setNewStaple('')
      toast.success('Staple added')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add staple')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/pantry-staples/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete staple')
      }

      setStaples((prev) => prev.filter((s) => s.id !== id))
      toast.success('Staple removed')
    } catch (error) {
      toast.error('Failed to remove staple')
    }
  }

  const availableSuggestions = COMMON_STAPLES.filter(
    (name) => !staples.some((s) => s.name.toLowerCase() === name.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Staple</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter staple name..."
              value={newStaple}
              onChange={(e) => setNewStaple(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
              }}
            />
            <Button onClick={() => handleAdd()} disabled={!newStaple.trim() || isAdding}>
              Add
            </Button>
          </div>

          {availableSuggestions.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Quick add:</p>
              <div className="flex flex-wrap gap-2">
                {availableSuggestions.map((name) => (
                  <Button
                    key={name}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAdd(name)}
                    disabled={isAdding}
                  >
                    + {name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Your Pantry Staples ({staples.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {staples.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No pantry staples yet. Add items that you always have on hand.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {staples.map((staple) => (
                <Badge
                  key={staple.id}
                  variant="secondary"
                  className="text-sm py-1.5 px-3 flex items-center gap-2"
                >
                  {staple.displayName}
                  <button
                    onClick={() => handleDelete(staple.id)}
                    className="hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            Pantry staples are items you always have on hand. They will be
            automatically excluded from your grocery lists.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
