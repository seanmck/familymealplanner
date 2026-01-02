'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'

interface GroceryItemProps {
  id: string
  name: string
  quantity: number | null
  unit: string | null
  isChecked: boolean
  onToggle: (id: string, isChecked: boolean) => void
  onDelete: (id: string) => void
}

export function GroceryItem({
  id,
  name,
  quantity,
  unit,
  isChecked,
  onToggle,
  onDelete,
}: GroceryItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete(id)
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
      />
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
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={isDeleting}
        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-destructive"
      >
        ×
      </Button>
    </div>
  )
}
