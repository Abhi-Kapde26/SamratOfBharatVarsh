export interface Blog {
  id: number;
  title: string;
  slug: string;
  content: string;
  author: {
    username: string;
    avatar?: string;
  };
  cover_image?: string;
  created_at: string;
}
