const request = require('supertest');
const app = require('./server');
const { registerVerifyLogin } = require('./helpers');

const CONTENT = '<p>Retries are only safe when the write is <strong>idempotent</strong>.</p><p>Second paragraph.</p>';

const setup = async () => {
  const author = request.agent(app);
  await registerVerifyLogin(author, { email: 'author@example.com', name: 'Author' });
  const { body } = await author.post('/api/v1/blogs/create').send({ title: 'T', content: CONTENT }).expect(201);
  const reader = (email) => {
    const agent = request.agent(app);
    return registerVerifyLogin(agent, { email, name: `Reader ${email[0]}` }).then(() => agent);
  };
  return { author, reader, id: body.blog._id };
};

describe('Highlights', () => {
  it('saves a passage across inline markup and returns it as mine', async () => {
    const { reader, id } = await setup();
    const a = await reader('a@example.com');
    const res = await a
      .post(`/api/v1/blogs/${id}/highlights`)
      .send({ text: 'only safe when the write is  idempotent' })
      .expect(201);
    expect(res.body.highlight.text).toBe('only safe when the write is idempotent');

    const mine = await a.get(`/api/v1/blogs/${id}/highlights`).expect(200);
    expect(mine.body.mine.map((h) => h.text)).toEqual(['only safe when the write is idempotent']);
    expect(mine.body.top).toBeNull();

    // Highlighting the same passage twice keeps one.
    await a.post(`/api/v1/blogs/${id}/highlights`).send({ text: 'only safe when the write is idempotent' }).expect(201);
    expect((await a.get(`/api/v1/blogs/${id}/highlights`)).body.mine).toHaveLength(1);
  });

  it('shows the top highlight to everyone once two readers share it', async () => {
    const { reader, id } = await setup();
    const a = await reader('a@example.com');
    const b = await reader('b@example.com');
    await a.post(`/api/v1/blogs/${id}/highlights`).send({ text: 'Second paragraph.' }).expect(201);
    expect((await request(app).get(`/api/v1/blogs/${id}/highlights`)).body.top).toBeNull();
    await b.post(`/api/v1/blogs/${id}/highlights`).send({ text: 'Second paragraph.' }).expect(201);

    const anon = await request(app).get(`/api/v1/blogs/${id}/highlights`).expect(200);
    expect(anon.body).toEqual({ mine: [], top: { text: 'Second paragraph.', count: 2 } });
  });

  it('rejects text not in the post, and only the owner can remove a highlight', async () => {
    const { reader, id } = await setup();
    const a = await reader('a@example.com');
    const b = await reader('b@example.com');
    await a.post(`/api/v1/blogs/${id}/highlights`).send({ text: 'not in the post' }).expect(400);
    await a.post(`/api/v1/blogs/${id}/highlights`).send({ text: '' }).expect(400);

    const { body } = await a.post(`/api/v1/blogs/${id}/highlights`).send({ text: 'Second paragraph.' }).expect(201);
    await b.delete(`/api/v1/blogs/${id}/highlights/${body.highlight._id}`).expect(404);
    await a.delete(`/api/v1/blogs/${id}/highlights/${body.highlight._id}`).expect(200);
    await request(app).post(`/api/v1/blogs/${id}/highlights`).send({ text: 'Second paragraph.' }).expect(401);
  });

  it("can't highlight a draft", async () => {
    const { author, reader } = await setup();
    const { body } = await author.post('/api/v1/blogs/create').send({ title: 'D', content: '<p>Hidden.</p>', status: 'draft' }).expect(201);
    const a = await reader('a@example.com');
    await a.post(`/api/v1/blogs/${body.blog._id}/highlights`).send({ text: 'Hidden.' }).expect(404);
  });
});
