window.onload = function () {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas not found!');
        return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Canvas context not available!');
        return;
    }

    // Audio setup
    const backgroundMusic = document.getElementById('backgroundMusic');
    const enemySound = document.getElementById('enemySound');
    const powerupSound = document.getElementById('powerupSound');
    const gameoverSound = document.getElementById('gameoverSound');
    const foodSound = document.getElementById('foodSound');

    if (!backgroundMusic) console.error('Background music not found!');
    if (!enemySound) console.error('Enemy sound not found!');
    if (!powerupSound) console.error('Power-up sound not found!');
    if (!gameoverSound) console.error('Game over sound not found!');
    if (!foodSound) console.error('Food sound not found!');

    [backgroundMusic, enemySound, powerupSound, gameoverSound, foodSound].forEach(audio => {
        if (audio) {
            audio.addEventListener('loadeddata', () => console.log(`${audio.id} loaded, duration: ${audio.duration}`));
            audio.addEventListener('error', (e) => console.error(`${audio.id} error:`, e));
        }
    });
    if (backgroundMusic) {
        backgroundMusic.addEventListener('ended', () => console.log('Background music ended (event)'));
    }
    let musicStarted = false;

    // Link setup
    const xLink = document.getElementById('xLink');
    if (!xLink) console.error('X link not found!');

    // Initial render
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    console.log('Canvas initialized');

    // Game properties
    const snake = [{ x: 400, y: 400 }];
    let direction = { x: 10, y: 0 };
    const speed = 10;
    const foods = [];
    let score = 0;
    let speedScore = 0;
    let gameSpeed = 150;
    let enemy = null;
    let enemyInterval = null;
    const powerUps = [];
    let powerUpVisible = true;
    let gameOver = false;
    let gameStarted = false;
    let foodEaten = 0;
    let enemiesKilled = 0;
    const pinCode = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
    const enteredCode = [];
    let lastFrameTime = 0;

    spawnFood();

    document.addEventListener('keydown', handleKeyPress);

    function handleKeyPress(event) {
        const key = event.key;
        if (!gameStarted) {
            if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
                console.log('Game started via key press:', key);
                gameStarted = true;
                if (backgroundMusic) {
                    backgroundMusic.play().then(() => {
                        console.log('Music started on game start');
                        musicStarted = true;
                        updatePlaybackSpeed();
                    }).catch(err => console.error('Music play failed:', err));
                }
            }
        } else if (gameOver) {
            enteredCode.push(key);
            console.log(`Pin code input: ${enteredCode}`);
            if (enteredCode.length > 4) {
                enteredCode.length = 0;
                enteredCode.push(key);
            }
            if (enteredCode.length === 4) {
                if (enteredCode.join('') === pinCode.join('')) {
                    console.log('Pin code correct, returning to title screen');
                    resetGame();
                    gameOver = false;
                    gameStarted = false;
                } else {
                    console.log('Pin code incorrect, resetting input');
                    enteredCode.length = 0;
                }
            }
        } else {
            if (key === 'ArrowUp' && direction.y === 0) {
                direction = { x: 0, y: -speed };
            } else if (key === 'ArrowDown' && direction.y === 0) {
                direction = { x: 0, y: speed };
            } else if (key === 'ArrowLeft' && direction.x === 0) {
                direction = { x: -speed, y: 0 };
            } else if (key === 'ArrowRight' && direction.x === 0) {
                direction = { x: speed, y: 0 };
            }
        }
    }

    function spawnFood() {
        console.log('Spawning food');
        let attempts = 0;
        const maxAttempts = 100;
        while (attempts < maxAttempts) {
            const newFood = {
                x: Math.floor(Math.random() * (canvas.width / speed)) * speed,
                y: Math.floor(Math.random() * (canvas.height / speed)) * speed
            };
            if (!snake.some(seg => seg.x === newFood.x && seg.y === newFood.y)) {
                if (!isOccupied(newFood.x, newFood.y, false)) {
                    foods.push(newFood);
                    break;
                }
            }
            attempts++;
        }
        if (score >= 6 && foods.length < 2 && Math.random() < 0.5) {
            attempts = 0;
            while (attempts < maxAttempts) {
                const secondFood = {
                    x: Math.floor(Math.random() * (canvas.width / speed)) * speed,
                    y: Math.floor(Math.random() * (canvas.height / speed)) * speed
                };
                if (!snake.some(seg => seg.x === secondFood.x && seg.y === secondFood.y)) {
                    if (!isOccupied(secondFood.x, secondFood.y, false)) {
                        foods.push(secondFood);
                        break;
                    }
                }
                attempts++;
            }
        }
        if (attempts >= maxAttempts) console.warn('Failed to spawn food after max attempts');
    }

    function spawnEnemy() {
        console.log('Attempting to spawn enemy');
        let attempts = 0;
        const maxAttempts = 100;
        const newEnemy = {
            x: Math.floor(Math.random() * (canvas.width / speed)) * speed,
            y: Math.floor(Math.random() * (canvas.height / speed)) * speed
        };
        while (attempts < maxAttempts && snake.some(seg => seg.x === newEnemy.x && seg.y === newEnemy.y)) {
            newEnemy.x = Math.floor(Math.random() * (canvas.width / speed)) * speed;
            newEnemy.y = Math.floor(Math.random() * (canvas.height / speed)) * speed;
            attempts++;
        }
        if (attempts < maxAttempts && !isOccupied(newEnemy.x, newEnemy.y, true)) {
            enemy = newEnemy;
            if (!enemyInterval) {
                enemyInterval = setInterval(() => {
                    console.log('Enemy moving');
                    moveEnemy();
                }, 1000);
            }
            console.log(`Enemy spawned at (${enemy.x}, ${enemy.y})`);
            if (enemySound) {
                enemySound.currentTime = 0;
                enemySound.play().catch(err => console.error('Enemy sound play failed:', err));
            }
        } else {
            console.warn('Failed to spawn enemy after max attempts or spot occupied');
            enemy = null;
        }
    }

    function moveEnemy() {
        if (!enemy) return;
        const head = snake[0];
        if (enemy.x < head.x) enemy.x += speed;
        else if (enemy.x > head.x) enemy.x -= speed;
        if (enemy.y < head.y) enemy.y += speed;
        else if (enemy.y > head.y) enemy.y -= speed;
    }

    function spawnPowerUp() {
        if (score >= 9 && score % 9 === 0 && Math.random() < 0.5) {
            console.log('Attempting to spawn power-up');
            const types = ['slowdown', 'enemyKiller'];
            const type = types[Math.floor(Math.random() * types.length)];
            let attempts = 0;
            const maxAttempts = 100;
            const newPowerUp = {
                x: Math.floor(Math.random() * (canvas.width / speed)) * speed,
                y: Math.floor(Math.random() * (canvas.height / speed)) * speed,
                type: type
            };
            while (attempts < maxAttempts && snake.some(seg => seg.x === newPowerUp.x && seg.y === newPowerUp.y)) {
                newPowerUp.x = Math.floor(Math.random() * (canvas.width / speed)) * speed;
                newPowerUp.y = Math.floor(Math.random() * (canvas.height / speed)) * speed;
                attempts++;
            }
            if (attempts < maxAttempts && !isOccupied(newPowerUp.x, newPowerUp.y, true)) {
                powerUps.push(newPowerUp);
                console.log(`Spawned power-up: ${type} at (${newPowerUp.x}, ${newPowerUp.y})`);
            } else {
                console.warn('Failed to spawn power-up after max attempts or spot occupied');
            }
        }
    }

    function isOccupied(x, y, excludeSnake) {
        if (!excludeSnake && snake.some(seg => seg.x === x && seg.y === y)) return true;
        return foods.some(f => f.x === x && f.y === y) ||
               powerUps.some(p => p.x === x && p.y === y) ||
               (enemy && enemy.x === x && enemy.y === y);
    }

    function updateSpeed() {
        if (speedScore >= 10) {
            gameSpeed = 50;
            if (backgroundMusic) backgroundMusic.playbackRate = 1.25; // Fast
        } else if (speedScore >= 5) {
            gameSpeed = 100;
            if (backgroundMusic) backgroundMusic.playbackRate = 1.0;  // Medium
        } else {
            gameSpeed = 150;
            if (backgroundMusic) backgroundMusic.playbackRate = 0.75; // Slow
        }
        console.log(`Game speed: ${gameSpeed}, Playback rate: ${backgroundMusic ? backgroundMusic.playbackRate : 'N/A'}`);
    }

    function updatePlaybackSpeed() {
        if (backgroundMusic) {
            if (speedScore >= 10) {
                backgroundMusic.playbackRate = 1.25; // Fast
            } else if (speedScore >= 5) {
                backgroundMusic.playbackRate = 1.0;  // Medium
            } else {
                backgroundMusic.playbackRate = 0.75; // Slow
            }
            console.log(`Playback rate set to: ${backgroundMusic.playbackRate}`);
        }
    }

    function applyPowerUp(powerUp) {
        console.log(`Applying power-up: ${powerUp.type}`);
        if (powerUp.type === 'slowdown') {
            speedScore = 0;
            updateSpeed();
        } else if (powerUp.type === 'enemyKiller') {
            if (enemyInterval) {
                clearInterval(enemyInterval);
                enemyInterval = null;
            }
            if (enemy) {
                enemy = null;
                enemiesKilled += 1;
            }
        }
    }

    function drawOpeningScreen() {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#00ff00'; // Green for "Snake Plus"
        ctx.font = '60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Snake Plus', canvas.width / 2, canvas.height / 2 - 50);

        // Overlay clickable link
        if (xLink) {
            xLink.style.left = `${canvas.offsetLeft + canvas.width / 2 - xLink.offsetWidth / 2}px`;
            xLink.style.top = `${canvas.offsetTop + canvas.height / 2 - 10}px`;
            xLink.style.display = 'block';
        }

        ctx.fillStyle = '#ffffff'; // White for instructions
        ctx.font = '24px Arial';
        ctx.fillText('Press any arrow key to start', canvas.width / 2, canvas.height / 2 + 100);
        ctx.fillText('(Up, Down, Left, Right)', canvas.width / 2, canvas.height / 2 + 140);
    }

    function drawGame() {
        console.log('Drawing game frame');
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#00ff00';
        snake.forEach(segment => {
            ctx.fillRect(segment.x, segment.y, speed - 1, speed - 1);
        });

        ctx.fillStyle = '#ff3333';
        foods.forEach(food => {
            ctx.fillRect(food.x, food.y, speed - 1, speed - 1);
        });

        if (enemy) {
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(enemy.x, enemy.y, speed - 1, speed - 1);
        }

        powerUps.forEach(powerUp => {
            if (powerUpVisible) {
                ctx.fillStyle = powerUp.type === 'slowdown' ? '#00ffff' : '#ff00ff';
                ctx.fillRect(powerUp.x, powerUp.y, speed - 1, speed - 1);
            }
        });
        powerUpVisible = !powerUpVisible;

        const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

        if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
            console.log('Snake hit wall');
            gameOver = true;
            stopMusic();
            if (gameoverSound) {
                gameoverSound.currentTime = 0;
                gameoverSound.play().catch(err => console.error('Game over sound play failed:', err));
            }
            return;
        }

        if (snake.some((seg, i) => i > 0 && seg.x === head.x && seg.y === head.y)) {
            console.log('Snake hit itself');
            gameOver = true;
            stopMusic();
            if (gameoverSound) {
                gameoverSound.currentTime = 0;
                gameoverSound.play().catch(err => console.error('Game over sound play failed:', err));
            }
            return;
        }

        if (enemy && snake.some(seg => seg.x === enemy.x && seg.y === enemy.y)) {
            console.log('Enemy hit snake');
            gameOver = true;
            stopMusic();
            if (gameoverSound) {
                gameoverSound.currentTime = 0;
                gameoverSound.play().catch(err => console.error('Game over sound play failed:', err));
            }
            return;
        }

        snake.unshift(head);

        console.log('Checking food collision');
        const foodEatenIndex = foods.findIndex(f => f.x === head.x && f.y === head.y);
        if (foodEatenIndex !== -1) {
            console.log('Food eaten');
            score += 1;
            speedScore += 1;
            foodEaten += 1;
            foods.splice(foodEatenIndex, 1);
            spawnFood();
            updateSpeed();
            if (score >= 6 && !enemy) spawnEnemy();
            spawnPowerUp();
            if (foodSound) {
                foodSound.currentTime = 0;
                foodSound.play().catch(err => console.error('Food sound play failed:', err));
            }
        } else {
            snake.pop();
        }

        const powerUpEatenIndex = powerUps.findIndex(p => p.x === head.x && p.y === head.y);
        if (powerUpEatenIndex !== -1) {
            applyPowerUp(powerUps[powerUpEatenIndex]);
            powerUps.splice(powerUpEatenIndex, 1);
            if (powerupSound) {
                powerupSound.currentTime = 0;
                powerupSound.play().catch(err => console.error('Power-up sound play failed:', err));
            }
        }
    }

    function stopMusic() {
        if (backgroundMusic) {
            backgroundMusic.pause();
            backgroundMusic.currentTime = 0;
            console.log('Music stopped and reset on death');
        }
    }

    function drawDeathScreen() {
        console.log('Drawing death screen');
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#00ff00'; // Green for "Snake Plus"
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Snake Plus', canvas.width / 2, 100);

        // Overlay clickable link
        if (xLink) {
            xLink.style.left = `${canvas.offsetLeft + canvas.width / 2 - xLink.offsetWidth / 2}px`;
            xLink.style.top = `${canvas.offsetTop + 110}px`; // Below "Snake Plus"
            xLink.style.display = 'block';
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = '40px Arial';
        ctx.fillText('Game Over', canvas.width / 2, 200);

        const foodPoints = foodEaten * 100;
        const enemyPoints = enemiesKilled * 333;
        const totalScore = foodPoints + enemyPoints;
        ctx.font = '20px Arial';
        ctx.fillText(`Food Eaten: ${foodEaten} x 100 = ${foodPoints}`, canvas.width / 2, 260);
        ctx.fillText(`Enemies Killed: ${enemiesKilled} x 333 = ${enemyPoints}`, canvas.width / 2, 300);
        ctx.fillText(`Total Score: ${totalScore}`, canvas.width / 2, 340);

        ctx.fillStyle = '#00ff00';
        snake.forEach((seg, i) => {
            seg.x = 400 - Math.floor(snake.length / 2) * speed + i * speed;
            seg.y = 390; // Shifted down
            ctx.fillRect(seg.x, seg.y, speed - 1, speed - 1);
        });

        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.fillText('To Play Again, Enter: Up, Right, Down, Left', canvas.width / 2, canvas.height - 100);

        const slotWidth = 40;
        const slotHeight = 40;
        const startX = canvas.width / 2 - (slotWidth * 4 + 10 * 3) / 2;
        for (let i = 0; i < 4; i++) {
            ctx.strokeStyle = '#ffffff';
            ctx.strokeRect(startX + i * (slotWidth + 10), canvas.height - 60, slotWidth, slotHeight);
            if (i < enteredCode.length) {
                ctx.fillStyle = '#ffffff';
                ctx.font = '16px Arial';
                ctx.fillText(enteredCode[i].replace('Arrow', ''), startX + i * (slotWidth + 10) + slotWidth / 2, canvas.height - 30);
            }
        }
    }

    function resetGame() {
        snake.length = 1;
        snake[0] = { x: 400, y: 400 };
        direction = { x: 10, y: 0 };
        score = 0;
        speedScore = 0;
        gameSpeed = 150;
        foods.length = 0;
        foodEaten = 0;
        enemiesKilled = 0;
        spawnFood();
        if (enemyInterval) {
            clearInterval(enemyInterval);
            enemyInterval = null;
        }
        enemy = null;
        powerUps.length = 0;
        enteredCode.length = 0;
        musicStarted = false;
        if (backgroundMusic) {
            backgroundMusic.currentTime = 0;
            backgroundMusic.playbackRate = 0.75;
            console.log('Music reset for next start');
        }
    }

    function gameLoop(timestamp) {
        if (!timestamp) timestamp = performance.now();
        if (timestamp - lastFrameTime < gameSpeed) {
            requestAnimationFrame(gameLoop);
            return;
        }
        lastFrameTime = timestamp;

        if (!gameStarted) {
            drawOpeningScreen();
        } else if (gameOver) {
            drawDeathScreen();
        } else {
            if (xLink) xLink.style.display = 'none'; // Hide link during gameplay
            drawGame();
            if (musicStarted && backgroundMusic && backgroundMusic.currentTime >= backgroundMusic.duration - 0.1) {
                console.log('Audio reached end via polling');
                backgroundMusic.currentTime = 0;
                backgroundMusic.play().then(() => console.log('Music looped via polling'))
                                     .catch(err => console.error('Loop failed:', err));
            }
        }
        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
};