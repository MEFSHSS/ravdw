const chalk = require('chalk');
const { lookupDomain, generateReport } = require('../index');
const { validateAndCleanDomain } = require('../core/utils');
const i18n = require('../core/i18n');

const VIOLATION_TYPES = {
    phishing: i18n.t('report.violation_types.phishing', 'en'),
    piracy: i18n.t('report.violation_types.piracy', 'en'),
    lgpd: i18n.t('report.violation_types.lgpd', 'en'),
    childporn: i18n.t('report.violation_types.childporn', 'en'),
    hate: i18n.t('report.violation_types.hate', 'en'),
    scam: i18n.t('report.violation_types.scam', 'en'),
    copyright: i18n.t('report.violation_types.copyright', 'en'),
    malware: i18n.t('report.violation_types.malware', 'en'),
    spam: i18n.t('report.violation_types.spam', 'en'),
    other: i18n.t('report.violation_types.other', 'en')
};

const APPLICABLE_LAWS = {
    phishing: {
        pt: [
            'Art. 154-A do CP — Invasão de Dispositivo Informático',
            'Art. 171, §2º-A do CP — Fraude Eletrônica',
            'Lei 12.965/2014 — Marco Civil da Internet'
        ],
        en: [
            'U.S. Computer Fraud and Abuse Act (CFAA)',
            'EU Directive 2013/40/EU — Cyber Attacks',
            'GDPR Article 5(1)(f) — Data Integrity'
        ]
    },
    piracy: {
        pt: [
            'Lei 9.610/1998 — Direitos Autorais',
            'Art. 184 do CP — Violação de Direito Autoral'
        ],
        en: [
            'Digital Millennium Copyright Act (DMCA)',
            'Copyright, Designs and Patents Act 1988 (UK)'
        ]
    },
    lgpd: {
        pt: ['Lei 13.709/2018 — Lei Geral de Proteção de Dados (LGPD)'],
        en: ['General Data Protection Regulation (EU) 2016/679 — GDPR']
    },
    childporn: {
        pt: ['Art. 241 do ECA — Divulgação de Conteúdo Explícito Infantil'],
        en: [
            '18 U.S.C. §2252 — Child Exploitation Laws',
            'EU Directive 2011/93/EU — Child Sexual Abuse'
        ]
    },
    hate: {
        pt: [
            'Lei 7.716/1989 — Crimes de Racismo',
            'Art. 20 da Lei 7.716/1989'
        ],
        en: ['International Covenant on Civil and Political Rights — Article 20']
    },
    scam: {
        pt: [
            'Art. 171 do CP — Estelionato',
            'Art. 4º da Lei 8.137/1990 — Crimes Contra a Economia Popular'
        ],
        en: [
            '18 U.S.C. §1343 — Wire Fraud',
            'Fraud Act 2006 (UK)'
        ]
    },
    copyright: {
        pt: [
            'Lei 9.610/1998 — Direito Autoral',
            'Art. 184 do CP'
        ],
        en: [
            'Digital Millennium Copyright Act (DMCA)',
            'Copyright, Designs and Patents Act 1988 (UK)'
        ]
    },
    malware: {
        pt: [
            'Art. 154-A do CP — Invasão de Sistema',
            'Lei 12.965/14 — Marco Civil da Internet'
        ],
        en: [
            'Computer Fraud and Abuse Act (CFAA)',
            'Budapest Convention on Cybercrime'
        ]
    },
    spam: {
        pt: ['Lei 12.965/2014 — Marco Civil da Internet'],
        en: ['CAN-SPAM Act (USA)', 'GDPR Article 13']
    },
    other: {
        pt: ['Lei aplicável conforme legislação local'],
        en: ['Applicable law per local legislation']
    }
};

async function generateReportMode(domain, lang, options = {}) {
    let inquirer;

    try {
        try {
            inquirer = (await import('inquirer')).default;
        } catch {
            inquirer = require('inquirer');
        }

        const cleanDomain = validateAndCleanDomain(domain);
        if (typeof cleanDomain !== 'string') {
            console.log(chalk.red(i18n.t('common.invalid_domain', lang)), cleanDomain);
            process.exit(1);
        }

        console.log(chalk.gray(`\n${i18n.t('common.querying_whois', lang)} ${cleanDomain}...`));

        const result = await lookupDomain(cleanDomain, {
            lang: lang,
            timeout: options.timeout || 30000
        });

        let selectedViolations = options.violationType ? [options.violationType] : [];
        if (selectedViolations.length === 0) {
            selectedViolations = await selectViolations(inquirer, lang);
        }

        let evidences = options.evidences || [];
        if (evidences.length === 0) {
            evidences = await collectEvidences(inquirer, lang);
        }

        const reportLang = await selectReportLanguage(inquirer, lang);

        console.log(chalk.gray(`\n${i18n.t('common.generating_report', lang)}`));

        const reportPath = await generateReport({
            domain: cleanDomain,
            result,
            violations: selectedViolations,
            evidences,
            lang: reportLang,
            outputDir: options.outputDir
        });

        displaySuccessMessage(reportPath, reportLang, cleanDomain);

    } catch (error) {
        const { handleError } = require('../core/utils');
        handleError(error, lang);
    }
}

async function selectReportLanguage(inquirer, currentLang) {
    const { reportLanguage } = await inquirer.prompt([
        {
            type: 'list',
            name: 'reportLanguage',
            message: chalk.yellow(i18n.t('report.select_report_language', currentLang)),
            choices: i18n.t('report.language_choices', currentLang),
            default: currentLang
        }
    ]);

    return reportLanguage;
}

async function selectViolations(inquirer, lang) {
    const choices = Object.entries(VIOLATION_TYPES).map(([key, data]) => ({
        name: `${data.name} - ${data.description}`,
        value: key
    }));

    const { selectedViolations } = await inquirer.prompt([
        {
            type: 'checkbox',
            name: 'selectedViolations',
            message: chalk.yellow(i18n.t('report.select_violations', lang)),
            choices: choices,
            validate: (input) => {
                if (input.length === 0) {
                    return lang === 'pt' ?
                        'Por favor, selecione pelo menos um tipo de violação.' :
                        'Please select at least one violation type.';
                }
                return true;
            }
        }
    ]);

    return selectedViolations;
}

async function collectEvidences(inquirer, lang) {
    const { evidenceInput } = await inquirer.prompt([
        {
            type: 'input',
            name: 'evidenceInput',
            message: chalk.cyan(i18n.t('report.evidence_prompt', lang) + '\n' + chalk.gray(i18n.t('report.evidence_example', lang))),
            validate: (input) => {
                if (!input || input.trim() === '') {
                    return i18n.t('report.evidence_required', lang);
                }
                return true;
            }
        }
    ]);

    return evidenceInput
        .split(',')
        .map(e => e.trim())
        .filter(Boolean)
        .map(e => e.startsWith('http') ? e : 'https://' + e);
}

function displaySuccessMessage(reportPath, lang, domain) {
    console.log(chalk.green(i18n.t('common.report_generated', lang) + ` ${reportPath}\n`));
    console.log(chalk.yellow(i18n.t('common.report_ready', lang, { domain })));
    console.log(chalk.cyan(i18n.t('common.next_steps_included', lang)));
}

module.exports = {
    generateReportMode
};