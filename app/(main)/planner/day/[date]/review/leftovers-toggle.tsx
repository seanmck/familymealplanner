'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Refrigerator } from 'lucide-react'
import { toast } from 'sonner'

interface LeftoversToggleProps {
  plannedMealId: string
  hasLeftovers: boolean
  leftoversQuantity: string | null
  onUpdate?: () => void
}

export function LeftoversToggle({
  plannedMealId,
  hasLeftovers: initialHasLeftovers,
  leftoversQuantity: initialQuantity,
  onUpdate,
}: LeftoversToggleProps) {
  const [hasLeftovers, setHasLeftovers] = useState(initialHasLeftovers)
  const [quantity, setQuantity] = useState(initialQuantity || '')
  const [isUpdating, setIsUpdating] = useState(false)

  const handleToggle = async (checked: boolean) => {
    setHasLeftovers(checked)
    if (!checked) {
      setQuantity('')
    }
    await updateLeftovers(checked, checked ? quantity : null)
  }

  const handleQuantityBlur = async () => {
    if (hasLeftovers) {
      await updateLeftovers(hasLeftovers, quantity || null)
    }
  }

  const updateLeftovers = async (has: boolean, qty: string | null) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/planned-meals/${plannedMealId}/leftovers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hasLeftovers: has,
          leftoversQuantity: qty,
        }),
      })

      if (!response.ok) throw new Error('Failed to update leftovers')
      onUpdate?.()
    } catch (error) {
      toast.error('Failed to update leftovers')
      console.error(error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Switch
          id="leftovers"
          checked={hasLeftovers}
          onCheckedChange={handleToggle}
          disabled={isUpdating}
        />
        <Label htmlFor="leftovers" className="flex items-center gap-2 cursor-pointer">
          <Refrigerator className="h-4 w-4" />
          Leftovers available
        </Label>
      </div>

      {hasLeftovers && (
        <div className="ml-10">
          <Input
            placeholder="How much? (e.g., 'half', '2 servings')"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onBlur={handleQuantityBlur}
            className="max-w-xs"
          />
        </div>
      )}
    </div>
  )
}
