document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    if (mobileMenuToggle && mainNav) {
        mobileMenuToggle.addEventListener('click', function() {
            mainNav.classList.toggle('active');
            const icon = this.querySelector('i');
            if (mainNav.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }
    document.addEventListener('click', function(e) {
        if (mobileMenuToggle && mainNav && 
            !mainNav.contains(e.target) && 
            !mobileMenuToggle.contains(e.target) &&
            mainNav.classList.contains('active')) {
            mainNav.classList.remove('active');
            const icon = mobileMenuToggle.querySelector('i');
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });
    const dropdowns = document.querySelectorAll('.nav-dropdown');
    const dropdownTimers = new Map(); // Armazena os timers de cada dropdown
    
    dropdowns.forEach(dropdown => {
        const dropdownLink = dropdown.querySelector('.nav-link-dropdown');
        const dropdownMenu = dropdown.querySelector('.dropdown-menu');
        if (dropdownLink && dropdownMenu) {
            dropdownLink.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                // Limpar timer se existir
                if (dropdownTimers.has(dropdown)) {
                    clearTimeout(dropdownTimers.get(dropdown));
                    dropdownTimers.delete(dropdown);
                }
                dropdowns.forEach(otherDropdown => {
                    if (otherDropdown !== dropdown) {
                        otherDropdown.classList.remove('active');
                        // Limpar timers de outros dropdowns
                        if (dropdownTimers.has(otherDropdown)) {
                            clearTimeout(dropdownTimers.get(otherDropdown));
                            dropdownTimers.delete(otherDropdown);
                        }
                    }
                });
                dropdown.classList.toggle('active');
            });
            dropdown.addEventListener('mouseenter', function() {
                // Limpar timer se existir ao entrar no dropdown
                if (dropdownTimers.has(dropdown)) {
                    clearTimeout(dropdownTimers.get(dropdown));
                    dropdownTimers.delete(dropdown);
                }
                dropdown.classList.add('active');
            });
            dropdown.addEventListener('mouseleave', function() {
                if (window.innerWidth > 768) {
                    // Adicionar delay de 300ms antes de fechar
                    const timer = setTimeout(function() {
                        dropdown.classList.remove('active');
                        dropdownTimers.delete(dropdown);
                    }, 300); // 300ms de delay
                    dropdownTimers.set(dropdown, timer);
                }
            });
            // Manter aberto quando o mouse está sobre o menu dropdown
            dropdownMenu.addEventListener('mouseenter', function() {
                // Limpar timer ao entrar no menu
                if (dropdownTimers.has(dropdown)) {
                    clearTimeout(dropdownTimers.get(dropdown));
                    dropdownTimers.delete(dropdown);
                }
                dropdown.classList.add('active');
            });
            dropdownMenu.addEventListener('mouseleave', function() {
                if (window.innerWidth > 768) {
                    // Adicionar delay de 300ms antes de fechar
                    const timer = setTimeout(function() {
                        dropdown.classList.remove('active');
                        dropdownTimers.delete(dropdown);
                    }, 300); // 300ms de delay
                    dropdownTimers.set(dropdown, timer);
                }
            });
        }
    });
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-dropdown')) {
            dropdowns.forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        }
    });
    // Controle de fonte agora é gerenciado por theme-manager.js
    const alertBtn = document.getElementById('alert');
    if (alertBtn) {
        alertBtn.addEventListener('click', function() {
            alert('Sistema de alertas da Polícia Militar de São Paulo.\n\nFique atento às informações de segurança pública.');
        });
    }
    const indicators = document.querySelectorAll('.indicator');
    let currentSlide = 0;
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', function() {
            indicators.forEach(ind => ind.classList.remove('active'));
            this.classList.add('active');
            currentSlide = index;
        });
    });
    setInterval(function() {
        currentSlide = (currentSlide + 1) % indicators.length;
        indicators.forEach((ind, index) => {
            if (index === currentSlide) {
                ind.classList.add('active');
            } else {
                ind.classList.remove('active');
            }
        });
    }, 5000);
    const serviceItems = document.querySelectorAll('.service-item');
    serviceItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transition = 'transform 0.3s ease';
        });
    });
    const navLinks = document.querySelectorAll('.main-nav a:not(.nav-link-dropdown)');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    const animatedElements = document.querySelectorAll('.service-item, .news-item');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});
// Estilos de modo escuro agora estão em styles.css e são gerenciados por theme-manager.js
