import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";

mkdirSync("examples", { recursive: true });
const db = new Database("examples/company.db");

db.run("DROP TABLE IF EXISTS employees;");
db.run("DROP TABLE IF EXISTS departments;");

db.run(`
  CREATE TABLE departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    budget REAL NOT NULL
  );
`);

db.run(`
  CREATE TABLE employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    department_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    salary REAL NOT NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id)
  );
`);

db.run("INSERT INTO departments (name, budget) VALUES (?, ?);", ["Engineering", 750000]);
db.run("INSERT INTO departments (name, budget) VALUES (?, ?);", ["Product Design", 320000]);
db.run("INSERT INTO departments (name, budget) VALUES (?, ?);", ["Marketing", 200000]);

db.run("INSERT INTO employees (name, department_id, role, salary) VALUES (?, ?, ?, ?);", [
  "Alice Chen",
  1,
  "Staff Software Engineer",
  185000,
]);
db.run("INSERT INTO employees (name, department_id, role, salary) VALUES (?, ?, ?, ?);", [
  "Bob Kumar",
  1,
  "Senior Backend Engineer",
  160000,
]);
db.run("INSERT INTO employees (name, department_id, role, salary) VALUES (?, ?, ?, ?);", [
  "Carol Danvers",
  2,
  "Principal Product Designer",
  170000,
]);
db.run("INSERT INTO employees (name, department_id, role, salary) VALUES (?, ?, ?, ?);", [
  "David Miller",
  3,
  "Growth Marketer",
  120000,
]);

db.close();
console.log("Created examples/company.db successfully");
