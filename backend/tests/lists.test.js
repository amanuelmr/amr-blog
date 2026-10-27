const request = require('supertest');
const app = require('./server');
const { registerVerifyLogin } = require('./helpers');

const setup = async () => {
  const author = request.agent(app);
  await registerVerifyLogin(author, { email: 'author@example.com', name: 'Author' });
  const mk = async (title, extra = {}) =>
    (await author.post('/api/v1/blogs/create').send({ title, content: 'x', ...extra }).expect(201)).body.blog;
  const a = await mk('First');
  const b = await mk('Second');
  const draft = await mk('Draft', { status: 'draft' });
  const reader = request.agent(app);
  await registerVerifyLogin(reader, { email: 'reader@example.com', name: 'Reader' });
  return { author, reader, a, b, draft };
};

describe('Reading lists', () => {
  it('creates a list, toggles posts in and out, and reports membership', async () => {
    const { reader, a, b } = await setup();
    const { list } = (await reader.post('/api/v1/lists').send({ name: 'Systems', isPublic: true }).expect(201)).body;

    expect((await reader.post(`/api/v1/lists/${list._id}/items`).send({ blogId: a._id }).expect(200)).body).toEqual({ saved: true, itemCount: 1 });
    await reader.post(`/api/v1/lists/${list._id}/items`).send({ blogId: b._id }).expect(200);

    const mine = await reader.get(`/api/v1/lists/mine?blog=${a._id}`).expect(200);
    expect(mine.body.lists[0]).toMatchObject({ name: 'Systems', itemCount: 2, contains: true });

    const shown = await request(app).get(`/api/v1/lists/${list._id}`).expect(200);
    expect(shown.body.blogs.map((x) => x.title)).toEqual(['Second', 'First']); // newest added first
    expect(shown.body.list.owner.name).toBe('Reader');

    expect((await reader.post(`/api/v1/lists/${list._id}/items`).send({ blogId: a._id }).expect(200)).body.saved).toBe(false);
  });

  it("keeps private lists private, and only the owner can change a list", async () => {
    const { author, reader, a } = await setup();
    const { list } = (await reader.post('/api/v1/lists').send({ name: 'Secret' }).expect(201)).body;
    await request(app).get(`/api/v1/lists/${list._id}`).expect(404);
    await reader.get(`/api/v1/lists/${list._id}`).expect(200);
    await author.post(`/api/v1/lists/${list._id}/items`).send({ blogId: a._id }).expect(404);
    await author.delete(`/api/v1/lists/${list._id}`).expect(404);

    // Only public lists appear on the owner's profile.
    const readerId = (await reader.get(`/api/v1/lists/${list._id}`)).body.list.owner._id;
    const profileLists = async () => (await request(app).get(`/api/v1/lists/user/${readerId}`)).body.lists;
    expect(await profileLists()).toHaveLength(0);
    await reader.put(`/api/v1/lists/${list._id}`).send({ isPublic: true, name: 'Open' }).expect(200);
    expect((await profileLists()).map((l) => l.name)).toEqual(['Open']);

    await reader.delete(`/api/v1/lists/${list._id}`).expect(200);
    await reader.get(`/api/v1/lists/${list._id}`).expect(404);
  });

  it("can't add a draft, and validates input", async () => {
    const { reader, draft } = await setup();
    const { list } = (await reader.post('/api/v1/lists').send({ name: 'L' }).expect(201)).body;
    await reader.post(`/api/v1/lists/${list._id}/items`).send({ blogId: draft._id }).expect(404);
    await reader.post(`/api/v1/lists/${list._id}/items`).send({ blogId: 'nope' }).expect(400);
    await reader.post('/api/v1/lists').send({ name: '' }).expect(400);
    await request(app).post('/api/v1/lists').send({ name: 'x' }).expect(401);
  });
});

describe('Reading history', () => {
  it('lists posts read, most recent first, and can be cleared', async () => {
    const { reader, a, b } = await setup();
    await reader.get(`/api/v1/blogs/${a._id}`).expect(200);
    await reader.get(`/api/v1/blogs/${b._id}`).expect(200);

    const history = await reader.get('/api/v1/blogs/history').expect(200);
    expect(history.body.blogs.map((x) => x.title)).toEqual(['Second', 'First']);

    await reader.delete('/api/v1/blogs/history').expect(200);
    expect((await reader.get('/api/v1/blogs/history')).body.total).toBe(0);
    await request(app).get('/api/v1/blogs/history').expect(401);
  });
});
