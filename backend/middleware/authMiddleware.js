const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    console.log("Authorization Header:", authHeader);
    console.log("JWT Secret:", process.env.JWT_SECRET);

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // ERROR FIX: Pehle yeh code tha jo invalid JWT error deta tha:
    // const token = authHeader
    //   .replace("Bearer ", "")    // case-sensitive tha, "bearer" ya extra spaces handle nahi hote the
    //   .replace(/[<>]/g, "")      // sirf <> remove hote the, quotes nahi
    //   .trim();
    //
    // Fix: Case-insensitive Bearer prefix removal + quotes/brackets sab remove
    let token = authHeader
      .replace(/^bearer\s+/i, "")  // case-insensitive Bearer prefix
      .replace(/[<>"']/g, "")       // remove <>, quotes
      .trim();

    console.log("Token:", token);
    console.log("Token Length:", token.length);
    console.log("Token Parts:", token.split(".").length);

    // ERROR FIX: Pehle token structure validate nahi hota tha,
    // seedha jwt.verify() pe jata tha aur generic "Invalid token" error aata tha.
    // Ab pehle check karte hain ke JWT mein 3 parts hain (header.payload.signature)
    if (!token || token.split(".").length !== 3) {
      console.log("Invalid token structure - JWT must have 3 parts separated by dots");
      return res.status(400).json({
        success: false,
        message: "Invalid token format. Token must be a valid JWT (header.payload.signature).",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("Decoded:", decoded);

    req.user = decoded;
    next();
  } catch (error) {
    // ERROR FIX: Pehle yeh code tha:
    // console.log("JWT Verification Error:", error);  // pura error object log hota tha
    // return res.status(400).json({                    // status 400 tha, 401 hona chahiye tha
    //   success: false,
    //   message: "Invalid token.",                     // generic message, koi detail nahi
    // });
    //
    // Fix: Specific error messages for expired/invalid tokens + correct 401 status
    console.log("JWT Verification Error:", error.message);

    let message = "Invalid token.";
    if (error.name === "TokenExpiredError") {
      message = "Token has expired. Please login again.";
    } else if (error.name === "JsonWebTokenError") {
      message = "Invalid token. Please login again.";
    }

    return res.status(401).json({
      success: false,
      message,
    });
  }
};

module.exports = authMiddleware;