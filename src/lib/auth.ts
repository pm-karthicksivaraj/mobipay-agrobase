import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { entitlementEngine } from '@/lib/entitlements/engine'
import { setTenantEntitlements } from '@/middleware/edge-entitlements'
import { getDescendantTenantIds } from '@/lib/tenant'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email or Phone', type: 'text', placeholder: 'admin@agrobase.co' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.user.findFirst({
          where: {
            OR: [
              { email: credentials.email },
              { phone: credentials.email },
            ],
            isActive: true,
          },
        })

        if (!user) {
          return null
        }

        // Verify hashed password (supports both bcrypt and legacy plain-text during migration)
        if (!user.passwordHash) {
          return null
        }
        const isValid = await verifyPassword(credentials.password, user.passwordHash)
        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Fetch full user from DB to get tenantId and role
        const dbUser = await db.user.findUnique({
          where: { id: user.id! },
          select: { id: true, tenantId: true, role: true, firstName: true, lastName: true, isActive: true },
        })
        if (dbUser) {
          token.userId = dbUser.id
          token.tenantId = dbUser.tenantId
          token.role = dbUser.role
          token.name = `${dbUser.firstName} ${dbUser.lastName}`

          // For COUNTRY_ADMIN, resolve all descendant tenant IDs and store in token
          // so the middleware can set the correct x-tenant-scope header
          if (dbUser.role === 'COUNTRY_ADMIN' && dbUser.tenantId) {
            try {
              const descendantIds = await getDescendantTenantIds(dbUser.tenantId)
              token.tenantScope = descendantIds
            } catch (e) {
              console.error('[Auth] Failed to resolve descendant tenants:', e)
              token.tenantScope = [dbUser.tenantId]
            }
          }

          // Auto-warm Edge entitlement cache on login/JWT refresh
          if (dbUser.tenantId) {
            entitlementEngine.getEnabledModules(dbUser.tenantId).then(modules => {
              setTenantEntitlements(dbUser.tenantId!, modules)
            }).catch(() => { /* non-blocking */ })
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.userId = token.userId as string
        session.user.tenantId = token.tenantId as string
        session.user.role = token.role as string
      }
      return session
    },
    async signIn({ user }) {
      if (!user?.id) return false
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        select: { isActive: true },
      })
      if (!dbUser?.isActive) {
        return false
      }
      // Update last login
      await db.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      })
      return true
    },
  },
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'agrobase-v3-dev-secret-change-in-production',
}