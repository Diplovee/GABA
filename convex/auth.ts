import { convexAuth } from '@convex-dev/auth';
import { Password } from '@convex-dev/auth/password';
import { query } from './_generated/server';

export const { auth, signIn, signOut, store } = convexAuth();