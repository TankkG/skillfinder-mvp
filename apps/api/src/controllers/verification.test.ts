import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { USER_STATUSES } from '@skillfinder/shared';
import app from '../app';
import { User } from '../models';
import { signAccessToken } from '../utils/jwt';
import {
  cleanDatabase,
  createClient,
  startTestDatabase,
  stopTestDatabase,
} from '../__tests__/helpers';

describe('verificacion de cuenta', () => {
  beforeAll(async () => {
    await startTestDatabase();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('solicita y confirma un codigo de correo', async () => {
    const user = await createClient();
    const token = signAccessToken({
      sub: String(user._id),
      role: user.role,
      status: USER_STATUSES.ACTIVE,
    });

    const requested = await request(app)
      .post('/api/auth/verification/request')
      .set('authorization', `Bearer ${token}`)
      .send({ channel: 'EMAIL' });

    expect(requested.status).toBe(201);
    expect(requested.body.devCode).toMatch(/^\d{6}$/);

    const confirmed = await request(app)
      .post('/api/auth/verification/confirm')
      .set('authorization', `Bearer ${token}`)
      .send({ channel: 'EMAIL', code: requested.body.devCode });

    expect(confirmed.status).toBe(200);
    expect(confirmed.body.user.emailVerifiedAt).toEqual(expect.any(String));

    const stored = await User.findById(user._id).lean();
    expect(stored?.emailVerifiedAt).toBeInstanceOf(Date);
  });
});
