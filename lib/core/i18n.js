const fs = require('fs');
const path = require('path');

class I18n {
    constructor() {
        this.translations = this.loadTranslations();
        this.defaultLang = 'en';
    }

    loadTranslations() {
        try {
            const possiblePaths = [
                path.join(__dirname, 'lang.json'),
                path.join(__dirname, '..', 'lang.json'),
                path.join(process.cwd(), 'lib', 'lang.json')
            ];

            let translations = {};

            for (const langPath of possiblePaths) {
                try {
                    if (fs.existsSync(langPath)) {
                        console.log(`📁 Loading translations from: ${langPath}`);
                        translations = JSON.parse(fs.readFileSync(langPath, 'utf8'));
                        break;
                    }
                } catch (error) {
                    console.error(`❌ Error loading ${langPath}:`, error.message);
                }
            }

            if (Object.keys(translations).length === 0) {
                console.error('❌ No translation files found! Using empty translations.');
                return { en: {}, pt: {} };
            }

            console.log('✅ Translations loaded successfully');
            return translations;

        } catch (error) {
            console.error('❌ Critical error loading translations:', error);
            return { en: {}, pt: {} };
        }
    }

    t(key, lang = 'en', variables = {}) {
        if (Object.keys(this.translations).length === 0) {
            return key;
        }

        const keys = key.split('.');
        let translation = this.translations[lang] || this.translations[this.defaultLang];

        for (const k of keys) {
            translation = translation?.[k];
            if (translation === undefined) {

                let fallbackTranslation = this.translations[this.defaultLang];
                for (const k2 of keys) {
                    fallbackTranslation = fallbackTranslation?.[k2];
                    if (fallbackTranslation === undefined) {
                        return key;
                    }
                }
                translation = fallbackTranslation;
                break;
            }
        }

        if (typeof translation === 'object' && translation !== null) {
            return translation;
        }

        if (typeof translation === 'string') {
            return translation.replace(/{(\w+)}/g, (match, variable) => {
                return variables[variable] || match;
            });
        }

        return translation || key;
    }

    getAvailableLanguages() {
        return Object.keys(this.translations);
    }
}

module.exports = new I18n();