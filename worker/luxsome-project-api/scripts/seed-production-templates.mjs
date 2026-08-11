#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const environment = args.find(arg => !arg.startsWith('--')) || 'develop';
const useLocal = args.includes('--local');
const dryRun = args.includes('--dry-run');

const allowed = new Set(['develop','staging','production']);
if (!allowed.has(environment)) {
  console.error(`Unsupported environment "${environment}". Use develop, staging, or production.`);
  process.exit(1);
}

const templates = [
  {
    key:'rigid-box-production', name:'Rigid Box Production', category:'rigid_box', sortOrder:10,
    rules:[['contains','rigid box',120],['contains','magnetic flap',115],['contains','shoulder box',110],['contains','gate box',110],['contains','collapsible rigid box',110],['contains','tray in bed',105],['contains','tray-in-bed',105],['contains','door style box',105]],
    steps:[['artwork-approval','Artwork Approval','design',1,'normal'],['material-preparation','Material Preparation','materials',1,'normal'],['printing-branding','Printing / Branding','printing',2,'normal'],['board-cutting','Board Cutting','cutting',1,'normal'],['assembly','Box Assembly','assembly',2,'normal'],['finishing','Finishing','finishing',1,'normal'],['quality-control','Quality Control','quality_check',1,'high']]
  },
  {
    key:'hang-tag-production', name:'Hang Tag Production', category:'hang_tag', sortOrder:20,
    rules:[['contains','hang tag',120],['contains','swing tag',110],['contains','clothing tag',110],['contains','single piece tag',105],['contains','2 piece tag',105],['contains','two piece tag',105],['contains','3 piece tag',105],['contains','three piece tag',105],['contains','tag',70]],
    steps:[['artwork-approval','Artwork Approval','design',1,'normal'],['print-preparation','Print Preparation','prepress',1,'normal'],['printing','Printing','printing',1,'normal'],['finishing','Lamination / Foil / Finishing','finishing',1,'normal'],['cutting','Cutting','cutting',1,'normal'],['eyelet-string','Eyelet / String Application','assembly',1,'normal'],['quality-control','Quality Control','quality_check',1,'high']]
  },
  {
    key:'branded-tissue-production', name:'Branded Tissue Production', category:'tissue', sortOrder:30,
    rules:[['contains','branded tissue',120],['contains','tissue paper',110],['contains','wrapping tissue',105],['contains','tissue',80]],
    steps:[['artwork-approval','Artwork Approval','design',1,'normal'],['print-preparation','Print Preparation','prepress',1,'normal'],['printing','Printing','printing',1,'normal'],['drying-curing','Drying / Curing','finishing',1,'normal'],['quality-control','Quality Control','quality_check',1,'high']]
  },
  {
    key:'thank-you-card-envelope-production', name:'Thank You Card / Envelope Production', category:'card_envelope', sortOrder:40,
    rules:[['contains','thank you card',120],['contains','thank-you card',120],['contains','thankyou card',115],['contains','thank you note',110],['contains','thank-you note',110],['contains','envelope',95]],
    steps:[['artwork-approval','Artwork Approval','design',1,'normal'],['printing','Printing','printing',1,'normal'],['finishing','Finishing / Foil / Lamination','finishing',1,'normal'],['cutting','Cutting','cutting',1,'normal'],['quality-control','Quality Control','quality_check',1,'high']]
  },
  {
    key:'shopping-bag-production', name:'Shopping Bag Production', category:'shopping_bag', sortOrder:50,
    rules:[['contains','shopping bag',120],['contains','paper bag',110],['contains','carrier bag',100],['contains','branded bag',95]],
    steps:[['artwork-approval','Artwork Approval','design',1,'normal'],['material-preparation','Material Preparation','materials',1,'normal'],['printing','Printing','printing',2,'normal'],['finishing','Lamination / Finishing','finishing',1,'normal'],['cutting-creasing','Cutting / Creasing','cutting',1,'normal'],['assembly','Bag Assembly','assembly',2,'normal'],['handle-application','Handle Application','assembly',1,'normal'],['quality-control','Quality Control','quality_check',1,'high']]
  },
  {
    key:'sticker-production', name:'Sticker Production', category:'sticker', sortOrder:60,
    rules:[['contains','sticker seal',120],['contains','branded sticker',115],['contains','thank you sticker',110],['contains','sticker',80]],
    steps:[['artwork-approval','Artwork Approval','design',1,'normal'],['printing','Printing','printing',1,'normal'],['finishing','Finishing','finishing',1,'normal'],['cutting','Cutting','cutting',1,'normal'],['quality-control','Quality Control','quality_check',1,'high']]
  },
  {
    key:'tier-1-packaging-system', name:'Tier 1 Packaging System', category:'packaging_system', sortOrder:100,
    rules:[['contains','tier 1 packaging system',150],['contains','tier 1',130],['contains','foundation packaging system',125],['contains','foundation system',120]],
    steps:[['project-review','Project Review','planning',1,'normal'],['artwork-approval','Artwork / Specification Approval','design',1,'normal'],['material-preparation','Material Preparation','materials',1,'normal'],['production','Packaging Production','production',3,'normal'],['quality-control','Quality Control','quality_check',1,'high'],['packing','Packing','packing',1,'normal']]
  },
  {
    key:'tier-2-packaging-system', name:'Tier 2 Packaging System', category:'packaging_system', sortOrder:110,
    rules:[['contains','tier 2 packaging system',150],['contains','tier 2',130],['contains','signature packaging system',125],['contains','signature system',120]],
    steps:[['project-review','Project Review','planning',1,'normal'],['artwork-approval','Artwork / Specification Approval','design',1,'normal'],['material-planning','Material Planning','materials',1,'normal'],['printing-branding','Printing / Branding','printing',2,'normal'],['production','Packaging Production','production',4,'normal'],['finishing','Finishing','finishing',1,'normal'],['quality-control','Quality Control','quality_check',1,'high'],['packing','Packing','packing',1,'normal']]
  },
  {
    key:'tier-3-packaging-system', name:'Tier 3 Packaging System', category:'packaging_system', sortOrder:120,
    rules:[['contains','tier 3 packaging system',150],['contains','tier 3',130],['contains','prestige packaging system',125],['contains','prestige system',120]],
    steps:[['project-review','Project Review','planning',1,'normal'],['artwork-approval','Artwork / Specification Approval','design',1,'normal'],['material-planning','Material Planning','materials',1,'normal'],['sample-prototype','Sample / Prototype','sampling',2,'normal'],['sample-approval','Sample Approval','approval',1,'high'],['printing-branding','Printing / Branding','printing',2,'normal'],['production','Packaging Production','production',5,'normal'],['premium-finishing','Premium Finishing','finishing',2,'normal'],['quality-control','Quality Control','quality_check',1,'high'],['packing','Packing','packing',1,'normal']]
  },
  {
    key:'bespoke-packaging-system', name:'Bespoke Packaging System', category:'bespoke', sortOrder:130,
    rules:[['contains','bespoke packaging',160],['contains','bespoke packaging system',160],['contains','custom packaging system',150],['contains','custom packaging',145],['contains','bespoke',130],['contains','custom',80]],
    steps:[['project-review','Project Review','planning',1,'high'],['artwork-specification-approval','Artwork / Specification Approval','design',1,'normal'],['material-planning','Material Planning','materials',1,'normal'],['sample-prototype','Sampling / Prototype','sampling',2,'normal'],['customer-approval','Customer Approval','approval',1,'high'],['production','Production','production',5,'normal'],['finishing','Finishing','finishing',2,'normal'],['quality-control','Quality Control','quality_check',1,'high'],['packing','Packing','packing',1,'normal']]
  }
];

function q(v) { return v == null ? 'NULL' : `'${String(v).replaceAll("'", "''")}'`; }

function buildSql() {
    /*
     * Cloudflare D1 does not allow explicit transaction-control SQL in
     * SQL executed through Wrangler. Each statement is submitted
     * safely by D1, so this seed intentionally avoids explicit
     * transaction-control statements.
     */
  const now = new Date().toISOString();
  const s = ['PRAGMA foreign_keys = ON;'];
  for (const t of templates) {
    s.push(`INSERT OR IGNORE INTO production_task_templates (template_key,name,description,product_category,is_active,sort_order,created_at,updated_at) VALUES (${q(t.key)},${q(t.name)},${q(`Seeded Luxsome workflow for ${t.name}.`)},${q(t.category)},1,${t.sortOrder},${q(now)},${q(now)});`);
    s.push(`UPDATE production_task_templates SET name=${q(t.name)}, description=${q(`Seeded Luxsome workflow for ${t.name}.`)}, product_category=${q(t.category)}, sort_order=${t.sortOrder}, updated_at=${q(now)} WHERE template_key=${q(t.key)};`);

    t.steps.forEach((step, i) => {
      const [stepKey, taskName, taskType, duration, priority] = step;
      const dependencyKey = i > 0 ? t.steps[i-1][0] : null;
      s.push(`INSERT OR IGNORE INTO production_task_template_steps (template_id,step_key,task_name,task_type,description,default_duration_days,default_priority,default_assigned_to,dependency_step_id,sort_order,is_active,created_at,updated_at) SELECT id,${q(stepKey)},${q(taskName)},${q(taskType)},NULL,${duration},${q(priority)},NULL,NULL,${(i+1)*10},1,${q(now)},${q(now)} FROM production_task_templates WHERE template_key=${q(t.key)};`);
      s.push(`UPDATE production_task_template_steps SET task_name=${q(taskName)},task_type=${q(taskType)},default_duration_days=${duration},default_priority=${q(priority)},sort_order=${(i+1)*10},dependency_step_id=${dependencyKey ? `(SELECT dep.id FROM production_task_template_steps dep JOIN production_task_templates dt ON dt.id=dep.template_id WHERE dt.template_key=${q(t.key)} AND dep.step_key=${q(dependencyKey)} LIMIT 1)` : 'NULL'},updated_at=${q(now)} WHERE template_id=(SELECT id FROM production_task_templates WHERE template_key=${q(t.key)}) AND step_key=${q(stepKey)};`);
    });

    for (const [type, value, priority] of t.rules) {
      s.push(`INSERT INTO production_template_item_rules (template_id,match_type,match_value,priority,is_active,created_at,updated_at) SELECT t.id,${q(type)},${q(value)},${priority},1,${q(now)},${q(now)} FROM production_task_templates t WHERE t.template_key=${q(t.key)} AND NOT EXISTS (SELECT 1 FROM production_template_item_rules r WHERE r.template_id=t.id AND lower(r.match_type)=lower(${q(type)}) AND lower(r.match_value)=lower(${q(value)}));`);
      s.push(`UPDATE production_template_item_rules SET priority=${priority},is_active=1,updated_at=${q(now)} WHERE template_id=(SELECT id FROM production_task_templates WHERE template_key=${q(t.key)}) AND lower(match_type)=lower(${q(type)}) AND lower(match_value)=lower(${q(value)});`);
    }
  }
  s.push(`SELECT template_key,name,is_active,(SELECT COUNT(*) FROM production_task_template_steps s WHERE s.template_id=t.id AND s.is_active=1) AS active_step_count,(SELECT COUNT(*) FROM production_template_item_rules r WHERE r.template_id=t.id AND r.is_active=1) AS active_rule_count FROM production_task_templates t WHERE template_key IN (${templates.map(t=>q(t.key)).join(',')}) ORDER BY sort_order,name;`);
  return s.join('\n\n') + '\n';
}

const sql = buildSql();
if (dryRun) { console.log(sql); process.exit(0); }

const tempDir = mkdtempSync(join(tmpdir(),'luxsome-production-seed-'));
const sqlPath = join(tempDir,'seed-production-templates.sql');
writeFileSync(sqlPath, sql, 'utf8');

const wranglerArgs = ['wrangler','d1','execute','DB','--env',environment,useLocal ? '--local' : '--remote','--file',sqlPath];
console.log(`\nLuxsome Production Template Seeder\nEnvironment: ${environment}\nTarget: ${useLocal ? 'local D1' : 'remote D1'}\nTemplates: ${templates.length}\n`);
try {
  execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', wranglerArgs, {stdio:'inherit', cwd:process.cwd()});
  console.log('\nProduction templates seeded successfully.\n');
  templates.forEach(t => console.log(`  ✓ ${t.name}`));
  console.log('');
} catch (error) {
  console.error('\nProduction template seeding failed.');
  process.exitCode = 1;
} finally {
  rmSync(tempDir,{recursive:true,force:true});
}
