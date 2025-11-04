document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const dotSizeInput = document.getElementById('dotSize');
    const dotSizeValueSpan = document.getElementById('dotSizeValue');
    const numDotsInput = document.getElementById('numDots');
    const numDotsValueSpan = document.getElementById('numDotsValue');
    const interactiveModeButton = document.getElementById('interactiveModeButton');
    const webcamFeed = document.getElementById('webcamFeed');
    const handCanvas = document.getElementById('handCanvas');
    const handCtx = handCanvas.getContext('2d');
    const snapshotBtn = document.getElementById('snapshot-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarArrowBtn = document.getElementById('sidebar-arrow-btn');

    let dots = [];
    let mouseX = 0;
    let mouseY = 0;
    let lastHandX = 0;
    
    let currentDotSize = parseInt(dotSizeInput.value);
    let currentNumDots = parseInt(numDotsInput.value) || 25; 
    let currentDotColor = '#ffffff';
    let currentLineThickness = 1.5;
    let currentLineColor = '#ffffff';

    let isCameraMode = true;
    let model = null;
    let handAnimationRequest = null;

    let audioContext = null;
    let analyser = null;
    let audioSource = null;

    interactiveModeButton.addEventListener('click', async () => {
        if (!model) {
            alert('Handpose model not loaded yet. Please wait.');
            return;
        }
        isCameraMode = true;

        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
        }
        audioContext.resume();

        webcamFeed.style.display = 'block';
        handCanvas.style.display = 'block';
        mainContent.removeEventListener('mousemove', mouseMoveHandler);
        mainContent.removeEventListener('dblclick', dblClickHandler);
        resetConnectMode(false);
        currentFollowSpeed = 0.5;
        await setupInteractiveMode();
        animateHand();
    });

    let isScattered = false;
    let isConnectMode = false;
    let activeConnection = null;
    let dotConnections = {};

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'dot-connections-svg';
    mainContent.appendChild(svg);

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
        dot.addEventListener('click', handleDotClick);
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
        });
    }

    function drawLines() {
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }

        if (isConnectMode) {
            drawConnectionLines();
        }
    }

    async function setupInteractiveMode() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Webcam and audio API not available');
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        webcamFeed.srcObject = stream;

        audioSource = audioContext.createMediaStreamSource(stream);
        audioSource.connect(analyser);

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
        if (!isCameraMode || !model) return;

        if (analyser) {
            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray);

            const bass = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
            const mid = dataArray.slice(10, 40).reduce((a, b) => a + b, 0) / 30;
            const treble = dataArray.slice(40, bufferLength).reduce((a, b) => a + b, 0) / (bufferLength - 40);

            const avg = (bass + mid + treble) / 3;

            dots.forEach((dot, index) => {
                const size = currentDotSize + (avg / 255) * 50;
                dot.style.width = `${size}px`;
                dot.style.height = `${size}px`;

                const r = Math.floor(bass);
                const g = Math.floor(mid);
                const b = Math.floor(treble);
                dot.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
            });
        }

        const predictions = await model.estimateHands(webcamFeed);
        handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);

        if (predictions.length > 0) {
            const keypoints = predictions[0].landmarks;
            const palmBase = keypoints[0];
            const currentHandX = palmBase[0];

            if (isOpenHand(keypoints)) {
                if (!isScattered) {
                    isScattered = true;
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
                } else {
                    const handDeltaX = lastHandX ? currentHandX - lastHandX : 0;
                    dots.forEach(dot => {
                        const currentX = parseFloat(dot.style.left);
                        dot.style.left = `${currentX - handDeltaX}px`;
                    });
                }
            } else {
                if (isScattered) {
                    isScattered = false;
                    dots.forEach(dot => {
                        dot.style.transition = scatterTransition;
                    });
                    setTimeout(() => {
                        dots.forEach(dot => {
                            dot.style.transition = 'none';
                        });
                    }, 500);
                }
                let targetX = (webcamFeed.videoWidth - keypoints[8][0]) * 3;
                let targetY = keypoints[8][1] * 3;

                dots.forEach((dot, index) => {
                    const currentX = parseFloat(dot.style.left) + currentDotSize / 2;
                    const currentY = parseFloat(dot.style.top) + currentDotSize / 2;

                    const dx = targetX - currentX;
                    const dy = targetY - currentY;

                    dot.style.left = `${parseFloat(dot.style.left) + dx * currentFollowSpeed}px`;
                    dot.style.top = `${parseFloat(dot.style.top) + dy * currentFollowSpeed}px`;

                    targetX = parseFloat(dot.style.left) + currentDotSize / 2;
                    targetY = parseFloat(dot.style.top) + currentDotSize / 2;
                });
            }
            lastHandX = currentHandX;
        }
        handAnimationRequest = requestAnimationFrame(animateHand);
    }

    function isOpenHand(keypoints) {
        const thumbTip = keypoints[4];
        const indexTip = keypoints[8];
        const middleTip = keypoints[12];
        const ringTip = keypoints[16];
        const pinkyTip = keypoints[20];
        const palmBase = keypoints[0];

        const dist = (p1, p2) => Math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2);

        const thumbDist = dist(palmBase, thumbTip);
        const indexDist = dist(palmBase, indexTip);
        const middleDist = dist(palmBase, middleTip);
        const ringDist = dist(palmBase, ringTip);
        const pinkyDist = dist(palmBase, pinkyTip);

        const openThreshold = 100;

        return (
            thumbDist > openThreshold &&
            indexDist > openThreshold &&
            middleDist > openThreshold &&
            ringDist > openThreshold &&
            pinkyDist > openThreshold
        );
    }

    const mouseMoveHandler = (e) => {
        const rect = mainContent.getBoundingClientRect();
        mouseX = e.clientX - rect.left - currentDotSize / 2; 
        mouseY = e.clientY - rect.top - currentDotSize / 2;  
    };

    mainContent.addEventListener('mousemove', mouseMoveHandler);

    const dblClickHandler = (e) => {
        if (!isScattered && !isConnectMode) {
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
            
            isScattered = true;
            isConnectMode = true; 
            
            activeConnection = null;
            dotConnections = {}; 
            
            dots.forEach(dot => {
                dot.style.boxShadow = `0 0 10px 5px ${currentDotColor}`;
                dot.style.cursor = 'pointer'; 
            });

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

            setTimeout(() => {
                dots.forEach(dot => {
                    dot.style.transition = 'none';
                });
            }, 500);
        }
    };
    mainContent.addEventListener('dblclick', dblClickHandler);

    function handleDotClick(e) {
        if (!isConnectMode) return;

        const clickedDot = e.target;

        if (activeConnection) {
            if (activeConnection !== clickedDot) {
                const dotId1 = dots.indexOf(activeConnection);
                const dotId2 = dots.indexOf(clickedDot);

                if (!dotConnections[dotId1]) {
                    dotConnections[dotId1] = [];
                }
                dotConnections[dotId1].push(dotId2);

activeConnection.style.boxShadow = `0 0 10px 5px ${currentDotColor}`;
                activeConnection = clickedDot;
activeConnection.style.boxShadow = `0 0 20px 10px ${currentDotColor}`;
            } else {
                activeConnection.style.boxShadow = `0 0 10px 5px ${currentDotColor}`;
                activeConnection = null;
            }
        } else {
            activeConnection = clickedDot;
            activeConnection.style.boxShadow = `0 0 20px 10px ${currentDotColor}`;
        }
    }

    function drawConnectionLines() {
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
        Object.keys(dotConnections).forEach(dotId1 => {
            dotConnections[dotId1].forEach(dotId2 => {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                const x1 = parseFloat(dots[dotId1].style.left) + currentDotSize / 2;
                const y1 = parseFloat(dots[dotId1].style.top) + currentDotSize / 2;
                const x2 = parseFloat(dots[dotId2].style.left) + currentDotSize / 2;
                const y2 = parseFloat(dots[dotId2].style.top) + currentDotSize / 2;

                line.setAttribute('x1', x1);
                line.setAttribute('y1', y1);
                line.setAttribute('x2', x2);
                line.setAttribute('y2', y2);
                line.setAttribute('stroke', currentLineColor);
                line.setAttribute('stroke-width', currentLineThickness);
                line.setAttribute('stroke-dasharray', '5, 5');
                svg.appendChild(line);
            });
        });
    }

    function resetConnectMode(shouldAnimate) {
        isScattered = false;
        isConnectMode = false;
        activeConnection = null;
        dotConnections = {};
        
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }

        dots.forEach(dot => {
            dot.style.boxShadow = 'none';
            dot.style.cursor = 'default';
            if (shouldAnimate) {
                dot.style.transition = scatterTransition;
            }
        });
    }

    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    });

    sidebarArrowBtn.addEventListener('click', () => {
        const container = document.getElementById('container');
        container.classList.toggle('sidebar-closed');
        if (container.classList.contains('sidebar-closed')) {
            sidebarArrowBtn.innerHTML = '&rarr;';
        } else {
            sidebarArrowBtn.innerHTML = '&larr;';
        }
    });

    dotSizeInput.addEventListener('input', (e) => {
        currentDotSize = parseInt(e.target.value);
        dotSizeValueSpan.textContent = `${currentDotSize}px`;
        document.documentElement.style.setProperty('--dot-size', `${currentDotSize}px`);
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
    setupInteractiveMode();
    animateHand();

    handpose.load().then(loadedModel => {
        model = loadedModel;
        interactiveModeButton.disabled = false;
    });


});
