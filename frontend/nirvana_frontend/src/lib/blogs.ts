// src/lib/blogs.ts
export interface Blog {
  id: number;
  title: string;
  slug: string;
  content: string;
  author: { username: string; avatar?: string };
  cover_image?: string;
  created_at: string;
  is_published?: boolean;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://your-django-domain.com/api';

// Fetch all blog slugs for static generation
export async function fetchBlogSlugs(): Promise<string[]> {
  const res = await fetch(`${API_BASE_URL}/admin/`, { cache: 'no-store' }); 
  if (!res.ok) throw new Error('Failed to fetch blog slugs');
  const blogs: Blog[] = await res.json();
  return blogs.filter(b => b.is_published).map(blog => blog.slug); // Only published blogs
}

// Fetch one blog by slug
export async function fetchBlogBySlug(slug: string): Promise<Blog> {
  const res = await fetch(`${API_BASE_URL}/blog/${slug}/`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Blog not found');
  return res.json();
}
