// Loophole Catalog — 48 sourced US tax strategies, inlined for the brand site.
// Educational content only — not tax advice. Each entry cites a real IRS source.
// Generated from businesses/life-loophole/loophole-catalog/catalog.json.

export interface LoopholeEntry {
  id: string;
  name: string;
  personas: string[];
  summary: string;
  explanation: string;
  eligibility: string;
  estimated_impact: string;
  complexity: string;
  risk_level: string;
  action_steps: string;
  source: string;
  current_as_of: string;
  professional_needed: boolean;
}

export const CATALOG: LoopholeEntry[] = [
  {
    "id": "hsa-contribution",
    "name": "Health Savings Account (HSA) contribution",
    "personas": [
      "individuals-families",
      "freelancers-creators"
    ],
    "summary": "If you have a qualifying high-deductible health plan, money you put in an HSA is deducted from your taxable income.",
    "explanation": "An HSA is the only account that is tax-advantaged three ways: contributions reduce your taxable income, the balance grows tax-free, and withdrawals for qualified medical expenses are tax-free. It is available only to people covered by an IRS-qualifying high-deductible health plan. Unspent money rolls over year to year and the account is yours to keep if you change jobs or plans.",
    "eligibility": "Must be covered by an HSA-qualifying high-deductible health plan, not enrolled in Medicare, and not claimed as a dependent on someone else's return.",
    "estimated_impact": "Reducing taxable income by the annual contribution limit could lower a federal tax bill by roughly a few hundred to a couple thousand dollars depending on your bracket.",
    "complexity": "low",
    "risk_level": "low",
    "action_steps": "Confirm your health plan qualifies as an HSA-eligible high-deductible plan, open an HSA with a bank or brokerage, contribute up to the annual limit before the filing deadline, and report the contribution on Form 8889.",
    "source": "IRS Publication 969; Form 8889; IRC Section 223",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "traditional-ira-deduction",
    "name": "Traditional IRA deduction",
    "personas": [
      "individuals-families",
      "freelancers-creators"
    ],
    "summary": "Contributions to a traditional IRA may be deducted from your taxable income, lowering this year's tax bill.",
    "explanation": "A traditional IRA is a personal retirement account. If you qualify, the amount you contribute is subtracted from your taxable income for the year, and the money grows tax-deferred until you withdraw it in retirement. Whether the contribution is fully deductible, partly deductible, or not deductible depends on your income and whether you (or a spouse) are covered by a workplace retirement plan. People age 50 and over may make an additional catch-up contribution.",
    "eligibility": "Must have earned income (wages or self-employment income) for the year. Deductibility phases out at higher incomes if you or your spouse are covered by a workplace retirement plan; income thresholds change annually and must be verified against current IRS guidance.",
    "estimated_impact": "Deducting a full annual contribution could reduce a federal tax bill by roughly a few hundred to a couple thousand dollars, scaling with your marginal tax bracket.",
    "complexity": "low",
    "risk_level": "low",
    "action_steps": "Open a traditional IRA with a brokerage, contribute up to the annual limit before the filing deadline, confirm your deduction eligibility given your income and workplace-plan coverage, and report the deduction on Schedule 1 of Form 1040.",
    "source": "IRS Publication 590-A; IRC Section 219; Schedule 1 (Form 1040)",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "roth-ira-contribution",
    "name": "Roth IRA contribution",
    "personas": [
      "individuals-families",
      "freelancers-creators"
    ],
    "summary": "A Roth IRA is funded with after-tax money, but qualified withdrawals in retirement — including all the growth — come out completely tax-free.",
    "explanation": "A Roth IRA does not give you a deduction today. Instead it locks in tax-free treatment for the future: the account grows with no tax, and qualified withdrawals in retirement are entirely tax-free. It is especially valuable if you expect to be in the same or a higher tax bracket later, and contributions (though not earnings) can generally be withdrawn at any time without tax or penalty. Eligibility to contribute directly phases out above certain income levels.",
    "eligibility": "Must have earned income. The ability to contribute directly phases out above income limits that change annually and must be verified against current IRS guidance; higher earners may instead use the backdoor Roth approach (see separate entry).",
    "estimated_impact": "There is no current-year deduction, but decades of tax-free growth could be worth thousands to tens of thousands of dollars in avoided future tax depending on contributions and time horizon.",
    "complexity": "low",
    "risk_level": "low",
    "action_steps": "Confirm your income is within the direct-contribution range, open a Roth IRA, and contribute up to the annual limit before the filing deadline. No tax form is needed for a standard contribution, but keep records of basis.",
    "source": "IRS Publication 590-A; IRC Section 408A",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "employer-401k-contribution",
    "name": "Workplace 401(k) / 403(b) contribution",
    "personas": [
      "individuals-families"
    ],
    "summary": "Pre-tax contributions to a workplace 401(k) or 403(b) come straight off your taxable wages, and an employer match is additional compensation you would otherwise leave on the table.",
    "explanation": "A 401(k) (or 403(b) for nonprofit and public employees) lets you direct part of your paycheck into a retirement account before income tax is calculated, lowering your taxable wages for the year. Many employers also match a portion of what you contribute — that match is essentially free compensation. Plans typically also offer a Roth 401(k) option, which is funded with after-tax dollars for tax-free qualified withdrawals later. Workers age 50 and over may make additional catch-up contributions.",
    "eligibility": "Must be an employee whose employer offers a 401(k), 403(b), or similar plan. Contribution limits and catch-up amounts change annually and must be verified against current IRS guidance.",
    "estimated_impact": "Contributing pre-tax could lower a federal tax bill by roughly several hundred to several thousand dollars depending on the amount and bracket; capturing a full employer match could add a meaningful percentage of salary on top of that.",
    "complexity": "low",
    "risk_level": "low",
    "action_steps": "Enroll through your employer's benefits portal, set a contribution rate at least high enough to capture the full employer match, and choose between pre-tax and Roth treatment based on your situation.",
    "source": "IRC Section 401(k); IRS Publication 525; IRS Topic No. 424",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "savers-credit",
    "name": "Saver's Credit (Retirement Savings Contributions Credit)",
    "personas": [
      "individuals-families",
      "freelancers-creators"
    ],
    "summary": "Lower- and moderate-income savers can get a tax credit just for contributing to a retirement account — on top of any deduction.",
    "explanation": "The Saver's Credit rewards eligible taxpayers for putting money into an IRA or workplace retirement plan. It is a credit, meaning it reduces tax owed dollar for dollar, and it stacks on top of the deduction a traditional IRA or 401(k) contribution may already provide. The credit is a percentage of what you contributed, with the percentage depending on your income — lower incomes get a higher rate. It is non-refundable, so it can reduce tax owed but does not generate a refund beyond that.",
    "eligibility": "Must be age 18 or older, not a full-time student, and not claimed as a dependent. Adjusted gross income must fall below limits that depend on filing status and change annually; verify against current IRS guidance.",
    "estimated_impact": "Depending on income and contribution size, the credit could be worth roughly a few hundred dollars off your tax bill.",
    "complexity": "low",
    "risk_level": "low",
    "action_steps": "Make an eligible retirement contribution during the year, check your adjusted gross income against the current limits, and claim the credit on Form 8880.",
    "source": "IRC Section 25B; Form 8880; IRS Topic No. 610",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "child-tax-credit",
    "name": "Child Tax Credit",
    "personas": [
      "individuals-families"
    ],
    "summary": "Families with qualifying children can claim a per-child credit that directly reduces tax owed, with part of it potentially refundable.",
    "explanation": "The Child Tax Credit reduces your tax bill for each qualifying child under the age threshold. A portion may be refundable through the Additional Child Tax Credit, meaning families can receive value even if it exceeds the tax they owe. The credit amount and the income level at which it begins to phase out are set by law and have changed several times; the per-child amount, age limit, and phase-out thresholds must be verified against current IRS guidance for the tax year.",
    "eligibility": "Must have a qualifying child who meets the IRS relationship, age, residency, support, and Social Security number tests, and your income must be at or below the phase-out thresholds for your filing status.",
    "estimated_impact": "For families with children, the credit could be worth roughly a few hundred to a couple thousand dollars per qualifying child; verify the current per-child amount.",
    "complexity": "low",
    "risk_level": "low",
    "action_steps": "Confirm each child meets the qualifying-child tests, ensure each has a valid Social Security number, and claim the credit using Schedule 8812 with your Form 1040.",
    "source": "IRC Section 24; Schedule 8812 (Form 1040)",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "dependent-care-fsa",
    "name": "Dependent Care FSA / Child and Dependent Care Credit",
    "personas": [
      "individuals-families"
    ],
    "summary": "If you pay for childcare so you can work, you can shelter some of that cost from tax through a workplace Dependent Care FSA or by claiming the Child and Dependent Care Credit.",
    "explanation": "Working parents and caregivers have two distinct tools for care costs. A Dependent Care Flexible Spending Account (FSA), offered by some employers, lets you set aside pre-tax wages to pay for eligible care, lowering your taxable income. Separately, the Child and Dependent Care Credit gives a credit for a percentage of qualifying care expenses. The two interact — money run through an FSA generally cannot also be used for the credit — so a household usually coordinates them rather than double-counting. Annual FSA limits and the expense caps for the credit change and must be verified.",
    "eligibility": "Care must be for a qualifying child under the age limit or a dependent unable to care for themselves, and must enable you (and a spouse, if married filing jointly) to work or look for work. An FSA requires an employer that offers one.",
    "estimated_impact": "Between the pre-tax FSA savings and the credit, a working household with care costs could reduce its federal tax by roughly several hundred to a couple thousand dollars; exact figures depend on income and current limits.",
    "complexity": "medium",
    "risk_level": "low",
    "action_steps": "Enroll in your employer's Dependent Care FSA during open enrollment if available, keep receipts and the care provider's tax ID, and reconcile FSA use against the Child and Dependent Care Credit on Form 2441.",
    "source": "IRC Section 129; IRC Section 21; IRS Publication 503; Form 2441",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "529-plan",
    "name": "529 college savings plan",
    "personas": [
      "individuals-families"
    ],
    "summary": "A 529 plan grows free of federal tax, and many states give a deduction or credit for what you contribute.",
    "explanation": "A 529 plan is an education savings account. There is no federal deduction for contributions, but the money grows tax-free and withdrawals are tax-free when used for qualified education expenses. The real federal upside is decades of untaxed growth; the more immediate upside is at the state level, where many states offer a deduction or credit for residents who contribute to a plan. Qualified expenses extend beyond college to certain K-12 tuition and apprenticeship costs, and rules continue to evolve.",
    "eligibility": "Anyone can open a 529 for a designated beneficiary. State tax benefits, where they exist, generally require contributing to that state's plan and being a resident; rules vary by state and must be checked locally.",
    "estimated_impact": "State tax benefits could be worth roughly tens to a few hundred dollars a year depending on the state and contribution; the larger benefit is years of federally tax-free growth.",
    "complexity": "low",
    "risk_level": "low",
    "action_steps": "Choose a 529 plan (often your home state's, to capture any state tax break), open the account for the beneficiary, contribute, and keep records tying withdrawals to qualified education expenses.",
    "source": "IRC Section 529; IRS Publication 970",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "student-loan-interest-deduction",
    "name": "Student loan interest deduction",
    "personas": [
      "individuals-families",
      "freelancers-creators"
    ],
    "summary": "Interest you paid on a qualified student loan can be deducted even if you do not itemize.",
    "explanation": "If you paid interest on a loan taken out solely for qualified higher-education expenses, you may deduct it as an adjustment to income. This is an above-the-line deduction, so you get it whether or not you itemize. There is an annual cap on the deductible amount, and the deduction phases out at higher incomes. Your loan servicer reports the interest you paid on Form 1098-E.",
    "eligibility": "The loan must have been for qualified education expenses for you, your spouse, or a dependent. You must be legally obligated to pay the interest, and your income must be below the phase-out thresholds, which change annually and must be verified.",
    "estimated_impact": "Deducting eligible interest could lower a federal tax bill by roughly a few dozen to a few hundred dollars depending on interest paid and bracket.",
    "complexity": "low",
    "risk_level": "low",
    "action_steps": "Collect Form 1098-E from your loan servicer, confirm your income is within the phase-out range, and claim the deduction on Schedule 1 of Form 1040.",
    "source": "IRC Section 221; IRS Publication 970; Schedule 1 (Form 1040)",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "education-credits",
    "name": "Education tax credits (American Opportunity & Lifetime Learning)",
    "personas": [
      "individuals-families",
      "freelancers-creators"
    ],
    "summary": "Tuition and related costs can translate into a tax credit through either the American Opportunity Credit or the Lifetime Learning Credit.",
    "explanation": "Two credits reward spending on higher education. The American Opportunity Tax Credit applies to the first several years of undergraduate study, is partly refundable, and is generally the more generous of the two. The Lifetime Learning Credit is broader — it covers undergraduate, graduate, and job-skill courses with no year limit — but is non-refundable and smaller. You cannot claim both for the same student in the same year, and both phase out at higher incomes. The school reports qualifying tuition on Form 1098-T.",
    "eligibility": "Must have paid qualified tuition and related expenses for an eligible student at an eligible institution, and income must be under the phase-out limits, which change annually. The American Opportunity Credit has additional rules on enrollment level and prior years claimed.",
    "estimated_impact": "Depending on which credit applies and how much qualifying tuition was paid, the credit could be worth roughly several hundred to a couple thousand dollars.",
    "complexity": "medium",
    "risk_level": "low",
    "action_steps": "Get Form 1098-T from the school, determine which credit gives the better result for each student, and claim it on Form 8863 with your Form 1040.",
    "source": "IRC Section 25A; IRS Publication 970; Form 8863",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "earned-income-tax-credit",
    "name": "Earned Income Tax Credit (EITC)",
    "personas": [
      "individuals-families",
      "freelancers-creators"
    ],
    "summary": "Working people with low to moderate income can claim a refundable credit that can produce a refund larger than the tax they paid.",
    "explanation": "The EITC is a refundable credit for people who work but earn modest incomes. Because it is refundable, it can result in money back even if you owed no tax. The amount depends heavily on earned income, filing status, and the number of qualifying children, and it is one of the most valuable credits available to lower-income households. It is also one the IRS scrutinizes closely, mainly because the qualifying-child rules are easy to get wrong, so accuracy matters.",
    "eligibility": "Must have earned income from work or self-employment within the income limits, a valid Social Security number, and meet investment-income and filing-status rules. Qualifying-child tests apply if claiming with children; income limits change annually and must be verified.",
    "estimated_impact": "Depending on income and number of children, the credit could be worth roughly a few hundred to several thousand dollars, often as a refund.",
    "complexity": "medium",
    "risk_level": "medium",
    "action_steps": "Check eligibility with the IRS EITC Assistant, attach Schedule EIC if claiming qualifying children, and claim the credit on Form 1040. Free filing help is available through IRS VITA sites for those who qualify.",
    "source": "IRC Section 32; IRS Publication 596; Schedule EIC (Form 1040)",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "backdoor-roth",
    "name": "Backdoor Roth IRA",
    "personas": [
      "individuals-families",
      "freelancers-creators"
    ],
    "summary": "Higher earners who are barred from contributing to a Roth directly can fund a Roth indirectly by contributing to a traditional IRA and converting it.",
    "explanation": "Roth IRA contributions are off-limits above certain incomes, but there is no income limit on converting a traditional IRA to a Roth. The backdoor approach uses that asymmetry: you make a non-deductible contribution to a traditional IRA, then convert it to a Roth. The catch is the pro-rata rule — if you hold other pre-tax IRA balances, the conversion is taxed proportionally across all of them, which can make the move much less efficient or trigger unexpected tax. It must be reported correctly on Form 8606. Because the mechanics are error-prone, this is a strategy to execute carefully and ideally with professional guidance.",
    "eligibility": "Must have earned income. Works cleanest for people who have little or no existing pre-tax (deductible) IRA balance, because of the pro-rata rule. The strategy is most relevant to those whose income exceeds the direct Roth contribution limits.",
    "estimated_impact": "No current-year deduction; the value is future tax-free growth, which over time could be worth thousands to tens of thousands of dollars in avoided tax.",
    "complexity": "high",
    "risk_level": "medium",
    "action_steps": "Review the pro-rata rule against your existing IRA balances, make a non-deductible traditional IRA contribution, convert it to a Roth, and report both steps on Form 8606. Confirm the approach with a tax professional before acting.",
    "source": "IRS Publication 590-A; IRC Section 408A; Form 8606",
    "current_as_of": "2026",
    "professional_needed": true
  },
  {
    "id": "home-office-deduction",
    "name": "Home office deduction",
    "personas": [
      "freelancers-creators"
    ],
    "summary": "Self-employed people who use part of their home regularly and exclusively for business can deduct a share of home costs.",
    "explanation": "If you run a business and use an area of your home regularly and exclusively for that work, you can deduct expenses tied to that space. There are two methods: a simplified method that multiplies the office square footage by a set rate, and the regular method that allocates actual costs like rent, mortgage interest, utilities, and insurance by the percentage of the home used for business. Note that employees working from home generally cannot take this deduction under current law — it is for the self-employed. The 'exclusively' requirement is strict and is where many claims fail.",
    "eligibility": "Must be self-employed and use a specific part of the home regularly and exclusively as a principal place of business or for meeting clients. The space cannot double as personal living area.",
    "estimated_impact": "Depending on home costs and the office's share of the home, the deduction could lower taxable income by roughly several hundred to a few thousand dollars.",
    "complexity": "medium",
    "risk_level": "medium",
    "action_steps": "Measure the exclusive-use business space, choose the simplified or regular method, keep records of home expenses, and report the deduction on Form 8829 (regular method) or directly on Schedule C (simplified method).",
    "source": "IRC Section 280A; IRS Publication 587; Form 8829",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "schedule-c-business-deductions",
    "name": "Schedule C ordinary and necessary business deductions",
    "personas": [
      "freelancers-creators"
    ],
    "summary": "Self-employed people can deduct the ordinary and necessary expenses of running their business, reducing both income tax and self-employment tax.",
    "explanation": "The core deduction for any freelancer or sole proprietor is the cost of doing business. The tax code allows a deduction for expenses that are 'ordinary and necessary' for your trade — software subscriptions, supplies, professional fees, advertising, business insurance, a business phone line, training, and more. These deductions reduce your net profit, which lowers both income tax and self-employment tax, making them especially valuable. The discipline that matters is recordkeeping: keep receipts, separate business and personal spending, and only deduct the business-use portion of mixed expenses.",
    "eligibility": "Must be carrying on a trade or business as a sole proprietor or single-member LLC. Expenses must be ordinary and necessary for that business and not personal in nature.",
    "estimated_impact": "Because business deductions cut both income tax and self-employment tax, each dollar deducted could save roughly 25 to 50 cents depending on bracket and the self-employment tax rate.",
    "complexity": "medium",
    "risk_level": "medium",
    "action_steps": "Open a dedicated business bank account, track expenses throughout the year, keep receipts and documentation, deduct only the business-use share of mixed costs, and report expenses on Schedule C.",
    "source": "IRC Section 162; Schedule C (Form 1040); IRS Publication 334",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "qbi-deduction",
    "name": "Qualified Business Income (QBI) deduction (Section 199A)",
    "personas": [
      "freelancers-creators"
    ],
    "summary": "Owners of pass-through businesses may deduct a portion of their qualified business income — up to roughly one-fifth of it — on top of ordinary business deductions.",
    "explanation": "Section 199A lets eligible owners of pass-through businesses (sole proprietorships, partnerships, S-corps, many LLCs) deduct a percentage of their qualified business income. It is a deduction you take in addition to your regular business expense deductions, and it does not require itemizing. Above certain income thresholds the rules get complex: the deduction can be limited by wages paid and property held, and 'specified service' businesses (such as consulting, health, law, and the performing arts) face an additional phase-out. Because eligibility and the limitations are intricate, careful calculation is essential.",
    "eligibility": "Must have qualified business income from a pass-through business. Below the income thresholds the deduction is broadly available; above them, wage/property limits and the specified-service-business rules apply. Thresholds change annually and must be verified.",
    "estimated_impact": "Where it applies fully, the deduction could be worth a meaningful percentage of business income — for many owners, hundreds to several thousand dollars of tax savings depending on profit and bracket.",
    "complexity": "high",
    "risk_level": "medium",
    "action_steps": "Determine whether your income is below or above the thresholds, identify whether your business is a specified service trade, calculate the deduction on Form 8995 or 8995-A, and have a tax professional confirm it if your income is in or above the phase-out range.",
    "source": "IRC Section 199A; Form 8995 / Form 8995-A; IRS instructions for Form 8995",
    "current_as_of": "2026",
    "professional_needed": true
  },
  {
    "id": "solo-401k",
    "name": "Solo 401(k) for the self-employed",
    "personas": [
      "freelancers-creators"
    ],
    "summary": "A self-employed person with no employees can contribute to a one-participant 401(k) both as the employee and as the employer, allowing large tax-advantaged savings.",
    "explanation": "A Solo 401(k), or one-participant 401(k), is a retirement plan for a business owner with no employees other than a spouse. Its advantage is that you contribute in two capacities — as the employee (an elective deferral) and as the employer (a profit-sharing contribution) — so the total you can shelter is much higher than with a standard IRA. It can be set up as traditional (pre-tax) or Roth on the deferral side. The contribution math for the self-employed is non-trivial and there are setup and sometimes filing requirements, so it is best established with professional help.",
    "eligibility": "Must have self-employment income and no full-time common-law employees other than a spouse. Contribution limits and the deadlines for establishing the plan and contributing change annually and must be verified.",
    "estimated_impact": "Because both employee and employer contributions are allowed, a profitable solo business could shelter a large share of income, potentially saving thousands of dollars in tax in a single year.",
    "complexity": "high",
    "risk_level": "low",
    "action_steps": "Open a Solo 401(k) with a brokerage before the applicable deadline, calculate the allowable employee and employer contributions for your net self-employment income, contribute, and watch for any annual plan filing requirements. Confirm the contribution calculation with a professional.",
    "source": "IRC Section 401(k); IRS Publication 560; IRS 'One-Participant 401(k) Plans'",
    "current_as_of": "2026",
    "professional_needed": true
  },
  {
    "id": "sep-ira",
    "name": "SEP-IRA for the self-employed",
    "personas": [
      "freelancers-creators"
    ],
    "summary": "A SEP-IRA lets a self-employed person make a tax-deductible retirement contribution based on a percentage of business income, with very little paperwork.",
    "explanation": "A Simplified Employee Pension (SEP) IRA is a low-administration retirement plan well suited to freelancers and small operators. The self-employed owner can contribute up to a set percentage of net self-employment income, and the contribution is deductible. It is simpler to run than a Solo 401(k) and can often be set up and funded as late as the tax filing deadline, including extensions. The trade-off is less flexibility: there is no separate employee deferral or Roth option, and if the business has employees the owner must generally fund their accounts proportionally too.",
    "eligibility": "Must have self-employment income. If the business has eligible employees, the owner must generally contribute the same percentage for them. Contribution percentage caps and dollar limits change annually and must be verified.",
    "estimated_impact": "Contributing a percentage of net business income could reduce taxable income by hundreds to several thousand dollars depending on profit and bracket.",
    "complexity": "medium",
    "risk_level": "low",
    "action_steps": "Adopt a SEP plan (often using Form 5305-SEP), open a SEP-IRA with a brokerage, calculate the allowable contribution from net self-employment income, and contribute by the filing deadline including extensions.",
    "source": "IRC Section 408(k); IRS Publication 560; Form 5305-SEP",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "self-employment-tax-deduction",
    "name": "Deduction for half of self-employment tax",
    "personas": [
      "freelancers-creators"
    ],
    "summary": "Self-employed people can deduct the employer-equivalent half of their self-employment tax from their income.",
    "explanation": "Self-employed people pay self-employment tax to cover Social Security and Medicare — effectively both the employee and the employer share, since they are both. To keep this fair relative to employees, the tax code lets you deduct the employer-equivalent half of that self-employment tax as an adjustment to income. It is an above-the-line deduction, so you get it whether or not you itemize, and it is calculated automatically as part of Schedule SE. It does not reduce the self-employment tax itself, but it does reduce your income tax.",
    "eligibility": "Must have net self-employment earnings that are subject to self-employment tax for the year.",
    "estimated_impact": "Deducting roughly half of the self-employment tax could lower income tax by a few percent of net self-employment earnings, depending on bracket.",
    "complexity": "low",
    "risk_level": "low",
    "action_steps": "Calculate self-employment tax on Schedule SE; the deductible portion flows automatically to Schedule 1 of Form 1040. Most tax software handles this, but confirm it appears.",
    "source": "IRC Section 164(f); Schedule SE (Form 1040); Schedule 1 (Form 1040)",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "self-employed-health-insurance-deduction",
    "name": "Self-employed health insurance deduction",
    "personas": [
      "freelancers-creators"
    ],
    "summary": "Self-employed people can deduct premiums paid for medical, dental, and qualifying long-term care insurance for themselves and their family.",
    "explanation": "If you are self-employed and not eligible for coverage through an employer (yours or a spouse's), you can deduct the premiums you pay for health, dental, and qualifying long-term care insurance for yourself, your spouse, and dependents. This is an above-the-line deduction, so you do not need to itemize. The deduction is limited to your net self-employment profit and cannot create a loss. There are interactions with the Premium Tax Credit for those who buy coverage on the marketplace, which can make the calculation circular and tricky.",
    "eligibility": "Must be self-employed with a net profit, and not eligible to participate in a subsidized health plan through your own or a spouse's employer. The deduction cannot exceed your net self-employment income.",
    "estimated_impact": "Deducting a year of premiums could reduce taxable income by anywhere from a few hundred to several thousand dollars depending on coverage and family size.",
    "complexity": "medium",
    "risk_level": "low",
    "action_steps": "Total your eligible premiums for the year, confirm you were not eligible for employer-subsidized coverage, account for any marketplace Premium Tax Credit interaction, and claim the deduction on Schedule 1 of Form 1040.",
    "source": "IRC Section 162(l); IRS Publication 974; Schedule 1 (Form 1040)",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "business-mileage-deduction",
    "name": "Business mileage / vehicle deduction",
    "personas": [
      "freelancers-creators"
    ],
    "summary": "Self-employed people can deduct the cost of driving for business, either with the IRS standard mileage rate or by tracking actual vehicle expenses.",
    "explanation": "When you use a vehicle for business, that use is deductible. There are two methods: the standard mileage rate, where you multiply business miles by the IRS rate for the year, or the actual expense method, where you deduct the business-use share of gas, maintenance, insurance, depreciation, and more. Commuting between home and a regular workplace does not count — only business travel does. The make-or-break factor is contemporaneous records: a mileage log showing date, destination, purpose, and miles. The standard rate changes every year and must be verified.",
    "eligibility": "Must be self-employed and use a vehicle for legitimate business travel (not personal commuting). Choosing the actual expense method in the first year a vehicle is in service affects which methods you may use later.",
    "estimated_impact": "Depending on annual business miles, the deduction could reduce taxable income by a few hundred to several thousand dollars; it also lowers self-employment tax.",
    "complexity": "low",
    "risk_level": "medium",
    "action_steps": "Keep a contemporaneous mileage log (or use a tracking app), decide between the standard mileage rate and actual expenses, verify the current-year standard rate with the IRS, and report the deduction on Schedule C.",
    "source": "IRC Section 162; IRS Publication 463; Schedule C (Form 1040)",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "quarterly-estimated-taxes",
    "name": "Quarterly estimated tax payments",
    "personas": [
      "freelancers-creators"
    ],
    "summary": "Paying estimated taxes on time throughout the year keeps self-employed people from owing an underpayment penalty at filing.",
    "explanation": "This is less a way to save tax than a way to avoid losing money to a penalty. People without withholding — freelancers, creators, and others with self-employment or investment income — are generally required to pay tax in four installments across the year. Fall short and the IRS adds an underpayment penalty, effectively interest on the tax you paid late. 'Safe harbor' rules let you avoid the penalty by paying at least a set percentage of last year's tax (a higher percentage for higher earners) or a set percentage of the current year's tax. Planning around the safe harbor turns an unpredictable penalty into a known, avoidable cost.",
    "eligibility": "Generally applies to anyone who expects to owe a meaningful amount of tax beyond what is withheld, including the self-employed. The specific dollar threshold and safe-harbor percentages are set by the IRS and should be verified for the year.",
    "estimated_impact": "Avoiding the underpayment penalty could save roughly tens to several hundred dollars depending on the size of the shortfall and the interest rate in effect.",
    "complexity": "medium",
    "risk_level": "low",
    "action_steps": "Estimate your annual tax, divide it into four payments, use a safe-harbor target so you are not penalized, and pay each quarter by the IRS deadline using Form 1040-ES or IRS Direct Pay.",
    "source": "IRC Section 6654; Form 1040-ES; IRS Publication 505",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "s-corp-election",
    "name": "S-corporation election for a profitable business",
    "personas": [
      "freelancers-creators"
    ],
    "summary": "A consistently profitable self-employed business may cut self-employment tax by electing S-corporation status and splitting income into a reasonable salary plus distributions.",
    "explanation": "A sole proprietor pays self-employment tax on all net business profit. An S-corporation election changes that: the owner becomes an employee who must be paid a 'reasonable salary' subject to payroll taxes, while remaining profit can be taken as distributions that are not subject to self-employment tax. For a business with healthy, stable profit, that split can reduce total payroll/self-employment tax. The trade-offs are real — running payroll, extra tax filings, accounting costs, and state fees — and the salary must genuinely be reasonable for the work; paying an artificially low salary to dodge tax is exactly what the IRS challenges. The election is made on Form 2553. This decision should always be modeled with a tax professional.",
    "eligibility": "The business must be eligible to elect S-corp status (an LLC or corporation meeting the shareholder and stock requirements) and generally needs profit well above a reasonable salary for the savings to outweigh the added cost and administration.",
    "estimated_impact": "For a business profitable enough to benefit, the self-employment/payroll tax saving could range from roughly a thousand to several thousand dollars a year, net of added compliance costs — but it can also be negative for a business that is not profitable enough.",
    "complexity": "high",
    "risk_level": "medium",
    "action_steps": "Have a tax professional model the salary-versus-distribution split against your actual profit, confirm the business is eligible, file Form 2553 to elect S-corp status by the deadline, set up payroll, and pay yourself a defensible reasonable salary.",
    "source": "IRC Section 1362; Form 2553; IRS 'S Corporations'",
    "current_as_of": "2026",
    "professional_needed": true
  },
  {
    "id": "accountable-plan-reimbursements",
    "name": "Accountable plan reimbursements",
    "personas": [
      "small-business",
      "legal-entities"
    ],
    "summary": "A formal accountable plan lets a business reimburse owners and employees for business expenses tax-free, instead of those costs being buried in taxable wages.",
    "explanation": "When a business pays for an owner's or employee's business expenses, how it does so matters. Under an accountable plan, the business reimburses documented business expenses — home office use, mileage, cell phone, supplies, travel — and those reimbursements are a deduction for the business and tax-free to the person receiving them. Without such a plan, the same money is generally treated as taxable wages. This is especially important for S-corporation owner-employees, who generally cannot deduct unreimbursed employee business expenses on their personal return under current law — the accountable plan is the mechanism that makes those costs deductible at all. The plan requires a genuine business connection, timely substantiation with receipts, and the return of any excess advances.",
    "eligibility": "Available to any business with employees, including owner-employees of an S-corp or C-corp. The plan must meet the IRS requirements of business connection, substantiation, and return of amounts that exceed substantiated expenses.",
    "estimated_impact": "Routing legitimate business costs through an accountable plan rather than treating them as wages could save the income and payroll tax on those amounts — potentially hundreds to a few thousand dollars a year depending on expense volume.",
    "complexity": "medium",
    "risk_level": "low",
    "action_steps": "Adopt a written accountable plan, have owners and employees submit expense reports with receipts on a regular schedule, reimburse only substantiated business expenses, and record the reimbursements as a business expense rather than as payroll.",
    "source": "IRC Section 62(c); Treasury Regulation 1.62-2; IRS Publication 463",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "section-179-bonus-depreciation",
    "name": "Section 179 expensing and bonus depreciation",
    "personas": [
      "small-business",
      "legal-entities",
      "investors-high-earners"
    ],
    "summary": "Instead of deducting the cost of business equipment a little at a time over many years, these rules let a business write off much or all of it in the year it is placed in service.",
    "explanation": "Normally the cost of equipment, machinery, vehicles, and similar business property is recovered slowly through depreciation. Section 179 expensing and bonus depreciation are accelerators: Section 179 lets a business immediately deduct the cost of qualifying property up to an annual cap, and bonus depreciation allows an additional first-year deduction on qualifying property. Together they can turn a large capital purchase into a large current-year deduction. The details matter, so the current-year figures must be verified: Section 179 has dollar caps and a phase-out tied to total purchases, and it cannot be used to create a loss. Recent legislation made full first-year bonus depreciation a permanent feature rather than the temporary, phasing-down benefit it had been, though the rules on which property and acquisition dates qualify still need to be checked. Certain vehicles, particularly heavier SUVs, have their own special limits.",
    "eligibility": "Must be a business placing qualifying tangible property (or certain improvements) into service during the year and using it more than half the time for business. The annual dollar limits and the phase-out threshold are indexed and must be verified against current IRS guidance, along with the rules on which property and acquisition dates qualify for bonus depreciation.",
    "estimated_impact": "Accelerating the deduction on a significant equipment purchase could shift a sizable deduction into the current year, potentially saving hundreds to many thousands of dollars depending on the purchase size and bracket — though it borrows from future years' deductions rather than creating new ones.",
    "complexity": "medium",
    "risk_level": "medium",
    "action_steps": "Confirm the property qualifies and is placed in service during the tax year, verify the current Section 179 limits and bonus depreciation percentage, model whether accelerating the deduction helps given your income, and elect the treatment on Form 4562.",
    "source": "IRC Section 179; IRC Section 168(k); IRS Publication 946; Form 4562",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "augusta-rule",
    "name": "Augusta Rule (14-day home rental)",
    "personas": [
      "small-business",
      "legal-entities"
    ],
    "summary": "If you rent your home out for 14 days or fewer in a year, that rental income is completely tax-free — and a business owner can rent their own home to their business.",
    "explanation": "A quirk in the tax code says that if you rent a dwelling you use as a residence for fewer than 15 days in the year, you do not report the rental income at all — it is tax-free. It is nicknamed the 'Augusta Rule' after homeowners near the Masters golf tournament who rent their houses to attendees. Business owners can use it deliberately: the business rents the owner's home for a legitimate purpose — board meetings, planning sessions, company events — for up to 14 days a year. The business deducts the rent as a business expense and the owner receives it tax-free. The catch is that this only works if it is real: a genuine business purpose, a rental rate comparable to what a third party would charge for similar space, and contemporaneous documentation. Done sloppily, it is exactly the kind of arrangement the IRS disallows.",
    "eligibility": "Must own or rent a home used as a residence and rent it for no more than 14 days during the year. For the business-use version, there must be a legitimate business need for the space, a defensible market rate, and a real business — commonly an entity separate from the owner.",
    "estimated_impact": "Renting a home to one's business for up to 14 days at a defensible market rate could move a few thousand dollars from taxable business profit into tax-free personal income, with the exact figure depending on the local rate for comparable space.",
    "complexity": "medium",
    "risk_level": "medium",
    "action_steps": "Establish a genuine business reason to use the home, document a market rental rate with comparable quotes, keep minutes or an agenda showing what took place, have the business pay and deduct the rent, keep the total at 14 days or fewer, and do not report the personal rental income.",
    "source": "IRC Section 280A(g)",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "hiring-your-children",
    "name": "Hiring your children in a family business",
    "personas": [
      "small-business",
      "legal-entities"
    ],
    "summary": "Paying your own children for real work in your business shifts income to their much lower tax bracket and is deductible to the business.",
    "explanation": "If your child does legitimate work for your business, their wages are an ordinary business deduction like any other employee's, and the income lands on the child's tax return — where a standard deduction often shelters a meaningful amount of earned income from federal tax entirely. There is an extra wrinkle for the youngest workers: wages paid to a child under 18 by a parent's sole proprietorship, or by a partnership owned solely by the child's parents, are generally exempt from Social Security and Medicare taxes. That exemption does not apply if the business is a corporation or a partnership with non-parent partners. The non-negotiable conditions: the work must be real and age-appropriate, the pay must be reasonable for that work, and the child must be treated like any employee with proper payroll records.",
    "eligibility": "Must have a real business and give the child genuine, age-appropriate work at reasonable pay. The Social Security and Medicare exemption applies only when the business is a sole proprietorship or a partnership owned solely by the child's parents, and the child is under 18.",
    "estimated_impact": "Shifting a portion of business income to a child in a very low bracket, plus the possible payroll tax exemption, could save roughly hundreds to a few thousand dollars a year depending on wages paid and the business structure.",
    "complexity": "medium",
    "risk_level": "medium",
    "action_steps": "Assign real work, set reasonable pay, put the child on payroll with proper documentation and timekeeping, issue a Form W-2, and keep records showing the work was genuine. Confirm the payroll tax treatment for your specific entity type.",
    "source": "IRC Section 162; IRC Section 3121(b)(3); IRS 'Family Help'",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "simple-ira",
    "name": "SIMPLE IRA for small businesses",
    "personas": [
      "small-business"
    ],
    "summary": "A SIMPLE IRA is a low-cost retirement plan that lets a small business and its employees make tax-advantaged contributions with minimal administration.",
    "explanation": "A SIMPLE IRA (Savings Incentive Match Plan for Employees) is designed for small employers who want to offer a retirement plan without the cost and paperwork of a full 401(k). Employees contribute through salary deferral, which lowers their taxable wages, and the employer is required to contribute too — either a match for those who participate or a fixed contribution for all eligible employees. Employer contributions are deductible to the business. It is simpler and cheaper to run than a 401(k), which makes it attractive for very small teams, but the deferral limits are lower and there is a steep penalty for early withdrawals during the first couple of years.",
    "eligibility": "Generally available to businesses with 100 or fewer employees that do not maintain another employer retirement plan. Contribution limits and the employer contribution rules change annually and must be verified against current IRS guidance.",
    "estimated_impact": "Both employee deferrals and deductible employer contributions reduce taxable income; for an owner this could mean a few hundred to several thousand dollars of tax savings depending on contributions and bracket.",
    "complexity": "low",
    "risk_level": "low",
    "action_steps": "Adopt a SIMPLE IRA plan (often using Form 5304-SIMPLE or Form 5305-SIMPLE), notify employees, set up accounts, and make employee and employer contributions by the applicable deadlines.",
    "source": "IRC Section 408(p); IRS Publication 560; Form 5304-SIMPLE",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "defined-benefit-plan",
    "name": "Defined-benefit and cash-balance pension plans",
    "personas": [
      "small-business",
      "investors-high-earners"
    ],
    "summary": "A defined-benefit or cash-balance plan can let a high-earning business owner make very large, deductible retirement contributions — far above what IRAs or 401(k)s allow.",
    "explanation": "Most retirement plans cap what you can contribute at a relatively modest annual amount. A defined-benefit plan flips the logic: instead of setting a contribution, it sets a target retirement benefit, and an actuary calculates the contribution required to fund it — which, for an older, high-income owner, can be very large and fully deductible to the business. A cash-balance plan is a popular hybrid that behaves similarly but is easier for participants to understand. These plans are powerful for a consistently and highly profitable business with a small workforce, but they are the most complex retirement vehicle available: they require an actuary, carry annual funding obligations you cannot simply skip in a bad year, and if the business has employees they must generally be included. This is firmly professional territory.",
    "eligibility": "Best suited to a business with strong, stable, high profit and few employees, typically with an owner who wants to contribute well beyond defined-contribution limits. Requires an actuary and an ongoing funding commitment. Benefit and contribution limits change annually and must be verified.",
    "estimated_impact": "Because contributions are actuarially driven rather than capped at defined-contribution limits, a high-earning owner could potentially deduct tens of thousands to well over a hundred thousand dollars in a year — but the funding commitment is binding and the figures depend entirely on age, income, and plan design.",
    "complexity": "high",
    "risk_level": "low",
    "action_steps": "Engage an actuary or third-party administrator to model and design the plan, confirm the business can sustain the required annual funding, adopt the plan, and coordinate it with any existing retirement plan. This should not be done without professional help.",
    "source": "IRC Section 401(a); IRC Section 412; IRS Publication 560",
    "current_as_of": "2026",
    "professional_needed": true
  },
  {
    "id": "business-startup-costs",
    "name": "Business startup and organizational cost deduction",
    "personas": [
      "small-business",
      "freelancers-creators"
    ],
    "summary": "Costs you incur before a business officially opens can be deducted, with a limited amount written off in the first year and the rest amortized over time.",
    "explanation": "Money spent investigating and setting up a business before it opens its doors — market research, travel, training, legal and accounting fees, the cost of forming the entity — does not just vanish. The tax code lets a new business deduct a limited amount of startup costs and a limited amount of organizational costs in its first year, then amortize (spread out) any remaining amount over a period of years. The first-year deduction amounts phase out if total startup costs are large. The key disciplines are knowing which costs count as startup costs versus ordinary operating expenses once the business is running, and keeping records from the pre-launch period when most people are not yet thinking about taxes.",
    "eligibility": "Must have actually started or acquired an active trade or business. Costs must be ones that would be deductible if the business were already operating, or costs of creating the business entity. First-year deduction caps and phase-outs apply and should be verified.",
    "estimated_impact": "Deducting first-year startup and organizational costs could reduce taxable income by a few hundred to a few thousand dollars in year one, with the remainder recovered through amortization in later years.",
    "complexity": "medium",
    "risk_level": "low",
    "action_steps": "Keep records of all pre-launch spending, separate startup and organizational costs from ordinary operating expenses, and elect to deduct and amortize them on the first business tax return, reported with Form 4562.",
    "source": "IRC Section 195; IRC Section 248; IRS Publication 583",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "retirement-plan-startup-credit",
    "name": "Small employer retirement plan startup credit",
    "personas": [
      "small-business"
    ],
    "summary": "A small business that sets up its first retirement plan can claim a tax credit covering a portion of the cost of starting and running it.",
    "explanation": "To encourage small employers to offer retirement benefits, the tax code provides a credit that offsets the administrative cost of starting a new qualified plan — such as a 401(k), SEP, or SIMPLE IRA — for the first few years. Recent law expanded this area, and additional credit amounts can apply for employer contributions made on behalf of employees and for adding automatic enrollment. Because this is a credit, it reduces tax owed dollar for dollar, which makes the real cost of launching a plan much lower than the sticker price. The exact credit percentages, caps, and employer-size rules are specific and have changed, so they must be verified for the year.",
    "eligibility": "Generally available to small employers (under an employee-count threshold) that did not recently maintain a retirement plan and are starting an eligible new plan. The credit rules, caps, and employee-count limits change and must be verified against current IRS guidance.",
    "estimated_impact": "The credit could offset a meaningful share of plan startup and administration costs for the first few years — potentially hundreds to several thousand dollars depending on plan size and current credit rules.",
    "complexity": "low",
    "risk_level": "low",
    "action_steps": "When establishing a new qualified retirement plan, confirm the business meets the eligibility rules, track startup and administration costs, and claim the credit on Form 8881.",
    "source": "IRC Section 45E; Form 8881",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "work-opportunity-tax-credit",
    "name": "Work Opportunity Tax Credit (WOTC)",
    "personas": [
      "small-business",
      "legal-entities"
    ],
    "summary": "Employers can claim a credit for hiring workers from certain groups that have historically faced barriers to employment, but the credit's legal authorization has lapsed for workers hired after 2025 and currently awaits renewal by Congress.",
    "explanation": "The Work Opportunity Tax Credit rewards employers who hire from specific target groups — among them certain veterans, people receiving certain forms of public assistance, ex-felons, and others identified by the program. It is a credit against income tax, calculated as a percentage of the new hire's first-year wages up to a cap, with the amount varying by target group and hours worked. The single most important and most-missed step is timing: the employer must get the worker pre-screened and submit the certification request to the state workforce agency within a short window after the hire date. Miss that window and the credit is lost no matter how eligible the worker was. One critical status point: the legal authorization for this credit lapsed for employees who begin work after December 31, 2025, and was not extended by the 2025 tax legislation, so as things stand it is not available for new 2026 hires unless Congress reauthorizes it, something it has done repeatedly before and which proposed legislation would do again. The strategy is kept here for reference and remains valid for qualifying hires made while the credit was authorized; confirm current authorization before relying on it.",
    "eligibility": "Must hire an employee who is certified as a member of a WOTC target group. The certification request must be filed with the state workforce agency within the required period after the start date. The credit's legal authorization lapsed for employees hired after 2025, so its current availability for the year must be confirmed before relying on it; the credit is periodically renewed by law.",
    "estimated_impact": "Depending on the target group and hours worked, the credit could be worth roughly several hundred to several thousand dollars per qualifying hire.",
    "complexity": "medium",
    "risk_level": "low",
    "action_steps": "Have job applicants complete the pre-screening notice (Form 8850) on or before the offer date, submit it and any required forms to the state workforce agency within the deadline, obtain certification, and claim the credit on Form 5884.",
    "source": "IRC Section 51; Form 8850; Form 5884",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "tax-loss-harvesting",
    "name": "Tax-loss harvesting",
    "personas": [
      "investors-high-earners",
      "individuals-families"
    ],
    "summary": "Selling investments that have lost value lets you use those losses to offset taxable gains — and a limited amount of ordinary income.",
    "explanation": "In a taxable brokerage account, losses are not just bad news — they are a tax asset. When you sell an investment for less than you paid, that capital loss first offsets your capital gains. If losses exceed gains, you can use a limited amount of the excess to offset ordinary income each year, and carry any remaining loss forward to future years. Investors 'harvest' losses deliberately, selling a depressed position to bank the loss while often reinvesting in something similar to stay in the market. The rule that trips people up is the wash-sale rule: if you buy the same or a substantially identical security within 30 days before or after the sale, the loss is disallowed. Harvesting only works in taxable accounts — losses inside an IRA or 401(k) do nothing.",
    "eligibility": "Must hold investments in a taxable (non-retirement) account that are worth less than their cost basis. The wash-sale rule restricts repurchasing the same or a substantially identical security within the 30-day windows around the sale.",
    "estimated_impact": "Offsetting realized gains and a limited amount of ordinary income could save anywhere from a modest amount to several thousand dollars in a given year depending on the size of the losses and your tax rates.",
    "complexity": "medium",
    "risk_level": "low",
    "action_steps": "Review taxable accounts for positions trading below cost, sell to realize the loss, avoid buying a substantially identical security within the wash-sale windows, and report the transactions on Form 8949 and Schedule D.",
    "source": "IRC Section 1211; IRC Section 1091; IRS Publication 550; Schedule D (Form 1040)",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "capital-gains-holding-period",
    "name": "Long-term vs. short-term capital gains timing",
    "personas": [
      "investors-high-earners",
      "individuals-families"
    ],
    "summary": "Holding an investment longer than a year before selling can move the profit from ordinary income tax rates to the lower long-term capital gains rates.",
    "explanation": "How long you hold an asset before selling it changes the tax rate on the profit. Sell an asset you have held one year or less and the gain is short-term, taxed at your ordinary income rate. Hold it more than a year and the gain is long-term, taxed at the preferential long-term capital gains rates, which are meaningfully lower for most taxpayers — and can even be zero for those in the lowest brackets. The strategy is simple awareness: before selling an appreciated asset, check the holding period, because crossing the one-year mark can substantially cut the tax on the same dollar of gain. Higher earners should also be aware that investment income can attract an additional net investment income tax.",
    "eligibility": "Applies to anyone selling a capital asset (such as stock) at a gain in a taxable account. The benefit depends on holding the asset more than one year and on your taxable income, which determines the long-term rate that applies.",
    "estimated_impact": "Shifting a gain from short-term to long-term treatment could cut the tax rate on that gain by a wide margin; on a sizable gain that difference could be worth hundreds to many thousands of dollars.",
    "complexity": "low",
    "risk_level": "low",
    "action_steps": "Before selling an appreciated asset, check its purchase date and holding period, weigh whether waiting to cross the one-year mark is worthwhile, and report sales on Form 8949 and Schedule D.",
    "source": "IRC Section 1222; IRC Section 1(h); IRS Topic No. 409; IRS Publication 550",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "qualified-dividends",
    "name": "Qualified dividend tax treatment",
    "personas": [
      "investors-high-earners",
      "individuals-families"
    ],
    "summary": "Dividends that meet IRS requirements are taxed at the lower long-term capital gains rates instead of ordinary income rates.",
    "explanation": "Not all dividends are taxed the same way. 'Qualified' dividends — generally those paid by US corporations and many foreign corporations on stock you have held for a required minimum period — are taxed at the same preferential rates as long-term capital gains. 'Ordinary' (non-qualified) dividends are taxed at your regular income rate. The difference is driven mostly by the holding-period requirement around the dividend date. For investors building income portfolios, understanding which holdings produce qualified dividends, and holding the shares long enough to meet the requirement, keeps more of the dividend after tax. Your broker reports the qualified portion on Form 1099-DIV.",
    "eligibility": "The dividend must be paid by a qualifying corporation and you must hold the underlying stock for more than the required minimum period around the dividend date. Certain distributions (for example from REITs or money market funds) generally do not qualify.",
    "estimated_impact": "Having dividends taxed at long-term capital gains rates rather than ordinary rates could save a meaningful percentage of the dividend income — on a substantial dividend portfolio, potentially hundreds to thousands of dollars a year.",
    "complexity": "low",
    "risk_level": "low",
    "action_steps": "Check Form 1099-DIV to see which dividends are reported as qualified, hold dividend-paying shares long enough to satisfy the holding-period rule, and report dividends on Schedule B and Form 1040.",
    "source": "IRC Section 1(h)(11); IRS Publication 550; IRS Topic No. 404",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "1031-exchange",
    "name": "1031 like-kind exchange",
    "personas": [
      "investors-high-earners",
      "legal-entities"
    ],
    "summary": "An investor can sell one piece of investment real estate and roll the proceeds into another, deferring the capital gains tax the sale would normally trigger.",
    "explanation": "Normally, selling appreciated property triggers capital gains tax. A Section 1031 'like-kind exchange' lets a real estate investor defer that tax by reinvesting the proceeds into another investment or business real property. The gain is not erased — its basis carries over to the new property and the tax comes due eventually if the property is sold without another exchange — but the deferral keeps the full amount working and compounding. Current law limits 1031 exchanges to real property; it no longer applies to equipment or other personal property. The mechanics are strict and unforgiving: the proceeds must pass through a qualified intermediary (you cannot take possession of the cash), the replacement property must be identified within 45 days, and the purchase must close within 180 days. Miss a deadline and the deferral is lost.",
    "eligibility": "Both the property sold and the property acquired must be real property held for investment or productive use in a trade or business. A primary residence does not qualify. The transaction must use a qualified intermediary and meet the 45-day identification and 180-day completion deadlines.",
    "estimated_impact": "Deferring capital gains and depreciation recapture tax on the sale of appreciated investment real estate could keep tens of thousands to hundreds of thousands of dollars invested rather than paid in tax — the figure scales entirely with the gain.",
    "complexity": "high",
    "risk_level": "medium",
    "action_steps": "Engage a qualified intermediary before closing the sale, follow the 45-day identification and 180-day closing deadlines exactly, reinvest the proceeds into qualifying like-kind property, and report the exchange on Form 8824. Work with a tax professional and the intermediary throughout.",
    "source": "IRC Section 1031; Form 8824; IRS Publication 544",
    "current_as_of": "2026",
    "professional_needed": true
  },
  {
    "id": "rental-real-estate-depreciation",
    "name": "Rental real estate depreciation",
    "personas": [
      "investors-high-earners"
    ],
    "summary": "Owners of rental property can deduct a portion of the building's cost every year as depreciation, often sheltering rental income that was actually positive in cash terms.",
    "explanation": "When you own rental property, the tax code treats the building (not the land) as something that wears out over time, and lets you deduct that wear as depreciation — a set portion of the building's cost each year over a fixed recovery period. The powerful part is that depreciation is a non-cash deduction: you write it off without spending a dollar, so a rental that produces positive cash flow can still show a tax loss on paper. There are two important catches. Passive activity loss rules can limit how much of a paper loss you can use against other income. And when you eventually sell, the depreciation you took (or were entitled to take) is 'recaptured' and taxed — so depreciation is partly a deferral, not a permanent free deduction.",
    "eligibility": "Must own property held to produce rental income. Only the building and certain improvements are depreciable, not the land. Passive activity loss rules may limit current use of losses for owners who are not real estate professionals.",
    "estimated_impact": "Annual depreciation could shelter a meaningful portion of rental income from tax — often hundreds to several thousand dollars of tax a year per property — though recapture at sale claws some of it back.",
    "complexity": "medium",
    "risk_level": "medium",
    "action_steps": "Separate the building's value from the land, determine the correct recovery period, claim depreciation each year on Form 4562 and Schedule E, and keep records because depreciation will be recaptured when you sell.",
    "source": "IRC Section 168; IRS Publication 527; Form 4562",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "cost-segregation",
    "name": "Cost segregation study",
    "personas": [
      "investors-high-earners",
      "small-business"
    ],
    "summary": "A cost segregation study breaks a building into its components so that parts of it can be depreciated much faster, front-loading the deductions.",
    "explanation": "When you buy or build a property, the default is to depreciate the whole structure slowly over decades. A cost segregation study, usually performed by engineers and tax specialists, reclassifies parts of the property — fixtures, certain interior finishes, landscaping, specialized electrical and plumbing — into shorter depreciation categories. Those components can then be written off over a handful of years instead of decades, and may also qualify for bonus depreciation, which pulls a large amount of deduction into the early years of ownership. The benefit is timing: the same total deductions, but front-loaded, which improves cash flow. The trade-offs are the cost of the study itself, more depreciation recapture later, and the need for a defensible, properly documented analysis — this is not a do-it-yourself move.",
    "eligibility": "Most relevant to owners of commercial or residential rental property with a substantial building value, and generally most worthwhile relatively early in ownership. The study should be performed by qualified specialists following IRS guidance.",
    "estimated_impact": "Front-loading depreciation through cost segregation could accelerate tens of thousands of dollars of deductions into the early years of ownership; the cash-flow value depends on property cost, bracket, and how long you hold it.",
    "complexity": "high",
    "risk_level": "medium",
    "action_steps": "Have a qualified cost segregation specialist study the property, apply the reclassified asset lives to your depreciation schedule, coordinate any accounting-method change with a tax professional, and report depreciation on Form 4562.",
    "source": "IRS Cost Segregation Audit Techniques Guide; IRC Section 168; IRS Publication 946",
    "current_as_of": "2026",
    "professional_needed": true
  },
  {
    "id": "real-estate-professional-status",
    "name": "Real estate professional status",
    "personas": [
      "investors-high-earners"
    ],
    "summary": "Qualifying as a real estate professional can let rental losses offset other income — wages, business profit — instead of being trapped as passive losses.",
    "explanation": "Rental real estate is normally a 'passive' activity, which means paper losses from it (often driven by depreciation) generally cannot offset active income like wages or business profit — they are suspended until you have passive income or sell. Real estate professional status removes that wall. If you meet the tests — broadly, that more than half of your personal-service work for the year is in real property trades and that you spend a substantial number of hours materially participating — your rental activity is no longer automatically passive, and losses can offset other income. This is one of the most scrutinized and most litigated areas of individual tax. The hour thresholds are demanding, a spouse with a full-time non-real-estate job rarely qualifies, and the IRS expects a credible, contemporaneous time log. Without rigorous documentation, the status is routinely disallowed on audit.",
    "eligibility": "Must satisfy the IRS tests, broadly: more than half of your personal services during the year are performed in real property trades or businesses in which you materially participate, and you exceed the required number of hours in those activities. Material participation in the rentals themselves is also required to use the losses.",
    "estimated_impact": "If qualifying unlocks otherwise-suspended rental losses against wage or business income, the value could be substantial — potentially many thousands of dollars of tax a year — but it depends entirely on the size of the losses and other income.",
    "complexity": "high",
    "risk_level": "high",
    "action_steps": "Honestly assess whether you can meet the time tests, keep a detailed contemporaneous log of all real estate hours, confirm material participation in the rental activities, and work with a tax professional given how closely this status is examined.",
    "source": "IRC Section 469(c)(7); Treasury Regulation 1.469-9; IRS Publication 925",
    "current_as_of": "2026",
    "professional_needed": true
  },
  {
    "id": "donor-advised-fund",
    "name": "Donor-advised fund",
    "personas": [
      "investors-high-earners",
      "individuals-families"
    ],
    "summary": "A donor-advised fund lets you make a large charitable contribution and take the deduction now, then recommend grants to charities over time.",
    "explanation": "A donor-advised fund (DAF) is a charitable account held at a sponsoring organization. You contribute cash or, ideally, appreciated assets; you take the charitable deduction in the year you contribute; and then you recommend grants out to specific charities whenever you like, even over many years. Two things make it useful. First, it separates the timing of the deduction from the timing of the giving — useful for 'bunching,' where you concentrate several years of giving into one year to clear the standard deduction and itemize. Second, contributing appreciated stock to a DAF combines the charitable deduction with avoiding capital gains tax on the appreciation. The contribution is irrevocable — once it goes in, it must eventually go to charity — and deduction limits depend on what you give and your income.",
    "eligibility": "Available to anyone who wants to give to charity and can benefit from itemizing deductions. The contribution is irrevocable and must ultimately go to qualified charities. Annual deduction limits depend on the asset type and your adjusted gross income.",
    "estimated_impact": "Bunching contributions and donating appreciated assets through a DAF could increase deductible giving and avoid capital gains tax — combined, potentially saving hundreds to many thousands of dollars depending on amounts and bracket.",
    "complexity": "medium",
    "risk_level": "low",
    "action_steps": "Open a donor-advised fund at a sponsoring organization, contribute cash or appreciated assets (favoring appreciated assets to also avoid capital gains tax), keep contribution records, claim the itemized deduction on Schedule A, and recommend grants to charities over time.",
    "source": "IRC Section 170; IRC Section 4966; IRS Publication 526",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "qualified-charitable-distribution",
    "name": "Qualified charitable distribution (QCD) from an IRA",
    "personas": [
      "investors-high-earners",
      "individuals-families"
    ],
    "summary": "People age 70 and a half and older can send money directly from an IRA to charity, excluding it from income — and it can count toward a required minimum distribution.",
    "explanation": "Once you reach age 70 and a half, you can direct money straight from a traditional IRA to a qualified charity as a qualified charitable distribution. The amount goes to charity and is excluded from your taxable income entirely. This is often better than taking an IRA withdrawal and then donating it: because the QCD never enters your income, it helps even if you do not itemize, and a lower income figure can reduce other income-linked costs such as Medicare premiums and the taxable share of Social Security. For those subject to required minimum distributions, a QCD can also satisfy some or all of the RMD for the year. There is an annual cap on QCDs, which is now indexed for inflation, and the money must go directly from the IRA custodian to the charity.",
    "eligibility": "Must be age 70 and a half or older at the time of the distribution and have a traditional IRA. The funds must go directly from the IRA custodian to an eligible charity. The annual QCD limit is indexed for inflation and should be verified for the year.",
    "estimated_impact": "Excluding charitable gifts from income through a QCD could save tax on the distributed amount and reduce income-linked costs; for a regular giver this could be worth hundreds to several thousand dollars a year.",
    "complexity": "low",
    "risk_level": "low",
    "action_steps": "Confirm you are 70 and a half or older, instruct your IRA custodian to send funds directly to a qualified charity, keep the acknowledgment, verify the current annual QCD limit, and report the distribution correctly on Form 1040.",
    "source": "IRC Section 408(d)(8); IRS Publication 590-B",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "gifting-appreciated-stock",
    "name": "Gifting appreciated stock to charity",
    "personas": [
      "investors-high-earners",
      "individuals-families"
    ],
    "summary": "Donating stock that has gone up in value, instead of cash, lets you deduct the full market value and skip the capital gains tax on the growth.",
    "explanation": "If you plan to give to charity and you own stock or funds in a taxable account that have appreciated, giving the shares themselves is usually better than giving cash. When you donate long-term appreciated securities to a qualified public charity, you can generally deduct the full fair market value, and neither you nor the charity pays capital gains tax on the built-in appreciation. Compared with selling the stock, paying the gains tax, and donating what is left, the in-kind gift delivers more to the charity and a larger deduction to you. The shares must generally have been held more than a year to deduct full market value, deduction limits tied to your income apply, and gifts of stock above a certain value require a specific substantiation form.",
    "eligibility": "Must own appreciated securities, generally held more than one year, in a taxable account, and be giving to a qualified charity. Deduction limits depend on your adjusted gross income, and you must be able to itemize to benefit.",
    "estimated_impact": "Combining a full fair-market-value deduction with avoided capital gains tax could save noticeably more than donating cash — potentially hundreds to several thousand dollars more depending on the size of the gift and the embedded gain.",
    "complexity": "medium",
    "risk_level": "low",
    "action_steps": "Identify long-term appreciated holdings, transfer the shares directly to the charity (or to a donor-advised fund) rather than selling first, obtain a written acknowledgment, file Form 8283 for larger gifts, and claim the deduction on Schedule A.",
    "source": "IRC Section 170; IRS Publication 526; IRS Publication 561; Form 8283",
    "current_as_of": "2026",
    "professional_needed": false
  },
  {
    "id": "mega-backdoor-roth",
    "name": "Mega backdoor Roth",
    "personas": [
      "investors-high-earners"
    ],
    "summary": "Some 401(k) plans let high earners contribute a large amount of after-tax money and convert it to Roth, far beyond the normal Roth limits.",
    "explanation": "The mega backdoor Roth is a way to move a large sum into Roth treatment in a single year — well beyond what a direct Roth IRA or a normal Roth 401(k) deferral allows. It works only if your employer's 401(k) plan supports two specific features: the ability to make after-tax (non-Roth) contributions beyond the regular deferral limit, and the ability to either convert those after-tax dollars to Roth inside the plan or roll them out to a Roth IRA. If both exist, you contribute after-tax money up to the overall plan limit and convert it, so future growth is tax-free. The strategy lives or dies on plan design — many plans simply do not allow after-tax contributions or in-plan conversions — and the moving parts mean it is easy to get the tax reporting wrong.",
    "eligibility": "Requires an employer 401(k) plan that both permits after-tax contributions above the standard deferral limit and allows in-plan Roth conversions or in-service withdrawals to a Roth IRA. The overall contribution limits change annually and must be verified.",
    "estimated_impact": "There is no current-year deduction; the value is years of tax-free growth on a large converted amount, which over time could be worth many thousands of dollars in avoided future tax.",
    "complexity": "high",
    "risk_level": "medium",
    "action_steps": "Confirm with your plan administrator that the plan allows after-tax contributions and in-plan Roth conversions or in-service distributions, make after-tax contributions, convert them to Roth promptly to limit taxable earnings, and confirm the reporting with a tax professional.",
    "source": "IRC Section 402A; IRC Section 415(c); IRS Notice 2014-54",
    "current_as_of": "2026",
    "professional_needed": true
  },
  {
    "id": "qsbs-section-1202",
    "name": "Qualified Small Business Stock (QSBS / Section 1202)",
    "personas": [
      "investors-high-earners",
      "legal-entities"
    ],
    "summary": "Gain on the sale of qualifying small business C-corporation stock held long enough can be excluded from federal tax, up to a substantial cap.",
    "explanation": "Section 1202 is one of the most powerful incentives in the code: if you acquire qualified small business stock and hold it long enough, a large portion — potentially all — of the gain when you sell can be excluded from federal income tax. It is meant to reward investment in small, active C-corporations. The qualifying conditions are numerous and strict: the stock must be C-corporation stock, acquired at original issuance, the corporation must have had gross assets under a statutory ceiling when the stock was issued, it must run an active qualifying business (many service businesses are excluded). How much of the gain escapes tax depends on how long the stock is held: stock issued in earlier years generally needed a single multi-year holding period for a full exclusion, while recent legislation introduced a tiered structure under which stock issued after a 2025 cutoff date can earn a partial exclusion at a shorter hold and a full exclusion only after a longer one. That same legislation also raised the company gross-asset ceiling and the per-taxpayer exclusion cap. Because the holding-period tiers, asset ceiling, and exclusion cap now depend on when the stock was issued, all of them must be verified against current law for the specific stock involved.",
    "eligibility": "Must hold stock that meets every Section 1202 test — issued by a qualifying small C-corporation, acquired at original issuance, in a non-excluded line of business — and held long enough to qualify, with the share of gain excluded depending on the length of the hold for more recently issued stock. The asset ceiling, holding-period tiers, and exclusion cap should be verified, as they now depend on when the stock was issued.",
    "estimated_impact": "Where it applies fully, excluding gain on a successful exit could eliminate federal tax on a very large amount of gain — potentially hundreds of thousands of dollars or more — but only if every requirement is met.",
    "complexity": "high",
    "risk_level": "medium",
    "action_steps": "When investing in or forming a C-corporation, confirm with a tax professional whether the stock can qualify, document the company's status at issuance, hold for the required period, verify the current rules before selling, and report the exclusion on Form 8949 and Schedule D.",
    "source": "IRC Section 1202; IRS instructions for Schedule D (Form 1040)",
    "current_as_of": "2026",
    "professional_needed": true
  },
  {
    "id": "entity-selection",
    "name": "Business entity selection (LLC vs. S-corp vs. C-corp)",
    "personas": [
      "legal-entities",
      "small-business"
    ],
    "summary": "The legal and tax structure you choose for a business changes how its income is taxed, what you pay in payroll and self-employment tax, and what other strategies become available.",
    "explanation": "Choosing a business structure is one of the highest-leverage tax decisions an owner makes, because so much downstream flows from it. A sole proprietorship or a default single-member LLC is simple but exposes all profit to self-employment tax. An S-corporation can reduce that tax through the reasonable-salary-and-distributions split, at the cost of payroll and extra filings. A C-corporation is taxed separately at the corporate rate and faces potential double taxation on dividends, but it can retain earnings, offers certain benefit advantages, and is the gateway to incentives like qualified small business stock. An LLC is a legal wrapper that can be taxed as any of these. There is no universally correct answer — it depends on profit level, growth and funding plans, whether you will have employees, and your state. Because the decision is consequential and hard to unwind cleanly, it should be modeled with a professional rather than guessed.",
    "eligibility": "Relevant to anyone forming a business or reconsidering the structure of an existing one. Eligibility to elect S-corp status carries shareholder and stock restrictions; the right choice depends on profit, growth plans, ownership, and state rules.",
    "estimated_impact": "The right structure for a given situation could change annual tax by a wide margin — from modest amounts for a small operation to many thousands of dollars for a profitable one — while the wrong one adds cost and friction.",
    "complexity": "high",
    "risk_level": "medium",
    "action_steps": "Map out expected profit, growth, funding, and hiring plans, model the tax outcome of each structure with a tax professional and attorney, form or convert the entity, and make any tax election (such as Form 2553 for S-corp status or Form 8832 for entity classification) within the deadlines.",
    "source": "IRS Publication 3402; Form 8832; Form 2553; IRS 'Business Structures'",
    "current_as_of": "2026",
    "professional_needed": true
  },
  {
    "id": "pass-through-entity-tax",
    "name": "Pass-through entity tax (PTET) election",
    "personas": [
      "legal-entities",
      "small-business"
    ],
    "summary": "Many states let a pass-through business pay state income tax at the entity level, which can sidestep the federal cap on deducting state and local taxes.",
    "explanation": "Federal law caps the itemized deduction for state and local taxes (the 'SALT cap'), which hits owners of pass-through businesses who pay state tax on business income through their personal returns. In response, most states created an optional pass-through entity tax: the partnership or S-corporation elects to pay the state income tax at the entity level, where it is a business expense not subject to the personal SALT cap, and the owners receive a corresponding state credit. The IRS has confirmed that a properly structured entity-level tax of this kind is deductible by the entity. The result can restore a federal deduction the owners would otherwise lose. The catch is that this is entirely state-specific: whether a PTET exists, how the election is made, the deadlines, and how the owner credit works all vary by state, and the election is often irrevocable for the year.",
    "eligibility": "Must be a pass-through entity (commonly a partnership or S-corporation) operating in a state that offers a pass-through entity tax. Availability, election mechanics, and deadlines vary by state and must be checked locally.",
    "estimated_impact": "Restoring a federal deduction for state taxes that the SALT cap would otherwise block could save owners a meaningful amount — potentially hundreds to many thousands of dollars depending on state tax paid and bracket.",
    "complexity": "high",
    "risk_level": "medium",
    "action_steps": "Check whether your state offers a pass-through entity tax, model the effect with a tax professional, make the election by the state's deadline, have the entity pay the tax, and ensure each owner claims the corresponding state credit.",
    "source": "IRS Notice 2020-75",
    "current_as_of": "2026",
    "professional_needed": true
  },
  {
    "id": "trust-based-strategies",
    "name": "Trust-based tax and estate strategies",
    "personas": [
      "legal-entities",
      "investors-high-earners"
    ],
    "summary": "Trusts are legal structures that can move assets and their future growth out of a taxable estate and shift income, when set up carefully by professionals.",
    "explanation": "A trust is a legal arrangement where a trustee holds assets for beneficiaries under terms the grantor sets. Trusts are central to estate and wealth-transfer planning. An irrevocable trust, once funded, can remove assets — and importantly their future appreciation — from the grantor's taxable estate, which matters for families approaching the estate tax exemption. 'Grantor trusts' have a particular feature: the grantor pays the income tax on the trust's income, which is itself a way to pass more value to beneficiaries tax-efficiently. Specialized trusts serve specific goals — for example, charitable remainder trusts blend giving with an income stream. The trade-offs are real: irrevocable trusts generally cannot be undone, trusts reach the top tax brackets at very low income levels, and the rules (Subchapter J and the grantor trust rules) are intricate. This is squarely the domain of an estate attorney and tax advisor.",
    "eligibility": "Most relevant to families with significant assets, estate tax exposure, or specific control and asset-protection goals. Trusts must be drafted by qualified professionals, and an irrevocable trust generally cannot be reversed once established.",
    "estimated_impact": "Effective trust planning could remove substantial future appreciation from a taxable estate and shift income — for larger estates the value could reach into the tens or hundreds of thousands of dollars or more — but outcomes depend entirely on the estate and the design.",
    "complexity": "high",
    "risk_level": "high",
    "action_steps": "Define your estate and wealth-transfer goals, engage an estate attorney and tax advisor to determine whether a trust fits and which type, have the trust properly drafted and funded, and handle trust tax filings (Form 1041) as required. Do not attempt this without professionals.",
    "source": "IRC Sections 641-685 (Subchapter J); IRC Sections 671-679; IRS Form 1041 instructions",
    "current_as_of": "2026",
    "professional_needed": true
  },
  {
    "id": "annual-gift-tax-exclusion",
    "name": "Annual gift tax exclusion and lifetime exemption",
    "personas": [
      "investors-high-earners",
      "individuals-families",
      "legal-entities"
    ],
    "summary": "You can give a set amount to any number of people each year with no gift tax and no paperwork, and a large lifetime exemption sits above that.",
    "explanation": "The gift tax is widely misunderstood. Each year you can give up to an annual exclusion amount to as many separate people as you like with no gift tax and no return to file — a married couple can combine their exclusions to give twice as much per recipient. Gifts above the annual exclusion are usually not taxed either; they simply reduce a large lifetime gift and estate tax exemption, and require filing a gift tax return to track that use. For families focused on transferring wealth, consistent annual-exclusion gifting moves money — and its future growth — out of the taxable estate steadily, without ever touching the lifetime exemption. Certain payments, such as tuition or medical expenses paid directly to the institution, do not count as gifts at all. The annual exclusion and the lifetime exemption are both indexed for inflation; the lifetime exemption was once set to drop sharply under a scheduled sunset, but recent legislation removed that sunset and set it at a high permanent level, so while no cliff is looming the current figures should still be verified.",
    "eligibility": "Available to anyone making gifts. The annual exclusion applies per recipient per year; gifts above it require a gift tax return and draw against the lifetime exemption. Direct payments of tuition or medical costs to the provider are excluded entirely.",
    "estimated_impact": "Systematic annual-exclusion gifting could move substantial value and its future appreciation out of a taxable estate over time; for larger estates the eventual estate tax saved could be significant, though it depends on the estate's size and the exemption in effect.",
    "complexity": "medium",
    "risk_level": "low",
    "action_steps": "Verify the current annual exclusion amount, make gifts at or below it to each recipient to avoid any filing, pay tuition or medical costs directly to the institution where relevant, and file Form 709 for any gift above the annual exclusion. Coordinate larger gifting with an estate professional.",
    "source": "IRC Section 2503(b); IRC Section 2010; Form 709; IRS 'Frequently Asked Questions on Gift Taxes'",
    "current_as_of": "2026",
    "professional_needed": true
  },
  {
    "id": "qualified-opportunity-zone",
    "name": "Qualified Opportunity Zone investment",
    "personas": [
      "investors-high-earners",
      "legal-entities"
    ],
    "summary": "Reinvesting a capital gain into a Qualified Opportunity Fund can defer tax on that gain and, if the investment is held long enough, make its own future growth tax-free.",
    "explanation": "Qualified Opportunity Zones are designated economically distressed areas, and the tax code offers incentives to channel investment into them. If you realize a capital gain and reinvest the gain amount into a Qualified Opportunity Fund within a set window, you can defer tax on the original gain for a period defined by law. The larger benefit is on the back end: if you hold the Opportunity Fund investment for the required long-term period, the appreciation on the fund investment itself can be excluded from tax entirely. The program began as a temporary, deadline-driven incentive, but recent legislation made it a permanent part of the code and restructured how the deferral period and basis step-ups work, with newer investments following a rolling timeline rather than a single fixed statutory date. The funds invest in real estate or businesses within the designated zones. Because the deferral period, holding periods, and step-up rules differ depending on when the investment is made, they must all be checked against current law, and because the investments themselves carry real economic risk, this is professional-and-due-diligence territory.",
    "eligibility": "Must have an eligible capital gain and reinvest the gain amount into a Qualified Opportunity Fund within the required window after realizing it. The full back-end benefit requires meeting a long-term holding period. The program is now a permanent part of the code, but its deferral and holding-period rules differ depending on when the investment is made and must be verified against current law.",
    "estimated_impact": "Deferring tax on a reinvested gain and potentially excluding all appreciation on the fund investment could be worth a substantial amount on a large gain — but the figure depends on the gain size, the holding period achieved, and current program rules, and the underlying investment can lose value.",
    "complexity": "high",
    "risk_level": "high",
    "action_steps": "Confirm you have an eligible gain, reinvest the gain amount into a Qualified Opportunity Fund within the required period, verify the current deferral and holding-period rules, plan to hold for the long-term threshold, and report the election on Form 8949 and Form 8997 with help from a tax professional.",
    "source": "IRC Section 1400Z-2; Form 8997; Form 8949; IRS 'Opportunity Zones' Frequently Asked Questions",
    "current_as_of": "2026",
    "professional_needed": true
  }
];
