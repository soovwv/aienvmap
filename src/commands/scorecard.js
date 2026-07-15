import { productScorecard } from "../scorecard.js";

export async function scorecardWorkspace(args = {}) {
  const scorecard = productScorecard();
  if (args.json) {
    console.log(JSON.stringify(scorecard, null, 2));
  } else {
    console.log("aienvmap product scorecard");
    console.log(`overall: ${scorecard.overall.score}/100 (${scorecard.overall.confidence} confidence)`);
    console.log(`technical readiness: ${scorecard.technicalReadiness.score}/100`);
    console.log(`market readiness: ${scorecard.marketReadiness.score}/100`);
    console.log(`market validation: ${scorecard.marketValidation.score}/100`);
    console.log(`0.2.0 qualified: ${scorecard.releaseAssessment.qualified}`);
    console.log(`position: ${scorecard.positioning}`);
    console.log(`next: ${scorecard.nextPriorities[0].outcome}`);
    console.log(`rule: ${scorecard.rule}`);
  }
  return scorecard;
}
