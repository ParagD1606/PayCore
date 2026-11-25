
class PaymentProvider {
  async authorize(paymentData) {
    throw new Error("authorize() must be implemented");
  }

  async capture(providerReference, amount) {
    throw new Error("capture() must be implemented");
  }

  async void(providerReference) {
    throw new Error("void() must be implemented");
  }

  async refund(providerReference, amount) {
    throw new Error("refund() must be implemented");
  }
}

module.exports = PaymentProvider;
