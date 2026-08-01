// Sistema de Compliance LGPD/GDPR
// Gerencia consentimentos, privacidade e direitos dos usuários

class LGPDCompliance {
    constructor() {
        this.storageKey = 'lgpd_consents';
        this.cookieKey = 'lgpd_cookies';
        this.init();
    }

    init() {
        console.log('🔵 [LGPD] Inicializando sistema de compliance...');
        // Aguarda DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                console.log('🔵 [LGPD] DOM carregado, inicializando consentimento...');
                this.initializeConsent();
            });
        } else {
            console.log('🔵 [LGPD] DOM já pronto, inicializando consentimento...');
            this.initializeConsent();
        }
    }

    // Inicializa sistema de consentimento
    initializeConsent() {
        // Verifica consentimento antes de tudo
        this.checkAndEnforceConsent();

        // Carrega preferências salvas APENAS se já tiver consentimento válido
        const consents = this.getConsents();
        if (consents && consents.timestamp && Object.keys(consents).length > 1) {
            this.loadPreferences();
        }

        // Protege o banner contra remoção acidental após carregamento completo
        this.protectBanner();
    }

    // Protege o banner contra remoção acidental
    protectBanner() {
        // Monitora tentativas de remover o banner
        const banner = document.getElementById('lgpd-consent-banner');
        if (banner) {
            // Adiciona flag para identificar que o banner está protegido
            banner.setAttribute('data-lgpd-protected', 'true');

            // Observa mudanças no banner
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        const consents = this.getConsents();
                        // Se não tem consentimento válido e o banner está sendo escondido
                        if ((!consents || !consents.timestamp || Object.keys(consents).length <= 1)) {
                            const currentDisplay = banner.style.display;
                            const currentOpacity = banner.style.opacity;

                            // Se está tentando esconder, força mostrar novamente
                            if (currentDisplay === 'none' || currentOpacity === '0') {
                                console.warn('⚠️ Tentativa de esconder banner LGPD sem consentimento - protegendo...');
                                banner.style.display = 'block';
                                banner.style.visibility = 'visible';
                                banner.style.opacity = '1';
                                banner.style.transform = 'translateY(0)';
                                banner.style.zIndex = '99998';
                            }
                        }
                    }
                });
            });

            observer.observe(banner, {
                attributes: true,
                attributeFilter: ['style', 'class']
            });

            // Protege contra remoção do DOM
            const checkBanner = () => {
                const currentBanner = document.getElementById('lgpd-consent-banner');
                const consents = this.getConsents();

                // Se não tem consentimento válido e o banner foi removido, recria
                if (!currentBanner && (!consents || !consents.timestamp || Object.keys(consents).length <= 1)) {
                    console.warn('⚠️ Banner LGPD foi removido sem consentimento - recriando...');
                    this.showConsentBanner();
                }
            };

            // Verifica periodicamente (a cada 500ms) se o banner ainda existe
            setInterval(checkBanner, 500);
        }
    }

    // Verifica e aplica bloqueio se necessário
    checkAndEnforceConsent() {
        const consents = this.getConsents();
        console.log('🔵 [LGPD] Verificando consentimento:', consents);

        // Se não tem consentimento, mostra banner IMEDIATAMENTE
        if (!consents || !consents.timestamp || Object.keys(consents).length <= 1) {
            console.log('🔵 [LGPD] Sem consentimento válido - mostrando banner');
            // Verifica se já existe banner para não duplicar
            const existingBanner = document.getElementById('lgpd-consent-banner');
            if (!existingBanner) {
                // Força mostrar o banner
                console.log('🔵 [LGPD] Criando novo banner...');
                this.showConsentBanner();
            } else {
                // Se já existe, garante que está visível
                console.log('🔵 [LGPD] Banner já existe - garantindo visibilidade');
                existingBanner.style.display = 'block';
                existingBanner.style.visibility = 'visible';
                existingBanner.style.opacity = '1';
                existingBanner.style.transform = 'translateY(0)';
                existingBanner.style.zIndex = '99998';
            }
            return;
        }

        console.log('🔵 [LGPD] Consentimento válido encontrado');
        // Se rejeitou funcionais, bloqueia acesso IMEDIATAMENTE (funcionais são necessários)
        if (consents.functional === false) {
            console.log('🔵 [LGPD] Funcionais rejeitados - bloqueando acesso');
            this.blockAccess();
        } else {
            // Aplica consentimentos salvos
            console.log('🔵 [LGPD] Aplicando consentimentos salvos');
            this.applyConsents(consents);
        }
    }

    // Verifica status de consentimento
    checkConsentStatus() {
        const consents = this.getConsents();
        // Verifica se tem consentimento válido (com timestamp)
        const hasValidConsent = consents &&
            consents.timestamp &&
            Object.keys(consents).length > 1; // Mais que apenas timestamp

        // Verifica também no servidor se o usuário já deu consentimento
        this.checkServerConsent().then(hasServerConsent => {
            if (!hasValidConsent && !hasServerConsent) {
                // Não tem consentimento válido - mostra banner
                setTimeout(() => this.showConsentBanner(), 1000);
            }
        }).catch(() => {
            // Se falhar a verificação no servidor, usa apenas localStorage
            if (!hasValidConsent) {
                setTimeout(() => this.showConsentBanner(), 1000);
            }
        });
    }

    // Verifica consentimento no servidor
    async checkServerConsent() {
        try {
            // Tenta obter ID do usuário se logado
            let userId = null;
            if (window.auth && typeof window.auth.getCurrentUser === 'function') {
                const user = window.auth.getCurrentUser();
                if (user && user.id) {
                    userId = user.id;
                }
            }

            // Se não tem userId, não pode verificar no servidor
            if (!userId) {
                return false;
            }

            // Verifica no servidor (pode ser implementado futuramente)
            // Por enquanto, retorna false para sempre mostrar o banner se não tiver no localStorage
            return false;
        } catch (error) {
            return false;
        }
    }

    // Mostra banner de consentimento LGPD
    showConsentBanner() {
        // Remove banner existente se houver
        const existing = document.getElementById('lgpd-consent-banner');
        if (existing) {
            existing.remove();
        }

        // Remove bloqueio se estiver ativo (para não conflitar)
        const existingBlock = document.getElementById('lgpd-block-overlay');
        if (existingBlock) {
            this.unblockAccess();
        }

        // Aguarda um pouco para garantir que o DOM está pronto
        if (document.body) {
            this.createBanner();
        } else {
            // Se o body ainda não existe, aguarda
            setTimeout(() => this.createBanner(), 100);
        }
    }

    // Cria o banner de consentimento
    createBanner() {
        console.log('🔵 [LGPD] Criando elemento do banner...');
        const banner = document.createElement('div');
        banner.id = 'lgpd-consent-banner';
        banner.className = 'lgpd-banner';
        banner.style.display = 'block';
        banner.style.visibility = 'visible';
        banner.style.opacity = '1';
        banner.style.transform = 'translateY(0)';
        banner.style.zIndex = '99998';
        banner.style.position = 'fixed';
        banner.style.bottom = '0';
        banner.style.left = '0';
        banner.style.right = '0';
        banner.style.width = '100%';
        banner.innerHTML = `
            <div class="lgpd-banner-content">
                <div class="lgpd-banner-text">
                    <h3><i class="fas fa-shield-alt"></i> Privacidade e Proteção de Dados</h3>
                    <p>Este site do servidor de roleplay <strong>Carapicuiba Roleplay</strong> utiliza cookies e tecnologias similares para melhorar sua experiência, 
                    analisar o uso do site e personalizar conteúdo. Ao continuar navegando, você 
                    concorda com nossa <a href="/pages/privacy-policy.html" target="_blank">Política de Privacidade</a> 
                    e com o uso de cookies conforme a <strong>Lei Geral de Proteção de Dados (LGPD)</strong>.</p>
                    <p style="font-size: 12px; margin-top: 8px; opacity: 0.9;"><strong>Nota:</strong> Este é um site fictício para fins de entretenimento em um servidor de roleplay.</p>
                </div>
                <div class="lgpd-banner-actions">
                    <button id="lgpd-accept-all" class="lgpd-btn lgpd-btn-primary">
                        <i class="fas fa-check"></i> Aceitar Todos
                    </button>
                    <button id="lgpd-customize" class="lgpd-btn lgpd-btn-secondary">
                        <i class="fas fa-cog"></i> Personalizar
                    </button>
                    <button id="lgpd-reject-all" class="lgpd-btn lgpd-btn-outline">
                        <i class="fas fa-times"></i> Rejeitar Todos
                    </button>
                </div>
            </div>
        `;

        if (!document.body) {
            console.error('❌ [LGPD] document.body não existe ainda! Aguardando...');
            setTimeout(() => this.createBanner(), 100);
            return;
        }

        document.body.appendChild(banner);
        console.log('✅ [LGPD] Banner adicionado ao DOM');

        // Força verificação visual após um pequeno delay
        setTimeout(() => {
            const checkBanner = document.getElementById('lgpd-consent-banner');
            if (checkBanner) {
                console.log('✅ [LGPD] Banner confirmado no DOM');
                console.log('✅ [LGPD] Estilos do banner:', {
                    display: checkBanner.style.display,
                    visibility: checkBanner.style.visibility,
                    opacity: checkBanner.style.opacity,
                    zIndex: checkBanner.style.zIndex,
                    position: checkBanner.style.position
                });
            } else {
                console.error('❌ [LGPD] Banner não encontrado após criação!');
            }
        }, 100);

        // Garante que o banner está visível e não será escondido
        banner.style.display = 'block';
        banner.style.visibility = 'visible';
        banner.style.opacity = '1';
        banner.style.transform = 'translateY(0)';
        banner.style.zIndex = '99998';
        banner.style.position = 'fixed';
        banner.style.bottom = '0';
        banner.style.left = '0';
        banner.style.right = '0';
        banner.style.width = '100%'; // Alto z-index para ficar acima de tudo

        // Anima entrada do banner
        setTimeout(() => {
            banner.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            banner.style.opacity = '1';
            banner.style.transform = 'translateY(0)';
        }, 10);

        // Event listeners - usando setTimeout para garantir que o DOM esteja pronto
        setTimeout(() => {
            const acceptBtn = document.getElementById('lgpd-accept-all');
            const rejectBtn = document.getElementById('lgpd-reject-all');
            const customizeBtn = document.getElementById('lgpd-customize');

            if (acceptBtn) {
                acceptBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.acceptAll();
                });
            }

            if (rejectBtn) {
                rejectBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.rejectAll();
                });
            }

            if (customizeBtn) {
                customizeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showPreferencesModal();
                });
            }
        }, 100);
    }

    // Aceita todos os cookies
    acceptAll() {
        const consents = {
            necessary: true,
            analytics: true,
            marketing: true,
            functional: true,
            timestamp: new Date().toISOString(),
            consent_type: 'accept_all'
        };
        this.saveConsents(consents);
        this.logConsent('accept_all', consents);
        this.hideBanner();
        this.applyConsents(consents);
    }

    // Rejeita todos os cookies (exceto necessários)
    rejectAll() {
        const consents = {
            necessary: true, // Sempre necessário
            analytics: false,
            marketing: false,
            functional: false, // Rejeita funcionais - isso bloqueará o acesso
            timestamp: new Date().toISOString(),
            consent_type: 'reject_all'
        };
        this.saveConsents(consents);
        this.logConsent('reject_all', consents);
        this.hideBanner();
        // Aplica consentimentos - isso vai bloquear o acesso porque functional = false
        this.applyConsents(consents);
    }

    // Salva consentimentos
    saveConsents(consents) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(consents));
            // Também salva em cookie para persistência entre sessões
            this.setCookie(this.cookieKey, JSON.stringify(consents), 365);
        } catch (e) {
            console.error('Erro ao salvar consentimentos:', e);
        }
    }

    // Obtém consentimentos salvos
    getConsents() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) return JSON.parse(stored);

            // Fallback para cookie
            const cookie = this.getCookie(this.cookieKey);
            if (cookie) return JSON.parse(cookie);

            return null;
        } catch (e) {
            return null;
        }
    }

    // Aplica consentimentos
    applyConsents(consents) {
        // Se rejeitou funcionais, bloqueia acesso IMEDIATAMENTE (funcionais são necessários para o site funcionar)
        if (consents.functional === false || !consents.functional) {
            // Força bloqueio imediato
            setTimeout(() => {
                this.blockAccess();
            }, 100);
            return;
        }

        // Se aceitou funcionais, remove bloqueio e permite acesso
        this.unblockAccess();

        // Desabilita analytics se rejeitado
        if (!consents.analytics) {
            // Remove scripts de analytics
            const analyticsScripts = document.querySelectorAll('script[src*="analytics"], script[src*="gtag"], script[src*="ga("]');
            analyticsScripts.forEach(script => script.remove());

            // Remove event listeners de analytics
            if (window.gtag) delete window.gtag;
            if (window.ga) delete window.ga;
            if (window.dataLayer) window.dataLayer = [];
        }

        // Desabilita marketing se rejeitado
        if (!consents.marketing) {
            // Remove scripts de marketing
            const marketingScripts = document.querySelectorAll('script[src*="marketing"], script[src*="ads"], script[src*="facebook"], script[src*="twitter"]');
            marketingScripts.forEach(script => script.remove());
        }

        // Desabilita funcionais se rejeitado
        if (!consents.functional) {
            // Remove scripts funcionais não essenciais
            const functionalScripts = document.querySelectorAll('script[src*="chat"], script[src*="widget"]');
            functionalScripts.forEach(script => {
                // Mantém apenas se for essencial
                if (!script.src.includes('essential') && !script.src.includes('auth')) {
                    script.remove();
                }
            });
        }

        // Emite evento para outros scripts
        window.dispatchEvent(new CustomEvent('lgpd-consents-updated', { detail: consents }));
    }

    // Bloqueia acesso ao site
    blockAccess() {
        // Remove banner se estiver visível
        const existingBanner = document.getElementById('lgpd-consent-banner');
        if (existingBanner) {
            this.hideBanner();
        }

        // Remove bloqueio existente
        const existing = document.getElementById('lgpd-block-overlay');
        if (existing) {
            existing.remove();
        }

        // Garante que o body existe
        if (!document.body) {
            setTimeout(() => this.blockAccess(), 100);
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'lgpd-block-overlay';
        overlay.className = 'lgpd-block-overlay';
        overlay.style.display = 'flex';
        overlay.style.opacity = '0';
        overlay.innerHTML = `
            <div class="lgpd-block-content">
                <div class="lgpd-block-icon">
                    <i class="fas fa-shield-alt"></i>
                </div>
                <h2>Acesso Bloqueado</h2>
                <p>Para continuar utilizando o site, é necessário aceitar pelo menos os cookies necessários e funcionais.</p>
                <p style="font-size: 14px; color: #666; margin-top: 10px;">Você rejeitou todos os cookies opcionais. Para acessar o site, você precisa aceitar os cookies necessários e funcionais.</p>
                <div class="lgpd-block-actions">
                    <button id="lgpd-block-accept" class="lgpd-btn lgpd-btn-primary">
                        <i class="fas fa-check"></i> Aceitar Cookies Necessários
                    </button>
                    <button id="lgpd-block-customize" class="lgpd-btn lgpd-btn-secondary">
                        <i class="fas fa-cog"></i> Personalizar Preferências
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        // Anima entrada do overlay
        setTimeout(() => {
            overlay.style.transition = 'opacity 0.3s ease';
            overlay.style.opacity = '1';
        }, 10);

        // Event listeners - aguarda um pouco para garantir que os elementos existem
        setTimeout(() => {
            const acceptBtn = document.getElementById('lgpd-block-accept');
            const customizeBtn = document.getElementById('lgpd-block-customize');

            if (acceptBtn) {
                acceptBtn.addEventListener('click', () => {
                    const consents = {
                        necessary: true,
                        analytics: false,
                        marketing: false,
                        functional: true, // Aceita funcionais para permitir acesso
                        timestamp: new Date().toISOString(),
                        consent_type: 'custom'
                    };
                    this.saveConsents(consents);
                    this.logConsent('custom', consents);
                    this.applyConsents(consents);
                    this.unblockAccess();
                });
            }

            if (customizeBtn) {
                customizeBtn.addEventListener('click', () => {
                    this.unblockAccess();
                    setTimeout(() => this.showPreferencesModal(), 300);
                });
            }
        }, 100);
    }

    // Remove bloqueio
    unblockAccess() {
        const overlay = document.getElementById('lgpd-block-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        }
        document.body.style.overflow = '';
    }

    // Carrega preferências salvas
    loadPreferences() {
        const consents = this.getConsents();
        // Só aplica se tiver consentimento válido (com timestamp)
        if (consents && consents.timestamp && Object.keys(consents).length > 1) {
            this.applyConsents(consents);
        }
    }

    // Esconde banner
    hideBanner() {
        const banner = document.getElementById('lgpd-consent-banner');
        if (banner) {
            // Verifica se realmente tem consentimento antes de esconder
            const consents = this.getConsents();
            if (consents && consents.timestamp && Object.keys(consents).length > 1) {
                // Remove a proteção antes de esconder
                banner.removeAttribute('data-lgpd-protected');
                banner.style.opacity = '0';
                banner.style.transform = 'translateY(100%)';
                setTimeout(() => {
                    const bannerCheck = document.getElementById('lgpd-consent-banner');
                    if (bannerCheck && bannerCheck.parentNode) {
                        bannerCheck.remove();
                    }
                }, 300);
            } else {
                // Se não tem consentimento válido, não esconde o banner
                console.warn('⚠️ Tentativa de esconder banner sem consentimento válido - ignorado');
                // Força o banner a ficar visível
                banner.style.display = 'block';
                banner.style.visibility = 'visible';
                banner.style.opacity = '1';
                banner.style.transform = 'translateY(0)';
                banner.style.zIndex = '99998';
            }
        }
    }

    // Mostra modal de preferências
    showPreferencesModal() {
        const existing = document.getElementById('lgpd-preferences-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'lgpd-preferences-modal';
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal-content lgpd-preferences-modal-content">
                <button class="modal-close" id="close-lgpd-modal" aria-label="Fechar">&times;</button>
                <div class="modal-header">
                    <div class="lgpd-modal-icon">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <h2>Preferências de Privacidade</h2>
                    <p>Gerencie suas preferências de cookies e privacidade. Você pode ativar ou desativar diferentes tipos de cookies abaixo.</p>
                </div>
                <div id="lgpd-preferences-alert"></div>
                <form id="lgpd-preferences-form">
                    <div class="lgpd-preferences-list">
                        <div class="lgpd-preference-item">
                            <div class="lgpd-preference-content">
                                <div class="lgpd-preference-info">
                                    <div class="lgpd-preference-title-row">
                                        <label for="lgpd-necessary" class="lgpd-preference-label">
                                            <strong>Cookies Necessários</strong>
                                        </label>
                                        <div class="lgpd-toggle-container">
                                            <input type="checkbox" id="lgpd-necessary" checked disabled class="lgpd-toggle-input">
                                            <label for="lgpd-necessary" class="lgpd-toggle-label disabled">
                                                <span class="lgpd-toggle-slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                    <p class="lgpd-preference-desc">
                                        <i class="fas fa-info-circle"></i> Essenciais para o funcionamento do site. Estes cookies são necessários para autenticação, segurança e funcionalidades básicas. Não podem ser desativados.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="lgpd-preference-item">
                            <div class="lgpd-preference-content">
                                <div class="lgpd-preference-info">
                                    <div class="lgpd-preference-title-row">
                                        <label for="lgpd-analytics" class="lgpd-preference-label">
                                            <strong>Cookies de Análise</strong>
                                        </label>
                                        <div class="lgpd-toggle-container">
                                            <input type="checkbox" id="lgpd-analytics" class="lgpd-toggle-input">
                                            <label for="lgpd-analytics" class="lgpd-toggle-label">
                                                <span class="lgpd-toggle-slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                    <p class="lgpd-preference-desc">
                                        <i class="fas fa-chart-line"></i> Nos ajudam a entender como os visitantes interagem com o site, coletando informações sobre páginas visitadas, tempo de permanência e erros encontrados.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="lgpd-preference-item">
                            <div class="lgpd-preference-content">
                                <div class="lgpd-preference-info">
                                    <div class="lgpd-preference-title-row">
                                        <label for="lgpd-functional" class="lgpd-preference-label">
                                            <strong>Cookies Funcionais</strong>
                                        </label>
                                        <div class="lgpd-toggle-container">
                                            <input type="checkbox" id="lgpd-functional" class="lgpd-toggle-input">
                                            <label for="lgpd-functional" class="lgpd-toggle-label">
                                                <span class="lgpd-toggle-slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                    <p class="lgpd-preference-desc">
                                        <i class="fas fa-cogs"></i> Permitem funcionalidades avançadas e personalização, como lembrar suas preferências de tema, tamanho de fonte e outras configurações.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="lgpd-preference-item">
                            <div class="lgpd-preference-content">
                                <div class="lgpd-preference-info">
                                    <div class="lgpd-preference-title-row">
                                        <label for="lgpd-marketing" class="lgpd-preference-label">
                                            <strong>Cookies de Marketing</strong>
                                        </label>
                                        <div class="lgpd-toggle-container">
                                            <input type="checkbox" id="lgpd-marketing" class="lgpd-toggle-input">
                                            <label for="lgpd-marketing" class="lgpd-toggle-label">
                                                <span class="lgpd-toggle-slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                    <p class="lgpd-preference-desc">
                                        <i class="fas fa-bullhorn"></i> Usados para personalizar anúncios e medir a eficácia de campanhas publicitárias. Estes cookies podem rastrear sua atividade em diferentes sites.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="lgpd-modal-actions">
                        <button type="submit" class="lgpd-btn lgpd-btn-primary lgpd-btn-large">
                            <i class="fas fa-save"></i> Salvar Preferências
                        </button>
                        <button type="button" class="lgpd-btn lgpd-btn-outline lgpd-btn-large" id="lgpd-reset">
                            <i class="fas fa-redo"></i> Restaurar Padrões
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Carrega valores atuais
        const current = this.getConsents() || {};
        document.getElementById('lgpd-analytics').checked = current.analytics !== false;
        document.getElementById('lgpd-functional').checked = current.functional !== false;
        document.getElementById('lgpd-marketing').checked = current.marketing !== false;

        // Event listeners
        document.getElementById('close-lgpd-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        document.getElementById('lgpd-preferences-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const consents = {
                necessary: true,
                analytics: document.getElementById('lgpd-analytics').checked,
                functional: document.getElementById('lgpd-functional').checked,
                marketing: document.getElementById('lgpd-marketing').checked,
                timestamp: new Date().toISOString(),
                consent_type: 'custom'
            };

            // Se rejeitou funcionais também, bloqueia acesso
            if (!consents.functional) {
                this.showAlert('⚠️ Atenção: É necessário aceitar pelo menos os cookies funcionais para acessar o site. Cookies funcionais são essenciais para o funcionamento básico do site.', 'error');
                return;
            }

            this.saveConsents(consents);
            this.logConsent('custom', consents);
            this.applyConsents(consents);
            this.hideBanner();
            modal.remove();
            this.showAlert('Preferências salvas com sucesso!', 'success');
        });

        document.getElementById('lgpd-reset').addEventListener('click', () => {
            document.getElementById('lgpd-analytics').checked = false;
            document.getElementById('lgpd-functional').checked = false;
            document.getElementById('lgpd-marketing').checked = false;
        });
    }

    // Utilitários de cookie
    setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = `expires=${date.toUTCString()}`;
        document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
    }

    getCookie(name) {
        const nameEQ = name + '=';
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    // Mostra alerta
    showAlert(message, type) {
        const alertContainer = document.getElementById('lgpd-preferences-alert');
        if (alertContainer) {
            const alertClass = type === 'error' ? 'alert-error' : 'alert-success';
            alertContainer.innerHTML = `<div class="alert ${alertClass}">${message}</div>`;
            setTimeout(() => {
                alertContainer.innerHTML = '';
            }, 3000);
        }
    }

    // Exporta dados do usuário (LGPD)
    async exportUserData(userId) {
        try {
            if (window.dbAPI && typeof window.dbAPI.getUserData === 'function') {
                const data = await window.dbAPI.getUserData(userId);
                return data;
            }
            return null;
        } catch (e) {
            console.error('Erro ao exportar dados:', e);
            return null;
        }
    }

    // Remove dados do usuário (LGPD - direito ao esquecimento)
    async deleteUserData(userId) {
        try {
            if (window.dbAPI && typeof window.dbAPI.deleteUser === 'function') {
                const result = await window.dbAPI.deleteUser(userId);
                return result;
            }
            return { success: false, error: 'API não disponível' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    // Registra log de consentimento no servidor
    async logConsent(consentType, consents) {
        try {
            // Obtém informações do usuário atual (se logado)
            let userId = null;
            if (window.auth && typeof window.auth.getCurrentUser === 'function') {
                const user = window.auth.getCurrentUser();
                if (user && user.id) {
                    userId = user.id;
                }
            }

            // Prepara dados do log
            const logData = {
                user_id: userId,
                consent_type: consentType,
                necessary_cookies: consents.necessary !== false, // Sempre true
                analytics_cookies: consents.analytics === true,
                functional_cookies: consents.functional === true,
                marketing_cookies: consents.marketing === true,
                consent_data: consents
            };

            // Envia para o servidor (que enviará para Discord)
            const response = await fetch(window.location.origin + '/api/php/lgpd-consent-log.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(logData)
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log('✅ Log de consentimento LGPD salvo com sucesso:', result.log_id);
                }
                return result;
            } else {
                // Tenta ler a mensagem de erro
                let errorMessage = `Erro HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    // Se não conseguir parsear, usa a mensagem padrão
                }
                console.warn('⚠️ Erro ao salvar log de consentimento:', errorMessage);
                return { success: false, error: errorMessage };
            }
        } catch (error) {
            console.warn('Erro ao registrar consentimento:', error);
            // Não bloqueia o fluxo se o log falhar
            return { success: false, error: error.message };
        }
    }

    // Verifica se pode acessar o site
    canAccessSite() {
        const consents = this.getConsents();
        if (!consents || !consents.timestamp) {
            return false; // Não deu consentimento ainda
        }

        // Se rejeitou funcionais, não pode acessar (funcionais são necessários)
        if (consents.functional === false) {
            return false;
        }

        return true;
    }
}

// Exporta para uso global
window.LGPDCompliance = LGPDCompliance;

// Inicializa automaticamente quando o script é carregado (apenas uma vez)
(function () {
    // Flag para evitar múltiplas inicializações
    if (window._lgpdInitialized) {
        return;
    }
    window._lgpdInitialized = true;

    // Aguarda DOM estar pronto
    function initLGPD() {
        if (!window.lgpdCompliance) {
            window.lgpdCompliance = new LGPDCompliance();
        }
        // Não chama checkAndEnforceConsent novamente aqui para evitar conflitos
        // A classe já faz isso no init()
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLGPD);
    } else {
        // DOM já está pronto
        initLGPD();
    }

    // Proteção adicional: verifica após o carregamento completo da página
    window.addEventListener('load', () => {
        // Aguarda um pouco para garantir que tudo carregou
        setTimeout(() => {
            if (window.lgpdCompliance) {
                const consents = window.lgpdCompliance.getConsents();
                // Se não tem consentimento, garante que o banner está visível
                if (!consents || !consents.timestamp || Object.keys(consents).length <= 1) {
                    const banner = document.getElementById('lgpd-consent-banner');
                    if (!banner) {
                        // Se o banner não existe, recria
                        window.lgpdCompliance.showConsentBanner();
                    } else {
                        // Se existe, garante que está visível
                        banner.style.display = 'block';
                        banner.style.visibility = 'visible';
                        banner.style.opacity = '1';
                        banner.style.transform = 'translateY(0)';
                        banner.style.zIndex = '99998';
                    }
                }
            }
        }, 100);
    });
})();

// Exporta para uso global
window.LGPDCompliance = LGPDCompliance;

