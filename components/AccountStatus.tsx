'use client'

import { useSession } from '../contexts/SessionContext'

export function AccountStatus() {
  const { isLoggedIn, userEmail } = useSession()

  if (!isLoggedIn || !userEmail) return null

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.reload()
  }

  const truncatedEmail = userEmail.length > 30 ? userEmail.slice(0, 27) + '...' : userEmail

  return (
    <div className="account-status">
      <p className="account-status-email">{truncatedEmail}</p>
      <button className="account-status-logout" onClick={handleLogout} type="button">
        Sign out
      </button>
    </div>
  )
}
