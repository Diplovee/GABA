import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  ...authTables,

  users: defineTable({
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    businessName: v.optional(v.string()),
    subscriptionTier: v.optional(v.union(v.literal('starter'), v.literal('pro'))),
    subscriptionStatus: v.optional(v.union(v.literal('active'), v.literal('inactive'), v.literal('cancelled'))),
    subscriptionEndDate: v.optional(v.number()),
    createdAt: v.number(),
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
  })
    .index('email', ['email'])
    .index('phone', ['phone']),

  products: defineTable({
    userId: v.id('users'),
    name: v.string(),
    description: v.string(),
    tagline: v.optional(v.string()),
    problemSolved: v.optional(v.string()),
    country: v.optional(v.string()),
    makerName: v.optional(v.string()),
    makerLocation: v.optional(v.string()),
    logo: v.optional(v.string()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    images: v.array(v.string()),
    category: v.union(
      v.literal('apps'),
      v.literal('ai'),
      v.literal('hardware'),
      v.literal('saas'),
      v.literal('developer-tools'),
      v.literal('fintech'),
      v.literal('edtech'),
      v.literal('gadgets'),
      v.literal('other')
    ),
    demoUrl: v.optional(v.string()),
    repoUrl: v.optional(v.string()),
    liveUrl: v.optional(v.string()),
    stock: v.optional(v.number()),
    productStatus: v.optional(v.union(
      v.literal('beta'),
      v.literal('live'),
      v.literal('open-source'),
      v.literal('hiring')
    )),
    reviewStatus: v.optional(v.union(
      v.literal('pending'),
      v.literal('approved'),
      v.literal('rejected')
    )),
    upvoteCount: v.optional(v.number()),
    commentCount: v.optional(v.number()),
    status: v.union(v.literal('draft'), v.literal('active'), v.literal('archived')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('byUser', ['userId'])
    .index('byStatus', ['status'])
    .index('byCategory', ['category'])
    .index('byReviewStatus', ['reviewStatus'])
    .index('byCountry', ['country']),

  productVotes: defineTable({
    productId: v.id('products'),
    userId: v.id('users'),
    createdAt: v.number(),
  })
    .index('byProduct', ['productId'])
    .index('byUserProduct', ['userId', 'productId']),

  productComments: defineTable({
    productId: v.id('products'),
    userId: v.id('users'),
    body: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('byProduct', ['productId', 'createdAt'])
    .index('byUser', ['userId']),

  subscriptions: defineTable({
    userId: v.id('users'),
    tier: v.union(v.literal('starter'), v.literal('pro')),
    status: v.union(v.literal('pending'), v.literal('active'), v.literal('cancelled')),
    amount: v.number(),
    paymentReference: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    createdAt: v.number(),
  })
    .index('byUser', ['userId'])
    .index('byStatus', ['status']),

  payments: defineTable({
    userId: v.id('users'),
    subscriptionId: v.optional(v.id('subscriptions')),
    amount: v.number(),
    currency: v.string(),
    paymentMethod: v.union(v.literal('ecocash'), v.literal('mpesa')),
    status: v.union(v.literal('pending'), v.literal('completed'), v.literal('failed')),
    reference: v.string(),
    transactionId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('byUser', ['userId'])
    .index('byStatus', ['status']),

  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    icon: v.optional(v.string()),
    productCount: v.number(),
  }),
});
