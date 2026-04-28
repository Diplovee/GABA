import { getAuthUserId } from '@convex-dev/auth/server';
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    businessName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('users')
      .withIndex('email', (q) => q.eq('email', args.email))
      .first();
    
    if (existing) {
      return existing._id;
    }
    
    return await ctx.db.insert('users', {
      email: args.email,
      name: args.name,
      phone: args.phone,
      businessName: args.businessName,
      createdAt: Date.now(),
    });
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db.query('users')
      .withIndex('email', (q) => q.eq('email', email))
      .first();
  },
});

export const getUserById = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
});

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    return await ctx.db.get(userId);
  },
});

export const updateUser = mutation({
  args: {
    userId: v.id('users'),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    businessName: v.optional(v.string()),
    subscriptionTier: v.optional(v.union(v.literal('starter'), v.literal('pro'))),
    subscriptionStatus: v.optional(v.union(v.literal('active'), v.literal('inactive'), v.literal('cancelled'))),
    subscriptionEndDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    await ctx.db.patch(userId, updates);
  },
});