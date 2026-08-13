import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { ensureSelfFamilyMember } from '@/lib/self-member'

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            'openid email profile https://www.googleapis.com/auth/calendar.readonly',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
          include: { household: true },
        })

        if (!user || !user.hashedPassword) {
          return null
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        )

        if (!passwordMatch) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          householdId: user.householdId,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Handle Google OAuth account linking for existing email users
      if (account?.provider === 'google' && user.email) {
        const existingUser = await db.user.findUnique({
          where: { email: user.email },
          include: { accounts: true },
        })

        if (existingUser) {
          // Check if Google account is already linked
          const hasGoogleAccount = existingUser.accounts.some(
            (acc) => acc.provider === 'google'
          )

          if (!hasGoogleAccount && account.providerAccountId) {
            // Link Google account to existing user
            await db.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              },
            })

            // Auto-connect calendar for the household
            if (existingUser.householdId) {
              await db.googleCalendarSettings.upsert({
                where: { householdId: existingUser.householdId },
                create: {
                  householdId: existingUser.householdId,
                  connectedUserId: existingUser.id,
                  showOnPlanner: true,
                },
                update: {
                  connectedUserId: existingUser.id,
                },
              })
            }
          } else if (hasGoogleAccount) {
            // Update tokens on existing Google account
            await db.account.update({
              where: {
                provider_providerAccountId: {
                  provider: 'google',
                  providerAccountId: account.providerAccountId,
                },
              },
              data: {
                access_token: account.access_token,
                refresh_token: account.refresh_token ?? undefined,
                expires_at: account.expires_at,
              },
            })
          }
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        // Fetch householdId for the user (may not be on the user object from OAuth)
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { householdId: true },
        })
        token.householdId = dbUser?.householdId ?? undefined
      }

      // Store Google tokens in JWT for Calendar API access
      if (account?.provider === 'google') {
        token.googleAccessToken = account.access_token
        token.googleRefreshToken = account.refresh_token
        token.googleTokenExpires = account.expires_at
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.householdId = token.householdId as string | undefined
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      // Auto-create household for new OAuth users
      if (!user.id) return

      const household = await db.household.create({
        data: {
          name: `${user.name || user.email}'s Household`,
        },
      })

      await db.user.update({
        where: { id: user.id },
        data: { householdId: household.id },
      })

      // Give the owner a family member of their own so they can rate meals
      await ensureSelfFamilyMember(db, {
        userId: user.id,
        householdId: household.id,
        name: user.name,
        email: user.email,
      })

      // Auto-connect calendar for new Google users
      await db.googleCalendarSettings.create({
        data: {
          householdId: household.id,
          connectedUserId: user.id,
          showOnPlanner: true,
        },
      })
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
})
