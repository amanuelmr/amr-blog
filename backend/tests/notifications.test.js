const request = require('supertest');
const app = require('../index');
const { registerVerifyLogin } = require('./helpers');

const setup = async () => {
  const author = request.agent(app);
  await registerVerifyLogin(author, { email: 'author@example.com', name: 'Author' });
  const { body } = await author
    .post('/api/v1/blogs/create')
    .send({ title: 'A post', content: 'Body', tags: 'go' })
    .expect(201);
  const reader = request.agent(app);
  await registerVerifyLogin(reader, { email: 'reader@example.com', name: 'Reader' });
  return { author, reader, blog: body.blog };
};

describe('Notifications', () => {
  it('notifies an author of a follow, a like and a comment, newest first', async () => {
    const { author, reader, blog } = await setup();

    await reader.post(`/api/v1/auth/users/${blog.author}/follow`).expect(200);
    await reader.post(`/api/v1/blogs/${blog._id}/like`).expect(200);
    await reader.post(`/api/v1/blogs/${blog._id}/comments`).send({ text: 'Nice' }).expect(201);

    const res = await author.get('/api/v1/notifications').expect(200);
    expect(res.body.unread).toBe(3);
    expect(res.body.notifications.map((n) => n.type)).toEqual(['comment', 'like', 'follow']);
    expect(res.body.notifications[0].actor.name).toBe('Reader');
    expect(res.body.notifications[0].blog.title).toBe('A post');
    expect(res.body.notifications[0].actor.email).toBeUndefined();
  });

  it('collapses repeated likes, and never notifies you of your own actions', async () => {
    const { author, reader, blog } = await setup();
    await reader.post(`/api/v1/blogs/${blog._id}/like`).expect(200); // like
    await reader.post(`/api/v1/blogs/${blog._id}/like`).expect(200); // unlike
    await reader.post(`/api/v1/blogs/${blog._id}/like`).expect(200); // like again
    await author.post(`/api/v1/blogs/${blog._id}/like`).expect(200); // own post
    await author.post(`/api/v1/blogs/${blog._id}/comments`).send({ text: 'Mine' }).expect(201);

    const res = await author.get('/api/v1/notifications').expect(200);
    expect(res.body.notifications.map((n) => n.type)).toEqual(['like']);
  });

  it('sends a reply to the person replied to, and the post author hears it once', async () => {
    const { author, reader, blog } = await setup();
    const top = await author.post(`/api/v1/blogs/${blog._id}/comments`).send({ text: 'Author note' }).expect(201);
    await reader
      .post(`/api/v1/blogs/${blog._id}/comments`)
      .send({ text: 'Reply', parentComment: top.body.comment._id })
      .expect(201);

    const res = await author.get('/api/v1/notifications').expect(200);
    expect(res.body.notifications.map((n) => n.type)).toEqual(['reply']);
  });

  it('marks one or all read, only for their recipient', async () => {
    const { author, reader, blog } = await setup();
    await reader.post(`/api/v1/blogs/${blog._id}/like`).expect(200);
    await reader.post(`/api/v1/blogs/${blog._id}/comments`).send({ text: 'Hi' }).expect(201);

    const list = await author.get('/api/v1/notifications').expect(200);
    const first = list.body.notifications[0]._id;
    await reader.post(`/api/v1/notifications/${first}/read`).expect(404);
    await author.post(`/api/v1/notifications/${first}/read`).expect(200);
    expect((await author.get('/api/v1/notifications/unread-count')).body.unread).toBe(1);

    await author.post('/api/v1/notifications/read-all').expect(200);
    expect((await author.get('/api/v1/notifications/unread-count')).body.unread).toBe(0);
  });

  it("clears a post's notifications when the post is deleted", async () => {
    const { author, reader, blog } = await setup();
    await reader.post(`/api/v1/blogs/${blog._id}/like`).expect(200);
    await author.delete(`/api/v1/blogs/${blog._id}`).expect(200);
    expect((await author.get('/api/v1/notifications')).body.total).toBe(0);
  });

  it('requires auth', async () => {
    await request(app).get('/api/v1/notifications').expect(401);
  });
});
