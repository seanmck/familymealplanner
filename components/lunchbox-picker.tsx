'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Plus, Pencil, Check, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

const LUNCHBOX_CATEGORIES = ['main', 'side', 'fruit', 'snack', 'treat'] as const
type LunchboxCategory = (typeof LUNCHBOX_CATEGORIES)[number]

const CATEGORY_LABELS: Record<LunchboxCategory, string> = {
  main: 'Main',
  side: 'Side',
  fruit: 'Fruit',
  snack: 'Snack',
  treat: 'Treat',
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export interface LunchboxItem {
  id: string
  dayOfWeek: number
  category: string | null
  name: string
  notes: string | null
  sortOrder: number
  familyMemberId: string
  familyMember: {
    id: string
    name: string
    role: 'ADULT' | 'CHILD'
  }
}

export interface FamilyMember {
  id: string
  name: string
  role: 'ADULT' | 'CHILD'
}

interface LunchboxPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dayOfWeek: number
  mealPlanId: string
  familyMembers: FamilyMember[]
  existingItems: LunchboxItem[]
  onRefresh: () => void
  initialMemberId?: string
}

function LunchboxPickerContent({
  dayOfWeek,
  mealPlanId,
  familyMembers,
  existingItems,
  onRefresh,
  initialMemberId,
}: Omit<LunchboxPickerProps, 'open' | 'onOpenChange'>) {
  const [activeTab, setActiveTab] = useState<string>(() => initialMemberId || familyMembers[0]?.id || '')
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState<string>('')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState<string>('')
  const [showNotesFor, setShowNotesFor] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState('')

  // Filter items for current tab and day
  const currentItems = existingItems.filter(
    (item) => item.familyMemberId === activeTab && item.dayOfWeek === dayOfWeek
  )

  const handleAddItem = async () => {
    if (!newItemName.trim() || !activeTab) return

    setIsAdding(true)
    try {
      const response = await fetch('/api/lunchbox-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealPlanId,
          familyMemberId: activeTab,
          dayOfWeek,
          name: newItemName.trim(),
          category: newItemCategory || null,
          sortOrder: currentItems.length,
        }),
      })

      if (response.ok) {
        setNewItemName('')
        setNewItemCategory('')
        onRefresh()
      }
    } catch (error) {
      console.error('Error adding lunchbox item:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteItem = async (id: string) => {
    try {
      const response = await fetch(`/api/lunchbox-items/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onRefresh()
      }
    } catch (error) {
      console.error('Error deleting lunchbox item:', error)
    }
  }

  const handleStartEdit = (item: LunchboxItem) => {
    setEditingId(item.id)
    setEditName(item.name)
    setEditCategory(item.category || '')
  }

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return

    try {
      const response = await fetch(`/api/lunchbox-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          category: editCategory || null,
        }),
      })

      if (response.ok) {
        setEditingId(null)
        onRefresh()
      }
    } catch (error) {
      console.error('Error updating lunchbox item:', error)
    }
  }

  const handleSaveNotes = async (id: string) => {
    try {
      const response = await fetch(`/api/lunchbox-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: editNotes.trim() || null,
        }),
      })

      if (response.ok) {
        setShowNotesFor(null)
        onRefresh()
      }
    } catch (error) {
      console.error('Error updating notes:', error)
    }
  }

  const handleToggleNotes = (item: LunchboxItem) => {
    if (showNotesFor === item.id) {
      setShowNotesFor(null)
    } else {
      setShowNotesFor(item.id)
      setEditNotes(item.notes || '')
    }
  }

  const activeMember = familyMembers.find((m) => m.id === activeTab)

  return (
    <>
      <DialogHeader>
        <DialogTitle>Plan Lunches - {DAY_NAMES[dayOfWeek]}</DialogTitle>
      </DialogHeader>

      {/* Tabs */}
      {familyMembers.length > 0 ? (
        <div className="flex gap-1 border-b -mx-6 px-6 overflow-x-auto">
          {familyMembers.map((member) => {
            const itemCount = existingItems.filter(
              (item) => item.familyMemberId === member.id && item.dayOfWeek === dayOfWeek
            ).length

            return (
              <button
                key={member.id}
                onClick={() => setActiveTab(member.id)}
                className={cn(
                  'px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
                  activeTab === member.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {member.name}
                {itemCount > 0 && (
                  <span className="ml-1.5 text-xs text-muted-foreground">({itemCount})</span>
                )}
              </button>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4">
          No family members found. Add family members in Settings first.
        </p>
      )}

      {/* Tab Content */}
      {activeMember && (
        <div className="flex-1 overflow-auto mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{activeMember.name}&apos;s Lunch</h3>
            {activeMember.role === 'CHILD' && (
              <Badge variant="secondary" className="text-xs">
                Child
              </Badge>
            )}
          </div>

          {/* Item List */}
          {currentItems.length > 0 ? (
            <div className="space-y-2">
              {currentItems.map((item) => (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                    {editingId === item.id ? (
                      <>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 h-8"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(item.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                        />
                        <Select value={editCategory || 'none'} onValueChange={(v) => setEditCategory(v === 'none' ? '' : v)}>
                          <SelectTrigger className="w-24 h-8" size="sm">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {LUNCHBOX_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {CATEGORY_LABELS[cat]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(item.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm">{item.name}</span>
                        {item.category && (
                          <Badge variant="outline" className="text-xs">
                            {CATEGORY_LABELS[item.category as LunchboxCategory] || item.category}
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn('h-7 w-7 p-0', item.notes && 'text-primary')}
                          onClick={() => handleToggleNotes(item)}
                          title={item.notes ? 'Edit notes' : 'Add notes'}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => handleStartEdit(item)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Notes expansion */}
                  {showNotesFor === item.id && (
                    <div className="flex gap-2 pl-2">
                      <Input
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Add notes (e.g., 'no crusts', 'cut into triangles')"
                        className="flex-1 h-8 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNotes(item.id)
                          if (e.key === 'Escape') setShowNotesFor(null)
                        }}
                      />
                      <Button size="sm" onClick={() => handleSaveNotes(item.id)}>
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No items yet. Add something below!
            </p>
          )}

          {/* Add Item */}
          <div className="flex gap-2 pt-2 border-t">
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Add item (e.g., 'PB&J', 'carrots')"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isAdding) handleAddItem()
              }}
            />
            <Select value={newItemCategory || 'none'} onValueChange={(v) => setNewItemCategory(v === 'none' ? '' : v)}>
              <SelectTrigger className="w-24" size="sm">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {LUNCHBOX_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddItem} disabled={isAdding || !newItemName.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

export function LunchboxPicker({
  open,
  onOpenChange,
  dayOfWeek,
  mealPlanId,
  familyMembers,
  existingItems,
  onRefresh,
  initialMemberId,
}: LunchboxPickerProps) {
  // Use a key based on open state to reset form state when dialog opens
  const contentKey = open ? `open-${dayOfWeek}-${initialMemberId || ''}` : 'closed'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <LunchboxPickerContent
          key={contentKey}
          dayOfWeek={dayOfWeek}
          mealPlanId={mealPlanId}
          familyMembers={familyMembers}
          existingItems={existingItems}
          onRefresh={onRefresh}
          initialMemberId={initialMemberId}
        />
      </DialogContent>
    </Dialog>
  )
}
