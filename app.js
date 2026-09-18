document.addEventListener('DOMContentLoaded', () => {
    // --- MENÚ HAMBURGUESA ---
    const menuBtn = document.getElementById('menu-btn');
    const navLinks = document.querySelector('.nav-links-menu');

    if (menuBtn && navLinks) { // Veo si existen
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navLinks.classList.toggle('abierto');
        });

        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('abierto');
            });
        });
    }
    
    // --- MODO OSCURO ---
    const btnTema = document.getElementById('btn-tema');
    if (btnTema) {
        btnTema.addEventListener('click', () => {
            document.body.classList.toggle('oscuro');
            btnTema.textContent = document.body.classList.contains('oscuro') ? '☀️' : '🌙';
        });
    }

    // --- FORMULARIO ---
    const contactoForm = document.getElementById('contact');
    const statusMessage = document.getElementById('statusMessage');

    if (contactoForm && statusMessage) {
        contactoForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Detiene la recarga nativa de la página

            // Mensaje
            statusMessage.textContent = "Mensaje enviado correctamente";
            statusMessage.className = "success"; 

            contactoForm.reset(); // Vacío formulario

            setTimeout(() => {
                statusMessage.textContent = "";
                statusMessage.className = "";
            }, 5000);
        });
    }
});