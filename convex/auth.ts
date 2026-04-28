import { convexAuth } from '@convex-dev/auth/server';
import { Password } from '@convex-dev/auth/providers/Password';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = typeof params.email === 'string' ? params.email.trim().toLowerCase() : '';
        if (!email) {
          throw new Error('Email is required');
        }

        const name = typeof params.name === 'string' ? params.name.trim() : '';
        const businessName = typeof params.businessName === 'string' ? params.businessName.trim() : '';
        const phone = typeof params.phone === 'string' ? params.phone.trim() : '';

        return {
          email,
          name: name || undefined,
          businessName: businessName || undefined,
          phone: phone || undefined,
          accountStatus: 'active' as const,
          createdAt: Date.now(),
        };
      },
    }),
  ],
});
