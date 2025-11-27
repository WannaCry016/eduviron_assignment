export default () => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET ?? 'local-dev-secret',
    jwtExpiration: process.env.JWT_EXPIRATION ?? '4h',
    defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD ?? 'ChangeMe123!',
  },
  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    name: process.env.DATABASE_NAME ?? 'reporting',
    user: process.env.DATABASE_USER ?? 'postgres',
    password: process.env.DATABASE_PASSWORD ?? 'postgres',
    logging: process.env.TYPEORM_LOGGING === 'true',
  },
});
