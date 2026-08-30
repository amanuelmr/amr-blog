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

    it('defaults postType to essay and accepts field-note explicitly', async () => {
      const agent = request.agent(app);
      await registerVerifyLogin(agent);
      const essay = await createBlog(agent).expect(201);
      expect(essay.body.blog.postType).toBe('essay');

      const note = await createBlog(agent, { postType: 'field-note' }).expect(201);
      expect(note.body.blog.postType).toBe('field-note');
    });

    it('rejects an unrecognized postType', async () => {
      const agent = request.agent(app);
      await registerVerifyLogin(agent);
      await createBlog(agent, { postType: 'tutorial' }).expect(400);
    });
  });

  describe('edit', () => {
    it('changes postType on an existing blog', async () => {
      const agent = request.agent(app);
      await registerVerifyLogin(agent);
      const created = await createBlog(agent).expect(201);
      const res = await agent
        .put(`/api/v1/blogs/${created.body.blog._id}`)
        .send({ postType: 'field-note' })
        .expect(200);
      expect(res.body.blog.postType).toBe('field-note');
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

    it("filters the feed to one author's posts for their profile page", async () => {
      const alice = request.agent(app);
      await registerVerifyLogin(alice, { email: 'alice@example.com', name: 'Alice' });
      const alicePost = await createBlog(alice, { title: 'Alice post' }).expect(201);

      const bob = request.agent(app);
      await registerVerifyLogin(bob, { email: 'bob@example.com', name: 'Bob' });
      await createBlog(bob, { title: 'Bob post' }).expect(201);

      const authorId = alicePost.body.blog.author;
      const res = await request(app).get(`/api/v1/blogs?author=${authorId}`).expect(200);
      expect(res.body.total).toBe(1);
      expect(res.body.blogs[0]._id).toBe(alicePost.body.blog._id);
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

  describe('bookmarks', () => {
    it('bookmarks and unbookmarks a blog, and lists it on the reading list while saved', async () => {
      const agent = request.agent(app);
      await registerVerifyLogin(agent);
      const created = await createBlog(agent).expect(201);
      const id = created.body.blog._id;

      const saved = await agent.post(`/api/v1/blogs/${id}/bookmark`).expect(200);
      expect(saved.body.bookmarked).toBe(true);

      const fetched = await agent.get(`/api/v1/blogs/${id}`).expect(200);
      expect(fetched.body.bookmarked).toBe(true);

      const list = await agent.get('/api/v1/blogs/bookmarks').expect(200);
      expect(list.body.total).toBe(1);
      expect(list.body.blogs[0]._id).toBe(id);

      const unsaved = await agent.post(`/api/v1/blogs/${id}/bookmark`).expect(200);
      expect(unsaved.body.bookmarked).toBe(false);

      const listAfter = await agent.get('/api/v1/blogs/bookmarks').expect(200);
      expect(listAfter.body.total).toBe(0);
    });

    it("a post that goes private again silently drops off the reading list", async () => {
      const agent = request.agent(app);
      await registerVerifyLogin(agent);
      const created = await createBlog(agent).expect(201);
      const id = created.body.blog._id;

      await agent.post(`/api/v1/blogs/${id}/bookmark`).expect(200);
      await agent.put(`/api/v1/blogs/${id}`).send({ status: 'draft' }).expect(200);

      const list = await agent.get('/api/v1/blogs/bookmarks').expect(200);
      expect(list.body.total).toBe(0);
    });

    it("blocks bookmarking someone else's draft", async () => {
      const owner = request.agent(app);
      await registerVerifyLogin(owner);
      const created = await createBlog(owner, { status: 'draft' }).expect(201);
      const id = created.body.blog._id;

      const other = request.agent(app);
      await registerVerifyLogin(other, { email: 'saver@example.com', name: 'Saver' });
      await other.post(`/api/v1/blogs/${id}/bookmark`).expect(404);
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
      // Author stays populated, same shape as add/list, so the client keeps the
      // commenter's name and their own edit/delete controls
      expect(edited.body.comment.user).toEqual(added.body.comment.user);
      expect(edited.body.comment.user.name).toBeDefined();

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

    describe('threaded replies', () => {
      it('replies to a top-level comment and lists them alongside it', async () => {
        const agent = request.agent(app);
        await registerVerifyLogin(agent);
        const created = await createBlog(agent).expect(201);
        const id = created.body.blog._id;

        const top = await agent.post(`/api/v1/blogs/${id}/comments`).send({ text: 'Top-level' }).expect(201);
        const topId = top.body.comment._id;

        const reply = await agent
          .post(`/api/v1/blogs/${id}/comments`)
          .send({ text: 'A reply', parentComment: topId })
          .expect(201);
        expect(reply.body.comment.parentComment).toBe(topId);

        const listed = await request(app).get(`/api/v1/blogs/${id}/comments`).expect(200);
        // total counts threads (top-level only), not replies
        expect(listed.body.total).toBe(1);
        expect(listed.body.comments).toHaveLength(2);
      });

      it('collapses a reply-to-a-reply onto the original top-level comment', async () => {
        const agent = request.agent(app);
        await registerVerifyLogin(agent);
        const created = await createBlog(agent).expect(201);
        const id = created.body.blog._id;

        const top = await agent.post(`/api/v1/blogs/${id}/comments`).send({ text: 'Top-level' }).expect(201);
        const topId = top.body.comment._id;
        const reply = await agent
          .post(`/api/v1/blogs/${id}/comments`)
          .send({ text: 'First reply', parentComment: topId })
          .expect(201);

        const nested = await agent
          .post(`/api/v1/blogs/${id}/comments`)
          .send({ text: 'Reply to the reply', parentComment: reply.body.comment._id })
          .expect(201);
        expect(nested.body.comment.parentComment).toBe(topId);
      });

      it('rejects a reply to a nonexistent comment', async () => {
        const agent = request.agent(app);
        await registerVerifyLogin(agent);
        const created = await createBlog(agent).expect(201);
        const id = created.body.blog._id;
        await agent
          .post(`/api/v1/blogs/${id}/comments`)
          .send({ text: 'Orphan reply', parentComment: '000000000000000000000000' })
          .expect(400);
      });

      it('deleting a top-level comment cascades to its replies', async () => {
        const agent = request.agent(app);
        await registerVerifyLogin(agent);
        const created = await createBlog(agent).expect(201);
        const id = created.body.blog._id;

        const top = await agent.post(`/api/v1/blogs/${id}/comments`).send({ text: 'Top-level' }).expect(201);
        const topId = top.body.comment._id;
        await agent.post(`/api/v1/blogs/${id}/comments`).send({ text: 'A reply', parentComment: topId }).expect(201);

        await agent.delete(`/api/v1/blogs/${id}/comments/${topId}`).expect(200);

        const listed = await request(app).get(`/api/v1/blogs/${id}/comments`).expect(200);
        expect(listed.body.total).toBe(0);
        expect(listed.body.comments).toHaveLength(0);
      });
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

    it('finds posts by tag, which is what the tag chips link to', async () => {
      const agent = request.agent(app);
      await registerVerifyLogin(agent);
      // The tag never appears in the title or body, so only a tag match finds it
      await createBlog(agent, {
        title: 'Retries and backoff',
        content: 'Notes on making a write safe to repeat.',
        tags: 'distributed-systems,reliability',
      }).expect(201);

      const byTag = await request(app)
        .get('/api/v1/blogs/search?query=distributed-systems')
        .expect(200);
      expect(byTag.body.total).toBe(1);

      // Case-insensitive, but whole-tag: a partial must not match the tag
      expect((await request(app).get('/api/v1/blogs/search?query=RELIABILITY')).body.total).toBe(1);
      expect((await request(app).get('/api/v1/blogs/search?query=reliab')).body.total).toBe(0);
    });
  });
});
