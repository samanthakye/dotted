document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const dotSizeInput = document.getElementById('dotSize');
    const dotSizeValueSpan = document.getElementById('dotSizeValue');
    const dotColorInput = document.getElementById('dotColor');
    const followSpeedInput = document.getElementById('followSpeed');
    const followSpeedValueSpan = document.getElementById('followSpeedValue');
    const numDotsInput = document.getElementById('numDots');
    const numDotsValueSpan = document.getElementById('numDotsValue');

    let dots = [];
    let mouseX = 0;
    let mouseY = 0;
    
    let currentDotSize = parseInt(dotSizeInput.value);
    let currentDotColor = dotColorInput.value;
    let currentFollowSpeed = parseFloat(followSpeedInput.value);
    let currentNumDots = parseInt(numDotsInput.value) || 25; 

    function createDot() {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        dot.style.width = `${currentDotSize}px`;
        dot.style.height = `${currentDotSize}px`;
        dot.style.backgroundColor = currentDotColor;
        const rect = mainContent.getBoundingClientRect();
        dot.style.left = `${Math.random() * rect.width}px`;
        dot.style.top = `${Math.random() * rect.height}px`;
        mainContent.appendChild(dot);
        return dot;
    }

    function initializeDots(count) {
        dots.forEach(dot => dot.remove());
        dots = [];
        for (let i = 0; i < count; i++) {
            dots.push(createDot());
        }
    }

    function updateDotProperties() {
        dots.forEach(dot => {
            dot.style.width = `${currentDotSize}px`;
            dot.style.height = `${currentDotSize}px`;
            dot.style.backgroundColor = currentDotColor;
        });
    }

    function animateDots() {
        dots.forEach((dot, index) => {
            let targetX, targetY;

            if (index === 0) {
                targetX = mouseX;
                targetY = mouseY;
            } else {
                targetX = parseFloat(dots[index - 1].style.left) + currentDotSize / 2;
                targetY = parseFloat(dots[index - 1].style.top) + currentDotSize / 2;
            }

            const currentX = parseFloat(dot.style.left) + currentDotSize / 2;
            const currentY = parseFloat(dot.style.top) + currentDotSize / 2;

            const dx = targetX - currentX;
            const dy = targetY - currentY;

            dot.style.left = `${parseFloat(dot.style.left) + dx * currentFollowSpeed}px`;
            dot.style.top = `${parseFloat(dot.style.top) + dy * currentFollowSpeed}px`;
        });
        requestAnimationFrame(animateDots);
    }

    const mouseMoveHandler = (e) => {
        const rect = mainContent.getBoundingClientRect();
        mouseX = e.clientX - rect.left - currentDotSize / 2; 
        mouseY = e.clientY - rect.top - currentDotSize / 2;  
    };

    mainContent.addEventListener('mousemove', mouseMoveHandler);

    dotSizeInput.addEventListener('input', (e) => {
        currentDotSize = parseInt(e.target.value);
        dotSizeValueSpan.textContent = `${currentDotSize}px`;
        document.documentElement.style.setProperty('--dot-size', `${currentDotSize}px`);
        updateDotProperties();
    });

    dotColorInput.addEventListener('input', (e) => {
        currentDotColor = e.target.value;
        document.documentElement.style.setProperty('--dot-color', currentDotColor);
        updateDotProperties();
    });

    followSpeedInput.addEventListener('input', (e) => {
        currentFollowSpeed = parseFloat(e.target.value);
        followSpeedValueSpan.textContent = e.target.value;
    });

    numDotsInput.addEventListener('input', (e) => {
        currentNumDots = parseInt(e.target.value);
        numDotsValueSpan.textContent = currentNumDots;
        initializeDots(currentNumDots);
    });

    initializeDots(currentNumDots);
    animateDots();
});