// api/_shared/config.js — environment config (reads from Vercel env vars or .env)

function getEnv(name, fallback = '') {
  return process.env[name] || fallback;
}

module.exports = {
  DB_HOST: getEnv('DB_HOST', ''),
  DB_USER: getEnv('DB_USER', ''),
  DB_PASS: getEnv('DB_PASS', ''),
  DB_NAME: getEnv('DB_NAME', ''),
  DB_CHARSET: getEnv('DB_CHARSET', 'utf8mb4'),
  JWT_SECRET: getEnv('JWT_SECRET', ''),
  ADMIN_USERNAME: getEnv('ADMIN_USERNAME', ''),
  ADMIN_PASSWORD: getEnv('ADMIN_PASSWORD', ''),
  ADMIN_FULLNAME: getEnv('ADMIN_FULLNAME', ''),
  ALLOWED_ORIGINS: getEnv('ALLOWED_ORIGINS', '*'),
};