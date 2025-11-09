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
    const dotsCanvas = document.getElementById('dotsCanvas');
    const dotsCtx = dotsCanvas.getContext('2d');
    const startRecordingBtn = document.getElementById('start-recording-btn');
    const stopRecordingBtn = document.getElementById('stop-recording-btn');
    const compositeCanvas = document.getElementById('compositeCanvas');
    const compositeCtx = compositeCanvas.getContext('2d');
    const toggleColorGridBtn = document.getElementById('toggle-color-grid-btn');
    const colorGrid = document.getElementById('color-grid');

    let dots = [];
    let mouseX = 0;
    let mouseY = 0;
    let lastHandX = 0;
    let colorHistory = [];
    let isColorGridVisible = false;
    
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

    let mediaRecorder;
    let recordedChunks = [];
    let isRecording = false;

    startRecordingBtn.addEventListener('click', () => {
        isRecording = true;
        recordedChunks = [];

        compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = dotsCanvas.width;
        compositeCanvas.height = dotsCanvas.height;
        compositeCtx = compositeCanvas.getContext('2d');

        const stream = compositeCanvas.captureStream();
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'dotted-recording.webm';
            a.click();
            URL.revokeObjectURL(url);
        };

        mediaRecorder.start();
        startRecordingBtn.style.display = 'none';
        stopRecordingBtn.style.display = 'block';
    });

    stopRecordingBtn.addEventListener('click', () => {
        isRecording = false;
        mediaRecorder.stop();
        startRecordingBtn.style.display = 'block';
        stopRecordingBtn.style.display = 'none';
    });

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

            // Explicitly remove shadows from dots when switching to video mode
            dots.forEach(dot => {
                dot.style.boxShadow = 'none';
            });

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
        const rect = mainContent.getBoundingClientRect();
        return {
            x: Math.random() * rect.width,
            y: Math.random() * rect.height,
            size: currentDotSize,
            color: currentDotColor
        };
    }

    function initializeDots(count) {
        dots = [];
        for (let i = 0; i < count; i++) {
            dots.push(createDot());
        }
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
                dot.size = currentDotSize + (bass / 255) * 50;

                if (isCameraMode) { // Only change color based on audio in camera mode
                    const hue = (midRatio * 360 + 180) % 360;
                    const saturation = (trebleRatio * 100);
                    const lightness = (bassRatio * 50 + 25);
                    const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                    dot.color = color;

                    if (colorHistory.length < 100) {
                        colorHistory.push(color);
                    } else {
                        colorHistory.shift();
                        colorHistory.push(color);
                    }
                }

                if (isScattered) {
                    const jiggleY = (Math.random() - 0.5) * (treble / 255) * 20;
                    dot.y += jiggleY;
                }

                const jiggleX = (Math.random() - 0.5) * (treble / 255) * 10;
                dot.x += jiggleX;
            });
        }
    }

    async function animateHand() {
        if (!isCameraMode || !model) return;

        updateDotsWithAudio();
        updateColorGrid();

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
                        dot.x = Math.random() * fullWidth;
                        dot.y = Math.random() * fullHeight;
                    });
                }
            } else {
                if (isScattered) {
                    isScattered = false;
                }
                let targetX = (webcamFeed.videoWidth - keypoints[8][0]) * 3;
                let targetY = keypoints[8][1] * 3;

                dots.forEach((dot, index) => {
                    const dx = targetX - dot.x;
                    const dy = targetY - dot.y;

                    dot.x += dx * currentFollowSpeed;
                    dot.y += dy * currentFollowSpeed;

                    targetX = dot.x;
                    targetY = dot.y;
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
        if (!isScattered) {
            const fullWidth = window.innerWidth;
            const fullHeight = window.innerHeight;

            dots.forEach(dot => {
                dot.x = Math.random() * fullWidth;
                dot.y = Math.random() * fullHeight;
            });
            
            isScattered = true;
        } else {
            isScattered = false;
        }
    };
    mainContent.addEventListener('dblclick', dblClickHandler);

    function drawConnectionLines() {
        // This function is no longer used but is kept for now to avoid breaking dependencies.
        // It will be removed in a future refactoring.
    }

    function resetConnectMode(shouldAnimate) {
        isScattered = false;
        isConnectMode = false;
        activeConnection = null;
        dotConnections = {};
        
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
    }

    function updateColorGrid() {
        if (!isColorGridVisible) return;

        colorGrid.innerHTML = '';
        colorHistory.forEach(color => {
            const colorSquare = document.createElement('div');
            colorSquare.className = 'color-square';
            colorSquare.style.backgroundColor = color;
            colorGrid.appendChild(colorSquare);
        });
    }

    toggleColorGridBtn.addEventListener('click', () => {
        isColorGridVisible = !isColorGridVisible;
        colorGrid.style.display = isColorGridVisible ? 'flex' : 'none';
    });

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

    startRecordingBtn.addEventListener('click', () => {
        isRecording = true;
        recordedChunks = [];

        const videoStream = compositeCanvas.captureStream();
        const audioStream = isCameraMode ? webcamFeed.srcObject : uploadedVideo.captureStream();
        const audioTrack = audioStream.getAudioTracks()[0];
        
        const combinedStream = new MediaStream([...videoStream.getVideoTracks(), audioTrack]);

        const options = { mimeType: 'video/webm; codecs=vp9' };
        if (MediaRecorder.isTypeSupported('video/mp4; codecs=avc1.42E01E')) {
            options.mimeType = 'video/mp4; codecs=avc1.42E01E';
            console.log('Recording in MP4 format.');
        } else {
            console.log('MP4 not supported, recording in WebM format.');
        }

        mediaRecorder = new MediaRecorder(combinedStream, options);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: options.mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = options.mimeType.includes('mp4') ? 'dotted-recording.mp4' : 'dotted-recording.webm';
            a.click();
            URL.revokeObjectURL(url);
        };

        mediaRecorder.start();
        startRecordingBtn.style.display = 'none';
        stopRecordingBtn.style.display = 'block';
    });

    stopRecordingBtn.addEventListener('click', () => {
        isRecording = false;
        mediaRecorder.stop();
        startRecordingBtn.style.display = 'block';
        stopRecordingBtn.style.display = 'none';
    });

    function animate() {
        dotsCanvas.width = mainContent.clientWidth;
        dotsCanvas.height = mainContent.clientHeight;
        dotsCtx.clearRect(0, 0, dotsCanvas.width, dotsCanvas.height);

        if (!isScattered && !isCameraMode) {
            let targetX = mouseX;
            let targetY = mouseY;

            dots.forEach((dot, index) => {
                const dx = targetX - dot.x;
                const dy = targetY - dot.y;

                dot.x += dx * currentFollowSpeed;
                dot.y += dy * currentFollowSpeed;

                targetX = dot.x;
                targetY = dot.y;
            });
        }

        if (!isCameraMode && uploadedVideo.src && !uploadedVideo.paused) {
            videoCtx.drawImage(uploadedVideo, 0, 0, videoCanvas.width, videoCanvas.height);
            const frameData = videoCtx.getImageData(0, 0, videoCanvas.width, videoCanvas.height).data;

            updateDotsWithAudio();

            dots.forEach(dot => {
                const x = Math.floor(dot.x);
                const y = Math.floor(dot.y);

                if (x >= 0 && x < videoCanvas.width && y >= 0 && y < videoCanvas.height) {
                    const index = (y * videoCanvas.width + x) * 4;
                    const r = frameData[index];
                    const g = frameData[index + 1];
                    const b = frameData[index + 2];
                    
                    // Apply white tint
                    const tintedR = Math.min(255, Math.floor((r + 255) / 2));
                    const tintedG = Math.min(255, Math.floor((g + 255) / 2));
                    const tintedB = Math.min(255, Math.floor((b + 255) / 2));

                    dot.color = `rgba(${tintedR}, ${tintedG}, ${tintedB}, 0.7)`;
                }
            });
        }

        dots.forEach(dot => {
            dotsCtx.beginPath();
            dotsCtx.arc(dot.x, dot.y, dot.size / 2, 0, Math.PI * 2);
            dotsCtx.fillStyle = dot.color;
            dotsCtx.fill();
        });

        compositeCanvas.width = dotsCanvas.width;
        compositeCanvas.height = dotsCanvas.height;
        compositeCtx.clearRect(0, 0, compositeCanvas.width, compositeCanvas.height);
        if (isCameraMode) {
            compositeCtx.drawImage(webcamFeed, 0, 0, compositeCanvas.width, compositeCanvas.height);
        } else {
            compositeCtx.drawImage(uploadedVideo, 0, 0, compositeCanvas.width, compositeCanvas.height);
        }
        compositeCtx.drawImage(dotsCanvas, 0, 0);

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