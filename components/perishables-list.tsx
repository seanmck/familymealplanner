'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

interface Perishable {
  id: string
  name: string
  displayName: string
  quantity: string | null
  unit: string | null
  expirationDate: string | null
}

interface PerishablesListProps {
  initialPerishables: Perishable[]
}

const UNITS = ['count', 'lbs', 'oz', 'kg', 'g', 'cups', 'pints', 'quarts', 'gallons', 'liters', 'dozen']

const COMMON_PERISHABLES = [
  'Eggs',
  'Milk',
  'Cheese',
  'Butter',
  'Chicken',
  'Ground Beef',
  'Yogurt',
  'Lettuce',
  'Tomatoes',
  'Onions',
  'Carrots',
  'Apples',
]

function getExpirationStatus(expirationDate: string | null): {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  className: string
} {
  if (!expirationDate) {
    return { label: 'No expiration', variant: 'outline', className: '' }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expDate = new Date(expirationDate)
  expDate.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { label: 'Expired', variant: 'destructive', className: '' }
  } else if (diffDays === 0) {
    return { label: 'Expires today', variant: 'destructive', className: '' }
  } else if (diffDays <= 3) {
    return { label: `${diffDays}d left`, variant: 'default', className: 'bg-orange-500 hover:bg-orange-600' }
  } else if (diffDays <= 7) {
    return { label: `${diffDays}d left`, variant: 'default', className: 'bg-yellow-500 hover:bg-yellow-600 text-yellow-950' }
  } else {
    return { label: `${diffDays}d left`, variant: 'secondary', className: '' }
  }
}

function formatQuantity(quantity: string | null, unit: string | null): string {
  if (!quantity) return ''
  const q = parseFloat(quantity)
  const formattedQ = Number.isInteger(q) ? q.toString() : q.toFixed(1)
  return unit ? `${formattedQ} ${unit}` : formattedQ
}

export function PerishablesList({ initialPerishables }: PerishablesListProps) {
  const [perishables, setPerishables] = useState<Perishable[]>(initialPerishables)
  const [newName, setNewName] = useState('')
  const [newQuantity, setNewQuantity] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [newExpiration, setNewExpiration] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async (quickAddName?: string) => {
    const name = quickAddName || newName.trim()
    if (!name) return

    // Check if already exists
    if (perishables.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      toast.error('This item already exists')
      return
    }

    setIsAdding(true)
    try {
      const response = await fetch('/api/perishables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          quantity: quickAddName ? null : (newQuantity || null),
          unit: quickAddName ? null : (newUnit || null),
          expirationDate: quickAddName ? null : (newExpiration || null),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add item')
      }

      const perishable = await response.json()
      // Serialize the response for consistency
      const serialized: Perishable = {
        ...perishable,
        quantity: perishable.quantity ? perishable.quantity.toString() : null,
        expirationDate: perishable.expirationDate
          ? new Date(perishable.expirationDate).toISOString().split('T')[0]
          : null,
      }

      setPerishables((prev) => {
        const updated = [...prev, serialized]
        // Sort by expiration date (nulls last), then by name
        return updated.sort((a, b) => {
          if (a.expirationDate && b.expirationDate) {
            return a.expirationDate.localeCompare(b.expirationDate)
          }
          if (a.expirationDate) return -1
          if (b.expirationDate) return 1
          return a.displayName.localeCompare(b.displayName)
        })
      })

      // Clear form
      setNewName('')
      setNewQuantity('')
      setNewUnit('')
      setNewExpiration('')
      toast.success('Item added')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add item')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/perishables/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete item')
      }

      setPerishables((prev) => prev.filter((p) => p.id !== id))
      toast.success('Item removed')
    } catch {
      toast.error('Failed to remove item')
    }
  }

  const availableSuggestions = COMMON_PERISHABLES.filter(
    (name) => !perishables.some((p) => p.name.toLowerCase() === name.toLowerCase())
  )

  // Separate items by expiration status
  const expiredItems = perishables.filter((p) => {
    if (!p.expirationDate) return false
    return new Date(p.expirationDate) < new Date(new Date().toDateString())
  })
  const activeItems = perishables.filter((p) => {
    if (!p.expirationDate) return true
    return new Date(p.expirationDate) >= new Date(new Date().toDateString())
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <Input
              placeholder="Item name (required)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) handleAdd()
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Quantity"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                min="0"
                step="0.1"
              />
              <Select value={newUnit || undefined} onValueChange={setNewUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Unit (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={newExpiration}
                onChange={(e) => setNewExpiration(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => handleAdd()}
                disabled={!newName.trim() || isAdding}
              >
                Add
              </Button>
            </div>
          </div>

          {availableSuggestions.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Quick add:</p>
              <div className="flex flex-wrap gap-2">
                {availableSuggestions.slice(0, 8).map((name) => (
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

      {expiredItems.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">
              Expired Items ({expiredItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiredItems.map((item) => {
                const status = getExpirationStatus(item.expirationDate)
                const qty = formatQuantity(item.quantity, item.unit)
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-destructive/10"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.displayName}</span>
                      {qty && (
                        <span className="text-sm text-muted-foreground">({qty})</span>
                      )}
                      <Badge variant={status.variant} className={status.className}>
                        {status.label}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Your Perishables ({activeItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No perishables tracked. Add items to get recipe suggestions that help you use them before they expire.
            </p>
          ) : (
            <div className="space-y-2">
              {activeItems.map((item) => {
                const status = getExpirationStatus(item.expirationDate)
                const qty = formatQuantity(item.quantity, item.unit)
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{item.displayName}</span>
                      {qty && (
                        <span className="text-sm text-muted-foreground">({qty})</span>
                      )}
                      <Badge variant={status.variant} className={status.className}>
                        {status.label}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            Perishables are items that may expire. When you get recipe suggestions,
            recipes using these items will be prioritized—especially those using items
            expiring soon.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
