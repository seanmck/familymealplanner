'use client'

import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Search } from 'lucide-react'

interface IngredientSearchInputProps {
  value: string[]
  onChange: (ingredients: string[]) => void
  placeholder?: string
  className?: string
}

export function IngredientSearchInput({
  value,
  onChange,
  placeholder = 'Type ingredients (e.g., chicken, spinach)',
  className,
}: IngredientSearchInputProps) {
  const [inputValue, setInputValue] = useState('')

  const addIngredient = useCallback(
    (ingredient: string) => {
      const trimmed = ingredient.trim().toLowerCase()
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed])
      }
    },
    [value, onChange]
  )

  const removeIngredient = useCallback(
    (ingredient: string) => {
      onChange(value.filter((i) => i !== ingredient))
    },
    [value, onChange]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (inputValue.trim()) {
        // Split by comma in case they pasted multiple
        const ingredients = inputValue.split(',').map((s) => s.trim())
        for (const ing of ingredients) {
          addIngredient(ing)
        }
        setInputValue('')
      }
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      removeIngredient(value[value.length - 1])
    }
  }

  const handleBlur = () => {
    if (inputValue.trim()) {
      const ingredients = inputValue.split(',').map((s) => s.trim())
      for (const ing of ingredients) {
        addIngredient(ing)
      }
      setInputValue('')
    }
  }

  const clearAll = () => {
    onChange([])
    setInputValue('')
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={value.length === 0 ? placeholder : 'Add more...'}
            className="pl-8"
          />
        </div>
        {value.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
        )}
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map((ingredient) => (
            <Badge
              key={ingredient}
              variant="secondary"
              className="gap-1 pr-1 text-xs"
            >
              {ingredient}
              <button
                type="button"
                onClick={() => removeIngredient(ingredient)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
