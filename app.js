const express = require("express");
const bodyParser = require("body-parser");
const pool = require("./dbConnection");
const app = express();
const port = process.env.PORT || 3003;
const userRoute = require("./routes/userRoutes");
const formRoute = require("./routes/formRoute");
const tableRoute = require("./routes/tableRoute");

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
  created_by INT,
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

app.use("/api/v1/users", userRoute);
app.use("/api/v1/forms", formRoute);
app.use("/api/v1/tables", tableRoute);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
