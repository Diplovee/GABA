import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
		}),
});

const news = defineCollection({
	loader: glob({ base: './src/content/news', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			category: z.enum(['local', 'tech', 'business', 'events']).default('local'),
			heroImage: z.optional(image()),
		}),
});

const projects = defineCollection({
	loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			category: z.enum(['webapp', 'mobile', 'website']),
			url: z.string().optional(),
			repo: z.string().optional(),
			heroImage: z.optional(image()),
		}),
});

const directory = defineCollection({
	loader: glob({ base: './src/content/directory', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			name: z.string(),
			description: z.string(),
			category: z.enum(['restaurant', 'retail', 'services', 'tech', 'health', 'education', 'other']),
			location: z.string(),
			phone: z.string().optional(),
			email: z.string().optional(),
			website: z.string().optional(),
			logo: z.optional(image()),
		}),
});

export const collections = { blog, news, projects, directory };
