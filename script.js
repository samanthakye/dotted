document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Element Selectors ---
    const mainContent = document.getElementById('main-content');
    const dotSizeInput = document.getElementById('dotSize');
    const dotSizeValueSpan = document.getElementById('dotSizeValue');
    const dotColorInput = document.getElementById('dotColor');
    const followSpeedInput = document.getElementById('followSpeed');
    const followSpeedValueSpan = document.getElementById('followSpeedValue');
    const numDotsInput = document.getElementById('numDots');
    const numDotsValueSpan = document.getElementById('numDotsValue');
    const backgroundImageUpload = document.getElementById('backgroundImageUpload');
    const defaultBackgroundsSelect = document.getElementById('defaultBackgrounds'); // For dropdown

    // --- 2. State and Configuration Variables ---
    let dots = [];
    let mouseX = 0;
    let mouseY = 0;
    
    let currentDotSize = parseInt(dotSizeInput.value);
    let currentDotColor = dotColorInput.value;
    let currentFollowSpeed = parseFloat(followSpeedInput.value);
    let currentNumDots = parseInt(numDotsInput.value);
    let isScattered = false; // Controls scatter/follow mode
    
    // Custom Backgrounds Array (Ensure these filenames match your uploaded files exactly!)
    const backgroundImages = [
        'fall.jpg',
        'cat.jpg',
        'beach.jpeg',
        'houses.jpg',
        'kusama.jpg',
        'museum.jpeg',
        'park.jpg',
        'sashimi.jpg',
        'studio.jpg',
        'trees.jpg',
        'water.jpg'
    ];
    let currentBgIndex = -1; // Start at -1 so first rotateBackground lands on index 0
    let backgroundInterval; // Defined here to be accessible throughout

    // --- 3. Dot Management Functions ---
    function createDot() {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        dot.style.width = `${currentDotSize}px`;
        dot.style.height = `${currentDotSize}px`;
        dot.style.backgroundColor = currentDotColor;
        // Position dots initially randomly within the main content bounds
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

    // --- 4. Animation Loop ---
    function animateDots() {
        // Only run movement logic if the dots are NOT scattered
        if (!isScattered) { 
            dots.forEach((dot, index) => {
                let targetX = mouseX;
                let targetY = mouseY;

                if (index > 0) {
                    // Each dot follows the previous dot's center
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
        }
        
        requestAnimationFrame(animateDots);
    }
    
    // --- 5. Background Image Functions ---
    function preloadImages(imageArray) {
        imageArray.forEach((url) => {
            new Image().src = url; // Starts downloading the image
        });
    }

    function rotateBackground() {
        currentBgIndex = (currentBgIndex + 1) % backgroundImages.length;
        const imageUrl = backgroundImages[currentBgIndex];
        
        const container = document.getElementById('container');
        container.style.backgroundImage = `url('${imageUrl}')`;
        document.documentElement.style.setProperty('--bg-image', `url('${imageUrl}')`);
    }

    // --- 6. Event Handlers ---
    
    // Mouse Move (Only updates target coordinates if not scattered)
    mainContent.addEventListener('mousemove', (e) => {
        if (!isScattered) {
            const rect = mainContent.getBoundingClientRect();
            // Calculate mouse position relative to mainContent and center the dot
            mouseX = e.clientX - rect.left - currentDotSize / 2; 
            mouseY = e.clientY - rect.top - currentDotSize / 2;  
        }
    }); 

    // Double Click (Toggle Scatter/Follow State)
    mainContent.addEventListener('dblclick', () => {
        
        if (!isScattered) {
            // SCATTER LOGIC
            const fullWidth = window.innerWidth;
            const fullHeight = window.innerHeight;
            const sidebarWidth = 280; 

            dots.forEach(dot => {
                const minX = sidebarWidth;
                const maxX = fullWidth; 
                
                // Random position across the entire window area (excluding sidebar)
                const randomX = Math.random() * (maxX - minX) + minX; 
                const randomY = Math.random() * fullHeight;

                dot.style.transition = 'left 0.5s ease-out, top 0.5s ease-out';
                dot.style.left = `${randomX - currentDotSize / 2}px`;
                dot.style.top = `${randomY - currentDotSize / 2}px`;
            });
            
            isScattered = true;

        } else {
            // FOLLOW LOGIC
            
            dots.forEach(dot => {
                // Remove transition immediately so they snap back to following
                dot.style.transition = 'none';
            });
            
            isScattered = false;
        }
    });

    // --- 7. Sidebar Control Listeners ---
    
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
                // Stop rotation when custom file is uploaded
                clearInterval(backgroundInterval); 
                
                const container = document.getElementById('container');
                container.style.backgroundImage = `url('${event.target.result}')`;
                document.documentElement.style.setProperty('--bg-image', `url('${event.target.result}')`);
            };
            reader.readAsDataURL(file);
        }
    });

    defaultBackgroundsSelect.addEventListener('change', (e) => {
        const bgFileName = e.target.value; 

        if (bgFileName) {
            // Stop rotation when a specific background is chosen
            clearInterval(backgroundInterval);
            
            const container = document.getElementById('container');
            container.style.backgroundImage = `url('${bgFileName}')`;
            document.documentElement.style.setProperty('--bg-image', `url('${bgFileName}')`);
        }
    });


    // --- 8. Initialization (Runs Once) ---
    
    preloadImages(backgroundImages);
    initializeDots(currentNumDots);
    animateDots();

    // Set initial background image and start rotation
    rotateBackground();
    // Rotate every 20 seconds (20000ms)
    backgroundInterval = setInterval(rotateBackground, 20000); 

}); // <-- CLOSES the DOMContentLoaded listener