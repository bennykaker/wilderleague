import { redirect } from 'next/navigation'

// /auth has no content — redirect to login
export default function AuthPage() {
  redirect('/login')
}
