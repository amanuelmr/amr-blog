const request = require('supertest');
const app = require('./server');
const { registerVerifyLogin } = require('./helpers');
const { __sentMail } = require('resend');
const Blog = require('../models/Blog');
const { announceDuePosts } = require('../utils/announce');

const newPostMails = () => __sentMail.filter((m) => m.subject.startsWith('New from'));

const setup = async () => {
  const writer = request.agent(app);
  await registerVerifyLogin(writer, { email: 'writer@example.com', name: 'Writer' });
  const first = await writer.post('/api/v1/blogs/create').send({ title: 'Setup', content: 'x' }).expect(201);
  const writerId = first.body.blog.author;

  const reader = request.agent(app);
  await registerVerifyLogin(reader, { email: 'reader@example.com', name: 'Reader' });
  return { writer, reader, writerId };
};

describe('Email subscriptions & new-post announcements', () => {
  it('emails subscribers and notifies followers once when a post goes live', async () => {
    const { writer, reader, writerId } = await setup();
    expect((await reader.post(`/api/v1/auth/users/${writerId}/subscribe`).expect(200)).body.subscribed).toBe(true);
    await reader.post(`/api/v1/auth/users/${writerId}/follow`).expect(200);
    expect((await reader.get(`/api/v1/auth/users/${writerId}`)).body.isSubscribed).toBe(true);

    await writer
      .post('/api/v1/blogs/create')
      .send({ title: 'Fresh post', subtitle: 'Why it matters', content: 'Body' })
      .expect(201);

    const mails = newPostMails();
    expect(mails).toHaveLength(1);
    expect(mails[0].to).toBe('reader@example.com');
    expect(mails[0].subject).toBe('New from Writer: Fresh post');
    expect(mails[0].text).toContain('Why it matters');
    expect(mails[0].text).toMatch(/\/unsubscribe\?token=/);

    const notes = await reader.get('/api/v1/notifications').expect(200);
    expect(notes.body.notifications.filter((n) => n.type === 'new_post')).toHaveLength(1);

    // Announcing again does nothing: each post is announced once.
    await announceDuePosts();
    expect(newPostMails()).toHaveLength(1);
  });

  it('waits for a scheduled post to go live before announcing it', async () => {
    const { writer, reader, writerId } = await setup();
    await reader.post(`/api/v1/auth/users/${writerId}/subscribe`).expect(200);
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { body } = await writer
      .post('/api/v1/blogs/create')
      .send({ title: 'Later', content: 'Body', publishedAt: future })
      .expect(201);
    expect(newPostMails()).toHaveLength(0);

    await Blog.updateOne({ _id: body.blog._id }, { $set: { publishedAt: new Date(Date.now() - 1000) } });
    await announceDuePosts();
    expect(newPostMails().map((m) => m.subject)).toEqual(['New from Writer: Later']);
  });

  it("doesn't announce drafts or posts that went live long ago", async () => {
    const { writer, reader, writerId } = await setup();
    await reader.post(`/api/v1/auth/users/${writerId}/subscribe`).expect(200);
    await writer.post('/api/v1/blogs/create').send({ title: 'Draft', content: 'x', status: 'draft' }).expect(201);
    const old = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    await writer.post('/api/v1/blogs/create').send({ title: 'Old', content: 'x', publishedAt: old }).expect(201);
    expect(newPostMails()).toHaveLength(0);
  });

  it('unsubscribes with the link token, without logging in', async () => {
    const { writer, reader, writerId } = await setup();
    await reader.post(`/api/v1/auth/users/${writerId}/subscribe`).expect(200);
    await writer.post('/api/v1/blogs/create').send({ title: 'Post', content: 'x' }).expect(201);
    const token = decodeURIComponent(newPostMails()[0].text.match(/token=(\S+)/)[1]);

    const res = await request(app).post('/api/v1/auth/unsubscribe').send({ token }).expect(200);
    expect(res.body).toEqual({ unsubscribed: true, authorName: 'Writer' });
    expect((await reader.get(`/api/v1/auth/users/${writerId}`)).body.isSubscribed).toBe(false);

    await request(app).post('/api/v1/auth/unsubscribe').send({ token: 'garbage' }).expect(400);
  });

  it("can't subscribe to yourself, and requires auth", async () => {
    const { writer, writerId } = await setup();
    await writer.post(`/api/v1/auth/users/${writerId}/subscribe`).expect(400);
    await request(app).post(`/api/v1/auth/users/${writerId}/subscribe`).expect(401);
  });
});
