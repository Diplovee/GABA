import { getAuthUserId } from '@convex-dev/auth/server';
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const PRICING_TIERS = {
  starter: {
    name: 'Starter',
    price: 5,
    currency: 'USD',
    features: [
      'Up to 10 product submissions',
      'Standard listing',
      'Email support',
      'EcoCash/M-Pesa payments',
    ],
    limits: {
      maxProducts: 10,
      platformFee: 0.05,
    },
  },
  pro: {
    name: 'Pro',
    price: 15,
    currency: 'USD',
    features: [
      'Unlimited product submissions',
      'Featured listings',
      'Priority support',
      'EcoCash/M-Pesa payments',
      'Reduced 3% platform fee',
    ],
    limits: {
      maxProducts: Infinity,
      platformFee: 0.03,
    },
  },
} as const;

export const getTierInfo = query({
  args: {},
  handler: async () => {
    return PRICING_TIERS;
  },
});

export const createSubscription = mutation({
  args: {
    userId: v.id('users'),
    tier: v.union(v.literal('starter'), v.literal('pro')),
    paymentMethod: v.union(v.literal('ecocash'), v.literal('mpesa')),
  },
  handler: async (ctx, args) => {
    const tier = PRICING_TIERS[args.tier];
    const now = Date.now();
    const endDate = now + 30 * 24 * 60 * 60 * 1000;
    
    const subscriptionId = await ctx.db.insert('subscriptions', {
      userId: args.userId,
      tier: args.tier,
      status: 'pending',
      amount: tier.price,
      startDate: now,
      endDate,
      createdAt: now,
    });
    
    const reference = `GABA-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    await ctx.db.insert('payments', {
      userId: args.userId,
      subscriptionId,
      amount: tier.price,
      currency: tier.currency,
      paymentMethod: args.paymentMethod,
      status: 'pending',
      reference,
      createdAt: now,
    });
    
    return {
      subscriptionId,
      reference,
      amount: tier.price,
      paymentMethod: args.paymentMethod,
      tier: args.tier,
    };
  },
});

export const verifyPayment = mutation({
  args: {
    reference: v.string(),
    transactionId: v.string(),
  },
  handler: async (ctx, { reference, transactionId }) => {
    const payment = await ctx.db.query('payments')
      .filter((q) => q.eq(q.field('reference'), reference))
      .first();
    
    if (!payment) throw new Error('Payment not found');
    if (payment.status === 'completed') return { success: true, message: 'Already verified' };
    
    await ctx.db.patch(payment._id, {
      status: 'completed',
      transactionId,
    });
    
    if (payment.subscriptionId) {
      await ctx.db.patch(payment.subscriptionId, {
        status: 'active',
        paymentReference: transactionId,
      });
      
      const subscription = await ctx.db.get(payment.subscriptionId);
      if (subscription) {
        await ctx.db.patch(payment.userId, {
          subscriptionTier: subscription.tier,
          subscriptionStatus: 'active',
          subscriptionEndDate: subscription.endDate,
        });
      }
    }
    
    return { success: true, message: 'Payment verified successfully' };
  },
});

export const getSubscription = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const subscription = await ctx.db.query('subscriptions')
      .withIndex('byUser', (q) => q.eq('userId', userId))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .first();
    
    if (!subscription) return null;
    
    const tier = PRICING_TIERS[subscription.tier];
    const now = Date.now();
    
    return {
      ...subscription,
      tierInfo: tier,
      isExpired: subscription.endDate < now,
      daysRemaining: Math.ceil((subscription.endDate - now) / (24 * 60 * 60 * 1000)),
    };
  },
});

export const getMySubscription = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const subscription = await ctx.db.query('subscriptions')
      .withIndex('byUser', (q) => q.eq('userId', userId))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .first();

    if (!subscription) return null;

    const tier = PRICING_TIERS[subscription.tier];
    const now = Date.now();

    return {
      ...subscription,
      tierInfo: tier,
      isExpired: subscription.endDate < now,
      daysRemaining: Math.ceil((subscription.endDate - now) / (24 * 60 * 60 * 1000)),
    };
  },
});

export const getPayments = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    return await ctx.db.query('payments')
      .withIndex('byUser', (q) => q.eq('userId', userId))
      .collect();
  },
});
