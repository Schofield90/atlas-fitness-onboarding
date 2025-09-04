import { redirect } from 'next/navigation'

export default function AddMemberRedirectPage() {
  redirect('/members/new')
}

