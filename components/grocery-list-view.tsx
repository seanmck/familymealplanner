'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GroceryCategory } from '@/components/grocery-category'
import { getMonday, formatWeekRange, addWeeks } from '@/lib/utils/dates'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Loader2,
  ShoppingBag,
  Plus,
  Calendar,
  Copy,
  Check,
} from 'lucide-react'

interface GroceryItem {
  id: string
  name: string
  quantity: number | null
  unit: string | null
  category: string | null
  isChecked: boolean
}

interface GroceryList {
  id: string
  items: GroceryItem[]
}

interface MealPlan {
  id: string
  weekStartDate: string
}

export function GroceryListView() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [groceryList, setGroceryList] = useState<GroceryList | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState('1')
  const [newItemUnit, setNewItemUnit] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchData()
  }, [weekStart])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch meal plan
      const mpResponse = await fetch(
        `/api/meal-plans?weekStart=${weekStart.toISOString()}`
      )
      const mpData = await mpResponse.json()
      setMealPlan(mpData)

      if (mpData?.id) {
        // Fetch grocery list (always regenerated fresh by the API)
        const glResponse = await fetch(
          `/api/grocery-lists?mealPlanId=${mpData.id}`
        )
        const glData = await glResponse.json()
        setGroceryList(glData)
      } else {
        setGroceryList(null)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = async (id: string, isChecked: boolean) => {
    // Optimistic update
    setGroceryList((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === id ? { ...item, isChecked } : item
        ),
      }
    })

    try {
      await fetch(`/api/grocery-lists/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isChecked }),
      })
    } catch (error) {
      console.error('Failed to update item:', error)
      // Revert on error
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    // Optimistic update
    setGroceryList((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.filter((item) => item.id !== id),
      }
    })

    try {
      await fetch(`/api/grocery-lists/items/${id}`, {
        method: 'DELETE',
      })
    } catch (error) {
      console.error('Failed to delete item:', error)
      fetchData()
    }
  }

  const handleEdit = async (id: string, name: string) => {
    // Optimistic update - set name and clear quantity/unit for free-form text
    setGroceryList((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === id ? { ...item, name, quantity: null, unit: null } : item
        ),
      }
    })

    try {
      await fetch(`/api/grocery-lists/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, quantity: null, unit: null }),
      })
    } catch (error) {
      console.error('Failed to edit item:', error)
      fetchData()
    }
  }

  const handleAddItem = async () => {
    if (!newItemName.trim() || !groceryList?.id) return

    try {
      const response = await fetch('/api/grocery-lists/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groceryListId: groceryList.id,
          name: newItemName.trim(),
          quantity: parseFloat(newItemQuantity) || 1,
          unit: newItemUnit.trim(),
        }),
      })
      const newItem = await response.json()
      setGroceryList((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          items: [...prev.items, newItem],
        }
      })
      setNewItemName('')
      setNewItemQuantity('1')
      setNewItemUnit('')
    } catch (error) {
      console.error('Failed to add item:', error)
    }
  }

  // Group items by category
  const itemsByCategory = groceryList?.items.reduce((acc, item) => {
    const category = item.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, GroceryItem[]>)

  // Sort categories alphabetically but keep "Other" at the end
  const sortedCategories = itemsByCategory
    ? Object.keys(itemsByCategory).sort((a, b) => {
        if (a === 'Other') return 1
        if (b === 'Other') return -1
        return a.localeCompare(b)
      })
    : []

  const totalItems = groceryList?.items.length || 0
  const checkedItems = groceryList?.items.filter((i) => i.isChecked).length || 0

  const copyAsText = async () => {
    if (!groceryList?.items.length) return

    // Build plaintext grouped by category
    const lines: string[] = []
    sortedCategories.forEach((category) => {
      lines.push(`${category}:`)
      itemsByCategory![category].forEach((item) => {
        const qty = item.quantity ? `${item.quantity}` : ''
        const unit = item.unit || ''
        const prefix = qty || unit ? `${qty} ${unit}`.trim() + ' ' : ''
        lines.push(`  ${prefix}${item.name}`)
      })
      lines.push('') // blank line between categories
    })

    await navigator.clipboard.writeText(lines.join('\n').trim())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isCurrentWeek = () => {
    const today = getMonday(new Date())
    return weekStart.getTime() === today.getTime()
  }

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(addWeeks(weekStart, -1))}
            className="h-9 w-9 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-3 px-4">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{formatWeekRange(weekStart)}</h2>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            className="h-9 w-9 rounded-full"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {!isCurrentWeek() && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekStart(getMonday(new Date()))}
            className="text-primary hover:text-primary"
          >
            Back to this week
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm">Loading your grocery list...</span>
          </div>
        </div>
      ) : !mealPlan ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
            <Calendar className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-center mb-2">
            No meal plan for this week
          </h2>
          <p className="text-muted-foreground text-center max-w-sm">
            Head over to the Planner to add meals first, then come back to generate your grocery list.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Progress bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 w-32 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${totalItems > 0 ? (checkedItems / totalItems) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground">
                {checkedItems} of {totalItems} items
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyAsText}
              className="gap-2"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy as text'}
            </Button>
          </div>

          {/* Add Item Card */}
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Item
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Qty"
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(e.target.value)}
                  className="w-16 h-10 bg-background/50 border-border/60"
                  type="number"
                  min="0"
                  step="0.25"
                />
                <Input
                  placeholder="Unit"
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                  className="w-20 h-10 bg-background/50 border-border/60"
                />
                <Input
                  placeholder="Item name"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddItem()
                  }}
                  className="flex-1 h-10 bg-background/50 border-border/60"
                />
                <Button onClick={handleAddItem} disabled={!newItemName.trim()} className="h-10">
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Items by category */}
          {totalItems === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-center mb-1">
                No items in your list
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Add meals with recipes to generate items, or add items manually above.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sortedCategories.map((category) => (
                <GroceryCategory
                  key={category}
                  category={category}
                  items={itemsByCategory![category]}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
