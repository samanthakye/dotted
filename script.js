document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Element Selectors ---
    const mainContent = document.getElementById('main-content');
    const dotSizeInput = document.getElementById('dotSize');
    const dotSizeValueSpan = document.getElementById('dotSizeValue');
    const dotColorInput = document.getElementById('dotColor');
    const lineColorInput = document.getElementById('lineColor');
    const followSpeedInput = document.getElementById('followSpeed');
    const followSpeedValueSpan = document.getElementById('followSpeedValue');
    const numDotsInput = document.getElementById('numDots');
    const numDotsValueSpan = document.getElementById('numDotsValue');
    const lineThicknessInput = document.getElementById('lineThickness');
    const lineThicknessValueSpan = document.getElementById('lineThicknessValue');
    const backgroundImageUpload = document.getElementById('backgroundImageUpload');
    const defaultBackgroundsSelect = document.getElementById('defaultBackgrounds');
    const slideshowToggle = document.getElementById('slideshowToggle');
    // Renamed selector:
    const snapshotButton = document.getElementById('snapshot-btn'); 
    const cameraToggleButton = document.getElementById('cameraToggleButton');
    const webcamFeed = document.getElementById('webcamFeed');
    const handCanvas = document.getElementById('handCanvas');
    const handCtx = handCanvas.getContext('2d');

    let model = null;
    let isCameraMode = false;
    let handAnimationRequest = null;
    let dotAnimationFrameRequest = null;

    // --- 2. State and Configuration Variables ---
    let dots = [];
    let mouseX = 0;
    let mouseY = 0;
    
    let currentDotSize = parseInt(dotSizeInput.value);
    let currentDotColor = dotColorInput.value;
    let currentLineColor = lineColorInput.value;
    let currentFollowSpeed = parseFloat(followSpeedInput.value);
    let currentNumDots = parseInt(numDotsInput.value) || 25; 
    let currentLineThickness = parseFloat(lineThicknessInput.value);
    
    let isScattered = false;      
    let isConnectMode = false;    
    
    let activeConnection = null;  
    let dotConnections = {};      
    
    const floatIntensity = 0.005; 
    const maxFloatDistance = 5;   
    const scatterTransition = 'all 0.5s ease-out';
    
    const backgroundImages = [
        'fall.jpg', 'cat.jpg', 'beach.jpeg', 'houses.jpg', 
        'kusama.jpg', 'museum.jpeg', 'park.jpg', 'sashimi.jpg', 
        'studio.jpg', 'trees.jpg', 'water.jpg'
    ];
    let currentBgIndex = -1; 
    let backgroundInterval; 

    // --- 3. Dot Management Functions ---
    function createDot() {
        console.log('Creating a dot...');
        const dot = document.createElement('div');
        dot.classList.add('dot');
        dot.style.width = `${currentDotSize}px`;
        dot.style.height = `${currentDotSize}px`;
        dot.style.backgroundColor = currentDotColor;
        const rect = mainContent.getBoundingClientRect();
        dot.style.left = `${Math.random() * rect.width}px`;
        dot.style.top = `${Math.random() * rect.height}px`;
        mainContent.appendChild(dot);
        console.log('Dot created:', dot);
        return dot;
    }

    function initializeDots(count) {
        console.log('Initializing dots with count:', count);
        dots.forEach(dot => dot.remove());
        dots = [];
        for (let i = 0; i < count; i++) {
            dots.push(createDot());
        }
        console.log('Dots initialized:', dots);
    }

    function updateDotProperties() {
        dots.forEach(dot => {
            dot.style.width = `${currentDotSize}px`;
            dot.style.height = `${currentDotSize}px`;
            dot.style.backgroundColor = currentDotColor;
        });
    }

    async function setupCamera() {
        console.log('setupCamera called.');
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error('Webcam API not available');
            throw new Error('Webcam API not available');
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamFeed.srcObject = stream;
        console.log('Webcam stream set.');

        return new Promise((resolve) => {
            webcamFeed.onloadedmetadata = () => {
                webcamFeed.width = webcamFeed.videoWidth;
                webcamFeed.height = webcamFeed.videoHeight;
                handCanvas.width = webcamFeed.videoWidth;
                handCanvas.height = webcamFeed.videoHeight;
                console.log('Webcam metadata loaded, canvas sized.');
                resolve(webcamFeed);
            };
        });
    }

    async function animateHand() {
        console.log('animateHand running...');
        if (!isCameraMode || !model || isConnectMode) return;

        const predictions = await model.estimateHands(webcamFeed);
        handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);

        if (predictions.length > 0) {
            const keypoints = predictions[0].landmarks;
            const pointerFingerTip = keypoints[8]; // Index Finger Tip

            if (isOpenHand(keypoints)) {
                if (!isScattered) {
                    isScattered = true;
                    // Trigger scattering animation
                    const fullWidth = window.innerWidth;
                    const fullHeight = window.innerHeight;

                    dots.forEach(dot => {
                        dot.style.transition = scatterTransition;
                        const randomX = Math.random() * fullWidth;
                        const randomY = Math.random() * fullHeight;
                        dot.style.left = `${randomX - currentDotSize / 2}px`;
                        dot.style.top = `${randomY - currentDotSize / 2}px`;
                        dot.style.transform = 'translateZ(0)';
                    });
                    setTimeout(() => {
                        dots.forEach(dot => {
                            dot.style.transition = 'none';
                        });
                    }, 500);
                }
            } else {
                if (isScattered) {
                    isScattered = false;
                    // Revert to following behavior (or stop scattering)
                    dots.forEach(dot => {
                        dot.style.transition = scatterTransition;
                    });
                    setTimeout(() => {
                        dots.forEach(dot => {
                            dot.style.transition = 'none';
                        });
                    }, 500);
                }
                // Only follow finger if not scattered
                if (dots[0]) {
                    // Invert the X-coordinate for mirrored movement
                    const mirroredX = webcamFeed.videoWidth - pointerFingerTip[0];
                    dots[0].style.left = `${mirroredX - currentDotSize / 2}px`;
                    dots[0].style.top = `${pointerFingerTip[1] - currentDotSize / 2}px`;
                }
            }
        }
        handAnimationRequest = requestAnimationFrame(animateHand);
    }

    function isOpenHand(keypoints) {
        // Keypoints for finger tips and palm base
        const thumbTip = keypoints[4];
        const indexTip = keypoints[8];
        const middleTip = keypoints[12];
        const ringTip = keypoints[16];
        const pinkyTip = keypoints[20];
        const palmBase = keypoints[0];

        // Calculate distances from palm base to finger tips
        const dist = (p1, p2) => Math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2);

        const thumbDist = dist(palmBase, thumbTip);
        const indexDist = dist(palmBase, indexTip);
        const middleDist = dist(palmBase, middleTip);
        const ringDist = dist(palmBase, ringTip);
        const pinkyDist = dist(palmBase, pinkyTip);

        // Define thresholds for an "open" hand. These values might need adjustment.
        const openThreshold = 100; // Example value, depends on camera distance and hand size

        // Check if all fingers are extended (distance from palm is large enough)
        const allFingersExtended = 
            thumbDist > openThreshold &&
            indexDist > openThreshold &&
            middleDist > openThreshold &&
            ringDist > openThreshold &&
            pinkyDist > openThreshold;

        // Additionally, check angles or relative positions to ensure they are spread out
        // This is a simplified check, more robust detection would involve angles between fingers
        const fingersSpread = 
            indexTip[0] < middleTip[0] && // Index left of middle
            middleTip[0] < ringTip[0] &&  // Middle left of ring
            ringTip[0] < pinkyTip[0];     // Ring left of pinky

        return allFingersExtended && fingersSpread;
    }


    // --- 4. Animation Loop ---
    function animateDots() {
        console.log('animateDots running...');
        if (isConnectMode || isCameraMode) {
            requestAnimationFrame(animateDots);
            return;
        }
        
        if (!isScattered) { 
            dots.forEach((dot, index) => {
                let targetX, targetY;

                if (index === 0) {
                    // First dot follows mouse or finger (via mouseX, mouseY)
                    targetX = mouseX;
                    targetY = mouseY;
                } else {
                    // Subsequent dots follow the previous dot
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
        
        dotAnimationFrameRequest = requestAnimationFrame(animateDots);
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
                const svgElement = document.getElementById('dot-connections-svg');
                if (!svgElement) {
                    console.log('SVG element not found');
                    return;
                }
        
                svgElement.innerHTML = ''; 
                console.log('drawConnectionLines called, SVG cleared. Current dotConnections:', dotConnections);
        
                const linesDrawn = new Set(); 
        
                dots.forEach((dot, index) => {
                    const connectedArray = dotConnections[index] || [];
                    
                    connectedArray.forEach(connectedIndex => {
                        const partnerDot = dots[connectedIndex];
                        
                        const key = Math.min(index, connectedIndex) + '-' + Math.max(index, connectedIndex);
        
                        if (!linesDrawn.has(key)) {
                            console.log('Attempting to draw line between dot', index, 'and dot', connectedIndex);
                            
                            const x1 = parseFloat(dot.style.left) + currentDotSize / 2;
                            const y1 = parseFloat(dot.style.top) + currentDotSize / 2;
                            const x2 = parseFloat(partnerDot.style.left) + currentDotSize / 2;
                            const y2 = parseFloat(partnerDot.style.top) + currentDotSize / 2;
        
                            console.log(`Line coordinates: (${x1}, ${y1}) to (${x2}, ${y2})`);
        
                            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                            line.setAttribute('x1', x1);
                            line.setAttribute('y1', y1);
                            line.setAttribute('x2', x2);
                            line.setAttribute('y2', y2);
                            
                                                                                        line.setAttribute('stroke', currentLineColor); 
                            
                                                                                        
                            
                                                                                        line.setAttribute('stroke-width', currentLineThickness);
                            
                                                                                        line.setAttribute('stroke-linecap', 'round');                            line.setAttribute('stroke-dasharray', '5, 5'); 
        
                            svgElement.appendChild(line);
                            linesDrawn.add(key);
                            console.log('Line element created:', line);
                        }
                    });
                });
            }
        
            function checkConnectionCompletion() {
                let allConnected = true;
                for (let i = 0; i < dots.length; i++) {
                    if (!dotConnections[i] || dotConnections[i].length === 0) {
                        allConnected = false;
                        break;
                    }
                }
        
                if (allConnected) {
                    console.log("All dots connected!");
                    resetConnectMode(true);
                }
            }
        
            function isDotEligible(dot) {
                return true; 
            }
        
            function handleDotClick(e) {
                e.stopPropagation(); 
                console.log('Dot clicked', e.currentTarget);
                if (!isConnectMode) {
                    console.log('Not in connect mode, ignoring dot click');
                    return;
                }
        
                const clickedDot = e.currentTarget; 
                        const clickedIndex = dots.indexOf(clickedDot);
                        console.log('Clicked dot index:', clickedIndex);
                
                        if (activeConnection === null) {
                            console.log('First dot clicked for connection. Storing:', { dot: clickedDot, index: clickedIndex });
                                                                            activeConnection = { dot: clickedDot, index: clickedIndex };
                                                                            clickedDot.style.boxShadow = '0 0 10px 5px #FFFF99'; // Highlight first dot with paler yellow
                                                                            
                                                                        } else {
                                                                            console.log('Second dot clicked for connection.');
                                                                            const firstDot = activeConnection.dot;
                                                                            const firstIndex = activeConnection.index;
                                                                
                                                                            if (clickedDot === firstDot) {
                                                                                console.log('Clicked same dot, deselecting');
                                                                                firstDot.style.boxShadow = `0 0 10px 5px ${currentDotColor}`;
                                                                                activeConnection = null;
                                                                                return;
                                                                            }
                                                                
                                                                            console.log('dotConnections before update:', dotConnections);
                                                                            dotConnections[firstIndex] = dotConnections[firstIndex] || [];
                                                                            dotConnections[clickedIndex] = dotConnections[clickedIndex] || [];
                                                                
                                                                            if (!dotConnections[firstIndex].includes(clickedIndex)) {
                                                                                dotConnections[firstIndex].push(clickedIndex);
                                                                                dotConnections[clickedIndex].push(firstIndex);
                                                                                console.log('Connection made between', firstIndex, 'and', clickedIndex, '. Updated dotConnections:', dotConnections);
                                                                            }
                                                                            
                                                                            drawConnectionLines();
                                                                            
                                                                            // The clicked dot becomes the new active connection
                                                                            firstDot.style.boxShadow = `0 0 10px 5px ${currentDotColor}`; // Unhighlight previous first dot
                                                                            activeConnection = { dot: clickedDot, index: clickedIndex }; // Set new active dot
                                                                            clickedDot.style.boxShadow = '0 0 10px 5px #FFFF99'; // Highlight new active dot with paler yellow
                                                                
                                                                            checkConnectionCompletion();

            
            function resetConnectMode(success = false) {
                dots.forEach(dot => {
                    dot.style.boxShadow = 'none'; 
                    dot.style.cursor = 'default';
                    dot.style.opacity = 1;       
                    dot.style.backgroundColor = currentDotColor; 
                    
                    dot.removeEventListener('click', handleDotClick); 
                    
                    dot.style.transform = 'none'; // Remove GPU acceleration
                });
                
                isScattered = false;
                isConnectMode = false;
                
                activeConnection = null; 
                dotConnections = {};
                
                const svgElement = document.getElementById('dot-connections-svg');
                if (svgElement) {
                    svgElement.innerHTML = ''; 
                }

                if (success) {
                    console.log("SUCCESS! All dots connected. Reverting to Follow Mode.");
                }
            }

    // --- 7. Event Handlers ---
    
    const mouseMoveHandler = (e) => {
        if (!isScattered) {
            const rect = mainContent.getBoundingClientRect();
            mouseX = e.clientX - rect.left - currentDotSize / 2; 
            mouseY = e.clientY - rect.top - currentDotSize / 2;  
        }
    };

    mainContent.addEventListener('mousemove', mouseMoveHandler);

    // Double Click (Toggle Scatter/Connect State)
    const dblClickHandler = (e) => {
        console.log('Double clicked');
        if (isCameraMode) {
            console.log('In camera mode, dblclick ignored');
            return; // Prevent dblclick from interfering in camera mode
        }

        if (!isScattered && !isConnectMode) {
            console.log('Entering connect mode');
            // State 1: FOLLOW -> SCATTER/CONNECT (Smooth Scatter Out)
            
            const fullWidth = window.innerWidth;
            const fullHeight = window.innerHeight;

            dots.forEach(dot => {
                dot.style.transition = scatterTransition; 

                const minX = 0; 
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
            cancelAnimationFrame(dotAnimationFrameRequest); // Stop normal dot animation
            
            activeConnection = null;
            dotConnections = {}; 
            
            dots.forEach(dot => {
                dot.style.boxShadow = `0 0 10px 5px ${currentDotColor}`;
                dot.style.cursor = 'pointer'; 
                dot.addEventListener('click', handleDotClick); 
                console.log('Added click listener to dot', dot);
            });

            // REMOVE transition after it completes (0.5s)
            setTimeout(() => {
                dots.forEach(dot => {
                    dot.style.transition = 'none';
                });
            }, 500);

        } else if (isConnectMode) {
            console.log('Exiting connect mode');
            dots.forEach(dot => {
                dot.style.transition = scatterTransition;
            });
            
            resetConnectMode(false); 
            animateDots(); // Restart normal dot animation

            // REMOVE transition after it completes (0.5s)
            setTimeout(() => {
                dots.forEach(dot => {
                    dot.style.transition = 'none';
                });
            }, 500);
        }
    };
    mainContent.addEventListener('dblclick', dblClickHandler);

    cameraToggleButton.addEventListener('click', async () => {
        console.log('Camera toggle button clicked.');
        isCameraMode = !isCameraMode;
        console.log('isCameraMode now:', isCameraMode);
        if (isCameraMode) {
            webcamFeed.style.display = 'block';
            handCanvas.style.display = 'block';
            document.getElementById('container').style.backgroundImage = 'none';
            mainContent.removeEventListener('mousemove', mouseMoveHandler);
            mainContent.removeEventListener('dblclick', dblClickHandler);
            cancelAnimationFrame(handAnimationRequest);
            isConnectMode = false; // Ensure connect mode is off
            resetConnectMode(); // Clear any connections
            await setupCamera();
            animateHand();
        } else {
            webcamFeed.style.display = 'none';
            handCanvas.style.display = 'none';
            handCtx.setTransform(1, 0, 0, 1, 0, 0); // Reset canvas transformation
            document.getElementById('container').style.backgroundImage = `url('${backgroundImages[currentBgIndex]}')`;
            mainContent.addEventListener('mousemove', mouseMoveHandler);
            mainContent.addEventListener('dblclick', dblClickHandler);
            cancelAnimationFrame(handAnimationRequest);
            isConnectMode = false; // Ensure connect mode is off
            resetConnectMode(); // Clear any connections
            if (webcamFeed.srcObject) {
                webcamFeed.srcObject.getTracks().forEach(track => track.stop());
            }
            animateDots();
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

    lineColorInput.addEventListener('input', (e) => {
        currentLineColor = e.target.value;
        drawConnectionLines(); // Redraw lines with new color
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

    lineThicknessInput.addEventListener('input', (e) => {
        currentLineThickness = parseFloat(e.target.value);
        lineThicknessValueSpan.textContent = `${currentLineThickness}px`;
        drawConnectionLines(); // Redraw lines with new thickness
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

// --- 8. Sidebar Control Listeners ---
// ... (existing listeners for dotsize, color, etc.) ...

// CAPTURE SCREEN LISTENER (FINAL FIX)
const captureButton = document.getElementById('snapshot-btn'); // Use the correct, unique ID

if (captureButton) {
    captureButton.addEventListener('click', () => {
        // Check if html2canvas is loaded before proceeding
        if (typeof html2canvas === 'undefined') {
            console.error("html2canvas library is not loaded. Check the <script> tag in your index.html.");
            alert("Capture failed: Library not loaded.");
            return;
        }

        const sidebar = document.getElementById('sidebar');
        const captureWidth = window.innerWidth;
        const captureHeight = window.innerHeight;

        // Temporarily hide sidebar for the screenshot
        sidebar.style.display = 'none'; 

        // Use html2canvas to capture the entire visible area (body)
        html2canvas(document.body, { 
            width: captureWidth,
            height: captureHeight,
            scale: 2, // High resolution
            logging: false
        }).then(canvas => {
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = 'dotted_capture.png';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Show the sidebar again
            sidebar.style.display = 'flex';
        });
    });
}

    // --- 9. Initialization (Runs Once) ---

    handpose.load().then(loadedModel => {
        model = loadedModel;
        console.log('Handpose model loaded successfully.');
        preloadImages(backgroundImages);
        // Defer initialization slightly to ensure layout is complete
        setTimeout(() => {
            initializeDots(currentNumDots);
            animateDots();
        }, 100);
        startSlideshow(); 
    });

});