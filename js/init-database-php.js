

(function() {
    
    async function checkMySQLAPI() {
        try {
            const response = await fetch('/api/php/mysql-api.php?table=news', {
                method: 'GET',
                credentials: 'include'
            });
            
            // GET não requer autenticação, então qualquer resposta (exceto erro de servidor) indica que a API está disponível
            if (response.status === 200 || response.status === 401 || response.status === 400) {
                // 200 = sucesso, 401 = autenticação necessária (mas API está funcionando), 400 = erro de parâmetro (mas API está funcionando)
                window.MYSQL_AVAILABLE = true;
            } else if (response.status >= 500) {
                // Erro de servidor - API pode não estar disponível
                window.MYSQL_AVAILABLE = false;
            } else {
                // Outros códigos - assume que está disponível
                window.MYSQL_AVAILABLE = true;
            }
        } catch (error) {
            // Erro de rede - API não está disponível
            window.MYSQL_AVAILABLE = false;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkMySQLAPI);
    } else {
        checkMySQLAPI();
    }
})();
