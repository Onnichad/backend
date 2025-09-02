const express = require("express");

const app = express();

app.use((req, res) => {
  res.json({ message: "Message bien recu" });
});

module.exports = app;
