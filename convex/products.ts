import { getAuthUserId } from '@convex-dev/auth/server';
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query('products')
      .withIndex('byStatus', (q) => q.eq('status', 'active'))
      .collect();
    return products.filter((product) => product.reviewStatus === undefined || product.reviewStatus === 'approved');
  },
});

export const getByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, { category }) => {
    const products = await ctx.db.query('products')
      .withIndex('byCategory', (q) => q.eq('category', category))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect();
    return products.filter((product) => product.reviewStatus === undefined || product.reviewStatus === 'approved');
  },
});

export const getById = query({
  args: { productId: v.id('products') },
  handler: async (ctx, { productId }) => {
    return await ctx.db.get(productId);
  },
});

export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, { searchTerm }) => {
    const allProducts = await ctx.db.query('products')
      .withIndex('byStatus', (q) => q.eq('status', 'active'))
      .collect();
    
    const term = searchTerm.toLowerCase();
    return allProducts.filter(p =>
      (p.reviewStatus === undefined || p.reviewStatus === 'approved') &&
      (
        p.name.toLowerCase().includes(term) || 
        p.description.toLowerCase().includes(term) ||
        p.tagline?.toLowerCase().includes(term) ||
        p.problemSolved?.toLowerCase().includes(term) ||
        p.country?.toLowerCase().includes(term) ||
        p.makerName?.toLowerCase().includes(term)
      )
    );
  },
});

export const getVendorProducts = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    return await ctx.db.query('products')
      .withIndex('byUser', (q) => q.eq('userId', userId))
      .collect();
  },
});

export const getMyProducts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    return await ctx.db.query('products')
      .withIndex('byUser', (q) => q.eq('userId', userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    tagline: v.string(),
    problemSolved: v.string(),
    country: v.string(),
    makerName: v.string(),
    makerLocation: v.string(),
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
    status: v.optional(v.union(v.literal('draft'), v.literal('active'), v.literal('archived'))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const now = Date.now();
    return await ctx.db.insert('products', {
      userId,
      name: args.name,
      description: args.description,
      tagline: args.tagline,
      problemSolved: args.problemSolved,
      country: args.country,
      makerName: args.makerName,
      makerLocation: args.makerLocation,
      logo: args.logo,
      price: args.price,
      currency: args.currency || 'USD',
      images: args.images,
      category: args.category,
      demoUrl: args.demoUrl,
      repoUrl: args.repoUrl,
      liveUrl: args.liveUrl,
      stock: args.stock,
      productStatus: args.productStatus || 'beta',
      reviewStatus: 'pending',
      upvoteCount: 0,
      commentCount: 0,
      status: args.status || 'draft',
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    productId: v.id('products'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    tagline: v.optional(v.string()),
    problemSolved: v.optional(v.string()),
    country: v.optional(v.string()),
    makerName: v.optional(v.string()),
    makerLocation: v.optional(v.string()),
    logo: v.optional(v.string()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    category: v.optional(v.union(
      v.literal('apps'),
      v.literal('ai'),
      v.literal('hardware'),
      v.literal('saas'),
      v.literal('developer-tools'),
      v.literal('fintech'),
      v.literal('edtech'),
      v.literal('gadgets'),
      v.literal('other')
    )),
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
    status: v.optional(v.union(v.literal('draft'), v.literal('active'), v.literal('archived'))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const { productId, ...updates } = args;
    const product = await ctx.db.get(productId);
    
    if (!product) throw new Error('Launch not found');
    if (product.userId !== userId) throw new Error('Unauthorized');
    
    await ctx.db.patch(productId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const deleteProduct = mutation({
  args: { productId: v.id('products') },
  handler: async (ctx, { productId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const product = await ctx.db.get(productId);
    if (!product) throw new Error('Launch not found');
    if (product.userId !== userId) throw new Error('Unauthorized');
    
    await ctx.db.delete(productId);
  },
});

export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    return [
      { name: 'Apps', slug: 'apps', icon: '📱', productCount: 0 },
      { name: 'AI', slug: 'ai', icon: '✨', productCount: 0 },
      { name: 'Hardware', slug: 'hardware', icon: '🧩', productCount: 0 },
      { name: 'SaaS', slug: 'saas', icon: '☁️', productCount: 0 },
      { name: 'Developer Tools', slug: 'developer-tools', icon: '⌘', productCount: 0 },
      { name: 'Fintech', slug: 'fintech', icon: '💳', productCount: 0 },
      { name: 'Edtech', slug: 'edtech', icon: '🎓', productCount: 0 },
      { name: 'Gadgets', slug: 'gadgets', icon: '🎧', productCount: 0 },
      { name: 'Other', slug: 'other', icon: '🚀', productCount: 0 },
    ];
  },
});

export const upvote = mutation({
  args: { productId: v.id('products') },
  handler: async (ctx, { productId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Sign in to upvote products');
    }

    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const existingVote = await ctx.db.query('productVotes')
      .withIndex('byUserProduct', (q) => q.eq('userId', userId).eq('productId', productId))
      .unique();

    if (existingVote) {
      await ctx.db.delete(existingVote._id);
      const upvoteCount = Math.max((product.upvoteCount || 0) - 1, 0);
      await ctx.db.patch(productId, {
        upvoteCount,
        updatedAt: Date.now(),
      });
      return { upvoteCount, voted: false };
    }

    await ctx.db.insert('productVotes', {
      productId,
      userId,
      createdAt: Date.now(),
    });

    const upvoteCount = (product.upvoteCount || 0) + 1;
    await ctx.db.patch(productId, {
      upvoteCount,
      updatedAt: Date.now(),
    });

    return { upvoteCount, voted: true };
  },
});

export const listComments = query({
  args: {
    productId: v.optional(v.id('products')),
    targetSlug: v.optional(v.string()),
  },
  handler: async (ctx, { productId, targetSlug }) => {
    if (!productId && !targetSlug) {
      throw new Error('Comment target is required');
    }

    const comments = productId
      ? await ctx.db.query('productComments')
        .withIndex('byProduct', (q) => q.eq('productId', productId))
        .collect()
      : await ctx.db.query('productComments')
        .withIndex('byTargetSlug', (q) => q.eq('targetSlug', targetSlug))
        .collect();

    return await Promise.all(comments.map(async (comment) => {
      const author = await ctx.db.get(comment.userId);
      return {
        ...comment,
        authorName: author?.name || author?.businessName || 'GABA member',
        authorImage: author?.image,
      };
    }));
  },
});

export const createComment = mutation({
  args: {
    productId: v.optional(v.id('products')),
    targetSlug: v.optional(v.string()),
    body: v.string(),
  },
  handler: async (ctx, { productId, targetSlug, body }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Sign in to comment on products');
    }

    if (!productId && !targetSlug) {
      throw new Error('Comment target is required');
    }

    const product = productId ? await ctx.db.get(productId) : null;
    if (productId && !product) {
      throw new Error('Product not found');
    }

    const cleanBody = body.trim();
    if (cleanBody.length < 2) {
      throw new Error('Comment is too short');
    }
    if (cleanBody.length > 1000000) {
      throw new Error('Comment is too long');
    }

    const now = Date.now();
    const commentId = await ctx.db.insert('productComments', {
      productId,
      targetSlug,
      userId,
      body: cleanBody,
      createdAt: now,
      updatedAt: now,
    });

    const commentCount = product ? (product.commentCount || 0) + 1 : undefined;
    if (product && productId) {
      await ctx.db.patch(productId, {
        commentCount,
        updatedAt: now,
      });
    }

    return { commentId, commentCount };
  },
});

export const deleteComment = mutation({
  args: { commentId: v.id('productComments') },
  handler: async (ctx, { commentId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const comment = await ctx.db.get(commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }
    if (comment.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const product = comment.productId ? await ctx.db.get(comment.productId) : null;
    await ctx.db.delete(commentId);

    if (product && comment.productId) {
      await ctx.db.patch(comment.productId, {
        commentCount: Math.max((product.commentCount || 1) - 1, 0),
        updatedAt: Date.now(),
      });
    }
  },
});
