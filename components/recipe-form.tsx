'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Link2, Loader2, ExternalLink } from 'lucide-react'

interface Ingredient {
  id?: string
  name: string
  quantity?: number | null
  unit?: string | null
  notes?: string | null
}

interface RecipeFormProps {
  recipe?: {
    id: string
    title: string
    description?: string | null
    prepTimeMinutes?: number | null
    cookTimeMinutes?: number | null
    servings: number
    instructions: string
    tags: string[]
    type?: 'MAIN' | 'SIDE'
    imageUrl?: string | null
    sourceUrl?: string | null
    ingredients: Ingredient[]
  }
  defaultType?: 'MAIN' | 'SIDE'
}

export function RecipeForm({ recipe, defaultType = 'MAIN' }: RecipeFormProps) {
  const router = useRouter()
  const isEditing = !!recipe

  const [title, setTitle] = useState(recipe?.title || '')
  const [description, setDescription] = useState(recipe?.description || '')
  const [prepTime, setPrepTime] = useState(recipe?.prepTimeMinutes?.toString() || '')
  const [cookTime, setCookTime] = useState(recipe?.cookTimeMinutes?.toString() || '')
  const [servings, setServings] = useState(recipe?.servings?.toString() || '4')
  const [instructions, setInstructions] = useState(recipe?.instructions || '')
  const [tags, setTags] = useState(recipe?.tags?.join(', ') || '')
  const [recipeType, setRecipeType] = useState<'MAIN' | 'SIDE'>(recipe?.type || defaultType)
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe?.ingredients || [{ name: '', quantity: null, unit: '', notes: '' }]
  )
  const [imageUrl, setImageUrl] = useState(recipe?.imageUrl || '')
  const [sourceUrl, setSourceUrl] = useState(recipe?.sourceUrl || '')
  const [importUrl, setImportUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: null, unit: '', notes: '' }])
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: keyof Ingredient, value: string | number | null) => {
    setIngredients(
      ingredients.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing
      )
    )
  }

  const handleImport = async () => {
    if (!importUrl.trim()) return

    setIsImporting(true)
    try {
      const response = await fetch('/api/recipes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import recipe')
      }

      // Populate form fields with imported data
      setTitle(data.title || '')
      setDescription(data.description || '')
      setPrepTime(data.prepTimeMinutes?.toString() || '')
      setCookTime(data.cookTimeMinutes?.toString() || '')
      setServings(data.servings?.toString() || '4')
      setInstructions(data.instructions || '')
      setTags(data.tags?.join(', ') || '')
      setImageUrl(data.imageUrl || '')
      setSourceUrl(data.sourceUrl || '')

      // Map imported ingredients to our format
      if (data.ingredients && data.ingredients.length > 0) {
        setIngredients(
          data.ingredients.map((ing: { name: string; quantity?: number | null; unit?: string | null; notes?: string | null }) => ({
            name: ing.name,
            quantity: ing.quantity ?? null,
            unit: ing.unit || '',
            notes: ing.notes || '',
          }))
        )
      }

      setImportUrl('')
      toast.success('Recipe imported! Review the details and save when ready.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import recipe')
    } finally {
      setIsImporting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const payload = {
      title,
      description: description || null,
      prepTimeMinutes: prepTime ? parseInt(prepTime) : null,
      cookTimeMinutes: cookTime ? parseInt(cookTime) : null,
      servings: parseInt(servings) || 4,
      instructions,
      imageUrl: imageUrl || null,
      sourceUrl: sourceUrl || null,
      type: recipeType,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      ingredients: ingredients
        .filter((ing) => ing.name.trim())
        .map((ing) => ({
          name: ing.name.trim(),
          quantity: ing.quantity || 1,
          unit: ing.unit?.trim() || null,
          notes: ing.notes?.trim() || null,
        })),
    }

    try {
      const url = isEditing ? `/api/recipes/${recipe.id}` : '/api/recipes'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save recipe')
      }

      const savedRecipe = await response.json()
      toast.success(isEditing ? 'Recipe updated!' : 'Recipe created!')
      router.push(`/recipes/${savedRecipe.id}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save recipe')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Import from URL section - only show when creating new recipe */}
      {!isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Import from URL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://www.allrecipes.com/recipe/..."
                disabled={isImporting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleImport()
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleImport}
                disabled={isImporting || !importUrl.trim()}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Import'
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Paste a recipe URL to auto-fill the form. Works with most recipe websites.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Imported recipe info (source URL and image preview) */}
      {(sourceUrl || imageUrl) && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-4">
              {imageUrl && (
                <div className="flex-shrink-0">
                  <img
                    src={imageUrl}
                    alt="Recipe preview"
                    className="w-32 h-32 object-cover rounded-md"
                    onError={(e) => {
                      // Hide broken images
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}
              <div className="flex flex-col justify-center gap-2">
                {sourceUrl && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ExternalLink className="h-4 w-4 flex-shrink-0" />
                    <span>Imported from:</span>
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {new URL(sourceUrl).hostname}
                    </a>
                  </div>
                )}
                {imageUrl && (
                  <p className="text-xs text-muted-foreground">
                    Image will be saved with the recipe
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recipe Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3 space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Chicken Tacos"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={recipeType} onValueChange={(value: 'MAIN' | 'SIDE') => setRecipeType(value)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAIN">Main</SelectItem>
                  <SelectItem value="SIDE">Side</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A quick and easy weeknight dinner..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prepTime">Prep Time (min)</Label>
              <Input
                id="prepTime"
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cookTime">Cook Time (min)</Label>
              <Input
                id="cookTime"
                type="number"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                min={1}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="weeknight, chicken, mexican"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ingredients</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
            Add Ingredient
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {ingredients.map((ing, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-2">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={ing.quantity ?? ''}
                  onChange={(e) =>
                    updateIngredient(
                      index,
                      'quantity',
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  placeholder="1"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Unit</Label>
                <Input
                  value={ing.unit || ''}
                  onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                  placeholder="cups"
                />
              </div>
              <div className="col-span-4">
                <Label className="text-xs">Name *</Label>
                <Input
                  value={ing.name}
                  onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                  placeholder="flour"
                  required={index === 0 || ing.name.length > 0}
                />
              </div>
              <div className="col-span-3">
                <Label className="text-xs">Notes</Label>
                <Input
                  value={ing.notes || ''}
                  onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                  placeholder="sifted"
                />
              </div>
              <div className="col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeIngredient(index)}
                  disabled={ingredients.length === 1}
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructions *</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="1. Preheat oven to 375°F...&#10;2. Mix dry ingredients...&#10;3. ..."
            rows={10}
            required
          />
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Saving...'
            : isEditing
            ? 'Update Recipe'
            : 'Create Recipe'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
