const express = require("express");
const router = express.Router();
const pool = require("../dbConnection");
const { verifyToken } = require("../services/authorize");
const Evaluation = require("../models/EvaluationModel");
const crypto = require("crypto");
const sharp = require("sharp");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const randomImageName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

const bucketName = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;
const accessKey = process.env.ACCESS_KEY;
const secretAccessKey = process.env.SECRET_ACCESS_KEY;

const s3 = new S3Client({
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretAccessKey,
  },
  region: bucketRegion,
});
const multer = require("multer");
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb("Please upload only images.", false);
  }
};
const storage = multer.memoryStorage();
var upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
  },
  fileFilter: imageFilter,
});
router.get("/", (req, res) => {
  // Retrieve all finance forms from the evaluationtable
  const getAllFinanceFormsQuery = `
  SELECT *
  FROM evaluationtable;`;
  pool.query(getAllFinanceFormsQuery, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Internal server error", message: err });
    }
    const getimage_Query =
      "SELECT * FROM imagestable ORDER BY form_id, field_name;";
    pool.query(getimage_Query, (err, results) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Internal server error", message: err });
      }
      const organizedData = results.reduce((acc, curr) => {
        const { form_id, field_name, image_name, image_url } = curr;
        if (!acc[form_id]) {
          acc[form_id] = {};
        }
        if (!acc[form_id][field_name]) {
          acc[form_id][field_name] = [];
        }
        acc[form_id][field_name].push({ image_name, image_url });
        return acc;
      }, {});
      let allImages = organizedData;
      const mergedResult = mergeObjectWithArray(result, allImages);
      res.json({ financeForms: mergedResult });
    });
  });
});
router.get("/specific", (req, res) => {
  // Retrieve all finance forms from the evaluationtable
  const getAllFinanceFormsQuery = `
  SELECT id, assigned_by, finance_name, branch, applicant_name, created_by, created_by_name, created_by_email, assigned_by_name, assigned_by_email, assigned_to_name ,assigned_to_email
  FROM evaluationtable;`;
  pool.query(getAllFinanceFormsQuery, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Internal server error", message: err });
    }
    res.json({ financeForms: result });
  });
});
router.get("/images", async (req, res) => {
  // Retrieve all finance forms from the evaluationtable
  // const client = new S3Client(clientParams);

  const getAllFinanceFormsQuery = `SELECT * FROM imagestable;
        `;
  pool.query(getAllFinanceFormsQuery, async (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Internal server error", message: err });
    }
    for (const result of results) {
      const getObjectParams = {
        Bucket: bucketName,
        Key: result.image_name,
      };
      const command = new GetObjectCommand(getObjectParams);
      const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
      result.image_url = url;
    }
    res.json({ Images: results });
  });
});
router.get("/group_images", (req, res) => {
  // let form_id =
  // Retrieve all finance forms from the evaluationtable
  const getimage_Query =
    "SELECT id,form_id,image_url,field_name FROM imagestable WHERE form_id=2 ORDER BY field_name;";
  pool.query(getimage_Query, (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Internal server error", message: err });
    }
    const groupedData = results.reduce((acc, curr) => {
      const { field_name } = curr;
      const key = `${field_name}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(curr);
      return acc;
    }, {});
    res.json({ Images: groupedData });
  });
});
router.get("/form/:formId", (req, res) => {
  // Retrieve all finance forms from the evaluationtable
  const formId = req.params.formId;
  const getAllFinanceFormsQuery = `SELECT * FROM evaluationtable WHERE id = ${formId}`;
  pool.query(getAllFinanceFormsQuery, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Internal server error", msg: err });
    }
    const getimage_Query = `SELECT * FROM imagestable WHERE form_id = ${formId} ORDER BY form_id, field_name;`;
    pool.query(getimage_Query, async (err, results) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Internal server error", message: err });
      }
      for (const result of results) {
        const getObjectParams = {
          Bucket: bucketName,
          Key: result.image_name,
        };
        const command = new GetObjectCommand(getObjectParams);
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
        result.image_url = url;
      }
      const organizedData = results.reduce((acc, curr) => {
        const { form_id, field_name, image_name, image_url } = curr;
        if (!acc[form_id]) {
          acc[form_id] = {};
        }
        if (!acc[form_id][field_name]) {
          acc[form_id][field_name] = [];
        }
        acc[form_id][field_name].push(image_url);
        return acc;
      }, {});
      let allImages = organizedData;
      const mergedResult = mergeObjectWithArray(result, allImages);
      res.json({ financeForms: mergedResult[0] });
    });
  });
});
router.get("/userforms", verifyToken, (req, res) => {
  // Retrieve all finance forms from the evaluationtable
  const getAllFinanceFormsQuery = `SELECT id, assigned_by, finance_name, branch, applicant_name, created_by, created_by_name, created_by_email, assigned_by_name, assigned_by_email, assigned_to_name ,assigned_to_email
  FROM evaluationtable WHERE created_by = ${req.user.id}`;
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
      return res.status(500).json({ error: "Internal server error", msg: err });
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
          "UPDATE evaluationtable SET assigned_by = ?,assigned_to = ?,assigned_by_name = ?, assigned_by_email = ?, assigned_to_name = ?, assigned_to_email = ?, form_status = 1 WHERE id=?";
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
            return res
              .status(500)
              .json({ error: "Internal server error", msg: err });
          }
          res.json({ message: "Data updated successfully", result: result });
        });
      });
    });
  } else {
    return res.status(403).json({ error: "Not authorized to assign" });
  }
});
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
        created_by,
        accessibility,
        accessible_through,
        accessible_type,
        address_matching,
        age_of_the_building,
        applicant_name,
        area_as_per_actual,
        area_as_per_approved,
        area_as_per_doc,
        bill_receipt,
        boundary_matching,
        branch,
        building_area,
        bus_stand_kms,
        community_sensitivity,
        configuration,
        consideration_price,
        construction_progress,
        construction_quality,
        construction_type,
        contact_no_mobile,
        contact_person,
        current_zoning,
        date_of_inspection,
        date_of_report,
        development_in_vicinity,
        development_of_area,
        distance_from_city_center,
        distrested_sale_actual,
        distrested_sale_doc,
        document_holder,
        document_number,
        earlier_valuation,
        earthquack_resistant,
        electricity,
        engineer_contact,
        executed_on,
        final_fair_market_completion_actual,
        final_fair_market_completion_document,
        final_fair_market_date_actual,
        final_fair_market_date_document,
        finance_name,
        floor_type,
        form_status,
        government_price,
        ground_area_market_actual,
        ground_area_market_document,
        ground_as_per_actual,
        ground_as_per_doc,
        ground_considerationt_price,
        ground_fair_market_actual,
        ground_fair_market_document,
        ground_government_price,
        ground_gprice_actual,
        ground_gprice_document,
        holding_type,
        in_favour_of,
        jurisdiction,
        land_area_market_actual,
        land_area_market_document,
        land_fair_market_actual,
        land_fair_market_document,
        land_gprice_actual,
        land_gprice_document,
        land_mark,
        latitude,
        loan_type,
        longitude,
        madras_terrace,
        market_feedback,
        municipal_notification,
        name_of_engineer,
        near_by_landmark,
        negative_area_norms,
        number_of_lifts,
        occupancy_status,
        ownership_details,
        pa_address_1,
        pa_address_2,
        pa_district,
        pa_pincode,
        pa_state,
        pd_east_as_per_actual,
        pd_east_as_per_approved,
        pd_east_as_per_doc,
        pd_north_as_per_actual,
        pd_north_as_per_approved,
        pd_north_as_per_doc,
        pd_south_as_per_actual,
        pd_south_as_per_approved,
        pd_south_as_per_doc,
        pd_west_as_per_actual,
        pd_west_as_per_approved,
        pd_west_as_per_doc,
        person_met_site,
        plan_copy,
        plan_copy_approved_by,
        plan_copy_approved_no,
        plan_validity,
        progress_in_words,
        property_identification,
        property_owner_name,
        property_sub_type,
        property_tax_receipt,
        property_type,
        r_c_c,
        railway_station_kms,
        recommendation_for_funding,
        relationship_with_applicant,
        remarks,
        rera_detail,
        rera_reg_num,
        risk_of_demolition,
        road_width,
        roof_type,
        sbua_as_per_actual,
        sbua_as_per_doc,
        sd_east_as_per_doc,
        sd_east_as_per_site,
        sd_north_as_per_doc,
        sd_north_as_per_site,
        sd_south_as_per_doc,
        sd_south_as_per_site,
        sd_west_as_per_doc,
        sd_west_as_per_site,
        sewerage_system,
        sfdc_lan_no,
        stair_type,
        summation_as_per_actual,
        summation_as_per_doc,
        type_of_deed,
        type_of_document,
        type_of_property,
        uds_area,
        valuation_guideline_actual,
        valuation_guideline_doc,
        water_supply,
        created_by_name,
        created_by_email
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )`;
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
          evaluation.accessibility,
          evaluation.accessible_through,
          evaluation.accessible_type,
          evaluation.address_matching,
          evaluation.age_of_the_building,
          evaluation.applicant_name,
          evaluation.area_as_per_actual,
          evaluation.area_as_per_approved,
          evaluation.area_as_per_doc,
          evaluation.bill_receipt,
          evaluation.boundary_matching,
          evaluation.branch,
          evaluation.building_area,
          evaluation.bus_stand_kms,
          evaluation.community_sensitivity,
          evaluation.configuration,
          evaluation.consideration_price,
          evaluation.construction_progress,
          evaluation.construction_quality,
          evaluation.construction_type,
          evaluation.contact_no_mobile,
          evaluation.contact_person,
          evaluation.current_zoning,
          evaluation.date_of_inspection,
          evaluation.date_of_report,
          evaluation.development_in_vicinity,
          evaluation.development_of_area,
          evaluation.distance_from_city_center,
          evaluation.distrested_sale_actual,
          evaluation.distrested_sale_doc,
          evaluation.document_holder,
          evaluation.document_number,
          evaluation.earlier_valuation,
          evaluation.earthquack_resistant,
          evaluation.electricity,
          evaluation.engineer_contact,
          evaluation.executed_on,
          evaluation.final_fair_market_completion_actual,
          evaluation.final_fair_market_completion_document,
          evaluation.final_fair_market_date_actual,
          evaluation.final_fair_market_date_document,
          evaluation.finance_name,
          evaluation.floor_type,
          evaluation.form_status,
          evaluation.government_price,
          evaluation.ground_area_market_actual,
          evaluation.ground_area_market_document,
          evaluation.ground_as_per_actual,
          evaluation.ground_as_per_doc,
          evaluation.ground_considerationt_price,
          evaluation.ground_fair_market_actual,
          evaluation.ground_fair_market_document,
          evaluation.ground_government_price,
          evaluation.ground_gprice_actual,
          evaluation.ground_gprice_document,
          evaluation.holding_type,
          evaluation.in_favour_of,
          evaluation.jurisdiction,
          evaluation.land_area_market_actual,
          evaluation.land_area_market_document,
          evaluation.land_fair_market_actual,
          evaluation.land_fair_market_document,
          evaluation.land_gprice_actual,
          evaluation.land_gprice_document,
          evaluation.land_mark,
          evaluation.latitude,
          evaluation.loan_type,
          evaluation.longitude,
          evaluation.madras_terrace,
          evaluation.market_feedback,
          evaluation.municipal_notification,
          evaluation.name_of_engineer,
          evaluation.near_by_landmark,
          evaluation.negative_area_norms,
          evaluation.number_of_lifts,
          evaluation.occupancy_status,
          evaluation.ownership_details,
          evaluation.pa_address_1,
          evaluation.pa_address_2,
          evaluation.pa_district,
          evaluation.pa_pincode,
          evaluation.pa_state,
          evaluation.pd_east_as_per_actual,
          evaluation.pd_east_as_per_approved,
          evaluation.pd_east_as_per_doc,
          evaluation.pd_north_as_per_actual,
          evaluation.pd_north_as_per_approved,
          evaluation.pd_north_as_per_doc,
          evaluation.pd_south_as_per_actual,
          evaluation.pd_south_as_per_approved,
          evaluation.pd_south_as_per_doc,
          evaluation.pd_west_as_per_actual,
          evaluation.pd_west_as_per_approved,
          evaluation.pd_west_as_per_doc,
          evaluation.person_met_site,
          evaluation.plan_copy,
          evaluation.plan_copy_approved_by,
          evaluation.plan_copy_approved_no,
          evaluation.plan_validity,
          evaluation.progress_in_words,
          evaluation.property_identification,
          evaluation.property_owner_name,
          evaluation.property_sub_type,
          evaluation.property_tax_receipt,
          evaluation.property_type,
          evaluation.r_c_c,
          evaluation.railway_station_kms,
          evaluation.recommendation_for_funding,
          evaluation.relationship_with_applicant,
          evaluation.remarks,
          evaluation.rera_detail,
          evaluation.rera_reg_num,
          evaluation.risk_of_demolition,
          evaluation.road_width,
          evaluation.roof_type,
          evaluation.sbua_as_per_actual,
          evaluation.sbua_as_per_doc,
          evaluation.sd_east_as_per_doc,
          evaluation.sd_east_as_per_site,
          evaluation.sd_north_as_per_doc,
          evaluation.sd_north_as_per_site,
          evaluation.sd_south_as_per_doc,
          evaluation.sd_south_as_per_site,
          evaluation.sd_west_as_per_doc,
          evaluation.sd_west_as_per_site,
          evaluation.sewerage_system,
          evaluation.sfdc_lan_no,
          evaluation.stair_type,
          evaluation.summation_as_per_actual,
          evaluation.summation_as_per_doc,
          evaluation.type_of_deed,
          evaluation.type_of_document,
          evaluation.type_of_property,
          evaluation.uds_area,
          evaluation.valuation_guideline_actual,
          evaluation.valuation_guideline_doc,
          evaluation.water_supply,
          createdUser[0].name,
          createdUser[0].email,
        ];

        pool.query(insertDataQuery, insertDataValues, (err, result) => {
          if (err) {
            console.error(err);
            return res
              .status(500)
              .json({ error: "Internal server error", msg: err });
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
      res.status(500).json({ error: "Internal server error", msg: err });
    }
  }
);
router.put(
  "/:id",
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
      const evaluationId = req.params.id;
      let updateDataQuery;
      let updateDataValues;
      if (Object.keys(evaluationData).length === 0) {
        updateDataQuery = "UPDATE evaluationtable SET id = ? WHERE id = ?;"
        updateDataValues = [evaluationId, evaluationId];
      }
      else{
        updateDataQuery = "UPDATE evaluationtable SET ";
        updateDataValues = [];
  
        Object.keys(evaluationData).forEach((key, index) => {
          if (key !== "id") {
            updateDataQuery += `${key} = ?, `;
            updateDataValues.push(evaluationData[key]);
          }
        });
        // Remove the trailing comma and add WHERE clause
        updateDataQuery = updateDataQuery.slice(0, -2) + " WHERE id = ?";
        updateDataValues.push(evaluationId);
      }

      

      pool.query(updateDataQuery, updateDataValues, (err, result) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ error: "Internal server error", msg: err });
        }
        delete_images_based_on_form(evaluationId,g_l, "g_l")
        delete_images_based_on_form(evaluationId,location_map, "location_map")
        delete_images_based_on_form(evaluationId,e_b, "e_b")
        delete_images_based_on_form(evaluationId,property_tax, "property_tax")
        delete_images_based_on_form(evaluationId,other_images, "other_images")
        delete_images_based_on_form(evaluationId,property_photos, "property_photos")
        insertImagesIntoDatabase(
          evaluationId,
          property_photos,
          "property_photos"
        );
        insertImagesIntoDatabase(evaluationId, g_l, "g_l");
        insertImagesIntoDatabase(evaluationId, location_map, "location_map");
        insertImagesIntoDatabase(evaluationId, e_b, "e_b");
        insertImagesIntoDatabase(evaluationId, property_tax, "property_tax");
        insertImagesIntoDatabase(evaluationId, other_images, "other_images");
        res.json({ message: "Data updated successfully", result: result });
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error", msg: err });
    }
  }
);
router.delete("/:formId", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Yet to code!",
  });
});
router.delete("/image", (req, res) => {
  deleteImages(req.body.id);
  res.json({ message: "Deleted Image Data" });
});
function mergeObjectWithArray(array, objects) {
  return array.map((item) => {
    const key = item.id.toString();
    if (objects[key]) {
      return {
        ...item,
        ...objects[key],
      };
    }
    return item;
  });
}
function insertImagesIntoDatabase(formId, images, fieldName) {
  if (!images) return;
  images.forEach(async (image) => {
    // const imageData = fs.readFileSync(image.path);
    const buffer = await sharp(image.buffer)
      .resize({ height: 720, width: 720, fit: "contain" })
      .toBuffer();
    const image_name = randomImageName();
    const params = {
      Bucket: bucketName,
      Key: image_name,
      Body: buffer,
      ContentType: image.mimetype,
    };
    const command = new PutObjectCommand(params);
    await s3.send(command);
    const insertImageQuery =
      "INSERT INTO imagestable (form_id, field_name, image_name, image_url) VALUES (?, ?, ?, ?)";
    pool.query(
      insertImageQuery,
      [formId, fieldName, image_name, image.path],
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
function deleteImages(id) {
  const selectImageDataQuery = `SELECT * FROM imagestable WHERE id=${id};`;
  pool.query(selectImageDataQuery, async (err, results) => {
    if (err) {
      console.log({ error: "Internal server error", message: err });
    }
    for (const result of results) {
      const params = {
        Bucket: bucketName,
        Key: result.image_name,
      };
      const command = new DeleteObjectCommand(params);
      await s3.send(command);
    }
    const deleteImageDataQuery = `DELETE FROM imagestable WHERE id=${id};`;
    pool.query(deleteImageDataQuery, async (err, results) => {
      if (err) {
        console.log({ error: "Internal server error", message: err });
        return;
      }
      console.log("Deleted image successfully.");
    });
  });
}
function delete_images_based_on_form(id,images, field_name) {
  if (!images) return;
  const selectImageDataQuery = `SELECT * FROM imagestable WHERE form_id=${id} AND field_name="${field_name}";`;
  pool.query(selectImageDataQuery, async (err, results) => {
    if (err) {
      console.log({ error: "Internal server error", message: err });
      return;
    }
    for (const result of results) {
      const params = {
        Bucket: bucketName,
        Key: result.image_name,
      };
      const command = new DeleteObjectCommand(params);
      await s3.send(command);
    }
    const deleteImageDataQuery = `DELETE FROM imagestable WHERE form_id=${id} AND field_name="${field_name}";`;
    pool.query(deleteImageDataQuery, async (err, results) => {
      if (err) {
        console.log({ error: "Internal server error", message: err });
        return;
      }
      console.log("Deleted image successfully.");
    });
  });
}
module.exports = router;
