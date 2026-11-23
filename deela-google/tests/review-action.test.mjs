import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const src = readFileSync(new URL("../site/app.js", import.meta.url), "utf8")
  .replace(/^import \{ createClient \} from [^\n]+\n/, "");

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toLowerCase();
    this.textContent = "";
    this.value = "";
    this.hidden = false;
    this.disabled = false;
    this.children = [];
    this.dataset = {};
    this.classList = { toggle() {}, add() {}, remove() {} };
  }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = [...nodes]; }
  addEventListener() {}
  focus() {}
}
function findButton(root, text) {
  if (root.tagName === "button" && root.textContent === text) return root;
  for (const child of root.children) {
    const found = findButton(child, text);
    if (found) return found;
  }
  return null;
}
function harness({ reviewReply = { ok: true }, requests } = {}) {
  const elements = new Map();
  const calls = [];
  const pending = requests ?? [{
    id: "11111111-1111-4111-8111-111111111111",
    user_id: "22222222-2222-4222-8222-222222222222",
    email: "test@example.invalid",
    platform: "ios", months: 1, created_at: "2026-11-24T00:00:00Z"
  }];
  const $ = id => {
    if (!elements.has(id)) elements.set(id, new FakeElement());
    return elements.get(id);
  };
  const ctx = vm.createContext({
    document: {
      getElementById: $,
      createElement: tag => new FakeElement(tag),
      querySelectorAll: () => [],
      addEventListener() {},
      removeEventListener() {},
      body: new FakeElement("body")
    },
    window: { scrollTo() {} },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    createClient: () => ({ storage: { from: () => ({}) } }),
    setTimeout: () => 1, clearTimeout() {},
    fetch: async (url, init = {}) => {
      const body = init.body ? JSON.parse(init.body) : null;
      calls.push({ url, body });
      let data, status = 200;
      if (url.endsWith("/api/owner/dashboard"))
        data = { members: [], requests: pending };
      else if (url.endsWith("/api/owner/requests/review")) {
        data = reviewReply;
        status = reviewReply.error ? 409 : 200;
        if (!reviewReply.error) pending.splice(0, 1);
      } else if (url.endsWith("/overview"))
        data = { subscribers: 1, active: 0, ios_apps: 0, android_apps: 0, private_files: 0 };
      else throw new Error("Unexpected URL " + url);
      return { ok: status < 400, status, json: async () => data };
    }
  });
  vm.runInContext(src, ctx, { filename: "app.js" });
  return { elements, calls, $, ctx };
}
test("reject button opens own dialog and posts rejected status", async () => {
  const h = harness();
  await vm.runInContext("loadMembers()", h.ctx);
  const reject = findButton(h.$("pendingRequests"), "رفض");
  assert.ok(reject, "Reject button must exist");
  const clicked = reject.onclick();
  assert.equal(h.$("ownerDialog").hidden, false, "In-app dialog must show");
  assert.equal(h.calls.filter(x => x.url.endsWith("/api/owner/requests/review")).length, 0);
  h.$("ownerDialogConfirm").onclick();
  await clicked;
  const req = h.calls.find(x => x.url.endsWith("/api/owner/requests/review"));
  assert.equal(req?.body?.decision, "rejected");
  assert.equal(req?.body?.id, "11111111-1111-4111-8111-111111111111");
  assert.equal(h.$("ownerDialog").hidden, true);
  assert.equal(h.$("pendingRequests").children[0].textContent, "لا توجد طلبات انتظار حالياً.");
});
test("cancel rejects no request and closes dialog", async () => {
  const h = harness();
  await vm.runInContext("loadMembers()", h.ctx);
  const rejected = findButton(h.$("pendingRequests"), "رفض").onclick();
  h.$("ownerDialogCancel").onclick();
  await rejected;
  assert.equal(h.calls.filter(x => x.url.endsWith("/api/owner/requests/review")).length, 0);
  assert.equal(h.$("ownerDialog").hidden, true);
});
test("failed rejection keeps request and surfaces backend error", async () => {
  const h = harness({ reviewReply: { error: "الطلب غير موجود أو تمت مراجعته" } });
  await vm.runInContext("loadMembers()", h.ctx);
  const clicked = findButton(h.$("pendingRequests"), "رفض").onclick();
  h.$("ownerDialogConfirm").onclick();
  await clicked;
  assert.equal(h.$("pendingRequests").children.length, 1, "Request must remain on error");
  assert.equal(h.$("feedback").textContent, "الطلب غير موجود أو تمت مراجعته");
});
