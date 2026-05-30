import { checkBudget } from "./lib/budget-gate.mjs";
const banana = await checkBudget("banana");
const market = await checkBudget("marketing_skills");
console.log(JSON.stringify({ banana, market }, null, 2));
