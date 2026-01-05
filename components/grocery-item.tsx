'use client'

import { useState, useRef, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Package } from 'lucide-react'

interface GroceryItemProps {
  id: string
  name: string
  quantity: number | null
  unit: string | null
  isChecked: boolean
  onToggle: (id: string, isChecked: boolean) => void
  onDelete: (id: string) => void
  onEdit: (id: string, name: string) => void
  onAddToPantry: (id: string, name: string) => void
}

export function GroceryItem({
  id,
  name,
  quantity,
  unit,
  isChecked,
  onToggle,
  onDelete,
  onEdit,
  onAddToPantry,
}: GroceryItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAddingToPantry, setIsAddingToPantry] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete(id)
  }

  const handleAddToPantry = async () => {
    setIsAddingToPantry(true)
    await onAddToPantry(id, name)
  }

  const getDisplayText = () => {
    const qtyStr = formatQuantity()
    const parts = []
    if (qtyStr) parts.push(qtyStr)
    if (unit) parts.push(unit)
    parts.push(name)
    return parts.join(' ')
  }

  const startEditing = () => {
    setEditValue(getDisplayText())
    setIsEditing(true)
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== getDisplayText()) {
      onEdit(id, trimmed)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }

  const formatQuantity = () => {
    if (quantity === null || quantity === undefined) return ''
    const num = Number(quantity)
    if (num === Math.floor(num)) {
      return num.toString()
    }
    return num.toFixed(2).replace(/\.?0+$/, '')
  }

  const qtyStr = formatQuantity()

  return (
    <div className="flex items-center gap-3 py-2 group">
      <Checkbox
        id={id}
        checked={isChecked}
        onCheckedChange={(value) => onToggle(id, value as boolean)}
        disabled={isEditing}
      />
      {isEditing ? (
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-1 h-8"
        />
      ) : (
        <label
          htmlFor={id}
          className={`flex-1 cursor-pointer ${
            isChecked ? 'line-through text-muted-foreground' : ''
          }`}
        >
          {qtyStr && <span className="font-medium">{qtyStr}</span>}
          {unit && <span className="text-muted-foreground"> {unit}</span>}
          <span>{qtyStr || unit ? ' ' : ''}{name}</span>
        </label>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={startEditing}
        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        title="Edit item"
      >
        <Pencil className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleAddToPantry}
        disabled={isAddingToPantry}
        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-muted-foreground hover:text-primary"
        title="Add to pantry staples"
      >
        <Package className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={isDeleting}
        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-destructive"
        title="Remove from list"
      >
        ×
      </Button>
    </div>
  )
}
