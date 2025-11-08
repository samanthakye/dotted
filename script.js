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
    const followSpeedInput = document.getElementById('followSpeed');
    const videoUpload = document.getElementById('video-upload');
    const uploadVideoBtn = document.getElementById('upload-video-btn');
    const uploadedVideo = document.getElementById('uploadedVideo');
    const videoCanvas = document.getElementById('videoCanvas');
    const videoCtx = videoCanvas.getContext('2d');

    let dots = [];
    let mouseX = 0;
    let mouseY = 0;
    let lastHandX = 0;
    
    let currentDotSize = parseInt(dotSizeInput.value);
    let currentNumDots = parseInt(numDotsInput.value) || 50; 
    let currentDotColor = '#ffffff';
    let currentLineThickness = 1.5;
    let currentLineColor = '#ffffff';
    let currentFollowSpeed = parseFloat(followSpeedInput.value);

    let isCameraMode = false;
    let model = null;
    let handAnimationRequest = null;

    let audioContext = null;
    let analyser = null;
    let audioSource = null;
    const scatterTransition = 'left 0.5s ease, top 0.5s ease';
    let dominantFrequency = 0;
    let maxAmplitude = 0;

    interactiveModeButton.addEventListener('click', async () => {
        if (!model) {
            alert('Handpose model not loaded yet. Please wait.');
            return;
        }

        // Clean up video mode
        if (uploadedVideo.src) {
            uploadedVideo.pause();
            URL.revokeObjectURL(uploadedVideo.src);
            uploadedVideo.src = '';
        }
        if (audioSource) {
            audioSource.disconnect();
            // If the audioSource was connected to destination, it will be disconnected here.
            // When switching to webcam, a new audioSource will be created and connected to analyser.
            // The webcam audio stream will be connected to analyser, but not directly to destination,
            // as the audio reactivity is handled by the analyser.
        }
        uploadedVideo.style.display = 'none';

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
        // Ensure webcam audio is connected to destination
        if (audioSource) {
            audioSource.connect(audioContext.destination);
        }
        animateHand();
    });

    uploadVideoBtn.addEventListener('click', () => {
        videoUpload.click();
    });

    videoUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const videoURL = URL.createObjectURL(file);
            uploadedVideo.src = videoURL;

            uploadedVideo.addEventListener('loadedmetadata', () => {
                videoCanvas.width = uploadedVideo.videoWidth;
                videoCanvas.height = uploadedVideo.videoHeight;
            });

            // Set up audio for video
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
            }
            if (audioSource) {
                audioSource.disconnect();
            }
            audioSource = audioContext.createMediaElementSource(uploadedVideo);
            audioSource.connect(analyser);
            audioSource.connect(audioContext.destination); // Connect to speakers
            audioContext.resume();

            // Switch to video mode
            isCameraMode = false;
            if (handAnimationRequest) {
                cancelAnimationFrame(handAnimationRequest);
                handAnimationRequest = null;
            }
            webcamFeed.style.display = 'none';
            handCanvas.style.display = 'none';
            uploadedVideo.style.display = 'block';

            // Stop webcam stream
            if (webcamFeed.srcObject) {
                webcamFeed.srcObject.getTracks().forEach(track => track.stop());
                webcamFeed.srcObject = null;
            }

            mainContent.addEventListener('mousemove', mouseMoveHandler);
            mainContent.addEventListener('dblclick', dblClickHandler);
        }
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
        audioSource.connect(audioContext.destination); // Connect webcam audio to speakers

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

    function updateDotsWithAudio() {
        if (analyser) {
            analyser.fftSize = 1024;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray);

            dominantFrequency = getDominantFrequency(dataArray);
            maxAmplitude = Math.max(...dataArray);

            const bass = dataArray.slice(0, 32).reduce((a, b) => a + b, 0) / 32;
            const mid = dataArray.slice(32, 128).reduce((a, b) => a + b, 0) / 96;
            const treble = dataArray.slice(128, bufferLength).reduce((a, b) => a + b, 0) / (bufferLength - 128);

            const total = bass + mid + treble;
            const bassRatio = bass / total;
            const midRatio = mid / total;
            const trebleRatio = treble / total;

            dots.forEach((dot, index) => {
                const size = currentDotSize + (bass / 255) * 50;
                dot.style.width = `${size}px`;
                dot.style.height = `${size}px`;

                if (isCameraMode) { // Only change color based on audio in camera mode
                    const hue = (midRatio * 360 + 180) % 360;
                    const saturation = (trebleRatio * 100);
                    const lightness = (bassRatio * 50 + 25);
                    dot.style.backgroundColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                }

                if (isScattered) {
                    const jiggleY = (Math.random() - 0.5) * (treble / 255) * 20;
                    const currentY = parseFloat(dot.style.top);
                    dot.style.top = `${currentY + jiggleY}px`;
                }

                const jiggleX = (Math.random() - 0.5) * (treble / 255) * 10;
                const currentX = parseFloat(dot.style.left);
                dot.style.left = `${currentX + jiggleX}px`;
            });
        }
    }

    async function animateHand() {
        if (!isCameraMode || !model) return;

        updateDotsWithAudio();

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

    function getDominantFrequency(dataArray) {
        let dominantFrequency = 0;
        let maxAmplitude = 0;
        for (let i = 0; i < dataArray.length; i++) {
            if (dataArray[i] > maxAmplitude) {
                maxAmplitude = dataArray[i];
                dominantFrequency = i;
            }
        }
        return dominantFrequency;
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
                if (isCameraMode) { // Only apply shadow in camera mode
                    dot.style.boxShadow = `0 0 10px 5px ${currentDotColor}`;
                }
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

                if (isCameraMode) { // Only apply shadow in camera mode
                    activeConnection.style.boxShadow = `0 0 10px 5px ${currentDotColor}`;
                }
                activeConnection = clickedDot;
                if (isCameraMode) { // Only apply shadow in camera mode
                    activeConnection.style.boxShadow = `0 0 20px 10px ${currentDotColor}`;
                }
            } else {
                if (isCameraMode) { // Only remove shadow in camera mode
                    activeConnection.style.boxShadow = `0 0 10px 5px ${currentDotColor}`;
                }
                activeConnection = null;
            }
        } else {
            activeConnection = clickedDot;
            if (isCameraMode) { // Only apply shadow in camera mode
                activeConnection.style.boxShadow = `0 0 20px 10px ${currentDotColor}`;
            }
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

    function animate() {
        if (!isScattered && !isCameraMode) {
            let targetX = mouseX;
            let targetY = mouseY;

            dots.forEach((dot, index) => {
                const currentX = parseFloat(dot.style.left) + currentDotSize / 2;
                const currentY = parseFloat(dot.style.top) + currentDotSize / 2;

                const dx = targetX - currentX;
                const dy = targetY - currentY;

                dot.style.left = `${parseFloat(dot.style.left) + dx * currentFollowSpeed}px`;
                dot.style.top = `${parseFloat(dot.style.top) + dy * currentFollowSpeed}px`;

                targetX = currentX;
                targetY = currentY;
            });
        }

        if (!isCameraMode && uploadedVideo.src && !uploadedVideo.paused) {
            videoCtx.drawImage(uploadedVideo, 0, 0, videoCanvas.width, videoCanvas.height);
            const frameData = videoCtx.getImageData(0, 0, videoCanvas.width, videoCanvas.height).data;

            updateDotsWithAudio();

            dots.forEach(dot => {
                const x = Math.floor(parseFloat(dot.style.left) + currentDotSize / 2);
                const y = Math.floor(parseFloat(dot.style.top) + currentDotSize / 2);

                if (x >= 0 && x < videoCanvas.width && y >= 0 && y < videoCanvas.height) {
                    const index = (y * videoCanvas.width + x) * 4;
                    const r = frameData[index];
                    const g = frameData[index + 1];
                    const b = frameData[index + 2];
                    dot.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
                }
            });
        }

        drawLines();
        requestAnimationFrame(animate);
    }

    initializeDots(currentNumDots);
    animate();

    handpose.load().then(loadedModel => {
        model = loadedModel;
        interactiveModeButton.disabled = false;
    });



});