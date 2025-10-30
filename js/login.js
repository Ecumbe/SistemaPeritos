// Espera a que todo el contenido del HTML esté cargado
document.addEventListener("DOMContentLoaded", () => {

    // --- ¡¡¡IMPORTANTE!!! ---
    // Pega aquí la URL de tu API de Google Apps Script que guardaste.
    const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxpuP-EfinUd91iSxbxJATfBPaw30eVj0AFXWpXQl10Kwqq3-jRPkbNoTpc8DXz903j/exec"; // 👈 REEMPLAZA ESTO

    // Seleccionamos los elementos del formulario
    const loginForm = document.getElementById("login-form");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const togglePassword = document.getElementById("toggle-password");
    const btnLogin = document.getElementById("btn-login");

    // --- Lógica para ver/ocultar contraseña ---
    togglePassword.addEventListener("click", () => {
        // Obtiene el icono de adentro
        const icon = togglePassword.querySelector("i");
        
        // Cambia el tipo de input (password a text y viceversa)
        const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
        passwordInput.setAttribute("type", type);

        // Cambia el icono (ojo abierto a cerrado y viceversa)
        icon.classList.toggle("fa-eye-slash");
        icon.classList.toggle("fa-eye");
    });

    // --- Lógica para manejar el envío del formulario ---
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault(); // Evita que la página se recargue

        const username = usernameInput.value;
        const password = passwordInput.value;

        // Deshabilitamos el botón y mostramos un "cargando"
        btnLogin.disabled = true;
        btnLogin.innerHTML = `
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Verificando...
        `;

        // Mostramos una alerta de "procesando"
        Swal.fire({
            title: 'Verificando credenciales',
            text: 'Por favor espera...',
            allowOutsideClick: false,
            // Aplicamos clases oscuras a SweetAlert
            customClass: {
                popup: 'bg-dark text-white',
                title: 'text-white',
                content: 'text-white-50'
            },
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        // Creamos el objeto de datos que enviaremos a Google Apps Script
        const payload = {
            action: "login", // Le decimos a nuestra API qué queremos hacer
            user: username,
            pass: password
        };

        // --- Enviamos los datos a la API de Google (Fetch) ---
        fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', // Requerido por Apps Script
            },
        })
        .then(response => response.json())
        .then(data => {
            // Cerramos la alerta de "cargando"
            Swal.close();

            // Clases personalizadas para SweetAlert
            const swalCustomClasses = {
                popup: 'bg-dark text-white',
                title: 'text-white',
                content: 'text-white-50'
            };

            if (data.status === "success") {
                // ¡Éxito!
                Swal.fire({
                    icon: 'success',
                    title: `¡Bienvenido, ${data.user}!`,
                    text: 'Serás redirigido en un momento.',
                    timer: 2000,
                    showConfirmButton: false,
                    customClass: swalCustomClasses
                });
                
                // Guardamos el nombre de usuario en el navegador para usarlo en la app
                localStorage.setItem("sistemaPeritosUser", data.user);

                // Redirigimos a la página principal de la app
                setTimeout(() => {
                    window.location.href = "app.html"; // Aún no la hemos creado
                }, 2000);

            } else {
                // Error de credenciales
                Swal.fire({
                    icon: 'error',
                    title: 'Acceso Denegado',
                    text: data.message || 'Usuario o contraseña incorrectos.',
                    customClass: swalCustomClasses
                });
                // Reactivamos el botón
                btnLogin.disabled = false;
                btnLogin.innerHTML = "Iniciar Sesión";
            }
        })
        .catch(error => {
            // Error de red o algo falló
            Swal.fire({
                icon: 'error',
                title: 'Error de Conexión',
                text: 'No se pudo conectar con el servidor. Revisa tu conexión a internet.',
                customClass: {
                    popup: 'bg-dark text-white',
                    title: 'text-white',
                    content: 'text-white-50'
                }
            });
            // Reactivamos el botón
            btnLogin.disabled = false;
            btnLogin.innerHTML = "Iniciar Sesión";
            console.error('Error en el fetch:', error);
        });
    });

});
