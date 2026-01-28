document.addEventListener('DOMContentLoaded', () => {
  const backToTopBtn = document.getElementById('back-to-top');
  const bead = document.getElementById('scroll-bead');
  
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      backToTopBtn.classList.add('show');
    } else {
      backToTopBtn.classList.remove('show');
    }

    if (window.innerWidth >= 768 && bead) {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPos = window.scrollY;
      const pct = Math.min(scrollPos / docHeight, 1);
      bead.style.top = (pct * 100) + '%';
    }
  }, { passive: true });

  const observerOptions = {
    threshold: 0.15,
    rootMargin: "0px 0px -50px 0px"
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.reveal-item').forEach(el => {
    observer.observe(el);
  });
  
  document.querySelectorAll('.animate-float').forEach(el => {
    el.style.animationDelay = `-${Math.random() * 5}s`;
  });
});