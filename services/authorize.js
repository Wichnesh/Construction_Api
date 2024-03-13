const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  // const bearerHeader = req.headers["authorization"];
  const token = req.header("Authorization");
  if (typeof token !== "undefined") {
    // const bearerToken = bearerHeader.split(".")[1];
    jwt.verify(token, "your_secret_key", (err, decoded) => {
      if (err) {
        res.sendStatus(403); // Forbidden
      } else {
        req.user = decoded; // Attach decoded user data to request object
        next();
      }
    });
  } else {
    res.sendStatus(403); // Forbidden
  }
}

module.exports = { verifyToken };
