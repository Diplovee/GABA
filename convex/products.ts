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
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    
    const user = await ctx.db.query('users')
      .withIndex('email', (q) => q.eq('email', identity.email!))
      .first();
    
    if (!user) return [];
    
    return await ctx.db.query('products')
      .withIndex('byUser', (q) => q.eq('userId', user._id))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    price: v.number(),
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');
    
    const user = await ctx.db.query('users')
      .withIndex('email', (q) => q.eq('email', identity.email!))
      .first();
    
    if (!user) throw new Error('User not found');
    
    const now = Date.now();
    return await ctx.db.insert('products', {
      ...args,
      userId: user._id,
      status: 'draft',
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
    images: v.optional(v.array(v.string())),
    category: v.optional(v.union(
      v.literal('webapp'),
      v.literal('mobile'),
      v.literal('website'),
      v.literal('plugin'),
      v.literal('template'),
      v.literal('saas'),
      v.literal('other')
    )),
    demoUrl: v.optional(v.string()),
    repoUrl: v.optional(v.string()),
    liveUrl: v.optional(v.string()),
    stock: v.optional(v.number()),
    status: v.optional(v.union(v.literal('draft'), v.literal('active'), v.literal('archived'))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');
    
    const { productId, ...updates } = args;
    const product = await ctx.db.get(productId);
    
    if (!product) throw new Error('Product not found');
    
    await ctx.db.patch(productId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const deleteProduct = mutation({
  args: { productId: v.id('products') },
  handler: async (ctx, { productId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');
    
    const product = await ctx.db.get(productId);
    if (!product) throw new Error('Product not found');
    
    await ctx.db.delete(productId);
  },
});

export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    .unshift({
      name: 'Electronics',
      slug: 'electronics',
      icon: '💻',
      productCount: 0
    });
    results.push(
      { name: 'Clothing', slug: 'clothing', icon: '👕', productCount: 0 },
      { name: 'Food & Beverages', slug: 'food', icon: '🍔', productCount: 0 },
      { name: 'Services', slug: 'services', icon: '🔧', productCount: 0 },
      { name: 'Art & Crafts', slug: 'art', icon: '🎨', productCount: 0 },
      { name: 'Health & Beauty', slug: 'health', icon: '💊', productCount: 0 },
      { name: 'Education', slug: 'education', icon: '📚', productCount: 0 },
      { name: 'Home & Garden', slug: 'home', icon: '🏠', productCount: 0 },
      { name: 'Other', slug: 'other', icon: '📦', productCount: 0 }
    );
    return results;
  },
});