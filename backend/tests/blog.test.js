const request = require('supertest');
const app = require('../index');
const { registerVerifyLogin } = require('./helpers');

const createBlog = (agent, overrides = {}) =>
  agent.post('/api/v1/blogs/create').send({
    title: 'My First Blog',
    content: 'Some blog content here',
    tags: 'javascript,node',
    ...overrides,
  });

describe('Blog API', () => {
  describe('create', () => {
    it('requires authentication', async () => {
      await createBlog(request(app)).expect(401);
    });

    it('creates a blog for an authenticated user', async () => {
      const agent = request.agent(app);
      await registerVerifyLogin(agent);
      const res = await createBlog(agent).expect(201);
      expect(res.body.success).toBe(true);
      expect(res.body.blog.title).toBe('My First Blog');
      expect(res.body.blog.tags).toEqual(['javascript', 'node']);
    });

    it('rejects a blog with no title/content (validation)', async () => {
      const agent = request.agent(app);
      await registerVerifyLogin(agent);
      await agent.post('/api/v1/blogs/create').send({ title: '' }).expect(400);
    });
  });

  describe('list & read', () => {
    it('returns a paginated payload', async () => {
      const agent = request.agent(app);
      await registerVerifyLogin(agent);
      await createBlog(agent).expect(201);

      const res = await request(app).get('/api/v1/blogs?page=1&limit=10').expect(200);
      expect(Array.isArray(res.body.blogs)).toBe(true);
      expect(res.body.total).toBe(1);
      expect(res.body.page).toBe(1);
      expect(res.body.totalPages).toBe(1);
    });

    it('gets a blog by id', async () => {
      const agent = request.agent(app);
      await registerVerifyLogin(agent);
      const created = await createBlog(agent).expect(201);
      const id = created.body.blog._id;

      const res = await request(app).get(`/api/v1/blogs/${id}`).expect(200);
      expect(res.body._id).toBe(id);
    });

    it('generates a slug and resolves the blog by slug', async () => {
      const agent = request.agent(app);
      await registerVerifyLogin(agent);
      const created = await createBlog(agent, { title: 'My First Blog' }).expect(201);
      const slug = created.body.blog.slug;

      expect(slug).toMatch(/^my-first-blog-[a-f0-9]{6}$/);

      const res = await request(app).get(`/api/v1/blogs/${slug}`).expect(200);
      expect(res.body._id).toBe(created.body.blog._id);
    });
  });

  describe('authorization', () => {
    it('prevents a non-owner from editing a blog', async () => {
      const owner = request.agent(app);
      await registerVerifyLogin(owner);
      const created = await createBlog(owner).expect(201);
      const id = created.body.blog._id;

      const other = request.agent(app);
      await registerVerifyLogin(other, {
        email: 'other@example.com',
        name: 'Other User',
      });

      await other
        .put(`/api/v1/blogs/${id}`)
        .send({ title: 'Hacked title' })
        .expect(401);
    });
  });

  describe('like toggle', () => {
    it('likes and unlikes a blog', async () => {
      const agent = request.agent(app);
      await registerVerifyLogin(agent);
      const created = await createBlog(agent).expect(201);
      const id = created.body.blog._id;

      const liked = await agent.post(`/api/v1/blogs/${id}/like`).expect(200);
      expect(liked.body.likes.length).toBe(1);

      const unliked = await agent.post(`/api/v1/blogs/${id}/like`).expect(200);
      expect(unliked.body.likes.length).toBe(0);
    });
  });

  describe('comments', () => {
    it('adds, lists, edits and deletes a comment', async () => {
      const agent = request.agent(app);
      await registerVerifyLogin(agent);
      const created = await createBlog(agent).expect(201);
      const id = created.body.blog._id;

      const added = await agent
        .post(`/api/v1/blogs/${id}/comments`)
        .send({ text: 'Nice post!' })
        .expect(201);
      const commentId = added.body.comment._id;

      const listed = await request(app).get(`/api/v1/blogs/${id}/comments`).expect(200);
      expect(listed.body.total).toBe(1);
      expect(listed.body.comments[0].text).toBe('Nice post!');

      const edited = await agent
        .put(`/api/v1/blogs/${id}/comments/${commentId}`)
        .send({ text: 'Edited comment' })
        .expect(200);
      expect(edited.body.comment.text).toBe('Edited comment');
      // createdAt preserved, editedAt set
      expect(edited.body.comment.editedAt).toBeDefined();

      await agent
        .delete(`/api/v1/blogs/${id}/comments/${commentId}`)
        .expect(200);
    });

    it('rejects an empty comment (validation)', async () => {
      const agent = request.agent(app);
      await registerVerifyLogin(agent);
      const created = await createBlog(agent).expect(201);
      const id = created.body.blog._id;
      await agent.post(`/api/v1/blogs/${id}/comments`).send({ text: '   ' }).expect(400);
    });
  });

  describe('draft & scheduled visibility', () => {
    it('hides a draft from the public feed and search, but the owner can still fetch it', async () => {
      const agent = request.agent(app);
      await registerVerifyLogin(agent);
      const created = await createBlog(agent, { title: 'Unfinished Draft', status: 'draft' }).expect(201);
      expect(created.body.blog.status).toBe('draft');
      expect(created.body.blog.publishedAt).toBeNull();
      const id = created.body.blog._id;

      const feed = await request(app).get('/api/v1/blogs').expect(200);
      expect(feed.body.blogs.find((b) => b._id === id)).toBeUndefined();

      const search = await request(app)
        .get('/api/v1/blogs/search?query=Unfinished')
        .expect(200);
      expect(search.body.total).toBe(0);

      // Anonymous direct fetch: 404, not a leak of "it exists but is private".
      await request(app).get(`/api/v1/blogs/${id}`).expect(404);

      // The owner (cookie-authenticated) can still load it.
      const own = await agent.get(`/api/v1/blogs/${id}`).expect(200);
      expect(own.body._id).toBe(id);
    });

    it('hides a scheduled post until its publish date arrives', async () => {
      const agent = request.agent(app);
      await registerVerifyLogin(agent);
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const created = await createBlog(agent, { title: 'Future Post', publishedAt: future }).expect(201);
      const id = created.body.blog._id;
      expect(created.body.blog.status).toBe('published');

      await request(app).get(`/api/v1/blogs/${id}`).expect(404);

      const past = new Date(Date.now() - 1000).toISOString();
      await agent.put(`/api/v1/blogs/${id}`).send({ publishedAt: past }).expect(200);
      await request(app).get(`/api/v1/blogs/${id}`).expect(200);
    });

    it("editing a live post's content doesn't reset its publish date", async () => {
      const agent = request.agent(app);
      await registerVerifyLogin(agent);
      const created = await createBlog(agent).expect(201);
      const id = created.body.blog._id;
      const originalPublishedAt = created.body.blog.publishedAt;

      await new Promise((r) => setTimeout(r, 5));
      const edited = await agent.put(`/api/v1/blogs/${id}`).send({ title: 'Updated title' }).expect(200);
      expect(edited.body.blog.publishedAt).toBe(originalPublishedAt);
    });

    it("blocks a non-owner from liking or commenting on someone else's draft", async () => {
      const owner = request.agent(app);
      await registerVerifyLogin(owner);
      const created = await createBlog(owner, { status: 'draft' }).expect(201);
      const id = created.body.blog._id;

      const other = request.agent(app);
      await registerVerifyLogin(other, { email: 'nosy@example.com', name: 'Nosy User' });

      await other.post(`/api/v1/blogs/${id}/like`).expect(404);
      await other.post(`/api/v1/blogs/${id}/comments`).send({ text: 'hi' }).expect(404);
    });
  });

  describe('mine', () => {
    it("lists the author's own posts of every status, but requires auth", async () => {
      const agent = request.agent(app);
      await registerVerifyLogin(agent);
      await createBlog(agent, { title: 'Draft one', status: 'draft' }).expect(201);
      await createBlog(agent, { title: 'Live one' }).expect(201);

      await request(app).get('/api/v1/blogs/mine').expect(401);

      const mine = await agent.get('/api/v1/blogs/mine').expect(200);
      expect(mine.body.total).toBe(2);
      expect(mine.body.blogs.map((b) => b.status).sort()).toEqual(['draft', 'published']);
    });
  });

  describe('search', () => {
    it('handles regex metacharacters safely (no ReDoS / injection)', async () => {
      const agent = request.agent(app);
      await registerVerifyLogin(agent);
      await createBlog(agent, { title: 'Async (await) guide' }).expect(201);

      // A raw "(" would be an invalid regex if not escaped
      const res = await request(app)
        .get('/api/v1/blogs/search?query=' + encodeURIComponent('(await)'))
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(1);
    });
  });
});
