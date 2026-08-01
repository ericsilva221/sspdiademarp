

class TicketsWidget {
    constructor() {
        this.isOpen = false;
        this.isMinimized = false;
        this.currentUser = null;
        this.init();
    }

    init() {

        this.createWidget();
        this.setupEventListeners();

        setTimeout(() => {
            this.tryLoadUser();
        }, 100);

        setTimeout(() => {
            if (!this.currentUser) {
                this.tryLoadUser(0, 5);
            }
        }, 500);
        
        setTimeout(() => {
            if (!this.currentUser) {
                this.tryLoadUser(0, 3);
            }
        }, 1000);
    }
    
    tryLoadUser(attempt = 0, maxAttempts = 10) {
        
        try {
            
            const authObj = window.auth || (typeof auth !== 'undefined' ? auth : null);
            if (authObj && typeof authObj.getCurrentUser === 'function') {
                try {
                    const user = authObj.getCurrentUser();
                    if (user && user.id) {
                        this.currentUser = user;
                        this.fillUserData();
                        this.updateTabsVisibility();
                        return;
                    }
                } catch (e) {
                    
                }
            }

            if (attempt < maxAttempts) {
                setTimeout(() => this.tryLoadUser(attempt + 1, maxAttempts), 200);
                return;
            }

            this.showForm();
            this.updateTabsVisibility();
        } catch (error) {
            
            if (attempt < maxAttempts) {
                setTimeout(() => this.tryLoadUser(attempt + 1, maxAttempts), 200);
            } else {
                this.showForm();
                this.updateTabsVisibility();
            }
        }
    }

    updateTabsVisibility() {
        const ticketTab = document.getElementById('tab-ticket');
        const corregedoriaTab = document.getElementById('tab-corregedoria');
        
        if (!ticketTab || !corregedoriaTab) {
            
            setTimeout(() => this.updateTabsVisibility(), 100);
            return;
        }

        let userRole = 'user'; 
        if (this.currentUser && this.currentUser.role) {
            userRole = String(this.currentUser.role).toLowerCase().trim();
        }

        // Sempre mostrar a aba de ticket (permitir acesso não autenticado)
        ticketTab.style.display = 'flex';
        corregedoriaTab.style.display = 'flex';
        
        // Atualizar o select de unidade baseado na autenticação
        this.updateUnidadeSelect();
    }
    
    updateUnidadeSelect() {
        const unidadeSelect = document.getElementById('ticket-unidade');
        if (!unidadeSelect) return;

        const hasUser = this.currentUser && this.currentUser.id;
        let userRole = 'user';
        if (this.currentUser && this.currentUser.role) {
            userRole = String(this.currentUser.role).toLowerCase().trim();
        }

        // Se não tem usuário ou é role 'user', apenas permitir SSP
        if (!hasUser || userRole === 'user') {
            // Desabilitar todas as opções exceto SSP
            Array.from(unidadeSelect.options).forEach(option => {
                if (option.value === 'SSP' || option.value === '') {
                    option.disabled = false;
                } else {
                    option.disabled = true;
                }
            });
            
            // Se nenhum valor está selecionado ou não é SSP, selecionar SSP
            if (!unidadeSelect.value || unidadeSelect.value !== 'SSP') {
                unidadeSelect.value = 'SSP';
            }
        } else {
            // Usuário autenticado com role diferente de 'user' - habilitar todas as opções
            Array.from(unidadeSelect.options).forEach(option => {
                option.disabled = false;
            });
        }
    }
    
    showLoginMessage() {
        const form = document.getElementById('tickets-widget-form');
        if (form) {
            form.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <i class="fas fa-sign-in-alt" style="font-size: 48px; color: #3b82f6; margin-bottom: 15px;"></i>
                    <h3 style="margin: 0 0 10px 0; color: #333;">Faça login para criar um chamado</h3>
                    <p style="color: #666; margin: 0;">Você precisa estar logado para criar tickets com a equipe.</p>
                    <a href="/pages/auth/login.html" style="display: inline-block; margin-top: 15px; padding: 10px 20px; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; text-decoration: none; border-radius: 8px;">Fazer Login</a>
                </div>
            `;
        }
    }

    createWidget() {
        
        if (document.getElementById('tickets-widget')) {
            return;
        }

        const widget = document.createElement('div');
        widget.id = 'tickets-widget';
        widget.innerHTML = `
            <div class="tickets-widget-toggle" id="tickets-widget-toggle">
                <i class="fas fa-comments"></i>
                <span>Abrir ticket</span>
            </div>
            <div class="tickets-widget-container" id="tickets-widget-container">
                <div class="tickets-widget-header">
                    <div class="tickets-widget-title">
                        <i class="fas fa-headset"></i>
                        <span id="tickets-widget-title-text">Atendimento ao usuário</span>
                    </div>
                    <div class="tickets-widget-actions">
                        <button class="tickets-widget-help" id="tickets-widget-help" title="Ajuda">
                            <i class="fas fa-question-circle"></i>
                        </button>
                        <button class="tickets-widget-close" id="tickets-widget-close" title="Fechar">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="tickets-widget-tabs" id="tickets-widget-tabs">
                    <button class="tickets-widget-tab active" data-tab="ticket" id="tab-ticket">
                        <i class="fas fa-ticket-alt"></i> Ticket
                    </button>
                    <button class="tickets-widget-tab" data-tab="corregedoria" id="tab-corregedoria">
                        <i class="fas fa-gavel"></i> Corregedoria
                    </button>
                </div>
                <div class="tickets-widget-content" id="tickets-widget-content">
                    <div class="tickets-widget-form" id="tickets-widget-form">
                        <div class="tickets-widget-greeting">
                            <h3>Olá! Como podemos ajudar?</h3>
                            <p>Preencha o formulário abaixo para abrir um Atendimento ao usuário.</p>
                        </div>
                        <form id="ticket-form">
                            <div class="form-group">
                                <label for="ticket-discord-id">ID do Discord *</label>
                                <input type="text" id="ticket-discord-id" name="discord_id" 
                                       placeholder="Ex: 123456789012345678" required>
                                <small>Seu ID numérico do Discord (17-19 dígitos)</small>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="ticket-nome">Nome *</label>
                                    <input type="text" id="ticket-nome" name="nome" 
                                           placeholder="Seu nome" required>
                                </div>
                                <div class="form-group">
                                    <label for="ticket-sobrenome">Sobrenome *</label>
                                    <input type="text" id="ticket-sobrenome" name="sobrenome" 
                                           placeholder="Seu sobrenome" required>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="ticket-patente">Patente</label>
                                    <input type="text" id="ticket-patente" name="patente" 
                                           placeholder="Ex: Soldado, Cabo, etc.">
                                </div>
                                <div class="form-group">
                                    <label for="ticket-batalhao">Batalhão pertencente</label>
                                    <select id="ticket-batalhao" name="batalhao" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; font-family: inherit; box-sizing: border-box;">
                                        <option value="">Selecione um batalhão</option>
                                        <option value="Corregedoria">Corregedoria</option>
                                        <option value="COORDOP PM">COORDOP PM</option>
                                        <option value="DEC">DEC</option>
                                        <option value="33º BPM/M">33º BPM/M</option>
                                        <option value="33º BPM/M CIA FT">33º BPM/M CIA FT</option>
                                        <option value="2ºBPTran">2ºBPTran</option>
                                        <option value="CAvPM">CAvPM</option>
                                        <option value="5º BAEP">5º BAEP</option>
                                        <option value="CAEP">CAEP</option>
                                        <option value="CPChq">CPChq</option>
                                        <option value="1º BPChq">1º BPChq</option>
                                        <option value="2º BPChq">2º BPChq</option>
                                        <option value="3º BPChq">3º BPChq</option>
                                        <option value="4º BPChq">4º BPChq</option>
                                        <option value="5º BPChq">5º BPChq</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="ticket-unidade">Abrir ticket para *</label>
                                <select id="ticket-unidade" name="unidade" required>
                                    <option value="">Selecione uma unidade</option>
                                    <option value="Corregedoria">Corregedoria</option>
                                    <option value="GCG">Gabinete do Comando Geral</option>
                                    <option value="EM/PM">Estado Maior EM/PM</option>
                                    <option value="DEC">DEC</option>
                                    <option value="SSP">SSP</option>
                                    <option value="COORDOP PM">COORDOP PM</option>
                                    <option value="P5">CCOMSOC (P5)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="ticket-mensagem">Mensagem Inicial *</label>
                                <textarea id="ticket-mensagem" name="mensagem" rows="4" 
                                          placeholder="Descreva sua solicitação..." required></textarea>
                            </div>
                            <button type="submit" class="tickets-widget-submit">
                                <i class="fas fa-paper-plane"></i>
                                Enviar Chamado
                            </button>
                        </form>
                    </div>
                    <div class="tickets-widget-form" id="denuncia-widget-form" style="display: none;">
                        <div class="tickets-widget-greeting">
                            <h3>Formulário de Denúncia - Corregedoria</h3>
                            <p>Preencha todos os campos abaixo para formalizar sua denúncia.</p>
                        </div>
                        <form id="denuncia-form">
                            <div class="form-group">
                                <label for="denuncia-manter-anonimato">É de seu desejo ser mantido em anonimato? *</label>
                                <div class="radio-group">
                                    <label class="radio-label">
                                        <input type="radio" name="manter_anonimato" value="sim" id="denuncia-manter-anonimato-sim" required>
                                        <span>Sim</span>
                                    </label>
                                    <label class="radio-label">
                                        <input type="radio" name="manter_anonimato" value="nao" id="denuncia-manter-anonimato-nao" required>
                                        <span>Não</span>
                                    </label>
                                </div>
                            </div>
                            <div id="denuncia-dados-identificacao" style="display: none;">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="denuncia-nome">Nome *</label>
                                        <input type="text" id="denuncia-nome" name="nome" 
                                               placeholder="Seu nome">
                                    </div>
                                    <div class="form-group">
                                        <label for="denuncia-sobrenome">Sobrenome *</label>
                                        <input type="text" id="denuncia-sobrenome" name="sobrenome" 
                                               placeholder="Seu sobrenome">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="denuncia-id-personagem">ID personagem *</label>
                                    <input type="text" id="denuncia-id-personagem" name="id_personagem" 
                                           placeholder="Ex: 12345">
                                </div>
                                <div class="form-group">
                                    <label for="denuncia-id-discord">ID Discord</label>
                                    <input type="text" id="denuncia-id-discord" name="id_discord" 
                                           placeholder="Ex: 123456789012345678">
                                    <small>Seu ID numérico do Discord (17-19 dígitos) - Opcional</small>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="denuncia-instituicao">A qual instituição o denunciado pertence? *</label>
                                <select id="denuncia-instituicao" name="instituicao_denunciado" required>
                                    <option value="Policia Militar" selected>Policia Militar</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="denuncia-nome-agente">Nome do agente policial militar (caso saiba)</label>
                                <input type="text" id="denuncia-nome-agente" name="nome_agente" 
                                       placeholder="Nome completo do agente">
                            </div>
                            <div class="form-group">
                                <label for="denuncia-rg-agente">RG/ID do agente policial militar (caso saiba)</label>
                                <input type="text" id="denuncia-rg-agente" name="rg_id_agente" 
                                       placeholder="RG ou ID do agente">
                            </div>
                            <div class="form-group">
                                <label for="denuncia-outros-dados">Informe outros dados importantes que saiba, como o batalhão pertencente, características físicas, dados da viatura, demais policiais envolvidos, etc.</label>
                                <textarea id="denuncia-outros-dados" name="outros_dados" rows="4" 
                                          placeholder="Descreva todos os detalhes relevantes..."></textarea>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="denuncia-data">Data do ocorrido *</label>
                                    <input type="date" id="denuncia-data" name="data_ocorrido" required>
                                </div>
                                <div class="form-group">
                                    <label for="denuncia-horario">Horário do ocorrido *</label>
                                    <input type="time" id="denuncia-horario" name="horario_ocorrido" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="denuncia-local">Local do ocorrido *</label>
                                <textarea id="denuncia-local" name="local_ocorrido" rows="2" 
                                          placeholder="Descreva o local onde ocorreu o fato..." required></textarea>
                            </div>
                            <div class="form-group">
                                <label for="denuncia-relato">Agora, informe todo o ocorrido. *</label>
                                <textarea id="denuncia-relato" name="relato_ocorrido" rows="6" 
                                          placeholder="Descreva detalhadamente todo o ocorrido..." required></textarea>
                            </div>
                            <div class="form-group">
                                <label for="denuncia-comprovacoes-link">Envie o sua comprovação ou comprovações em vídeo ou imagem por link</label>
                                <textarea id="denuncia-comprovacoes-link" name="comprovacoes_link" rows="3" 
                                          placeholder="Cole aqui os links das comprovações (um por linha)"></textarea>
                                <small>Você pode colar múltiplos links, um por linha</small>
                            </div>
                            <div class="form-group">
                                <label for="denuncia-comprovacoes-arquivo">Envie o sua comprovação ou comprovações em vídeo ou imagem em arquivo</label>
                                <input type="file" id="denuncia-comprovacoes-arquivo" name="comprovacoes_arquivo" 
                                       accept="image/*,video/*" multiple>
                                <small>Você pode selecionar múltiplos arquivos (imagens ou vídeos)</small>
                                <div id="denuncia-uploads-preview" class="uploads-preview"></div>
                            </div>
                            <div class="form-group">
                                <div class="declaracoes-box">
                                    <p class="declaracoes-text">
                                        <strong>Declaro, para os devidos fins, que compareci voluntariamente nesta data junto à Corregedoria da Polícia Militar do Estado de São Paulo, para relatar e formalizar denúncia sobre fato que envolva integrante(s) desta Corporação.</strong>
                                    </p>
                                    <p class="declaracoes-text">
                                        <strong>Declaro, sob as penas da lei, que:</strong>
                                    </p>
                                    <ul class="declaracoes-list">
                                        <li>As informações fornecidas são verdadeiras, segundo meu conhecimento e percepção direta dos fatos narrados;</li>
                                        <li>Estou ciente de que a falsidade de informações ou denúncias infundadas pode configurar crime previsto no Código Penal Brasileiro e demais legislações aplicáveis;</li>
                                        <li>Fui informado(a) de que a denúncia será submetida à análise técnica e jurídica pela Corregedoria da Polícia Militar, e que o prosseguimento dependerá da existência de elementos mínimos que justifiquem a instauração de apuração preliminar ou procedimento formal;</li>
                                        <li>Estou ciente de que poderão ser requisitadas novas informações ou documentos, caso necessário, e comprometo-me a colaborar com a elucidação dos fatos, quando solicitado;</li>
                                        <li>Tenho ciência de que poderei ser formalmente intimado(a) para prestar depoimento, caso a autoridade competente entenda necessário para esclarecimento dos fatos denunciados;</li>
                                        <li>Tenho ciência de que, a depender do teor da denúncia, poderá ser garantido sigilo da identidade, conforme avaliação da autoridade responsável e previsão legal;</li>
                                        <li>Autorizo o uso das informações prestadas, para fins de instrução e processamento interno da Polícia Militar do Estado de São Paulo.</li>
                                    </ul>
                                    <div class="form-group" style="margin-top: 15px;">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="denuncia-declaracoes-aceitas" name="declaracoes_aceitas" required>
                                            <span>Li e concordo com todas as declarações acima *</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="denuncia-assinatura">Assinatura do Denunciante *</label>
                                <input type="text" id="denuncia-assinatura" name="assinatura_denunciante" 
                                       placeholder="Digite seu nome completo como assinatura" required>
                            </div>
                            <button type="submit" class="tickets-widget-submit">
                                <i class="fas fa-gavel"></i>
                                Enviar Denúncia
                            </button>
                        </form>
                    </div>
                    <div class="tickets-widget-success" id="tickets-widget-success" style="display: none;">
                        <div class="success-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <h3>Chamado enviado com sucesso!</h3>
                        <p>Seu ticket foi criado e será atendido em breve.</p>
                        <p class="ticket-id-info" id="ticket-id-info"></p>
                        <button class="tickets-widget-new" id="tickets-widget-new">
                            Novo Chamado
                        </button>
                    </div>
                    <div class="tickets-widget-loading" id="tickets-widget-loading" style="display: none;">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Enviando...</p>
                    </div>
                </div>
            </div>
        `;

        if (!document.body) {
            setTimeout(() => this.createWidget(), 500);
            return;
        }
        
        document.body.appendChild(widget);
        this.addStyles();

        const widgetElement = document.getElementById('tickets-widget');
        if (widgetElement) {
            const toggle = widgetElement.querySelector('.tickets-widget-toggle');
            if (toggle) {
                const styles = window.getComputedStyle(toggle);
            }
        }
    }

    addStyles() {
        if (document.getElementById('tickets-widget-styles')) {
            return; 
        }

        const style = document.createElement('style');
        style.id = 'tickets-widget-styles';
        style.textContent = `
            #tickets-widget {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }

            .tickets-widget-toggle {
                background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                color: white;
                padding: 15px 20px;
                border-radius: 50px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(30, 58, 138, 0.4);
                display: flex;
                align-items: center;
                gap: 10px;
                transition: all 0.3s ease;
                font-weight: 500;
            }

            .tickets-widget-toggle:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(30, 58, 138, 0.5);
            }

            .tickets-widget-toggle i {
                font-size: 20px;
            }

            .tickets-widget-container {
                position: absolute;
                bottom: 80px;
                right: 0;
                width: 400px;
                max-width: calc(100vw - 40px);
                background: white;
                border-radius: 20px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                display: none;
                flex-direction: column;
                max-height: calc(100vh - 120px);
                overflow: hidden;
            }

            .tickets-widget-container.open {
                display: flex;
            }

            .tickets-widget-header {
                background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                color: white;
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 20px 20px 0 0;
            }

            .tickets-widget-tabs {
                display: flex;
                background: #f5f5f5;
                border-bottom: 2px solid #e0e0e0;
            }

            .tickets-widget-tab {
                flex: 1;
                padding: 12px 20px;
                background: transparent;
                border: none;
                border-bottom: 3px solid transparent;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                color: #666;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transition: all 0.3s ease;
            }

            .tickets-widget-tab:hover {
                background: rgba(30, 58, 138, 0.05);
                color: #1e3a8a;
            }

            .tickets-widget-tab.active {
                color: #1e3a8a;
                border-bottom-color: #1e3a8a;
                background: white;
                font-weight: 600;
            }

            .tickets-widget-tab i {
                font-size: 16px;
            }

            .radio-group {
                display: flex;
                gap: 20px;
                margin-top: 8px;
            }

            .radio-label {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                font-weight: normal;
            }

            .radio-label input[type="radio"] {
                width: auto;
                margin: 0;
                cursor: pointer;
            }

            .checkbox-label {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                cursor: pointer;
                font-weight: normal;
            }

            .checkbox-label input[type="checkbox"] {
                width: auto;
                margin-top: 3px;
                cursor: pointer;
                flex-shrink: 0;
            }

            .declaracoes-box {
                background: #f9f9f9;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 20px;
                max-height: 400px;
                overflow-y: auto;
            }

            .declaracoes-text {
                margin: 0 0 15px 0;
                color: #333;
                line-height: 1.6;
            }

            .declaracoes-list {
                margin: 0;
                padding-left: 20px;
                color: #555;
                line-height: 1.8;
            }

            .declaracoes-list li {
                margin-bottom: 10px;
            }

            .uploads-preview {
                margin-top: 10px;
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
            }

            .upload-preview-item {
                position: relative;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                font-size: 12px;
            }

            .upload-preview-item img {
                width: 50px;
                height: 50px;
                object-fit: cover;
                border-radius: 4px;
            }

            .upload-preview-item .file-icon {
                width: 50px;
                height: 50px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #f0f0f0;
                border-radius: 4px;
                color: #666;
                font-size: 24px;
            }

            .upload-preview-item .file-info {
                flex: 1;
                min-width: 0;
            }

            .upload-preview-item .file-name {
                font-weight: 500;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .upload-preview-item .file-size {
                color: #999;
                font-size: 11px;
            }

            .upload-preview-item .remove-upload {
                background: none;
                border: none;
                color: #dc3545;
                cursor: pointer;
                padding: 4px;
                font-size: 16px;
                line-height: 1;
            }

            .tickets-widget-title {
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 600;
                font-size: 18px;
            }

            .tickets-widget-actions {
                display: flex;
                gap: 10px;
            }

            .tickets-widget-actions button {
                background: transparent;
                border: none;
                color: white;
                cursor: pointer;
                padding: 5px;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }

            .tickets-widget-actions button:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            .tickets-widget-content {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            }

            .tickets-widget-greeting {
                margin-bottom: 20px;
            }

            .tickets-widget-greeting h3 {
                margin: 0 0 10px 0;
                color: #333;
                font-size: 20px;
            }

            .tickets-widget-greeting p {
                margin: 0;
                color: #666;
                font-size: 14px;
            }

            .tickets-widget-form .form-group {
                margin-bottom: 15px;
            }

            .tickets-widget-form .form-row {
                display: flex;
                gap: 10px;
            }

            .tickets-widget-form .form-row .form-group {
                flex: 1;
            }

            .tickets-widget-form label {
                display: block;
                margin-bottom: 5px;
                color: #333;
                font-weight: 500;
                font-size: 14px;
            }

            .tickets-widget-form input,
            .tickets-widget-form select,
            .tickets-widget-form textarea {
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 8px;
                font-size: 14px;
                font-family: inherit;
                box-sizing: border-box;
            }

            .tickets-widget-form input:focus,
            .tickets-widget-form select:focus,
            .tickets-widget-form textarea:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }

            .tickets-widget-form select option:disabled {
                color: #999;
                background-color: #f5f5f5;
            }

            .tickets-widget-form small {
                display: block;
                margin-top: 5px;
                color: #999;
                font-size: 12px;
            }

            .tickets-widget-submit {
                width: 100%;
                padding: 12px;
                background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                transition: transform 0.2s, box-shadow 0.2s;
                margin-top: 10px;
            }

            .tickets-widget-submit:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(30, 58, 138, 0.4);
            }

            .tickets-widget-submit:active {
                transform: translateY(0);
            }

            .tickets-widget-success {
                text-align: center;
                padding: 40px 20px;
            }

            .success-icon {
                font-size: 64px;
                color: #4caf50;
                margin-bottom: 20px;
            }

            .tickets-widget-success h3 {
                margin: 0 0 10px 0;
                color: #333;
            }

            .tickets-widget-success p {
                margin: 0 0 20px 0;
                color: #666;
            }

            .ticket-id-info {
                background: #f5f5f5;
                padding: 10px;
                border-radius: 8px;
                font-size: 14px;
                color: #333;
                margin-bottom: 20px !important;
            }

            .tickets-widget-new {
                padding: 10px 20px;
                background: #1e3a8a;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
            }

            .tickets-widget-loading {
                text-align: center;
                padding: 40px 20px;
            }

            .tickets-widget-loading i {
                font-size: 48px;
                color: #3b82f6;
                margin-bottom: 20px;
            }

            .tickets-widget-loading p {
                color: #666;
            }

            @media (max-width: 480px) {
                .tickets-widget-container {
                    width: calc(100vw - 20px);
                    right: -10px;
                }

                .tickets-widget-toggle span {
                    display: none;
                }
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        const toggle = document.getElementById('tickets-widget-toggle');
        const close = document.getElementById('tickets-widget-close');
        const container = document.getElementById('tickets-widget-container');
        const form = document.getElementById('ticket-form');
        const denunciaForm = document.getElementById('denuncia-form');
        const newBtn = document.getElementById('tickets-widget-new');
        const tabs = document.querySelectorAll('.tickets-widget-tab');

        if (toggle) {
            toggle.addEventListener('click', () => this.toggle());
        }

        if (close) {
            close.addEventListener('click', () => this.close());
        }

        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        if (denunciaForm) {
            denunciaForm.addEventListener('submit', (e) => this.handleDenunciaSubmit(e));
        }

        if (newBtn) {
            newBtn.addEventListener('click', () => this.resetForm());
        }

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                // Permitir acesso à aba de ticket mesmo sem autenticação
                this.switchTab(tabName);
            });
        });

        const denunciaFileInput = document.getElementById('denuncia-comprovacoes-arquivo');
        if (denunciaFileInput) {
            denunciaFileInput.addEventListener('change', (e) => this.handleDenunciaFileSelect(e));
        }

        const anonimatoSim = document.getElementById('denuncia-manter-anonimato-sim');
        const anonimatoNao = document.getElementById('denuncia-manter-anonimato-nao');
        const dadosIdentificacao = document.getElementById('denuncia-dados-identificacao');
        
        if (anonimatoSim && anonimatoNao && dadosIdentificacao) {
            const toggleIdentificacao = () => {
                if (anonimatoNao.checked) {
                    dadosIdentificacao.style.display = 'block';
                    
                    const nomeInput = document.getElementById('denuncia-nome');
                    const sobrenomeInput = document.getElementById('denuncia-sobrenome');
                    const idPersonagemInput = document.getElementById('denuncia-id-personagem');
                    if (nomeInput) nomeInput.required = true;
                    if (sobrenomeInput) sobrenomeInput.required = true;
                    if (idPersonagemInput) idPersonagemInput.required = true;

                    if (this.currentUser && this.currentUser.discord_id) {
                        const denunciaDiscordIdInput = document.getElementById('denuncia-id-discord');
                        if (denunciaDiscordIdInput && !denunciaDiscordIdInput.value) {
                            denunciaDiscordIdInput.value = this.currentUser.discord_id;
                        }
                    }
                } else {
                    dadosIdentificacao.style.display = 'none';
                    
                    const nomeInput = document.getElementById('denuncia-nome');
                    const sobrenomeInput = document.getElementById('denuncia-sobrenome');
                    const idPersonagemInput = document.getElementById('denuncia-id-personagem');
                    if (nomeInput) nomeInput.required = false;
                    if (sobrenomeInput) sobrenomeInput.required = false;
                    if (idPersonagemInput) idPersonagemInput.required = false;

                    const denunciaDiscordIdInput = document.getElementById('denuncia-id-discord');
                    if (denunciaDiscordIdInput) {
                        denunciaDiscordIdInput.value = '';
                    }
                }
            };
            
            anonimatoSim.addEventListener('change', toggleIdentificacao);
            anonimatoNao.addEventListener('change', toggleIdentificacao);
        }

        if (this.currentUser) {
            this.fillUserData();
        }
        
        // Atualizar select de unidade ao configurar event listeners
        this.updateUnidadeSelect();
        
        // Adicionar listener para impedir mudança manual do select quando não autenticado
        const unidadeSelect = document.getElementById('ticket-unidade');
        if (unidadeSelect) {
            unidadeSelect.addEventListener('change', () => {
                const hasUser = this.currentUser && this.currentUser.id;
                let userRole = 'user';
                if (this.currentUser && this.currentUser.role) {
                    userRole = String(this.currentUser.role).toLowerCase().trim();
                }
                
                // Se não tem usuário ou é role 'user', apenas permitir SSP
                if ((!hasUser || userRole === 'user') && unidadeSelect.value !== 'SSP') {
                    alert('Usuários sem conta ou com cargo "user" podem abrir tickets apenas para a SSP.');
                    unidadeSelect.value = 'SSP';
                }
            });
        }
    }

    switchTab(tabName) {
        // Permitir acesso à aba de ticket mesmo sem autenticação
        const tabs = document.querySelectorAll('.tickets-widget-tab');
        const ticketForm = document.getElementById('tickets-widget-form');
        const denunciaForm = document.getElementById('denuncia-widget-form');
        const titleText = document.getElementById('tickets-widget-title-text');

        tabs.forEach(tab => {
            if (tab.getAttribute('data-tab') === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        if (tabName === 'ticket') {
            if (ticketForm) ticketForm.style.display = 'block';
            if (denunciaForm) denunciaForm.style.display = 'none';
            if (titleText) titleText.textContent = 'Atendimento ao usuário';
            // Atualizar select de unidade quando mudar para aba de ticket
            this.updateUnidadeSelect();
        } else if (tabName === 'corregedoria') {
            if (ticketForm) ticketForm.style.display = 'none';
            if (denunciaForm) denunciaForm.style.display = 'block';
            if (titleText) titleText.textContent = 'Corregedoria - Denúncia';
        }
    }

    handleDenunciaFileSelect(e) {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const previewContainer = document.getElementById('denuncia-uploads-preview');
        if (!previewContainer) return;

        files.forEach(file => {
            const previewItem = document.createElement('div');
            previewItem.className = 'upload-preview-item';
            
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewItem.innerHTML = `
                        <img src="${e.target.result}" alt="${file.name}">
                        <div class="file-info">
                            <div class="file-name">${file.name}</div>
                            <div class="file-size">${this.formatFileSize(file.size)}</div>
                        </div>
                        <button type="button" class="remove-upload" onclick="this.parentElement.remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                };
                reader.readAsDataURL(file);
            } else {
                previewItem.innerHTML = `
                    <div class="file-icon"><i class="fas fa-file-video"></i></div>
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${this.formatFileSize(file.size)}</div>
                    </div>
                    <button type="button" class="remove-upload" onclick="this.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            }
            
            previewContainer.appendChild(previewItem);
        });
    }

    formatFileSize(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    fillUserData() {
        if (!this.currentUser) {
            // Se não tem usuário, atualizar select para permitir apenas SSP
            this.updateUnidadeSelect();
            return;
        }

        if (this.currentUser.discord_id) {
            const discordIdInput = document.getElementById('ticket-discord-id');
            if (discordIdInput) {
                discordIdInput.value = this.currentUser.discord_id;
            }

        }

        if (this.currentUser.nome) {
            const nomeInput = document.getElementById('ticket-nome');
            if (nomeInput) {
                nomeInput.value = this.currentUser.nome;
            }
        }

        if (this.currentUser.sobrenome) {
            const sobrenomeInput = document.getElementById('ticket-sobrenome');
            if (sobrenomeInput) {
                sobrenomeInput.value = this.currentUser.sobrenome;
            }
        }

        this.updateTabsVisibility();
        // Atualizar select de unidade após preencher dados do usuário
        this.updateUnidadeSelect();
    }

    toggle() {
        this.isOpen = !this.isOpen;
        const container = document.getElementById('tickets-widget-container');
        if (container) {
            if (this.isOpen) {
                container.classList.add('open');
                
                this.updateTabsVisibility();
                
                this.ensureCorrectTab();
                
                // Atualizar select de unidade ao abrir
                setTimeout(() => this.updateUnidadeSelect(), 100);
            } else {
                container.classList.remove('open');
            }
        }
    }
    
    open() {
        this.isOpen = true;
        const container = document.getElementById('tickets-widget-container');
        if (container) {
            container.classList.add('open');
            
            this.updateTabsVisibility();
            
            this.ensureCorrectTab();
            
            // Atualizar select de unidade ao abrir
            setTimeout(() => this.updateUnidadeSelect(), 100);
        } else {
        }
    }

    ensureCorrectTab() {
        // Não forçar mudança de aba - permitir acesso à aba de ticket mesmo sem autenticação
        // Apenas atualizar o select de unidade
        this.updateUnidadeSelect();
    }

    close() {
        this.isOpen = false;
        const container = document.getElementById('tickets-widget-container');
        if (container) {
            container.classList.remove('open');
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (!this.currentUser) {
            const authObj = window.auth || (typeof auth !== 'undefined' ? auth : null);
            if (authObj && typeof authObj.getCurrentUser === 'function') {
                const user = authObj.getCurrentUser();
                if (user && user.id) {
                    this.currentUser = user;
                }
            }
        }

        const form = e.target;
        const formData = new FormData(form);
        const unidadeSelecionada = formData.get('unidade');
        
        const hasUser = this.currentUser && this.currentUser.id;
        let userRole = 'user';
        if (this.currentUser && this.currentUser.role) {
            userRole = String(this.currentUser.role).toLowerCase().trim();
        }

        // Se não tem usuário ou é role 'user', apenas permitir SSP
        if (!hasUser || userRole === 'user') {
            if (unidadeSelecionada !== 'SSP') {
                alert('Usuários sem conta ou com cargo "user" podem abrir tickets apenas para a SSP. Por favor, selecione SSP como unidade de destino.');
                const unidadeSelect = document.getElementById('ticket-unidade');
                if (unidadeSelect) {
                    unidadeSelect.value = 'SSP';
                }
                return;
            }
        }

        const ticketData = {
            user_id: hasUser ? (this.currentUser.id || this.currentUser.username || 'anonymous') : 'anonymous',
            discord_id: formData.get('discord_id'),
            nome: formData.get('nome'),
            sobrenome: formData.get('sobrenome'),
            patente: formData.get('patente') || null,
            batalhao: formData.get('batalhao') || null,
            unidade: unidadeSelecionada,
            status: 'aberto'
        };

        const mensagem = formData.get('mensagem');

        if (!/^\d{17,19}$/.test(ticketData.discord_id.trim())) {
            alert('ID do Discord inválido! Deve ser um número com 17-19 dígitos.');
            return;
        }

        this.showLoading();

        try {
            
            let attempts = 0;
            while ((typeof window.ticketsManagerV2 === 'undefined' || !window.ticketsManagerV2.initialized) && attempts < 20) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (typeof window.ticketsManagerV2 === 'undefined') {
                throw new Error('Sistema de tickets não está disponível. Por favor, recarregue a página.');
            }

            if (typeof window.dbAPI === 'undefined' || !window.dbAPI) {
                throw new Error('Sistema de banco de dados não está disponível. Por favor, recarregue a página.');
            }

            if (typeof window.dbAPI.createTicket !== 'function') {
                
                let dbAttempts = 0;
                while (typeof window.dbAPI.createTicket !== 'function' && dbAttempts < 10) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    dbAttempts++;
                }
                
                if (typeof window.dbAPI.createTicket !== 'function') {
                    throw new Error('Método createTicket não está disponível. O sistema pode estar em modo localStorage. Configure o MySQL primeiro.');
                }
            }

            const result = await window.ticketsManagerV2.addTicket(ticketData);
            
            if (result && result.success && result.ticket) {
                
                if (mensagem && mensagem.trim()) {
                    const userId = (this.currentUser && this.currentUser.id) ? this.currentUser.id : 'anonymous';
                    await window.ticketsManagerV2.addTicketMessage(result.ticket.id, {
                        user_id: userId,
                        message: mensagem.trim(),
                        is_admin: false
                    });
                }

                this.showSuccess(result.ticket.id);
            } else {
                throw new Error(result?.error || 'Erro ao criar ticket');
            }
        } catch (error) {
            alert('Erro ao criar ticket: ' + (error.message || 'Erro desconhecido'));
            this.showForm();
        }
    }

    showLoading() {
        const form = document.getElementById('tickets-widget-form');
        const success = document.getElementById('tickets-widget-success');
        const loading = document.getElementById('tickets-widget-loading');

        if (form) form.style.display = 'none';
        if (success) success.style.display = 'none';
        if (loading) loading.style.display = 'block';
    }

    showSuccess(ticketId) {
        const form = document.getElementById('tickets-widget-form');
        const success = document.getElementById('tickets-widget-success');
        const loading = document.getElementById('tickets-widget-loading');
        const ticketIdInfo = document.getElementById('ticket-id-info');

        if (form) form.style.display = 'none';
        if (loading) loading.style.display = 'none';
        if (success) success.style.display = 'block';
        if (ticketIdInfo) {
            ticketIdInfo.textContent = `ID do Ticket: #${ticketId}`;
        }
    }

    showForm() {
        const form = document.getElementById('tickets-widget-form');
        const success = document.getElementById('tickets-widget-success');
        const loading = document.getElementById('tickets-widget-loading');

        if (loading) loading.style.display = 'none';
        if (success) success.style.display = 'none';
        if (form) form.style.display = 'block';
    }

    resetForm() {
        const form = document.getElementById('ticket-form');
        if (form) {
            form.reset();
            this.fillUserData();
        }
        this.showForm();
    }

    async handleDenunciaSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);

        const manterAnonimato = formData.get('manter_anonimato') === 'sim';

        if (!manterAnonimato) {
            const nome = formData.get('nome');
            const sobrenome = formData.get('sobrenome');
            const idPersonagem = formData.get('id_personagem');
            
            if (!nome || !nome.trim()) {
                alert('Por favor, preencha o campo Nome.');
                return;
            }
            if (!sobrenome || !sobrenome.trim()) {
                alert('Por favor, preencha o campo Sobrenome.');
                return;
            }
            if (!idPersonagem || !idPersonagem.trim()) {
                alert('Por favor, preencha o campo ID personagem.');
                return;
            }
        }

        let discordId = null;
        if (!manterAnonimato) {
            discordId = formData.get('id_discord');
            if (discordId && discordId.trim()) {
                if (!/^\d{17,19}$/.test(discordId.trim())) {
                    alert('ID do Discord inválido! Deve ser um número com 17-19 dígitos ou deixe em branco.');
                    return;
                }
            }
        }

        let userId = 'anonymous';
        if (!this.currentUser) {
            const authObj = window.auth || (typeof auth !== 'undefined' ? auth : null);
            if (authObj && typeof authObj.getCurrentUser === 'function') {
                this.currentUser = authObj.getCurrentUser();
            }
        }
        if (this.currentUser) {
            userId = this.currentUser.id || this.currentUser.username || 'anonymous';
        }

        const fileInput = document.getElementById('denuncia-comprovacoes-arquivo');
        const comprovacoesArquivo = [];
        
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            const files = Array.from(fileInput.files);
            for (const file of files) {
                try {
                    let uploadResult;
                    if (file.type.startsWith('image/')) {
                        if (typeof window.uploadImage === 'function') {
                            uploadResult = await window.uploadImage(file, 'denuncias');
                        } else if (typeof window.imageUploader !== 'undefined') {
                            uploadResult = await window.imageUploader.uploadImage(file, 'denuncias');
                        }
                    } else {
                        if (typeof window.uploadFile === 'function') {
                            uploadResult = await window.uploadFile(file, 'denuncias');
                        } else if (typeof window.fileUploader !== 'undefined') {
                            uploadResult = await window.fileUploader.uploadFile(file, 'denuncias');
                        }
                    }
                    
                    if (uploadResult && uploadResult.success) {
                        comprovacoesArquivo.push({
                            type: file.type.startsWith('image/') ? 'image' : 'video',
                            url: uploadResult.url,
                            filename: uploadResult.filename || file.name,
                            size: uploadResult.size || file.size
                        });
                    }
                } catch (error) {
                    console.error('Erro ao fazer upload:', error);
                }
            }
        }

        const denunciaData = {
            user_id: userId,
            tipo: 'denuncia',
            manter_anonimato: manterAnonimato,
            nome: manterAnonimato ? null : (formData.get('nome') || null),
            sobrenome: manterAnonimato ? null : (formData.get('sobrenome') || null),
            id_personagem: manterAnonimato ? (formData.get('id_personagem') || null) : (formData.get('id_personagem') || null),
            id_discord: discordId && discordId.trim() ? discordId.trim() : null,
            instituicao_denunciado: formData.get('instituicao_denunciado') || 'Policia Militar',
            nome_agente: formData.get('nome_agente') || null,
            rg_id_agente: formData.get('rg_id_agente') || null,
            outros_dados: formData.get('outros_dados') || null,
            data_ocorrido: formData.get('data_ocorrido'),
            horario_ocorrido: formData.get('horario_ocorrido'),
            local_ocorrido: formData.get('local_ocorrido'),
            relato_ocorrido: formData.get('relato_ocorrido'),
            comprovacoes_link: formData.get('comprovacoes_link') || null,
            comprovacoes_arquivo: comprovacoesArquivo.length > 0 ? JSON.stringify(comprovacoesArquivo) : null,
            declaracoes_aceitas: formData.get('declaracoes_aceitas') === 'on',
            assinatura_denunciante: formData.get('assinatura_denunciante'),
            status: 'aberta'
        };

        if (!denunciaData.relato_ocorrido || !denunciaData.relato_ocorrido.trim()) {
            alert('Por favor, descreva o ocorrido.');
            return;
        }

        if (!denunciaData.declaracoes_aceitas) {
            alert('Você precisa aceitar as declarações para enviar a denúncia.');
            return;
        }

        this.showLoading();

        try {
            
            let attempts = 0;
            while ((typeof window.denunciasManager === 'undefined' || !window.denunciasManager.initialized) && attempts < 20) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (typeof window.denunciasManager === 'undefined') {
                
                const result = await this.createDenunciaDirect(denunciaData);
                if (result && result.success) {
                    this.showDenunciaSuccess(result.denuncia.id);
                } else {
                    throw new Error(result?.error || 'Erro ao criar denúncia');
                }
            } else {
                
                const result = await window.denunciasManager.addDenuncia(denunciaData);
                if (result && result.success) {
                    this.showDenunciaSuccess(result.denuncia.id);
                } else {
                    throw new Error(result?.error || 'Erro ao criar denúncia');
                }
            }
        } catch (error) {
            alert('Erro ao criar denúncia: ' + (error.message || 'Erro desconhecido'));
            this.showDenunciaForm();
        }
    }

    async createDenunciaDirect(denunciaData) {
        try {
            const response = await fetch('/api/php/create-denuncia.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(denunciaData)
            });

            const result = await response.json();
            return result;
        } catch (error) {
            throw new Error('Erro ao comunicar com o servidor: ' + error.message);
        }
    }

    showDenunciaSuccess(denunciaId) {
        const form = document.getElementById('denuncia-widget-form');
        const success = document.getElementById('tickets-widget-success');
        const loading = document.getElementById('tickets-widget-loading');
        const ticketIdInfo = document.getElementById('ticket-id-info');

        if (form) form.style.display = 'none';
        if (loading) loading.style.display = 'none';
        if (success) {
            success.style.display = 'block';
            const h3 = success.querySelector('h3');
            const p = success.querySelector('p');
            if (h3) h3.textContent = 'Denúncia enviada com sucesso!';
            if (p) p.textContent = 'Sua denúncia foi registrada e será analisada pela Corregedoria.';
        }
        if (ticketIdInfo) {
            ticketIdInfo.textContent = `ID da Denúncia: #${denunciaId}`;
        }
    }

    showDenunciaForm() {
        const form = document.getElementById('denuncia-widget-form');
        const success = document.getElementById('tickets-widget-success');
        const loading = document.getElementById('tickets-widget-loading');

        if (loading) loading.style.display = 'none';
        if (success) success.style.display = 'none';
        if (form) form.style.display = 'block';
    }
}

(function initTicketsWidget() {
    let widgetInstance = null;
    
    function createWidget() {
        
        const existingWidget = document.getElementById('tickets-widget');
        if (existingWidget) {
            
            const batalhaoSelect = document.getElementById('ticket-batalhao');
            if (batalhaoSelect && batalhaoSelect.tagName === 'SELECT') {
                
                if (!window.ticketsWidget && existingWidget._widgetInstance) {
                    window.ticketsWidget = existingWidget._widgetInstance;
                }
                return;
            } else {
                existingWidget.remove();
            }
        }

        if (widgetInstance) {
            widgetInstance = null;
        }
        
        try {
            widgetInstance = new TicketsWidget();
            window.ticketsWidget = widgetInstance;

            const widgetElement = document.getElementById('tickets-widget');
            if (widgetElement) {
                widgetElement._widgetInstance = widgetInstance;
            }
            
            window.openTicketsWidget = function() {
                if (window.ticketsWidget && typeof window.ticketsWidget.open === 'function') {
                    window.ticketsWidget.open();
                } else {
                    
                    setTimeout(() => {
                        if (window.ticketsWidget && typeof window.ticketsWidget.open === 'function') {
                            window.ticketsWidget.open();
                        } else {
                        }
                    }, 500);
                }
            };

            window.openCorregedoriaWidget = function() {
                if (window.ticketsWidget && typeof window.ticketsWidget.open === 'function') {
                    window.ticketsWidget.open();
                    
                    setTimeout(() => {
                        if (window.ticketsWidget && typeof window.ticketsWidget.switchTab === 'function') {
                            window.ticketsWidget.switchTab('corregedoria');
                        }
                    }, 100);
                } else {
                    
                    setTimeout(() => {
                        if (window.ticketsWidget && typeof window.ticketsWidget.open === 'function') {
                            window.ticketsWidget.open();
                            setTimeout(() => {
                                if (window.ticketsWidget && typeof window.ticketsWidget.switchTab === 'function') {
                                    window.ticketsWidget.switchTab('corregedoria');
                                }
                            }, 100);
                        }
                    }, 500);
                }
            };
        } catch (error) {
        }
    }

    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(createWidget, 500); 
            });
        } else {
            
            setTimeout(createWidget, 500);
        }
    }
    
    init();
})();
