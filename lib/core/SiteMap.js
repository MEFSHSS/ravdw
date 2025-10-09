const dns = require('dns').promises;
const i18n = require('./i18n');

class SiteMapper {
    constructor(lang = 'en') {
        this.lang = lang;
        this.paidTlds = [
            '.com', '.org', '.net', '.biz', '.info', '.name', '.pro', '.mobi', '.tel', '.travel', '.jobs', '.cat', '.aero', '.coop', '.museum',
            '.com.br', '.org.br', '.gov.br', '.mil.br', '.edu.br', '.br', '.us', '.uk', '.co.uk', '.gov.uk', '.ac.uk', '.edu.au', '.gov.au',
            '.ca', '.de', '.fr', '.jp', '.au', '.ru', '.ch', '.it', '.nl', '.se', '.no', '.es', '.mx', '.in', '.cn', '.za', '.nz', '.pt',
            '.gr', '.ie', '.il', '.kr', '.tw', '.hk', '.be', '.at', '.dk', '.fi', '.pl', '.tr', '.cz', '.hu', '.ro', '.sk', '.lt', '.lv',
            '.ee', '.ua', '.by', '.sg', '.my', '.th', '.ph', '.vn', '.ar', '.cl', '.pe',
            '.dev', '.app', '.tech', '.io', '.me', '.co', '.xyz', '.online', '.site', '.store', '.website', '.space', '.fun', '.life',
            '.digital', '.solutions', '.cloud', '.design', '.agency', '.studio', '.media', '.blue', '.green', '.red', '.news', '.press',
            '.world', '.center', '.shop', '.software', '.systems', '.services', '.group', '.team', '.company', '.network',
            '.gov', '.mil', '.edu', '.int',
            '.bio', '.bio.br', '.eco', '.art', '.bank', '.finance', '.law', '.health', '.pharmacy', '.science', '.energy',
            '.io', '.ai', '.tv', '.fm', '.gg'
        ];

        this.freeHostingDomains = [
            'pages.dev', 'github.io', 'vercel.app', 'netlify.app', 'web.app', 'glitch.me',
            'herokuapp.com', 'wordpress.com', 'blogspot.com', 'weebly.com', '000webhost.com',
            'infinityfree.net', 'awardspace.com', 'freenom.com', 'dot.tk', 'wixsite.com',
            'square.site', 'blogger.com', 'tumblr.com', 'medium.com', 'substack.com',
            'notion.site', 'canva.site', 'webflow.io', 'surge.sh', 'firebaseapp.com',
            'azurewebsites.net', 'awsapps.com', 'googleusercontent.com', 'fbcdn.net',
            'repl.co', 'codesandbox.io', 'stackblitz.com', 'gitpod.io'
        ];

        this.hostingProviders = {
            'pages.dev': {
                name: 'Cloudflare Pages',
                type: 'free_hosting',
                abuseContact: 'abuse@cloudflare.com',
                abuseForm: 'https://abuse.cloudflare.com/',
                requiresSubdomain: true
            },
            'github.io': {
                name: 'GitHub Pages',
                type: 'free_hosting',
                abuseContact: 'support@github.com',
                abuseForm: 'https://support.github.com/contact/report-abuse',
                requiresSubdomain: true
            },
            'vercel.app': {
                name: 'Vercel',
                type: 'free_hosting',
                abuseContact: 'abuse@vercel.com',
                abuseForm: 'https://vercel.com/abuse',
                requiresSubdomain: true
            },
            'netlify.app': {
                name: 'Netlify',
                type: 'free_hosting',
                abuseContact: 'fraud@netlify.com',
                abuseForm: 'https://www.netlify.com/abuse/',
                requiresSubdomain: true
            },
            'web.app': {
                name: 'Firebase Hosting',
                type: 'free_hosting',
                abuseContact: 'firebase-abuse@google.com',
                requiresSubdomain: true
            },
            'glitch.me': {
                name: 'Glitch',
                type: 'free_hosting',
                abuseContact: 'support@glitch.com',
                requiresSubdomain: true
            },
            'herokuapp.com': {
                name: 'Heroku',
                type: 'free_hosting',
                abuseContact: 'abuse@heroku.com',
                requiresSubdomain: true
            },
            'wordpress.com': {
                name: 'WordPress.com',
                type: 'free_hosting',
                abuseContact: 'abuse@wordpress.com',
                abuseForm: 'https://wordpress.com/abuse/',
                requiresSubdomain: true
            },
            'blogspot.com': {
                name: 'Blogger',
                type: 'free_hosting',
                abuseContact: 'abuse@google.com',
                requiresSubdomain: true
            },
            'weebly.com': {
                name: 'Weebly',
                type: 'free_hosting',
                abuseContact: 'abuse@weebly.com',
                abuseForm: 'https://www.weebly.com/abuse',
                requiresSubdomain: true
            },
            '000webhost.com': {
                name: '000webhost',
                type: 'free_hosting',
                abuseContact: 'abuse@000webhost.com',
                requiresSubdomain: true
            },
            'infinityfree.net': {
                name: 'InfinityFree',
                type: 'free_hosting',
                abuseContact: 'abuse@infinityfree.net',
                requiresSubdomain: true
            },
            'wixsite.com': {
                name: 'Wix',
                type: 'free_hosting',
                abuseContact: 'abuse@wix.com',
                abuseForm: 'https://www.wix.com/about/abuse',
                requiresSubdomain: true
            },
            'repl.co': {
                name: 'Replit',
                type: 'free_hosting',
                abuseContact: 'contact@replit.com',
                requiresSubdomain: true
            }
        };
    }

    async analyzeDomain(domain) {
        const result = {
            domain: domain,
            isFreeHosting: false,
            hostingProvider: null,
            tldType: 'unknown',
            subdomain: null,
            rootDomain: domain,
            suggestions: [],
            detectedBy: [],
            dnsRecords: {}
        };

        let cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];
        
        await this.detectTld(cleanDomain, result);
        await this.detectFreeHosting(cleanDomain, result);
        await this.detectSubdomain(cleanDomain, result);
        await this.queryDnsRecords(cleanDomain, result);
        this.generateSuggestions(result);

        return result;
    }

    async detectTld(domain, result) {
        for (const tld of this.paidTlds) {
            if (domain.endsWith(tld)) {
                result.tldType = 'paid';
                result.detectedBy.push(`tld:${tld}`);
                return;
            }
        }

        const domainParts = domain.split('.');
        if (domainParts.length >= 2) {
            const potentialTld = '.' + domainParts.slice(-2).join('.');
            const potentialTld2 = '.' + domainParts.slice(-1)[0];
            
            if (!this.paidTlds.includes(potentialTld) && !this.paidTlds.includes(potentialTld2)) {
                result.tldType = 'free_or_unknown';
                result.detectedBy.push('tld_analysis');
            }
        }
    }

    async detectFreeHosting(domain, result) {
        for (const freeDomain of this.freeHostingDomains) {
            if (domain === freeDomain || domain.endsWith('.' + freeDomain)) {
                result.isFreeHosting = true;
                result.hostingProvider = this.hostingProviders[freeDomain] || { 
                    name: freeDomain, 
                    type: 'free_hosting' 
                };
                result.detectedBy.push(`free_hosting:${freeDomain}`);
                
                if (domain.endsWith('.' + freeDomain) && domain !== freeDomain) {
                    result.subdomain = domain.replace('.' + freeDomain, '');
                    result.rootDomain = freeDomain;
                }
                break;
            }
        }

        if (!result.isFreeHosting) {
            await this.verifyByDns(domain, result);
        }
    }

    async verifyByDns(domain, result) {
        try {
            const cnameRecords = await dns.resolveCname(domain).catch(() => []);
            
            for (const cname of cnameRecords) {
                for (const freeDomain of this.freeHostingDomains) {
                    if (cname.includes(freeDomain)) {
                        result.isFreeHosting = true;
                        result.hostingProvider = this.hostingProviders[freeDomain] || { 
                            name: freeDomain, 
                            type: 'free_hosting' 
                        };
                        result.detectedBy.push(`dns_cname:${freeDomain}`);
                        return;
                    }
                }
            }

            const aRecords = await dns.resolve4(domain).catch(() => []);
            const aaaaRecords = await dns.resolve6(domain).catch(() => []);
            const allIps = [...aRecords, ...aaaaRecords];

            const freeHostingIps = [
                '185.199.108.0/24', '185.199.109.0/24', '185.199.110.0/24', '185.199.111.0/24',
                '216.239.32.0/19', '172.217.0.0/19',
                '35.186.224.0/19', '76.76.21.0/24'
            ];

            for (const ip of allIps) {
                if (this.isInIpRange(ip, freeHostingIps)) {
                    result.isFreeHosting = true;
                    result.detectedBy.push(`dns_ip:${ip}`);
                    break;
                }
            }
        } catch (error) {
        }
    }

    detectSubdomain(domain, result) {
        const domainParts = domain.split('.');
        
        if (domainParts.length > 2) {
            const potentialSubdomain = domainParts.slice(0, -2).join('.');
            const baseDomain = domainParts.slice(-2).join('.');
            
            const isBaseDomainPaid = this.paidTlds.some(tld => baseDomain.endsWith(tld));
            
            if (!isBaseDomainPaid && potentialSubdomain) {
                result.subdomain = potentialSubdomain;
                result.rootDomain = baseDomain;
                result.detectedBy.push('subdomain_detection');
            }
        }
    }

    async queryDnsRecords(domain, result) {
        try {
            const records = {};
            
            try {
                records.A = await dns.resolve4(domain);
            } catch (error) {
                records.A = [];
            }

            try {
                records.CNAME = await dns.resolveCname(domain);
            } catch (error) {
                records.CNAME = [];
            }

            try {
                records.MX = await dns.resolveMx(domain);
            } catch (error) {
                records.MX = [];
            }

            try {
                records.TXT = await dns.resolveTxt(domain);
            } catch (error) {
                records.TXT = [];
            }

            result.dnsRecords = records;
        } catch (error) {
            result.dnsRecords = { error: error.message };
        }
    }

       generateSuggestions(result) {
        if (result.isFreeHosting && result.hostingProvider) {
            result.suggestions.push({
                type: 'hosting_provider',
                provider: result.hostingProvider.name,
                contact: result.hostingProvider.abuseContact,
                form: result.hostingProvider.abuseForm,
                message: i18n.t('sitemap.hosting_provider', this.lang, { 
                    provider: result.hostingProvider.name 
                })
            });
        }

        if (result.subdomain) {
            result.suggestions.push({
                type: 'subdomain_warning',
                message: i18n.t('sitemap.subdomain_warning', this.lang, {
                    subdomain: result.subdomain,
                    rootDomain: result.rootDomain
                })
            });
        }

        if (result.tldType === 'free_or_unknown') {
            result.suggestions.push({
                type: 'tld_warning',
                message: i18n.t('sitemap.tld_warning', this.lang)
            });
        }
    }

    async findCommonSubdomains(domain, wordlist = null) {
        const commonSubdomains = wordlist || [
            'www', 'mail', 'ftp', 'localhost', 'webmail', 'smtp', 'pop', 'ns1', 'ns2',
            'cdn', 'api', 'admin', 'blog', 'shop', 'store', 'app', 'dev', 'test',
            'staging', 'secure', 'portal', 'cpanel', 'whm', 'webdisk', 'webadmin',
            'server', 'ns', 'dns', 'mx', 'imap', 'apps', 'support', 'help',
            'news', 'forum', 'community', 'chat', 'docs', 'wiki', 'status'
        ];

        const foundSubdomains = [];
        
        for (const sub of commonSubdomains) {
            const subdomain = `${sub}.${domain}`;
            try {
                await dns.resolve4(subdomain);
                foundSubdomains.push({
                    subdomain: subdomain,
                    type: 'A',
                    status: 'active'
                });
            } catch (error) {
            }
        }

        return foundSubdomains;
    }

    async comprehensiveAnalysis(domain) {
        const analysis = await this.analyzeDomain(domain);
        const subdomains = await this.findCommonSubdomains(analysis.rootDomain);
        
        return {
            ...analysis,
            subdomainEnumeration: {
                totalFound: subdomains.length,
                subdomains: subdomains
            },
            riskAssessment: this.assessRisk(analysis),
            timestamp: new Date().toISOString()
        };
    }

       assessRisk(analysis) {
        let riskScore = 0;
        const factors = [];

        if (analysis.isFreeHosting) {
            riskScore += 30;
            factors.push(i18n.t('sitemap.risk_factors.free_hosting', this.lang));
        }

        if (analysis.tldType === 'free_or_unknown') {
            riskScore += 20;
            factors.push(i18n.t('sitemap.risk_factors.unknown_tld', this.lang));
        }

        if (analysis.subdomain) {
            riskScore += 15;
            factors.push(i18n.t('sitemap.risk_factors.subdomain', this.lang));
        }

        let level;
        if (riskScore >= 50) {
            level = i18n.t('sitemap.risk_levels.high', this.lang);
        } else if (riskScore >= 25) {
            level = i18n.t('sitemap.risk_levels.medium', this.lang);
        } else {
            level = i18n.t('sitemap.risk_levels.low', this.lang);
        }

        return { 
            score: riskScore, 
            level: level, 
            factors 
        };
    }

    isInIpRange(ip, ranges) {
        const ipParts = ip.split('.').map(Number);
        
        for (const range of ranges) {
            if (range.includes(ip)) {
                return true;
            }
        }
        
        return false;
    }
}

module.exports = SiteMapper;