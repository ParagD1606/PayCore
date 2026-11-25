
const crypto = require("crypto");
const PaymentProvider = require("./payment-provider.interface");

class SimulatedPaymentProvider extends PaymentProvider {
  constructor() {
    super();
    this.authorizations = new Map();
  }

  async authorize(paymentData) {
    const {
      amount,
      currency,
      outcome = "success",
    } = paymentData;

    if (!Number.isSafeInteger(Number(amount)) || Number(amount) <= 0) {
      throw new Error("Invalid authorization amount");
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error("Invalid currency");
    }

    if (outcome === "timeout") {
      return {
        success: false,
        status: "unknown",
        providerReference: null,
        failureCode: "PROVIDER_TIMEOUT",
        failureMessage: "Provider authorization timed out",
      };
    }

    const providerReference =
      `sim_auth_${crypto.randomUUID()}`;

    if (outcome === "decline") {
      return {
        success: false,
        status: "failed",
        providerReference,
        failureCode: "CARD_DECLINED",
        failureMessage: "Payment was declined",
      };
    }

    if (outcome !== "success") {
      throw new Error("Unsupported simulated outcome");
    }

    this.authorizations.set(providerReference, {
      amount: Number(amount),
      currency,
      status: "authorized",
      capturedAmount: 0,
      refundedAmount: 0,
    });

    return {
      success: true,
      status: "authorized",
      providerReference,
      failureCode: null,
      failureMessage: null,
    };
  }

  async capture(providerReference, amount) {
    const authorization = this.authorizations.get(providerReference);

    if (!authorization || authorization.status !== "authorized") {
      return {
        success: false,
        status: "failed",
        failureCode: "INVALID_AUTHORIZATION",
        failureMessage: "Authorization not found or unavailable",
      };
    }

    if (
      !Number.isSafeInteger(Number(amount)) ||
      Number(amount) !== authorization.amount
    ) {
      return {
        success: false,
        status: "failed",
        failureCode: "INVALID_CAPTURE_AMOUNT",
        failureMessage: "Capture amount must match authorization amount",
      };
    }

    authorization.status = "captured";
    authorization.capturedAmount = Number(amount);

    return {
      success: true,
      status: "captured",
      providerReference,
    };
  }

  async void(providerReference) {
    const authorization = this.authorizations.get(providerReference);

    if (!authorization || authorization.status !== "authorized") {
      return {
        success: false,
        status: "failed",
        failureCode: "INVALID_AUTHORIZATION",
        failureMessage: "Authorization cannot be cancelled",
      };
    }

    authorization.status = "voided";

    return {
      success: true,
      status: "voided",
      providerReference,
    };
  }

  async refund(providerReference, amount) {
    const authorization = this.authorizations.get(providerReference);

    if (!authorization || authorization.status !== "captured") {
      return {
        success: false,
        status: "failed",
        failureCode: "PAYMENT_NOT_CAPTURED",
        failureMessage: "Only captured payments can be refunded",
      };
    }

    const refundAmount = Number(amount);
    const remainingAmount =
      authorization.capturedAmount - authorization.refundedAmount;

    if (
      !Number.isSafeInteger(refundAmount) ||
      refundAmount <= 0 ||
      refundAmount > remainingAmount
    ) {
      return {
        success: false,
        status: "failed",
        failureCode: "INVALID_REFUND_AMOUNT",
        failureMessage: "Refund amount exceeds refundable balance",
      };
    }

    authorization.refundedAmount += refundAmount;

    if (
      authorization.refundedAmount === authorization.capturedAmount
    ) {
      authorization.status = "refunded";
    }

    return {
      success: true,
      status: "refunded",
      providerReference: `sim_refund_${crypto.randomUUID()}`,
      refundedAmount: refundAmount,
    };
  }
}

module.exports = SimulatedPaymentProvider;
