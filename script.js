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
    const defaultBackgroundsSelect = document.getElementById('defaultBackgrounds');
    const slideshowToggle = document.getElementById('slideshowToggle');

    // --- 2. State and Configuration Variables ---
    let dots = [];
    let mouseX = 0;
    let mouseY = 0;
    
    let currentDotSize = parseInt(dotSizeInput.value);
    let currentDotColor = dotColorInput.value;
    let currentFollowSpeed = parseFloat(followSpeedInput.value);
    let currentNumDots = parseInt(numDotsInput.value);
    
    let isScattered = false;      // Controls scatter/follow mode (and floating)
    let isConnectMode = false;    // Tracks if the connection game is active
    let connectedDots = [];       // Array to store the dots in the order they are connected
    
    // Floating Dot Variables
    const floatIntensity = 0.005; 
    const maxFloatDistance = 5;   
    
    // Background Variables
    const backgroundImages = [
        'fall.jpg', 'cat.jpg', 'beach.jpeg', 'houses.jpg', 
        'kusama.jpg', 'museum.jpeg', 'park.jpg', 'sashimi.jpg', 
        'studio.jpg', 'trees.jpg', 'water.jpg'
    ];
    let currentBgIndex = -1; 
    let backgroundInterval; 

    // --- 3. Dot Management Functions ---
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

    // --- 4. Animation Loop ---
    function animateDots() {
        
        if (!isScattered) { 
            // FOLLOW MODE LOGIC 
            dots.forEach((dot, index) => {
                let targetX = mouseX;
                let targetY = mouseY;

                if (index > 0) {
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
            
        } else {
            // SCATTER/FLOAT MODE LOGIC 
            const time = Date.now() * floatIntensity;

            dots.forEach((dot, index) => {
                let currentX = parseFloat(dot.style.left);
                let currentY = parseFloat(dot.style.top);

                const floatX = Math.sin(time + index) * maxFloatDistance;
                const floatY = Math.cos(time + index) * maxFloatDistance;
                
                // Apply the floating nudge
                dot.style.left = `${currentX + floatX * 0.01}px`; 
                dot.style.top = `${currentY + floatY * 0.01}px`;
            });
        }
        
        requestAnimationFrame(animateDots);
    }
    
    // --- 5. Background Image Functions ---
    
    function startSlideshow() {
        if (slideshowToggle.checked) {
            clearInterval(backgroundInterval); 
            rotateBackground(); 
            backgroundInterval = setInterval(rotateBackground, 20000); 
        }
    }

    function stopSlideshow() {
        clearInterval(backgroundInterval);
    }

    function preloadImages(imageArray) {
        imageArray.forEach((url) => {
            new Image().src = url; 
        });
    }

    function rotateBackground() {
        currentBgIndex = (currentBgIndex + 1) % backgroundImages.length;
        const imageUrl = backgroundImages[currentBgIndex];
        
        const container = document.getElementById('container');
        container.style.backgroundImage = `url('${imageUrl}')`;
        document.documentElement.style.setProperty('--bg-image', `url('${imageUrl}')`);
    }

    // --- 6. Connect-The-Dots Logic ---
    
    function isDotEligible(dot) {
        return !connectedDots.includes(dot); 
    }

    function handleDotClick(e) {
        e.stopPropagation(); 

        if (!isConnectMode) return;

        const clickedDot = e.currentTarget; 
        
        if (connectedDots.includes(clickedDot)) {
            return; 
        }

        if (connectedDots.length === 0 || isDotEligible(clickedDot)) {
            
            connectedDots.push(clickedDot);
            
            // Visual Feedback
            clickedDot.style.opacity = 0.5; 
            clickedDot.style.backgroundColor = '#FF6347'; 

            // Check for Completion
            if (connectedDots.length === dots.length) {
                resetConnectMode(true);
            }
        }
    }

    function resetConnectMode(success = false) {
        dots.forEach(dot => {
            // Reset transforms and visuals
            dot.style.boxShadow = 'none'; 
            dot.style.cursor = 'default';
            dot.style.opacity = 1;       
            dot.style.backgroundColor = currentDotColor; 
            dot.removeEventListener('click', handleDotClick); 
            
            // REMOVE GPU acceleration property
            dot.style.transform = 'none'; 
        });
        
        isScattered = false;
        isConnectMode = false;
        connectedDots = [];
        
        if (success) {
            console.log("SUCCESS! All dots connected. Reverting to Follow Mode.");
        }
    }

    // --- 7. Event Handlers ---
    
    // Mouse Move (Only updates target coordinates if not scattered)
    mainContent.addEventListener('mousemove', (e) => {
        if (!isScattered) {
            const rect = mainContent.getBoundingClientRect();
            mouseX = e.clientX - rect.left - currentDotSize / 2; 
            mouseY = e.clientY - rect.top - currentDotSize / 2;  
        }
    }); 

    // Double Click (Toggle Scatter/Connect State)
    mainContent.addEventListener('dblclick', (e) => {
        // Prevent double-click reset if user is clicking a dot
        if (e.target.classList.contains('dot')) {
            return; 
        }
        
        if (!isScattered && !isConnectMode) {
            // State 1: FOLLOW -> SCATTER/CONNECT
            
            // SCATTER LOGIC
            const fullWidth = window.innerWidth;
            const fullHeight = window.innerHeight;
            const sidebarWidth = 280; 

            dots.forEach(dot => {
                const minX = sidebarWidth;
                const maxX = fullWidth; 
                const randomX = Math.random() * (maxX - minX) + minX; 
                const randomY = Math.random() * fullHeight;

                dot.style.transition = 'none';
                dot.style.left = `${randomX - currentDotSize / 2}px`;
                dot.style.top = `${randomY - currentDotSize / 2}px`;

                // ADDED FIX: Force GPU acceleration for sharp floating dots
                dot.style.transform = 'translateZ(0)';
            });
            
            // Set new state
            isScattered = true;
            isConnectMode = true; 
            connectedDots = []; 
            
            // Add visual indication for Connect Mode 
            dots.forEach(dot => {
                dot.style.boxShadow = `0 0 10px 5px ${currentDotColor}`;
                dot.style.cursor = 'pointer'; 
                dot.addEventListener('click', handleDotClick); 
            });

        } else if (isConnectMode) {
            // State 2: SCATTER/CONNECT -> FOLLOW (Manual Double-Click Reset)
            resetConnectMode(false); 
        }
    });

    // --- 8. Sidebar Control Listeners ---
    
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
                stopSlideshow(); 
                slideshowToggle.checked = false;

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
            stopSlideshow();
            slideshowToggle.checked = false;
            
            const container = document.getElementById('container');
            container.style.backgroundImage = `url('${bgFileName}')`;
            document.documentElement.style.setProperty('--bg-image', `url('${bgFileName}')`);
        }
    });
    
    slideshowToggle.addEventListener('change', () => {
        if (slideshowToggle.checked) {
            startSlideshow();
        } else {
            stopSlideshow();
        }
    });


    // --- 9. Initialization (Runs Once) ---

    preloadImages(backgroundImages);
    initializeDots(currentNumDots);
    animateDots();
    startSlideshow(); 

});