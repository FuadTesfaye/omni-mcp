import { describe, it, expect } from "bun:test";
import { PostmanParser } from "../parser.js";
import { PostmanConverter } from "../converter.js";
import { PostmanAdapter } from "../index.js";

describe("PostmanParser", () => {
  const parser = new PostmanParser();

  const sampleCollection = {
    info: {
      name: "Customer API",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: [
      {
        name: "Customers",
        item: [
          {
            name: "List Customers",
            request: {
              method: "GET",
              url: {
                raw: "https://api.example.com/customers?status=active",
                path: ["customers"],
                query: [
                  { key: "status", value: "active", description: "Filter by status" },
                ],
              },
            },
          },
          {
            name: "Create Customer",
            request: {
              method: "POST",
              url: "https://api.example.com/customers",
              body: {
                mode: "raw",
                raw: JSON.stringify({ name: "Acme Corp", email: "info@acme.com" }),
              },
            },
          },
        ],
      },
      {
        name: "Orders",
        item: [
          {
            name: "Get Order",
            request: {
              method: "GET",
              url: {
                raw: "https://api.example.com/orders/:orderId",
                path: ["orders", ":orderId"],
                variable: [{ key: "orderId", description: "The order identifier" }],
              },
            },
          },
        ],
      },
    ],
  };

  it("parses and flattens nested Postman collection requests", () => {
    const { info, requests } = parser.parse(sampleCollection);

    expect(info.name).toBe("Customer API");
    expect(requests.length).toBe(3);

    const listReq = requests.find((r) => r.name === "List Customers");
    expect(listReq).toBeDefined();
    expect(listReq?.method).toBe("GET");
    expect(listReq?.group).toBe("Customer API/Customers");
    expect(listReq?.queryParams.length).toBe(1);

    const createReq = requests.find((r) => r.name === "Create Customer");
    expect(createReq).toBeDefined();
    expect(createReq?.bodySchema).toBeDefined();
    expect(createReq?.bodySchema?.properties).toBeDefined();

    const orderReq = requests.find((r) => r.name === "Get Order");
    expect(orderReq).toBeDefined();
    expect(orderReq?.pathVariables.length).toBe(1);
  });
});

describe("PostmanConverter", () => {
  const parser = new PostmanParser();
  const converter = new PostmanConverter();

  it("converts flattened requests to IntermediateToolDefinitions", () => {
    const { requests } = parser.parse({
      info: { name: "Billing", schema: "" },
      item: [
        {
          name: "Get Invoice",
          request: {
            method: "GET",
            url: {
              raw: "https://api.example.com/invoices/:id",
              variable: [{ key: "id", description: "Invoice ID" }],
            },
          },
        },
      ],
    });

    const tools = converter.convert(requests, "test-source");
    expect(tools.length).toBe(1);

    const tool = tools[0];
    expect(tool.name).toBe("get_invoice");
    expect(tool.execution.type).toBe("http");
    expect(tool.inputSchema.properties?.id).toBeDefined();
    expect(tool.inputSchema.required).toContain("id");
    expect(tool.risk.level).toBe("low");
  });
});

describe("PostmanAdapter", () => {
  const adapter = new PostmanAdapter();

  it("detects postman collections by content", async () => {
    const collectionContent = JSON.stringify({
      info: { schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
      item: [],
    });

    const tmpFile = `/tmp/test-postman-${Date.now()}.json`;
    await Bun.write(tmpFile, collectionContent);

    const result = await adapter.detect({ raw: tmpFile });
    expect(result.detected).toBe(true);
    expect(result.type).toBe("postman");
  });

  it("rejects non-postman targets", async () => {
    const result = await adapter.detect({ raw: "https://example.com/unknown.txt" });
    expect(result.detected).toBe(false);
  });
});
