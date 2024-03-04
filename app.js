const express = require('express');
const bodyParser = require('body-parser');
const pool = require('./dbConnection');
const User = require('./userModel'); // Require the User model

const app = express();
const port = 3003;

app.use(bodyParser.json());

// Check if the Users table exists, if not, create it
pool.query(`CREATE TABLE IF NOT EXISTS Users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  account_type INT
)`, (err) => {
  if (err) {
    console.error(err);
  }
});

// Check if the evaluationtable exists, if not, create it
pool.query(`CREATE TABLE IF NOT EXISTS evaluationtable (
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
)`, (err) => {
  if (err) {
    console.error(err);
  }
});

// Register API
app.post('/register', (req, res) => {
    const { name, email, password, account_type } = req.body;
  
    if (!name || !email || !password || account_type === undefined) {
      return res.status(400).json({ error: 'Missing field(s). Please provide name, email, password, and account_type.' });
    }
  
    // Check if the user with the provided email already exists
    const checkUserQuery = 'SELECT * FROM Users WHERE email = ?';
    const checkUserValues = [email];
  
    pool.query(checkUserQuery, checkUserValues, (checkErr, checkResult) => {
      if (checkErr) {
        return res.status(500).json({ error: 'Internal server error' });
      }
  
      // If a user with the email already exists, return an error
      if (checkResult.length > 0) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }
  
      // If the email is unique, proceed to create a new user
      const insertUserQuery = 'INSERT INTO Users (name, email, password, account_type) VALUES (?, ?, ?, ?)';
      const insertUserValues = [name, email, password, account_type];
  
      pool.query(insertUserQuery, insertUserValues, (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Internal server error' });
        }
  
        const newUser = new User(result.insertId, name, email, null, account_type); // Exclude password from the response
        res.json({ message: 'Registration successful', user: newUser });
      });
    });
  });
  

// Login API
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing field(s). Please provide email and password.' });
  }

  const query = 'SELECT * FROM Users WHERE email = ? AND password = ?';
  const values = [email, password];

  pool.query(query, values, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (result.length > 0) {
      const user = new User(result[0].id, result[0].name, result[0].email, result[0].password, result[0].account_type); // Create a new User object
      return res.json({ message: 'Login successful', user: user });
    } else {
      return res.status(404).json({ error: 'User not found or invalid email or password' });
    }
  });
});

// Get All Users API
app.get('/users', (req, res) => {
    // Retrieve all users from the Users table
    const getAllUsersQuery = 'SELECT * FROM Users';
  
    pool.query(getAllUsersQuery, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
  
      // Map the result to an array of User objects
      const users = result.map(user => new User(user.id, user.name, user.email, null, user.account_type));
  
      res.json({ users: users });
    });
  });


  // Create a new POST API for storing data in evaluationtable
app.post('/financeform', (req, res) => {
  try {
    const evaluationData = req.body;
     if(evaluationData.applicantName == ""){
      return res.status(400).json({ error: 'Applicant Name is Empty' });
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
      evaluation.applicantName, evaluation.loanType, evaluation.sfdcNo,
      evaluation.propertyOwner, evaluation.typeOfProperty, evaluation.postalAddress,
      evaluation.landMark, evaluation.northBy, evaluation.southBy, evaluation.eastBy,
      evaluation.westBy, evaluation.scheduleProperty, evaluation.contactPerson,
      evaluation.contactNoMobile, evaluation.contactNoLandline, evaluation.planCopy,
      evaluation.planCopyApprovedNo, evaluation.planCopyApprovedBy, evaluation.typeOfDeed,
      evaluation.propertyTaxReceipt, evaluation.billReceipt, evaluation.buildingArea,
      evaluation.udsArea
    ];

    pool.query(insertDataQuery, insertDataValues, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      res.json({ message: 'Data stored successfully', result: result });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get All Finance Forms API
app.get('/financeforms', (req, res) => {
  // Retrieve all finance forms from the evaluationtable
  const getAllFinanceFormsQuery = 'SELECT * FROM evaluationtable';

  pool.query(getAllFinanceFormsQuery, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    res.json({ financeForms: result });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
