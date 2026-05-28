/**
 * src/lib/skills/index.ts
 *
 * Barrel export for every hand-coded TypeScript skill module. Two shapes:
 *
 *   1. **Namespace re-exports** — `export * as <camelName> from "./<kebab>"`
 *      so callers can grab the full public surface of any skill without
 *      worrying about name collisions across modules (e.g., several
 *      modules export `run`, `ClassifyResult`, etc.).
 *
 *   2. **SKILL_RUNNERS map + runSkillByName(name, ctx)** — central
 *      dispatch table keyed by canonical kebab-case skill name → the
 *      module's `run(ctx) -> Promise<SkillOutcome>`. The skill-runner
 *      uses dynamic import today; this map lets callers bypass that
 *      for synchronous lookup and lets tooling (skill-coverage-auditor,
 *      skill-bridge) enumerate the migrated set without filesystem
 *      glob calls.
 *
 * 59 modules ported as of 2026-05-28 (Gap 8). See AUDIT-2026-05-28.md
 * for the full inventory + gaps remaining.
 */

import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";

// ---- module namespace re-exports (alphabetical) ---------------------------
export * as abandonedCartRecovery from "./abandoned-cart-recovery";
export * as actionBiasCoach from "./action-bias-coach";
export * as auditLogGenerator from "./audit-log-generator";
export * as autoArchiveSpam from "./auto-archive-spam";
export * as blogPostGenerator from "./blog-post-generator";
export * as brandExtractor from "./brand-extractor";
export * as caseStudyWriter from "./case-study-writer";
export * as churnRiskScorer from "./churn-risk-scorer";
export * as complaintEscalation from "./complaint-escalation";
export * as contentCalendarOrchestrator from "./content-calendar-orchestrator";
export * as crossBusinessPrioritizer from "./cross-business-prioritizer";
export * as customerDataDeletionHandler from "./customer-data-deletion-handler";
export * as customerHistoryLookup from "./customer-history-lookup";
export * as customerLtvCalculator from "./customer-ltv-calculator";
export * as customerReadinessCheck from "./customer-readiness-check";
export * as customerServiceTriage from "./customer-service-triage";
export * as dailyEod from "./daily-eod";
export * as dailyKickoff from "./daily-kickoff";
export * as day14Voice from "./day14-voice";
export * as dossierFolderInitializer from "./dossier-folder-initializer";
export * as dunningEmailSequencer from "./dunning-email-sequencer";
export * as emailNewsletterComposer from "./email-newsletter-composer";
export * as etsyListingWriter from "./etsy-listing-writer";
export * as etsyPricingValidator from "./etsy-pricing-validator";
export * as etsyProductMockupPrompts from "./etsy-product-mockup-prompts";
export * as etsyShopPoliciesGenerator from "./etsy-shop-policies-generator";
export * as etsyTagResearcher from "./etsy-tag-researcher";
export * as feedbackClassifier from "./feedback-classifier";
export * as growthMetricsDashboard from "./growth-metrics-dashboard";
export * as imageGenerator from "./image-generator";
export * as inboundClassifier from "./inbound-classifier";
export * as instagramReelCaptionWriter from "./instagram-reel-caption-writer";
export * as intakeParser from "./intake-parser";
export * as internalLinkSuggester from "./internal-link-suggester";
export * as leadFirstTouchPersonalizer from "./lead-first-touch-personalizer";
export * as leadSourceTracker from "./lead-source-tracker";
export * as mrrCalculator from "./mrr-calculator";
export * as multiTenantMrrAggregator from "./multi-tenant-mrr-aggregator";
export * as perTenantDailyRollup from "./per-tenant-daily-rollup";
export * as podDesignBriefGenerator from "./pod-design-brief-generator";
export * as podNicheResearcher from "./pod-niche-researcher";
export * as podProductMixRecommender from "./pod-product-mix-recommender";
export * as printifyProductCreator from "./printify-product-creator";
export * as refundHandler from "./refund-handler";
export * as reviewSentimentScorer from "./review-sentiment-scorer";
export * as skillCoverageAuditor from "./skill-coverage-auditor";
export * as skillDeprecationFlagger from "./skill-deprecation-flagger";
export * as skillGapDetector from "./skill-gap-detector";
export * as skillNamingValidator from "./skill-naming-validator";
export * as skillPromotionCriteria from "./skill-promotion-criteria";
export * as skillSpecGenerator from "./skill-spec-generator";
export * as socialCrossPost from "./social-cross-post";
export * as subscriptionPauseHandler from "./subscription-pause-handler";
export * as tiktokCaptionWriter from "./tiktok-caption-writer";
export * as upsellDetection from "./upsell-detection";
export * as uptimeMonitor from "./uptime-monitor";
export * as viralHookRewriter from "./viral-hook-rewriter";
export * as winBackCampaignTrigger from "./win-back-campaign-trigger";
export * as youtubeShortsCaptionWriter from "./youtube-shorts-caption-writer";

// ---- explicit invoke<Name> re-exports for the newly migrated set ---------
// These are the typed entry points the brief calls out specifically
// ("invoke<Name>(input) -> Promise<Output>"). Each is also reachable via
// the namespace export above; the duplicates here are for ergonomic IDE
// completion at the top of the barrel.
export { invokeAbandonedCartRecovery } from "./abandoned-cart-recovery";
export { invokeActionBiasCoach } from "./action-bias-coach";
export { invokeBrandExtractor } from "./brand-extractor";
export { invokeCaseStudyWriter } from "./case-study-writer";
export { invokeContentCalendarOrchestrator } from "./content-calendar-orchestrator";
export { invokeCustomerDataDeletionHandler } from "./customer-data-deletion-handler";
export { invokeCustomerReadinessCheck } from "./customer-readiness-check";
export { invokeDay14Voice } from "./day14-voice";
export { invokeDunningEmailSequencer } from "./dunning-email-sequencer";
export { invokeFeedbackClassifier } from "./feedback-classifier";
export { invokeInstagramReelCaptionWriter } from "./instagram-reel-caption-writer";
export { invokeInternalLinkSuggester } from "./internal-link-suggester";
export { invokeLeadFirstTouchPersonalizer } from "./lead-first-touch-personalizer";
export { invokeLeadSourceTracker } from "./lead-source-tracker";
export { invokeReviewSentimentScorer } from "./review-sentiment-scorer";
export { invokeTiktokCaptionWriter } from "./tiktok-caption-writer";
export { invokeUpsellDetection } from "./upsell-detection";
export { invokeWinBackCampaignTrigger } from "./win-back-campaign-trigger";
export { invokeYoutubeShortsCaptionWriter } from "./youtube-shorts-caption-writer";

// ---- runtime dispatch map -------------------------------------------------
import * as abandonedCartRecovery from "./abandoned-cart-recovery";
import * as actionBiasCoach from "./action-bias-coach";
import * as auditLogGenerator from "./audit-log-generator";
import * as autoArchiveSpam from "./auto-archive-spam";
import * as blogPostGenerator from "./blog-post-generator";
import * as brandExtractor from "./brand-extractor";
import * as caseStudyWriter from "./case-study-writer";
import * as churnRiskScorer from "./churn-risk-scorer";
import * as complaintEscalation from "./complaint-escalation";
import * as contentCalendarOrchestrator from "./content-calendar-orchestrator";
import * as crossBusinessPrioritizer from "./cross-business-prioritizer";
import * as customerDataDeletionHandler from "./customer-data-deletion-handler";
import * as customerHistoryLookup from "./customer-history-lookup";
import * as customerLtvCalculator from "./customer-ltv-calculator";
import * as customerReadinessCheck from "./customer-readiness-check";
import * as customerServiceTriage from "./customer-service-triage";
import * as dailyEod from "./daily-eod";
import * as dailyKickoff from "./daily-kickoff";
import * as day14Voice from "./day14-voice";
import * as dossierFolderInitializer from "./dossier-folder-initializer";
import * as dunningEmailSequencer from "./dunning-email-sequencer";
import * as emailNewsletterComposer from "./email-newsletter-composer";
import * as etsyListingWriter from "./etsy-listing-writer";
import * as etsyPricingValidator from "./etsy-pricing-validator";
import * as etsyProductMockupPrompts from "./etsy-product-mockup-prompts";
import * as etsyShopPoliciesGenerator from "./etsy-shop-policies-generator";
import * as etsyTagResearcher from "./etsy-tag-researcher";
import * as feedbackClassifier from "./feedback-classifier";
import * as growthMetricsDashboard from "./growth-metrics-dashboard";
import * as imageGenerator from "./image-generator";
import * as inboundClassifier from "./inbound-classifier";
import * as instagramReelCaptionWriter from "./instagram-reel-caption-writer";
import * as intakeParser from "./intake-parser";
import * as internalLinkSuggester from "./internal-link-suggester";
import * as leadFirstTouchPersonalizer from "./lead-first-touch-personalizer";
import * as leadSourceTracker from "./lead-source-tracker";
import * as mrrCalculator from "./mrr-calculator";
import * as multiTenantMrrAggregator from "./multi-tenant-mrr-aggregator";
import * as perTenantDailyRollup from "./per-tenant-daily-rollup";
import * as podDesignBriefGenerator from "./pod-design-brief-generator";
import * as podNicheResearcher from "./pod-niche-researcher";
import * as podProductMixRecommender from "./pod-product-mix-recommender";
import * as printifyProductCreator from "./printify-product-creator";
import * as refundHandler from "./refund-handler";
import * as reviewSentimentScorer from "./review-sentiment-scorer";
import * as skillCoverageAuditor from "./skill-coverage-auditor";
import * as skillDeprecationFlagger from "./skill-deprecation-flagger";
import * as skillGapDetector from "./skill-gap-detector";
import * as skillNamingValidator from "./skill-naming-validator";
import * as skillPromotionCriteria from "./skill-promotion-criteria";
import * as skillSpecGenerator from "./skill-spec-generator";
import * as socialCrossPost from "./social-cross-post";
import * as subscriptionPauseHandler from "./subscription-pause-handler";
import * as tiktokCaptionWriter from "./tiktok-caption-writer";
import * as upsellDetection from "./upsell-detection";
import * as uptimeMonitor from "./uptime-monitor";
import * as viralHookRewriter from "./viral-hook-rewriter";
import * as winBackCampaignTrigger from "./win-back-campaign-trigger";
import * as youtubeShortsCaptionWriter from "./youtube-shorts-caption-writer";

export type SkillRunner = (ctx: SkillInvocationContext) => Promise<SkillOutcome>;

/**
 * Canonical map: kebab-case skill name → its `run(ctx)` function.
 *
 * Skill-runner currently uses dynamic `import()` for the fast path; this
 * map provides a synchronous alternative + lets tooling enumerate the
 * migrated set without filesystem traversal.
 */
export const SKILL_RUNNERS: Readonly<Record<string, SkillRunner>> = Object.freeze({
  "abandoned-cart-recovery": abandonedCartRecovery.run,
  "action-bias-coach": actionBiasCoach.run,
  "audit-log-generator": auditLogGenerator.run,
  "auto-archive-spam": autoArchiveSpam.run,
  "blog-post-generator": blogPostGenerator.run,
  "brand-extractor": brandExtractor.run,
  "case-study-writer": caseStudyWriter.run,
  "churn-risk-scorer": churnRiskScorer.run,
  "complaint-escalation": complaintEscalation.run,
  "content-calendar-orchestrator": contentCalendarOrchestrator.run,
  "cross-business-prioritizer": crossBusinessPrioritizer.run,
  "customer-data-deletion-handler": customerDataDeletionHandler.run,
  "customer-history-lookup": customerHistoryLookup.run,
  "customer-ltv-calculator": customerLtvCalculator.run,
  "customer-readiness-check": customerReadinessCheck.run,
  "customer-service-triage": customerServiceTriage.run,
  "daily-eod": dailyEod.run,
  "daily-kickoff": dailyKickoff.run,
  "day14-voice": day14Voice.run,
  "dossier-folder-initializer": dossierFolderInitializer.run,
  "dunning-email-sequencer": dunningEmailSequencer.run,
  "email-newsletter-composer": emailNewsletterComposer.run,
  "etsy-listing-writer": etsyListingWriter.run,
  "etsy-pricing-validator": etsyPricingValidator.run,
  "etsy-product-mockup-prompts": etsyProductMockupPrompts.run,
  "etsy-shop-policies-generator": etsyShopPoliciesGenerator.run,
  "etsy-tag-researcher": etsyTagResearcher.run,
  "feedback-classifier": feedbackClassifier.run,
  "growth-metrics-dashboard": growthMetricsDashboard.run,
  "image-generator": imageGenerator.run,
  "inbound-classifier": inboundClassifier.run,
  "instagram-reel-caption-writer": instagramReelCaptionWriter.run,
  "intake-parser": intakeParser.run,
  "internal-link-suggester": internalLinkSuggester.run,
  "lead-first-touch-personalizer": leadFirstTouchPersonalizer.run,
  "lead-source-tracker": leadSourceTracker.run,
  "mrr-calculator": mrrCalculator.run,
  "multi-tenant-mrr-aggregator": multiTenantMrrAggregator.run,
  "per-tenant-daily-rollup": perTenantDailyRollup.run,
  "pod-design-brief-generator": podDesignBriefGenerator.run,
  "pod-niche-researcher": podNicheResearcher.run,
  "pod-product-mix-recommender": podProductMixRecommender.run,
  "printify-product-creator": printifyProductCreator.run,
  "refund-handler": refundHandler.run,
  "review-sentiment-scorer": reviewSentimentScorer.run,
  "skill-coverage-auditor": skillCoverageAuditor.run,
  "skill-deprecation-flagger": skillDeprecationFlagger.run,
  "skill-gap-detector": skillGapDetector.run,
  "skill-naming-validator": skillNamingValidator.run,
  "skill-promotion-criteria": skillPromotionCriteria.run,
  "skill-spec-generator": skillSpecGenerator.run,
  "social-cross-post": socialCrossPost.run,
  "subscription-pause-handler": subscriptionPauseHandler.run,
  "tiktok-caption-writer": tiktokCaptionWriter.run,
  "upsell-detection": upsellDetection.run,
  "uptime-monitor": uptimeMonitor.run,
  "viral-hook-rewriter": viralHookRewriter.run,
  "win-back-campaign-trigger": winBackCampaignTrigger.run,
  "youtube-shorts-caption-writer": youtubeShortsCaptionWriter.run,
});

/**
 * Names of every skill present in `SKILL_RUNNERS`. Useful for inventory
 * tooling that wants to compare against the SKILL.md spec directory.
 */
export const MIGRATED_SKILL_NAMES: readonly string[] = Object.freeze(
  Object.keys(SKILL_RUNNERS)
);

/**
 * Dispatch a skill by its canonical name using the synchronous map.
 * Returns `null` if the name isn't migrated (caller can fall back to the
 * dynamic-import path in skill-runner or the LLM agent loop).
 */
export async function runSkillByName(
  name: string,
  ctx: SkillInvocationContext
): Promise<SkillOutcome | null> {
  const runner = SKILL_RUNNERS[name];
  if (!runner) return null;
  return runner(ctx);
}

/** Whether a given skill name has a hand-coded TS port available. */
export function isSkillMigrated(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(SKILL_RUNNERS, name);
}
