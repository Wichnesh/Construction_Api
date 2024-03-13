const express = require("express");
const router = express.Router();
const pool = require("../dbConnection");
const { verifyToken } = require("../services/authorize");
const Evaluation = require("../EvaluationModel");

router.get("/", (req, res) => {
  // Retrieve all finance forms from the evaluationtable
  const getAllFinanceFormsQuery = "SELECT * FROM evaluationtable";
  pool.query(getAllFinanceFormsQuery, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
    res.json({ financeForms: result });
  });
});

router.get("/form/:formId", (req, res) => {
  // Retrieve all finance forms from the evaluationtable
  const getAllFinanceFormsQuery = `SELECT * FROM evaluationtable WHERE id = ${req.params.formId}`;
  pool.query(getAllFinanceFormsQuery, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
    res.json({ financeForm: result });
  });
});

router.get("/userforms", verifyToken, (req, res) => {
  // Retrieve all finance forms from the evaluationtable
  const getAllFinanceFormsQuery = `SELECT * FROM evaluationtable WHERE created_by = ${req.user.id}`;
  pool.query(getAllFinanceFormsQuery, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
    res.json({ financeForms: result });
  });
});

router.post("/", verifyToken, (req, res) => {
  try {
    const evaluationData = req.body;
    if (evaluationData.applicantName == "") {
      return res.status(400).json({ error: "Applicant Name is Empty" });
    }
    // Create an instance of the Evaluation model
    const evaluation = new Evaluation(evaluationData);

    // Insert data into evaluationtable
    const insertDataQuery = `INSERT INTO evaluationtable (
          created_by, applicant_name, loan_type, sfdc_no, property_owner, type_of_property,
          postal_address, land_mark, north_by, south_by, east_by, west_by,
          schedule_property, contact_person, contact_no_mobile, contact_no_landline,
          plan_copy, plan_copy_approved_no, plan_copy_approved_by, type_of_deed,
          property_tax_receipt, bill_receipt, building_area, uds_area
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const insertDataValues = [
      req.user.id,
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

module.exports = router;
