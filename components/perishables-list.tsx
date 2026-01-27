'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Trash2, ChevronDown, ChevronUp, Plus, Loader2, Sparkles, X, Camera } from 'lucide-react'

interface Perishable {
  id: string
  name: string
  displayName: string
  quantity: string | null
  unit: string | null
  expirationDate: string | null
}

interface ParsedPerishable {
  name: string
  quantity?: number
  unit?: string
  expirationDate?: string
  notes?: string
  selected?: boolean
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
  const [showAddDetails, setShowAddDetails] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<{
    quantity: string
    unit: string
    expirationDate: string
  } | null>(null)

  // Clear all state
  const [clearAllOpen, setClearAllOpen] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  // Bulk add state
  const [bulkAddOpen, setBulkAddOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [parsedItems, setParsedItems] = useState<ParsedPerishable[] | null>(null)
  const [isAddingBulk, setIsAddingBulk] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAdd = async (quickAddName?: string) => {
    const name = quickAddName || newName.trim()
    if (!name) return

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
          unit: quickAddName ? null : (newUnit && newUnit !== 'none' ? newUnit : null),
          expirationDate: quickAddName ? null : (newExpiration || null),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add item')
      }

      const perishable = await response.json()
      const serialized: Perishable = {
        ...perishable,
        quantity: perishable.quantity ? perishable.quantity.toString() : null,
        expirationDate: perishable.expirationDate
          ? new Date(perishable.expirationDate).toISOString().split('T')[0]
          : null,
      }

      setPerishables((prev) => {
        const updated = [...prev, serialized]
        return updated.sort((a, b) => {
          if (a.expirationDate && b.expirationDate) {
            return a.expirationDate.localeCompare(b.expirationDate)
          }
          if (a.expirationDate) return -1
          if (b.expirationDate) return 1
          return a.displayName.localeCompare(b.displayName)
        })
      })

      setNewName('')
      setNewQuantity('')
      setNewUnit('')
      setNewExpiration('')
      setShowAddDetails(false)
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
      setExpandedItemId(null)
      toast.success('Item removed')
    } catch {
      toast.error('Failed to remove item')
    }
  }

  const handleClearAll = async () => {
    setIsClearing(true)
    let deletedCount = 0
    let failedCount = 0

    for (const item of perishables) {
      try {
        const response = await fetch(`/api/perishables/${item.id}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          deletedCount++
        } else {
          failedCount++
        }
      } catch {
        failedCount++
      }
    }

    setPerishables([])
    setExpandedItemId(null)
    setIsClearing(false)
    setClearAllOpen(false)

    if (failedCount === 0) {
      toast.success(`Cleared ${deletedCount} items`)
    } else {
      toast.success(`Cleared ${deletedCount} items (${failedCount} failed)`)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editingItem) return

    try {
      const response = await fetch(`/api/perishables/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: editingItem.quantity || null,
          unit: editingItem.unit && editingItem.unit !== 'none' ? editingItem.unit : null,
          expirationDate: editingItem.expirationDate || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update item')
      }

      const updated = await response.json()
      setPerishables((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                quantity: updated.quantity ? updated.quantity.toString() : null,
                unit: updated.unit,
                expirationDate: updated.expirationDate
                  ? new Date(updated.expirationDate).toISOString().split('T')[0]
                  : null,
              }
            : p
        )
      )
      setExpandedItemId(null)
      setEditingItem(null)
      toast.success('Item updated')
    } catch {
      toast.error('Failed to update item')
    }
  }

  const toggleExpand = (item: Perishable) => {
    if (expandedItemId === item.id) {
      setExpandedItemId(null)
      setEditingItem(null)
    } else {
      setExpandedItemId(item.id)
      setEditingItem({
        quantity: item.quantity || '',
        unit: item.unit || '',
        expirationDate: item.expirationDate || '',
      })
    }
  }

  // Bulk add handlers
  const handleParse = async () => {
    if (!bulkText.trim()) return

    setIsParsing(true)
    try {
      const response = await fetch('/api/perishables/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: bulkText }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to parse items')
      }

      const { items } = await response.json()

      // Mark items that already exist
      const existingNames = new Set(perishables.map((p) => p.name.toLowerCase()))
      const itemsWithSelection = items.map((item: ParsedPerishable) => ({
        ...item,
        selected: !existingNames.has(item.name.toLowerCase()),
      }))

      setParsedItems(itemsWithSelection)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to parse items')
    } finally {
      setIsParsing(false)
    }
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset the input so the same file can be re-selected
    e.target.value = ''

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image too large. Please use a smaller photo (max 5MB).')
      return
    }

    // Read as base64
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      // dataUrl format: "data:image/jpeg;base64,/9j/4AAQ..."
      const base64 = dataUrl.split(',')[1]
      const mediaType = dataUrl.split(';')[0].split(':')[1]

      setPhotoPreview(dataUrl)
      setBulkAddOpen(true)
      setIsParsing(true)

      try {
        const response = await fetch('/api/perishables/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, mediaType }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to identify items')
        }

        const { items } = await response.json()

        const existingNames = new Set(perishables.map((p) => p.name.toLowerCase()))
        const itemsWithSelection = items.map((item: ParsedPerishable) => ({
          ...item,
          selected: !existingNames.has(item.name.toLowerCase()),
        }))

        setParsedItems(itemsWithSelection)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to identify items')
      } finally {
        setIsParsing(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const toggleParsedItem = (index: number) => {
    if (!parsedItems) return
    setParsedItems(
      parsedItems.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    )
  }

  const handleAddBulk = async () => {
    if (!parsedItems) return

    const itemsToAdd = parsedItems.filter((item) => item.selected)
    if (itemsToAdd.length === 0) {
      toast.error('No items selected')
      return
    }

    setIsAddingBulk(true)
    let addedCount = 0
    let skippedCount = 0

    for (const item of itemsToAdd) {
      try {
        const response = await fetch('/api/perishables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: item.name,
            quantity: item.quantity || null,
            unit: item.unit || null,
            expirationDate: item.expirationDate || null,
          }),
        })

        if (response.ok) {
          const perishable = await response.json()
          const serialized: Perishable = {
            ...perishable,
            quantity: perishable.quantity ? perishable.quantity.toString() : null,
            expirationDate: perishable.expirationDate
              ? new Date(perishable.expirationDate).toISOString().split('T')[0]
              : null,
          }
          setPerishables((prev) => [...prev, serialized])
          addedCount++
        } else {
          skippedCount++
        }
      } catch {
        skippedCount++
      }
    }

    // Sort after all additions
    setPerishables((prev) =>
      [...prev].sort((a, b) => {
        if (a.expirationDate && b.expirationDate) {
          return a.expirationDate.localeCompare(b.expirationDate)
        }
        if (a.expirationDate) return -1
        if (b.expirationDate) return 1
        return a.displayName.localeCompare(b.displayName)
      })
    )

    setIsAddingBulk(false)
    setBulkAddOpen(false)
    setBulkText('')
    setParsedItems(null)
    setPhotoPreview(null)

    if (addedCount > 0) {
      toast.success(`Added ${addedCount} item${addedCount !== 1 ? 's' : ''}${skippedCount > 0 ? ` (${skippedCount} skipped)` : ''}`)
    } else {
      toast.error('No items were added')
    }
  }

  const closeBulkAdd = () => {
    setBulkAddOpen(false)
    setBulkText('')
    setParsedItems(null)
    setPhotoPreview(null)
  }

  const availableSuggestions = COMMON_PERISHABLES.filter(
    (name) => !perishables.some((p) => p.name.toLowerCase() === name.toLowerCase())
  )

  const expiredItems = perishables.filter((p) => {
    if (!p.expirationDate) return false
    return new Date(p.expirationDate) < new Date(new Date().toDateString())
  })
  const activeItems = perishables.filter((p) => {
    if (!p.expirationDate) return true
    return new Date(p.expirationDate) >= new Date(new Date().toDateString())
  })

  const renderItem = (item: Perishable, isExpired: boolean = false) => {
    const status = getExpirationStatus(item.expirationDate)
    const qty = formatQuantity(item.quantity, item.unit)
    const isExpanded = expandedItemId === item.id

    return (
      <div
        key={item.id}
        className={`rounded-lg ${isExpired ? 'bg-destructive/10' : 'hover:bg-muted/50'}`}
      >
        <div
          className="flex items-center justify-between p-2 cursor-pointer"
          onClick={() => toggleExpand(item)}
        >
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <span className="font-medium">{item.displayName}</span>
            {qty && (
              <span className="text-sm text-muted-foreground">({qty})</span>
            )}
            <Badge variant={status.variant} className={status.className}>
              {status.label}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {isExpanded && editingItem && (
          <div className="px-2 pb-2 space-y-2 border-t pt-2 mx-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Quantity"
                value={editingItem.quantity}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, quantity: e.target.value })
                }
                min="0"
                step="0.1"
              />
              <Select
                value={editingItem.unit || undefined}
                onValueChange={(value) =>
                  setEditingItem({ ...editingItem, unit: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No unit</SelectItem>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              type="date"
              value={editingItem.expirationDate}
              onChange={(e) =>
                setEditingItem({ ...editingItem, expirationDate: e.target.value })
              }
              placeholder="Expiration date"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(item.id)
                }}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Remove
              </Button>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleUpdate(item.id)
                }}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Add Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="What's in your fridge?"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) handleAdd()
              }}
              className="flex-1"
            />
            <Button
              onClick={() => handleAdd()}
              disabled={!newName.trim() || isAdding}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setShowAddDetails(!showAddDetails)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAddDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {showAddDetails ? 'Hide details' : 'Add details (qty, expiration)'}
          </button>

          {showAddDetails && (
            <div className="space-y-2 pl-1 border-l-2 border-muted ml-1">
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
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No unit</SelectItem>
                    {UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                type="date"
                value={newExpiration}
                onChange={(e) => setNewExpiration(e.target.value)}
                placeholder="Expiration date"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkAddOpen(true)}
              className="text-muted-foreground"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Add multiple items
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-muted-foreground"
            >
              <Camera className="h-4 w-4 mr-1" />
              Snap a photo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />
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
            <div className="space-y-1">
              {expiredItems.map((item) => renderItem(item, true))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">
            Your Perishables ({activeItems.length})
          </CardTitle>
          {perishables.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setClearAllOpen(true)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear all
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {activeItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No perishables tracked. Add items to get recipe suggestions that help you use them before they expire.
            </p>
          ) : (
            <div className="space-y-1">
              {activeItems.map((item) => renderItem(item))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            Tap any item to edit quantity, unit, or expiration date.
            Perishables expiring soon will be prioritized in recipe suggestions.
          </p>
        </CardContent>
      </Card>

      {/* Bulk Add Dialog */}
      <Dialog open={bulkAddOpen} onOpenChange={(open) => !open && closeBulkAdd()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {photoPreview ? 'Photo Results' : 'Add Multiple Items'}
            </DialogTitle>
            <DialogDescription>
              {photoPreview
                ? 'We identified these items from your photo.'
                : 'Type or paste your items naturally. We\'ll figure out the details.'}
            </DialogDescription>
          </DialogHeader>

          {isParsing && !parsedItems ? (
            <div className="flex flex-col items-center gap-4 py-8">
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Uploaded photo"
                  className="max-h-[150px] rounded-lg object-cover"
                />
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                {photoPreview ? 'Identifying items...' : 'Parsing...'}
              </div>
            </div>
          ) : !parsedItems ? (
            <>
              <Textarea
                placeholder={`Example:
3 apples
milk expires tomorrow
2 lbs ground beef
leftover chicken
half a lemon
spinach (a bit wilty)`}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="min-h-[150px]"
              />
              <DialogFooter>
                <Button variant="outline" onClick={closeBulkAdd}>
                  Cancel
                </Button>
                <Button
                  onClick={handleParse}
                  disabled={!bulkText.trim() || isParsing}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Parse Items
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {parsedItems.map((item, index) => {
                  const exists = perishables.some(
                    (p) => p.name.toLowerCase() === item.name.toLowerCase()
                  )
                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-2 p-2 rounded-lg border ${
                        exists
                          ? 'border-yellow-500/50 bg-yellow-500/10'
                          : item.selected
                          ? 'border-primary bg-primary/5'
                          : 'border-muted'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleParsedItem(index)}
                        className="h-4 w-4"
                        disabled={exists}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {[
                            item.quantity && `${item.quantity}${item.unit ? ` ${item.unit}` : ''}`,
                            item.expirationDate && `exp: ${item.expirationDate}`,
                            item.notes && item.notes,
                          ]
                            .filter(Boolean)
                            .join(' • ') || 'No details'}
                        </div>
                        {exists && (
                          <div className="text-xs text-yellow-600">Already exists</div>
                        )}
                      </div>
                      {!exists && item.selected && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleParsedItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => photoPreview ? closeBulkAdd() : setParsedItems(null)}
                >
                  {photoPreview ? 'Cancel' : 'Back'}
                </Button>
                <Button
                  onClick={handleAddBulk}
                  disabled={isAddingBulk || !parsedItems.some((i) => i.selected)}
                >
                  {isAddingBulk ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    `Add ${parsedItems.filter((i) => i.selected).length} Items`
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Clear All Confirmation Dialog */}
      <Dialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear all perishables?</DialogTitle>
            <DialogDescription>
              This will remove all {perishables.length} items from your list. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClearAllOpen(false)}
              disabled={isClearing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearAll}
              disabled={isClearing}
            >
              {isClearing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                'Clear all'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
