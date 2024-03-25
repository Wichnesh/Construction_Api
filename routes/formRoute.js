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
router.get("/userforms/:userId", verifyToken, (req, res) => {
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
          created_by, form_status,finance_name,branch,loan_type,sfdc_lan_no,applicant_name,relationship_with_applicant,person_met_site,document_holder,property_owner_name,type_of_property,age_of_the_building,contact_person,contact_no_mobile,date_of_report,date_of_inspection,name_of_engineer,engineer_contact,postal_address_property,address_matching,land_mark,railway_station_kms,bus_stand_kms,development_of_area,occupancy_status,plan_validity,rera_reg_num,jurisdiction,distance_from_city_center,property_type,property_sub_type,near_by_landmark,construction_type,construction_quality,floor_type,roof_type,stair_type,r_c_c,madras_terrace,accessibility,accessible_through,accessible_type,road_width,sewerage_system,water_supply,electricity,number_of_lifts,boundary_matching,earthquack_resistant,property_identification,current_zoning,building_area,uds_area,risk_of_demolition,construction_progress,progress_in_words,recommendation_for_funding,rera_detail,development_in_vicinity,earlier_valuation,negative_area_norms,community_sensitivity,municipal_notification,ownership_details,type_of_document,in_favour_of,executed_on,document_number,market_feedback,remarks,north_as_per_doc,south_as_per_doc,east_as_per_doc,west_as_per_doc,north_as_per_site,south_as_per_site,east_as_per_site,west_as_per_site,north_as_per_approved,south_as_per_approved,east_as_per_approved,west_as_per_approved,latitude,longitude,plan_copy,plan_copy_approved_no,plan_copy_approved_by,type_of_deed,property_tax_receipt,bill_receipt,created_by_name, created_by_email
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
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
          evaluation.person_met_site,
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
          return res
            .status(500)
            .json({ error: "Internal server error", msg: err });
        }
        g_l && g_l.length > 0
          ? delete_images_based_on_form(evaluationId, "g_l")
          : "";
        location_map && location_map.length > 0
          ? delete_images_based_on_form(evaluationId, "location_map")
          : "";
        e_b && e_b.length > 0
          ? delete_images_based_on_form(evaluationId, "e_b")
          : "";
        property_tax && property_tax.length > 0
          ? delete_images_based_on_form(evaluationId, "property_tax")
          : "";
        other_images && other_images.length > 0
          ? delete_images_based_on_form(evaluationId, "other_images")
          : "";
        property_photos && property_photos.length > 0
          ? delete_images_based_on_form(evaluationId, "other_images")
          : "";

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
function delete_images_based_on_form(id, field_name) {
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
    const deleteImageDataQuery = `DELETE FROM imagestable WHERE form_id=${id};`;
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
