#!/usr/bin/env node

const chalk = require('chalk');
const boxen = require('boxen');
const figlet = require('figlet');
const { getVersion } = require('../lib');
const { detectSystemLanguage, handleError } = require('../lib/utils');
const { interactiveMode } = require('../lib/commands/interactive');
const { quickLookupMode } = require('../lib/commands/lookup');
const { generateReportMode } = require('../lib/commands/report');
const i18n = require('../lib/i18n');

function getCommands(lang) {
    return {
        lookup: i18n.t('cli.commands.lookup', lang),
        report: i18n.t('cli.commands.report', lang),
        interactive: i18n.t('cli.commands.interactive', lang),
        help: i18n.t('cli.commands.help', lang),
        version: i18n.t('cli.commands.version', lang)
    };
}

function displayHelp() {
    const systemLang = detectSystemLanguage();
    const version = getVersion();
    const commands = getCommands(systemLang);
    
    const helpText = chalk.cyan.bold(i18n.t('cli.help.title', systemLang) + '\n\n') +
        chalk.white(i18n.t('cli.help.usage', systemLang) + ' ') + chalk.green('ravdw [comando] [opções]\n\n') +
        chalk.cyan.bold(i18n.t('cli.help.main_commands', systemLang) + '\n') +
        chalk.green('  ravdw') + chalk.gray(' ' + i18n.t('cli.usage_examples.interactive_default', systemLang) + '\n') +
        chalk.green('  ravdw exemplo.com') + chalk.gray(' ' + i18n.t('cli.usage_examples.quick_lookup', systemLang) + '\n') +
        chalk.green('  ravdw lookup exemplo.com') + chalk.gray(' ' + i18n.t('cli.usage_examples.specific_lookup', systemLang) + '\n') +
        chalk.green('  ravdw report exemplo.com') + chalk.gray(' ' + i18n.t('cli.usage_examples.generate_report', systemLang) + '\n\n') +
        chalk.cyan.bold(i18n.t('cli.help.other_commands', systemLang) + '\n') +
        chalk.green('  ravdw help') + chalk.gray(' ' + i18n.t('cli.usage_examples.show_help', systemLang) + '\n') +
        chalk.green('  ravdw version') + chalk.gray(' ' + i18n.t('cli.usage_examples.show_version', systemLang) + '\n\n') +
        chalk.cyan.bold(i18n.t('cli.help.report_options', systemLang) + '\n') +
        chalk.green('  ravdw report <domínio> --type=<violação> --evidence=<links>\n') +
        chalk.gray('    --type=phishing|piracy|lgpd|malware|scam|hate|copyright|childporn|other\n') +
        chalk.gray('    --evidence=url1,url2,url3\n\n') +
        chalk.gray(i18n.t('cli.help.version', systemLang) + ' ') + chalk.yellow(version) + chalk.gray(' | ' + i18n.t('cli.help.compatible', systemLang));

    console.log(
        boxen(
            helpText,
            {
                padding: 1,
                borderColor: 'blue',
                borderStyle: 'round',
                margin: 1,
                title: i18n.t('cli.help.box_title', systemLang),
                titleAlignment: 'center'
            }
        )
    );
}

function displayVersion() {
    const systemLang = detectSystemLanguage();
    const version = getVersion();
    const bannerText = chalk.cyan.bold(figlet.textSync(i18n.t('cli.version.banner', systemLang), {
        font: 'Small',
        horizontalLayout: 'default'
    })) + '\n' + chalk.gray(`v${version} - ${i18n.t('cli.version.subtitle', systemLang)}`);

    console.log(
        boxen(
            bannerText,
            {
                padding: 1,
                borderColor: 'green',
                borderStyle: 'classic',
                margin: 1,
                textAlignment: 'center'
            }
        )
    );
}

function parseArguments(args) {
    const systemLang = detectSystemLanguage();
    const COMMANDS = getCommands(systemLang);
    
    const parsed = {
        command: 'interactive',
        domain: null,
        options: {}
    };

    if (args.length === 0) {
        return parsed;
    }

    const firstArg = args[0].toLowerCase();
    
    const commandKey = Object.keys(COMMANDS).find(key => 
        key.toLowerCase() === firstArg.toLowerCase()
    );
    
    if (commandKey) {
        parsed.command = commandKey;
        if (args.length > 1 && !args[1].startsWith('--')) {
            parsed.domain = args[1];
        }
    } else if (!firstArg.startsWith('--')) {
        parsed.command = 'lookup';
        parsed.domain = args[0];
    }

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const [key, value] = arg.slice(2).split('=');
            if (key === 'type' && value) {
                parsed.options.violationType = value;
            } else if (key === 'evidence' && value) {
                parsed.options.evidences = value.split(',').map(e => e.trim());
            }
        }
    }

    return parsed;
}

function setupSignalHandlers() {
    process.on('SIGINT', () => {
        const systemLang = detectSystemLanguage();
        console.log(chalk.yellow(`\n\n${i18n.t('common.operation_cancelled', systemLang)}`));
        console.log(chalk.yellow(i18n.t('common.goodbye', systemLang)));
        process.exit(0);
    });
}

async function main() {
    try {
        setupSignalHandlers();
        const systemLang = detectSystemLanguage();
        const args = process.argv.slice(2);
        const { command, domain, options } = parseArguments(args);

        switch (command) {
            case 'lookup':
                if (domain) {
                    await quickLookupMode(domain, systemLang, options);
                } else {
                    console.log(chalk.red(i18n.t('common.domain_not_specified', systemLang)));
                    process.exit(1);
                }
                break;

            case 'report':
                if (domain) {
                    await generateReportMode(domain, systemLang, options);
                } else {
                    console.log(chalk.red(i18n.t('common.domain_not_specified', systemLang)));
                    process.exit(1);
                }
                break;

            case 'interactive':
                await interactiveMode(systemLang);
                break;

            case 'help':
                displayHelp();
                break;

            case 'version':
                displayVersion();
                break;

            default:
                console.log(chalk.red(i18n.t('common.unknown_command', systemLang, { command })));
                displayHelp();
                process.exit(1);
        }

    } catch (error) {
        handleError(error, detectSystemLanguage());
    }
}

if (require.main === module) {
    main().catch(error => {
        const systemLang = detectSystemLanguage();
        console.error(chalk.red(i18n.t('common.fatal_error', systemLang)), error);
        process.exit(1);
    });
}

module.exports = {
    main,
    displayHelp,
    displayVersion,
    parseArguments
};