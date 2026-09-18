import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { DatabaseAdapter } from "../index.js";
import { DatabaseIntrospector } from "../introspector.js";
import { DatabaseToolSynthesizer } from "../synthesizer.js";
import { DatabaseExecutor } from "../executor.js";
import { DEFAULT_DATABASE_POLICY } from "../policy.js";
import { unlinkSync } from "fs";

const TEST_DB_PATH = `/tmp/test-omni-mcp-${Date.now()}.db`;

describe("DatabaseAdapter with SQLite", () => {
  beforeAll(() => {
    const db = new Database(TEST_DB_PATH);
    db.run(`
      CREATE TABLE customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db.run(`
      CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        total_amount REAL NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      );
    `);

    // Insert sample data
    db.run(`INSERT INTO customers (name, email) VALUES ('Alice Smith', 'alice@example.com')`);
    db.run(`INSERT INTO customers (name, email) VALUES ('Bob Jones', 'bob@example.com')`);
    db.run(`INSERT INTO orders (customer_id, total_amount, status) VALUES (1, 149.99, 'completed')`);
    db.run(`INSERT INTO orders (customer_id, total_amount, status) VALUES (1, 29.50, 'pending')`);
    db.run(`INSERT INTO orders (customer_id, total_amount, status) VALUES (2, 89.00, 'completed')`);
    db.close();
  });

  afterAll(() => {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {
      // Ignore
    }
  });

  it("introspects tables, columns, primary keys, and foreign keys", () => {
    const introspector = new DatabaseIntrospector();
    const schema = introspector.introspectSqlite(TEST_DB_PATH, DEFAULT_DATABASE_POLICY);

    expect(schema.databaseType).toBe("sqlite");
    expect(schema.tables.length).toBe(2);

    const customersTable = schema.tables.find((t) => t.name === "customers");
    expect(customersTable).toBeDefined();
    expect(customersTable?.primaryKeys).toEqual(["id"]);

    const ordersTable = schema.tables.find((t) => t.name === "orders");
    expect(ordersTable).toBeDefined();

    expect(schema.relationships.length).toBe(1);
    expect(schema.relationships[0].sourceTable).toBe("orders");
    expect(schema.relationships[0].sourceColumn).toBe("customer_id");
    expect(schema.relationships[0].targetTable).toBe("customers");
    expect(schema.relationships[0].targetColumn).toBe("id");
  });

  it("synthesizes safe semantic get, search, and relationship tools", () => {
    const introspector = new DatabaseIntrospector();
    const synthesizer = new DatabaseToolSynthesizer();

    const schema = introspector.introspectSqlite(TEST_DB_PATH, DEFAULT_DATABASE_POLICY);
    const tools = synthesizer.synthesize(schema, TEST_DB_PATH, DEFAULT_DATABASE_POLICY);

    // Should generate: get_customers, search_customers, get_orders, search_orders, get_customers_orders
    expect(tools.length).toBe(5);

    const getCustomerTool = tools.find((t) => t.name === "get_customers");
    expect(getCustomerTool).toBeDefined();
    expect(getCustomerTool?.inputSchema.properties?.id).toBeDefined();
    expect(getCustomerTool?.risk.level).toBe("low");

    const searchOrdersTool = tools.find((t) => t.name === "search_orders");
    expect(searchOrdersTool).toBeDefined();
    expect(searchOrdersTool?.inputSchema.properties?.limit).toBeDefined();

    const relTool = tools.find((t) => t.name === "get_customers_orders");
    expect(relTool).toBeDefined();
    expect(relTool?.description).toContain("orders associated with customers");
  });

  it("executes get and relationship queries safely with parameterized values", async () => {
    const executor = new DatabaseExecutor();
    const context = { requestId: "req-1" };

    // 1. Test get_customers
    const getRes = await executor.executeSqlite(
      TEST_DB_PATH,
      {
        operation: "get",
        table: "customers",
        primaryKeys: ["id"],
      },
      { id: 1 },
      context
    );

    expect(getRes.success).toBe(true);
    const customer = getRes.data as { name: string; email: string };
    expect(customer.name).toBe("Alice Smith");

    // 2. Test get_customers_orders (relationship)
    const relRes = await executor.executeSqlite(
      TEST_DB_PATH,
      {
        operation: "relationship",
        sourceTable: "orders",
        sourceColumn: "customer_id",
        targetTable: "customers",
        targetColumn: "id",
      },
      { id: 1 },
      context
    );

    expect(relRes.success).toBe(true);
    const orders = relRes.data as any[];
    expect(orders.length).toBe(2);
    expect(orders[0].total_amount).toBe(149.99);
  });

  it("detects database targets correctly", async () => {
    const adapter = new DatabaseAdapter();

    const sqliteRes = await adapter.detect({ raw: TEST_DB_PATH });
    expect(sqliteRes.detected).toBe(true);
    expect(sqliteRes.type).toBe("database-sqlite");

    const postgresRes = await adapter.detect({ raw: "postgres://user:pass@localhost:5432/db" });
    expect(postgresRes.detected).toBe(true);
    expect(postgresRes.type).toBe("database-postgres");
  });
});
