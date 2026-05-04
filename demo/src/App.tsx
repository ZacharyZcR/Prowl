import { useState } from "react";
import { Trophy, Shield, Swords, Flag, Users, Clock, Zap, Target, FileText, ChevronRight, Github, Terminal, ExternalLink } from "lucide-react";

const TABS = ["overview", "ctf", "awd", "redblue"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, { label: string; icon: React.ReactNode }> = {
  overview: { label: "功能总览", icon: <Zap size={16} /> },
  ctf: { label: "CTF 解题赛", icon: <Flag size={16} /> },
  awd: { label: "AWD 攻防", icon: <Swords size={16} /> },
  redblue: { label: "红蓝演习", icon: <Shield size={16} /> },
};

export default function App() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="demo">
      <header className="hero">
        <div className="hero__badge">Open Source</div>
        <h1 className="hero__title">
          <Trophy size={36} /> Prowl Range
        </h1>
        <p className="hero__subtitle">
          CTF · AWD · 红蓝对抗<br />
          综合靶场竞赛平台
        </p>
        <p className="hero__desc">
          三种比赛模式开箱即用，从出题到比赛到评分到导出排名，一条龙搞定。
        </p>
        <div className="hero__actions">
          <a href="https://github.com/ZacharyZcR/Prowl" className="btn btn--primary" target="_blank" rel="noopener">
            <Github size={16} /> GitHub
          </a>
          <a href="#features" className="btn btn--outline">
            <ChevronRight size={16} /> 了解更多
          </a>
        </div>
        <div className="hero__quick">
          <code>git clone https://github.com/ZacharyZcR/Prowl.git && cd Prowl && docker compose up -d</code>
        </div>
      </header>

      <section id="features" className="section">
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t} className={`tab${tab === t ? " tab--active" : ""}`} onClick={() => setTab(t)}>
              {TAB_LABELS[t].icon} {TAB_LABELS[t].label}
            </button>
          ))}
        </div>

        {tab === "overview" && <OverviewPanel />}
        {tab === "ctf" && <CTFPanel />}
        {tab === "awd" && <AWDPanel />}
        {tab === "redblue" && <RedBluePanel />}
      </section>

      <section className="section section--dark">
        <h2 className="section__title">技术栈</h2>
        <div className="tech-grid">
          {[
            { label: "后端", tech: "Go · Gin · Ent ORM" },
            { label: "数据库", tech: "PostgreSQL · Redis" },
            { label: "前端", tech: "React · TypeScript · Vite" },
            { label: "容器", tech: "Docker · Docker Compose" },
            { label: "CLI", tech: "Go · Cobra · 30+ 命令" },
            { label: "设计系统", tech: "@yza/ui · 62 组件" },
          ].map((item) => (
            <div key={item.label} className="tech-card">
              <div className="tech-card__label">{item.label}</div>
              <div className="tech-card__tech">{item.tech}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section__title">快速开始</h2>
        <div className="steps">
          <Step n={1} title="克隆项目">
            <code>git clone https://github.com/ZacharyZcR/Prowl.git</code>
          </Step>
          <Step n={2} title="配置环境">
            <code>cp .env.example .env</code>
            <p>修改 <code>JWT_SECRET</code> 和 <code>DB_PASSWORD</code></p>
          </Step>
          <Step n={3} title="一键启动">
            <code>docker compose up -d --build</code>
          </Step>
          <Step n={4} title="开始使用">
            <p>管理后台 <code>http://localhost:3080</code> admin / admin123</p>
            <p>参赛端 <code>http://localhost:3000</code></p>
          </Step>
        </div>
      </section>

      <section className="section section--dark">
        <h2 className="section__title">端口一览</h2>
        <table className="port-table">
          <thead>
            <tr><th>服务</th><th>端口</th><th>说明</th></tr>
          </thead>
          <tbody>
            <tr><td>管理后台</td><td><code>3080</code></td><td>后台管理、出题、创建比赛</td></tr>
            <tr><td>参赛端</td><td><code>3000</code></td><td>选手注册、组队、参赛</td></tr>
            <tr><td>API</td><td><code>38080</code></td><td>后端接口 + WebSocket + SSE</td></tr>
            <tr><td>PostgreSQL</td><td><code>35432</code></td><td>数据库</td></tr>
            <tr><td>Redis</td><td><code>36379</code></td><td>缓存 + 会话</td></tr>
          </tbody>
        </table>
      </section>

      <section className="section">
        <h2 className="section__title">CLI 工具</h2>
        <div className="cli-demo">
          <div className="cli-line"><span className="cli-prompt">$</span> prowl competition list</div>
          <div className="cli-line"><span className="cli-prompt">$</span> prowl challenge create "Web-SQL注入" --category web --difficulty easy</div>
          <div className="cli-line"><span className="cli-prompt">$</span> prowl awd deploy 1</div>
          <div className="cli-line"><span className="cli-prompt">$</span> prowl redblue attack-reports 1</div>
          <div className="cli-line"><span className="cli-prompt">$</span> prowl scenario batch-objectives 1 targets.json</div>
        </div>
      </section>

      <footer className="footer">
        <p>Prowl Range · MIT License · <a href="https://github.com/ZacharyZcR/Prowl" target="_blank" rel="noopener">GitHub <ExternalLink size={12} /></a></p>
      </footer>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="step">
      <div className="step__num">{n}</div>
      <div>
        <div className="step__title">{title}</div>
        <div className="step__body">{children}</div>
      </div>
    </div>
  );
}

function OverviewPanel() {
  const features = [
    { icon: <Flag size={20} />, title: "CTF Jeopardy", desc: "动态容器、指数衰减计分、First Blood、Hint 解锁、Writeup 提交" },
    { icon: <Swords size={20} />, title: "AWD 攻防", desc: "自动轮次、Checker 检测、零和计分、Flag 注入窃取、付费重启" },
    { icon: <Shield size={20} />, title: "红蓝演习", desc: "目标派发、攻防报告、裁判面板、ATT&CK 映射、阶段推进" },
    { icon: <Users size={20} />, title: "战队管理", desc: "创建/加入、邀请码、成员管理、RBAC 权限" },
    { icon: <Target size={20} />, title: "目标系统", desc: "URL + 描述、批量导入、手动/自动派发、关联报告" },
    { icon: <Terminal size={20} />, title: "CLI 工具", desc: "30+ 命令覆盖全部 API、批量操作、CSV 导出" },
    { icon: <Clock size={20} />, title: "自动化", desc: "比赛自动结束、容器自动清理、定时任务管理" },
    { icon: <FileText size={20} />, title: "国际化", desc: "中英双语、暗黑模式、参赛端完整 i18n" },
  ];
  return (
    <div className="feature-grid">
      {features.map((f) => (
        <div key={f.title} className="feature-card">
          <div className="feature-card__icon">{f.icon}</div>
          <div className="feature-card__title">{f.title}</div>
          <div className="feature-card__desc">{f.desc}</div>
        </div>
      ))}
    </div>
  );
}

function CTFPanel() {
  return (
    <div className="mock-panel">
      <h3>CTF Jeopardy 模式</h3>
      <div className="mock-table">
        <table>
          <thead><tr><th>#</th><th>战队</th><th>总分</th><th>解题数</th><th>First Blood</th></tr></thead>
          <tbody>
            <tr className="mock-top"><td>🥇</td><td>Binary Ninjas</td><td>2450</td><td>8</td><td>3</td></tr>
            <tr className="mock-top"><td>🥈</td><td>Pwn Stars</td><td>2100</td><td>7</td><td>2</td></tr>
            <tr className="mock-top"><td>🥉</td><td>Hash Slinging</td><td>1850</td><td>6</td><td>1</td></tr>
            <tr><td>4</td><td>Script Kiddos</td><td>1200</td><td>4</td><td>0</td></tr>
          </tbody>
        </table>
      </div>
      <div className="mock-features">
        <span className="mock-tag mock-tag--green">动态容器</span>
        <span className="mock-tag mock-tag--blue">指数衰减计分</span>
        <span className="mock-tag mock-tag--yellow">Hint 解锁</span>
        <span className="mock-tag mock-tag--purple">First Blood</span>
      </div>
    </div>
  );
}

function AWDPanel() {
  return (
    <div className="mock-panel">
      <h3>AWD 攻防模式</h3>
      <div className="mock-table">
        <table>
          <thead><tr><th>#</th><th>战队</th><th>总分</th><th>攻击</th><th>防御</th><th>可用性</th></tr></thead>
          <tbody>
            <tr className="mock-top"><td>🥇</td><td>RedForce</td><td>680</td><td className="t-green">+400</td><td className="t-red">-120</td><td className="t-yellow">+400</td></tr>
            <tr className="mock-top"><td>🥈</td><td>BlueShield</td><td>520</td><td className="t-green">+200</td><td className="t-red">-80</td><td className="t-yellow">+400</td></tr>
            <tr className="mock-top"><td>🥉</td><td>CyberWolves</td><td>340</td><td className="t-green">+100</td><td className="t-red">-160</td><td className="t-yellow">+400</td></tr>
          </tbody>
        </table>
      </div>
      <div className="mock-features">
        <span className="mock-tag mock-tag--red">自动轮次</span>
        <span className="mock-tag mock-tag--green">Checker 检测</span>
        <span className="mock-tag mock-tag--blue">零和计分</span>
        <span className="mock-tag mock-tag--yellow">付费重启</span>
      </div>
    </div>
  );
}

function RedBluePanel() {
  return (
    <div className="mock-panel">
      <h3>红蓝演习模式</h3>
      <div className="mock-table">
        <table>
          <thead><tr><th>#</th><th>目标</th><th>URL</th><th>报告</th><th>得分</th></tr></thead>
          <tbody>
            <tr><td>1</td><td>OA系统渗透</td><td><code>http://10.10.1.100:8080</code></td><td><span className="mock-tag mock-tag--green">2 份</span></td><td>280</td></tr>
            <tr><td>2</td><td>邮件服务器突破</td><td><code>smtp://10.10.1.101:25</code></td><td><span className="mock-tag mock-tag--green">1 份</span></td><td>200</td></tr>
            <tr><td>3</td><td>域控接管</td><td><code>ldap://10.10.2.1:389</code></td><td><span className="mock-tag mock-tag--gray">无</span></td><td>—</td></tr>
            <tr><td>4</td><td>VPN网关渗透</td><td><code>https://10.10.1.1:443</code></td><td><span className="mock-tag mock-tag--green">3 份</span></td><td>350</td></tr>
          </tbody>
        </table>
      </div>
      <div className="mock-features">
        <span className="mock-tag mock-tag--red">攻击报告</span>
        <span className="mock-tag mock-tag--blue">防御报告</span>
        <span className="mock-tag mock-tag--yellow">裁判评分</span>
        <span className="mock-tag mock-tag--purple">ATT&CK 映射</span>
        <span className="mock-tag mock-tag--green">阶段推进</span>
      </div>
    </div>
  );
}
