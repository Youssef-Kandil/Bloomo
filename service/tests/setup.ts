process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-key-1234567890';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-key-1234567890';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'mysql://root:password@localhost:3306/bloomo_test';
process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000';

jest.setTimeout(10_000);
