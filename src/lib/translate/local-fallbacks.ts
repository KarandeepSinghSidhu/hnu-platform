// Hand-curated English -> Simplified-Chinese translations for the site's fixed
// chrome (hero copy, section headings, study blurbs). Consulted before the
// translation provider so this static, frequently-shown copy renders instantly
// and stays correct even when the provider is unavailable or rate-limited.
// Keys are normalised (see normalizeTranslationKey) so whitespace differences
// between the stored source and the runtime string don't cause misses.

import type { TranslateFormat } from "./provider";

const normalizeTranslationKey = (value: string) =>
  value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

const textFallbacks = new Map<string, string>(
  Object.entries({
    "Unlock the power of food with \n the Human Nutrition Unit":
      "与 Human Nutrition Unit 一起释放食物的力量",
    "JOIN A STUDY": "加入研究项目",
    "NZ Synergy Study Now Recruiting": "NZ Synergy 研究正在招募参与者",
    "May 2026": "2026 年 5 月",
    "We are now actively recruiting participants for our NZ Synergy residential nutrition study.":
      "我们正在为 NZ Synergy 住院式营养研究招募参与者。",
    "If you are aged 18–60 with elevated fasting blood sugar and a BMI of 24–40, you may be eligible.":
      "如果你年龄在 18 至 60 岁之间，空腹血糖偏高且 BMI 为 24 至 40，可能符合参与条件。",
    "New Publication Released": "新论文已发表",
    "April 2026": "2026 年 4 月",
    "Our team has published new findings on feijoa whole fruit powder and type 2 diabetes risk markers.":
      "我们的团队发表了关于斐济果全果粉与 2 型糖尿病风险指标的新研究结果。",
    "Check out our current studies!": "查看我们当前的研究项目！",
    "NZ Synergy": "NZ Synergy 研究",
    "A Two-Week Nutrition Study for Diabetes Prevention":
      "一项为期两周的糖尿病预防营养研究",
    "We will investigate whether the foods you eat alter blood markers associated with the risk of developing type 2 diabetes.":
      "我们将研究你摄入的食物是否会影响与 2 型糖尿病发病风险相关的血液指标。",
    "Find out more >": "了解更多 >",
    "NZ Synergy Study": "NZ Synergy 研究",
    "NZ Food and Beverage": "新西兰食品与饮料研究",
    "A Weight Loss Study for Diabetes Prevention":
      "一项面向糖尿病预防的体重管理研究",
    "We will investigate whether daily consumption of feijoa whole fruit powder alters risk of developing type 2 diabetes.":
      "我们将研究每日食用斐济果全果粉是否会改变 2 型糖尿病的发病风险。",
    "NZ Food and Beverage Study": "新西兰食品与饮料研究",
    "About Us": "关于我们",
    "More Information": "更多信息",
    "HNU team member standing by blue railings":
      "站在蓝色栏杆旁的 HNU 团队成员",
    "Our Research": "我们的研究",
    "Read More →": "了解更多 →",
    "HNU research being conducted in the clinical room":
      "HNU 团队在临床室开展研究",
    "Our partners": "我们的合作伙伴",

    "Discover HNU": "了解 HNU",
    "Focused on better health through nutrition.\nLearn more about our work and purpose":
      "专注于通过营养促进更好的健康。\n了解我们的工作与使命",
    "Who are we": "我们是谁",
    "HNU is a University of Auckland research facility, established in 1998 as a collaboration between the School of Biological Sciences and the Department of Medicine at the University of Auckland.":
      "HNU 是奥克兰大学的研究机构，于 1998 年由奥克兰大学生物科学学院与医学系合作成立。",
    "It is New Zealand's only live-in nutrition trials facility which has the capability to carry out long-term human residential studies.":
      "它是新西兰唯一具备开展长期人体住院营养研究能力的住院式营养试验机构。",
    "Collaborate With Us": "与我们合作",
    "Partner with New Zealand's leading nutrition research facility. We work with academic institutions, industry leaders, and government agencies to advance nutrition science.":
      "与新西兰领先的营养研究机构合作。我们与学术机构、行业领袖和政府机构合作，共同推动营养科学发展。",
    "Let's work together": "让我们一起合作",
    "Whether you're looking to fund research, co-develop a study, or explore industry partnerships — we'd love to hear from you.":
      "无论你希望资助研究、共同开发研究项目，还是探索行业合作机会，我们都很乐意与你联系。",
    "Get in touch →": "联系我们 →",
    "Services & Expertise": "服务与专业能力",
    "Learn More": "了解更多",
    "Healthy food on a table": "桌上的健康食物",
    "Capabilities": "研究能力",
    "Modern research laboratory": "现代研究实验室",
    "Trial Design": "试验设计",
    "The Human Nutrition Unit conducts rigorously controlled nutrition intervention trials exploring the relationship between diet, health, and disease outcomes. Studies include randomised, placebo-controlled, single and double-blind designs using both cross-over and parallel methodologies to ensure reliable scientific results. All research follows strict human ethics procedures and Good Clinical Practice (GCP) standards, with approvals from Human Ethics Committees, SCOTT, and MedSafe where required.":
      "Human Nutrition Unit 开展严格控制的营养干预试验，探索饮食、健康与疾病结果之间的关系。研究包括随机、安慰剂对照、单盲和双盲设计，并采用交叉或平行方法，以确保可靠的科学结果。所有研究均遵循严格的人体伦理程序和良好临床实践（GCP）标准，并在需要时获得人体伦理委员会、SCOTT 和 MedSafe 的批准。",
    "Residential & Community Studies": "住院式与社区研究",
    "Facilities": "设施",
    "Explore Our Facilities": "查看我们的设施",
    "Interior of the Human Nutrition Unit facilities":
      "Human Nutrition Unit 设施内部",
    "Visit Us": "欢迎来访",
    "Visit us or get in touch to learn more about our facilities and research. The Human Nutrition Unit is based at the University of Auckland, and we welcome enquiries from researchers, industry partners, and participants interested in our studies.":
      "欢迎来访或联系我们，以进一步了解我们的设施和研究。Human Nutrition Unit 位于奥克兰大学，我们欢迎研究人员、行业合作伙伴以及对研究项目感兴趣的参与者咨询。",
    "Find us and get in contact →": "查找位置并联系我们 →",

    "Residential Trials": "住院式试验",
    "Community Trials": "社区试验",

    "Better health through nutrition science.\nExplore our research in diet, disease, and clinical trials":
      "通过营养科学促进健康。\n探索我们在饮食、疾病与临床试验方面的研究",

    "Our Team": "我们的团队",
    "We're passionate about what we do.\nFind out more about the people behind\nthe Human Nutrition Unit":
      "我们热爱自己的工作。\n进一步了解 Human Nutrition Unit 背后的团队",

    "Our Collaborations": "我们的合作",
    "Building partnerships in nutrition research.\n Learn more about our collaborative\n work and initiatives.":
      "建立营养研究合作伙伴关系。\n了解我们的合作工作与项目。",
    "Get in touch": "联系我们",
    "Academic Partners": "学术合作伙伴",
    "Industry Partners": "行业合作伙伴",
    "Research collaborations and partnerships with industry and academic units, nationally and internationally.":
      "与国内外行业机构和学术单位开展研究合作与伙伴关系。",

    "Contact Us": "联系我们",
    "Have a question or enquiry?\nGet in touch with our team":
      "有问题或咨询？\n请与我们的团队联系",
    "MSc/PhD Opportunities": "硕士 / 博士机会",
    "From time to time, opportunities for MSc or PhD studentship may become available. Feel free to contact us with your expression of interest through the contact form.":
      "我们不时会提供硕士或博士研究机会。欢迎通过联系表单表达你的兴趣。",
    "Internship Opportunities": "实习机会",
    "We do have plenty opportunities for voluntary internship opportunities for both local and international students. Many international students from overseas completed their internship with us as a part of their Bachelor's program. Use the contact form if you are interested in gaining practical experience in human clinical studies.":
      "我们为本地和国际学生提供多种志愿实习机会。许多海外国际学生曾将这里的实习作为本科项目的一部分。如果你希望获得人体临床研究的实践经验，请使用联系表单联系我们。",
    "Volunteering for Clinical Trial as a Study Participant":
      "作为研究参与者志愿参加临床试验",
    "See our current studies or express your interest to participate in a future study through the contact form.":
      "你可以查看当前研究项目，或通过联系表单表达参与未来研究的兴趣。",
    "18 Carrick Place, Mt Eden, Auckland 1024, New Zealand":
      "18 Carrick Place, Mt Eden, Auckland 1024, New Zealand",
  }).map(([source, translated]) => [normalizeTranslationKey(source), translated]),
);

const htmlFallbacks = new Map<string, string>(
  Object.entries({
    "Whether you're looking to fund research, co-develop a study, or explore industry partnerships — we'd love to hear from you.":
      "无论你希望资助研究、共同开发研究项目，还是探索行业合作机会，我们都很乐意与你联系。",
    "<p>HNU is a nutrition research facility within The University of Auckland, New Zealand's most prestigious and largest University.</p><p>The Unit undertakes research to establish links between diet, health and disease prevention.</p>":
      "<p>HNU 是奥克兰大学旗下的营养研究机构。奥克兰大学是新西兰最具声望且规模最大的大学。</p><p>本研究中心致力于通过研究建立饮食、健康与疾病预防之间的联系。</p>",
    "<p>We investigate the effects of whole foods, food components, bioactives and nutraceutical products on health and disease.</p><p>Our research focuses on key areas of human nutrition: obesity, appetite regulation, metabolic syndrome, cardiovascular risk, pre-diabetes and type 2 diabetes.</p>":
      "<p>我们研究全食物、食物成分、生物活性物质以及营养保健产品对健康和疾病的影响。</p><p>我们的研究重点涵盖人类营养学的关键领域：肥胖、食欲调节、代谢综合征、心血管风险、糖尿病前期以及 2 型糖尿病。</p>",
    "<p>The Human Nutrition Unit provides a comprehensive range of services across both academic and commercially funded research. These include consultancy on nutrition regulatory issues and health claims, trial design and protocol development, participant recruitment and screening, and full trial management and coordination. The team also delivers data collection, analysis, interpretation, and the publication of peer-reviewed scientific research.</p>":
      "<p>Human Nutrition Unit 为学术研究和商业资助研究提供全面服务，包括营养法规问题与健康声明咨询、试验设计与方案制定、参与者招募与筛选，以及完整的试验管理和协调。团队还负责数据收集、分析、解释，以及发表同行评审的科学研究成果。</p>",
    "<p>The Unit is equipped to deliver highly controlled and precise nutrition research. Capabilities include controlled diet provision, energy expenditure measurement, anthropometric assessments such as body composition analysis, and clinical procedures including phlebotomy and venous cannulation.</p><p>Additional services include urine and faecal sample collection, with external nursing support available for overnight studies when required.</p>":
      "<p>本研究中心具备开展高度受控且精确的营养研究能力，包括受控饮食供应、能量消耗测量、人体测量评估（如身体成分分析），以及采血和静脉插管等临床流程。</p><p>其他服务还包括尿液和粪便样本采集；在需要进行过夜研究时，也可提供外部护理支持。</p>",
    "Research ranges from single-day clinical visits to fully controlled residential studies lasting up to four weeks, where participants follow carefully managed dietary programmes within the Unit’s facilities. Longer-term community trials allow participants to continue daily life while attending scheduled clinic visits for assessments and dietary interventions. These flexible study models provide highly accurate nutritional research while supporting strong participant compliance and scientifically robust outcomes.":
      "研究形式从单日临床访问，到最长四周的全程受控住院研究不等。在住院研究中，参与者会在本中心设施内遵循精心管理的饮食方案。较长期的社区试验则允许参与者维持日常生活，同时按计划到诊所进行评估和饮食干预。这些灵活的研究模式既能提供高度准确的营养研究结果，也能支持良好的参与者依从性和科学可靠性。",
    "<p>HNU offers a purpose-built research environment designed to support controlled human nutrition studies.</p><p>Facilities include a clinical room for blood collection, an indirect calorimetry room for measuring energy expenditure, an interview lounge, and a biological sample handling laboratory.</p><p>The Unit also features a metabolic kitchen and five fully furnished residential bedrooms, along with bathroom facilities, enabling both short- and long-term live-in studies.</p>":
      "<p>HNU 提供专门设计的研究环境，用于支持受控人体营养研究。</p><p>设施包括用于采血的临床室、用于测量能量消耗的间接量热室、访谈休息区，以及生物样本处理实验室。</p><p>本中心还设有代谢厨房和五间设施齐全的住院卧室，并配有浴室设施，可支持短期和长期住院研究。</p>",
    "Visit us or get in touch to learn more about our facilities and research. The Human Nutrition Unit is based at the University of Auckland, and we welcome enquiries from researchers, industry partners, and participants interested in our studies.":
      "欢迎来访或联系我们，以进一步了解我们的设施和研究。Human Nutrition Unit 位于奥克兰大学，我们欢迎研究人员、行业合作伙伴以及对研究项目感兴趣的参与者咨询。",
    "<p>The Human Nutrition Unit carries out intervention trials investigating the relationships between diet and markers of health and disease.</p><p>Trials are randomised, placebo-controlled, single or double blind interventions and may be of either a cross-over or parallel design.</p><p>All trials are required to conform to human ethics procedures and good clinical practice (GCP), and human ethics committee approval is mandatory. Therapeutic trials are also required to obtain NZ Standing Committee on Therapeutic Trials (SCOTT) and MedSafe approval.</p>":
      "<p>Human Nutrition Unit 开展干预试验，研究饮食与健康和疾病标志物之间的关系。</p><p>试验采用随机、安慰剂对照、单盲或双盲干预设计，并可能采用交叉或平行设计。</p><p>所有试验均须遵循人体伦理程序和良好临床实践（GCP），并必须获得人体伦理委员会批准。治疗性试验还需要获得新西兰治疗试验常设委员会（SCOTT）和 MedSafe 批准。</p>",
    "<p><strong>Day stay (single day) studies</strong> carried out within the Human Nutrition Unit research clinic – these studies require volunteer participants to spend the day at the Unit where a range of tests are carried. Most studies are complete by 5pm when volunteers return home.</p><p><strong>Longer term (1-4 weeks) residential studies</strong> carried out within the Human Nutrition Unit residential facility – these studies require volunteer participants to live at the Unit and follow a carefully controlled dietary regime. Breakfast, dinner and overnight stay occur within the comfortable facilities of the Unit. During the day participants may attend work or study taking with them their food requirements for the day. Careful control and provision of all dietary components increases both the accuracy of the trial, since precise dietary components can be altered, and the compliance of the participants.</p><p>Many of these studies are of a 'cross-over' design, where the participant completes both the treatment and control arms of the trial. This gives additional power to the study to detect significant effects of the dietary component under investigation using only a small number of trial subjects.</p><p>Entry into the trial is randomised and treatment group blinded until completion.</p>":
      "<p><strong>日间（单日）研究</strong>在 Human Nutrition Unit 研究诊所内进行，志愿参与者需要在本中心停留一天并完成一系列测试。多数研究会在下午 5 点前结束，志愿者随后返回家中。</p><p><strong>较长期（1 至 4 周）住院式研究</strong>在 Human Nutrition Unit 住院设施内进行，志愿参与者需要住在本中心并遵循严格控制的饮食方案。早餐、晚餐和过夜均在本中心舒适的设施内完成；白天参与者可以上班或学习，并携带当天所需食物。对所有饮食成分进行严格控制和供应，可以提高试验准确性和参与者依从性。</p><p>许多此类研究采用“交叉”设计，参与者会完成试验的治疗组和对照组两个阶段。这样即使样本量较小，也能提高发现被研究饮食成分显著影响的统计效能。</p><p>进入试验采用随机分配，治疗分组在试验完成前保持盲法。</p>",
    "<p><strong>Long term (3-6 months) community studies</strong> which require visits to the Human Nutrition Unit research clinic for blood tests and other measurements – study participants continue their usual home life attending clinical visits to collect dietary test components and for study measurements. Long term studies allow the testing of products such as putative weight loss agents to be trialed.</p><p>Many of these studies are of a 'parallel' design, where participants are randomised into either the treatment or the control arm of the trial.</p>":
      "<p><strong>长期（3 至 6 个月）社区研究</strong>需要参与者到 Human Nutrition Unit 研究诊所进行血液检测和其他测量。研究参与者可以继续日常居家生活，并按计划到诊所领取饮食测试成分和完成研究测量。长期研究可用于测试潜在体重管理产品等。</p><p>许多此类研究采用“平行”设计，参与者会被随机分配到治疗组或对照组。</p>",
  }).map(([source, translated]) => [normalizeTranslationKey(source), translated]),
);

/**
 * Returns the curated Simplified-Chinese translation for a known English
 * string, or undefined when there is no local entry (callers then fall back to
 * the live translation provider). The format selects which table to consult so
 * HTML and plain-text variants of the same copy can differ.
 */
export function getLocalZhFallback(
  source: string,
  format: TranslateFormat,
): string | undefined {
  const key = normalizeTranslationKey(source);
  return format === "html" ? htmlFallbacks.get(key) : textFallbacks.get(key);
}
