import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import {
  ChefHat,
  Calendar,
  ShoppingCart,
  Users,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  ArrowRight,
  Check,
  Link as LinkIcon,
  Package,
  Lightbulb,
  Mail,
  CalendarDays,
} from 'lucide-react'

export default async function HomePage() {
  const session = await auth()

  if (session?.user?.householdId) {
    redirect('/planner')
  }

  return (
    <div className="flex min-h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-4 mx-auto">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ChefHat className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display), ui-serif, Georgia, serif' }}>
              FamilyTable
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="gap-2">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative flex justify-center overflow-hidden">
          {/* Background decorations */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/30" />
            <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-10 w-64 h-64 bg-secondary/30 rounded-full blur-3xl" />
          </div>


          {/* Hero content */}
          <div className="container relative z-10 flex flex-col items-center text-center px-4 pt-8 pb-16">
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Made for families with picky eaters
            </div>

            {/* Headline */}
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Paste any recipe.
              <span className="block mt-2 pb-2 bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                Plan your whole week.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="mt-8 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
              Import recipes from any website, pack school lunches in seconds, and generate grocery lists that skip what you already have.
            </p>

            {/* CTA buttons */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link href="/register">
                <Button size="lg" className="h-12 px-8 text-base gap-2 shadow-lg shadow-primary/20">
                  Start Planning Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Social proof */}
            <div className="mt-12 flex flex-wrap justify-center items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Free to use
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Family-friendly
              </div>
            </div>
          </div>

        </section>

        {/* Features Section */}
        <section className="pt-12 pb-24 bg-muted/30">
          <div className="container px-4 max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything you need to simplify mealtime
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                From planning to shopping, FamilyTable handles the logistics so you can focus on cooking and enjoying meals together.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {/* Feature 1: Recipe Import */}
              <div className="group relative bg-card rounded-2xl border border-border/60 p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <LinkIcon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Recipe Import</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Found a recipe online? Paste the URL and we&apos;ll extract the ingredients, instructions, and cooking times automatically.
                </p>
                <ul className="mt-6 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    Import from any recipe site
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    Auto-extracts ingredients
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    Family ratings & tags
                  </li>
                </ul>
              </div>

              {/* Feature 2: Weekly Planner */}
              <div className="group relative bg-card rounded-2xl border border-border/60 p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Calendar className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Weekly Planner</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Visual calendar to plan dinners and lunches. See your family&apos;s calendar events right alongside your meals.
                </p>
                <ul className="mt-6 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    Calendar integration
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    Different meals per person
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    Picky eater alerts
                  </li>
                </ul>
              </div>

              {/* Feature 3: Grocery Lists */}
              <div className="group relative bg-card rounded-2xl border border-border/60 p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <ShoppingCart className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Smart Grocery Lists</h3>
                <p className="text-muted-foreground leading-relaxed">
                  One click generates a shopping list from your meal plan. Automatically skips pantry staples you already have.
                </p>
                <ul className="mt-6 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    Skips pantry staples
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    Organized by category
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    Copy & share with family
                  </li>
                </ul>
              </div>

              {/* Feature 4: Lunchbox Planner */}
              <div className="group relative bg-card rounded-2xl border border-border/60 p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Package className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Lunchbox Planner</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Pack school lunches in 30 seconds. Bento-style categories make it easy to build balanced lunches every day.
                </p>
                <ul className="mt-6 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    Main, side, fruit, snack, treat
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    Copy yesterday&apos;s lunch
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    Per-child customization
                  </li>
                </ul>
              </div>

              {/* Feature 5: Smart Suggestions */}
              <div className="group relative bg-card rounded-2xl border border-border/60 p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Lightbulb className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Smart Suggestions</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Not sure what to make? Enter ingredients you have on hand and get recipe ideas the whole family will enjoy.
                </p>
                <ul className="mt-6 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    Use what you have
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    Prioritizes expiring items
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    Family favorites first
                  </li>
                </ul>
              </div>

              {/* Feature 6: Family Sync */}
              <div className="group relative bg-card rounded-2xl border border-border/60 p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Mail className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Family Sync</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Keep everyone in the loop. Email weekly meal summaries to the whole family and sync with your calendar.
                </p>
                <ul className="mt-6 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    Email weekly summaries
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    Google Calendar sync
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    API for your own tools
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24">
          <div className="container px-4 max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                How it works
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                From recipe to grocery list in three simple steps.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold shadow-lg">
                  1
                </div>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <LinkIcon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Import</h3>
                <p className="text-muted-foreground">
                  Paste a recipe URL or add your own. We&apos;ll extract all the details.
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold shadow-lg">
                  2
                </div>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Plan</h3>
                <p className="text-muted-foreground">
                  Add meals to your weekly calendar. Plan dinners, lunches, and lunchboxes.
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold shadow-lg">
                  3
                </div>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShoppingCart className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Shop</h3>
                <p className="text-muted-foreground">
                  Get your categorized grocery list. Check off items as you shop.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Product Screenshots Section */}
        <section className="py-24 bg-muted/30">
          <div className="container px-4 max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                See it in action
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                A clean, simple interface that the whole family can use.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Screenshot 1: Planner */}
              <div className="relative group">
                <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-border/60 shadow-lg overflow-hidden flex items-center justify-center">
                  <div className="text-center p-6">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-primary/40" />
                    <p className="text-sm text-muted-foreground">Weekly Planner</p>
                  </div>
                </div>
                <p className="mt-4 text-center font-medium">Weekly Planner</p>
                <p className="text-sm text-center text-muted-foreground">See your whole week at a glance</p>
              </div>

              {/* Screenshot 2: Grocery List */}
              <div className="relative group">
                <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-border/60 shadow-lg overflow-hidden flex items-center justify-center">
                  <div className="text-center p-6">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-primary/40" />
                    <p className="text-sm text-muted-foreground">Grocery List</p>
                  </div>
                </div>
                <p className="mt-4 text-center font-medium">Smart Grocery List</p>
                <p className="text-sm text-center text-muted-foreground">Organized by category, ready to shop</p>
              </div>

              {/* Screenshot 3: Lunchbox */}
              <div className="relative group">
                <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-border/60 shadow-lg overflow-hidden flex items-center justify-center">
                  <div className="text-center p-6">
                    <Package className="h-12 w-12 mx-auto mb-4 text-primary/40" />
                    <p className="text-sm text-muted-foreground">Lunchbox Planner</p>
                  </div>
                </div>
                <p className="mt-4 text-center font-medium">Lunchbox Planner</p>
                <p className="text-sm text-center text-muted-foreground">Pack balanced lunches in seconds</p>
              </div>
            </div>
          </div>
        </section>

        {/* Family Features Section */}
        <section className="py-24">
          <div className="container px-4 max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground mb-6">
                  <Users className="h-4 w-4" />
                  Built for real families
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
                  Because every family has that one kid who won&apos;t eat anything green
                </h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  FamilyTable tracks individual preferences so you can find meals everyone will actually eat.
                  Gradually introduce variety without the dinnertime drama.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <ThumbsUp className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Family member ratings</p>
                      <p className="text-sm text-muted-foreground">Each person can rate recipes so you know what works</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                      <span className="text-destructive text-xs">!</span>
                    </div>
                    <div>
                      <p className="font-medium">Picky eater alerts</p>
                      <p className="text-sm text-muted-foreground">Visual warnings when a meal has kid thumbs-down</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Different meals for different people</p>
                      <p className="text-sm text-muted-foreground">Plan personalized dinners and lunches per family member</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CalendarDays className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Syncs with your calendar</p>
                      <p className="text-sm text-muted-foreground">See family events alongside your meal plan</p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Illustration/Preview */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-accent/10 rounded-3xl" />
                <div className="relative bg-card border border-border/60 rounded-3xl p-8 shadow-xl">
                  <div className="space-y-4">
                    {/* Mock recipe cards */}
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">🌮</div>
                      <div className="flex-1">
                        <p className="font-medium">Chicken Tacos</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1 text-green-600">
                            <ThumbsUp className="h-3.5 w-3.5" /> 4
                          </span>
                          <span className="flex items-center gap-1 text-red-500">
                            <ThumbsDown className="h-3.5 w-3.5" /> 0
                          </span>
                        </div>
                      </div>
                      <div className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Family favorite</div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">🍝</div>
                      <div className="flex-1">
                        <p className="font-medium">Spaghetti Bolognese</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1 text-green-600">
                            <ThumbsUp className="h-3.5 w-3.5" /> 3
                          </span>
                          <span className="flex items-center gap-1 text-red-500">
                            <ThumbsDown className="h-3.5 w-3.5" /> 1
                          </span>
                        </div>
                      </div>
                      <div className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">Picky alert</div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                      <div className="h-12 w-12 rounded-lg bg-accent/30 flex items-center justify-center text-2xl">🥗</div>
                      <div className="flex-1">
                        <p className="font-medium">Quinoa Buddha Bowl</p>
                        <p className="text-sm text-muted-foreground">Not yet rated</p>
                      </div>
                      <div className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">New</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-primary text-primary-foreground">
          <div className="container px-4 max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
              Ready to simplify mealtime?
            </h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto mb-10">
              Join families who&apos;ve reclaimed their weeknight sanity. Start planning smarter today.
            </p>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="h-12 px-8 text-base gap-2 shadow-lg">
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/30">
        <div className="container px-4 max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ChefHat className="h-4 w-4" />
              </div>
              <span className="font-semibold" style={{ fontFamily: 'var(--font-display), ui-serif, Georgia, serif' }}>
                FamilyTable
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built with love for families who love good food.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
