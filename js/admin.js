// Se ejecuta cuando todo el HTML de admin.html está cargado
document.addEventListener("DOMContentLoaded", () => {

    // --- 0. URL DE LA API Y DATOS DE USUARIO ---
    const GAS_API_URL = localStorage.getItem("GAS_API_URL");
    const loggedInUser = localStorage.getItem("sistemaPeritosUser");
    const loggedInFullName = localStorage.getItem("sistemaPeritosFullName");
    
    // --- Constantes de Estilo ---
    const swalDark = { popup: 'bg-dark text-white', title: 'text-white', content: 'text-white-50' };

    // --- 1. VERIFICACIÓN DE SEGURIDAD (¡MUY IMPORTANTE!) ---
    if (!GAS_API_URL || !loggedInUser || !loggedInFullName) {
        alert("Acceso denegado. No se encontraron credenciales.");
        window.location.href = "index.html";
        return;
    }
    
    // Si el usuario no es 'admin', lo expulsa.
    if (loggedInUser !== "admin") {
        alert("Acceso denegado. Esta sección es solo para administradores.");
        window.location.href = "index.html";
        return;
    }

    // --- 2. INICIALIZACIÓN DE LA PÁGINA ---
    const userGreeting = document.getElementById("user-greeting");
    userGreeting.innerHTML = `<i class="fa-solid fa-user-shield"></i> Admin: <strong>${loggedInFullName}</strong>`;
    
    // --- Lógica de Cerrar Sesión (Copiada de app.js) ---
    document.getElementById("btn-logout").addEventListener("click", () => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: "¿Deseas cerrar la sesión de administrador?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, cerrar sesión',
            cancelButtonText: 'Cancelar',
            customClass: swalDark
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem("sistemaPeritosUser");
                localStorage.removeItem("sistemaPeritosFullName");
                localStorage.removeItem("GAS_API_URL"); 
                window.location.href = "index.html";
            }
        });
    });

    /* ==========================================================
       PESTAÑA 1: LÓGICA DEL DASHBOARD (ACTUALIZADO)
       ========================================================== */
    const dashboardLoader = document.getElementById('dashboard-loader');
    
    // --- Selectores de las tarjetas KPI ---
    const statTotalSi = document.getElementById('stat-total-si');
    const statTotalNo = document.getElementById('stat-total-no');
    const statTotalGeneral = document.getElementById('stat-total-general');
    const statsDateRange = document.getElementById('stats-date-range');
    const statsTableBody = document.getElementById('stats-table-body');

    // --- Contexto para el Gráfico ---
    const ctxDelegaciones = document.getElementById('chart-delegaciones').getContext('2d');
    
    // Configuración global de Chart.js para tema oscuro
    Chart.defaults.color = '#8d9aaaff';
    Chart.defaults.borderColor = '#4a5568';
    
    let chartDelegacionesInstance = null;

    /**
     * Carga los datos del dashboard desde el backend
     */
    async function loadDashboardData() {
        dashboardLoader.classList.remove('d-none');
        
        try {
            const payload = {
                action: "getDashboardStats", // Esta es la acción que modificaremos
                user: loggedInUser 
            };
            
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: 'follow'
            });
            const data = await response.json();

            if (data.status === 'success') {
                // Rellenar las tarjetas (KPIs)
                statTotalSi.textContent = data.kpis.totalSI;
                statTotalNo.textContent = data.kpis.totalNO;
                statTotalGeneral.textContent = data.kpis.totalGeneral;

                // Rellenar rango de fechas
                statsDateRange.innerHTML = `<i class="fa-solid fa-calendar-days"></i> Mostrando datos de los últimos 45 días: (<strong>${data.dateRange}</strong>)`;

                // Dibujar el gráfico (Req 2)
                renderDelegacionesChart(data.chartData);
                
                // Rellenar la tabla (Req 1)
                renderStatsTable(data.tablaData);
                
            } else {
                throw new Error(data.message);
            }
            
        } catch (error) {
            Swal.fire({ 
                icon: 'error', 
                title: 'Error al Cargar Dashboard', 
                text: error.message, 
                customClass: swalDark 
            });
        } finally {
            dashboardLoader.classList.add('d-none');
        }
    }

    /**
     * Dibuja el gráfico de barras "Delegaciones Cumplidas" (Req 2)
     */
    function renderDelegacionesChart(data) {
        if (chartDelegacionesInstance) {
            chartDelegacionesInstance.destroy();
        }
        chartDelegacionesInstance = new Chart(ctxDelegaciones, {
            type: 'bar',
            data: {
                labels: data.labels, // Nombres de Peritos
                datasets: [{
                    label: 'Delegaciones Cumplidas (SI)',
                    data: data.data, // Conteos de "SI"
                    backgroundColor: 'rgba(22, 163, 74, 0.7)', // Verde
                    borderColor: 'rgba(22, 163, 74, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y', // Hace el gráfico horizontal
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { 
                        beginAtZero: true,
                        ticks: {
                            precision: 0 // Asegura que no haya decimales (ej: 2.5)
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Dibuja la tabla de resumen (Req 1)
     */
    function renderStatsTable(data) {
        statsTableBody.innerHTML = ''; // Limpiar el bosquejo
        
        if (!data || data.length === 0) {
            statsTableBody.innerHTML = '<tr><td colspan="5" class="text-center">No se encontraron datos para los últimos 30 días.</td></tr>';
            return;
        }
        
        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.grado}</td>
                <td>${row.perito}</td>
                <td>${row.si}</td>
                <td>${row.no}</td>
                <td><strong>${row.total}</strong></td>
            `;
            statsTableBody.appendChild(tr);
        });
    }

    // Cargar los datos del dashboard al iniciar la página
    loadDashboardData();


    /* ==========================================================
       PESTAÑA 2: LÓGICA DE BÚSQUEDA GLOBAL (Sin cambios)
       ========================================================== */
    const searchForm = document.getElementById("search-form");
    const searchTermInput = document.getElementById("search-term");
    const searchLoader = document.getElementById("search-loader");
    const searchResultsContainer = document.getElementById("search-results-container");
    const searchResultsTbody = document.getElementById("search-results-tbody");
    
    searchForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const searchTerm = searchTermInput.value.trim();
        if (!searchTerm) return;

        searchLoader.classList.remove('d-none');
        searchResultsContainer.style.display = "none";
        searchResultsTbody.innerHTML = ""; 

        const payload = {
            action: "buscarInformesGlobal", // ¡Acción de búsqueda de la app interna!
            searchTerm: searchTerm,
            user: loggedInUser 
        };

        try {
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: 'follow'
            });
            const data = await response.json();
            
            searchLoader.classList.add('d-none');
            
            if (data.status === 'success') {
                renderSearchResults(data.results);
            } else {
                throw new Error(data.message || "Error desconocido en el servidor.");
            }

        } catch (error) {
            console.error('Error en la búsqueda global:', error);
            searchLoader.classList.add('d-none');
            Swal.fire({ 
                icon: 'error', 
                title: 'Error de Búsqueda', 
                text: error.message, 
                customClass: swalDark 
            });
        }
    });

    /**
     * Dibuja los resultados en la tabla de búsqueda global
     */
    function renderSearchResults(results) {
        searchResultsTbody.innerHTML = ""; 
        
        if (results.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="6" class="text-center text-white-50">No se encontraron informes.</td>`;
            searchResultsTbody.appendChild(tr);
        } else {
            const escape = (str) => String(str).replace(/[&<>"']/g, m => ({'&': '&amp;','<': '&lt;','>': '&gt;','"': '&quot;',"'": '&#39;'})[m]);

            results.forEach(report => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${escape(report.tabla_if_nro)}</td>
                    <td>${escape(report.reporte_id)}</td>
                    <td>${escape(report.detenido)}</td>
                    <td>${escape(report.fecha_creacion)}</td>
                    <td><strong>${escape(report.creado_por)}</strong></td>
                    <td>
                        <button class="btn btn-danger btn-sm me-1 btn-pdf-report" data-report-id="${escape(report.reporte_id)}" title="Visualizar (PDF)">
                            <i class="fa-solid fa-file-pdf"></i>
                        </button>
                        <button class="btn btn-primary btn-sm btn-word-report" data-report-id="${escape(report.reporte_id)}" title="Descargar (WORD)">
                            <i class="fa-solid fa-file-word"></i>
                        </button>
                    </td>
                `;
                searchResultsTbody.appendChild(tr);
            });
        }
        searchResultsContainer.style.display = "block"; 
    }

    /* ==========================================================
       LÓGICA DE IMPRESIÓN (Sin cambios)
       ========================================================== */

    searchResultsTbody.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const reportId = button.dataset.reportId;
        if (!reportId) return;

        if (button.classList.contains('btn-pdf-report')) {
            handlePrintMenu(reportId, button.dataset.createdBy);
        } else if (button.classList.contains('btn-word-report')) {
            handlePrintMenu(reportId, button.dataset.createdBy);
        }
    });

    function handlePrintMenu(reportId) {
        Swal.fire({
            title: 'Seleccione un formato',
            text: `¿Cómo desea imprimir el informe ${reportId}?`,
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: `<i class="fa-solid fa-file-pdf"></i> Generar PDF`,
            denyButtonText: `<i class="fa-solid fa-file-word"></i> Descargar WORD`,
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d33', 
            denyButtonColor: '#3085d6', 
            customClass: swalDark
        }).then((result) => {
            if (result.isConfirmed) {
                generarDocumento('pdf', reportId);
            } else if (result.isDenied) {
                generarDocumento('word', reportId);
            }
        });
    }

    async function generarDocumento(format, reportId) {
        Swal.fire({
            title: `Generando ${format.toUpperCase()}...`,
            text: 'Esto puede tomar un momento, el servidor está ensamblando el documento...',
            allowOutsideClick: false,
            customClass: swalDark,
            didOpen: () => Swal.showLoading()
        });

        try {
            const payload = {
                action: "generarDocumento",
                reportId: reportId,
                format: format,
                user: loggedInUser // El backend verificará si 'admin' tiene permiso
            };
            
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: 'follow'
            });

            const data = await response.json();

            if (data.status === 'success') {
                Swal.close(); 
                downloadFileFromBase64(data.base64Data, data.fileName, data.mimeType, format);
            } else {
                throw new Error(data.message || "Error desconocido en el backend.");
            }

        } catch (error) {
            console.error('Error en generarDocumento:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error de Conexión',
                text: `No se pudo generar el documento: ${error.message}`,
                customClass: swalDark
            });
        }
    }
    
    function downloadFileFromBase64(base64Data, fileName, mimeType, format) {
        try {
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });

            const blobUrl = URL.createObjectURL(blob);

            if (format === 'pdf') {
                window.open(blobUrl, '_blank');
            } else {
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = fileName; 
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

        } catch (e) {
            console.error("Error al decodificar o descargar el archivo:", e);
            Swal.fire({
                icon: 'error',
                title: 'Error de Descarga',
                text: 'Hubo un problema al crear el archivo para descargar.',
                customClass: swalDark
            });
        }
    }


});
