// This route is intercepted by the service worker (sw.js).
// The SW processes the shared file and redirects to /transacciones.
// This page is a fallback in case the SW is not active yet.
import { redirect } from 'next/navigation'

export default function ShareTargetPage() {
  redirect('/transacciones')
}
