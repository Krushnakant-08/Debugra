const express = require('express');
const router = express.Router();
const NodeCache = require('node-cache');
const crypto = require('crypto');
const { rateLimit } = require('express-rate-limit');
const { executeCode } = require('../services/judge0Service');

const MAX_SOURCE_CODE_LENGTH = 100000;
const MAX_STDIN_LENGTH = 10000;

// Initialize cache with 5 minutes TTL, max 100 entries, LRU eviction
const executeCache = new NodeCache({ stdTTL: 300, maxKeys: 100, checkperiod: 60 });

function buildCacheKey(languageId, stdin, sourceCode) {
  const payload = ${languageId}__;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// Stricter rate limiter specific to /api/execute
const executeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many execution requests, please try again later.',
    });
  },
});

router.post('/', executeLimiter, async (req, res, next) => {
  try {
    const { source_code, language_id, stdin } = req.body;

    if (!source_code || !language_id) {
      return res.status(400).json({ error: 'source_code and language_id are required' });
    }

    if (Buffer.byteLength(source_code, 'utf-8') > MAX_SOURCE_CODE_LENGTH) {
      return res.status(413).json({
        error: source_code exceeds maximum length of  bytes,
      });
    }

    if (stdin && Buffer.byteLength(stdin, 'utf-8') > MAX_STDIN_LENGTH) {
      return res.status(413).json({
        error: stdin exceeds maximum length of  bytes,
      });
    }

    const cacheKey = buildCacheKey(language_id, stdin, source_code);
    const cachedResult = executeCache.get(cacheKey);

    if (cachedResult) {
      console.log('[Cache Hit] Serving cached execution result');
      return res.json(cachedResult);
    }

    const result = await executeCode(source_code, language_id, stdin || '');

    // Only cache successful requests
    if (result && result.status) {
      executeCache.set(cacheKey, result);
    }

    res.json(result);
  } catch (err) {
    console.error('Judge0 error:', err.response?.data || err.message);
    next(err);
  }
});

module.exports = router;