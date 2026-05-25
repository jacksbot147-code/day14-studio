/**
 * realty-contracts.ts — the contract & outreach document generator.
 *
 * Phase 3 of the Realty advancement plan. Generates plain-language starting
 * drafts of the documents a deal needs — a purchase agreement, a wholesale
 * assignment, a letter of intent — and an owner-outreach letter, all filled
 * in from the property data.
 *
 * COMPLIANCE — non-negotiable: every contract is a DRAFT, never legal advice.
 * Real estate contracts are binding and state-specific. A licensed Florida
 * attorney and/or a title company must review and complete every document
 * before anyone signs or sends it. Day14 Realty is not a law firm.
 */

import type { REEvaluation } from "./admin-state";
import type { REProperty } from "./realty-gameplan";

export const CONTRACT_LEGAL_NOTICE =
  "DRAFT — NOT LEGAL ADVICE. This is a plain-language starting template generated from property data, not a finished or state-approved contract. Real estate contracts are legally binding and vary by state. Before anyone signs or sends this, a licensed Florida real estate attorney and/or a title company must review and complete it. Day14 Realty is not a law firm and does not provide legal advice.";

export interface ContractClause {
  heading: string;
  body: string;
}
export interface RealtyContract {
  type: string;
  title: string;
  blurb: string;
  intro: string;
  clauses: ContractClause[];
  signatures: string[];
}

const CONTRACT_TYPES: Record<string, string> = {
  "letter-of-intent": "Letter of Intent to Purchase",
  "purchase-agreement": "Residential Purchase & Sale Agreement",
  "wholesale-assignment": "Assignment of Real Estate Purchase Contract",
};

export function contractTypeName(type: string): string | null {
  return CONTRACT_TYPES[type] || null;
}

/** The documents a given play needs, in the order they are used. */
export function contractsForPlay(
  play: string
): { type: string; name: string; when: string }[] {
  const docs = [
    {
      type: "letter-of-intent",
      name: CONTRACT_TYPES["letter-of-intent"]!,
      when: "The first soft offer — non-binding, opens the conversation with the seller.",
    },
    {
      type: "purchase-agreement",
      name: CONTRACT_TYPES["purchase-agreement"]!,
      when: "The binding offer — locks the property under contract once both parties sign.",
    },
  ];
  if (play === "wholesale") {
    docs.push({
      type: "wholesale-assignment",
      name: CONTRACT_TYPES["wholesale-assignment"]!,
      when: "Assigns your purchase contract to the end cash buyer for an assignment fee.",
    });
  }
  return docs;
}

function money(cents: number | undefined): string {
  return `$${Math.round((cents || 0) / 100).toLocaleString()}`;
}
function fullAddress(p: REProperty): string {
  return [p.address, p.city, p.zip ? `FL ${p.zip}` : "FL"].filter(Boolean).join(", ");
}

export function buildContract(
  type: string,
  p: REProperty,
  e: REEvaluation
): RealtyContract | null {
  const addr = fullAddress(p);
  const seller = p.owner_name || "[SELLER NAME — owner of record]";
  const mao = money(e.flip.mao_cents);
  const parcel = p.id;

  if (type === "letter-of-intent") {
    return {
      type,
      title: "Letter of Intent to Purchase",
      blurb:
        "A short, non-binding letter that opens the conversation and puts proposed terms in front of the seller before any contract.",
      intro: `Re: Non-binding Letter of Intent to purchase ${addr} (parcel ${parcel}).`,
      clauses: [
        {
          heading: "Greeting",
          body: `Dear ${p.owner_name || "Property Owner"}, I am writing to express my interest in purchasing your property at ${addr}. This letter is a non-binding expression of intent only — it is not an offer and not a contract.`,
        },
        {
          heading: "Proposed terms",
          body: `Proposed purchase price: approximately [PROPOSED PRICE]. (Day14's analysis suggests a maximum offer near ${mao} on a fix-and-flip basis; the price offered is the Buyer's decision.) Proposed structure: [all cash / seller financing / other]. Proposed timeline: closing within [30-45] days of a signed agreement.`,
        },
        {
          heading: "Subject to",
          body: "Any purchase would be subject to a due-diligence period, clear and marketable title, satisfactory inspection and insurability, and a formal, attorney-reviewed Purchase and Sale Agreement.",
        },
        {
          heading: "Next step",
          body: "If these terms are of interest, I would welcome a conversation and would then move to a formal Purchase and Sale Agreement prepared and reviewed by counsel. Nothing in this letter obligates either party in any way.",
        },
        {
          heading: "Closing",
          body: "Thank you for your time and consideration. — [YOUR NAME], [PHONE], [EMAIL].",
        },
      ],
      signatures: ["Sender", "Date"],
    };
  }

  if (type === "purchase-agreement") {
    return {
      type,
      title: "Residential Purchase & Sale Agreement",
      blurb:
        "The binding offer. When both parties sign, the property is under contract. This draft must be completed and reviewed by a Florida attorney or title company.",
      intro: `This Residential Purchase and Sale Agreement is a draft offer for the property at ${addr}. All party names and terms in [brackets] must be completed and confirmed before signing.`,
      clauses: [
        {
          heading: "1. Parties",
          body: `Seller: ${seller}, the record owner of the Property. Buyer: [BUYER NAME OR ENTITY]. The parties agree to the sale and purchase of the Property on the terms set out below.`,
        },
        {
          heading: "2. Property",
          body: `The real property and improvements located at ${addr}, county parcel ${parcel}, together with all fixtures and improvements (the "Property").`,
        },
        {
          heading: "3. Purchase price & deposit",
          body: `The total purchase price is [OFFER PRICE]. Day14's analysis suggests a maximum offer near ${mao} on a fix-and-flip basis; the actual offer is the Buyer's decision. Buyer shall deliver an earnest money deposit of [DEPOSIT AMOUNT] to [TITLE COMPANY OR ESCROW AGENT] within [3] business days of acceptance.`,
        },
        {
          heading: "4. Closing & possession",
          body: "Closing shall occur on or before [CLOSING DATE]. Possession of the Property transfers to Buyer at closing unless the parties agree otherwise in writing.",
        },
        {
          heading: "5. Inspection & due diligence",
          body: "Buyer shall have a due-diligence period of [10-15] days from acceptance to inspect the Property, review records, and confirm condition, flood zone, and insurability. Buyer may cancel for any reason during this period and recover the deposit in full.",
        },
        {
          heading: "6. Title & survey",
          body: "Seller shall convey marketable title by [warranty deed], free of liens except any the Buyer expressly agrees to assume. A title search, and a survey if Buyer elects one, shall be completed before closing. Title defects shall be cured before closing.",
        },
        {
          heading: "7. Financing",
          body: "This offer is [ ] all cash, or [ ] contingent on Buyer obtaining financing by [DATE]. If financing is a contingency and is not obtained, Buyer may cancel and recover the deposit.",
        },
        {
          heading: "8. Condition / as-is",
          body: "Unless stated otherwise, the Property is sold AS-IS. Seller shall maintain the Property in its current condition until closing. This does not waive the Buyer inspection rights in Section 5.",
        },
        {
          heading: "9. Closing costs & prorations",
          body: "Closing costs shall be allocated per Florida custom or as the parties negotiate. Property taxes and any assessments shall be prorated as of the closing date.",
        },
        {
          heading: "10. Disclosures",
          body: "Seller shall provide all disclosures required by Florida law, including any known material defects. Buyer acknowledges that Southwest Florida coastal property may carry significant flood-zone and insurance considerations.",
        },
        {
          heading: "11. Default & governing law",
          body: "If either party defaults, the remedies of the non-defaulting party shall be as provided by Florida law and as the final, attorney-reviewed contract specifies. This Agreement is governed by the laws of the State of Florida.",
        },
        {
          heading: "12. Draft status",
          body: "This is a draft. It is not binding on anyone until it has been reviewed, completed, and signed by both parties with the advice of counsel.",
        },
      ],
      signatures: ["Buyer", "Seller", "Date"],
    };
  }

  if (type === "wholesale-assignment") {
    return {
      type,
      title: "Assignment of Real Estate Purchase Contract",
      blurb:
        "Transfers your rights under the purchase contract to an end cash buyer for an assignment fee. You never take title. Confirm Florida rules on contract assignment before using.",
      intro: `This Assignment transfers the Buyer's rights under an existing purchase contract for ${addr} to a new buyer, in exchange for an assignment fee. All terms in [brackets] must be completed and confirmed.`,
      clauses: [
        {
          heading: "1. Parties",
          body: "Assignor: [YOUR NAME OR ENTITY], the buyer under the original Purchase and Sale Agreement for the Property. Assignee: [END BUYER NAME OR ENTITY].",
        },
        {
          heading: "2. The Property & underlying contract",
          body: `The Property at ${addr}, parcel ${parcel}, is under contract by the Assignor under a Purchase and Sale Agreement dated [DATE] with the Seller, ${seller}. A copy of that agreement is attached and incorporated by reference.`,
        },
        {
          heading: "3. Assignment",
          body: "Assignor assigns to Assignee all of the Assignor's rights, title, and interest in the underlying Purchase and Sale Agreement. Assignee assumes all of the Assignor's obligations under it from the date of this Assignment forward.",
        },
        {
          heading: "4. Assignment fee",
          body: "Assignee shall pay Assignor an assignment fee of [ASSIGNMENT FEE], payable at closing or as the parties agree in writing. This fee compensates the Assignor for placing the Property under contract.",
        },
        {
          heading: "5. Earnest money",
          body: "Assignee shall replace, or reimburse the Assignor for, the earnest money deposit of [DEPOSIT AMOUNT] held by [ESCROW AGENT] under the underlying contract.",
        },
        {
          heading: "6. No warranties",
          body: "Assignor makes no representations or warranties about the Property's condition, value, or title. Assignee has performed, or expressly waives, its own due diligence and relies solely on its own investigation.",
        },
        {
          heading: "7. Closing",
          body: "Assignee shall close directly with the Seller under the terms and deadlines of the underlying contract. Failure to close may forfeit the deposit as that contract provides.",
        },
        {
          heading: "8. Governing law & compliance",
          body: "This Assignment is governed by Florida law. Some states regulate or restrict the assignment of real estate contracts and wholesaling activity; the parties must confirm this transaction complies with current Florida law before proceeding.",
        },
      ],
      signatures: ["Assignor", "Assignee", "Date"],
    };
  }

  return null;
}

export interface OwnerOutreach {
  letter: string;
  phoneOpener: string;
}

/** A compliant, no-pressure first-contact letter to the property owner. */
export function ownerOutreach(p: REProperty): OwnerOutreach {
  const greeting = p.owner_name || "Property Owner";
  const where = p.city || "the area";
  const letter = [
    `Dear ${greeting},`,
    ``,
    `My name is [YOUR NAME] and I am a local real estate investor. I am reaching out because I am interested in buying property in ${where}, and your property at ${p.address || "[PROPERTY ADDRESS]"} came to my attention.`,
    ``,
    `I am not a real estate agent and this is not a solicitation to list your home — I am a direct buyer. If you have ever thought about selling, I would welcome a no-pressure conversation. I can often work with a flexible timeline and buy a property as-is, which means no repairs or cleanout on your end.`,
    ``,
    `There is no obligation of any kind. If selling is not something you are considering, I completely understand — please feel free to disregard this letter.`,
    ``,
    `If you would like to talk, you can reach me at [PHONE] or [EMAIL].`,
    ``,
    `Thank you for your time.`,
    ``,
    `[YOUR NAME]`,
    `[PHONE] · [EMAIL]`,
  ].join("\n");
  const phoneOpener = `"Hi, is this ${greeting}? My name is [YOUR NAME] — I'm a local buyer, not an agent. I came across your property on ${p.address || "[ADDRESS]"} and wanted to ask, with no pressure at all: have you ever thought about selling it?"`;
  return { letter, phoneOpener };
}
