export interface AIComponentManifest {
  id: string;
  category: string;
  layoutRole: string;
  requiredProps: string[];
  states: string[];
  relatedComponents: string[];
  useWhen: string[];
  avoidWhen: string[];
  contentRules: string[];
  antiPatterns: string[];
}

export interface AIPatternRecipe {
  id: string;
  title: string;
  when: string;
  composition: string[];
  hardRules: string[];
}

export interface AIStateLifecycleRule {
  id: string;
  when: string;
  show: string[];
  avoid: string[];
}

export interface AIFormFlowRule {
  id: string;
  when: string;
  requiredPieces: string[];
  avoid: string[];
}

export interface AIDetailInformationRule {
  id: string;
  when: string;
  requiredPieces: string[];
  hardRules: string[];
}

export interface AISummaryRule {
  id: string;
  when: string;
  requiredPieces: string[];
  avoid: string[];
}

export const aiComponentManifests: AIComponentManifest[] = [
  {
    id: "PageHeader",
    category: "assembly",
    layoutRole: "page-entry",
    requiredProps: ["title"],
    states: ["default"],
    relatedComponents: ["ActionBar", "SectionHeader", "KeyValueList"],
    useWhen: ["页面需要稳定标题区", "需要把对象名、说明和主动作固定在首屏"],
    avoidWhen: ["只是一块局部卡片标题", "已经处在 Modal / Drawer 内部的小范围上下文"],
    contentRules: ["标题写任务或对象", "描述先给结论再给背景", "主动作不超过 2 个"],
    antiPatterns: ["把筛选器塞进标题区", "把 5 个以上按钮堆在右上角"]
  },
  {
    id: "SectionHeader",
    category: "assembly",
    layoutRole: "section-entry",
    requiredProps: ["title"],
    states: ["default"],
    relatedComponents: ["PageHeader", "ActionBar"],
    useWhen: ["大段内容之间需要稳定分节", "区块有标题、说明和局部动作"],
    avoidWhen: ["只是一张小卡片的局部标题", "需要承担跨页面导航"],
    contentRules: ["标题层级低于 PageHeader", "说明只解释本区块职责"],
    antiPatterns: ["每个小模块都单独上 SectionHeader", "把状态切换做成 section title"]
  },
  {
    id: "KeyValueList",
    category: "assembly",
    layoutRole: "detail-summary",
    requiredProps: ["items"],
    states: ["default"],
    relatedComponents: ["PageHeader", "SectionHeader", "Tag"],
    useWhen: ["详情页展示稳定属性", "需要快速扫读对象关键信息"],
    avoidWhen: ["数据需要行间比较", "字段很多且需要编辑"],
    contentRules: ["label 简洁明确", "机器标识可用 mono", "危险值可做强调"],
    antiPatterns: ["拿它代替 DataTable", "value 里塞整段说明文字"]
  },
  {
    id: "ActionBar",
    category: "assembly",
    layoutRole: "task-toolbar",
    requiredProps: [],
    states: ["default"],
    relatedComponents: ["Button", "FilterBar", "Pagination"],
    useWhen: ["列表或详情区需要统一动作条", "需要区分摘要信息和操作组"],
    avoidWhen: ["只有一个普通按钮", "动作本身属于全局导航"],
    contentRules: ["主动作不超过 1 个", "摘要写当前结果或选择状态"],
    antiPatterns: ["把批量操作和每行动作混在一起", "工具条里塞完整表单"]
  },
  {
    id: "BulkActionBar",
    category: "assembly",
    layoutRole: "bulk-toolbar",
    requiredProps: ["selectionCount"],
    states: ["default", "selected"],
    relatedComponents: ["ActionBar", "Button", "DropdownMenu", "DataTable"],
    useWhen: ["用户已经选中了多条记录", "需要批量导出、分配、隔离、归档"],
    avoidWhen: ["没有选择状态", "其实只是单条记录详情页"],
    contentRules: ["先写选中数量", "危险批量动作与普通动作分层"],
    antiPatterns: ["零选中时也常驻显示", "把批量动作塞回每行尾巴"]
  },
  {
    id: "MetricStrip",
    category: "assembly",
    layoutRole: "dense-summary",
    requiredProps: ["items"],
    states: ["default", "dense"],
    relatedComponents: ["KPIGroup", "PageHeader", "StatCard"],
    useWhen: ["详情页或报告页首屏需要一排更紧凑的关键指标", "指标数量稳定，但不值得每个都做成大卡"],
    avoidWhen: ["需要展示趋势图或复杂说明", "只有单个摘要值"],
    contentRules: ["value 尽量短", "meta 只补口径或变化", "同一条 strip 保持统一格式"],
    antiPatterns: ["把长段解释塞进 meta", "一排里混 5 种量纲和语义"]
  },
  {
    id: "KPIGroup",
    category: "assembly",
    layoutRole: "summary-strip",
    requiredProps: ["items"],
    states: ["default", "dense"],
    relatedComponents: ["StatCard", "ChartCard", "PageHeader"],
    useWhen: ["页面首屏需要先给摘要判断", "仪表盘、报告、详情页都有一排稳定指标"],
    avoidWhen: ["只有一个孤立数字", "指标值之间没有统一口径"],
    contentRules: ["label 说业务对象", "value 尽量短而稳定", "trend 只补变化，不重复 value"],
    antiPatterns: ["把大段解释塞进 KPI 卡片", "每个页面都临时拼一排白盒子"]
  },
  {
    id: "InlineNotice",
    category: "assembly",
    layoutRole: "in-section-feedback",
    requiredProps: ["title"],
    states: ["info", "success", "warning", "danger"],
    relatedComponents: ["Alert", "Toast", "PageSection"],
    useWhen: ["只需要在某个区块内持续提醒", "信息重要，但不值得升级成整页 Alert"],
    avoidWhen: ["必须阻断用户决策", "只是短暂成功提示"],
    contentRules: ["标题先给结论", "description 解释影响和下一步", "动作不超过 2 个"],
    antiPatterns: ["一个区块里堆 3 条 InlineNotice", "把全页错误缩成一条区块提示"]
  },
  {
    id: "DiffSummary",
    category: "assembly",
    layoutRole: "change-rollup",
    requiredProps: ["items"],
    states: ["info", "success", "warning", "danger"],
    relatedComponents: ["CompareBlock", "Timeline", "ReviewChecklist"],
    useWhen: ["页面先要解释这次变更到底改了什么", "差异项有 3 到 6 条，适合先做结论滚动条"],
    avoidWhen: ["只有单个对比值", "差异明细复杂到必须直接看表格"],
    contentRules: ["label 说变化维度", "value 先给变化结果", "detail 只补必要上下文"],
    antiPatterns: ["还没总结变化就直接丢完整 diff", "一条 item 里塞两段长文"]
  },
  {
    id: "DecisionPanel",
    category: "assembly",
    layoutRole: "decision-gate",
    requiredProps: ["title"],
    states: ["default", "warning", "danger"],
    relatedComponents: ["RiskSummary", "Modal", "ReviewChecklist", "Button"],
    useWhen: ["用户必须基于风险和证据做明确决策", "审批、放行、隔离、发布前需要一个最终判断面板"],
    avoidWhen: ["只是普通说明区块", "页面并不存在明确的 yes/no 决策"],
    contentRules: ["标题直接说要做什么判断", "risk 先给结论", "evidence 只补关键证据"],
    antiPatterns: ["把所有上下文都塞进决策面板", "不给明确动作出口"]
  },
  {
    id: "ResultPage",
    category: "assembly",
    layoutRole: "outcome-state",
    requiredProps: ["title", "description"],
    states: ["default", "info", "success", "warning", "danger"],
    relatedComponents: ["Button", "Alert", "EmptyState"],
    useWhen: ["动作完成后需要一个明确结果页", "成功、失败、无权限、处理中需要统一骨架"],
    avoidWhen: ["只是区块级反馈", "仍处在完整应用工作流里，需要保留复杂上下文"],
    contentRules: ["标题先给结果", "描述补原因和下一步", "动作不超过 2 个"],
    antiPatterns: ["成功结果页继续塞复杂表格", "错误页只丢一个报错码"]
  },
  {
    id: "RiskSummary",
    category: "assembly",
    layoutRole: "risk-rollup",
    requiredProps: ["title", "items"],
    states: ["info", "success", "warning", "danger"],
    relatedComponents: ["MetricStrip", "DecisionPanel", "InlineNotice"],
    useWhen: ["页面首屏需要先把风险等级、影响范围、责任信息说清楚", "审批和处置前需要稳定的风险摘要块"],
    avoidWhen: ["没有统一风险口径", "只是普通 KPI 摘要"],
    contentRules: ["title 先说风险对象", "summary 先给结论", "items 保持统一量纲"],
    antiPatterns: ["风险摘要里再塞整张图表", "风险、负责人、时间口径乱跳"]
  },
  {
    id: "PageSection",
    category: "assembly",
    layoutRole: "page-chunk",
    requiredProps: ["title", "children"],
    states: ["default"],
    relatedComponents: ["SectionHeader", "ActionBar", "KeyValueList"],
    useWhen: ["页面内需要稳定的大区块", "区块既有标题又有主体内容，可能还带侧边上下文"],
    avoidWhen: ["只是卡片级局部标题", "页面整体还没分出主次层级"],
    contentRules: ["title 说本段职责", "aside 只放辅助判断信息"],
    antiPatterns: ["每一小块都套 PageSection", "把页面关键决策藏进 aside"]
  },
  {
    id: "DetailAside",
    category: "assembly",
    layoutRole: "context-rail",
    requiredProps: ["sections"],
    states: ["default"],
    relatedComponents: ["SplitView", "PageSection", "KeyValueList"],
    useWhen: ["详情页右侧需要稳定放联系人、归属、最近变更、处置上下文", "这些信息重要，但不该压过主区证据"],
    avoidWhen: ["页面没有明确主区", "关键决策必须放首屏主区"],
    contentRules: ["section title 说上下文来源", "每段信息尽量短，便于扫读"],
    antiPatterns: ["把主风险和主动作塞进侧栏", "侧栏再复制一遍主区字段"]
  },
  {
    id: "FieldGroup",
    category: "assembly",
    layoutRole: "field-cluster",
    requiredProps: ["title", "children"],
    states: ["default"],
    relatedComponents: ["FormSection", "Input", "Select", "Checkbox", "Radio", "Switch"],
    useWhen: ["一个表单分节里还有更小的字段簇", "字段需要按任务语义再分出一层"],
    avoidWhen: ["只有单个字段", "页面级分节已经足够"],
    contentRules: ["title 说字段组意图", "hint 只补限制或影响"],
    antiPatterns: ["每个字段都包 FieldGroup", "拿 FieldGroup 代替 FormSection"]
  },
  {
    id: "SplitView",
    category: "assembly",
    layoutRole: "structured-columns",
    requiredProps: ["main"],
    states: ["default"],
    relatedComponents: ["DataTable", "PageSection", "Timeline", "Sidebar"],
    useWhen: ["需要稳定的列表-详情或主区-辅助区分栏", "不能靠内容长度临时挤版式"],
    avoidWhen: ["只有单列阅读页", "移动端窄内容只剩一列时"],
    contentRules: ["main 保留最大注意力", "leading 和 aside 只承担辅助角色"],
    antiPatterns: ["三栏都写成主角", "把 SplitView 当随意拼列容器"]
  },
  {
    id: "FilterSummary",
    category: "assembly",
    layoutRole: "query-summary",
    requiredProps: ["summary"],
    states: ["default", "active-filters"],
    relatedComponents: ["FilterBar", "Tag", "Pagination", "BulkActionBar"],
    useWhen: ["查询结果需要解释当前范围", "筛选条件已经生效，用户要先判断结果值不值得看"],
    avoidWhen: ["没有查询上下文", "只是普通说明文案"],
    contentRules: ["先说结果规模", "chips 只回显已生效条件", "分页不抢 summary 的位置"],
    antiPatterns: ["把筛选器再复制一遍", "结果数量和筛选条件散落到各处"]
  },
  {
    id: "ActivityFeed",
    category: "assembly",
    layoutRole: "log-stream",
    requiredProps: ["items"],
    states: ["default", "warning", "danger"],
    relatedComponents: ["Timeline", "DetailAside", "PageSection"],
    useWhen: ["需要连续展示操作记录、审计事件、活动流", "用户是按最新动态扫读，而不是按严格因果回看"],
    avoidWhen: ["每一条都需要严格时序因果解释", "其实只是几条固定属性"],
    contentRules: ["title 先说发生了什么", "meta 说是谁和来源", "description 控制在一两句内"],
    antiPatterns: ["把完整台账表塞成活动流", "每条活动写成长篇小说"]
  },
  {
    id: "ReviewChecklist",
    category: "assembly",
    layoutRole: "review-guardrail",
    requiredProps: ["items"],
    states: ["todo", "done", "warning", "danger"],
    relatedComponents: ["DiffSummary", "CompareBlock", "Modal"],
    useWhen: ["页面或流程需要明确评审项", "审批、发布、规则变更前要先过一组固定检查点"],
    avoidWhen: ["只是展示静态信息", "问题太复杂，需要完整表单或工单流转"],
    contentRules: ["label 写检查动作或判断标准", "description 说证据和边界"],
    antiPatterns: ["把 checklist 做成假装可交互的待办系统", "检查项没有状态就直接平铺成段落"]
  },
  {
    id: "EmptyBlock",
    category: "assembly",
    layoutRole: "in-section-empty",
    requiredProps: ["title", "description"],
    states: ["default"],
    relatedComponents: ["EmptyState", "EmptyTable", "PageSection", "Button"],
    useWhen: ["某个区块暂无内容，但整页仍然可用", "局部图表、局部列表、局部时间线缺数据"],
    avoidWhen: ["整页首次使用空态", "其实是请求失败而不是空数据"],
    contentRules: ["同时说明为什么为空和下一步", "动作只保留一个主要入口"],
    antiPatterns: ["区块为空时直接留白", "把区块级空态升级成整页大空态"]
  },
  {
    id: "CompareBlock",
    category: "assembly",
    layoutRole: "difference-summary",
    requiredProps: ["title", "leftLabel", "leftValue", "rightLabel", "rightValue"],
    states: ["default", "info", "success", "warning", "danger"],
    relatedComponents: ["Tag", "Timeline", "PageSection"],
    useWhen: ["配置变更前后对比", "基线和当前状态需要稳定比较"],
    avoidWhen: ["只是单值展示", "对比维度超过两个且需要完整表格"],
    contentRules: ["两侧标签口径一致", "diff 先说变化方向", "value 保持同一量纲"],
    antiPatterns: ["左边写版本，右边写整段解释", "对比块里又嵌一张表"]
  },
  {
    id: "FormSection",
    category: "assembly",
    layoutRole: "form-group",
    requiredProps: ["title", "children"],
    states: ["default"],
    relatedComponents: ["Input", "Select", "Textarea", "Checkbox", "Radio", "Switch"],
    useWhen: ["表单需要按业务段落分组", "字段超过 4 个且需要稳定阅读节奏"],
    avoidWhen: ["只有 1 到 2 个简单字段", "只是普通信息展示区块"],
    contentRules: ["title 说清这一组字段负责什么", "description 解释范围和约束"],
    antiPatterns: ["每个字段都单独包一层 FormSection", "拿它替代页面级标题"]
  },
  {
    id: "ValidationSummary",
    category: "assembly",
    layoutRole: "form-error-summary",
    requiredProps: ["issues"],
    states: ["warning", "danger"],
    relatedComponents: ["Alert", "FormSection", "Button"],
    useWhen: ["提交前存在多个校验问题", "需要在表单顶部统一回顾失败项"],
    avoidWhen: ["只有单个字段轻微提示", "纯成功反馈"],
    contentRules: ["先说能不能提交", "逐条指出字段和原因"],
    antiPatterns: ["只在字段旁边报错却不给总览", "把轻量 hint 也塞进错误总览"]
  },
  {
    id: "Timeline",
    category: "assembly",
    layoutRole: "evidence-history",
    requiredProps: ["items"],
    states: ["default", "warning", "danger"],
    relatedComponents: ["PageHeader", "KeyValueList", "SectionHeader", "Alert"],
    useWhen: ["需要展示处置过程、审计轨迹、事件时间线", "用户要按时间理解因果关系"],
    avoidWhen: ["只是普通属性清单", "每一项都没有时间或顺序含义"],
    contentRules: ["标题先写事件结论", "time 保持统一格式", "description 只补关键上下文"],
    antiPatterns: ["把台账明细直接塞进 Timeline", "一条时间线写 10 段大作文"]
  },
  {
    id: "FilterBar",
    category: "pattern",
    layoutRole: "query-entry",
    requiredProps: ["controls"],
    states: ["default", "active-filters"],
    relatedComponents: ["Input", "Select", "ActionBar", "EmptyTable", "Pagination"],
    useWhen: ["搜索结果页", "审计列表页", "任何需要稳定查询链路的页面"],
    avoidWhen: ["只有单个搜索框", "页面没有结果列表"],
    contentRules: ["高频条件常驻", "用 chips 回显已生效筛选"],
    antiPatterns: ["把分页和筛选器放同一层", "12 个条件全首屏展开"]
  },
  {
    id: "DataTable",
    category: "component",
    layoutRole: "bulk-compare",
    requiredProps: ["columns", "rows"],
    states: ["default", "empty", "dense"],
    relatedComponents: ["FilterBar", "Pagination", "EmptyTable", "Tag"],
    useWhen: ["同结构记录批量比较", "需要扫读状态和数量"],
    avoidWhen: ["单条记录详情", "内容主要是长文本解释"],
    contentRules: ["主识别列给宽度", "数字右对齐", "空值统一 --"],
    antiPatterns: ["把所有动作都塞行内", "列宽平均铺开"]
  },
  {
    id: "Alert",
    category: "component",
    layoutRole: "persistent-feedback",
    requiredProps: ["heading", "description"],
    states: ["info", "success", "warning", "danger"],
    relatedComponents: ["Toast", "EmptyState", "Modal"],
    useWhen: ["用户后续仍需要反复看到这条信息", "页面级持续提醒"],
    avoidWhen: ["只是一条操作完成提示", "需要立刻决策的阻断操作"],
    contentRules: ["先说结论再说影响", "必要时给下一步动作"],
    antiPatterns: ["把所有消息都做成 Alert", "一屏出现 5 条等权重提醒"]
  },
  {
    id: "Toast",
    category: "component",
    layoutRole: "ephemeral-feedback",
    requiredProps: ["title"],
    states: ["info", "success", "warning", "danger"],
    relatedComponents: ["Alert", "Modal"],
    useWhen: ["保存成功", "复制完成", "导出已开始"],
    avoidWhen: ["高风险确认", "长期状态提醒"],
    contentRules: ["文案短而完整", "错过后系统仍可恢复"],
    antiPatterns: ["用 Toast 承载不可逆后果", "同一条消息同时 Toast 和 Alert"]
  },
  {
    id: "Drawer",
    category: "component",
    layoutRole: "contextual-panel",
    requiredProps: ["title", "open"],
    states: ["default", "interactive"],
    relatedComponents: ["Modal", "PageHeader", "KeyValueList"],
    useWhen: ["保留上下文查看详情", "轻到中量级编辑"],
    avoidWhen: ["多步骤长流程", "必须立刻决策的危险动作"],
    contentRules: ["保留退出点", "标题要说明当前对象或动作"],
    antiPatterns: ["把完整向导塞进 Drawer", "没有关闭路径"]
  },
  {
    id: "Modal",
    category: "component",
    layoutRole: "blocking-decision",
    requiredProps: ["title", "open"],
    states: ["default", "danger", "confirm"],
    relatedComponents: ["Toast", "Alert", "Drawer"],
    useWhen: ["不可逆操作", "高风险批准", "覆盖现有配置"],
    avoidWhen: ["日常浏览", "需要保留大量背景上下文"],
    contentRules: ["标题直接写动作", "正文说明后果", "主次按钮边界清楚"],
    antiPatterns: ["把普通表单都做成 Modal", "不给取消出口"]
  },
  {
    id: "EmptyState",
    category: "component",
    layoutRole: "no-result-guidance",
    requiredProps: ["heading", "description"],
    states: ["default"],
    relatedComponents: ["EmptyTable", "FilterBar", "Button"],
    useWhen: ["首次使用", "当前筛选结果为空", "模块尚未配置"],
    avoidWhen: ["数据加载中", "只是短时失败反馈"],
    contentRules: ["同时回答缺什么、为什么、接下来做什么"],
    antiPatterns: ["只写暂无数据", "空状态里没有可执行动作"]
  }
];

export const aiPatternRecipes: AIPatternRecipe[] = [
  {
    id: "search-results",
    title: "搜索结果页",
    when: "需要查找对象、收窄范围并批量处理结果时",
    composition: ["PageHeader", "FilterBar", "FilterSummary", "ActionBar", "BulkActionBar", "DataTable", "Pagination", "EmptyTable"],
    hardRules: ["分页属于结果区", "筛选条件必须可回显", "结果区先给摘要再给表格"]
  },
  {
    id: "detail-page",
    title: "详情页",
    when: "需要稳定呈现对象详情、关键状态和上下文动作时",
    composition: ["PageHeader", "MetricStrip", "KeyValueList", "PageSection", "SectionHeader", "ActionBar", "Timeline", "ActivityFeed", "DetailAside", "SplitView"],
    hardRules: ["详情属性优先用 KeyValueList", "危险操作不要跟普通动作混排", "时间性证据优先进入 Timeline，而不是散在段落里"]
  },
  {
    id: "settings-workbench",
    title: "设置工作台",
    when: "需要分节配置和局部保存时",
    composition: ["PageHeader", "SectionHeader", "SettingsSection", "ActionBar", "Alert"],
    hardRules: ["局部动作跟随区块", "全局保存只保留一个主入口"]
  },
  {
    id: "dashboard-overview",
    title: "总览仪表盘",
    when: "需要先判断整体态势，再下钻模块细节时",
    composition: ["PageHeader", "KPIGroup", "PageSection", "ChartCard", "SplitView"],
    hardRules: ["首屏先给摘要，再给图表", "KPI 口径和图表口径必须一致", "图表区不要反客为主压过结论"]
  },
  {
    id: "approval-flow",
    title: "审批流页",
    when: "需要风险说明、责任确认和最终决策时",
    composition: ["PageHeader", "RiskSummary", "DecisionPanel", "ReviewChecklist", "Alert", "KeyValueList", "SectionHeader", "Modal"],
    hardRules: ["决策前必须有风险说明", "高风险通过必须使用阻断确认"]
  },
  {
    id: "compare-review",
    title: "差异评审页",
    when: "需要稳定比较前后版本、当前值和基线时",
    composition: ["PageHeader", "DiffSummary", "CompareBlock", "ReviewChecklist", "PageSection", "Timeline"],
    hardRules: ["先给差异结论，再给原始细节", "同一对比区块只保留两端主值，不让信息爆炸"]
  },
  {
    id: "audit-stream",
    title: "活动流页",
    when: "需要先看最新动作，再决定是否下钻某条事件时",
    composition: ["PageHeader", "FilterBar", "FilterSummary", "ActivityFeed", "DetailAside"],
    hardRules: ["活动流是连续记录，不是假装的时间线", "右侧上下文只补辅助信息，不抢主区注意力"]
  },
  {
    id: "section-empty",
    title: "区块级空态",
    when: "页面主体仍可用，但某个区块暂无数据或尚未配置时",
    composition: ["PageSection", "EmptyBlock", "InlineNotice"],
    hardRules: ["区块级空态不影响整页骨架", "不要因为局部没数据就把整页打成空白"]
  }
];

export const aiStateLifecycleRules: AIStateLifecycleRule[] = [
  {
    id: "loading",
    when: "数据正在获取，但结构已经确定",
    show: ["Skeleton 占位", "保留页面骨架和标题", "不要伪造看起来像真的数据"],
    avoid: ["加载时直接白屏", "用 fake numbers 冒充真实结果"]
  },
  {
    id: "empty",
    when: "查询成功，但当前没有数据或尚未配置",
    show: ["EmptyState 或 EmptyTable", "说明为什么为空", "提供下一步动作"],
    avoid: ["只写暂无数据", "把空状态误当错误处理"]
  },
  {
    id: "error",
    when: "当前请求或动作失败，需要用户知道原因",
    show: ["Alert 或页面级错误说明", "给出原因或恢复动作", "必要时保留重试入口"],
    avoid: ["只给 Toast 一闪而过", "失败后什么都不解释"]
  },
  {
    id: "partial",
    when: "主体数据可用，但部分模块失败或延迟",
    show: ["主体内容继续可用", "局部错误就地提示", "明确哪些数据缺失"],
    avoid: ["局部失败导致整页不可用", "把部分失败假装成全部成功"]
  },
  {
    id: "success",
    when: "动作完成且结果已稳定落地",
    show: ["Toast 做即时确认", "必要时在页面中更新持续状态"],
    avoid: ["成功后只变数据不提示", "把成功也升级成重型阻断"]
  }
];

export const aiFormFlowRules: AIFormFlowRule[] = [
  {
    id: "draft-vs-submit",
    when: "表单既支持暂存也支持正式提交",
    requiredPieces: ["PageHeader", "FormSection", "ActionBar"],
    avoid: ["把保存草稿和正式提交做成两个等权 primary", "草稿成功后不给任何反馈"]
  },
  {
    id: "validation-escalation",
    when: "字段错误超过一个，或跨字段规则冲突",
    requiredPieces: ["字段级 message", "ValidationSummary", "明确的恢复动作"],
    avoid: ["只在顶部报一句失败", "只在字段旁边零散报错而没有整体回顾"]
  },
  {
    id: "submit-success",
    when: "数据已经成功保存或生效",
    requiredPieces: ["Toast", "必要时更新页面内持续状态"],
    avoid: ["提交成功后毫无反馈", "成功也弹重型阻断窗口"]
  },
  {
    id: "blocked-submit",
    when: "存在高风险配置或不可逆后果，需要最终确认",
    requiredPieces: ["ValidationSummary 或风险说明", "Modal"],
    avoid: ["直接把提交按钮点掉但不解释", "把高风险提交伪装成普通保存"]
  }
];

export const aiDetailInformationRules: AIDetailInformationRule[] = [
  {
    id: "detail-page-entry",
    when: "页面需要先让用户判断“值不值得处理”",
    requiredPieces: ["PageHeader", "MetricStrip 或 KPI 摘要", "KeyValueList", "StatCard 或风险摘要"],
    hardRules: ["首屏先给对象、状态和风险判断", "不要让用户滚到中段才知道这是谁"]
  },
  {
    id: "evidence-and-context",
    when: "页面同时需要问题证据和业务上下文",
    requiredPieces: ["SectionHeader", "DataTable 或明细块", "Timeline 或 ActivityFeed", "DetailAside"],
    hardRules: ["主区放问题与证据", "侧栏只放帮助决策的上下文", "Timeline 只承载时序信息", "ActivityFeed 优先表达连续日志而不是因果链"]
  },
  {
    id: "action-placement",
    when: "详情页同时存在普通动作和危险动作",
    requiredPieces: ["PageHeader actions", "ActionBar 或 Section actions", "Modal"],
    hardRules: ["页级主动作放首屏", "危险动作显式分层", "不要把所有动作都塞进表格尾列"]
  }
];

export const aiSummaryRules: AISummaryRule[] = [
  {
    id: "kpi-first",
    when: "页面首屏要先帮助用户判断整体态势",
    requiredPieces: ["KPIGroup", "统一口径的 value/trend/meta", "必要时再接 ChartCard"],
    avoid: ["一上来先堆图表", "同一排 KPI 混用三种格式和量纲"]
  },
  {
    id: "query-summary-first",
    when: "搜索或筛选已经生效，用户要先判断结果值不值得继续看",
    requiredPieces: ["FilterSummary", "结果规模", "已生效筛选条件"],
    avoid: ["让 chips 和分页争抢同一行", "筛选条件只藏在控件里不回显"]
  },
  {
    id: "compare-before-detail",
    when: "页面目的是审查差异而不是阅读台账",
    requiredPieces: ["DiffSummary 或 CompareBlock", "差异结论", "必要时再下钻 Timeline 或表格"],
    avoid: ["还没给差异结论就先丢一大表数据", "把左右两端写成两种不同口径"]
  },
  {
    id: "split-view-discipline",
    when: "页面存在主内容和辅助内容分栏",
    requiredPieces: ["SplitView", "明确的 main", "辅助区只承担上下文或旁路任务"],
    avoid: ["三栏都想当主角", "让长内容把全局布局撑坏"]
  },
  {
    id: "inline-notice-boundary",
    when: "区块内需要持续提醒，但还没到整页告警等级",
    requiredPieces: ["InlineNotice", "区块级上下文", "明确的下一步动作"],
    avoid: ["拿 InlineNotice 代替整页错误状态", "一有提醒就升级成 Alert"]
  },
  {
    id: "risk-before-decision",
    when: "页面存在明确审批、放行或发布判断",
    requiredPieces: ["RiskSummary", "DecisionPanel", "必要时再加 ReviewChecklist"],
    avoid: ["还没给风险结论就让用户做决定", "把决策按钮孤零零丢在页面角落"]
  },
  {
    id: "review-before-release",
    when: "发布、审批、规则变更前需要明确检查口径",
    requiredPieces: ["ReviewChecklist", "固定检查项", "差异结论或风险摘要"],
    avoid: ["只给一个确认按钮不解释检查项", "把评审标准散在多段说明里"]
  },
  {
    id: "field-cluster-boundary",
    when: "复杂表单里一组字段必须一起理解和校验",
    requiredPieces: ["FieldGroup", "同语义字段", "必要的 hint 或说明"],
    avoid: ["为了好看给每个字段都单独包组", "页面级分节和字段组混成一层"]
  },
  {
    id: "empty-block-boundary",
    when: "只有局部区块暂无数据，但页面整体仍然成立",
    requiredPieces: ["EmptyBlock", "局部上下文", "可执行下一步"],
    avoid: ["局部空态直接留白", "局部空态伪装成错误或整页空态"]
  }
];
