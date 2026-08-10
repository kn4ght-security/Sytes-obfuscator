// LuaShield — Homepage JavaScript

document.addEventListener("DOMContentLoaded", () => {

    // Mobile navigation
    const nav = document.querySelector("nav");
    const navLinks = document.querySelector(".nav-links");

    // Smooth navigation
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener("click", event => {
            const targetId = link.getAttribute("href");

            if (targetId === "#") return;

            const target = document.querySelector(targetId);

            if (target) {
                event.preventDefault();

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });
    });


    // Navbar effect while scrolling
    window.addEventListener("scroll", () => {
        if (window.scrollY > 30) {
            nav.classList.add("scrolled");
        } else {
            nav.classList.remove("scrolled");
        }
    });


    // Feature card animation
    const cards = document.querySelectorAll(".card");

    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                }
            });
        },
        {
            threshold: 0.15
        }
    );

    cards.forEach(card => {
        observer.observe(card);
    });


    // Prevent broken placeholder links
    document.querySelectorAll('a[href="#"]').forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();
        });
    });

});