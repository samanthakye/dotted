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
    const slideshowToggle = document.getElementById('slideshowToggle'); // ADD THIS

    // --- 2. State and Configuration Variables ---
    let dots = [];
    let mouseX = 0;
    let mouseY = 0;
    
    let currentDotSize = parseInt(dotSizeInput.value);
    let currentDotColor = dotColorInput.value;
    let currentFollowSpeed = parseFloat(followSpeedInput.value);
    let currentNumDots = parseInt(numDotsInput.value);
    let isScattered = false; // Controls scatter/follow mode

    let isConnectMode = false; // Tracks if the connection game is active
    let connectedDots = [];    // Array to store the dots in the order they are connected
    const connectTolerance = 40; // Max distance (px) for a successful click/connection
    
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

        function getDistance(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
}
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

// Double Click (Toggle Scatter/Connect State)
    mainContent.addEventListener('dblclick', () => {
        
        if (!isScattered && !isConnectMode) {
            // State 1: FOLLOW -> SCATTER/CONNECT
            
            // SCATTER LOGIC (Keep existing scatter code)
            const fullWidth = window.innerWidth;
            const fullHeight = window.innerHeight;
            const sidebarWidth = 280; 

            dots.forEach(dot => {
                const minX = sidebarWidth;
                const maxX = fullWidth; 
                const randomX = Math.random() * (maxX - minX) + minX; 
                const randomY = Math.random() * fullHeight;

                dot.style.transition = 'left 0.5s ease-out, top 0.5s ease-out';
                dot.style.left = `${randomX - currentDotSize / 2}px`;
                dot.style.top = `${randomY - currentDotSize / 2}px`;
            });
            
            // Set new state
            isScattered = true;
            isConnectMode = true; // Enter the connection game mode
            connectedDots = []; // Reset the connection tracker
            
            // Add visual indication for Connect Mode (e.g., make dots glow)
            dots.forEach(dot => {
                dot.style.boxShadow = `0 0 10px 5px ${currentDotColor}`;
                dot.style.cursor = 'pointer'; // Indicate they are clickable
                dot.onclick = handleDotClick; // Attach click handler
            });

        } else if (isConnectMode) {
            // State 2: SCATTER/CONNECT -> FOLLOW (Manual Reset)

            resetConnectMode();
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
        stopSlideshow(); // Use the new function
        slideshowToggle.checked = false; // Uncheck the toggle
        
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


// --- 8. Initialization (Runs Once) ---

// Define the functions to control the slideshow
function startSlideshow() {
    // Only start if it's not already running and the toggle is checked
    if (slideshowToggle.checked) {
        // Clear any existing interval just to be safe
        clearInterval(backgroundInterval); 
        // Set initial background image and start rotation
        rotateBackground(); 
        backgroundInterval = setInterval(rotateBackground, 20000); 
    }
}

function stopSlideshow() {
    clearInterval(backgroundInterval);
}

preloadImages(backgroundImages);
initializeDots(currentNumDots);
animateDots();

// Initial call to start the slideshow if the checkbox is checked by default
startSlideshow();

function handleDotClick(e) {
    e.stopPropagation(); // Prevent dblclick from triggering again

    if (!isConnectMode) return;

    const clickedDot = e.target;
    const clickedIndex = dots.indexOf(clickedDot);

    // 1. First Connection
    if (connectedDots.length === 0) {
        // Any dot can be the starting point
        connectedDots.push(clickedDot);
        clickedDot.style.opacity = 0.5; // Visual feedback: connected
        
    } 
    // 2. Subsequent Connections
    else {
        const lastDot = connectedDots[connectedDots.length - 1];
        
        // Check if the current click is NOT the last connected dot (prevent double-click on the same dot)
        if (clickedDot === lastDot) return; 

        // Get coordinates of the last connected dot and the clicked dot
        const lastX = parseFloat(lastDot.style.left) + currentDotSize / 2;
        const lastY = parseFloat(lastDot.style.top) + currentDotSize / 2;
        const currentX = parseFloat(clickedDot.style.left) + currentDotSize / 2;
        const currentY = parseFloat(clickedDot.style.top) + currentDotSize / 2;
        
        // Check if the clicked dot is the *next in sequence* based on index
        // To enforce sequential connection:
        // const nextDotIndex = dots.indexOf(lastDot) + 1;
        // if (nextDotIndex === clickedIndex) { ... }
        
        // --- RELAXED CONNECTION LOGIC (Allows clicking any UNCONNECTED dot) ---
        if (!connectedDots.includes(clickedDot)) {
            connectedDots.push(clickedDot);
            clickedDot.style.opacity = 0.5; // Visual feedback: connected
            
            // ************ VISUAL LINE DRAWING (Basic Implementation) ************
            // You would need a library or SVG/Canvas to draw persistent lines.
            // For now, we'll just update the dots' appearance.
        }
    }
    
    // 3. Check for Completion
    if (connectedDots.length === dots.length) {
        // ALL dots are connected! Reset to follow mode.
        resetConnectMode(true);
    }
}

function resetConnectMode(success = false) {
    // 1. Clean up dot visuals
    dots.forEach(dot => {
        dot.style.boxShadow = 'none'; // Remove glow
        dot.style.cursor = 'default';
        dot.style.opacity = 1;       // Restore opacity
        dot.onclick = null;          // Remove click handler
    });
    
    // 2. Clear state
    isScattered = false;
    isConnectMode = false;
    connectedDots = [];
    
    // 3. Optional: Add a success message
    if (success) {
        console.log("Success! All dots connected. Reverting to Follow Mode.");
    }
}

}); // <-- CLOSES the DOMContentLoaded listener