document.addEventListener('DOMContentLoaded', () => {
    // Testimonial Carousel Logic
    const testimonialTrack = document.querySelector('.testimonial-track');
    const testimonials = document.querySelectorAll('.testimonial-item');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const indicators = document.querySelectorAll('.indicator');

    let currentSlide = 0;
    const totalSlides = testimonials.length;
    let autoSlideInterval;

    function updateSlider(slideIndex) {
        // Update track position
        const translateX = -(slideIndex * (100 / totalSlides));
        testimonialTrack.style.transform = `translateX(${translateX}%)`;

        // Update active states
        testimonials.forEach((item, index) => {
            item.classList.toggle('active', index === slideIndex);
        });

        indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === slideIndex);
        });

        currentSlide = slideIndex;
    }

    function nextSlide() {
        const nextIndex = (currentSlide + 1) % totalSlides;
        updateSlider(nextIndex);
    }

    function prevSlide() {
        const prevIndex = (currentSlide - 1 + totalSlides) % totalSlides;
        updateSlider(prevIndex);
    }

    function startAutoSlide() {
        autoSlideInterval = setInterval(nextSlide, 5000); // Change slide every 5 seconds
    }

    function stopAutoSlide() {
        clearInterval(autoSlideInterval);
    }

    // Event listeners
    if (nextBtn && prevBtn) {
        nextBtn.addEventListener('click', () => {
            stopAutoSlide();
            nextSlide();
            startAutoSlide(); // Restart auto-slide after manual interaction
        });

        prevBtn.addEventListener('click', () => {
            stopAutoSlide();
            prevSlide();
            startAutoSlide();
        });
    }

    // Indicator click events
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            stopAutoSlide();
            updateSlider(index);
            startAutoSlide();
        });
    });

    // Pause auto-slide on hover
    const sliderContainer = document.querySelector('.testimonial-slider');
    if (sliderContainer) {
        sliderContainer.addEventListener('mouseenter', stopAutoSlide);
        sliderContainer.addEventListener('mouseleave', startAutoSlide);
    }

    // Initialize slider
    if (testimonials.length > 0) {
        updateSlider(0);
        startAutoSlide();
    }

    // Touch/swipe support for mobile
    let startX = 0;
    let endX = 0;

    testimonialTrack.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    });

    testimonialTrack.addEventListener('touchend', (e) => {
        endX = e.changedTouches[0].clientX;
        handleSwipe();
    });

    function handleSwipe() {
        const swipeThreshold = 50;
        const swipeDistance = startX - endX;

        if (Math.abs(swipeDistance) > swipeThreshold) {
            stopAutoSlide();
            if (swipeDistance > 0) {
                nextSlide(); // Swipe left - next slide
            } else {
                prevSlide(); // Swipe right - previous slide
            }
            startAutoSlide();
        }
    }

    // Benefits Carousel Logic (Mobile Only - Auto-play)
    function initBenefitsCarousel() {
        const benefitsTrack = document.querySelector('.benefits-track');
        const benefitCards = document.querySelectorAll('.benefit-card');
        const benefitsIndicators = document.querySelectorAll('.benefits-indicator');

        let currentBenefitSlide = 0;
        const totalBenefitSlides = benefitCards.length;
        let benefitsAutoSlideInterval;
        let benefitsEventListenersAdded = false;

        function updateBenefitsSlider(slideIndex) {
            if (!benefitsTrack) return;

            // Update track position
            const translateX = -(slideIndex * (100 / totalBenefitSlides));
            benefitsTrack.style.transform = `translateX(${translateX}%)`;

            // Update active states
            benefitCards.forEach((card, index) => {
                card.classList.toggle('active', index === slideIndex);
            });

            benefitsIndicators.forEach((indicator, index) => {
                indicator.classList.toggle('active', index === slideIndex);
            });

            currentBenefitSlide = slideIndex;
        }

        function nextBenefitSlide() {
            const nextIndex = (currentBenefitSlide + 1) % totalBenefitSlides;
            updateBenefitsSlider(nextIndex);
        }

        function startBenefitsAutoSlide() {
            benefitsAutoSlideInterval = setInterval(nextBenefitSlide, 4000); // Change slide every 4 seconds
        }

        function stopBenefitsAutoSlide() {
            clearInterval(benefitsAutoSlideInterval);
        }

        // Check if we're on mobile (768px or below)
        function isMobile() {
            return window.innerWidth <= 768;
        }

        // Add event listeners only once
        function addBenefitsEventListeners() {
            if (benefitsEventListenersAdded) return;

            // Indicator click events (pause auto-play temporarily)
            benefitsIndicators.forEach((indicator, index) => {
                indicator.addEventListener('click', () => {
                    console.log('Benefits indicator clicked:', index); // Debug log
                    stopBenefitsAutoSlide();
                    updateBenefitsSlider(index);
                    setTimeout(startBenefitsAutoSlide, 2000); // Restart auto-play after 2 seconds
                });
            });

            // Touch/swipe support for benefits carousel
            if (benefitsTrack) {
                let benefitsStartX = 0;
                let benefitsEndX = 0;

                benefitsTrack.addEventListener('touchstart', (e) => {
                    benefitsStartX = e.touches[0].clientX;
                    stopBenefitsAutoSlide(); // Pause auto-play on touch
                });

                benefitsTrack.addEventListener('touchend', (e) => {
                    benefitsEndX = e.changedTouches[0].clientX;
                    handleBenefitsSwipe();
                    setTimeout(startBenefitsAutoSlide, 2000); // Restart auto-play after 2 seconds
                });

                function handleBenefitsSwipe() {
                    const swipeThreshold = 50;
                    const swipeDistance = benefitsStartX - benefitsEndX;

                    if (Math.abs(swipeDistance) > swipeThreshold) {
                        if (swipeDistance > 0) {
                            nextBenefitSlide(); // Swipe left - next slide
                        } else {
                            const prevIndex = (currentBenefitSlide - 1 + totalBenefitSlides) % totalBenefitSlides;
                            updateBenefitsSlider(prevIndex); // Swipe right - previous slide
                        }
                    }
                }
            }

            // Pause auto-slide on hover
            const benefitsContainer = document.querySelector('.benefits-container');
            if (benefitsContainer) {
                benefitsContainer.addEventListener('mouseenter', stopBenefitsAutoSlide);
                benefitsContainer.addEventListener('mouseleave', startBenefitsAutoSlide);
            }

            benefitsEventListenersAdded = true;
        }

        // Initialize carousel only on mobile
        function checkAndInitCarousel() {
            if (isMobile() && benefitCards.length > 0) {
                console.log('Initializing benefits carousel for mobile'); // Debug log
                updateBenefitsSlider(0);
                addBenefitsEventListeners();
                startBenefitsAutoSlide();
            } else if (!isMobile()) {
                // Reset carousel state on desktop
                stopBenefitsAutoSlide();
                if (benefitsTrack) {
                    benefitsTrack.style.transform = '';
                }
                benefitCards.forEach(card => card.classList.remove('active'));
            }
        }

        // Initialize on page load
        checkAndInitCarousel();

        // Re-check on window resize
        window.addEventListener('resize', () => {
            checkAndInitCarousel();
        });
    }

    // Initialize benefits carousel
    initBenefitsCarousel();

    // You can add more JavaScript here for other interactive elements,
    // like dynamic content loading, animations, etc.
});