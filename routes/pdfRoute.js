const express = require("express");
const router = express.Router();
const pool = require("../dbConnection");
const { verifyToken } = require("../services/authorize");
const fs = require("fs");
const { PDFDocument, rgb } = require("pdf-lib");
const ejs = require("ejs");
const crypto = require("crypto");
const puppeteer = require("puppeteer");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
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
const randomImageName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");
router.get("/:formId", verifyToken, (req, res) => {
  if (req.user.account_type !== 1) {
    return res.status(403).json({ message: "Forbidden access" });
  }
  // Retrieve all users from the Users table
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
      const form = mergedResult[0];
      let pdf_name = randomImageName();
      console.log(form);
      generatePDF(form)
        .then(async (pdfBytes) => {
          // Save the PDF to a file
          const params = {
            Bucket: bucketName,
            Key: pdf_name,
            Body: pdfBytes,
            ContentType: "application/pdf",
          };
          const command = new PutObjectCommand(params);
          await s3.send(command);
          const getObjectParams = {
            Bucket: bucketName,
            Key: pdf_name,
          };
          const command2 = new GetObjectCommand(getObjectParams);
          const url = await getSignedUrl(s3, command2, { expiresIn: 3600 });
          res.json({ pdf: url });
        })
        .catch((error) => {
          console.error("Error creating PDF:", error);
          res.json({ error: error });
        });
    });
  });
});

async function generatePDF(data) {
  // Read the HTML template file
  const templateContent = fs.readFileSync("./template.html", "utf8");

  // Render the template with dynamic data
  const renderedTemplate = ejs.render(templateContent, { data });

  // Launch Puppeteer browser
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Set content and wait for rendering
  await page.setContent(renderedTemplate);
  await page.waitForSelector("body");

  // Generate PDF buffer
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "2.5cm",
      bottom: "3cm",
      left: "2cm",
      right: "2cm",
    },
  });
  const currentDate = new Date();

  // Get the current date
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // Month starts from 0 (January)
  const day = currentDate.getDate();

  // Get the current time
  const hours = currentDate.getHours();
  const minutes = currentDate.getMinutes();
  const seconds = currentDate.getSeconds();

  // Format the date and time as a string
  const formattedDate = `${year}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
  const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  // Output the current date and time
  console.log("Current Date:", formattedDate);
  console.log("Current Time:", formattedTime);
  // Close browser
  await browser.close();

  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const pdf = await PDFDocument.load(pdfBuffer);

  // Add header and footer to each page
  const headerImageBytes = fs.readFileSync("header-image.png"); // Replace 'header-image.png' with the path to your header image
  const headerImage = await pdfDoc.embedPng(headerImageBytes);
  const headerImageWidth = headerImage.width / 2; // Adjust the width of the image as needed
  const headerImageHeight = headerImage.height / 2; // Adjust the width of the image as needed

  const headerText = "Global Construction";
  const footerText = formattedDate + " " + formattedTime;

  const pages = pdf.getPageCount();
  for (let i = 0; i < pages; i++) {
    const [page] = await pdfDoc.copyPages(pdf, [i]);

    // Add header image
    const headerImagePosition = {
      x: 60,
      y: page.getHeight() - 50,
      width: headerImageWidth,
      height: headerImageHeight,
    };
    page.drawImage(headerImage, headerImagePosition);

    // Add header text
    page.drawText(headerText, {
      x: headerImagePosition.x + headerImageWidth + 20,
      y: headerImagePosition.y + 10,
      size: 12,
      color: rgb(0, 0, 0),
    });

    // Add footer text
    page.drawText(footerText, {
      x: 60,
      y: 30,
      size: 12,
      color: rgb(0, 0, 0),
    });
    let page_no = i + 1;
    page.drawText(page_no.toString(), {
      x: 300,
      y: 30,
      size: 12,
      color: rgb(0, 0, 0),
    });

    pdfDoc.addPage(page);
  }

  // Save the PDF document to a buffer
  const pdfBytes = await pdfDoc.save();

  return pdfBytes;
}
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
// Generate the PDF using the provided data

module.exports = router;
