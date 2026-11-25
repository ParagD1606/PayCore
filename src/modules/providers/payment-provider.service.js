
const SimulatedPaymentProvider = require(
  "./simulated-payment.provider"
);

const provider = new SimulatedPaymentProvider();

async function authorizePayment(paymentData) {
  return provider.authorize(paymentData);
}

async function capturePayment(providerReference, amount) {
  return provider.capture(providerReference, amount);
}

async function voidPayment(providerReference) {
  return provider.void(providerReference);
}

async function refundPayment(providerReference, amount) {
  return provider.refund(providerReference, amount);
}

module.exports = {
  authorizePayment,
  capturePayment,
  voidPayment,
  refundPayment,
};
