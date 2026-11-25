
const crypto = require("crypto");
const pool = require("../src/config/database");

const {
  provisionPlatformAccounts,
  provisionMerchantAccounts,
} = require("../src/modules/ledger/ledger.service");

async function createMerchant() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const businessName = process.argv[2];
    const email = process.argv[3];

    if (!businessName || !email) {
      throw new Error(
        'Usage: node scripts/create-merchant.js "Business Name" email@example.com'
      );
    }

    // Generate a secure API key.
    const apiKey =
      "pg_live_" + crypto.randomBytes(32).toString("hex");

    // Store only its SHA-256 hash.
    const keyHash = crypto
      .createHash("sha256")
      .update(apiKey)
      .digest("hex");

    const keyPrefix = apiKey.substring(0, 16);

    const merchantResult = await client.query(
      `INSERT INTO merchants (business_name, email)
       VALUES ($1, $2)
       RETURNING id, business_name, email`,
      [businessName, email]
    );

    const merchant = merchantResult.rows[0];

    await client.query(
      `INSERT INTO merchant_api_keys
       (merchant_id, key_hash, key_prefix)
       VALUES ($1, $2, $3)`,
      [merchant.id, keyHash, keyPrefix]
    );

    await provisionPlatformAccounts(client);

    await provisionMerchantAccounts(client, merchant.id);

    await client.query("COMMIT");

    console.log("\nMerchant created successfully!");
    console.log("Merchant ID:", merchant.id);
    console.log("Business:", merchant.business_name);
    console.log("Email:", merchant.email);
    console.log("\nAPI KEY (save it now):");
    console.log(apiKey);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Merchant creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

createMerchant();
