const request = require('supertest');
const app = require('../index');

describe('global error handler', () => {
  it('reports malformed JSON as 400, not a server error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{not json')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.msg).toMatch(/Malformed JSON/i);
  });

  it('reports an over-large body as 413, not a server error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'a@b.co', password: 'x'.repeat(200000) }))
      .expect(413);

    expect(res.body.success).toBe(false);
    expect(res.body.msg).toMatch(/too large/i);
  });

  it('still answers 404 for an unmatched route', async () => {
    const res = await request(app).get('/no/such/route').expect(404);
    expect(res.body.msg).toBe('Route not found');
  });
});
