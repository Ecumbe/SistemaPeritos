/* ==========================================================
   CONTROLADOR DEL NUEVO SIDEBAR (sidebar.js) - v3.1
   - Arregla que los botones de tabs no funcionaban.
   - ¡NUEVO! Permite enlaces externos con data-external="true"
   - Auto-colapsa el sidebar a los 2 segundos.
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Elementos para colapsar/expandir ---
    const body = document.body;
    const sidebarToggleBtn = document.querySelector('.sidebar-toggle-btn');
    const mobileToggleBtn = document.querySelector('.mobile-toggle-btn');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');

    // Función para colapsar/expandir
    const toggleSidebar = () => {
        body.classList.toggle('sidebar-collapsed');
    };

    // --- 2. Asignar Eventos a los Botones de Layout ---
    
    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', toggleSidebar);
    }
    if (mobileToggleBtn) {
        mobileToggleBtn.addEventListener('click', toggleSidebar);
    }
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }

    // --- 3. FUNCIONALIDAD DE PESTAÑAS (TABS) ---
    
    const allSidebarLinks = document.querySelectorAll('.sidebar-nav .nav-link');

    allSidebarLinks.forEach(link => {
        
        link.addEventListener('click', (e) => {

            // ⛔ NUEVO: permitir enlaces externos normalmente
            if (link.dataset.external === "true") {
                return; // NO bloquear ni manejar como tab
            }

            // Si NO es externo, y es un tab interno:
            if (link.dataset.bsToggle === "tab") {

                e.preventDefault();

                const targetId = link.dataset.bsTarget;
                const originalTrigger = document.querySelector(`.app-tabs .nav-link[data-bs-target="${targetId}"]`);
                
                if (originalTrigger) {
                    const tab = new bootstrap.Tab(originalTrigger);
                    tab.show();
                    
                    allSidebarLinks.forEach(sibling => sibling.classList.remove('active'));
                    link.classList.add('active');

                    if (window.innerWidth < 992) {
                        body.classList.remove('sidebar-collapsed');
                    }

                } else {
                    console.error(`No se encontró el disparador de tab original para: ${targetId}`);
                }
            }
        });
    });

    // --- 4. Inicialización de Pestaña Activa ---
    const activeTab = document.querySelector('.app-main-content .nav-link.active[data-bs-toggle="tab"]');
    
    if (activeTab) {
        const activeTargetId = activeTab.dataset.bsTarget;
        const correspondingSidebarLink = document.querySelector(`.sidebar-nav .nav-link[data-bs-target="${activeTargetId}"]`);
        
        allSidebarLinks.forEach(sibling => sibling.classList.remove('active'));
        
        if (correspondingSidebarLink) {
            correspondingSidebarLink.classList.add('active');
        }
    }

    // --- 5. AUTO-COLAPSAR AL INICIO ---
    if (window.innerWidth > 991.98) {
        setTimeout(() => {
            body.classList.add('sidebar-collapsed');
        }, 2000);
    }

});
