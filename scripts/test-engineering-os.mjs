import fs from "node:fs"; import path from "node:path";
const root=process.cwd(), fail=[];
const list=(d)=>fs.readdirSync(path.join(root,d),{withFileTypes:true});
const agents=list(".claude/agents").filter(x=>x.isFile()&&x.name.endsWith(".md"));
const skills=list(".claude/skills").filter(x=>x.isDirectory());
const commands=list(".claude/commands").filter(x=>x.isFile()&&x.name.endsWith(".md"));
const hooks=list(".claude/hooks").filter(x=>x.isFile()&&x.name.endsWith(".md"));
const rules=list(".claude/rules").filter(x=>x.isFile()&&x.name.endsWith(".md"));
for(const a of agents){const p=path.join(root,".claude/agents",a.name);if(!fs.readFileSync(p,"utf8").trim())fail.push("empty agent "+a.name)}
for(const s of skills){const p=path.join(root,".claude/skills",s.name,"SKILL.md");if(!fs.existsSync(p))fail.push("missing SKILL.md "+s.name);else if(!fs.readFileSync(p,"utf8").trim())fail.push("empty skill "+s.name)}
for(const x of [...commands,...hooks,...rules]){const base=x.name;const dir=commands.includes(x)?".claude/commands":hooks.includes(x)?".claude/hooks":".claude/rules";if(!fs.readFileSync(path.join(root,dir,base),"utf8").trim())fail.push("empty "+dir+" "+base)}
for(const p of ["CLAUDE.md","ENGINEERING-SYSTEM.md","AGENT-MAP.md","SKILL-MAP.md","DOMAIN-MAP.md","DATA-OWNERSHIP.md","DEFINITION-OF-DONE.md"]){if(!fs.existsSync(path.join(root,p)))fail.push("missing canonical "+p)}
if(!agents.some(x=>x.name==="lander-creators-orchestrator.md"))fail.push("missing principal orchestrator");
if(!agents.some(x=>x.name==="lander-creators-ai-orchestrator.md"))fail.push("missing product AI orchestrator contract");
const claude=fs.readFileSync(path.join(root,"CLAUDE.md"),"utf8"); if(!claude.includes("main")||!claude.includes("only valid branch"))fail.push("main-only policy not explicit");
const es=fs.readFileSync(path.join(root,"ENGINEERING-SYSTEM.md"),"utf8");if(!es.includes("single principal orchestrator"))fail.push("single orchestrator invariant missing");
if(fail.length){console.error(fail.join("\n"));process.exit(1)}
console.log(JSON.stringify({agents:agents.length,skills:skills.length,commands:commands.length,hooks:hooks.length,rules:rules.length}));
