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
    const dotConnectionsSVG = document.getElementById('dot-connections-svg');

    // --- 2. State and Configuration Variables ---
    let dots = [];
    let mouseX = 0;
    let mouseY = 0;
    
    let currentDotSize = parseInt(dotSizeInput.value);
    let currentDotColor = dotColorInput.value;
    let currentFollowSpeed = parseFloat(followSpeedInput.value);
    let currentNumDots = parseInt(numDotsInput.value);
    
    let isScattered = false;      
    let isConnectMode = false;    
    let connectedDots = [];       
    
    // NEW: Graph connection state variables
    let activeConnection = null;  // Stores the first dot clicked in a pair: { dot: element, index: number }
    let dotConnections = {};      // Stores the connections: { dotIndex: [connectedDot1Index, ...] }
    
    // Animation/Transition Variables
    const floatIntensity = 0.005; 
    const maxFloatDistance = 5;   
    const scatterTransition = 'all 0.5s ease-out';
    
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
    
    function drawConnectionLines() {
        dotConnectionsSVG.innerHTML = ''; 

        const linesDrawn = new Set(); 

        dots.forEach((dot, index) => {
            const connectedArray = dotConnections[index] || [];
            
            connectedArray.forEach(connectedIndex => {
                const partnerDot = dots[connectedIndex];
                
                // Create a unique key (e.g., "1-5") to prevent drawing the line twice
                const key = Math.min(index, connectedIndex) + '-' + Math.max(index, connectedIndex);

                if (!linesDrawn.has(key)) {
                    
                    const x1 = parseFloat(dot.style.left) + currentDotSize / 2;
                    const y1 = parseFloat(dot.style.top) + currentDotSize / 2;
                    const x2 = parseFloat(partnerDot.style.left) + currentDotSize / 2;
                    const y2 = parseFloat(partnerDot.style.top) + currentDotSize / 2;

                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', x1);
                    line.setAttribute('y1', y1);
                    line.setAttribute('x2', x2);
                    line.setAttribute('y2', y2);
                    line.setAttribute('stroke', currentDotColor); 
                    line.setAttribute('stroke-width', 2);
                    line.setAttribute('stroke-linecap', 'round');
                    line.setAttribute('stroke-dasharray', '5, 5'); 

                    dotConnectionsSVG.appendChild(line);
                    linesDrawn.add(key);
                }
            });
        });
    }

    function checkConnectionCompletion() {
        let allConnected = true;
        // Check if every dot has at least one entry in the connections map
        for (let i = 0; i < dots.length; i++) {
            if (!dotConnections[i] || dotConnections[i].length === 0) {
                allConnected = false;
                break;
            }
        }

        if (allConnected) {
            resetConnectMode(true);
        }
    }

    function isDotEligible(dot) {
        // In the free-form graph mode, any unconnected dot can be the second click
        return true; 
    }

    function handleDotClick(e) {
        e.stopPropagation(); 
        if (!isConnectMode) return;

        const clickedDot = e.currentTarget; 
        const clickedIndex = dots.indexOf(clickedDot);

        // --- State 1: No active connection (First click in a pair) ---
        if (activeConnection === null) {
            
            activeConnection = { dot: clickedDot, index: clickedIndex };
            clickedDot.style.boxShadow = '0 0 10px 5px #FFD700'; // Highlight first dot as GOLD
            
        } 
        // --- State 2: Active connection (Second click in a pair) ---
        else {
            const firstDot = activeConnection.dot;
            const firstIndex = activeConnection.index;

            // 1. Cannot connect a dot to itself
            if (clickedDot === firstDot) {
                firstDot.style.boxShadow = `0 0 10px 5px ${currentDotColor}`;
                activeConnection = null;
                return;
            }

            // 2. Add connection to the structure
            dotConnections[firstIndex] = dotConnections[firstIndex] || [];
            dotConnections[clickedIndex] = dotConnections[clickedIndex] || [];

            // Add connection (if it doesn't exist)
            if (!dotConnections[firstIndex].includes(clickedIndex)) {
                dotConnections[firstIndex].push(clickedIndex);
                dotConnections[clickedIndex].push(firstIndex);
            }
            
            // 3. Update visuals and state
            drawConnectionLines();
            
            firstDot.style.boxShadow = `0 0 10px 5px ${currentDotColor}`; // Reset first dot color
            activeConnection = null; // Clear active connection

            // 4. Check for Completion
            checkConnectionCompletion();
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
            
            dot.style.transform = 'none'; // Remove GPU acceleration
        });
        
        isScattered = false;
        isConnectMode = false;
        
        // NEW: Reset connection specific variables
        activeConnection = null; 
        dotConnections = {};
        
        dotConnectionsSVG.innerHTML = ''; // CLEAR THE SVG LINES

        if (success) {
            console.log("SUCCESS! All dots connected. Reverting to Follow Mode.");
        }
    }

    // --- 7. Event Handlers ---
    
    mainContent.addEventListener('mousemove', (e) => {
        if (!isScattered) {
            const rect = mainContent.getBoundingClientRect();
            mouseX = e.clientX - rect.left - currentDotSize / 2; 
            mouseY = e.clientY - rect.top - currentDotSize / 2;  
        }
    }); 

    // Double Click (Toggle Scatter/Connect State)
    mainContent.addEventListener('dblclick', (e) => {
        if (e.target.classList.contains('dot')) {
            return; 
        }
        
        if (!isScattered && !isConnectMode) {
            // State 1: FOLLOW -> SCATTER/CONNECT (Smooth Scatter Out)
            
            const fullWidth = window.innerWidth;
            const fullHeight = window.innerHeight;
            const sidebarWidth = 280; 

            dots.forEach(dot => {
                dot.style.transition = scatterTransition; 

                const minX = sidebarWidth;
                const maxX = fullWidth; 
                const randomX = Math.random() * (maxX - minX) + minX; 
                const randomY = Math.random() * fullHeight;

                dot.style.left = `${randomX - currentDotSize / 2}px`;
                dot.style.top = `${randomY - currentDotSize / 2}px`;

                dot.style.transform = 'translateZ(0)';
            });
            
            // Set new state
            isScattered = true;
            isConnectMode = true; 
            
            // Clear any lingering connection state
            activeConnection = null;
            dotConnections = {}; 
            
            dots.forEach(dot => {
                dot.style.boxShadow = `0 0 10px 5px ${currentDotColor}`;
                dot.style.cursor = 'pointer'; 
                dot.addEventListener('click', handleDotClick); 
            });

            // REMOVE transition after it completes (0.5s) to enable smooth floating
            setTimeout(() => {
                dots.forEach(dot => {
                    dot.style.transition = 'none';
                });
            }, 500);

        } else if (isConnectMode) {
            // State 2: SCATTER/CONNECT -> FOLLOW (Manual Double-Click Reset)

            dots.forEach(dot => {
                dot.style.transition = scatterTransition;
            });
            
            resetConnectMode(false); 

            // REMOVE transition after it completes (0.5s)
            setTimeout(() => {
                dots.forEach(dot => {
                    dot.style.transition = 'none';
                });
            }, 500);
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