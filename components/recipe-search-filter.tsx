'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Loader2 } from 'lucide-react'

interface RecipeSearchFilterProps {
  allTags: string[]
}

export function RecipeSearchFilter({ allTags }: RecipeSearchFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const initialSearch = searchParams.get('search') ?? ''
  const initialTag = searchParams.get('tag') ?? ''
  const activeTag = initialTag && initialTag !== '__all__' ? initialTag : ''

  const [searchValue, setSearchValue] = useState(initialSearch)

  const updateParams = useCallback(
    (updates: { search?: string; tag?: string }) => {
      const params = new URLSearchParams(searchParams.toString())

      if (updates.search !== undefined) {
        if (updates.search) {
          params.set('search', updates.search)
        } else {
          params.delete('search')
        }
      }

      if (updates.tag !== undefined) {
        if (updates.tag && updates.tag !== '__all__') {
          params.set('tag', updates.tag)
        } else {
          params.delete('tag')
        }
      }

      startTransition(() => {
        router.push(`/recipes?${params.toString()}`, { scroll: false })
      })
    },
    [searchParams, router]
  )

  // Debounced search - update URL after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== initialSearch) {
        updateParams({ search: searchValue })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValue, initialSearch, updateParams])

  function handleTagChange(value: string) {
    updateParams({ tag: value })
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search recipes..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-10 h-11 bg-background border-border/60"
        />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {allTags.length > 0 && (
        <Select value={activeTag || '__all__'} onValueChange={handleTagChange}>
          <SelectTrigger className="w-full sm:w-[180px] h-11 bg-background border-border/60">
            <SelectValue placeholder="All tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All tags</SelectItem>
            {allTags.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
