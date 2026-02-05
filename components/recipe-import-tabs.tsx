'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Link2, Loader2, FileText, Camera, Upload } from 'lucide-react'
import type { ParsedRecipe } from '@/lib/recipe-parser'

interface RecipeImportTabsProps {
  onParsed: (recipe: ParsedRecipe) => void
}

export function RecipeImportTabs({ onParsed }: RecipeImportTabsProps) {
  const [activeTab, setActiveTab] = useState('url')

  // URL import state
  const [importUrl, setImportUrl] = useState('')
  const [isImportingUrl, setIsImportingUrl] = useState(false)

  // Text parse state
  const [recipeText, setRecipeText] = useState('')
  const [isParsingText, setIsParsingText] = useState(false)

  // Photo parse state
  const [isParsingPhoto, setIsParsingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportUrl = async () => {
    if (!importUrl.trim()) return

    setIsImportingUrl(true)
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

      onParsed(data)
      setImportUrl('')
      toast.success('Recipe imported! Review the details and save when ready.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import recipe')
    } finally {
      setIsImportingUrl(false)
    }
  }

  const handleParseText = async () => {
    if (!recipeText.trim()) return

    setIsParsingText(true)
    try {
      const response = await fetch('/api/recipes/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: recipeText }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse recipe')
      }

      onParsed(data.recipe)
      setRecipeText('')
      toast.success('Recipe parsed! Review the details and save when ready.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to parse recipe')
    } finally {
      setIsParsingText(false)
    }
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset the input so the same file can be re-selected
    e.target.value = ''

    processFile(file)
  }

  const processFile = async (file: File) => {
    // Clear any previous error
    setPhotoError(null)

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
    reader.onerror = () => {
      console.error('[recipe-import] FileReader error:', reader.error)
      toast.error('Failed to read image file')
      setPhotoError('Failed to read image file')
    }
    reader.onload = async () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1]
      const mediaType = dataUrl.split(';')[0].split(':')[1]

      console.log('[recipe-import] Image loaded:', {
        mediaType,
        base64Length: base64?.length,
      })

      setPhotoPreview(dataUrl)
      setIsParsingPhoto(true)

      try {
        console.log('[recipe-import] Sending to API...')
        const response = await fetch('/api/recipes/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, mediaType }),
        })

        console.log('[recipe-import] API response status:', response.status)
        const data = await response.json()
        console.log('[recipe-import] API response data:', data)

        if (!response.ok) {
          throw new Error(data.error || 'Failed to parse recipe')
        }

        onParsed(data.recipe)
        setPhotoPreview(null)
        setPhotoError(null)
        toast.success('Recipe parsed! Review the details and save when ready.')
      } catch (error) {
        console.error('[recipe-import] Error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to parse recipe'
        setPhotoError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setIsParsingPhoto(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    processFile(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Recipe</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              URL
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Text
            </TabsTrigger>
            <TabsTrigger value="photo" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Photo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-3 mt-4">
            <div className="flex gap-2">
              <Input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://www.allrecipes.com/recipe/..."
                disabled={isImportingUrl}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleImportUrl()
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleImportUrl}
                disabled={isImportingUrl || !importUrl.trim()}
              >
                {isImportingUrl ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Import'
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Paste a recipe URL to auto-fill the form. Works with most recipe websites.
            </p>
          </TabsContent>

          <TabsContent value="text" className="space-y-3 mt-4">
            <Textarea
              value={recipeText}
              onChange={(e) => setRecipeText(e.target.value)}
              placeholder={`Paste or type a recipe here. For example:

Grandma's Chocolate Chip Cookies

Prep: 15 min, Cook: 12 min, Makes 24 cookies

Ingredients:
2 1/4 cups flour
1 tsp baking soda
1 cup butter, softened
3/4 cup sugar
2 eggs
1 tsp vanilla
2 cups chocolate chips

Instructions:
1. Preheat oven to 375°F
2. Mix flour and baking soda
3. Cream butter and sugar
...`}
              className="min-h-[200px]"
              disabled={isParsingText}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={handleParseText}
                disabled={isParsingText || !recipeText.trim()}
              >
                {isParsingText ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  'Parse Recipe'
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Paste text from cookbooks, handwritten notes, or OCR output. AI will extract the recipe details.
            </p>
          </TabsContent>

          <TabsContent value="photo" className="space-y-3 mt-4">
            {isParsingPhoto && photoPreview ? (
              <div className="flex flex-col items-center gap-4 py-6">
                <img
                  src={photoPreview}
                  alt="Recipe being processed"
                  className="max-h-[200px] rounded-lg object-cover"
                />
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Extracting recipe from image...
                </div>
              </div>
            ) : photoError && photoPreview ? (
              <div className="flex flex-col items-center gap-4 py-6">
                <img
                  src={photoPreview}
                  alt="Failed to process"
                  className="max-h-[200px] rounded-lg object-cover opacity-75"
                />
                <div className="text-center">
                  <p className="text-sm text-destructive mb-2">{photoError}</p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPhotoPreview(null)
                        setPhotoError(null)
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Try Another
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-sm font-medium mb-1">
                  Drop a recipe image here, or click to select
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports printed recipes, handwritten recipe cards, cookbook pages
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <p className="text-sm text-muted-foreground">
              Take a photo or upload an image of a recipe. AI will extract the text and details.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
