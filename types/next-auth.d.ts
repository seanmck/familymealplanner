import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      householdId?: string
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    householdId?: string
    // Google OAuth tokens for Calendar API access
    googleAccessToken?: string
    googleRefreshToken?: string
    googleTokenExpires?: number
  }
}
