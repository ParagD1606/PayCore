
const env = require("./config/env");
const app = require("./app");

const server = app.listen(env.PORT, () => {
  console.log(
    `Payment Gateway running on port ${env.PORT} in ${env.NODE_ENV} mode`
  );
});