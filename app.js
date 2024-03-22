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
  password VARCHAR(50) NOT NULL,
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
    form_status VARCHAR(15),
    finance_name VARCHAR(40),
    branch VARCHAR(50),
    loan_type VARCHAR(30),
    sfdc_lan_no VARCHAR(30),
    applicant_name VARCHAR(30),
    relationship_with_applicant VARCHAR(40),
    document_holder VARCHAR(50),
    property_owner_name VARCHAR(50),
    type_of_property VARCHAR(50),
    age_of_the_building VARCHAR(50),
    contact_person VARCHAR(50),
    contact_no_mobile VARCHAR(50),
    date_of_report VARCHAR(50),
    date_of_inspection VARCHAR(50),
    name_of_engineer VARCHAR(50),
    engineer_contact VARCHAR(50),
    postal_address_property VARCHAR(50),
    address_matching VARCHAR(50),
    land_mark VARCHAR(50),
    occupancy_status VARCHAR(50),
    railway_station_kms VARCHAR(50),
    bus_stand_kms VARCHAR(50),
    development_of_area VARCHAR(50),
    plan_validity VARCHAR(50),
    rera_reg_num VARCHAR(50),
    jurisdiction VARCHAR(50),
    distance_from_city_center VARCHAR(50),
    property_type VARCHAR(50),
    property_sub_type VARCHAR(50),
    near_by_landmark VARCHAR(50),
    construction_type VARCHAR(50),
    construction_quality VARCHAR(50),
    floor_type VARCHAR(50),
    roof_type VARCHAR(50),
    stair_type VARCHAR(50),
    r_c_c VARCHAR(50),
    madras_terrace VARCHAR(50),
    accessibility VARCHAR(50),
    accessible_through VARCHAR(50),
    accessible_type VARCHAR(50),
    road_width VARCHAR(50),
    sewerage_system VARCHAR(50),
    water_supply VARCHAR(50),
    electricity VARCHAR(50),
    number_of_lifts VARCHAR(50),
    boundary_matching VARCHAR(50),
    earthquack_resistant VARCHAR(50),
    property_identification VARCHAR(50),
    current_zoning VARCHAR(50),
    building_area VARCHAR(50),
    uds_area VARCHAR(50),
    risk_of_demolition VARCHAR(50),
    construction_progress VARCHAR(50),
    progress_in_words VARCHAR(50),
    recommendation_for_funding VARCHAR(50),
    rera_detail VARCHAR(50),
    development_in_vicinity VARCHAR(50),
    earlier_valuation VARCHAR(50),
    negative_area_norms VARCHAR(50),
    community_sensitivity VARCHAR(50),
    municipal_notification VARCHAR(50),
    ownership_details VARCHAR(50),
    type_of_document VARCHAR(50),
    in_favour_of VARCHAR(50),
    executed_on VARCHAR(50),
    document_number VARCHAR(50),
    market_feedback VARCHAR(50),
    remarks VARCHAR(50),
    north_as_per_doc VARCHAR(50),
    south_as_per_doc VARCHAR(50),
    east_as_per_doc VARCHAR(50),
    west_as_per_doc VARCHAR(50),
    north_as_per_site VARCHAR(50),
    south_as_per_site VARCHAR(50),
    east_as_per_site VARCHAR(50),
    west_as_per_site VARCHAR(50),
    north_as_per_approved VARCHAR(50),
    south_as_per_approved VARCHAR(50),
    east_as_per_approved VARCHAR(50),
    west_as_per_approved VARCHAR(50),
    latitude VARCHAR(50),
    longitude VARCHAR(50),
    plan_copy VARCHAR(50),
    plan_copy_approved_no VARCHAR(50),
    plan_copy_approved_by VARCHAR(50),
    type_of_deed VARCHAR(50),
    property_tax_receipt VARCHAR(50),
    bill_receipt VARCHAR(50),
    created_by_name VARCHAR(50),
    created_by_email VARCHAR(50),
    assigned_by_name VARCHAR(50),
    assigned_by_email VARCHAR(50),
    assigned_to_name VARCHAR(50),
    assigned_to_email VARCHAR(50),
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
