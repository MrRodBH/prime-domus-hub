# RM Prime import — Part 4b: social campaigns

## Authority and continuity
- Owner request (2026-11-09): continue approved phased import of RM Prime Campanhas, preserving SaaS governance.
- Consulted root AGENTS.md, OWNER_UI_APPROVALS.md, ARCHITECTURE_CONSTITUTION.md, PR-M2-functional-completion-impact-analysis.md and CMS workflow execution evidence.
- Source: read-only RM Prime snapshot 71f0c969, original campaigns route, CriativosCampanha, CopyDownloadsCampanha and campaign rules; owner-uploaded campaigns/creative CSVs.
- Historical PR-M2 impersonation allowances are superseded by the owner's later prohibition. No platform identity may operate this module.

## Model reconciliation
Existing cms_campaigns are versioned website notices. Imported campaigns are property social-media production workflows. They are distinct domains, not interchangeable schemas. Keep website campaign storage, public rendering and existing detail routes intact. Add tenant_social_campaigns and tenant_social_campaign_creatives, referencing existing tenant properties. No replacement of CMS publication rules.

## Scope
Import original property cards and destination/format/photo selection, creative direction, carousel review, creative approval, copy editing and approved downloads. Import two real CSV campaigns and five artworks with their original relationships; media must be copied to tenant-owned storage, never hotlinked to the old project. Restore the property's campaign eligibility switch.

## Boundaries
Use requireTenant plus existing authorizeTenantCampaignOperation for server calls. RLS must additionally enforce current tenant and tenant owner/admin or existing CMS campaign permission. Property and photo references are verified inside the tenant. Active and campaign-eligible properties alone allow mutations; inactive properties retain read-only historical campaigns. Enforce photo limits, unique photo selection, carousel review, revision conflicts and approval completeness on the server, not only controls. Keep infrastructure, authentication, domains, shortcuts, Super Admin navigation and website publication unchanged.

## Delivery gaps
No external Meta publishing or live advertising/spend is authorized by this UI import. Imported media retrieval must succeed before claiming all five artworks copied. AI image/video production needs tenant-brand and upload-target provenance adaptation; show unavailable controls rather than substitute demonstration operations. Record implemented and unavailable flows explicitly in delivery evidence.

## Verification
Focused tests of format limits, active-property eligibility, structure-change approval invalidation and carousel completeness; original campaign rule tests where compatible. Run approved navigation regression. Authenticated browser: real RM Prime list, existing campaign form, save direction, read back, creative gallery and approval/download gates; desktop and mobile checks. No advertising campaign launch or email delivery in automated verification.