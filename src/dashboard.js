import { aiFallbackRead, aiSessionUseContract, aiStartupChecklist } from "./ai-contract.js";
import { schemaContract } from "./contract.js";

export const dashboardEssentialCards = Object.freeze([
  "AI Session",
  "Environment Health",
  "AI Collaboration",
  "Light SBOM",
  "Agent Pointers",
  "Agent Intents",
  "Environment Ledger",
  "Enforcement Mode",
  "Release Readiness"
]);

export const dashboardEssentialSurfaces = Object.freeze({
  controlStrip: ["AI readiness", "Freshness", "Collaboration", "SBOM risk"],
  tenSecondReview: ["AI entry", "Next command", "Review target", "Mode"],
  nextCommand: "Next command",
  firstRead: ["AI bootstrap", "Status", "Freshness", "AI entry", "Maintenance", "Start here", "Read first", "AI discovery", "Review targets", "Local mode"],
  essentialCards: dashboardEssentialCards,
  rule: "Keep the control strip, 10-second review, next command, first-read brief, and essential cards visible before adding support cards; the dashboard is a human view of the AI startup contract."
});

export const dashboardSurfaceBudget = Object.freeze({
  mode: "essential-first",
  primaryReviewTime: "10 seconds",
  defaultPriority: ["controlStrip", "tenSecondReview", "nextCommand", "firstRead", "essentialCards"],
  supportCardRule: "Support cards may exist, but must not hide or replace the essential AI startup surfaces.",
  noGrowthRule: "Prefer reusing existing Light SBOM, AI Session, Collaboration, Release Readiness, and Agent Pointers cards before adding new dashboard cards."
});

export const dashboardDiscoveryFallback = Object.freeze({
  command: "aienvmap start --json",
  entry: ".aienvmap/discovery.json",
  decisionValues: ["auto-ready", "fallback-required"],
  nextSetupCommand: "aienvmap onboard",
  startupChecklist: aiStartupChecklist,
  read: aiFallbackRead,
  sessionUse: aiSessionUseContract(),
  aiEntryFields: ["readFirst", "nextCommand", "nextSetupCommand", "beforeEnvironmentChange", "afterEnvironmentChange", "handoff", "copyPastePrompt"],
  rule: "When automatic instruction-file discovery is uncertain, show the one-command AI startup fallback before lower-level discovery details."
});

export const dashboardReleaseDefaults = Object.freeze({
  target: "0.2.0",
  status: "prototype-hardening",
  decision: "hold",
  next: "Keep accumulating tested changes until the batch is intentionally versioned.",
  batchStatus: "accumulating",
  batchType: "stability-batch",
  gate: "npm run release:check passes locally",
  evidence: "npm run release:check",
  focus: "AI contract stabilization",
  publishWhen: "meaningful changes are batched",
  holdWhen: "changes can be batched",
  contractReviewStatus: "freeze-candidate-verified",
  contractReviewCommand: "npm run contract:check",
  batchRule: "Batch meaningful changes before one npm publish.",
  publishRule: "Treat publishGate.status as the single AI-readable npm publish decision; local commits may continue while npm publish remains held.",
  stableContractRule: "After 0.2.0, documented JSON fields stay additive and backward-compatible."
});

export const dashboardQualityDefaults = Object.freeze({
  status: "prototype-hardening",
  principles: ["AI-friendly", "simple", "lightweight", "advisory-first", "batched-release"],
  firstCheck: "AI entry path",
  evidence: "aienvmap start --json && aienvmap context --json",
  mustStayTrue: "do not require background services, daemons, or lock managers for the default flow",
  rule: "Keep the default product lightweight and AI-readable before adding deeper integrations."
});

export function dashboardPayload(manifest, timeline = [], warnings = [], intents = [], policy = {}) {
  const schema = schemaContract();
  const releaseReadiness = schema.releaseReadiness;
  const schemaQualitySignals = schema.qualitySignals;
  const schemaAiAdoptionDecision = schema.aiAdoptionDecision;
  const schemaAgentDiscovery = schema.agentDiscovery;
  return {
    manifest,
    timeline,
    warnings,
    intents,
    policy,
    releaseReadiness,
    schemaQualitySignals,
    schemaAiAdoptionDecision,
    schemaAgentDiscovery
  };
}

export function dashboardCardPriority(title) {
  return dashboardEssentialCards.includes(title) ? "essential" : "support";
}

export function dashboardEssentialSurfaceClientScript() {
  return [
    `const essentialSurfaces=${JSON.stringify(dashboardEssentialSurfaces)};`
  ].join("\n");
}

export function dashboardPriorityClientScript() {
  return [
    `const essentialCards=${JSON.stringify(dashboardEssentialCards)};`,
    "const cardPriority=title=>essentialCards.includes(title)?'essential':'support';"
  ].join("\n");
}

export function dashboardCardClientScript() {
  return [
    "const card=(title,badge,body)=>`<section class=\"card ${cardPriority(title)}\" data-dashboard-priority=\"${cardPriority(title)}\"><div class=\"card-head\"><h2>${title}</h2>${badge||''}</div>${body}</section>`;"
  ].join("\n");
}

export function dashboardMainCardsClientScript() {
  return [
    "const mainCards=[",
    "['Runtimes',`<span class=\"pill\">${entries(manifest.runtimes).length} found</span>`,`<table>${rows(manifest.runtimes)}</table>`],",
    "['Package Managers',`<span class=\"pill\">${entries(manifest.packageManagers).length} found</span>`,`<table>${rows(manifest.packageManagers)}</table>`],",
    "['Containers',manifest.containers?.docker?'<span class=\"pill\">available</span>':'<span class=\"pill off\">not detected</span>',`<table>${rows(manifest.containers)}</table>`],",
    "['Project Hints',`<span class=\"pill\">${entries(manifest.projectHints).length} hints</span>`,`<table>${rows(manifest.projectHints)}</table>`],",
    "['Global Inventory',manifest.inventory?.enabled?'<span class=\"pill\">deep</span>':'<span class=\"pill off\">basic</span>',inventoryHtml],",
    "['Dependency Snapshot','<span class=\"pill\">'+(depSummary.packages||0)+' packages</span>',depHtml],",
    "['Light SBOM','<span class=\"pill\">'+(lightSbomSummary.packages||0)+' packages</span>',lightSbomHtml],",
    "['Security Summary',sec.enabled?'<span class=\"pill warn\">security</span>':'<span class=\"pill off\">basic</span>',securityHtml]",
    "];",
    "const mainCardsHtml=mainCards.map(([title,badge,body])=>card(title,badge,body)).join('');"
  ].join("\n");
}

export function dashboardOperationalCardsClientScript() {
  return [
    "const operationalCards=[",
    "['Enforcement Mode','<span class=\"pill\">advisory</span>',enforcementHtml],",
    "['Release Readiness','<span class=\"pill warn\">'+esc(releaseReadiness?.target||'0.2.0')+'</span>',releaseReadinessHtml],",
    "['Quality Signals','<span class=\"pill\">'+esc(qualitySignals.status||'prototype-hardening')+'</span>',qualitySignalsHtml],",
    "['CI Readiness',ciHasFailure?'<span class=\"pill warn\">review</span>':'<span class=\"pill\">ready</span>',ciReadinessHtml]",
    "];",
    "const operationalCardsHtml=operationalCards.map(([title,badge,body])=>card(title,badge,body)).join('<div style=\"height:14px\"></div>');"
  ].join("\n");
}

export function dashboardSupportCardsClientScript() {
  return [
    "const supportCards=[",
    "['Recommended Actions','<span class=\"pill\">'+actions.length+' actions</span>',actionsHtml],",
    "['AI Intent Targets','<span class=\"pill\">'+intentTargets.length+' targets</span>',intentTargetsHtml],",
    "['Follow-ups',(followUpPlan.status==='pending'||followUps.length)?'<span class=\"pill warn\">'+(followUpPlan.count||followUps.length)+' pending</span>':'<span class=\"pill\">clear</span>',followUpsHtml],",
    "['Agent Activity',agentActivity.multiActorTargets?.length?'<span class=\"pill warn\">'+agentActivity.multiActorTargets.length+' shared</span>':'<span class=\"pill\">clear</span>',activityHtml],",
    "['AI Collaboration',collaboration.status==='clear'?'<span class=\"pill\">clear</span>':'<span class=\"pill warn\">review</span>',collaborationHtml],",
    "['Environment Protocol','<span class=\"pill\">'+esc(environmentProtocol.mode||'advisory')+'</span>',environmentProtocolHtml],",
    "['AI Session','<span class=\"pill\">'+esc(aiSession.localWork||'allowed')+'</span>',aiSessionHtml],",
    "['AI Contract','<span class=\"pill\">'+(contract.stability||'additive')+'</span>',contractHtml],",
    "['Dependency Read Set','<span class=\"pill\">'+dependencyReadSet.length+' files</span>',dependencyReadSetHtml],",
    "['Dependency Protocol','<span class=\"pill\">'+(dependencyProtocol.mode||'advisory')+'</span>',dependencyProtocolHtml],",
    "['AI Plan Artifacts',plan.markdown||plan.json?'<span class=\"pill\">written</span>':'<span class=\"pill off\">not written</span>',planHtml],",
    "['Light SBOM Artifact','<span class=\"pill\">json</span>',sbomArtifactHtml],",
    "['Remediation Steps',remediation.length?'<span class=\"pill warn\">'+remediation.length+' items</span>':'<span class=\"pill off\">none</span>',remediationHtml],",
    "['Environment Steps',envSteps.length?'<span class=\"pill warn\">'+envSteps.length+' items</span>':'<span class=\"pill off\">none</span>',envStepsHtml]",
    "];",
    "const supportCardsHtml=supportCards.map(([title,badge,body])=>card(title,badge,body)).join('<div style=\"height:14px\"></div>');"
  ].join("\n");
}

export function dashboardStateCardsClientScript() {
  return [
    "const stateCards=[",
    "['Environment Health',warnings.length?'<span class=\"pill warn\">attention</span>':'<span class=\"pill\">clear</span>',warnHtml],",
    "['Version Policy','<span class=\"pill\">'+entries(policy).length+' rules</span>',policyHtml],",
    "['Agent Intents','<span class=\"pill\">'+intents.length+' open</span>',intentsHtml],",
    "['AI Handoff',reviewRequired?'<span class=\"pill warn\">review</span>':'<span class=\"pill\">ready</span>',handoffHtml],",
    "['Agent Pointers','<span class=\"pill\">'+agentPointerCount+' installed</span>','<div class=\"path\">'+esc(agentDiscoveryNext)+'</div>'+agentDiscoveryFallbackHtml+'<div class=\"agents\">'+agentCards+'</div>'],",
    "['Snapshot','',`<table><tr><th>OS</th><td>${esc(manifest.os.platform)} ${esc(manifest.os.release)} ${esc(manifest.os.arch)}</td></tr><tr><th>Shell</th><td>${esc(manifest.os.shell||'unknown')}</td></tr><tr><th>Workspace</th><td><div class=\"path\">${esc(manifest.workspace.path)}</div></td></tr></table>`]",
    "];",
    "const stateCardsHtml=stateCards.map(([title,badge,body])=>card(title,badge,body)).join('<div style=\"height:14px\"></div>');"
  ].join("\n");
}

export function dashboardDiscoveryFallbackClientScript() {
  return [
    `const dashboardDiscoveryFallback=${JSON.stringify(dashboardDiscoveryFallback)};`,
    "const agentDiscoveryFallbackRead=manifest.preflight?.agentPointers?.fallbackRead||dashboardDiscoveryFallback.read;",
    "const agentDiscoveryFallbackCommand=manifest.preflight?.agentPointers?.fallbackCommand||dashboardDiscoveryFallback.command;",
    "const agentDiscoveryEntry=manifest.preflight?.artifacts?.discovery||dashboardDiscoveryFallback.entry;",
    "const agentDiscoveryDecision=(agentPointerCount||0)>0?'auto-ready':'fallback-required';",
    "const agentDiscoverySetup=agentDiscoveryDecision==='auto-ready'?'none':dashboardDiscoveryFallback.nextSetupCommand;",
    "const agentDiscoveryChecklist=dashboardDiscoveryFallback.startupChecklist||[];",
    "const agentDiscoveryAiEntryFields=dashboardDiscoveryFallback.aiEntryFields||[];",
    "const agentSessionUse=(schemaAgentDiscovery?.sessionUse)||dashboardDiscoveryFallback.sessionUse||{};",
    "const agentDiscoveryFallbackHtml=`<table><tr><th>Entry</th><td><code>${esc(agentDiscoveryEntry)}</code></td></tr><tr><th>sessionUse</th><td><code>${esc(agentSessionUse.proofCommand||'aienvmap discover --json')}</code> / <code>${esc(agentSessionUse.fallbackPromptField||'copyPastePrompt')}</code></td></tr><tr><th>aiEntry</th><td>${esc(agentDiscoveryAiEntryFields.join(', ')||'readFirst, nextCommand, copyPastePrompt')}</td></tr><tr><th>Decision</th><td><code>${esc(agentDiscoveryDecision)}</code></td></tr><tr><th>Setup</th><td><code>${esc(agentDiscoverySetup)}</code></td></tr><tr><th>Fallback</th><td><code>${esc(agentDiscoveryFallbackCommand)}</code></td></tr><tr><th>Read</th><td><code>${esc(agentDiscoveryFallbackRead.slice(0,4).join(' -> '))}</code></td></tr></table><div class=\"timeline\">${agentDiscoveryChecklist.slice(0,4).map(item=>`<div class=\"event\"><time>startup</time><div>${esc(item)}</div></div>`).join('')}</div><div class=\"path\">${esc(agentSessionUse.rule||'Use copyPastePrompt when automatic discovery is uncertain.')}</div>`;"
  ].join("\n");
}

export function dashboardAgentClientScript() {
  return [
    "const agentNames={agents:'Codex',claude:'Claude',gemini:'Gemini'};",
    "const agentInfo=v=>typeof v==='object'&&v? v : {exists:!!v,hasAienvmapPointer:!!v,path:''};",
    "const agentHasPointer=v=>agentInfo(v).hasAienvmapPointer===true;",
    "if(agentInfo(manifest.agentFiles?.cursor).exists||agentHasPointer(manifest.agentFiles?.cursor))agentNames.cursor='Cursor';",
    "if(agentInfo(manifest.agentFiles?.copilot).exists||agentHasPointer(manifest.agentFiles?.copilot))agentNames.copilot='Copilot';",
    "const agentStatus=v=>agentHasPointer(v)?'aienvmap pointer installed':(agentInfo(v).exists?'file detected, pointer missing':'not detected');",
    "const agentCards=Object.entries(agentNames).map(([key,label])=>`<div class=\"agent\"><strong>${label}</strong><span>${esc(agentStatus(manifest.agentFiles?.[key]))}</span>${agentInfo(manifest.agentFiles?.[key]).installCommand?`<span class=\"path\">${esc(agentInfo(manifest.agentFiles?.[key]).installCommand)}</span>`:''}</div>`).join('');",
    "const agentPointerCount=entries(manifest.agentFiles).filter(([,v])=>agentHasPointer(v)).length;"
  ].join("\n");
}

export function dashboardScannerGuidanceClientScript() {
  return [
    "const scannerGuidance=lightSbom.scannerGuidance||{mode:'optional-read-only',defaultCommand:'aienvmap sbom --json',scannerCommand:'aienvmap sync --security',securityConfidence:aiDependencyReview.securityConfidence||'unknown',externalTools:[{tool:'syft'},{tool:'trivy'},{tool:'grype'},{tool:'dependency-track'}],interoperabilityRule:'Use aienvmap as the AI coordination layer and dedicated scanners for full evidence.',whenToRun:['before security claims','before vulnerability remediation','before release decisions'],rule:'Keep the default SBOM lightweight for AI coordination; use optional read-only scanners only when security confidence matters.'};"
  ].join("\n");
}

export function dashboardReviewPlanClientScript() {
  return [
    "const aiReviewPlan=lightSbom.aiReviewPlan||{status:aiDependencyReview.status||'ready',risk:(riskSummary.level||'clear')+'/'+(riskSummary.score||0),securityConfidence:aiDependencyReview.securityConfidence||'unknown',packageManagerPolicy:pmPolicy.status||'not-detected',packages:lightSbomSummary.packages||0,vulnerabilities:lightSbomSummary.vulnerabilities||0,reviewTargets:aiDependencyReview.reviewTargets||riskSummary.reviewTargets||[],beforeChange:aiDependencyReview.beforeDependencyChange?.[0]||riskSummary.commands?.[0]||'aienvmap sbom --json',afterChange:aiDependencyReview.afterDependencyChange?.slice(-1)[0]||'aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency',rule:aiDependencyReview.rule||'Record dependency intent before dependency or lockfile changes.'};"
  ].join("\n");
}

export function dashboardAiUseClientScript() {
  return [
    "const aiUse=lightSbom.aiUse||{decision:aiReviewPlan.status||aiDependencyReview.status||'ready',securityConfidence:aiReviewPlan.securityConfidence||aiDependencyReview.securityConfidence||'unknown',scannerCommand:scannerGuidance.scannerCommand||'aienvmap sync --security',nextCommand:aiReviewPlan.beforeChange||aiDependencyReview.beforeDependencyChange?.[0]||'aienvmap sbom --json',readFirst:['.aienvmap/sbom.json','.aienvmap/status.json','aienvmap context --json'],mustNotDo:['do not run broad install, update, audit fix, or lockfile rewrite commands before reading SBOM and status'],rule:'Use aiUse as the shortest AI dependency/security safety summary.'};"
  ].join("\n");
}

export function dashboardAiUseHtmlClientScript() {
  return [
    "const aiUseHtml=`<table><tr><th>Decision</th><td><code>${esc(aiUse.decision||'ready')}</code></td></tr><tr><th>Confidence</th><td><code>${esc(aiUse.securityConfidence||'unknown')}</code></td></tr><tr><th>Next</th><td><code>${esc(aiUse.nextCommand||'aienvmap sbom --json')}</code></td></tr><tr><th>Scanner</th><td><code>${esc(aiUse.scannerCommand||'aienvmap sync --security')}</code></td></tr><tr><th>Read</th><td><code>${esc((aiUse.readFirst||[]).join(' -> ')||'.aienvmap/sbom.json')}</code></td></tr></table><div class=\"timeline\">${(aiUse.mustNotDo||[]).slice(0,3).map(item=>`<div class=\"event\"><time>avoid</time><div>${esc(item)}</div></div>`).join('')}</div><div class=\"path\">${esc(aiUse.rule||'Use aiUse as the shortest AI dependency/security safety summary.')}</div>`;"
  ].join("\n");
}

export function dashboardDependencyReviewClientScript() {
  return [
    "const aiDependencyReviewHtml=aiDependencyReview.status?`<table><tr><th>Status</th><td><code>${esc(aiDependencyReview.status)}</code> ${esc(aiDependencyReview.mode||'advisory')}</td></tr><tr><th>Reason</th><td>${esc(aiDependencyReview.statusReason||'No dependency review reason provided.')}</td></tr><tr><th>Security confidence</th><td><code>${esc(aiDependencyReview.securityConfidence||'unknown')}</code></td></tr><tr><th>Read first</th><td>${esc((aiDependencyReview.readFirst||[]).join(', ')||'riskSummary')}</td></tr><tr><th>Targets</th><td>${esc((aiDependencyReview.reviewTargets||[]).join(', ')||'none')}</td></tr><tr><th>Before</th><td><code>${esc((aiDependencyReview.beforeDependencyChange||[]).slice(0,3).join(' -> ')||'aienvmap intent --actor agent:id --action dependency-review --target dependency')}</code></td></tr><tr><th>After</th><td><code>${esc((aiDependencyReview.afterDependencyChange||[]).slice(-1)[0]||'aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency')}</code></td></tr></table><div class=\"path\">${esc(aiDependencyReview.rule||'Dependency review is advisory and non-blocking.')}</div>`:'<div class=\"okline\">No AI dependency review block available. Run <code>aienvmap sync</code>.</div>';"
  ].join("\n");
}

export function dashboardDependencyCoordinationClientScript() {
  return [
    "const dependencyCoordination=lightSbom.dependencyCoordination||{mode:'advisory',readFirst:['.aienvmap/discovery.json','.aienvmap/sbom.json','.aienvmap/status.json','.aienvmap/summary.md','aienvmap context --json'],reviewTargets:aiDependencyReview.reviewTargets||riskSummary.reviewTargets||[],nextCommand:aiDependencyReview.beforeDependencyChange?.[0]||riskSummary.commands?.[0]||'aienvmap sbom --json',beforeChange:aiDependencyReview.beforeDependencyChange||['aienvmap intent --actor agent:id --action dependency-review --target dependency'],afterChange:aiDependencyReview.afterDependencyChange||['run the narrowest relevant project validation','aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency'],mustNotDo:['do not run broad install, update, audit fix, or lockfile rewrite commands before reading SBOM and status'],scannerEvidence:scannerGuidance.decision||'light-sbom-ok-for-coordination',rule:'Use the light SBOM to coordinate dependency work; record intent, use scanner evidence when needed, then checkpoint and hand off.'};",
    "const dependencyQuickCheck=lightSbom.dependencyQuickCheck||{status:dependencyCoordination.reviewTargets?.length?'review':'ready',readFirst:dependencyCoordination.readFirst,nextCommand:dependencyCoordination.nextCommand,reviewTargets:dependencyCoordination.reviewTargets||[],scannerEvidence:dependencyCoordination.scannerEvidence||scannerGuidance.decision||'light-sbom-ok-for-coordination',beforeChange:dependencyCoordination.beforeChange||[],afterChange:dependencyCoordination.afterChange||[],mustNotDo:dependencyCoordination.mustNotDo||[],rule:'Use this compact block as the first AI dependency-work decision.'};",
    "const dependencyQuickCheckHtml=`<table><tr><th>Status</th><td><code>${esc(dependencyQuickCheck.status||'ready')}</code></td></tr><tr><th>Next</th><td><code>${esc(dependencyQuickCheck.nextCommand||'aienvmap sbom --json')}</code></td></tr><tr><th>Targets</th><td>${esc((dependencyQuickCheck.reviewTargets||[]).join(', ')||'none')}</td></tr><tr><th>Scanner evidence</th><td><code>${esc(dependencyQuickCheck.scannerEvidence||'light-sbom-ok-for-coordination')}</code></td></tr><tr><th>Read</th><td><code>${esc((dependencyQuickCheck.readFirst||[]).join(' -> '))}</code></td></tr></table><div class=\"timeline\">${(dependencyQuickCheck.mustNotDo||[]).slice(0,3).map(item=>`<div class=\"event\"><time>avoid</time><div>${esc(item)}</div></div>`).join('')}</div><div class=\"path\">${esc(dependencyQuickCheck.rule||'Use this compact block as the first AI dependency-work decision.')}</div>`;",
    "const dependencyCoordinationHtml=`<table><tr><th>Mode</th><td><code>${esc(dependencyCoordination.mode||'advisory')}</code></td></tr><tr><th>Read</th><td><code>${esc((dependencyCoordination.readFirst||[]).join(' -> '))}</code></td></tr><tr><th>Next</th><td><code>${esc(dependencyCoordination.nextCommand||'aienvmap sbom --json')}</code></td></tr><tr><th>Targets</th><td>${esc((dependencyCoordination.reviewTargets||[]).join(', ')||'none')}</td></tr><tr><th>Scanner evidence</th><td><code>${esc(dependencyCoordination.scannerEvidence||'light-sbom-ok-for-coordination')}</code></td></tr><tr><th>Before</th><td><code>${esc((dependencyCoordination.beforeChange||[]).slice(0,3).join(' -> '))}</code></td></tr><tr><th>After</th><td><code>${esc((dependencyCoordination.afterChange||[]).slice(-1)[0]||'aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency')}</code></td></tr></table><div class=\"timeline\">${(dependencyCoordination.mustNotDo||[]).slice(0,3).map(item=>`<div class=\"event\"><time>avoid</time><div>${esc(item)}</div></div>`).join('')}</div><div class=\"path\">${esc(dependencyCoordination.rule||'Coordinate dependency work through SBOM, intent, scanner evidence, checkpoint, and handoff.')}</div>`;"
  ].join("\n");
}

export function dashboardReviewPlanHtmlClientScript() {
  return [
    "const aiReviewPlanHtml=aiReviewPlan.status?`<table><tr><th>Status</th><td><code>${esc(aiReviewPlan.status)}</code></td></tr><tr><th>Risk</th><td><code>${esc(aiReviewPlan.risk||'clear/0')}</code></td></tr><tr><th>Confidence</th><td><code>${esc(aiReviewPlan.securityConfidence||'unknown')}</code></td></tr><tr><th>Policy</th><td><code>${esc(aiReviewPlan.packageManagerPolicy||'not-detected')}</code></td></tr><tr><th>Before</th><td><code>${esc(aiReviewPlan.beforeChange||'aienvmap sbom --json')}</code></td></tr><tr><th>After</th><td><code>${esc(aiReviewPlan.afterChange||'aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency')}</code></td></tr></table><div class=\"path\">${esc(aiReviewPlan.rule||'Record dependency intent before dependency or lockfile changes.')}</div>`:'<div class=\"okline\">No AI review plan available. Run <code>aienvmap sbom --json</code>.</div>';"
  ].join("\n");
}

export function dashboardScannerGuidanceHtmlClientScript() {
  return [
    "const scannerTools=(scannerGuidance.externalTools||[]).map(t=>t.tool||t).filter(Boolean).join(', ');",
    "const scannerWorkflow=scannerGuidance.evidenceWorkflow||['read aienvmap light SBOM, status, and context','run dedicated scanner evidence only when security confidence matters','record intent, checkpoint, and hand off after accepted changes'];",
    "const scannerGuidanceHtml=`<table><tr><th>Mode</th><td><code>${esc(scannerGuidance.mode||'optional-read-only')}</code></td></tr><tr><th>Decision</th><td><code>${esc(scannerGuidance.decision||'light-sbom-ok-for-coordination')}</code></td></tr><tr><th>Reason</th><td>${esc(scannerGuidance.reason||'Use scanner evidence only when security confidence matters.')}</td></tr><tr><th>Default</th><td><code>${esc(scannerGuidance.defaultCommand||'aienvmap sbom --json')}</code></td></tr><tr><th>Scanner</th><td><code>${esc(scannerGuidance.scannerCommand||'aienvmap sync --security')}</code></td></tr><tr><th>Tools</th><td>${esc(scannerTools||'Syft, Trivy, Grype, Dependency-Track')}</td></tr><tr><th>Confidence</th><td><code>${esc(scannerGuidance.securityConfidence||'unknown')}</code></td></tr><tr><th>Run before</th><td>${esc((scannerGuidance.whenToRun||[]).join(', ')||'security-sensitive decisions')}</td></tr><tr><th>Evidence rule</th><td>${esc(scannerGuidance.interoperabilityRule||'Use aienvmap as the AI coordination layer and dedicated scanners for full evidence.')}</td></tr></table><div class=\"timeline\">${scannerWorkflow.slice(0,5).map(step=>`<div class=\"event\"><time>evidence</time><div>${esc(step)}</div></div>`).join('')}</div><div class=\"path\">${esc(scannerGuidance.rule||'Keep the default SBOM lightweight; use optional read-only scanners when security confidence matters.')}</div>`;"
  ].join("\n");
}

export function dashboardSbomClientScripts() {
  return [
    dashboardScannerGuidanceClientScript(),
    dashboardReviewPlanClientScript(),
    dashboardAiUseClientScript(),
    dashboardDependencyHintsClientScript(),
    dashboardPackageManagerPolicyClientScript(),
    dashboardRiskSummaryClientScript(),
    dashboardReviewPlanHtmlClientScript(),
    dashboardAiUseHtmlClientScript(),
    dashboardDependencyReviewClientScript(),
    dashboardDependencyCoordinationClientScript(),
    dashboardScannerGuidanceHtmlClientScript()
  ].join("\n");
}

export function dashboardRiskSummaryClientScript() {
  return [
    "const riskSummaryHtml=riskSummary.level?`<table><tr><th>Level</th><td><code>${esc(riskSummary.level)}</code> ${esc(riskSummary.score||0)}</td></tr><tr><th>Scanner</th><td><code>${esc(riskSummary.scanner||'unknown')}</code></td></tr><tr><th>Next</th><td>${esc(riskSummary.next||'No SBOM action required.')}</td></tr><tr><th>Targets</th><td>${esc((riskSummary.reviewTargets||[]).join(', ')||'none')}</td></tr></table>${riskSummary.signals?.length?'<div class=\"timeline\">'+riskSummary.signals.slice(0,5).map(s=>`<div class=\"event\"><time>risk</time><div>${esc(s)}</div></div>`).join('')+'</div>':''}`:'<div class=\"okline\">No risk summary available.</div>';"
  ].join("\n");
}

export function dashboardPackageManagerPolicyClientScript() {
  return [
    "const pmPolicyHtml='<table><tr><th>Status</th><td><code>'+esc(pmPolicy.status||'no-lockfile')+'</code></td></tr><tr><th>Guidance</th><td>'+esc(pmPolicy.guidance||'No lockfile policy detected.')+'</td></tr></table>';"
  ].join("\n");
}

export function dashboardDependencyHintsClientScript() {
  return [
    "const dependencyHintsHtml=dependencyHints.length?'<div class=\"timeline\">'+dependencyHints.slice(0,5).map(h=>`<div class=\"event\"><time>${esc(h.ecosystem||'deps')}</time><div><b>${esc(h.manifest)}</b> <code>${esc(h.manager||'unknown')}</code> ${esc(h.packages||0)} packages${h.riskPackages?.length?`<div class=\"path\">risk: ${esc(h.riskPackages.map(p=>p.name).join(', '))}</div>`:''}<div class=\"path\">${esc((h.groups||[]).join(', ')||'no groups')}${h.lockfiles?.length?` / lockfiles: ${esc(h.lockfiles.map(l=>l.file).join(', '))}`:''}</div></div></div>`).join('')+'</div>':'<div class=\"okline\">No dependency change hints available.</div>';"
  ].join("\n");
}

export function dashboardDependencyReadSetClientScript() {
  return [
    "const dependencyReadSetHtml=dependencyReadSet.length?'<div class=\"timeline\">'+dependencyReadSet.slice(0,5).map(d=>`<div class=\"event\"><time>${esc(d.ecosystem||'deps')}</time><div><b>${esc(d.manifest||'dependency files')}</b> <code>${esc(d.manager||'unknown')}</code><div class=\"path\">${esc([d.manifest,...(d.lockfiles||[])].filter(Boolean).join(', '))}</div>${d.riskPackages?.length?`<div class=\"path\">risk: ${esc(d.riskPackages.join(', '))}</div>`:''}</div></div>`).join('')+'</div>':'<div class=\"okline\">No dependency files detected.</div>';"
  ].join("\n");
}

export function dashboardDependencyProtocolClientScript() {
  return [
    "const dependencyProtocolHtml=dependencyProtocol.commands?'<table><tr><th>Mode</th><td><code>'+esc(dependencyProtocol.mode||'advisory')+'</code></td></tr><tr><th>Policy</th><td><code>'+esc(dependencyProtocol.packageManagerPolicy||'not-detected')+'</code></td></tr><tr><th>Intent</th><td><code>'+esc(dependencyProtocol.commands.recordIntent)+'</code></td></tr><tr><th>After</th><td><code>'+esc(dependencyProtocol.commands.checkpointAfterChange||dependencyProtocol.commands.recordAfterChange)+'</code></td></tr></table><div class=\"timeline\">'+(dependencyProtocol.mustNotDo||[]).slice(0,3).map(item=>`<div class=\"event\"><time>avoid</time><div>${esc(item)}</div></div>`).join('')+'</div>':'<div class=\"okline\">No dependency change protocol available.</div>';"
  ].join("\n");
}

export function dashboardEnvironmentProtocolClientScript() {
  return [
    "const environmentProtocol=manifest.preflight?.environmentChangeProtocol||{};",
    "const environmentProtocolHtml=environmentProtocol.commands?`<table><tr><th>Mode</th><td><code>${esc(environmentProtocol.mode||'advisory')}</code></td></tr><tr><th>Applies</th><td>${esc(environmentProtocol.appliesWhen||'Before shared environment changes.')}</td></tr><tr><th>Read</th><td><code>${esc((environmentProtocol.readFirst||[]).join(' -> ')||'aienvmap status --json')}</code></td></tr><tr><th>Intent</th><td><code>${esc(environmentProtocol.commands.recordIntent||'aienvmap intent --actor agent:id --action planned-change --target environment')}</code></td></tr><tr><th>After</th><td><code>${esc(environmentProtocol.commands.checkpointAfterChange||'aienvmap checkpoint --actor agent:id --summary what-changed --target environment')}</code></td></tr><tr><th>Handoff</th><td><code>${esc(environmentProtocol.commands.handoff||'aienvmap handoff --record --actor agent:id')}</code></td></tr></table><div class=\"timeline\">${(environmentProtocol.mustNotDo||[]).slice(0,3).map(item=>`<div class=\"event\"><time>avoid</time><div>${esc(item)}</div></div>`).join('')}</div><div class=\"path\">${esc(environmentProtocol.rule||'Keep shared environment changes advisory and recorded.')}</div>`:'<div class=\"okline\">No environment change protocol available. Run <code>aienvmap status --write</code>.</div>';"
  ].join("\n");
}

export function dashboardReleaseReadinessClientScript() {
  return [
    `const dashboardReleaseDefaults=${JSON.stringify(dashboardReleaseDefaults)};`,
    "const releaseChecks=releaseReadiness?.requiredBeforeStable||[];",
    "const publishDecision=releaseReadiness?.publishDecision||{};",
    "const currentBatch=releaseReadiness?.currentBatch||{};",
    "const releaseEvidence=releaseReadiness?.evidenceCommands||[];",
    "const releaseFocus=releaseReadiness?.stabilizationFocus||[];",
    "const publishGate=releaseReadiness?.publishGate||{};",
    "const contractReview=releaseReadiness?.contractReview||{};",
    "const releaseReadinessHtml=`<table><tr><th>Target</th><td><code>${esc(releaseReadiness?.target||dashboardReleaseDefaults.target)}</code></td></tr><tr><th>Status</th><td><code>${esc(releaseReadiness?.status||dashboardReleaseDefaults.status)}</code></td></tr><tr><th>Decision</th><td><code>${esc(publishGate.status||publishDecision.default||dashboardReleaseDefaults.decision)}</code></td></tr><tr><th>Next</th><td>${esc(publishGate.nextAction||dashboardReleaseDefaults.next)}</td></tr><tr><th>Batch</th><td><code>${esc(currentBatch.status||dashboardReleaseDefaults.batchStatus)}</code> ${esc(currentBatch.releaseType||dashboardReleaseDefaults.batchType)}</td></tr><tr><th>Gate</th><td><code>${esc(releaseChecks[0]||dashboardReleaseDefaults.gate)}</code></td></tr><tr><th>Evidence</th><td><code>${esc((publishGate.requiredEvidence||releaseEvidence)[0]||dashboardReleaseDefaults.evidence)}</code></td></tr><tr><th>Focus</th><td>${esc(releaseFocus[0]||dashboardReleaseDefaults.focus)}</td></tr><tr><th>Contract review</th><td><code>${esc(contractReview.status||dashboardReleaseDefaults.contractReviewStatus)}</code> <code>${esc(contractReview.command||dashboardReleaseDefaults.contractReviewCommand)}</code></td></tr><tr><th>Publish when</th><td>${esc((publishGate.readyWhen||publishDecision.publishWhen||[])[0]||dashboardReleaseDefaults.publishWhen)}</td></tr><tr><th>Hold when</th><td>${esc((publishGate.holdWhen||publishDecision.holdWhen||[])[0]||dashboardReleaseDefaults.holdWhen)}</td></tr></table><div class=\"timeline\">${(currentBatch.themes||[]).slice(0,5).map(item=>`<div class=\"event\"><time>batch</time><div>${esc(item)}</div></div>`).join('')}</div><div class=\"timeline\">${(contractReview.surfaces||[]).slice(0,5).map(surface=>`<div class=\"event\"><time>contract</time><div>${esc(surface)}</div></div>`).join('')}</div><div class=\"timeline\">${(publishGate.readyWhen||releaseChecks).slice(1,5).map(item=>`<div class=\"event\"><time>ready</time><div>${esc(item)}</div></div>`).join('')}</div><div class=\"timeline\">${(publishGate.requiredEvidence||releaseEvidence).slice(1,4).map(cmd=>`<div class=\"event\"><time>proof</time><div><code>${esc(cmd)}</code></div></div>`).join('')}</div><div class=\"path\">${esc(publishGate.reason||currentBatch.reason||releaseReadiness?.batchRule||dashboardReleaseDefaults.batchRule)}</div><div class=\"path\">${esc(contractReview.rule||releaseReadiness?.stableContractRule||dashboardReleaseDefaults.stableContractRule)}</div><div class=\"path\">${esc(publishGate.rule||dashboardReleaseDefaults.publishRule)}</div><div class=\"path\">${esc(releaseReadiness?.stableContractRule||dashboardReleaseDefaults.stableContractRule)}</div>`;"
  ].join("\n");
}

export function dashboardQualitySignalsClientScript() {
  return [
    `const dashboardQualityDefaults=${JSON.stringify(dashboardQualityDefaults)};`,
    "const qualitySignals=manifest.preflight?.qualitySignals||schemaQualitySignals||{};",
    "const aiAdoptionDecision=schemaAiAdoptionDecision||{};",
    "const qualityPrinciples=qualitySignals.principles||dashboardQualityDefaults.principles;",
    "const qualityChecks=qualitySignals.checks||[];",
    "const qualitySignalsHtml=`<table><tr><th>Status</th><td><code>${esc(qualitySignals.status||dashboardQualityDefaults.status)}</code></td></tr><tr><th>Principles</th><td>${esc(qualityPrinciples.join(', '))}</td></tr><tr><th>Adoption</th><td>${esc(aiAdoptionDecision.position||'AI workspace coordination tool')}</td></tr><tr><th>Start</th><td><code>${esc((aiAdoptionDecision.startWith||['aienvmap start','aienvmap onboard','aienvmap context --json']).join(' -> '))}</code></td></tr><tr><th>Skip when</th><td>${esc((aiAdoptionDecision.skipWhen||[])[0]||'full compliance SBOM scanner only')}</td></tr><tr><th>Proof</th><td><code>${esc(aiAdoptionDecision.proofCommand||'aienvmap demo --json')}</code></td></tr><tr><th>First check</th><td>${esc(qualityChecks[0]?.name||dashboardQualityDefaults.firstCheck)}</td></tr><tr><th>Evidence</th><td><code>${esc(qualityChecks[0]?.evidence||dashboardQualityDefaults.evidence)}</code></td></tr></table><div class=\"timeline\">${(aiAdoptionDecision.useWhen||[]).slice(0,3).map(item=>`<div class=\"event\"><time>adopt</time><div>${esc(item)}</div></div>`).join('')}</div><div class=\"timeline\">${qualityChecks.slice(0,5).map(item=>`<div class=\"event\"><time>quality</time><div><b>${esc(item.name)}</b> ${esc(item.signal||'')}</div></div>`).join('')}</div><div class=\"path\">${esc((qualitySignals.mustStayTrue||[])[0]||dashboardQualityDefaults.mustStayTrue)}</div><div class=\"path\">${esc(aiAdoptionDecision.rule||qualitySignals.rule||dashboardQualityDefaults.rule)}</div>`;"
  ].join("\n");
}

export function dashboardReleaseClientScripts() {
  return [
    dashboardReleaseReadinessClientScript(),
    dashboardQualitySignalsClientScript(),
    dashboardOperationalCardsClientScript()
  ].join("\n");
}

export function dashboardLayoutClientScripts() {
  return [
    dashboardEssentialSurfaceClientScript(),
    dashboardPriorityClientScript(),
    dashboardDiscoveryFallbackClientScript(),
    dashboardCardClientScript(),
    dashboardMainCardsClientScript(),
    dashboardSupportCardsClientScript()
  ].join("\n");
}
