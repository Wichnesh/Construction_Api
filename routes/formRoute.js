const express = require("express");
const router = express.Router();
const pool = require("../dbConnection");
const { verifyToken } = require("../services/authorize");
const Evaluation = require("../models/EvaluationModel");
const fs = require("fs");

const multer = require("multer");
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb("Please upload only images.", false);
  }
};
var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __dirname + "/uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-cons-${file.originalname}`);
  },
});
var upload = multer({ storage: storage, fileFilter: imageFilter });
router.get("/", (req, res) => {
  // Retrieve all finance forms from the evaluationtable
  const getAllFinanceFormsQuery = `SELECT * FROM evaluationtable;
        `;
  pool.query(getAllFinanceFormsQuery, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Internal server error", message: err });
    }
    res.json({ financeForms: result });
  });
});

router.get("/form", (req, res) => {
  // Retrieve all finance forms from the evaluationtable
  const formId = req.body.formId;
  const getAllFinanceFormsQuery = `SELECT * FROM evaluationtable WHERE id = ${formId}`;
  pool.query(getAllFinanceFormsQuery, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Internal server error", msg: err });
    }
    res.json({ financeForm: result });
  });
});

router.get("/userforms", verifyToken, (req, res) => {
  // Retrieve all finance forms from the evaluationtable
  const getAllFinanceFormsQuery = `SELECT evaluationtable.*, CreatedBy.name AS created_by_name, CreatedBy.email AS created_by_email,
  AssignedBy.name AS assigned_by_name, AssignedBy.email AS assigned_by_email,
  AssignedTo.name AS assigned_to_name, AssignedTo.email AS assigned_to_email
FROM evaluationtable
LEFT JOIN Users AS CreatedBy ON evaluationtable.created_by = CreatedBy.id
LEFT JOIN Users AS AssignedBy ON evaluationtable.assigned_by = AssignedBy.id
LEFT JOIN Users AS AssignedTo ON evaluationtable.assigned_to = AssignedTo.id WHERE created_by = ${req.user.id}`;
  pool.query(getAllFinanceFormsQuery, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Internal server error", msg: err });
    }
    res.json({ financeForms: result });
  });
});

router.get("/assigned", verifyToken, (req, res) => {
  let query;
  if (req.user.account_type == 1) {
    query = `SELECT * FROM evaluationtable WHERE assigned_by = ${req.user.id}`;
  } else if (req.user.account_type == 2) {
    query = `SELECT * FROM evaluationtable WHERE assigned_to = ${req.user.id}`;
  } else {
    query = `SELECT * FROM evaluationtable WHERE created_by = ${req.user.id}`;
  }
  pool.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
    res.json({ financeForms: result });
  });
});

router.put("/assign", verifyToken, (req, res) => {
  if (req.user.account_type == 1) {
    const formId = req.body.form_Id;
    const assigned_by = req.user.id;
    const assigned_to = req.body.assigned_to;
    const getAssignedByUserQuery =
      "SELECT * FROM Users Where id=" + assigned_by + ";";
    const getAssignedToUserQuery =
      "SELECT * FROM Users Where id=" + assigned_to + ";";
    let assignedByUser, assignedToUser;
    pool.query(getAssignedByUserQuery, (err, user1) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Internal server error", msg: err });
      }
      // Map the result to an array of User objects
      assignedByUser = user1[0];
      pool.query(getAssignedToUserQuery, (err, user) => {
        if (err) {
          return res
            .status(500)
            .json({ error: "Internal server error", msg: err });
        }
        // Map the result to an array of User objects
        assignedToUser = user[0];
        let updateQuery =
          "UPDATE evaluationtable SET assigned_by = ?,assigned_to = ?,assigned_by_name = ?, assigned_by_email = ?, assigned_to_name = ?, assigned_to_email = ? WHERE id=?";
        let updateValues = [
          assigned_by,
          assigned_to,
          assignedByUser.name,
          assignedByUser.email,
          assignedToUser.name,
          assignedToUser.email,
          formId,
        ];
        pool.query(updateQuery, updateValues, (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: "Internal server error" });
          }
          res.json({ message: "Data updated successfully", result: result });
        });
      });
    });
  } else {
    return res.status(403).json({ error: "Not authorized to assign" });
  }
});
// property_photos
// g_l
// location_map
// e_b
// property_tax
router.post(
  "/",
  upload.fields([
    { name: "property_photos", maxCount: 5 },
    { name: "g_l", maxCount: 5 },
    { name: "location_map", maxCount: 5 },
    { name: "e_b", maxCount: 5 },
    { name: "property_tax", maxCount: 5 },
    { name: "other_images", maxCount: 7 },
  ]),
  verifyToken,
  (req, res) => {
    try {
      const evaluationData = req.body;
      const property_photos = req.files["property_photos"];
      const g_l = req.files["g_l"];
      const location_map = req.files["location_map"];
      const e_b = req.files["e_b"];
      const property_tax = req.files["property_tax"];
      const other_images = req.files["other_images"];

      // Create an instance of the Evaluation model
      const evaluation = new Evaluation(evaluationData);

      // Insert data into evaluationtable
      const insertDataQuery = `INSERT INTO evaluationtable (
          created_by, form_status,finance_name,branch,loan_type,sfdc_lan_no,applicant_name,relationship_with_applicant,document_holder,property_owner_name,type_of_property,age_of_the_building,contact_person,contact_no_mobile,date_of_report,date_of_inspection,name_of_engineer,engineer_contact,postal_address_property,address_matching,land_mark,railway_station_kms,bus_stand_kms,development_of_area,occupancy_status,plan_validity,rera_reg_num,jurisdiction,distance_from_city_center,property_type,property_sub_type,near_by_landmark,construction_type,construction_quality,floor_type,roof_type,stair_type,r_c_c,madras_terrace,accessibility,accessible_through,accessible_type,road_width,sewerage_system,water_supply,electricity,number_of_lifts,boundary_matching,earthquack_resistant,property_identification,current_zoning,building_area,uds_area,risk_of_demolition,construction_progress,progress_in_words,recommendation_for_funding,rera_detail,development_in_vicinity,earlier_valuation,negative_area_norms,community_sensitivity,municipal_notification,ownership_details,type_of_document,in_favour_of,executed_on,document_number,market_feedback,remarks,north_as_per_doc,south_as_per_doc,east_as_per_doc,west_as_per_doc,north_as_per_site,south_as_per_site,east_as_per_site,west_as_per_site,north_as_per_approved,south_as_per_approved,east_as_per_approved,west_as_per_approved,latitude,longitude,plan_copy,plan_copy_approved_no,plan_copy_approved_by,type_of_deed,property_tax_receipt,bill_receipt,created_by_name, created_by_email
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
      const getCreatedUsersQuery =
        "SELECT * FROM Users Where id=" + req.user.id + ";";
      let createdUser;
      pool.query(getCreatedUsersQuery, (err, user) => {
        if (err) {
          return res
            .status(500)
            .json({ error: "Internal server error", msg: err });
        }
        // Map the result to an array of User objects
        createdUser = user;

        const insertDataValues = [
          req.user.id,
          evaluation.form_status,
          evaluation.finance_name,
          evaluation.branch,
          evaluation.loan_type,
          evaluation.sfdc_lan_no,
          evaluation.applicant_name,
          evaluation.relationship_with_applicant,
          evaluation.document_holder,
          evaluation.property_owner_name,
          evaluation.type_of_property,
          evaluation.age_of_the_building,
          evaluation.contact_person,
          evaluation.contact_no_mobile,
          evaluation.date_of_report,
          evaluation.date_of_inspection,
          evaluation.name_of_engineer,
          evaluation.engineer_contact,
          evaluation.postal_address_property,
          evaluation.address_matching,
          evaluation.land_mark,
          evaluation.railway_station_kms,
          evaluation.bus_stand_kms,
          evaluation.development_of_area,
          evaluation.occupancy_status,
          evaluation.plan_validity,
          evaluation.rera_reg_num,
          evaluation.jurisdiction,
          evaluation.distance_from_city_center,
          evaluation.property_type,
          evaluation.property_sub_type,
          evaluation.near_by_landmark,
          evaluation.construction_type,
          evaluation.construction_quality,
          evaluation.floor_type,
          evaluation.roof_type,
          evaluation.stair_type,
          evaluation.r_c_c,
          evaluation.madras_terrace,
          evaluation.accessibility,
          evaluation.accessible_through,
          evaluation.accessible_type,
          evaluation.road_width,
          evaluation.sewerage_system,
          evaluation.water_supply,
          evaluation.electricity,
          evaluation.number_of_lifts,
          evaluation.boundary_matching,
          evaluation.earthquack_resistant,
          evaluation.property_identification,
          evaluation.current_zoning,
          evaluation.building_area,
          evaluation.uds_area,
          evaluation.risk_of_demolition,
          evaluation.construction_progress,
          evaluation.progress_in_words,
          evaluation.recommendation_for_funding,
          evaluation.rera_detail,
          evaluation.development_in_vicinity,
          evaluation.earlier_valuation,
          evaluation.negative_area_norms,
          evaluation.community_sensitivity,
          evaluation.municipal_notification,
          evaluation.ownership_details,
          evaluation.type_of_document,
          evaluation.in_favour_of,
          evaluation.executed_on,
          evaluation.document_number,
          evaluation.market_feedback,
          evaluation.remarks,
          evaluation.north_as_per_doc,
          evaluation.south_as_per_doc,
          evaluation.east_as_per_doc,
          evaluation.west_as_per_doc,
          evaluation.north_as_per_site,
          evaluation.south_as_per_site,
          evaluation.east_as_per_site,
          evaluation.west_as_per_site,
          evaluation.north_as_per_approved,
          evaluation.south_as_per_approved,
          evaluation.east_as_per_approved,
          evaluation.west_as_per_approved,
          evaluation.latitude,
          evaluation.longitude,
          evaluation.plan_copy,
          evaluation.plan_copy_approved_no,
          evaluation.plan_copy_approved_by,
          evaluation.type_of_deed,
          evaluation.property_tax_receipt,
          evaluation.bill_receipt,
          createdUser[0].name,
          createdUser[0].email,
        ];

        pool.query(insertDataQuery, insertDataValues, (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: "Internal server error" });
          }
          const formId = result.insertId;
          insertImagesIntoDatabase(formId, property_photos, "property_photos");
          insertImagesIntoDatabase(formId, g_l, "g_l");
          insertImagesIntoDatabase(formId, location_map, "location_map");
          insertImagesIntoDatabase(formId, e_b, "e_b");
          insertImagesIntoDatabase(formId, property_tax, "property_tax");
          insertImagesIntoDatabase(formId, other_images, "other_images");
          res.json({ message: "Data stored successfully", result: result });
        });
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.put("/reset/:id", verifyToken, (req, res) => {
  try {
    const evaluationData = req.body;
    const evaluationId = req.params.id;

    if (evaluationData.applicantName == "") {
      return res.status(400).json({ error: "Applicant Name is Empty" });
    }

    const updateDataQuery = `UPDATE evaluationtable SET
        applicant_name = ?,
        loan_type = ?,
        sfdc_no = ?,
        property_owner = ?,
        type_of_property = ?,
        postal_address = ?,
        land_mark = ?,
        north_by = ?,
        south_by = ?,
        east_by = ?,
        west_by = ?,
        schedule_property = ?,
        contact_person = ?,
        contact_no_mobile = ?,
        contact_no_landline = ?,
        plan_copy = ?,
        plan_copy_approved_no = ?,
        plan_copy_approved_by = ?,
        type_of_deed = ?,
        property_tax_receipt = ?,
        bill_receipt = ?,
        building_area = ?,
        uds_area = ?
        WHERE id = ?`;

    const updateDataValues = [
      evaluationData.applicantName,
      evaluationData.loanType,
      evaluationData.sfdcNo,
      evaluationData.propertyOwner,
      evaluationData.typeOfProperty,
      evaluationData.postalAddress,
      evaluationData.landMark,
      evaluationData.northBy,
      evaluationData.southBy,
      evaluationData.eastBy,
      evaluationData.westBy,
      evaluationData.scheduleProperty,
      evaluationData.contactPerson,
      evaluationData.contactNoMobile,
      evaluationData.contactNoLandline,
      evaluationData.planCopy,
      evaluationData.planCopyApprovedNo,
      evaluationData.planCopyApprovedBy,
      evaluationData.typeOfDeed,
      evaluationData.propertyTaxReceipt,
      evaluationData.billReceipt,
      evaluationData.buildingArea,
      evaluationData.udsArea,
      evaluationId,
    ];

    pool.query(updateDataQuery, updateDataValues, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
      }

      res.json({ message: "Data updated successfully", result: result });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", verifyToken, (req, res) => {
  try {
    const evaluationData = req.body;
    const evaluationId = req.params.id;

    if (Object.keys(evaluationData).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    let updateDataQuery = "UPDATE evaluationtable SET ";
    const updateDataValues = [];

    Object.keys(evaluationData).forEach((key, index) => {
      if (key !== "id") {
        updateDataQuery += `${key} = ?, `;
        updateDataValues.push(evaluationData[key]);
      }
    });

    // Remove the trailing comma and add WHERE clause
    updateDataQuery = updateDataQuery.slice(0, -2) + " WHERE id = ?";
    updateDataValues.push(evaluationId);

    pool.query(updateDataQuery, updateDataValues, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
      }

      res.json({ message: "Data updated successfully", result: result });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:formId", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Yet to code!",
  });
});
function insertImagesIntoDatabase(formId, images, fieldName) {
  if (!images) return;

  images.forEach((image) => {
    const imageData = fs.readFileSync(image.path);
    const insertImageQuery =
      "INSERT INTO imagestable (form_id, field_name, image_name, image) VALUES (?, ?, ?, ?)";
    pool.query(
      insertImageQuery,
      [formId, fieldName, image.originalname, imageData],
      (error, results, fields) => {
        if (error) {
          console.error("Error inserting image: " + error.stack);
          return;
        }
        console.log("Inserted image successfully.");
      }
    );
  });
}
module.exports = router;
