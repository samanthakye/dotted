document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const sidebar = document.getElementById('sidebar');

    const dotSizeInput = document.getElementById('dotSize');
    const dotSizeValueSpan = document.getElementById('dotSizeValue');
    const dotColorInput = document.getElementById('dotColor');
    const followSpeedInput = document.getElementById('followSpeed');
    const followSpeedValueSpan = document.getElementById('followSpeedValue');
    const numDotsInput = document.getElementById('numDots');
    const numDotsValueSpan = document.getElementById('numDotsValue');
    const backgroundImageUpload = document.getElementById('backgroundImageUpload');
    const bgSelectors = document.querySelectorAll('.bg-selector');

    let dots = [];
    let mouseX = 0;
    let mouseY = 0;
    let currentDotSize = parseInt(dotSizeInput.value);
    let currentDotColor = dotColorInput.value;
    let currentFollowSpeed = parseFloat(followSpeedInput.value);
    let currentNumDots = parseInt(numDotsInput.value);
// ... other variables ...

const backgroundImages = [
    'fall.JPG', // Index 0
    'cat.JPG',  // Index 1
    'beach.jpeg', // Index 2
    'houses.jpg', // Index 3
    'kusama.JPG', // Index 4
    'museum.jpeg', // Index 5
    'park.jpg', // Index 6
    'sashimi.JPG', // Index 7
    'studio.JPG', // Index 8
    'trees.JPG', // Index 9
    'water.JPG' // Index 10
];

// CHANGE THIS LINE:
let currentBgIndex = -1; // <-- Change from 0 to -1

// ... rest of the code ...

    // --- Dot Management Functions ---
    function createDot() {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        dot.style.width = `${currentDotSize}px`;
        dot.style.height = `${currentDotSize}px`;
        dot.style.backgroundColor = currentDotColor;
        // Position dots initially off-screen or at a random point
        dot.style.left = `${Math.random() * mainContent.offsetWidth}px`;
        dot.style.top = `${Math.random() * mainContent.offsetHeight}px`;
        mainContent.appendChild(dot);
        return dot;
    }

    function initializeDots(count) {
        // Clear existing dots
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

    // --- Animation Loop ---
    function animateDots() {
        if (!mainContent.contains(sidebar)) { // Ensure sidebar is visible for calculations
            // Adjust mouseX/mouseY for sidebar offset if sidebar is always fixed
            // For now, assume mouseX/mouseY are relative to the entire document.
            // Dots are positioned relative to mainContent.
        }

        dots.forEach((dot, index) => {
            let targetX = mouseX;
            let targetY = mouseY;

            if (index > 0) {
                // Each dot follows the previous dot, creating the "line" effect
                targetX = parseFloat(dots[index - 1].style.left) + currentDotSize / 2; // Center of previous dot
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

    // --- Event Handlers ---
    mainContent.addEventListener('mousemove', (e) => {
        // Calculate mouse position relative to mainContent
        const rect = mainContent.getBoundingClientRect();
        mouseX = e.clientX - rect.left - currentDotSize / 2; // Adjust for dot center
        mouseY = e.clientY - rect.top - currentDotSize / 2; // Adjust for dot center
    });

// --- Event Handlers ---
    // ... (keep the mousemove handler above this) ...

    mainContent.addEventListener('dblclick', () => {
        // Get the full dimensions of the main container/window
        const fullWidth = window.innerWidth;
        const fullHeight = window.innerHeight;
        
        // The sidebar width is fixed at 280px (from style.css)
        const sidebarWidth = 280;

        dots.forEach(dot => {
            // Calculate random X position: start at the right edge of the sidebar (280px)
            // and end at the full window width.
            const minX = sidebarWidth;
            const maxX = fullWidth; 
            
            const randomX = Math.random() * (maxX - minX) + minX;
            const randomY = Math.random() * fullHeight;

            dot.style.transition = 'left 0.5s ease-out, top 0.5s ease-out'; // Smooth scatter
            dot.style.left = `${randomX - currentDotSize / 2}px`; // Adjust for dot center
            dot.style.top = `${randomY - currentDotSize / 2}px`;  // Adjust for dot center
        });
        
        // Remove transition after scatter to allow immediate following
        setTimeout(() => {
            dots.forEach(dot => {
                dot.style.transition = 'none';
            });
        }, 500);
    });

    // --- Sidebar Control Listeners ---
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

    backgroundImageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('container').style.backgroundImage = `url('${event.target.result}')`;
                document.documentElement.style.setProperty('--bg-image', `url('${event.target.result}')`);
            };
            reader.readAsDataURL(file);
        }
    });

    bgSelectors.forEach(button => {
        button.addEventListener('click', (e) => {
            const bgFileName = e.target.dataset.bg;
            // Assuming these images are in the same directory or accessible paths
            document.getElementById('container').style.backgroundImage = `url('${bgFileName}')`;
            document.documentElement.style.setProperty('--bg-image', `url('${bgFileName}')`);
            // Stop automatic rotation if a specific background is chosen
            clearInterval(backgroundInterval);
        });
    });

// --- Background Image Rotation ---
    function rotateBackground() {
        currentBgIndex = (currentBgIndex + 1) % backgroundImages.length; // <--- The index is incremented here!
        const imageUrl = backgroundImages[currentBgIndex];
        document.getElementById('container').style.backgroundImage = `url('${imageUrl}')`;
        document.documentElement.style.setProperty('--bg-image', `url('${imageUrl}')`);
    }

// Set initial background image
rotateBackground();
// Rotate every 20 seconds (20000ms)
const backgroundInterval = setInterval(rotateBackground, 20000); // Changed to 20000

    // --- Initialization ---
    initializeDots(currentNumDots);
    animateDots();
});