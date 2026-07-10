// Helpers to extract display info from a Supabase auth user.
// Google OAuth populates user_metadata with fields like
// given_name, full_name, name, avatar_url, picture, email.

export function getFirstName(user: any): string {
  if (!user) return "there"
  const meta = user.user_metadata || {}

  if (meta.given_name) return String(meta.given_name).trim()

  const full = meta.full_name || meta.name
  if (full) return String(full).trim().split(/\s+/)[0]

  const email = user.email || meta.email
  if (email) return String(email).split("@")[0]

  return "there"
}

export function getAvatarUrl(user: any): string | null {
  const meta = user?.user_metadata || {}
  return meta.avatar_url || meta.picture || null
}
