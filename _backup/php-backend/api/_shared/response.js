// api/_shared/response.js — HTTP response helpers for Vercel serverless functions

function json(res, data, status = 200) {
  res.status(status).set('Content-Type', 'application/json; charset=utf-8').json(data);
}

function ok(res, data = null, status = 200) {
  json(res, data ?? { detail: 'ok' }, status);
}

function error(res, message, status = 400) {
  json(res, { detail: message }, status);
}

function noContent(res) {
  res.status(204).end();
}

module.exports = { json, ok, error, noContent };