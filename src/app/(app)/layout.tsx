import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import RecurringTrigger from '@/components/RecurringTrigger'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-full bg-gray-950 bg-[radial-gradient(ellipse_80%_60%_at_-10%_-10%,rgba(16,185,129,0.07),transparent)]">
      <Sidebar userEmail={user.email} />
      <div className="flex-1 flex flex-col lg:ml-64 min-h-screen">
        <Header userEmail={user.email} />
        <RecurringTrigger />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
