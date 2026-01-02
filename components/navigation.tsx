'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Calendar, BookOpen, ShoppingCart, Settings, Users, LogOut, ChefHat, Sun, Key } from 'lucide-react'
import { formatDateString } from '@/lib/utils/dates'

const navItems = [
  { href: '/planner', label: 'Planner', icon: Calendar },
  { href: '/recipes', label: 'Recipes', icon: BookOpen },
  { href: '/groceries', label: 'Groceries', icon: ShoppingCart },
]

// Today's date formatted for the URL
function getTodayHref() {
  return `/planner/day/${formatDateString(new Date())}`
}

export function Navigation() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const initials = session?.user?.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : session?.user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/planner"
          className="group flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
            <ChefHat className="h-5 w-5" />
          </div>
          <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display), ui-serif, Georgia, serif' }}>
            FamilyTable
          </span>
        </Link>

        {/* Center Nav */}
        <nav className="hidden md:flex items-center">
          <div className="flex items-center gap-1 rounded-full bg-muted/60 p-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  )}
                >
                  <Icon className={cn(
                    'h-4 w-4 transition-colors',
                    isActive ? 'text-primary' : ''
                  )} />
                  {item.label}
                </Link>
              )
            })}
            {/* Today - special nav item with dynamic href */}
            {(() => {
              const todayHref = getTodayHref()
              const isActive = pathname === todayHref
              return (
                <Link
                  href={todayHref}
                  className={cn(
                    'relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  )}
                >
                  <Sun className={cn(
                    'h-4 w-4 transition-colors',
                    isActive ? 'text-primary' : ''
                  )} />
                  Today
                </Link>
              )
            })()}
          </div>
        </nav>

        {/* Mobile Nav */}
        <nav className="flex md:hidden items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-center rounded-lg p-2.5 transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-5 w-5" />
              </Link>
            )
          })}
          {/* Today - mobile */}
          {(() => {
            const todayHref = getTodayHref()
            const isActive = pathname === todayHref
            return (
              <Link
                href={todayHref}
                className={cn(
                  'flex items-center justify-center rounded-lg p-2.5 transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Sun className="h-5 w-5" />
              </Link>
            )
          })()}
        </nav>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full ring-2 ring-border/50 ring-offset-2 ring-offset-background transition-all hover:ring-primary/30 focus-visible:ring-primary"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {session?.user?.name || 'User'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {session?.user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/family" className="flex items-center gap-2 cursor-pointer">
                <Users className="h-4 w-4" />
                Family Members
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/pantry" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                Pantry Staples
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/api-tokens" className="flex items-center gap-2 cursor-pointer">
                <Key className="h-4 w-4" />
                API Tokens
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
