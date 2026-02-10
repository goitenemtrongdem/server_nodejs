const authService = require("../services/auth.service");
// const response = require("../utils/response");
// const authService = require("../services/auth.service");
exports.signupRequest = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return response.error(res, "Missing email or password");
    }

    await authService.signupRequest({ email, password });

    return response.success(
      res,
      null,
      "Verification email sent"
    );
  } catch (err) {
    return response.error(res, err.message);
  }
};


exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    await authService.verifyEmail(token);

    return res.send("✅ Email verified. You can close this tab.");
  } catch (err) {
    return res.status(400).send(err.message);
  }
};

exports.afterVerify = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "Missing idToken" });
    }

    const result = await authService.saveUserAfterVerify(idToken);

    res.status(200).json({
      message: "User saved to database",
      ...result
    });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
};
exports.signIn = async (req, res) => {
  try {
    const { email, password, fcmToken } = req.body;

    const data = await authService.signIn({
      email,
      password,
      fcmToken,
    });

    res.status(200).json({
      message: "Sign in successful",
      data,
    });
  } catch (err) {
    res.status(401).json({
      message: err.message,
    });
  }
};