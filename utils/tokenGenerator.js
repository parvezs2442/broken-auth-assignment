
const crypto = require("crypto");
const { getSecretFromDB } = require("./mockDb");

const generateToken = async (email) => {
  try {
    const secret = await getSecretFromDB();
    return crypto
      .createHmac("sha256", secret)
      .update(email)
      .digest("base64");
  } catch (error) {
    throw new Error(`Token generation failed: ${error.message}`);
  }
};

module.exports = { generateToken };
