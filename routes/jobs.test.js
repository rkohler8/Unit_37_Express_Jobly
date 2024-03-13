"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  adminToken,
  u2Token,
  testJobIds,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);


//####    UTILIZING TEST DRIVEN DEVELOPMENT HERE    ####//


/************************************** POST /jobs */

describe("POST /companies", function () {
  const newJob = {
    companyHandle: "c1",
    title: "New",
    salary: 1000,
    equity: "0.7",
  };

  test("ok for admins", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {
      ...newJob,
      id: expect.any(Number),
      }
    });
  });

  test("unauth for users", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob);
        expect(resp.statusCode).toEqual(401);
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          handle: "new",
          numEmployees: 10,
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          companyHandle: "c1",
          title: "New",
          salary: "one thousand",
          equity: "0.7",
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs:
          [
            {
              id: testJobIds[0],
              title: "Job1",
              salary: 100,
              equity: "0.1",
              companyHandle: "c1",
              companyName: "C1",
            },
            {
              id: testJobIds[1],
              title: "Job2",
              salary: 200,
              equity: "0.2",
              companyHandle: "c1",
              companyName: "C1",
            },
            {
              id: testJobIds[2],
              title: "Job3",
              salary: 300,
              equity: null,
              companyHandle: "c1",
              companyName: "C1",
            },
          ],
    });
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
        .get("/jobs")
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });

  test("works: filtering title", async function () {
    const resp = await request(app)
        .get("/jobs")
        .query({ title: "Job3" });
    expect(resp.body).toEqual({
      jobs: [
        {
          id: testJobIds[2],
          title: "Job3",
          salary: 300,
          equity: null,
          companyHandle: "c1",
          companyName: "C1",
        },
      ],
    });
  });

  test("works: filtering minSalary", async function () {
    const resp = await request(app)
        .get("/jobs")
        .query({ minSalary: 300 });
    expect(resp.body).toEqual({
      jobs: [
        {
          id: testJobIds[2],
          title: "Job3",
          salary: 300,
          equity: null,
          companyHandle: "c1",
          companyName: "C1",
        },
      ],
    });
  });

  test("works: filtering hasEquity", async function () {
    const resp = await request(app)
        .get("/jobs")
        .query({ hasEquity: true });
    expect(resp.body).toEqual({
      jobs: [
        {
          id: testJobIds[0],
          title: "Job1",
          salary: 100,
          equity: "0.1",
          companyHandle: "c1",
          companyName: "C1",
        },
        {
          id: testJobIds[1],
          title: "Job2",
          salary: 200,
          equity: "0.2",
          companyHandle: "c1",
          companyName: "C1",
        },
      ],
    });
  });

  test("works: filtering on all filters", async function () {
    const resp = await request(app)
        .get("/jobs")
        .query({ minSalary: 250, hasEquity: false, title: "Job3" });
    expect(resp.body).toEqual({
      jobs: [
        {
          id: testJobIds[2],
          title: "Job3",
          salary: 300,
          equity: null,
          companyHandle: "c1",
          companyName: "C1",
        },
      ],
    });
  });

  test("bad request if invalid filter key", async function () {
    const resp = await request(app)
        .get("/jobs")
        .query({ minSalary: 2, nope: "nope" });
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/jobs/${testJobIds[0]}`);
    expect(resp.body).toEqual({
      job: {
        id: testJobIds[0],
        title: "Job1",
        salary: 100,
        equity: "0.1",
        company: {
          handle: "c1",
          name: "C1",
          description: "Desc1",
          numEmployees: 1,
          logoUrl: "http://c1.img",
        },
      },
    });
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/0`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
  test("works for admins", async function () {
    const resp = await request(app)
        .patch(`/jobs/${testJobIds[0]}`)
        .send({
          title: "NewJob1",
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      job: {
          id: testJobIds[0],
          title: "NewJob1",
          salary: 100,
          equity: "0.1",
          companyHandle: "c1",
        },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .patch(`/jobs/${testJobIds[0]}`)
        .send({
          name: "NewJob1",
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for users", async function () {
    const resp = await request(app)
        .patch(`/jobs/0`)
        .send({
          name: "NewJob1",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such job", async function () {
    const resp = await request(app)
        .patch(`/jobs/nope`)
        .send({
          name: "new nope",
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on handle change attempt", async function () {
    const resp = await request(app)
        .patch(`/jobs/${testJobIds[0]}`)
        .send({
          handle: "c1-new",
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
        .patch(`/jobs/${testJobIds[0]}`)
        .send({
          salary: "one thousand",
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for admins", async function () {
    const resp = await request(app)
        .delete(`/jobs/${testJobIds[0]}`)
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({ deleted: testJobIds[0] });
  });

  test("unauth for users", async function () {
    const resp = await request(app)
        .delete(`/jobs/${testJobIds[0]}`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .delete(`/jobs/${testJobIds[0]}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such job", async function () {
    const resp = await request(app)
        .delete(`/jobs/0`)
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});