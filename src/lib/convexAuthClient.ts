import { ConvexHttpClient } from 'convex/browser';

const convexUrl = import.meta.env.PUBLIC_GABA_CONVEX_URL;

if (!convexUrl) {
  throw new Error('Missing PUBLIC_GABA_CONVEX_URL');
}

const tokenKey = `convexAuth:token:${convexUrl}`;
const refreshTokenKey = `convexAuth:refreshToken:${convexUrl}`;

type AuthTokens = {
  token: string;
  refreshToken: string;
};

function client() {
  return new ConvexHttpClient(convexUrl);
}

function storeTokens(tokens: AuthTokens) {
  localStorage.setItem(tokenKey, tokens.token);
  localStorage.setItem(refreshTokenKey, tokens.refreshToken);
}

function clearTokens() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(refreshTokenKey);
}

function getStoredToken() {
  return localStorage.getItem(tokenKey);
}

function getStoredRefreshToken() {
  return localStorage.getItem(refreshTokenKey);
}

async function callAuthSignIn(args: Record<string, unknown>) {
  return await client().action('auth:signIn' as never, args as never);
}

export async function signUpEmailPassword(args: {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  businessName?: string;
}) {
  const result = await callAuthSignIn({
    provider: 'password',
    params: {
      flow: 'signUp',
      email: args.email,
      password: args.password,
      name: args.name,
      phone: args.phone,
      businessName: args.businessName,
    },
  });

  if (result?.tokens) {
    storeTokens(result.tokens as AuthTokens);
  }

  return result;
}

export async function signInEmailPassword(args: { email: string; password: string }) {
  const result = await callAuthSignIn({
    provider: 'password',
    params: {
      flow: 'signIn',
      email: args.email,
      password: args.password,
    },
  });

  if (result?.tokens) {
    storeTokens(result.tokens as AuthTokens);
  }

  return result;
}

export async function refreshSession() {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    const result = await callAuthSignIn({ refreshToken });
    if (result?.tokens) {
      storeTokens(result.tokens as AuthTokens);
      return (result.tokens as AuthTokens).token;
    }
    clearTokens();
    return null;
  } catch {
    clearTokens();
    return null;
  }
}

export async function getAccessToken() {
  return getStoredToken() ?? (await refreshSession());
}

export async function isAuthenticated() {
  return (await getAccessToken()) !== null;
}

export async function signOut() {
  const token = await getAccessToken();
  if (token) {
    try {
      const authedClient = client();
      authedClient.setAuth(token);
      await authedClient.action('auth:signOut' as never, {} as never);
    } catch {
      // Ignore sign out network/auth errors and clear local state regardless.
    }
  }

  clearTokens();
}

async function withAuth<T>(run: (token: string) => Promise<T>): Promise<T> {
  const existingToken = await getAccessToken();
  if (!existingToken) {
    throw new Error('Not authenticated');
  }

  try {
    return await run(existingToken);
  } catch (error) {
    const refreshedToken = await refreshSession();
    if (!refreshedToken || refreshedToken === existingToken) {
      throw error;
    }
    return await run(refreshedToken);
  }
}

export async function convexQuery(functionName: string, args: Record<string, unknown> = {}) {
  return withAuth(async (token) => {
    const authedClient = client();
    authedClient.setAuth(token);
    return await authedClient.query(functionName as never, args as never);
  });
}

export async function convexMutation(functionName: string, args: Record<string, unknown> = {}) {
  return withAuth(async (token) => {
    const authedClient = client();
    authedClient.setAuth(token);
    return await authedClient.mutation(functionName as never, args as never);
  });
}
