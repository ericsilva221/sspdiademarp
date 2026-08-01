

class BannerManagerV2 {
    constructor() {
        this.configCache = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        if (typeof window.dbAPI === 'undefined' || !window.dbAPI) {
            
            setTimeout(() => this.init(), 500);
            return;
        }

        if (window.dbAPI.checkConfiguration && typeof window.dbAPI.checkConfiguration === 'function') {
            await window.dbAPI.checkConfiguration();
        }
        
        if (window.dbAPI.useLocalStorage) {
            this.initialized = true;
            return;
        }

        try {
            await this.loadFromDatabase();
            this.initialized = true;
            this.applyBanner();
        } catch (error) {
            
            if (error.message && error.message.includes('MySQL não configurado')) {
            }
            this.initialized = true;
        }
    }

    async loadFromDatabase() {
        if (typeof window.dbAPI === 'undefined' || !window.dbAPI || window.dbAPI.useLocalStorage) {
            return;
        }

        try {
            const config = await window.dbAPI.getBannerConfig();
            if (config && config.success !== false) {
                this.configCache = config;
            } else if (config && config.error) {
                
            }
        } catch (error) {
            
            if (error.message && error.message.includes('MySQL não configurado')) {
                return; 
            }
            
        }
    }

    getBannerTexts() {
        if (this.configCache) {
            return {
                logoText: this.configCache.logo_text || 'POLÍCIA MILITAR',
                rumoText: this.configCache.rumo_text || 'RUMO AOS',
                numberText: this.configCache.number_text || '200',
                anosText: this.configCache.anos_text || 'ANOS',
                sloganText: this.configCache.slogan_text || 'VAMOS TODOS JUNTOS. NINGUÉM FICA PARA TRÁS.'
            };
        }
        return {
            logoText: 'POLÍCIA MILITAR',
            rumoText: 'RUMO AOS',
            numberText: '200',
            anosText: 'ANOS',
            sloganText: 'VAMOS TODOS JUNTOS. NINGUÉM FICA PARA TRÁS.'
        };
    }

    getBannerImage() {
        if (this.configCache && this.configCache.banner_image) {
            let imageUrl = this.configCache.banner_image;
            
            if (imageUrl && !imageUrl.startsWith('data:')) {
                if (typeof window.normalizeImageUrl === 'function') {
                    imageUrl = window.normalizeImageUrl(imageUrl);
                }
                return imageUrl;
            }
        }
        return '';
    }

    async updateBannerImage(imageUrl) {
        
        if (typeof window.dbAPI === 'undefined' || !window.dbAPI) {
            throw new Error('MySQL não configurado. dbAPI não está disponível.');
        }

        if (window.dbAPI.checkConfiguration && typeof window.dbAPI.checkConfiguration === 'function') {
            await window.dbAPI.checkConfiguration();
        }

        if (window.dbAPI.useLocalStorage) {
            throw new Error('MySQL não configurado. Configure o banco de dados primeiro.');
        }

        if (imageUrl && imageUrl.startsWith('data:')) {
            throw new Error('Imagens base64 não podem ser salvas. Faça upload da imagem.');
        }

        try {
            const texts = this.getBannerTexts();
            let normalizedUrl = imageUrl || '';
            if (normalizedUrl && typeof window.normalizeImageUrl === 'function') {
                normalizedUrl = window.normalizeImageUrl(normalizedUrl);
            }

            const result = await window.dbAPI.updateBannerConfig(normalizedUrl, texts);
            
            if (result && result.success) {
                await this.loadFromDatabase();
                this.applyBanner();
                return { success: true };
            } else {
                throw new Error(result?.error || 'Erro ao salvar banner');
            }
        } catch (error) {
            throw error;
        }
    }

    async updateBannerTexts(texts) {
        
        if (typeof window.dbAPI === 'undefined' || !window.dbAPI) {
            throw new Error('MySQL não configurado. dbAPI não está disponível.');
        }

        if (window.dbAPI.checkConfiguration && typeof window.dbAPI.checkConfiguration === 'function') {
            await window.dbAPI.checkConfiguration();
        }

        if (window.dbAPI.useLocalStorage) {
            throw new Error('MySQL não configurado. Configure o banco de dados primeiro.');
        }

        try {
            const bannerImage = this.getBannerImage();
            const result = await window.dbAPI.updateBannerConfig(bannerImage, texts);
            
            if (result && result.success) {
                await this.loadFromDatabase();
                this.applyBanner();
                return { success: true };
            } else {
                throw new Error(result?.error || 'Erro ao salvar textos');
            }
        } catch (error) {
            throw error;
        }
    }

    applyBanner() {
        
        const banner = document.querySelector('.main-banner');
        const imageUrl = this.getBannerImage();
        
        if (banner && imageUrl && !imageUrl.startsWith('data:')) {
            const urlWithCache = imageUrl + (imageUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
            banner.style.backgroundImage = `url("${urlWithCache}")`;
            banner.style.backgroundSize = 'cover';
            banner.style.backgroundPosition = 'center';
            banner.style.backgroundRepeat = 'no-repeat';
        }

        const texts = this.getBannerTexts();
        const logoTextEl = document.querySelector('.banner-logo-text');
        const rumoTextEl = document.querySelector('.banner-200 .rumo');
        const numberTextEl = document.querySelector('.banner-200 .number-200');
        const anosTextEl = document.querySelector('.banner-200 .anos');
        const sloganTextEl = document.querySelector('.banner-slogan');
        
        if (logoTextEl) logoTextEl.textContent = texts.logoText;
        if (rumoTextEl) rumoTextEl.textContent = texts.rumoText;
        if (numberTextEl) numberTextEl.textContent = texts.numberText;
        if (anosTextEl) anosTextEl.textContent = texts.anosText;
        if (sloganTextEl) sloganTextEl.textContent = texts.sloganText;
    }
}

window.bannerManagerV2 = new BannerManagerV2();

(function initBannerManagerV2() {
    if (typeof window.dbAPI !== 'undefined' && window.dbAPI && !window.dbAPI.useLocalStorage) {
        window.bannerManagerV2.init();
    } else {
        setTimeout(initBannerManagerV2, 100);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (window.bannerManagerV2) {
                window.bannerManagerV2.applyBanner();
            }
        });
    } else {
        setTimeout(() => {
            if (window.bannerManagerV2) {
                window.bannerManagerV2.applyBanner();
            }
        }, 200);
    }
})();
