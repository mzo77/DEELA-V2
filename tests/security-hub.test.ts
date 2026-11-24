import { simulate } from "../services/deela-security-hub/simulation.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("synthetic simulator returns no network requests or real attacks", () => {
  const r = simulate({platform:"snapchat-demo",test_username:"test_1234",
    mfa_enabled:false,rate_limit_enabled:false,lockout_enabled:false});
  assert("ok" in r && r.ok === true,"valid input should succeed");
  assert(r.kind === "synthetic_auth_simulation","must label synthetic simulation");
  assert(r.real_requests === 0 && r.attacks_executed === 0,"must perform no external requests/attacks");
  assert(r.checks?.two_factor === "simulated_disabled","2FA flag must be reported accurately");
  assert(r.recommendations?.length === 4,"disabled controls should be recommended");
});

Deno.test("simulation with safeguards reports modelled protection, not verified security", () => {
  const r=simulate({platform:"deela-demo",test_username:"test_deela",
    mfa_enabled:true,rate_limit_enabled:true,lockout_enabled:true});
  assert("ok" in r && r.ok===true && r.checks?.password_guessing_protection==="simulated_protected","synthetic control expected");
  assert(r.checks?.two_factor==="simulated_required","should show configured 2FA");
  assert(r.recommendations?.length===1,"recommendations limited to non-secret guidance");
  assert(r.notice?.includes("افتراضية"),"must disclose hypothetical result");
});

Deno.test("rejects external usernames, third party platform and oversized demo names", () => {
  for (const input of [
    {platform:"snapchat-demo",test_username:"realaccount"},
    {platform:"other-external-service",test_username:"test_1234"},
    {platform:"deela-demo",test_username:"test_"+"x".repeat(40)},
    {platform:"deela-demo",test_username:"test_abc@example.com"},
    {platform:"deela-demo",test_username:"test_abc/../../"},
  ]) {
    const result=simulate(input);
    assert("error" in result && typeof result.error==="string" && result.error.length>0,"invalid input must be rejected");
  }
});

Deno.test("string booleans do not turn on protective controls", () => {
  const r=simulate({platform:"deela-demo",test_username:"test_abc",
    mfa_enabled:"true",rate_limit_enabled:"true",lockout_enabled:"true"});
  assert("ok" in r && r.ok===true,"valid synthetic username");
  assert(r.checks?.two_factor==="simulated_disabled","only boolean true is enabled");
  assert(r.checks?.password_guessing_protection==="simulated_needs_improvement","no implicit conversion");
});
