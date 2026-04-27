"use strict";

const express = require("express");
const mongoose = require("mongoose");
const issueSchema = new mongoose.Schema({
  issue_title: { type: String, required: true },
  issue_text: { type: String, required: true },
  created_by: { type: String, required: true },
  assigned_to: { type: String, default: "" },
  status_text: { type: String, default: "" },
  created_on: { type: Date, default: Date.now },
  updated_on: { type: Date, default: Date.now },
  open: { type: Boolean, default: true },
  project: { type: String },
});

const Issue = mongoose.model("Issue", issueSchema);

module.exports = function (app) {
  const router = express.Router();

  router.get("/:project", async (req, res) => {
    const project = req.params.project;
    const filter = { project };

    // convert query strings to schema-appropriate types; filter out empty values
    Object.keys(req.query).forEach((key) => {
      if (key === "open") {
        filter.open = req.query.open === "true";
      } else if (req.query[key] !== "") {
        filter[key] = req.query[key];
      }
    });

    if (filter._id && !mongoose.Types.ObjectId.isValid(filter._id)) {
      return res.json([]);
    }

    try {
      // exclude internal database fields from the client response
      const issues = await Issue.find(filter).select("-project -__v").exec();
      res.json(issues);
    } catch (err) {
      console.error("GET error:", err);
      res.status(500).json({ error: "could not fetch issues" });
    }
  });

  router.post("/:project", async (req, res) => {
    const project = req.params.project;
    const { issue_title, issue_text, created_by, assigned_to, status_text } =
      req.body;

    if (!issue_title || !issue_text || !created_by) {
      return res.json({ error: "required field(s) missing" });
    }

    try {
      const newIssue = new Issue({
        issue_title,
        issue_text,
        created_by,
        assigned_to: assigned_to || "",
        status_text: status_text || "",
        project,
        open: true,
      });

      const savedIssue = await newIssue.save();
      const responseObj = savedIssue.toObject();
      // ensure the response object strictly matches the API specification
      delete responseObj.project;
      delete responseObj.__v;
      res.json(responseObj);
    } catch (err) {
      console.error("POST error:", err);
      res.json({ error: "could not create issue" });
    }
  });

  router.put("/:project", async (req, res) => {
    const project = req.params.project;
    const { _id, ...fields } = req.body;

    if (!_id) {
      return res.json({ error: "missing _id" });
    }

    // build update object by filtering out null or empty request fields
    const updateData = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== "" && value !== undefined && value !== null) {
        updateData[key] = value;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.json({ error: "no update field(s) sent", _id });
    }

    updateData.updated_on = new Date();

    try {
      if (!mongoose.Types.ObjectId.isValid(_id)) {
        throw new Error("Invalid ID");
      }

      const updated = await Issue.findOneAndUpdate(
        { _id, project },
        updateData,
        { new: true },
      ).exec();

      if (!updated) {
        return res.json({ error: "could not update", _id });
      }

      res.json({ result: "successfully updated", _id: _id.toString() });
    } catch (err) {
      console.error("PUT error:", err);
      res.json({ error: "could not update", _id });
    }
  });

  router.delete("/:project", async (req, res) => {
    const project = req.params.project;
    const { _id } = req.body;

    if (!_id) {
      return res.json({ error: "missing _id" });
    }

    try {
      if (!mongoose.Types.ObjectId.isValid(_id)) {
        throw new Error("Invalid ID");
      }

      const deleted = await Issue.findOneAndDelete({ _id, project }).exec();

      if (!deleted) {
        return res.json({ error: "could not delete", _id });
      }

      res.json({ result: "successfully deleted", _id: _id.toString() });
    } catch (err) {
      console.error("DELETE error:", err);
      res.json({ error: "could not delete", _id });
    }
  });

  app.use("/api/issues", router);
};
