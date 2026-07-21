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
