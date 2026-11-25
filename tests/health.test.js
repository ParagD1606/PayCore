const request = require("supertest");
const app = require("../src/app");

describe("Health API", () => {
  it("should return API health status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      status: "OK",
      message: "Payment Gateway API is running",
    });
  });
});