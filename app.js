const express = require("express");
const bodyParser = require("body-parser");
const pool = require("./dbConnection");
const User = require("./userModel"); // Require the User model
const Evaluation = require("./EvaluationModel");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const port = 3003;

app.use(bodyParser.json());

// Check if the Users table exists, if not, create it
pool.query(
  `CREATE TABLE IF NOT EXISTS Users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  account_type INT
)`,
  (err) => {
    if (err) {
      console.error(err);
    }
  }
);

// Check if the evaluationtable exists, if not, create it
pool.query(
  `CREATE TABLE IF NOT EXISTS evaluationtable (
  id INT AUTO_INCREMENT PRIMARY KEY,
  applicant_name VARCHAR(255) NOT NULL,
  loan_type VARCHAR(255) NOT NULL,
  sfdc_no VARCHAR(255) NOT NULL,
  property_owner VARCHAR(255),
  type_of_property VARCHAR(255),
  postal_address VARCHAR(255),
  land_mark VARCHAR(255),
  north_by VARCHAR(255),
  south_by VARCHAR(255),
  east_by VARCHAR(255),
  west_by VARCHAR(255),
  schedule_property VARCHAR(255),
  contact_person VARCHAR(255),
  contact_no_mobile VARCHAR(255),
  contact_no_landline VARCHAR(255),
  plan_copy VARCHAR(255),
  plan_copy_approved_no VARCHAR(255),
  plan_copy_approved_by VARCHAR(255),
  type_of_deed VARCHAR(255),
  property_tax_receipt VARCHAR(255),
  bill_receipt VARCHAR(255),
  building_area VARCHAR(255),
  uds_area VARCHAR(255)
)`,
  (err) => {
    if (err) {
      console.error(err);
    }
  }
);

// Register API
app.post("/register", (req, res) => {
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

// Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        error: "Missing field(s). Please provide email and password.",
      });
    }

    pool.query(
      "SELECT * FROM users WHERE email = ?",
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
              // Add more user data as needed
            };
            // Generate JWT token with user data
            const token = jwt.sign(userData, "your_secret_key", {
              expiresIn: "1h",
            });
            res.status(200).json({ token });
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

// Get All Users API
app.get("/users", (req, res) => {
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

// Create a new POST API for storing data in evaluationtable
app.post("/financeform", (req, res) => {
  try {
    const evaluationData = req.body;
    if (evaluationData.applicantName == "") {
      return res.status(400).json({ error: "Applicant Name is Empty" });
    }
    // Create an instance of the Evaluation model
    const evaluation = new Evaluation(evaluationData);

    // Insert data into evaluationtable
    const insertDataQuery = `INSERT INTO evaluationtable (
      applicant_name, loan_type, sfdc_no, property_owner, type_of_property,
      postal_address, land_mark, north_by, south_by, east_by, west_by,
      schedule_property, contact_person, contact_no_mobile, contact_no_landline,
      plan_copy, plan_copy_approved_no, plan_copy_approved_by, type_of_deed,
      property_tax_receipt, bill_receipt, building_area, uds_area
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const insertDataValues = [
      evaluation.applicantName,
      evaluation.loanType,
      evaluation.sfdcNo,
      evaluation.propertyOwner,
      evaluation.typeOfProperty,
      evaluation.postalAddress,
      evaluation.landMark,
      evaluation.northBy,
      evaluation.southBy,
      evaluation.eastBy,
      evaluation.westBy,
      evaluation.scheduleProperty,
      evaluation.contactPerson,
      evaluation.contactNoMobile,
      evaluation.contactNoLandline,
      evaluation.planCopy,
      evaluation.planCopyApprovedNo,
      evaluation.planCopyApprovedBy,
      evaluation.typeOfDeed,
      evaluation.propertyTaxReceipt,
      evaluation.billReceipt,
      evaluation.buildingArea,
      evaluation.udsArea,
    ];

    pool.query(insertDataQuery, insertDataValues, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
      }

      res.json({ message: "Data stored successfully", result: result });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get All Finance Forms API
app.get("/financeforms", (req, res) => {
  // Retrieve all finance forms from the evaluationtable
  const getAllFinanceFormsQuery = "SELECT * FROM evaluationtable";

  pool.query(getAllFinanceFormsQuery, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Internal server error" });
    }

    res.json({ financeForms: result });
  });
});
app.get("/protected", verifyToken, (req, res) => {
  // Access user data from request object
  const userId = req.user.id;
  const username = req.user.username;

  // Perform authorization logic based on user data
  // For example, check if the user has admin role
  if (req.user.role !== "admin") {
    res.status(403).send("Unauthorized"); // Forbidden
  } else {
    // Authorized
    res.json({ userId, username });
  }
});
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

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
