const express = require("express");
const pool = require("./dbConnection");
const app = express();
const port = process.env.PORT || 3003;
const userRoute = require("./routes/userRoutes");
const formRoute = require("./routes/formRoute");
const tableRoute = require("./routes/tableRoute");
app.use(express.json());
// Check if the Users table exists, if not, create it
pool.query(
  `CREATE TABLE IF NOT EXISTS Users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  email VARCHAR(50) NOT NULL,
  password VARCHAR(132) NOT NULL,
  account_type INT
)`,
  (err) => {
    if (err) {
      console.error(err);
    }
  }
);
pool.query(
  `CREATE TABLE imagestable (
    id INT AUTO_INCREMENT PRIMARY KEY,
    form_id INT,
    field_name VARCHAR(30),
    image_name VARCHAR(50),
    image_url VARCHAR(255),
    image LONGBLOB,
    FOREIGN KEY (form_id) REFERENCES evaluationtable(id)
);`
);
// Check if the evaluationtable exists, if not, create it
pool.query(
  `CREATE TABLE IF NOT EXISTS evaluationtable (
    id INT AUTO_INCREMENT PRIMARY KEY,
    created_by INT,
    assigned_by INT,
    assigned_to INT,
    form_status VARCHAR(10),
    finance_name VARCHAR(40),
    branch VARCHAR(35),
    loan_type VARCHAR(30),
    sfdc_lan_no VARCHAR(30),
    applicant_name VARCHAR(30),
    relationship_with_applicant VARCHAR(40),
    document_holder VARCHAR(40),
    property_owner_name VARCHAR(50),
    type_of_property VARCHAR(50),
    age_of_the_building VARCHAR(30),
    contact_person VARCHAR(50),
    contact_no_mobile VARCHAR(20),
    date_of_report VARCHAR(20),
    date_of_inspection VARCHAR(20),
    name_of_engineer VARCHAR(30),
    engineer_contact VARCHAR(20),
    postal_address_property VARCHAR(50),
    address_matching VARCHAR(50),
    land_mark VARCHAR(50),
    occupancy_status VARCHAR(50),
    railway_station_kms VARCHAR(20),
    bus_stand_kms VARCHAR(20),
    development_of_area VARCHAR(50),
    plan_validity VARCHAR(30),
    rera_reg_num VARCHAR(30),
    jurisdiction VARCHAR(30),
    distance_from_city_center VARCHAR(30),
    property_type VARCHAR(50),
    property_sub_type VARCHAR(50),
    near_by_landmark VARCHAR(50),
    construction_type VARCHAR(50),
    construction_quality VARCHAR(50),
    floor_type VARCHAR(35),
    roof_type VARCHAR(35),
    stair_type VARCHAR(35),
    r_c_c VARCHAR(35),
    madras_terrace VARCHAR(35),
    accessibility VARCHAR(35),
    accessible_through VARCHAR(35),
    accessible_type VARCHAR(35),
    road_width VARCHAR(35),
    sewerage_system VARCHAR(35),
    water_supply VARCHAR(35),
    electricity VARCHAR(35),
    number_of_lifts VARCHAR(35),
    boundary_matching VARCHAR(35),
    earthquack_resistant VARCHAR(35),
    property_identification VARCHAR(35),
    current_zoning VARCHAR(35),
    building_area VARCHAR(35),
    uds_area VARCHAR(35),
    risk_of_demolition VARCHAR(35),
    construction_progress VARCHAR(35),
    progress_in_words VARCHAR(35),
    recommendation_for_funding VARCHAR(35),
    rera_detail VARCHAR(35),
    development_in_vicinity VARCHAR(35),
    earlier_valuation VARCHAR(35),
    negative_area_norms VARCHAR(35),
    community_sensitivity VARCHAR(35),
    municipal_notification VARCHAR(35),
    ownership_details VARCHAR(35),
    type_of_document VARCHAR(35),
    in_favour_of VARCHAR(35),
    executed_on VARCHAR(35),
    document_number VARCHAR(35),
    market_feedback VARCHAR(35),
    remarks VARCHAR(35),
    north_as_per_doc VARCHAR(35),
    south_as_per_doc VARCHAR(35),
    east_as_per_doc VARCHAR(35),
    west_as_per_doc VARCHAR(35),
    north_as_per_site VARCHAR(35),
    south_as_per_site VARCHAR(35),
    east_as_per_site VARCHAR(35),
    west_as_per_site VARCHAR(35),
    north_as_per_approved VARCHAR(35),
    south_as_per_approved VARCHAR(35),
    east_as_per_approved VARCHAR(35),
    west_as_per_approved VARCHAR(35),
    latitude VARCHAR(45),
    longitude VARCHAR(45),
    plan_copy VARCHAR(35),
    plan_copy_approved_no VARCHAR(35),
    plan_copy_approved_by VARCHAR(35),
    type_of_deed VARCHAR(35),
    property_tax_receipt VARCHAR(35),
    bill_receipt VARCHAR(35),
    created_by_name VARCHAR(35),
    created_by_email VARCHAR(35),
    assigned_by_name VARCHAR(35),
    assigned_by_email VARCHAR(35),
    assigned_to_name VARCHAR(35),
    assigned_to_email VARCHAR(35),
    FOREIGN KEY (created_by) REFERENCES Users(id),
    FOREIGN KEY (assigned_by) REFERENCES Users(id),
    FOREIGN KEY (assigned_to) REFERENCES Users(id)
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
