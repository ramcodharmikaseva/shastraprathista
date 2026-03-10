/* ========================= */
/* SHARED TEMPLE FUNCTIONS */
/* ========================= */

let templeCurrentSlide = 0;
let templeSlides, templeDots, templeInterval;

function initTempleSlider() {
    templeSlides = document.querySelectorAll('.slider .slide');
    const dotsContainer = document.getElementById('sliderDots');
    
    if (!dotsContainer || templeSlides.length === 0) {
        console.log('Slider elements not found');
        return;
    }
    
    dotsContainer.innerHTML = '';

    templeSlides.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
        dot.onclick = () => showTempleSlide(i);
        dotsContainer.appendChild(dot);
    });

    templeDots = document.querySelectorAll('.slider-dot');
    startAutoSlide();
}

function showTempleSlide(index) {
    if (!templeSlides || templeSlides.length === 0) return;
    
    templeSlides[templeCurrentSlide].classList.remove('active');
    if (templeDots && templeDots[templeCurrentSlide]) {
        templeDots[templeCurrentSlide].classList.remove('active');
    }

    templeCurrentSlide = index;

    templeSlides[templeCurrentSlide].classList.add('active');
    if (templeDots && templeDots[templeCurrentSlide]) {
        templeDots[templeCurrentSlide].classList.add('active');
    }
}

function nextSlide() {
    if (!templeSlides || templeSlides.length === 0) return;
    showTempleSlide((templeCurrentSlide + 1) % templeSlides.length);
}

function prevSlide() {
    if (!templeSlides || templeSlides.length === 0) return;
    showTempleSlide((templeCurrentSlide - 1 + templeSlides.length) % templeSlides.length);
}

function startAutoSlide() {
    clearInterval(templeInterval);
    templeInterval = setInterval(nextSlide, 5000);
}

// Pause auto-slide on hover
document.addEventListener('DOMContentLoaded', function() {
    const slider = document.querySelector('.slider');
    if (slider) {
        slider.addEventListener('mouseenter', () => clearInterval(templeInterval));
        slider.addEventListener('mouseleave', startAutoSlide);
    }
});

// Keyboard navigation
document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') prevSlide();
    if (e.key === 'ArrowRight') nextSlide();
});