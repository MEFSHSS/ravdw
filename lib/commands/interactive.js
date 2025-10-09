const chalk = require('chalk');
const { getVersion } = require('../index');
const { quickLookupMode } = require('./lookup');
const { generateReportMode } = require('./report');
const { validateAndCleanDomain, displayBanner } = require('../core/utils');
const i18n = require('../core/i18n.js');

function getGoodbyeMessage(lang) {
    return i18n.t('common.goodbye', lang);
}

async function interactiveMode(lang) {
    let inquirer;
    
    try {
        try {
            inquirer = (await import('inquirer')).default;
        } catch {
            inquirer = require('inquirer');
        }

        console.clear();
        displayBanner(getVersion());

        const mainMenuChoices = Object.values(i18n.t('interactive.main_menu.choices', lang));

        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: chalk.yellow(i18n.t('interactive.main_menu.message', lang)),
                choices: mainMenuChoices
            }
        ]);

        if (action === 'exit') {
            console.log(chalk.yellow(getGoodbyeMessage(lang)));
            process.exit(0);
        }

        const { domain } = await inquirer.prompt([
            {
                type: 'input',
                name: 'domain',
                message: chalk.yellow(i18n.t('interactive.domain_prompt', lang)),
                validate: (input) => {
                    const result = validateAndCleanDomain(input);
                    return typeof result === 'string' ? true : result;
                },
                filter: (input) => validateAndCleanDomain(input)
            }
        ]);

        if (action === 'lookup') {
            await quickLookupMode(domain, lang);
        } else if (action === 'report') {
            await generateReportMode(domain, lang);
        }

        const { continueUsing } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'continueUsing',
                message: chalk.cyan(i18n.t('interactive.continue_using', lang)),
                default: true
            }
        ]);

        if (continueUsing) {
            await interactiveMode(lang);
        } else {
            console.log(chalk.yellow(getGoodbyeMessage(lang)));
        }

    } catch (error) {
        if (error.message !== 'User force closed the prompt with 0 null') {
            const { handleError } = require('../core/utils');
            handleError(error, lang);
        }
    }
}

module.exports = {
    interactiveMode
};