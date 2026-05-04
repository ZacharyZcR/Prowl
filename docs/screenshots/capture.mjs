import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;

const ADMIN_URL = "http://localhost:5174";
const PORTAL_URL = "http://localhost:5175";
const API_URL = "http://localhost:38080";

async function login(page, url, username, password) {
  await page.goto(url + "/login", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(500);
  const inputs = await page.locator("input").all();
  await inputs[0].fill(username);
  await inputs[1].fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForTimeout(2000);
}

async function screenshot(page, path, opts = {}) {
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, path), fullPage: false, ...opts });
  console.log(`  ✓ ${path}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // ========== 管理后台截图 ==========
  console.log("管理后台截图...");
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const adminPage = await adminCtx.newPage();

  await login(adminPage, ADMIN_URL, "admin", "admin123");

  // 仪表盘
  await adminPage.goto(ADMIN_URL + "/dashboard", { waitUntil: "domcontentloaded", timeout: 15000 });
  await adminPage.waitForTimeout(1500);
  await screenshot(adminPage, "admin-dashboard.png");

  // 比赛列表
  await adminPage.goto(ADMIN_URL + "/ctf", { waitUntil: "domcontentloaded", timeout: 15000 });
  await screenshot(adminPage, "admin-competitions.png");

  // 题目列表
  await adminPage.goto(ADMIN_URL + "/ctf/challenges", { waitUntil: "domcontentloaded", timeout: 15000 });
  await screenshot(adminPage, "admin-challenges.png");

  await adminCtx.close();

  // ========== 参赛端截图 ==========
  console.log("参赛端截图...");

  // 红队视角
  const redCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const redPage = await redCtx.newPage();
  await login(redPage, PORTAL_URL, "red_fox_1", "Red@2026fox");

  // 比赛大厅
  await redPage.goto(PORTAL_URL + "/", { waitUntil: "domcontentloaded", timeout: 15000 });
  await screenshot(redPage, "portal-home.png");

  // 比赛详情
  await redPage.goto(PORTAL_URL + "/competitions/15", { waitUntil: "domcontentloaded", timeout: 15000 });
  await screenshot(redPage, "portal-competition.png");

  // 红蓝报告页
  await redPage.goto(PORTAL_URL + "/competitions/15/redblue", { waitUntil: "domcontentloaded", timeout: 15000 });
  await screenshot(redPage, "redblue-reports.png");

  // 目标页
  await redPage.goto(PORTAL_URL + "/competitions/15/objectives", { waitUntil: "domcontentloaded", timeout: 15000 });
  await screenshot(redPage, "redblue-objectives.png");

  // 计分板
  await redPage.goto(PORTAL_URL + "/competitions/15/scoreboard", { waitUntil: "domcontentloaded", timeout: 15000 });
  await screenshot(redPage, "redblue-scoreboard.png");

  // 战队页
  await redPage.goto(PORTAL_URL + "/team", { waitUntil: "domcontentloaded", timeout: 15000 });
  await screenshot(redPage, "portal-team.png");

  // 个人中心
  await redPage.goto(PORTAL_URL + "/profile", { waitUntil: "domcontentloaded", timeout: 15000 });
  await screenshot(redPage, "portal-profile.png");

  await redCtx.close();

  // 裁判视角
  const judgeCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const judgePage = await judgeCtx.newPage();
  await login(judgePage, PORTAL_URL, "judge_master", "Judge@2026");

  await judgePage.goto(PORTAL_URL + "/competitions/15/judge", { waitUntil: "domcontentloaded", timeout: 15000 });
  await judgePage.waitForTimeout(1000);
  await screenshot(judgePage, "redblue-judge.png");

  await judgeCtx.close();

  // ========== 合成宣传图 ==========
  console.log("合成宣传图...");
  const heroCtx = await browser.newContext({ viewport: { width: 2400, height: 1260 }, deviceScaleFactor: 1 });
  const heroPage = await heroCtx.newPage();

  const heroCards = [
    { id: "hero-1", badge: "比赛大厅", badgeClass: "ctf", title: "一目了然的比赛列表", desc: "正在进行、即将开始、已结束的比赛分组展示，CTF / AWD / 红蓝三种模式一键报名。", features: ["三种模式 · 自动分类", "实时状态 · 倒计时", "一键报名 · 战队组队", "中英双语 · 暗黑模式"], dots: ["blue", "green", "yellow", "purple"], screenshot: "portal-home.png" },
    { id: "hero-2", badge: "比赛详情", badgeClass: "ctf", title: "沉浸式参赛体验", desc: "比赛信息、规则、功能入口一页展示，根据角色自动显示对应操作按钮。", features: ["比赛信息 · 规则展示", "报名状态 · 截止校验", "按角色显示功能入口", "赛后总结 · 排名导出"], dots: ["blue", "green", "yellow", "purple"], screenshot: "portal-competition.png" },
    { id: "hero-3", badge: "红蓝演习", badgeClass: "redblue", title: "目标资产清单", desc: "红队攻击目标和蓝队防御目标分表展示，URL + 描述 + 报告数 + 裁判评分。", features: ["目标 URL + 文字描述", "按目标统计报告数", "裁判实际评分", "本队总分实时显示"], dots: ["red", "blue", "green", "yellow"], screenshot: "redblue-objectives.png" },
    { id: "hero-4", badge: "红蓝演习", badgeClass: "redblue", title: "攻防报告提交", desc: "红队提交攻击报告，蓝队提交防御报告，按角色自动限制，支持附件和目标关联。", features: ["按角色限制报告类型", "关联具体攻击目标", "支持 MD/DOCX 附件", "裁判评语实时显示"], dots: ["red", "blue", "purple", "green"], screenshot: "redblue-reports.png" },
    { id: "hero-5", badge: "红蓝演习", badgeClass: "redblue", title: "裁判评审面板", desc: "待审核报告一键评分，队伍得分实时排名，演习阶段推进管理。", features: ["待审 / 已审分组展示", "评分弹窗 · 通过/拒绝", "各队实时得分排名", "阶段创建 · 推进控制"], dots: ["yellow", "green", "blue", "purple"], screenshot: "redblue-judge.png" },
    { id: "hero-6", badge: "计分板", badgeClass: "ctf", title: "实时竞赛排名", desc: "红蓝模式显示角色列，AWD 显示攻防分，CTF 显示解题数，支持冻结和 CSV 导出。", features: ["三种模式自适应列", "红/蓝角色标签", "Top 3 高亮", "计分板冻结机制"], dots: ["blue", "red", "green", "yellow"], screenshot: "redblue-scoreboard.png" },
    { id: "hero-7", badge: "战队管理", badgeClass: "admin", title: "组队与参赛记录", desc: "创建战队、邀请码加入、成员管理、参赛历史，一页搞定。", features: ["邀请码 · 一键复制", "成员列表 · 角色标识", "参赛记录 · 比赛状态", "创建 / 加入双入口"], dots: ["green", "blue", "yellow", "purple"], screenshot: "portal-team.png" },
    { id: "hero-8", badge: "个人中心", badgeClass: "admin", title: "选手个人主页", desc: "个人信息、战队摘要、参赛统计、比赛历史全览。", features: ["头像 · 角色信息", "战队摘要 · 快捷入口", "参赛次数统计", "历史比赛表格"], dots: ["green", "blue", "yellow", "purple"], screenshot: "portal-profile.png" },
    { id: "hero-9", badge: "管理后台", badgeClass: "admin", title: "运营仪表盘", desc: "比赛、战队、用户、容器、通知五维 KPI，比赛概览和最近通知实时更新。", features: ["五维 KPI 卡片", "进行中比赛列表", "最近通知流", "系统健康监控"], dots: ["green", "blue", "yellow", "purple"], screenshot: "admin-dashboard.png" },
  ];

  for (const card of heroCards) {
    const screenshotBase64 = readFileSync(join(OUT, card.screenshot)).toString("base64");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; background: #08080d; color: #e4e4e8; width: 2400px; height: 1260px; overflow: hidden; }
.card { width:2400px; height:1260px; display:grid; grid-template-columns:1fr 1.4fr; }
.left { padding:100px 80px; display:flex; flex-direction:column; justify-content:center; background:linear-gradient(135deg,#0d0d15,#12121a); }
.badge { display:inline-flex; align-items:center; gap:6px; font-size:16px; font-weight:600; padding:6px 18px; border-radius:20px; width:fit-content; margin-bottom:32px; }
.badge--ctf { background:rgba(59,130,246,0.15); color:#60a5fa; border:1px solid rgba(59,130,246,0.3); }
.badge--awd { background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3); }
.badge--redblue { background:rgba(168,85,247,0.15); color:#c084fc; border:1px solid rgba(168,85,247,0.3); }
.badge--admin { background:rgba(34,197,94,0.15); color:#4ade80; border:1px solid rgba(34,197,94,0.3); }
h1 { font-size:56px; font-weight:900; letter-spacing:-0.03em; line-height:1.15; margin-bottom:20px; }
.desc { font-size:20px; color:#9ca3af; line-height:1.6; margin-bottom:40px; max-width:500px; }
.features { display:flex; flex-direction:column; gap:14px; }
.feature { display:flex; align-items:center; gap:12px; font-size:17px; color:#d1d5db; }
.dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.dot--blue{background:#3b82f6;} .dot--green{background:#22c55e;} .dot--yellow{background:#f59e0b;} .dot--purple{background:#a855f7;} .dot--red{background:#ef4444;}
.right { display:flex; align-items:center; justify-content:center; padding:60px; background:radial-gradient(ellipse at 30% 50%,rgba(99,102,241,0.08),transparent 60%); position:relative; }
.shot { width:100%; height:100%; object-fit:contain; border-radius:16px; box-shadow:0 25px 80px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.05); }
.watermark { position:absolute; bottom:40px; right:60px; font-size:14px; letter-spacing:0.3em; color:rgba(255,255,255,0.08); font-weight:700; text-transform:uppercase; }
</style></head><body>
<div class="card">
<div class="left">
<div class="badge badge--${card.badgeClass}">● ${card.badge}</div>
<h1>${card.title}</h1>
<div class="desc">${card.desc}</div>
<div class="features">
${card.features.map((f, i) => `<div class="feature"><span class="dot dot--${card.dots[i]}"></span>${f}</div>`).join("\n")}
</div>
</div>
<div class="right">
<img class="shot" src="data:image/png;base64,${screenshotBase64}" />
<div class="watermark">PROWL RANGE</div>
</div>
</div>
</body></html>`;

    await heroPage.setContent(html, { waitUntil: "load" });
    await heroPage.waitForTimeout(300);
    await heroPage.screenshot({ path: join(OUT, `${card.id}.png`) });
    console.log(`  ✓ ${card.id}.png`);
  }

  await heroCtx.close();
  await browser.close();
  console.log("完成！");
}

main().catch(console.error);
