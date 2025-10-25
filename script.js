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

    function drawConnectionLines() {
        const svgElement = document.getElementById('dot-connections-svg');
        if (!svgElement) {
            return;
        }

        svgElement.innerHTML = ''; 
        const linesDrawn = new Set(); 

        dots.forEach((dot, index) => {
            const connectedArray = dotConnections[index] || [];
            
            connectedArray.forEach(connectedIndex => {
                const partnerDot = dots[connectedIndex];
                
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
                    line.setAttribute('stroke', currentLineColor); 
                    line.setAttribute('stroke-width', currentLineThickness);
                    line.setAttribute('stroke-linecap', 'round');                            
                    line.setAttribute('stroke-dasharray', '5, 5'); 

                    svgElement.appendChild(line);
                    linesDrawn.add(key);
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
            resetConnectMode(true);
        }
    }

    function isDotEligible(dot) {
        return true; 
    }

    function handleDotClick(e) {
        e.stopPropagation(); 
        if (!isConnectMode) {
            return;
        }

        const clickedDot = e.currentTarget; 
        const clickedIndex = dots.indexOf(clickedDot);
        
        if (activeConnection === null) {
            activeConnection = { dot: clickedDot, index: clickedIndex };
            clickedDot.style.boxShadow = '0 0 10px 5px #FFFF99'; // Highlight first dot with paler yellow
        } else {
            const firstDot = activeConnection.dot;
            const firstIndex = activeConnection.index;

            if (clickedDot === firstDot) {
                firstDot.style.boxShadow = `0 0 10px 5px ${currentDotColor}`;
                activeConnection = null;
                return;
            }

            dotConnections[firstIndex] = dotConnections[firstIndex] || [];
            dotConnections[clickedIndex] = dotConnections[clickedIndex] || [];

            if (!dotConnections[firstIndex].includes(clickedIndex)) {
                dotConnections[firstIndex].push(clickedIndex);
                dotConnections[clickedIndex].push(firstIndex);
            }
            
            drawConnectionLines();
            
            // The clicked dot becomes the new active connection
            firstDot.style.boxShadow = `0 0 10px 5px ${currentDotColor}`; // Unhighlight previous first dot
            activeConnection = { dot: clickedDot, index: clickedIndex }; // Set new active dot
            clickedDot.style.boxShadow = '0 0 10px 5px #FFFF99'; // Highlight new active dot with paler yellow

            checkConnectionCompletion();
        }
    }

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
            cancelAnimationFrame(dotAnimationFrameRequest); // Stop normal dot animation
            
            activeConnection = null;
            dotConnections = {}; 
            
            dots.forEach(dot => {
                dot.style.boxShadow = `0 0 10px 5px ${currentDotColor}`;
                dot.style.cursor = 'pointer'; 
                dot.addEventListener('click', handleDotClick); 
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

    initializeDots(currentNumDots);
    animateDots();
});