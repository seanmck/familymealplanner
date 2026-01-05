'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GroceryItem } from '@/components/grocery-item'

interface GroceryItemData {
  id: string
  name: string
  quantity: number | null
  unit: string | null
  isChecked: boolean
}

interface GroceryCategoryProps {
  category: string
  items: GroceryItemData[]
  onToggle: (id: string, isChecked: boolean) => void
  onDelete: (id: string) => void
  onEdit: (id: string, name: string) => void
  onAddToPantry: (id: string, name: string) => void
}

export function GroceryCategory({
  category,
  items,
  onToggle,
  onDelete,
  onEdit,
  onAddToPantry,
}: GroceryCategoryProps) {
  const checkedCount = items.filter((i) => i.isChecked).length

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{category}</span>
          <span className="text-xs text-muted-foreground font-normal">
            {checkedCount}/{items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y">
          {items.map((item) => (
            <GroceryItem
              key={item.id}
              {...item}
              onToggle={onToggle}
              onDelete={onDelete}
              onEdit={onEdit}
              onAddToPantry={onAddToPantry}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
