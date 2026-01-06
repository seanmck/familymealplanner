'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Backpack } from 'lucide-react'
import { toast } from 'sonner'

interface LunchboxItem {
  id: string
  dayOfWeek: number
  category: string | null
  name: string
  notes: string | null
  wasConsumed: boolean
  consumptionNote: string | null
  familyMemberId: string
  familyMember: { id: string; name: string; role: 'ADULT' | 'CHILD' }
}

interface FamilyMember {
  id: string
  name: string
  role: 'ADULT' | 'CHILD'
}

interface LunchboxReviewProps {
  items: LunchboxItem[]
  familyMembers: FamilyMember[]
  onUpdate?: () => void
}

const categoryColors: Record<string, string> = {
  main: 'bg-orange-100 text-orange-800',
  side: 'bg-blue-100 text-blue-800',
  fruit: 'bg-green-100 text-green-800',
  snack: 'bg-purple-100 text-purple-800',
  treat: 'bg-pink-100 text-pink-800',
}

export function LunchboxReview({ items, familyMembers, onUpdate }: LunchboxReviewProps) {
  const [localItems, setLocalItems] = useState<Record<string, { wasConsumed: boolean; consumptionNote: string }>>(
    () => {
      const initial: Record<string, { wasConsumed: boolean; consumptionNote: string }> = {}
      items.forEach((item) => {
        initial[item.id] = {
          wasConsumed: item.wasConsumed,
          consumptionNote: item.consumptionNote || '',
        }
      })
      return initial
    }
  )
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Group items by family member
  const itemsByMember = items.reduce(
    (acc, item) => {
      const memberId = item.familyMemberId
      if (!acc[memberId]) {
        acc[memberId] = []
      }
      acc[memberId].push(item)
      return acc
    },
    {} as Record<string, LunchboxItem[]>
  )

  const handleToggle = async (itemId: string, wasConsumed: boolean) => {
    // Optimistic update
    setLocalItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], wasConsumed },
    }))
    setUpdatingId(itemId)

    try {
      const response = await fetch(`/api/lunchbox-items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wasConsumed,
          consumptionNote: wasConsumed ? null : localItems[itemId]?.consumptionNote || null,
        }),
      })

      if (!response.ok) throw new Error('Failed to update')
      onUpdate?.()
    } catch (error) {
      // Revert on error
      const originalItem = items.find((i) => i.id === itemId)
      if (originalItem) {
        setLocalItems((prev) => ({
          ...prev,
          [itemId]: {
            wasConsumed: originalItem.wasConsumed,
            consumptionNote: originalItem.consumptionNote || '',
          },
        }))
      }
      toast.error('Failed to update')
      console.error(error)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleNoteBlur = async (itemId: string) => {
    const state = localItems[itemId]
    if (!state || state.wasConsumed) return

    setUpdatingId(itemId)
    try {
      const response = await fetch(`/api/lunchbox-items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wasConsumed: state.wasConsumed,
          consumptionNote: state.consumptionNote || null,
        }),
      })

      if (!response.ok) throw new Error('Failed to update')
      onUpdate?.()
    } catch (error) {
      toast.error('Failed to save note')
      console.error(error)
    } finally {
      setUpdatingId(null)
    }
  }

  // Get members who have lunchbox items
  const membersWithItems = familyMembers.filter((m) => itemsByMember[m.id]?.length > 0)

  if (membersWithItems.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Backpack className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Lunchbox Review</CardTitle>
            <p className="text-sm text-muted-foreground">Uncheck items that came back uneaten</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {membersWithItems.map((member) => {
            const memberItems = itemsByMember[member.id] || []
            const consumedCount = memberItems.filter(
              (i) => localItems[i.id]?.wasConsumed ?? i.wasConsumed
            ).length

            return (
              <div
                key={member.id}
                className="rounded-lg border bg-card overflow-hidden"
              >
                {/* Member header */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{member.name}</span>
                    {member.role === 'CHILD' && (
                      <Badge variant="outline" className="text-xs">
                        Kid
                      </Badge>
                    )}
                  </div>
                  <Badge
                    variant={consumedCount === memberItems.length ? 'default' : 'secondary'}
                    className={
                      consumedCount === memberItems.length
                        ? 'bg-green-500'
                        : consumedCount === 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }
                  >
                    {consumedCount}/{memberItems.length} eaten
                  </Badge>
                </div>

                {/* Items list */}
                <div className="p-3 space-y-2">
                  {memberItems.map((item) => {
                    const state = localItems[item.id] || {
                      wasConsumed: item.wasConsumed,
                      consumptionNote: item.consumptionNote || '',
                    }
                    const isUpdating = updatingId === item.id

                    return (
                      <div key={item.id} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={item.id}
                            checked={state.wasConsumed}
                            onCheckedChange={(checked) =>
                              handleToggle(item.id, checked as boolean)
                            }
                            disabled={isUpdating}
                            className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                          />
                          <label
                            htmlFor={item.id}
                            className={`flex-1 flex items-center gap-2 cursor-pointer text-sm ${
                              !state.wasConsumed ? 'text-muted-foreground line-through' : ''
                            }`}
                          >
                            <span>{item.name}</span>
                            {item.category && (
                              <Badge
                                variant="secondary"
                                className={`text-[10px] ${categoryColors[item.category] || ''}`}
                              >
                                {item.category}
                              </Badge>
                            )}
                          </label>
                        </div>

                        {/* Note input when not consumed */}
                        {!state.wasConsumed && (
                          <div className="ml-7">
                            <Input
                              placeholder="Why? (optional)"
                              value={state.consumptionNote}
                              onChange={(e) =>
                                setLocalItems((prev) => ({
                                  ...prev,
                                  [item.id]: { ...prev[item.id], consumptionNote: e.target.value },
                                }))
                              }
                              onBlur={() => handleNoteBlur(item.id)}
                              className="text-sm h-8"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
