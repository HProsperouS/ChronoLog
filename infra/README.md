# ChronoLog Insights — Lambda + Function URL (CDK)

Deploys a single Lambda with a **Function URL** (HTTPS). The OpenAI API key and a **proxy shared secret** are supplied at deploy time as CloudFormation parameters (not committed to git).

## Prerequisites

- AWS CLI configured (`aws configure` or SSO)
- Node 20+
- CDK bootstrap once per account/region:  
  `npx cdk bootstrap aws://ACCOUNT/ap-southeast-1`

## Install & deploy

```bash
cd infra
npm install
npx cdk synth
npx cdk deploy --parameters OpenAiApiKey=sk-... --parameters ProxySecret=your-long-random-secret
```

Copy the **Outputs** value `InsightsFunctionUrl`.

### ChronoLog backend (`backend/.env`)

After deploy, point the local API at Lambda:

```env
INSIGHTS_FUNCTION_URL=https://....lambda-url....on.aws/
INSIGHTS_PROXY_SECRET=<same value as CDK ProxySecret>
```

`POST /api/insights/generate` then forwards `DailyStats` to this URL and saves the response into `insights.json`.

### Subsequent deploys

CDK will remember parameters in `cdk.context.json` **only if** you use context — for `CfnParameter`, you may need to pass them again or use `--parameters` file. To avoid retyping, use AWS Console → CloudFormation → stack → **Update** and reuse stored values, or pass the same CLI flags again.

## Calling the function

`POST` to the Function URL with:

- Header: `Authorization: Bearer <ProxySecret>` (same value you passed as `ProxySecret`)
- Body (JSON). Insights are **English only** (no `locale` field).

```json
{
  "date": "2026-02-27",
  "stats": { "...": "DailyStats shape — see lambda/insights/types.ts" },
  "comparison": {
    "yesterday": { "...": "optional DailyStats" }
  }
}
```

Response `200`:

```json
{
  "insights": [
    {
      "type": "pattern",
      "title": "...",
      "description": "...",
      "icon": "Sparkles"
    }
  ]
}
```

Your **local ChronoLog backend** should attach `id`, `date`, and `created_at` before saving to `insights.json`.

---

## How to write / tune the prompt

All natural-language instructions live in **`lambda/insights/prompt.ts`**:

| Function | Purpose |
|----------|---------|
| `buildSystemPrompt()` | Role, **English-only** copy rules, JSON contract, allowed `icon` / `type` values, safety rules. |
| `buildUserPrompt(stats, { comparison })` | Formats numbers into readable blocks; add more blocks when you send richer data. |

**Practical workflow**

1. Change **user** prompt first (what data the model sees) — e.g. add weekly averages.
2. Adjust **system** prompt only when you need new output fields or stricter behavior.
3. Keep **`response_format: json_object`** and the `{"insights":[...]}` shape stable so the handler does not break.
4. After edits: `cd infra && npx cdk deploy ...` to roll out.

**Temperature** is set in `handler.ts` (`temperature: 0.55`). Lower = more deterministic; higher = more varied copy.

---

## Security notes

- Function URL auth is **NONE**; protection is the **Bearer** secret checked inside Lambda. Rotate `ProxySecret` and redeploy if it leaks.
- Prefer **short-lived tokens** or per-user auth later (API Gateway authorizer, Cognito, etc.).
- Do not commit `OpenAiApiKey` or `ProxySecret` to git.

---

## Destroy

```bash
npx cdk destroy
```
