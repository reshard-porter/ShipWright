/** Every cache tag in one place, so reads and writes can't drift apart. */
export const tags = {
  posts: "posts",
  post: (id: number) => `post:${id}`,
  comments: (postId: number) => `comments:${postId}`,
  categories: "categories",
  changelog: "changelog",
  team: "team",
  votes: (userId: string) => `votes:${userId}`,
  notifications: (userId: string) => `notifications:${userId}`,
};
