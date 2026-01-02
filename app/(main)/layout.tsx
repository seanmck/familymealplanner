import { Navigation } from '@/components/navigation'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <Navigation />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 md:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  )
}
