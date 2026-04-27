import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const PRICING_TIERS = {
  starter: {
    name: 'Starter',
    price: 5,
    currency: 'USD',
    features: [
      'Up to 10 products',
      'Standard listing',
      '5% platform fee',
      'Email support',
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
      'Unlimited products',
      'Featured listings',
      '3% platform fee',
      'Priority support',
      'Analytics dashboard',
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

export const subscribe = mutation({
  args: {
    tier: v.union(v.literal('starter'), v.literal('pro')),
    paymentMethod: v.union(v.literal('ecocash'), v.literal('mpesa')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');
    
    const user = await ctx.db.query('users')
      .withIndex('email', (q) => q.eq('email', identity.email!))
      .first();
    
    if (!user) throw new Error('User not found');
    
    const tier = PRICING_TIERS[args.tier];
    const now = Date.now();
    const endDate = now + 30 * 24 * 60 * 60 * 1000; // 30 days
    
    // Create pending subscription
    const subscriptionId = await ctx.db.insert('subscriptions', {
      userId: user._id,
      tier: args.tier,
      status: 'pending',
      amount: tier.price,
      startDate: now,
      endDate,
      createdAt: now,
    });
    
    // Generate payment reference
    const reference = `GABA-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Create pending payment
    await ctx.db.insert('payments', {
      userId: user._id,
      subscriptionId,
      amount: tier.price,
      currency: 'USD',
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
    
    // Update payment status
    await ctx.db.patch(payment._id, {
      status: 'completed',
      transactionId,
    });
    
    // Update subscription to active
    if (payment.subscriptionId) {
      await ctx.db.patch(payment.subscriptionId, {
        status: 'active',
        paymentReference: transactionId,
      });
      
      // Update user subscription info
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

export const getMySubscription = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    
    const user = await ctx.db.query('users')
      .withIndex('email', (q) => q.eq('email', identity.email!))
      .first();
    
    if (!user) return null;
    
    const subscription = await ctx.db.query('subscriptions')
      .withIndex('byUser', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .first();
    
    if (!subscription) return null;
    
    const tier = PRICING_TIERS[subscription.tier];
    const now = Date.now();
    const isExpired = subscription.endDate < now;
    
    return {
      ...subscription,
      tierInfo: tier,
      isExpired,
      daysRemaining: Math.ceil((subscription.endDate - now) / (24 * 60 * 60 * 1000)),
    };
  },
});

export const getMyPayments = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    
    const user = await ctx.db.query('users')
      .withIndex('email', (q) => q.eq('email', identity.email!))
      .first();
    
    if (!user) return [];
    
    return await ctx.db.query('payments')
      .withIndex('byUser', (q) => q.eq('userId', user._id))
      .collect();
  },
});

export const canAddProduct = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { allowed: false, reason: 'Not logged in' };
    
    const user = await ctx.db.query('users')
      .withIndex('email', (q) => q.eq('email', identity.email!))
      .first();
    
    if (!user) return { allowed: false, reason: 'User not found' };
    
    if (user.subscriptionStatus !== 'active') {
      return { allowed: false, reason: 'No active subscription', upgradeUrl: '/pricing' };
    }
    
    const tier = user.subscriptionTier as 'starter' | 'pro';
    const tierInfo = PRICING_TIERS[tier];
    
    const productCount = await ctx.db.query('products')
      .withIndex('byUser', (q) => q.eq('userId', user._id))
      .collect();
    
    if (productCount.length >= tierInfo.limits.maxProducts) {
      return { 
        allowed: false, 
        reason: `Maximum ${tierInfo.limits.maxProducts} products reached`,
        upgradeUrl: '/pricing',
      };
    }
    
    return { allowed: true, productCount: productCount.length, maxProducts: tierInfo.limits.maxProducts };
  },
});