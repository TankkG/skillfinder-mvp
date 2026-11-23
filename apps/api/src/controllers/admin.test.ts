import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ROLES, USER_STATUSES } from '@skillfinder/shared';
import app from '../app';
import { User } from '../models';
import { signAccessToken } from '../utils/jwt';
import {
  cleanDatabase,
  createProfessional,
  startTestDatabase,
  stopTestDatabase,
} from '../__tests__/helpers';

describe('panel administrativo', () => {
  beforeAll(async () => {
    await startTestDatabase();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('devuelve el detalle de un profesional con la cuenta completa', async () => {
    const admin = await User.create({
      name: 'Admin de Prueba',
      email: 'admin@test.local',
      emailNormalized: 'admin@test.local',
      phone: '+59170000003',
      passwordHash: 'test-hash',
      role: ROLES.ADMIN,
      status: USER_STATUSES.ACTIVE,
    });
    const { profile } = await createProfessional();
    const token = signAccessToken({
      sub: String(admin._id),
      role: ROLES.ADMIN,
      status: USER_STATUSES.ACTIVE,
    });

    const response = await request(app)
      .get(`/api/admin/professionals/${String(profile._id)}`)
      .set('authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.profile.id).toBe(String(profile._id));
    expect(response.body.user).toMatchObject({
      email: 'profesional1@test.local',
      role: ROLES.PROFESSIONAL,
      status: USER_STATUSES.ACTIVE,
    });
    expect(response.body.user.createdAt).toEqual(expect.any(String));
  });
});
