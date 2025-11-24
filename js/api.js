// js/api.js
// Módulo simple para centralizar llamadas a Google Apps Script
(function () {
  // Intenta tomar la URL desde window o localStorage, si no, usa tu valor actual.
  const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbwfKYrojdS7bbGy0ioSHASxgfacOjSsWOzucfAOUyZHjVb9v00_nT-f0IJDdMHlTo6ThA/exec";

  function getApiUrl() {
    return window.GAS_API_URL || localStorage.getItem("GAS_API_URL") || DEFAULT_GAS_URL;
  }
  
  /**
   * Llamada genérica a la API GAS.
   * @param {string} action
   * @param {object} payload
   * @returns {Promise<any>}
   */
  async function request(action, payload) {
    const body = JSON.stringify(Object.assign({ action }, payload || {}));

    const res = await fetch(getApiUrl(), {
      method: "POST",
      body,
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      redirect: "follow"
    });

    return res.json();
  }

  // Atajo para algunas acciones frecuentes (opcional)
  function getUserStats(user) {
    return request("getUserStats", { user });
  }

  function getUserDashboardStats(user) {
    return request("getUserDashboardStats", { user });
  }

  function getLastOficios() {
    return request("getLastOficios", {});
  }

  function getRecentReports(user) {
    return request("getRecentReports", { user });
  }

  function buscarInformes(user, searchTerm) {
    return request("buscarInformes", { user, searchTerm });
  }

  function buscarFlagrancia(ifNumber) {
    return request("buscarFlagrancia", { ifNumber });
  }

  function guardarBorrador(user, draft) {
    return request("guardarBorrador", { user, draft });
  }

  function cargarBorrador(user) {
    return request("cargarBorrador", { user });
  }

  function guardarInformeCompleto(datos) {
    return request("guardarInformeCompleto", { datos });
  }

  function subirFoto(params) {
    return request("subirFoto", params);
  }

  function generarDocumentoBackend(params) {
    return request("generarDocumento", params);
  }

  // Agendamiento
  function guardarAgendamiento(user, datos) {
    return request("guardarAgendamiento", { user, datos });
  }

  function getAgendamientosPorFecha(user, fecha) {
    return request("getAgendamientosPorFecha", { user, fecha });
  }

  function buscarAgendamientos(user, searchTerm) {
    return request("buscarAgendamientos", { user, searchTerm });
  }

  function reagendarAudiencia(user, agendamiento_id, nueva_fecha, nueva_hora) {
    return request("reagendarAudiencia", {
      user,
      agendamiento_id,
      nueva_fecha,
      nueva_hora
    });
  }

  // ========================================================
  // 🔥 NUEVA FUNCIÓN: BORRAR BORRADOR DEL USUARIO EN LA NUBE
  // ========================================================
  function borrarBorrador(user) {
    return request("borrarBorrador", { user });
  }
  
  // Exponer en el scope global
  window.API = {
    request,
    getUserStats,
    getUserDashboardStats,
    getLastOficios,
    getRecentReports,
    buscarInformes,
    buscarFlagrancia,
    guardarBorrador,
    cargarBorrador,
    guardarInformeCompleto,
    subirFoto,
    generarDocumentoBackend,
    guardarAgendamiento,
    getAgendamientosPorFecha,
    buscarAgendamientos,
    reagendarAudiencia,

    // 🔥 NUEVO MÉTODO PÚBLICO
    borrarBorrador
  };
})();
