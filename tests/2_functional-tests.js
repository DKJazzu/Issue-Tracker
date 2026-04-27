const chaiHttp = require("chai-http");
const chai = require("chai");
const assert = chai.assert;
const server = require("../server");

chai.use(chaiHttp);

suite("Functional Tests", function () {
  let testId1;
  let testId2;

  // establish database state before executing test suites
  before(async function () {
    const res1 = await chai.request(server).post("/api/issues/fcc_test").send({
      issue_title: "Title",
      issue_text: "Text",
      created_by: "Tester",
      assigned_to: "Chai",
      status_text: "In Progress",
    });
    testId1 = res1.body._id;

    const res2 = await chai.request(server).post("/api/issues/fcc_test").send({
      issue_title: "Required Title",
      issue_text: "Required Text",
      created_by: "Tester",
    });
    testId2 = res2.body._id;
  });

  suite("POST /api/issues/{project}", function () {
    test("Create an issue with every field", async function () {
      const res = await chai.request(server).post("/api/issues/fcc_test").send({
        issue_title: "Title",
        issue_text: "Text",
        created_by: "Tester",
        assigned_to: "Chai",
        status_text: "In Progress",
      });
      assert.equal(res.status, 200);
      assert.containsAllKeys(res.body, [
        "issue_title",
        "issue_text",
        "created_by",
        "assigned_to",
        "status_text",
        "_id",
        "created_on",
        "updated_on",
        "open",
      ]);
    });

    test("Create an issue with only required fields", async function () {
      const res = await chai.request(server).post("/api/issues/fcc_test").send({
        issue_title: "Required Title",
        issue_text: "Required Text",
        created_by: "Tester",
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.assigned_to, "");
      assert.equal(res.body.status_text, "");
    });

    test("Create an issue with missing required fields", async function () {
      const res = await chai
        .request(server)
        .post("/api/issues/fcc_test")
        .send({ issue_title: "Missing other fields" });
      assert.equal(res.status, 200);
      assert.equal(res.body.error, "required field(s) missing");
    });
  });

  suite("GET /api/issues/{project}", function () {
    test("View issues on a project", async function () {
      const res = await chai.request(server).get("/api/issues/fcc_test");
      assert.equal(res.status, 200);
      assert.isArray(res.body);
    });

    test("View issues on a project with one filter", async function () {
      const res = await chai
        .request(server)
        .get("/api/issues/fcc_test")
        .query({ created_by: "Tester" });
      assert.equal(res.status, 200);
      res.body.forEach((issue) => assert.equal(issue.created_by, "Tester"));
    });

    test("View issues on a project with multiple filters", async function () {
      const res = await chai
        .request(server)
        .get("/api/issues/fcc_test")
        .query({ issue_title: "Title", created_by: "Tester" });
      assert.equal(res.status, 200);
      res.body.forEach((issue) => {
        assert.equal(issue.issue_title, "Title");
        assert.equal(issue.created_by, "Tester");
      });
    });

    test("View issues with invalid _id filter", async function () {
      const res = await chai
        .request(server)
        .get("/api/issues/fcc_test")
        .query({ _id: "invalidid123" });
      assert.equal(res.status, 200);
      assert.isArray(res.body);
      assert.lengthOf(res.body, 0);
    });
  });

  suite("PUT /api/issues/{project}", function () {
    test("Update one field on an issue", async function () {
      const res = await chai
        .request(server)
        .put("/api/issues/fcc_test")
        .send({ _id: testId1, issue_text: "New Text" });
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, {
        result: "successfully updated",
        _id: testId1,
      });
    });

    test("Update multiple fields on an issue", async function () {
      const res = await chai.request(server).put("/api/issues/fcc_test").send({
        _id: testId1,
        issue_title: "New Title",
        status_text: "Updated",
      });
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, {
        result: "successfully updated",
        _id: testId1,
      });
    });

    test("Update an issue with missing _id", async function () {
      const res = await chai
        .request(server)
        .put("/api/issues/fcc_test")
        .send({ issue_title: "New Title" });
      assert.equal(res.status, 200);
      assert.equal(res.body.error, "missing _id");
    });

    test("Update an issue with no fields to update", async function () {
      const res = await chai
        .request(server)
        .put("/api/issues/fcc_test")
        .send({ _id: testId1 });
      assert.equal(res.status, 200);
      assert.equal(res.body.error, "no update field(s) sent");
      assert.equal(res.body._id, testId1);
    });

    test("Update an issue with an invalid _id", async function () {
      const invalidId = "5f665eb46e296f2148094821";
      const res = await chai
        .request(server)
        .put("/api/issues/fcc_test")
        .send({ _id: invalidId, issue_title: "Update" });
      assert.equal(res.status, 200);
      assert.equal(res.body.error, "could not update");
      assert.equal(res.body._id, invalidId);
    });

    test("Update issue with extra invalid field", async function () {
      const res = await chai
        .request(server)
        .put("/api/issues/fcc_test")
        .send({ _id: testId2, nonsense: "value", issue_text: "Updated Text" });
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, {
        result: "successfully updated",
        _id: testId2,
      });
    });
  });

  suite("DELETE /api/issues/{project}", function () {
    test("Delete an issue", async function () {
      const res = await chai
        .request(server)
        .delete("/api/issues/fcc_test")
        .send({ _id: testId1 });
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, {
        result: "successfully deleted",
        _id: testId1,
      });
    });

    test("Delete an issue with an invalid _id", async function () {
      const invalidId = "5f665eb46e296f2148094821";
      const res = await chai
        .request(server)
        .delete("/api/issues/fcc_test")
        .send({ _id: invalidId });
      assert.equal(res.status, 200);
      assert.equal(res.body.error, "could not delete");
      assert.equal(res.body._id, invalidId);
    });

    test("Delete an issue with missing _id", async function () {
      const res = await chai
        .request(server)
        .delete("/api/issues/fcc_test")
        .send({});
      assert.equal(res.status, 200);
      assert.equal(res.body.error, "missing _id");
    });
  });
});
