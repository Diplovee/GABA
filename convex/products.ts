import { getAuthUserId } from '@convex-dev/auth/server';
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('products')
      .withIndex('byStatus', (q) => q.eq('status', 'active'))
      .collect();
  },
});

export const getByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, { category }) => {
    return await ctx.db.query('products')
      .withIndex('byCategory', (q) => q.eq('category', category))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect();
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
      p.name.toLowerCase().includes(term) || 
      p.description.toLowerCase().includes(term)
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
    price: v.number(),
    currency: v.optional(v.string()),
    images: v.array(v.string()),
    category: v.union(
      v.literal('electronics'),
      v.literal('clothing'),
      v.literal('food'),
      v.literal('services'),
      v.literal('art'),
      v.literal('health'),
      v.literal('education'),
      v.literal('home'),
      v.literal('other')
    ),
    demoUrl: v.optional(v.string()),
    repoUrl: v.optional(v.string()),
    liveUrl: v.optional(v.string()),
    stock: v.number(),
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
      price: args.price,
      currency: args.currency || 'USD',
      images: args.images,
      category: args.category,
      demoUrl: args.demoUrl,
      repoUrl: args.repoUrl,
      liveUrl: args.liveUrl,
      stock: args.stock,
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
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    category: v.optional(v.union(
      v.literal('electronics'),
      v.literal('clothing'),
      v.literal('food'),
      v.literal('services'),
      v.literal('art'),
      v.literal('health'),
      v.literal('education'),
      v.literal('home'),
      v.literal('other')
    )),
    demoUrl: v.optional(v.string()),
    repoUrl: v.optional(v.string()),
    liveUrl: v.optional(v.string()),
    stock: v.optional(v.number()),
    status: v.optional(v.union(v.literal('draft'), v.literal('active'), v.literal('archived'))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const { productId, ...updates } = args;
    const product = await ctx.db.get(productId);
    
    if (!product) throw new Error('Product not found');
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
    if (!product) throw new Error('Product not found');
    if (product.userId !== userId) throw new Error('Unauthorized');
    
    await ctx.db.delete(productId);
  },
});

export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    return [
      { name: 'Electronics', slug: 'electronics', icon: '💻', productCount: 0 },
      { name: 'Clothing', slug: 'clothing', icon: '👕', productCount: 0 },
      { name: 'Food & Beverages', slug: 'food', icon: '🍔', productCount: 0 },
      { name: 'Services', slug: 'services', icon: '🔧', productCount: 0 },
      { name: 'Art & Crafts', slug: 'art', icon: '🎨', productCount: 0 },
      { name: 'Health & Beauty', slug: 'health', icon: '💊', productCount: 0 },
      { name: 'Education', slug: 'education', icon: '📚', productCount: 0 },
      { name: 'Home & Garden', slug: 'home', icon: '🏠', productCount: 0 },
      { name: 'Other', slug: 'other', icon: '📦', productCount: 0 },
    ];
  },
});