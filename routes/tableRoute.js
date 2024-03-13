const express = require("express");
const router = express.Router();
const pool = require("../dbConnection");

router.delete("/:deletetable", (req, res) => {
  var tableName = req.params.deletetable;
  var sql = `DROP TABLE ${tableName}`;
  pool.query(sql, function (err, result) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ message: `${tableName} - Table deleted` });
    }
  });
});

module.exports = router;
