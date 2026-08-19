// Game constants (pixels/sec, radians/sec, etc.)
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const SHIP_SIZE = 20;
const SHIP_THRUST = 200; // pixels/sec^2
const SHIP_TURN_SPEED = 360 * (Math.PI / 180); // 360 degrees/sec
const SHIP_FRICTION = 0.7; // coefficient, 0 = no friction, 1 = full stop in 1s
const SHIP_MAX_SPEED = 300; // pixels/sec
const BULLET_SPEED = 500; // pixels/sec
const BULLET_LIFETIME = 1.5; // seconds
const BULLET_RADIUS = 2;
const ASTEROID_SPEED = 80; // pixels/sec
const ASTEROID_SIZE = 40;
const INVINCIBILITY_DURATION = 3; // seconds
const PARTICLE_RADIUS = 3;
const PARTICLE_COLLECT_RADIUS = 20;

// Game state
let canvas, ctx;
let ship = {};
let bullets = [];
let asteroids = [];
let score = 0;
let lives = 3;
let level = 1;
let smartBombs = 3;
let highScore = 0;
let gameOver = false;
let keys = {};
let lastShotTime = 0;
let lastFrameTime = 0;
let gameLoopId;
let isInvincible = false;
let invincibleTimer = 0;
let particles = [];
let letters = [];
let collectedLetters = '';
let foundWords = [];
let wordScore = 0;
let DICTIONARY = [];

// Scrabble letter values
const LETTER_VALUES = {
    'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4, 'I': 1,
    'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3, 'Q': 10, 'R': 1,
    'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8, 'Y': 4, 'Z': 10
};



// Visuals
let stars = [];
const NUM_STARS = 100;

// DOM elements
let startScreen, gameOverScreen, startButton, restartButton, finalScoreElement, gameContainer, scoreDisplay, livesDisplay, highScoreDisplay, touchControls;

// Main entry point - runs when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Fetch the dictionary first, then initialize the game
    fetch('dictionary.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Dictionary not found');
            }
            return response.json();
        })
        .then(data => {
            DICTIONARY = data.map(word => word.toUpperCase());
        })
        .catch(() => {
            console.warn('Could not load dictionary.json. Using a small fallback list.');
            // Fallback to a minimal dictionary if the fetch fails
            DICTIONARY = ['ACE', 'BAD', 'CAT', 'DOG', 'EAT', 'FUN', 'GOT', 'HAT', 'ICE', 'JOY', 'KIT', 'LET', 'MAP', 'NET', 'ODD', 'PAT', 'RED', 'SIT', 'TOP', 'USE', 'VAN', 'WET', 'YES', 'ZIP', 'GOOD', 'STAR', 'TIME', 'WORD', 'GAME', 'PLAY', 'SHIP', 'ROCK', 'FAST', 'SLOW', 'HIGH', 'DOWN', 'OVER', 'UNDER', 'SPACE'];
        })
        .finally(() => {
            // Whether the dictionary loaded or not, initialize the game
            initializeGame();
        });
});

// Sets up the entire game environment, canvases, and event listeners
function initializeGame() {
    try {
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;

        // Assign DOM elements
        startScreen = document.getElementById('start-screen');
        gameOverScreen = document.getElementById('game-over');
        startButton = document.getElementById('start-button');
        restartButton = document.getElementById('restart-button');
        finalScoreElement = document.getElementById('final-score');
        gameContainer = document.getElementById('game-container');
        touchControls = document.getElementById('touch-controls');

        // Create and append HUD elements
        scoreDisplay = document.createElement('div');
        scoreDisplay.id = 'score-display';
        gameContainer.appendChild(scoreDisplay);

        livesDisplay = document.createElement('div');
        livesDisplay.id = 'lives-display';
        gameContainer.appendChild(livesDisplay);

        highScoreDisplay = document.createElement('div');
        highScoreDisplay.id = 'high-score-display';
        gameContainer.appendChild(highScoreDisplay);

        // Word-building UI is now in HTML; no need to create it here.

        // Load high score from local storage
        const savedHighScore = localStorage.getItem('asteroidsHighScore');
        if (savedHighScore) {
            highScore = parseInt(savedHighScore, 10);
        }

        // Attach all event listeners
        attachEventListeners();

        // Create stars for parallax effect
        for (let i = 0; i < NUM_STARS; i++) {
            stars.push({
                x: Math.random() * CANVAS_WIDTH,
                y: Math.random() * CANVAS_HEIGHT,
                radius: Math.random() * 1.5,
                depth: Math.random() * 0.5 + 0.1
            });
        }

        // Perform initial resize and render
        resizeGame();
        updateDisplays();
        draw(); // Draw the initial state (start screen)
        console.log('Game initialized successfully.');

    } catch (err) {
        console.error('Error in initializeGame():', err);
        alert('Error initializing game: ' + err.message);
    }
}

// Removed createWordUI. The letter rack, words display, and word score display are now in HTML.

function attachEventListeners() {
    if (startButton) startButton.addEventListener('click', startGame);
    if (restartButton) restartButton.addEventListener('click', startGame);

    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);

    // Touch controls for mobile
    if (touchControls) {
        const touchButtons = touchControls.querySelectorAll('.touch-btn');
        touchButtons.forEach(btn => {
            const key = btn.getAttribute('data-key');
            // Use mousedown/up for better responsiveness and to avoid conflicts
            btn.addEventListener('mousedown', (e) => { e.preventDefault(); keys[key] = true; });
            btn.addEventListener('mouseup', (e) => { e.preventDefault(); keys[key] = false; });
            btn.addEventListener('mouseleave', (e) => { e.preventDefault(); keys[key] = false; });
            // Add touch events for mobile devices
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
        });
    }

    window.addEventListener('resize', resizeGame);
}


// Start or restart the game
function startGame() {
    try {
        
        

        // Reset game state
        gameOver = false;
        score = 0;
        wordScore = 0;
        level = 1;
        lives = 3;
        smartBombs = 1;
        collectedLetters = '';
        foundWords = [];
        ship.x = CANVAS_WIDTH / 2;
        ship.y = CANVAS_HEIGHT / 2;
        ship.dx = 0;
        ship.dy = 0;
        ship.rotation = 0;
        bullets = [];
        asteroids = [];
        particles = [];
        letters = [];
        createAsteroids(level + 2);
        resetShip();

        // Hide screens
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');

        // Start game loop
        lastFrameTime = performance.now();
        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        gameLoopId = requestAnimationFrame(runGameLoop);

        updateDisplays();
    } catch (err) {
        console.error('Error in startGame():', err);
        alert('Error starting game: ' + err.message);
    }
}

// Main game loop function
function runGameLoop(timestamp) {
    if (gameOver) return;

    const deltaTime = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;

    update(deltaTime);
    draw();

    gameLoopId = requestAnimationFrame(runGameLoop);
}

// Reset ship to center of screen
function resetShip() {
    ship = {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        dx: 0, dy: 0, rotation: 0,
        radius: SHIP_SIZE / 2,
        isThrusting: false
    };
    isInvincible = true;
    invincibleTimer = INVINCIBILITY_DURATION;
}

// Create asteroids
function createAsteroids(count) {
    for (let i = 0; i < count; i++) {
        let x, y;
        do {
            x = Math.random() * CANVAS_WIDTH;
            y = Math.random() * CANVAS_HEIGHT;
        } while (Math.hypot(x - ship.x, y - ship.y) < 150);

        asteroids.push(newAsteroid(x, y, ASTEROID_SIZE + Math.random() * 10));
    }
}

function newAsteroid(x, y, radius) {
    return {
        x, y, radius,
        dx: (Math.random() - 0.5) * ASTEROID_SPEED,
        dy: (Math.random() - 0.5) * ASTEROID_SPEED,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        rotationY: 0,
        rotationSpeedY: (Math.random() - 0.5) * 0.1,
        color: `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`
    };
}

function splitAsteroid(asteroid, index) {
    const newRadius = asteroid.radius / 2;
    spawnLetter(asteroid.x, asteroid.y);
    asteroids.splice(index, 1);

    if (newRadius >= 10) {
        asteroids.push(newAsteroid(asteroid.x, asteroid.y, newRadius));
        asteroids.push(newAsteroid(asteroid.x, asteroid.y, newRadius));
    }
}

function spawnLetter(x, y) {
    const char = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    letters.push({
        x, y,
        dx: (Math.random() - 0.5) * 60,
        dy: (Math.random() - 0.5) * 60,
        radius: 12,
        char,
        life: 10
    });
}

// Handle key events
function keyDownHandler(e) {
    keys[e.key] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }
}

function keyUpHandler(e) {
    keys[e.key] = false;
}

// Update game state
function update(deltaTime) {
    // Ship controls
    if (keys['ArrowLeft']) ship.rotation -= SHIP_TURN_SPEED * deltaTime;
    if (keys['ArrowRight']) ship.rotation += SHIP_TURN_SPEED * deltaTime;

    if (keys['ArrowUp']) {
        const thrustAngle = ship.rotation - Math.PI / 2;
        ship.dx += Math.cos(thrustAngle) * SHIP_THRUST * deltaTime;
        ship.dy += Math.sin(thrustAngle) * SHIP_THRUST * deltaTime;
        if (!ship.isThrusting) {
            ship.isThrusting = true;
            
        }
    } else {
        if (ship.isThrusting) {
            ship.isThrusting = false;

        }
    }

    // Apply friction and limit speed
    ship.dx -= SHIP_FRICTION * ship.dx * deltaTime;
    ship.dy -= SHIP_FRICTION * ship.dy * deltaTime;
    const speed = Math.hypot(ship.dx, ship.dy);
    if (speed > SHIP_MAX_SPEED) {
        ship.dx = (ship.dx / speed) * SHIP_MAX_SPEED;
        ship.dy = (ship.dy / speed) * SHIP_MAX_SPEED;
    }

    // Update position and wrap around screen
    ship.x += ship.dx * deltaTime;
    ship.y += ship.dy * deltaTime;
    wrapObject(ship);

    // Shooting
    if (keys[' '] && Date.now() - lastShotTime > 200) {
        shoot();
        lastShotTime = Date.now();
    }

    // Smart Bomb
    if (keys['b'] && smartBombs > 0) {
        activateSmartBomb();
        keys['b'] = false;
    }

    // Update bullets, asteroids, letters, particles
    updateObjects(bullets, deltaTime);
    updateObjects(asteroids, deltaTime);
    updateLetters(deltaTime);
    updateParticles(deltaTime);
    updateStars(deltaTime);


    // Collision detection
    handleCollisions();

    // Invincibility timer
    if (isInvincible) {
        invincibleTimer -= deltaTime;
        if (invincibleTimer <= 0) {
            isInvincible = false;
        }
    }

    // Level completion
    if (asteroids.length === 0 && !gameOver) {
        level++;
        
        createAsteroids(level + 2);
    }
}

function updateObjects(objects, deltaTime) {
    for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        obj.x += obj.dx * deltaTime;
        obj.y += obj.dy * deltaTime;
        if (obj.rotationSpeed) obj.rotation += obj.rotationSpeed * deltaTime;
        if (obj.rotationSpeedY) obj.rotationY += obj.rotationSpeedY * deltaTime;
        if (obj.lifetime) {
            obj.lifetime -= deltaTime;
            if (obj.lifetime <= 0) {
                objects.splice(i, 1);
                continue;
            }
        }
        wrapObject(obj);
    }
}

function updateLetters(deltaTime) {
    for (let i = letters.length - 1; i >= 0; i--) {
        const l = letters[i];
        l.x += l.dx * deltaTime;
        l.y += l.dy * deltaTime;
        l.life -= deltaTime;
        wrapObject(l);

        if (isColliding(ship, l)) {
            collectedLetters += l.char;
            letters.splice(i, 1);

            updateLetterRack();
            if (collectedLetters.length >= 3) {
                checkWord(null, true); // Auto-check for valid words
            }
        } else if (l.life <= 0) {
            letters.splice(i, 1);
        }
    }
}

function updateParticles(deltaTime) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= deltaTime;
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        p.x += p.dx * deltaTime;
        p.y += p.dy * deltaTime;

        if (p.text) { // Floating text
            p.opacity = Math.max(0, p.life);
        } else if (p.type === 'collectible') { // Score particles
            const dist = Math.hypot(ship.x - p.x, ship.y - p.y);
            if (dist < PARTICLE_COLLECT_RADIUS + ship.radius) {
                score += 10;
    
                particles.splice(i, 1);
                updateDisplays();
            }
        }
    }
}

function updateStars(deltaTime) {
    stars.forEach(star => {
        star.x -= ship.dx * star.depth * 0.1 * deltaTime;
        star.y -= ship.dy * star.depth * 0.1 * deltaTime;
        if (star.x < 0) star.x = CANVAS_WIDTH;
        if (star.x > CANVAS_WIDTH) star.x = 0;
        if (star.y < 0) star.y = CANVAS_HEIGHT;
        if (star.y > CANVAS_HEIGHT) star.y = 0;
    });
}


function handleCollisions() {
    // Bullet-asteroid collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = asteroids.length - 1; j >= 0; j--) {
            if (isColliding(bullets[i], asteroids[j])) {
                score += Math.floor(100 / (asteroids[j].radius / 20));
                
                createExplosion(asteroids[j].x, asteroids[j].y, asteroids[j].color);
                splitAsteroid(asteroids[j], j);
                bullets.splice(i, 1);
                updateDisplays();
                break;
            }
        }
    }

    // Ship-asteroid collisions
    if (!isInvincible) {
        for (let i = 0; i < asteroids.length; i++) {
            if (isColliding(ship, asteroids[i])) {
                lives--;
                createExplosion(ship.x, ship.y, 'white', 30);
                
                if (lives <= 0) {
                    endGame();
                } else {
                    resetShip();
                }
                updateDisplays();
                break;
            }
        }
    }
}

function isColliding(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.hypot(dx, dy);
    return distance < obj1.radius + obj2.radius;
}

function endGame() {
    gameOver = true;
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('asteroidsHighScore', highScore.toString());
    }
    gameOverScreen.classList.remove('hidden');
    finalScoreElement.textContent = score;
    updateDisplays();
}

function shoot() {
    const launchAngle = ship.rotation - Math.PI / 2;
    const offset = SHIP_SIZE * 0.6;

    bullets.push({
        x: ship.x + Math.cos(launchAngle) * offset,
        y: ship.y + Math.sin(launchAngle) * offset,
        dx: Math.cos(launchAngle) * BULLET_SPEED + ship.dx,
        dy: Math.sin(launchAngle) * BULLET_SPEED + ship.dy,
        lifetime: BULLET_LIFETIME,
        radius: BULLET_RADIUS
    });
    
}

function activateSmartBomb() {
    smartBombs--;
    asteroids.forEach(ast => createExplosion(ast.x, ast.y, ast.color, 5));
    asteroids = [];
    score += 50 * level;
    
    updateDisplays();
}

function wrapObject(obj) {
    const r = obj.radius || 0;
    if (obj.x < -r) obj.x = CANVAS_WIDTH + r;
    if (obj.x > CANVAS_WIDTH + r) obj.x = -r;
    if (obj.y < -r) obj.y = CANVAS_HEIGHT + r;
    if (obj.y > CANVAS_HEIGHT + r) obj.y = -r;
}

function calculateWordScore(word) {
    let total = word.split('').reduce((sum, letter) => sum + (LETTER_VALUES[letter] || 1), 0);
    if (word.length >= 5) total *= 2;
    if (word.length >= 7) total *= 2;
    return total;
}

function updateLetterRack() {
    const letterRack = document.getElementById('letter-rack');
    if (!letterRack) return;
    letterRack.innerHTML = '';

    for (const letter of collectedLetters) {
        const letterTile = document.createElement('div');
        letterTile.className = 'letter-tile';
        letterTile.textContent = letter;

        const pointValue = document.createElement('span');
        pointValue.className = 'point-value';
        pointValue.textContent = LETTER_VALUES[letter] || '1';
        letterTile.appendChild(pointValue);

        letterRack.appendChild(letterTile);
    }

    const wordsDisplay = document.getElementById('words-display');
    if (wordsDisplay) wordsDisplay.textContent = foundWords.join(' • ');

    const wordScoreDisplay = document.getElementById('word-score-display');
    if (wordScoreDisplay) wordScoreDisplay.textContent = `Word Score: ${wordScore}`;
}

function checkWord(event, autoCheck = false) {
    if (collectedLetters.length === 0 || (autoCheck && collectedLetters.length < 3)) return;

    const word = collectedLetters;
    if (DICTIONARY.includes(word)) {
        const points = calculateWordScore(word);
        score += points;
        wordScore += points;
        createFloatingText(`+${points}`, ship.x, ship.y - 30, 'gold', 1.5);
        foundWords.push(word);
        collectedLetters = '';
        
        updateLetterRack();
        updateDisplays();
    
        } else if (!autoCheck) {
        const letterRack = document.getElementById('letter-rack');
    }
}

function createFloatingText(text, x, y, color, duration) {
    particles.push({
        text, x, y, color,
        life: duration,
        opacity: 1,
        dx: 0,
        dy: -40
    });
}

function updateDisplays() {
    scoreDisplay.textContent = `Score: ${score} | Level: ${level}`;
    highScoreDisplay.textContent = `High Score: ${highScore}`;
    livesDisplay.textContent = `Lives: ${'♥'.repeat(lives)} | Bombs: ${'♦'.repeat(smartBombs)}`;
}

// Draw game objects
function draw() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawStars();
    drawShip();
    drawAsteroids();
    drawLetters();
    drawBullets();
    drawParticles();
}

function drawStars() {
    ctx.fillStyle = 'white';
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.globalAlpha = star.depth * 1.8;
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;
}

function drawShip() {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.rotation);

    if (ship.isThrusting && Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.fillStyle = 'yellow';
        ctx.font = `bold ${ship.radius * 1.5}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('W', 0, ship.radius * 1.2);
    }

    ctx.font = `bold ${ship.radius * 2}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = (isInvincible && Math.floor(Date.now() / 150) % 2 === 0) ? 'grey' : 'white';
    ctx.fillText('A', 0, 0);

    ctx.restore();
}

function drawAsteroids() {
    asteroids.forEach(asteroid => {
        ctx.save();
        ctx.translate(asteroid.x, asteroid.y);
        ctx.rotate(asteroid.rotation);
        const scaleX = Math.cos(asteroid.rotationY);
        ctx.scale(scaleX, 1);
        ctx.font = `bold ${asteroid.radius * 2}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = asteroid.color;
        ctx.fillText('@', 0, 0);
        ctx.restore();
    });
}

function drawLetters() {
    ctx.fillStyle = 'lightgreen';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    letters.forEach(l => {
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.fillText(l.char, 0, 0);
        ctx.restore();
    });
}

function drawBullets() {
    ctx.fillStyle = 'yellow';
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

function createExplosion(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
        const isCollectible = Math.random() < 0.3;
        particles.push({
            x, y,
            dx: (Math.random() - 0.5) * (isCollectible ? 50 : 150),
            dy: (Math.random() - 0.5) * (isCollectible ? 50 : 150),
            life: Math.random() * (isCollectible ? 5 : 1) + (isCollectible ? 3 : 0.5),
            radius: isCollectible ? PARTICLE_RADIUS : Math.random() * 2 + 1,
            color: isCollectible ? 'gold' : color,
            type: isCollectible ? 'collectible' : 'explosion'
        });
    }
}

function drawParticles() {
    for (const p of particles) {
        if (p.text) {
            ctx.save();
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y);
            ctx.restore();
        } else {
            ctx.globalAlpha = Math.min(1, Math.max(0, p.life / 2));
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1.0;
}



// --- Game Setup ---
function resizeGame() {
    const scale = Math.min(window.innerWidth / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT);
    if (gameContainer) {
        gameContainer.style.transform = `scale(${scale})`;
    }
}