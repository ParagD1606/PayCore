
const pool = require("../../config/database");

const {
  validateTransition,
} = require("./payment.state-machine");

async function transitionPaymentState(
  client,
  paymentIntentId,
  nextState
) {
  const result = await client.query(
    `SELECT id, status
     FROM payment_intents
     WHERE id = $1
     FOR UPDATE`,
    [paymentIntentId]
  );

  if (result.rowCount === 0) {
    throw new Error("Payment intent not found");
  }

  const currentState = result.rows[0].status;

  validateTransition(currentState, nextState);

  const updatedResult = await client.query(
    `UPDATE payment_intents
     SET status = $1,
         updated_at = NOW()
     WHERE id = $2
     RETURNING id, status, updated_at`,
    [nextState, paymentIntentId]
  );

  return updatedResult.rows[0];
}

async function updatePaymentState(paymentIntentId, nextState) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const payment = await transitionPaymentState(
      client,
      paymentIntentId,
      nextState
    );

    await client.query("COMMIT");

    return payment;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  transitionPaymentState,
  updatePaymentState,
};
