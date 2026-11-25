
const PAYMENT_STATES = Object.freeze({
  REQUIRES_PAYMENT_METHOD: "requires_payment_method",
  PROCESSING: "processing",
  REQUIRES_ACTION: "requires_action",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  CANCELLED: "cancelled",
});

const ALLOWED_TRANSITIONS = Object.freeze({
  requires_payment_method: [
    "processing",
    "cancelled",
  ],

  processing: [
    "requires_action",
    "succeeded",
    "failed",
  ],

  requires_action: [
    "processing",
    "cancelled",
  ],

  failed: [
    "processing",
  ],

  succeeded: [],
  cancelled: [],
});

function canTransition(currentState, nextState) {
  const allowedStates = ALLOWED_TRANSITIONS[currentState];

  if (!allowedStates) {
    return false;
  }

  return allowedStates.includes(nextState);
}

function validateTransition(currentState, nextState) {
  if (!canTransition(currentState, nextState)) {
    throw new Error(
      `Invalid payment transition: ${currentState} -> ${nextState}`
    );
  }

  return true;
}

module.exports = {
  PAYMENT_STATES,
  ALLOWED_TRANSITIONS,
  canTransition,
  validateTransition,
};
