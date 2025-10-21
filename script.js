const DOT_COUNT = 25;
let dotConfig = {
    size: 25, // px
    color: '#000000', // Default dot color is black for contrast
    speedFactor: 0.15, // Interpolation factor (0.05=Slow, 0.4=Fast)
};

const canvas = document.getElementById('canvas');
const backgroundContainer = document.getElementById('background-container');
const settingsSidebar = document.getElementById('settings');
const bodyMain = document.getElementById('body-main');

// --- State Variables ---
let mousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let dotElements = [];
let dotPositions = [];
let dotVelocities = []; // Used for the scatter effect
let isScattered = false;
let isRotationPaused = false;
let rotationInterval;
let isMouseOverSidebar = false; // Flag to pause dot tracking

// Placeholder image URLs (using light/minimalist images now)
const backgroundImages = [
    '[https://images.unsplash.com/photo-1549490349-869273c528f9?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D](https://images.unsplash.com/photo-1549490349-869273c528f9?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)', // Soft colors
    '[https://images.unsplash.com/photo-1502691876148-26103d31aa67?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D](https://images.unsplash.com/photo-1502691876148-26103d31aa67?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)', // Abstract, light
    '[https://images.unsplash.com/photo-1534796636680-fe6f25459345?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D](https://images.unsplash.com/photo-1534796636680-fe6f25459345?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)', // Clean architecture
    '[https://images.unsplash.com/photo-1577701763782-f383e5860d5c?q=80&w=1858&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D](https://images.unsplash.com/photo-1577701763782-f383e5860d5c?q=80&w=1858&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)', // Muted colors/minimal
];
let currentImageIndex = 0;


// --- Utility Functions ---

// Custom Message Box function
function showMessage(text) {
    const msgBox = document.getElementById('message-box');
    msgBox.textContent = text;
    msgBox.style.opacity = '1';
    setTimeout(() => {
        msgBox.style.opacity = '0';
    }, 2500);
}

function createDot(index) {
    const dot = document.createElement('div');
    dot.className = 'dot';
    // Scale down the opacity and size for trailing dots for a depth effect
    const scaleFactor = 1 - (index / DOT_COUNT) * 0.4;
    dot.style.opacity = scaleFactor;
    dot.style.setProperty('--size', `${dotConfig.size * scaleFactor}px`);
    dot.style.setProperty('--color', dotConfig.color);
    dot.style.setProperty('z-index', 100 - index);

    canvas.appendChild(dot);
    dotElements.push(dot);

    // Initialize position and velocity
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight / 2;
    dotPositions.push({ x: startX, y: startY });
    dotVelocities.push({ dx: (Math.random() - 0.5) * 5, dy: (Math.random() - 0.5) * 5 });
}

function updateDotStyles() {
    dotElements.forEach((dot, index) => {
        const scaleFactor = 1 - (index / DOT_COUNT) * 0.4;
        dot.style.setProperty('--size', `${dotConfig.size * scaleFactor}px`);
        dot.style.setProperty('--color', dotConfig.color);
    });
}


// --- Animation Logic ---

function animate() {
    let targetPos;

    for (let i = 0; i < DOT_COUNT; i++) {
        const dot = dotElements[i];
        let pos = dotPositions[i];
        let velocity = dotVelocities[i];

        if (isScattered) {
            // SCATTER MODE: Apply velocity and boundary checks
            pos.x += velocity.dx;
            pos.y += velocity.dy;

            // Bounce off walls
            if (pos.x < 0 || pos.x > window.innerWidth) { velocity.dx *= -1; pos.x = Math.max(0, Math.min(window.innerWidth, pos.x)); }
            if (pos.y < 0 || pos.y > window.innerHeight) { velocity.dy *= -1; pos.y = Math.max(0, Math.min(window.innerHeight, pos.y)); }

        } else {
            // FOLLOW MODE: Calculate target position
            
            // If the mouse is over the sidebar, the target remains the last known position (pos).
            targetPos = isMouseOverSidebar ? pos : (i === 0 ? mousePos : dotPositions[i - 1]);


            // Linear Interpolation (Lerp) for smooth following/speed control
            pos.x += (targetPos.x - pos.x) * dotConfig.speedFactor;
            pos.y += (targetPos.y - pos.y) * dotConfig.speedFactor;
        }

        // Apply position to DOM element
        dot.style.transform = `translate(${pos.x}px, ${pos.y}px) scaleX(${1 - (i / DOT_COUNT) * 0.4})`;
    }

    requestAnimationFrame(animate);
}


// --- Background Logic ---

function updateBackground() {
    if (isRotationPaused) return;

    const nextImageUrl = backgroundImages[currentImageIndex];

    // Preload image to prevent flicker
    const img = new Image();
    img.onload = () => {
        backgroundContainer.style.backgroundImage = `url('${nextImageUrl}')`;
    };
    img.onerror = () => {
        console.error('Failed to load background image:', nextImageUrl);
    };
    img.src = nextImageUrl;


    currentImageIndex = (currentImageIndex + 1) % backgroundImages.length;
}

function startBackgroundRotation() {
    if (rotationInterval) clearInterval(rotationInterval);
    updateBackground(); // Set initial image
    rotationInterval = setInterval(updateBackground, 10000); // Change image every 10 seconds
}

// --- Event Listeners ---

// 1. Mouse Movement
window.addEventListener('mousemove', (e) => {
    // ONLY update mousePos if the cursor is NOT over the sidebar
    if (isMouseOverSidebar) return; 
    mousePos = { x: e.clientX, y: e.clientY };
});

// 2. Sidebar interaction listeners (Pause dot tracking when over controls)
settingsSidebar.addEventListener('mouseenter', () => {
    isMouseOverSidebar = true;
});

settingsSidebar.addEventListener('mouseleave', () => {
    isMouseOverSidebar = false;
});


// 3. Double Click (Scatter/Gather)
canvas.addEventListener('dblclick', () => {
    isScattered = !isScattered;
    const message = isScattered ? 'Scatter Mode Activated!' : 'Follow Mode Activated!';
    showMessage(message);
});

// 4. Settings Control Handlers
document.getElementById('dot-size').addEventListener('input', (e) => {
    dotConfig.size = parseInt(e.target.value);
    document.getElementById('size-value').textContent = `${dotConfig.size}px`;
    updateDotStyles();
});

document.getElementById('dot-color').addEventListener('input', (e) => {
    dotConfig.color = e.target.value;
    updateDotStyles();
});

document.getElementById('dot-speed').addEventListener('input', (e) => {
    // Convert range value (5-40) to a more usable factor (0.05-0.4)
    dotConfig.speedFactor = parseInt(e.target.value) / 100;
    document.getElementById('speed-value').textContent = dotConfig.speedFactor.toFixed(2);
});

// 5. Background Rotation Toggle
document.getElementById('toggle-rotation').addEventListener('click', () => {
    isRotationPaused = !isRotationPaused;
    const button = document.getElementById('toggle-rotation');
    if (isRotationPaused) {
        clearInterval(rotationInterval);
        button.textContent = 'Resume Rotation';
        button.classList.remove('bg-green-500', 'hover:bg-green-600');
        button.classList.add('bg-red-500', 'hover:bg-red-600');
        showMessage('Background Rotation Paused.');
    } else {
        startBackgroundRotation();
        button.textContent = 'Pause Rotation';
        button.classList.remove('bg-red-500', 'hover:bg-red-600');
        button.classList.add('bg-green-500', 'hover:bg-green-600');
        showMessage('Background Rotation Resumed.');
    }
});


// 6. Image Upload Handler
document.getElementById('image-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            // Set the custom background immediately
            backgroundContainer.style.backgroundImage = `url('${event.target.result}')`;
            
            // Stop the rotation and update the toggle button state
            if (!isRotationPaused) {
                isRotationPaused = true;
                clearInterval(rotationInterval);
                const button = document.getElementById('toggle-rotation');
                button.textContent = 'Resume Rotation';
                button.classList.remove('bg-green-500', 'hover:bg-green-600');
                button.classList.add('bg-red-500', 'hover:bg-red-600');
            }
            showMessage('Custom image uploaded successfully!');
        };
        reader.readAsDataURL(file);
    }
});

// 7. Initial Setup and Start
window.onload = function() {
    // Initialize dots
    for (let i = 0; i < DOT_COUNT; i++) {
        createDot(i);
    }

    // Start animation and background rotation
    animate();
    startBackgroundRotation();
};
