// =============================================
// SIMPLE GAME ENGINE v3 - Mobile Controls Added
// =============================================
// This version adds on-screen mobile controls (HTML buttons)
// and listens for both keyboard and touch input.
//
// CONTROLS: Arrow keys / WASD / On-screen buttons
// =============================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// -- Configuration (same as v2, update as needed) --
const MAP_PATH = './GameBoy/map.json';
const MAP_SPRITESHEET = './GameBoy/spritesheet.png';
const PLAYER_SPRITESHEET = './Player/mario.png';

const player = {
    x: 50,
    y: 0,
    width: 25,
    height: 45,
    speed: 3,
    sprintSpeed: 7,
    jumpForce: 8,
    velX: 0,
    velY: 0,
    direction: 'right',
    onGround: false,
    currentAction: 'idle',
    isCrouching: false,
    isAttacking: false,
    hitboxPadX: 0, // Horizontal hitbox padding (can be negative or positive)
    hitboxPadY: 0, // Vertical hitbox padding (can be negative or positive)
    hitboxPadW: 0, // Width adjustment (can be negative or positive)
    hitboxPadH: -6  // Height adjustment (can be negative or positive)
};

const GRAVITY = 0.5;
const DRAW_SCALE = 0.18;

const rawFrames = {
    idle: [{ x: 32, y: 19, w: 77, h: 106 }],
    walk: [
        { x: 32, y: 19, w: 77, h: 106 },
        { x: 164, y: 19, w: 77, h: 106 },
        { x: 290, y: 19, w: 77, h: 106 },
        { x: 419, y: 19, w: 77, h: 106 },
        { x: 545, y: 19, w: 77, h: 106 },
        { x: 670, y: 19, w: 77, h: 106 },
        { x: 803, y: 19, w: 77, h: 106 },
        { x: 928, y: 19, w: 77, h: 106 },
        { x: 1056, y: 19, w: 77, h: 106 }],
    jump: [{ x: 25, y: 1166, w: 94, h: 104 }, { x: 153, y: 1166, w: 94, h: 104 }, { x: 282, y: 1166, w: 94, h: 104 }, { x: 415, y: 1166, w: 94, h: 104 }]
};
const frames = rawFrames;
const animation = { frameIndex: 0, frameTimer: 0, delays: { idle: 10, walk: 8, jump: 6 } };

// -- Engine variables (same as v2) --
let tileSize = 16;
let mapWidth = 50;
let mapHeight = 30;
let layers = [];
let collisionTiles = [];
let trapTiles = [];
let spawnPoint = null;
let useFallback = false;
let errorMessages = [];

const mapSpritesheet = new Image();
const playerSpritesheet = new Image();
const camera = { x: 0, y: 0 };
const keys = {};
const mobileInput = { left: false, right: false, jump: false, sprint: false, crouch: false, attack: false };

// =====================
// INPUT (Keyboard + Mobile)
// =====================
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function getInput() {
    return {
        left: keys['ArrowLeft'] || keys['KeyA'] || mobileInput.left,
        right: keys['ArrowRight'] || keys['KeyD'] || mobileInput.right,
        jump: keys['ArrowUp'] || keys['KeyW'] || keys['Space'] || mobileInput.jump,
        sprint: keys['ShiftLeft'] || keys['ShiftRight'] || mobileInput.sprint,
        crouch: keys['ArrowDown'] || keys['KeyS'] || mobileInput.crouch,
        attack: keys['KeyX'] || keys['KeyJ'] || mobileInput.attack
    };
}

// -- Mobile control event listeners --
function setupMobileControls() {
    const btns = [
        { id: 'btn-left', prop: 'left' },
        { id: 'btn-right', prop: 'right' },
        { id: 'btn-jump', prop: 'jump' },
        { id: 'btn-sprint', prop: 'sprint' },
        { id: 'btn-crouch', prop: 'crouch' },
        { id: 'btn-attack', prop: 'attack' }
    ];
    btns.forEach(({ id, prop }) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        // Touch events
        btn.addEventListener('touchstart', e => { e.preventDefault(); mobileInput[prop] = true; btn.classList.add('pressed'); });
        btn.addEventListener('touchend', e => { e.preventDefault(); mobileInput[prop] = false; btn.classList.remove('pressed'); });
        btn.addEventListener('touchcancel', e => { mobileInput[prop] = false; btn.classList.remove('pressed'); });
        // Mouse events
        btn.addEventListener('mousedown', e => { e.preventDefault(); mobileInput[prop] = true; btn.classList.add('pressed'); });
        btn.addEventListener('mouseup', e => { e.preventDefault(); mobileInput[prop] = false; btn.classList.remove('pressed'); });
        btn.addEventListener('mouseleave', e => { mobileInput[prop] = false; btn.classList.remove('pressed'); });
    });
}


// =====================
// LOAD MAP (with detailed error messages)
// =====================
async function loadMap() {
    try {
        const response = await fetch(MAP_PATH);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Map file not found: "${MAP_PATH}"\n→ Check that the file exists and the path is correct`);
            } else {
                throw new Error(`Failed to load map (HTTP ${response.status})`);
            }
        }

        const data = await response.json();

        // Validate required fields
        if (!data.tileSize) {
            throw new Error('Map JSON missing "tileSize" - is this a SpriteFusion export?');
        }
        if (!data.mapWidth || !data.mapHeight) {
            throw new Error('Map JSON missing "mapWidth" or "mapHeight"');
        }
        if (!data.layers || !Array.isArray(data.layers)) {
            throw new Error('Map JSON missing "layers" array');
        }

        tileSize = data.tileSize;
        mapWidth = data.mapWidth;
        mapHeight = data.mapHeight;
        layers = data.layers;

        // Build collision and trap tiles
        let collisionLayerFound = false;
        for (const layer of layers) {
            // Check for spawn layer (case-insensitive)
            const layerName = (layer.name || '').toLowerCase();
            if (layerName === 'spawn' || layerName === 'spawnpoint' || layerName === 'spawn point') {
                if (layer.tiles && layer.tiles.length > 0) {
                    const spawnTile = layer.tiles[0];  // Use first tile as spawn
                    spawnPoint = {
                        x: spawnTile.x * tileSize,
                        y: spawnTile.y * tileSize
                    };
                    console.log(`✓ Spawn point found at tile (${spawnTile.x}, ${spawnTile.y})`);
                }
                continue;  // Don't add spawn tiles to collision
            }

            // Trap layer detection (case-insensitive)
            if (layerName === 'trap' || layerName === 'traps') {
                if (layer.tiles && layer.tiles.length > 0) {
                    for (const tile of layer.tiles) {
                        trapTiles.push({
                            x: tile.x * tileSize,
                            y: tile.y * tileSize,
                            w: tileSize,
                            h: tileSize
                        });
                    }
                    console.log(`✓ Trap layer found with ${layer.tiles.length} tiles`);
                }
                continue; // Don't add trap tiles to collision
            }

            if (!layer.collider) continue;
            collisionLayerFound = true;
            for (const tile of layer.tiles) {
                collisionTiles.push({
                    x: tile.x * tileSize,
                    y: tile.y * tileSize,
                    w: tileSize,
                    h: tileSize
                });
            }
        }

        if (!spawnPoint) {
            errorMessages.push('ℹ️ No "spawn" layer found - using default position');
            errorMessages.push('→ Create a layer named "spawn" in SpriteFusion');
        }

        if (!collisionLayerFound) {
            errorMessages.push('⚠️ No collision layer found in map - player may fall through!');
            errorMessages.push('→ In SpriteFusion, mark a layer as "Collider"');
        }

        if (collisionTiles.length === 0) {
            errorMessages.push('⚠️ Collision layer is empty - no solid tiles!');
        }

        console.log(`✓ Map loaded: ${mapWidth}x${mapHeight} tiles, ${collisionTiles.length} collision tiles`);

    } catch (e) {
        console.error('Map load error:', e.message);

        // Check for CORS error
        if (e.message.includes('Failed to fetch')) {
            errorMessages.push('❌ Cannot load map - CORS error');
            errorMessages.push('→ Use Live Server extension, not "Open with Browser"');
        } else {
            errorMessages.push('❌ ' + e.message);
        }

        useFallback = true;
        createFallbackLevel();
    }
}


function checkSpritesheet() {
    if (!useFallback) {
        if (!mapSpritesheet.complete || mapSpritesheet.naturalWidth === 0) {
            errorMessages.push(`⚠️ Map spritesheet not loaded: "${MAP_SPRITESHEET}"`);
        } else {
            if (mapSpritesheet.width % tileSize !== 0) {
                errorMessages.push(`⚠️ Spritesheet width (${mapSpritesheet.width}px) not divisible by tile size (${tileSize}px)`);
            }
        }
    }
    if (!playerSpritesheet.complete || playerSpritesheet.naturalWidth === 0) {
        errorMessages.push(`⚠️ Player sprite not loaded: "${PLAYER_SPRITESHEET}"`);
        errorMessages.push('→ Using blue rectangle as fallback');
    }
}

function createFallbackLevel() {
    tileSize = 32;
    mapWidth = 50;
    mapHeight = 20;
    for (let x = 0; x < mapWidth; x++) {
        collisionTiles.push({ x: x * tileSize, y: (mapHeight - 2) * tileSize, w: tileSize, h: tileSize });
    }
    const platforms = [
        { x: 5, y: 14, len: 4 },
        { x: 12, y: 12, len: 5 },
        { x: 20, y: 10, len: 3 },
        { x: 26, y: 13, len: 6 },
        { x: 35, y: 11, len: 4 },
        { x: 42, y: 14, len: 5 }
    ];
    for (const p of platforms) {
        for (let i = 0; i < p.len; i++) {
            collisionTiles.push({ x: (p.x + i) * tileSize, y: p.y * tileSize, w: tileSize, h: tileSize });
        }
    }
}

function findSpawnPosition() {
    if (spawnPoint) {
        player.x = spawnPoint.x;
        player.y = spawnPoint.y - player.height;
        console.log(`Spawn: Using spawn layer at (${player.x}, ${player.y})`);
        return;
    }
    player.x = tileSize * 3;
    let floorY = (mapHeight - 2) * tileSize;
    for (const tile of collisionTiles) {
        if (tile.x < tileSize * 10 && tile.y > tileSize * 2 && tile.y < floorY) {
            floorY = tile.y;
        }
    }
    player.y = floorY - player.height - 5;
    player.onGround = false;
    console.log(`Spawn: Fallback position at (${player.x}, ${player.y})`);
}

function respawnPlayer() {
    player.velX = 0;
    player.velY = 0;
    player.onGround = false;
    findSpawnPosition();
}

function checkFallOffMap() {
    if (player.y > mapHeight * tileSize + 100) {
        respawnPlayer();
    }
}

function isColliding(rect, tile) {
    return rect.x < tile.x + tile.w && rect.x + rect.w > tile.x &&
        rect.y < tile.y + tile.h && rect.y + rect.h > tile.y;
}

function hitsAnyTile(rect, tileArray) {
    for (const tile of tileArray) {
        if (isColliding(rect, tile)) return tile;
    }
    return null;
}

function checkTrapCollision(rect) {
    return hitsAnyTile(rect, trapTiles) !== null;
}

function updateAnimation(action) {
    if (action !== player.currentAction) {
        player.currentAction = action;
        animation.frameIndex = 0;
        animation.frameTimer = 0;
    }
    const frameCount = frames[action]?.length || 1;
    const delay = animation.delays[action] || 10;
    animation.frameTimer++;
    if (animation.frameTimer >= delay) {
        animation.frameTimer = 0;
        animation.frameIndex = (animation.frameIndex + 1) % frameCount;
    }
}

function updatePlayer(input) {
    let action = 'idle';
    player.velX = 0;
    let speed = (input.sprint && player.onGround) ? player.sprintSpeed : player.speed;
    if (input.left) {
        player.velX = -speed;
        player.direction = 'left';
        action = (input.sprint && frames.sprint) ? 'sprint' : 'walk';
    }
    if (input.right) {
        player.velX = speed;
        player.direction = 'right';
        action = (input.sprint && frames.sprint) ? 'sprint' : 'walk';
    }
    if (input.crouch && player.onGround && player.velX === 0) {
        player.isCrouching = true;
        action = frames.crouch ? 'crouch' : 'idle';
    } else {
        player.isCrouching = false;
    }
    if (input.jump && player.onGround && !player.isCrouching) {
        player.velY = -player.jumpForce;
        player.onGround = false;
    }
    if (input.attack && player.onGround && !player.isAttacking) {
        player.isAttacking = true;
        action = frames.attack ? 'attack' : 'idle';
    }
    if (player.isAttacking && !input.attack) player.isAttacking = false;
    player.velY += GRAVITY;
    if (!player.onGround) action = 'jump';

    // Dynamically update hitbox size to match current animation frame, with adjustable padding
    const frame = frames[action]?.[animation.frameIndex];
    const baseWidth = frame ? frame.w * DRAW_SCALE : player.width;
    const baseHeight = frame ? frame.h * DRAW_SCALE : player.height;
    const paddedWidth = baseWidth + player.hitboxPadW;
    const paddedHeight = baseHeight + player.hitboxPadH;
    if (player.width !== paddedWidth || player.height !== paddedHeight) {
        player.width = paddedWidth;
        player.height = paddedHeight;
    }

    // --- Improved collision resolution with hitbox padding ---
    // X axis
    const newX = player.x + player.velX;
    let nextRectX = {
        x: newX + player.hitboxPadX,
        y: player.y + player.hitboxPadY,
        w: player.width,
        h: player.height
    };
    const hitTileX = hitsAnyTile(nextRectX, collisionTiles);
    if (!hitTileX) {
        player.x = newX;
    } else {
        // Moving right
        if (player.velX > 0) {
            player.x = hitTileX.x - player.width - player.hitboxPadX;
        }
        // Moving left
        else if (player.velX < 0) {
            player.x = hitTileX.x + hitTileX.w - player.hitboxPadX;
        }
        player.velX = 0;
    }
    if (checkTrapCollision(nextRectX)) {
        handleTrapCollision();
    }
    // Y axis
    const newY = player.y + player.velY;
    let nextRectY = {
        x: player.x + player.hitboxPadX,
        y: newY + player.hitboxPadY,
        w: player.width,
        h: player.height
    };
    const hitTileY = hitsAnyTile(nextRectY, collisionTiles);
    if (!hitTileY) {
        player.y = newY;
        player.onGround = false;
    } else {
        // Always push player up and out of the block if falling or stuck
        if (player.velY > 0 || player.velY === 0) {
            player.y = hitTileY.y - player.height - player.hitboxPadY;
            player.onGround = true;
        } else if (player.velY < 0) {
            player.y = hitTileY.y + hitTileY.h - player.hitboxPadY;
        }
        player.velY = 0;
        // Failsafe: if still inside a block, nudge up until clear
        let safety = 0;
        let testRect = {
            x: player.x + player.hitboxPadX,
            y: player.y + player.hitboxPadY,
            w: player.width,
            h: player.height
        };
        while (hitsAnyTile(testRect, collisionTiles) && safety < 10) {
            player.y -= 1;
            testRect.y = player.y + player.hitboxPadY;
            safety++;
        }
    }
    if (checkTrapCollision(nextRectY)) {
        handleTrapCollision();
    }
    player.x = Math.max(0, Math.min(mapWidth * tileSize - player.width, player.x));
    updateAnimation(action);
    function handleTrapCollision() {
        respawnPlayer();
    }
}

function updateCamera() {
    const targetX = player.x - canvas.width / 2 + player.width / 2;
    const targetY = player.y - canvas.height / 2 + player.height / 2;
    camera.x += (targetX - camera.x) * 0.1;
    camera.y += (targetY - camera.y) * 0.1;
    camera.x = Math.max(0, Math.min(mapWidth * tileSize - canvas.width, camera.x));
    camera.y = Math.max(0, Math.min(mapHeight * tileSize - canvas.height, camera.y));
}

let SHOW_HITBOX = false;
function setShowHitbox(val) { SHOW_HITBOX = !!val; }

function drawMap() {
    if (useFallback) {
        ctx.fillStyle = '#654321';
        for (const tile of collisionTiles) {
            ctx.fillRect(tile.x - camera.x, tile.y - camera.y, tile.w, tile.h);
        }
        ctx.fillStyle = '#228B22';
        for (const tile of collisionTiles) {
            ctx.fillRect(tile.x - camera.x, tile.y - camera.y, tile.w, 4);
        }
        return;
    }
    if (!mapSpritesheet.complete) return;
    const tilesPerRow = Math.floor(mapSpritesheet.width / tileSize);
    for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        const layerName = (layer.name || '').toLowerCase();
        if (layerName.includes('spawn')) continue;
        for (const tile of layer.tiles) {
            const worldX = tile.x * tileSize;
            const worldY = tile.y * tileSize;
            if (worldX + tileSize < camera.x || worldX > camera.x + canvas.width) continue;
            if (worldY + tileSize < camera.y || worldY > camera.y + canvas.height) continue;
            const tileId = parseInt(tile.id, 10);
            const srcX = (tileId % tilesPerRow) * tileSize;
            const srcY = Math.floor(tileId / tilesPerRow) * tileSize;
            ctx.drawImage(mapSpritesheet, srcX, srcY, tileSize, tileSize,
                worldX - camera.x, worldY - camera.y, tileSize, tileSize);
        }
    }
}

function drawPlayer() {
    const frame = frames[player.currentAction]?.[animation.frameIndex];
    if (!frame || !playerSpritesheet.complete || playerSpritesheet.naturalWidth === 0) {
        ctx.fillStyle = '#3498db';
        ctx.fillRect(player.x - camera.x, player.y - camera.y, player.width, player.height);
        return;
    }
    const drawW = frame.w * DRAW_SCALE;
    const drawH = frame.h * DRAW_SCALE;
    const drawX = Math.round(player.x + (player.width - drawW) / 2);
    const drawY = Math.round(player.y + player.height - drawH);
    const screenX = drawX - Math.round(camera.x);
    const screenY = drawY - Math.round(camera.y);
    ctx.save();
    if (player.direction === 'left') {
        ctx.scale(-1, 1);
        ctx.drawImage(playerSpritesheet, frame.x, frame.y, frame.w, frame.h,
            -screenX - drawW, screenY, drawW, drawH);
    } else {
        ctx.drawImage(playerSpritesheet, frame.x, frame.y, frame.w, frame.h,
            screenX, screenY, drawW, drawH);
    }
    ctx.restore();
}

function drawDebug() {
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(`Action: ${player.currentAction} | Frame: ${animation.frameIndex + 1}`, 10, 20);
    ctx.fillText(`Controls: Arrows/WASD=Move | Space=Jump | Shift=Sprint | S=Crouch | X=Attack`, 10, 35);
    if (SHOW_HITBOX) {
        ctx.save();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(player.x - camera.x, player.y - camera.y, player.width, player.height);
        ctx.restore();
    }
    if (errorMessages.length > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(5, 45, canvas.width - 10, 15 + errorMessages.length * 15);
        ctx.fillStyle = '#ff6b6b';
        ctx.font = '11px monospace';
        for (let i = 0; i < errorMessages.length; i++) {
            ctx.fillText(errorMessages[i], 10, 58 + i * 15);
        }
    }
}

function gameLoop() {
    updatePlayer(getInput());
    checkFallOffMap();
    updateCamera();
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawMap();
    drawPlayer();
    drawDebug();
    requestAnimationFrame(gameLoop);
}

// =====================
// START
// =====================
async function startGame() {
    mapSpritesheet.src = MAP_SPRITESHEET;
    playerSpritesheet.src = PLAYER_SPRITESHEET;
    await loadMap();
    // Set canvas size to match map pixel dimensions
    canvas.width = mapWidth * tileSize;
    canvas.height = mapHeight * tileSize;
    setTimeout(checkSpritesheet, 500);
    findSpawnPosition();
    canvas.setAttribute('tabindex', '0');
    canvas.focus();
    setupMobileControls(); // <-- NEW: enable mobile controls
    requestAnimationFrame(gameLoop);
}

startGame();
