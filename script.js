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

    let currentLineColor = '#ffffff'; // Assuming default line color is white
    let currentLineThickness = 1.5; // Assuming default line thickness
    
    let isScattered = false;      
    let isConnectMode = false;    
    
    let activeConnection = null;  
    let dotConnections = {};      
    
    const floatIntensity = 0.005; 
    const maxFloatDistance = 5;   
    const scatterTransition = 'all 0.5s ease-out';

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
        dot.addEventListener('click', handleDotClick); // Add click listener
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

    async function setupCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Webcam API not available');
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamFeed.srcObject = stream;

        return new Promise((resolve) => {
            webcamFeed.onloadedmetadata = () => {
                webcamFeed.width = webcamFeed.videoWidth;
                webcamFeed.height = webcamFeed.videoHeight;
                handCanvas.width = webcamFeed.videoWidth;
                handCanvas.height = webcamFeed.videoHeight;
                resolve(webcamFeed);
            };
        });
    }

    async function animateHand() {
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

    function animateDots() {
        if (isConnectMode) {
            requestAnimationFrame(animateDots);
            return;
        }
        
        if (!isScattered) { 
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
        requestAnimationFrame(animateDots);
    }

    const mouseMoveHandler = (e) => {
        const rect = mainContent.getBoundingClientRect();
        mouseX = e.clientX - rect.left - currentDotSize / 2; 
        mouseY = e.clientY - rect.top - currentDotSize / 2;  
    };

    mainContent.addEventListener('mousemove', mouseMoveHandler);

    // Double Click (Toggle Scatter/Connect State)
    const dblClickHandler = (e) => {
        console.log('dblClickHandler triggered. isConnectMode:', isConnectMode);
        if (!isScattered && !isConnectMode) {
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
            console.log('isConnectMode set to', isConnectMode);
            cancelAnimationFrame(dotAnimationFrameRequest); // Stop normal dot animation
            
            activeConnection = null;
            dotConnections = {}; 
            
            dots.forEach(dot => {
                dot.style.boxShadow = `0 0 10px 5px ${currentDotColor}`;
                dot.style.cursor = 'pointer'; 
            });

            // REMOVE transition after it completes (0.5s)
            setTimeout(() => {
                dots.forEach(dot => {
                    dot.style.transition = 'none';
                });
            }, 500);

        } else if (isConnectMode) {
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

    const cameraToggleButton = document.getElementById('cameraToggleButton');
    const webcamFeed = document.getElementById('webcamFeed');
    const handCanvas = document.getElementById('handCanvas');
    const handCtx = handCanvas.getContext('2d');

    let model = null;
    let handAnimationRequest = null;

    cameraToggleButton.addEventListener('click', async () => {
        isCameraMode = !isCameraMode;
        if (isCameraMode) {
            webcamFeed.style.display = 'block';
            handCanvas.style.display = 'block';
            document.getElementById('container').style.backgroundImage = 'none';
            mainContent.removeEventListener('mousemove', mouseMoveHandler);
            mainContent.removeEventListener('dblclick', dblClickHandler);
            cancelAnimationFrame(dotAnimationFrameRequest); // Stop dot animation
            isConnectMode = false; // Ensure connect mode is off
            resetConnectMode(); // Clear any connections
            await setupCamera();
            animateHand();
        } else {
            webcamFeed.style.display = 'none';
            handCanvas.style.display = 'none';
            handCtx.setTransform(1, 0, 0, 1, 0, 0); // Reset canvas transformation
            // document.getElementById('container').style.backgroundImage = `url('${backgroundImages[currentBgIndex]}')`; // Re-enable background image
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

    const lineThicknessInput = document.getElementById('lineThickness');
    const lineThicknessValueSpan = document.getElementById('lineThicknessValue');
    const lineColorInput = document.getElementById('lineColor');

    lineThicknessInput.addEventListener('input', (e) => {
        currentLineThickness = parseFloat(e.target.value);
        lineThicknessValueSpan.textContent = `${currentLineThickness}px`;
        drawConnectionLines(); // Redraw lines with new thickness
    });

    lineColorInput.addEventListener('input', (e) => {
        currentLineColor = e.target.value;
        drawConnectionLines(); // Redraw lines with new color
    });

    initializeDots(currentNumDots);
    animateDots();

    handpose.load().then(loadedModel => {
        model = loadedModel;
    });
});