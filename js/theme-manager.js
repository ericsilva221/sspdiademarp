// Gerenciador de Tema e Acessibilidade
(function() {
    'use strict';

    // Gerenciamento de Tema (Modo Escuro/Claro)
    const ThemeManager = {
        init: function() {
            this.loadTheme();
            this.createThemeToggle();
            this.applyTheme();
        },

        getTheme: function() {
            return localStorage.getItem('theme') || 'light';
        },

        setTheme: function(theme) {
            localStorage.setItem('theme', theme);
            this.applyTheme();
        },

        toggleTheme: function() {
            const currentTheme = this.getTheme();
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            this.setTheme(newTheme);
            // Atualiza todos os botões de tema na página
            this.updateAllToggleButtons(newTheme);
            return newTheme;
        },

        updateAllToggleButtons: function(theme) {
            const toggleButtons = document.querySelectorAll('#theme-toggle, #theme-toggle-admin');
            toggleButtons.forEach(button => {
                this.updateToggleIcon(button, theme);
            });
        },

        loadTheme: function() {
            const theme = this.getTheme();
            if (theme === 'dark') {
                document.documentElement.classList.add('dark-mode');
            } else {
                document.documentElement.classList.remove('dark-mode');
            }
        },

        applyTheme: function() {
            const theme = this.getTheme();
            if (theme === 'dark') {
                if (document.documentElement) {
                    document.documentElement.classList.add('dark-mode');
                }
                if (document.body) {
                    document.body.classList.add('dark-mode');
                }
            } else {
                if (document.documentElement) {
                    document.documentElement.classList.remove('dark-mode');
                }
                if (document.body) {
                    document.body.classList.remove('dark-mode');
                }
            }
        },

        createThemeToggle: function() {
            // Verifica se já existe um botão de tema
            let themeToggle = document.getElementById('theme-toggle');
            let themeToggleAdmin = document.getElementById('theme-toggle-admin');
            
            // Cria botão para páginas normais (com .accessibility)
            if (!themeToggle) {
                const accessibilityDiv = document.querySelector('.accessibility');
                if (accessibilityDiv) {
                    themeToggle = document.createElement('button');
                    themeToggle.id = 'theme-toggle';
                    themeToggle.className = 'acc-btn';
                    themeToggle.setAttribute('aria-label', 'Alternar modo escuro/claro');
                    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
                    themeToggle.title = 'Alternar modo escuro/claro';
                    
                    // Adiciona antes dos botões de fonte
                    const fontIncrease = document.getElementById('font-increase');
                    if (fontIncrease && fontIncrease.parentNode) {
                        fontIncrease.parentNode.insertBefore(themeToggle, fontIncrease);
                    } else {
                        accessibilityDiv.appendChild(themeToggle);
                    }
                    
                    themeToggle.addEventListener('click', () => {
                        this.toggleTheme();
                    });
                    
                    // Atualiza o ícone inicial
                    const currentTheme = this.getTheme();
                    this.updateToggleIcon(themeToggle, currentTheme);
                }
            }
            
            // Atualiza botão admin se existir
            if (themeToggleAdmin) {
                const currentTheme = this.getTheme();
                this.updateToggleIcon(themeToggleAdmin, currentTheme);
                
                // Adiciona listener se não tiver
                if (!themeToggleAdmin.hasAttribute('data-theme-listener')) {
                    themeToggleAdmin.setAttribute('data-theme-listener', 'true');
                    themeToggleAdmin.addEventListener('click', () => {
                        this.toggleTheme();
                    });
                }
            }
        },

        updateToggleIcon: function(button, theme) {
            if (!button) return;
            const icon = button.querySelector('i');
            const textSpan = button.querySelector('.theme-toggle-text');
            
            if (icon) {
                if (theme === 'dark') {
                    icon.classList.remove('fa-moon');
                    icon.classList.add('fa-sun');
                    button.setAttribute('aria-label', 'Alternar para modo claro');
                    button.title = 'Alternar para modo claro';
                    if (textSpan) textSpan.textContent = 'Modo Claro';
                } else {
                    icon.classList.remove('fa-sun');
                    icon.classList.add('fa-moon');
                    button.setAttribute('aria-label', 'Alternar para modo escuro');
                    button.title = 'Alternar para modo escuro';
                    if (textSpan) textSpan.textContent = 'Modo Escuro';
                }
            }
        }
    };

    // Gerenciamento de Tamanho de Fonte
    const FontSizeManager = {
        init: function() {
            this.loadFontSize();
            this.setupButtons();
        },

        getFontSize: function() {
            const saved = localStorage.getItem('fontSize');
            return saved ? parseInt(saved) : 100;
        },

        setFontSize: function(size) {
            localStorage.setItem('fontSize', size);
            this.applyFontSize(size);
        },

        applyFontSize: function(size) {
            if (document.documentElement) {
                document.documentElement.style.fontSize = size + '%';
            }
            if (document.body) {
                document.body.style.fontSize = size + '%';
            }
        },

        loadFontSize: function() {
            const size = this.getFontSize();
            this.applyFontSize(size);
        },

        increase: function() {
            const current = this.getFontSize();
            const newSize = Math.min(current + 10, 150);
            this.setFontSize(newSize);
        },

        decrease: function() {
            const current = this.getFontSize();
            const newSize = Math.max(current - 10, 80);
            this.setFontSize(newSize);
        },

        setupButtons: function() {
            const fontIncrease = document.getElementById('font-increase');
            const fontDecrease = document.getElementById('font-decrease');
            
            if (fontIncrease) {
                fontIncrease.addEventListener('click', () => {
                    this.increase();
                });
            }
            
            if (fontDecrease) {
                fontDecrease.addEventListener('click', () => {
                    this.decrease();
                });
            }
        }
    };

    // Gerenciamento de Alto Contraste
    const HighContrastManager = {
        init: function() {
            this.loadHighContrast();
            // Remove qualquer botão de alto contraste existente
            this.removeToggleButton();
        },

        removeToggleButton: function() {
            const contrastToggle = document.getElementById('contrast-toggle');
            if (contrastToggle && contrastToggle.parentNode) {
                contrastToggle.parentNode.removeChild(contrastToggle);
            }
        },

        getHighContrast: function() {
            return localStorage.getItem('highContrast') === 'true';
        },

        setHighContrast: function(enabled) {
            localStorage.setItem('highContrast', enabled ? 'true' : 'false');
            this.applyHighContrast(enabled);
        },

        toggleHighContrast: function() {
            const current = this.getHighContrast();
            const newState = !current;
            this.setHighContrast(newState);
            // updateToggleButton removido - botão desabilitado
            return newState;
        },

        applyHighContrast: function(enabled) {
            if (document.documentElement) {
                if (enabled) {
                    document.documentElement.classList.add('high-contrast');
                } else {
                    document.documentElement.classList.remove('high-contrast');
                }
            }
            if (document.body) {
                if (enabled) {
                    document.body.classList.add('high-contrast');
                } else {
                    document.body.classList.remove('high-contrast');
                }
            }
        },

        loadHighContrast: function() {
            const enabled = this.getHighContrast();
            this.applyHighContrast(enabled);
        }

        // Funções createToggle() e updateToggleButton() removidas - botão de alto contraste desabilitado
    };

    // Inicialização quando o DOM estiver pronto
    function init() {
        // Carrega tema imediatamente para evitar flash - CRÍTICO para funcionar em todas as páginas
        ThemeManager.loadTheme();
        FontSizeManager.loadFontSize();
        HighContrastManager.loadHighContrast();
        
        // Aplica o tema imediatamente também
        ThemeManager.applyTheme();
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                ThemeManager.init();
                FontSizeManager.init();
                // HighContrastManager.init(); // Desabilitado - botão removido
            });
        } else {
            // DOM já carregado, inicializa após um pequeno delay para garantir que todos os elementos existam
            setTimeout(function() {
                ThemeManager.init();
                FontSizeManager.init();
                // HighContrastManager.init(); // Desabilitado - botão removido
            }, 50);
        }
        
        // Reaplica o tema periodicamente para garantir que funcione mesmo se outros scripts mudarem
        setTimeout(function() {
            ThemeManager.applyTheme();
            // HighContrastManager.applyHighContrast(HighContrastManager.getHighContrast()); // Desabilitado
        }, 200);
    }

    // Exporta para uso global
    window.ThemeManager = ThemeManager;
    window.FontSizeManager = FontSizeManager;
    window.HighContrastManager = HighContrastManager;

    // Inicializa
    init();
})();

