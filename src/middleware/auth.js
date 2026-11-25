const crypto = require("crypto");
const pool = require("../config/database");

async function authenticateMerchant(req, res, next) {
  const apiKey = req.header("x-api-key");

  if (!apiKey) {
    return res.status(401).json({
      error: "API key is required",
    });
  }

  if (!/^pg_live_[a-f0-9]{64}$/.test(apiKey)) {
    return res.status(401).json({
      error: "Invalid API key",
    });
  }

  const keyHash = crypto
    .createHash("sha256")
    .update(apiKey)
    .digest("hex");

  try {
    const result = await pool.query(
      `SELECT
          m.id,
          m.business_name,
          m.email,
          k.id AS api_key_id
       FROM merchant_api_keys k
       JOIN merchants m ON m.id = k.merchant_id
       WHERE k.key_hash = $1
         AND k.is_active = TRUE
         AND m.status = 'active'`,
      [keyHash]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        error: "Invalid or inactive API key",
      });
    }

    const merchant = result.rows[0];

    // Track key usage without exposing the raw API key.
    await pool.query(
      `UPDATE merchant_api_keys
       SET last_used_at = NOW()
       WHERE id = $1`,
      [merchant.api_key_id]
    );

    req.merchant = {
      id: merchant.id,
      businessName: merchant.business_name,
      email: merchant.email,
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authenticateMerchant;