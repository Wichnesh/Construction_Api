const express = require("express");
const router = express.Router();
const pool = require("../dbConnection");
const User = require("../userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

router.get("/", (req, res) => {
  // Retrieve all users from the Users table
  const getAllUsersQuery = "SELECT * FROM Users";

  pool.query(getAllUsersQuery, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Internal server error" });
    }

    // Map the result to an array of User objects
    const users = result.map(
      (user) =>
        new User(user.id, user.name, user.email, null, user.account_type)
    );

    res.json({ users: users });
  });
});

router.get("/:userId", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Yet to code!",
  });
});

router.post("/", (req, res) => {
  const { name, email, password, account_type } = req.body;

  if (!name || !email || !password || account_type === undefined) {
    return res.status(400).json({
      error:
        "Missing field(s). Please provide name, email, password, and account_type.",
    });
  }

  // Check if the user with the provided email already exists
  const checkUserQuery = "SELECT * FROM Users WHERE email = ?";
  const checkUserValues = [email];
  pool.query(checkUserQuery, checkUserValues, async (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(500).json({ error: "Internal server error" });
    }
    // If a user with the email already exists, return an error
    if (checkResult.length > 0) {
      return res
        .status(409)
        .json({ error: "User with this email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    // If the email is unique, proceed to create a new user
    const insertUserQuery =
      "INSERT INTO Users (name, email, password, account_type) VALUES (?, ?, ?, ?)";
    const insertUserValues = [name, email, hashedPassword, account_type];

    pool.query(insertUserQuery, insertUserValues, (err, result) => {
      if (err) {
        return res.status(500).json({ error: "Internal server error" });
      }
      const newUser = new User(
        result.insertId,
        name,
        email,
        null,
        account_type
      ); // Exclude password from the response
      res.json({ message: "Registration successful", user: newUser });
    });
  });
});

router.post("/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        error: "Missing field(s). Please provide email and password.",
      });
    }

    pool.query(
      "SELECT * FROM Users WHERE email = ?",
      [email],
      async (error, results) => {
        if (error) {
          console.error(error);
          res.status(500).send("Error logging in");
        } else if (results.length > 0) {
          const user = results[0];
          const passwordMatch = await bcrypt.compare(password, user.password);
          if (passwordMatch) {
            // User data to be stored in JWT payload
            const userData = {
              id: user.id,
              email: user.email,
              account_type: user.account_type,
              // Add more user data as needed
            };
            // Generate JWT token with user data
            const token = jwt.sign(userData, "your_secret_key", {
              expiresIn: "2 days",
            });
            res.status(200).json({ token, account_type: user.account_type });
          } else {
            res.status(401).send("Invalid email or password");
          }
        } else {
          res.status(401).send("Invalid email or password");
        }
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).send("Error logging in");
  }
});

router.put("/:userId", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Yet to code!",
  });
});

router.delete("/:userId", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Yet to code!",
  });
});

module.exports = router;
