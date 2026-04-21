const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const planetNameEl = document.getElementById("planet-name");
const planetTierEl = document.getElementById("planet-tier");
const planetDescriptionEl = document.getElementById("planet-description");
const livesEl = document.getElementById("lives");
const creditsEl = document.getElementById("credits");
const waveEl = document.getElementById("wave");
const threatEl = document.getElementById("threat");
const statusLineEl = document.getElementById("status-line");
const messageLogEl = document.getElementById("message-log");
const towerListEl = document.getElementById("tower-list");
const startWaveBtn = document.getElementById("start-wave-btn");
const nextPlanetBtn = document.getElementById("next-planet-btn");

const planets = [
  {
    name: "Mercury",
    tier: 1,
    description: "Solar flares and brittle rock make this a hard first outpost, but enemy scouts are still lightly armored.",
    skyTop: "#351c4d",
    skyBottom: "#0a101d",
    accent: "#f7b267",
    waves: 6,
    enemyScale: 1,
    rewardBonus: 0
  },
  {
    name: "Venus",
    tier: 2,
    description: "Acid clouds hide thicker swarms. Expect denser packs and faster breach attempts.",
    skyTop: "#5f2c1b",
    skyBottom: "#190d10",
    accent: "#ff9f68",
    waves: 7,
    enemyScale: 1.3,
    rewardBonus: 15
  },
  {
    name: "Mars",
    tier: 3,
    description: "Dust storms cut visibility while armored crawlers hit harder and survive longer.",
    skyTop: "#612d2d",
    skyBottom: "#14090c",
    accent: "#ff6b57",
    waves: 8,
    enemyScale: 1.65,
    rewardBonus: 25
  },
  {
    name: "Europa",
    tier: 4,
    description: "Frozen ridges channel enemies into brutal lanes. Precision towers matter more here.",
    skyTop: "#20445d",
    skyBottom: "#060d16",
    accent: "#95d5ff",
    waves: 8,
    enemyScale: 2,
    rewardBonus: 40
  },
  {
    name: "Neptune",
    tier: 5,
    description: "The last stand. Violent storms empower elite invaders and the route never truly feels safe.",
    skyTop: "#143c8a",
    skyBottom: "#020611",
    accent: "#5eb1ff",
    waves: 9,
    enemyScale: 2.4,
    rewardBonus: 60
  }
];

const towerTypes = [
  {
    id: "pulse",
    name: "Pulse Blaster",
    cost: 70,
    color: "#7cf0ff",
    range: 125,
    fireRate: 0.75,
    damage: 14,
    projectileSpeed: 340,
    description: "Reliable rapid-fire turret for early lanes."
  },
  {
    id: "ember",
    name: "Ember Lance",
    cost: 110,
    color: "#ff8a5b",
    range: 145,
    fireRate: 1.25,
    damage: 28,
    projectileSpeed: 300,
    splash: 34,
    description: "Heavy plasma shot that splashes nearby targets."
  },
  {
    id: "nova",
    name: "Nova Ray",
    cost: 150,
    color: "#ffd166",
    range: 185,
    fireRate: 1.9,
    damage: 16,
    projectileSpeed: 460,
    chain: 2,
    description: "Long-range arc cannon that chains across enemies."
  }
];

const route = [
  { x: 50, y: 530 },
  { x: 180, y: 530 },
  { x: 180, y: 155 },
  { x: 390, y: 155 },
  { x: 390, y: 418 },
  { x: 625, y: 418 },
  { x: 625, y: 210 },
  { x: 860, y: 210 },
  { x: 860, y: 505 },
  { x: 1040, y: 505 }
];

const towerPads = [
  { x: 118, y: 426 },
  { x: 290, y: 265 },
  { x: 310, y: 545 },
  { x: 478, y: 286 },
  { x: 548, y: 520 },
  { x: 730, y: 323 },
  { x: 787, y: 112 },
  { x: 954, y: 356 }
].map((pad, index) => ({ ...pad, index, tower: null }));

const game = {
  planetIndex: 0,
  selectedTowerType: towerTypes[0].id,
  selectedPadIndex: null,
  lives: 20,
  credits: 160,
  waveNumber: 0,
  waveInProgress: false,
  queuedEnemies: [],
  spawnTimer: 0,
  enemies: [],
  towers: [],
  projectiles: [],
  particles: [],
  messageQueue: [],
  gameOver: false,
  victory: false
};

function currentPlanet() {
  return planets[game.planetIndex];
}

function threatLabel() {
  const progress = game.waveNumber / currentPlanet().waves;
  if (game.gameOver) return "Critical";
  if (progress < 0.34) return "Calm";
  if (progress < 0.67) return "Rising";
  return "Extreme";
}

function addMessage(text) {
  game.messageQueue.unshift(text);
  game.messageQueue = game.messageQueue.slice(0, 6);
  messageLogEl.innerHTML = game.messageQueue
    .map((message) => `<div class="message">${message}</div>`)
    .join("");
}

function setStatus(text) {
  statusLineEl.textContent = text;
}

function updateHud() {
  const planet = currentPlanet();
  planetNameEl.textContent = planet.name;
  planetTierEl.textContent = `Tier ${planet.tier}`;
  planetDescriptionEl.textContent = planet.description;
  livesEl.textContent = game.lives;
  creditsEl.textContent = game.credits;
  waveEl.textContent = `${game.waveNumber} / ${planet.waves}`;
  threatEl.textContent = threatLabel();
  startWaveBtn.disabled = game.waveInProgress || game.gameOver || game.victory || game.waveNumber >= planet.waves;
  nextPlanetBtn.disabled = game.waveInProgress || game.waveNumber < planet.waves || game.planetIndex >= planets.length - 1 || game.gameOver;
}

function renderTowerCards() {
  towerListEl.innerHTML = towerTypes
    .map((tower) => {
      const selectedClass = tower.id === game.selectedTowerType ? "selected" : "";
      return `
        <button class="tower-card ${selectedClass}" data-tower-id="${tower.id}">
          <div class="tower-meta">
            <h4>${tower.name}</h4>
            <span>${tower.cost}c</span>
          </div>
          <p>${tower.description}</p>
        </button>
      `;
    })
    .join("");
}

function createEnemy(kind, scale) {
  const baseByKind = {
    scout: { speed: 68, hp: 36, reward: 12, radius: 12, color: "#ff9f68" },
    brute: { speed: 48, hp: 90, reward: 22, radius: 15, color: "#ff6b57" },
    phantom: { speed: 92, hp: 55, reward: 18, radius: 11, color: "#95d5ff" }
  };
  const base = baseByKind[kind];
  return {
    kind,
    x: route[0].x,
    y: route[0].y,
    waypointIndex: 1,
    speed: base.speed * scale,
    hp: base.hp * scale,
    maxHp: base.hp * scale,
    reward: Math.round(base.reward * scale),
    radius: base.radius,
    color: base.color
  };
}

function planWave() {
  const planet = currentPlanet();
  const wave = game.waveNumber + 1;
  const entries = [];
  const count = 7 + wave * 2;
  for (let i = 0; i < count; i += 1) {
    let kind = "scout";
    if (wave >= 3 && i % 4 === 0) kind = "phantom";
    if (wave >= 4 && i % 5 === 0) kind = "brute";
    const scale = planet.enemyScale * (1 + wave * 0.12);
    entries.push(createEnemy(kind, scale));
  }
  return entries;
}

function startWave() {
  if (game.waveInProgress || game.gameOver || game.victory) return;
  if (game.waveNumber >= currentPlanet().waves) return;

  game.waveInProgress = true;
  game.queuedEnemies = planWave();
  game.spawnTimer = 0.45;
  game.waveNumber += 1;
  addMessage(`Wave ${game.waveNumber} started on ${currentPlanet().name}.`);
  setStatus(`Wave ${game.waveNumber} inbound. Hold the route and preserve your hull.`);
  updateHud();
}

function resetPads() {
  towerPads.forEach((pad) => {
    pad.tower = null;
  });
}

function advancePlanet() {
  if (game.planetIndex >= planets.length - 1) {
    game.victory = true;
    addMessage("All planets defended. The frontier holds.");
    setStatus("Campaign complete. Orbit Bastion stands across the system.");
    updateHud();
    return;
  }

  game.planetIndex += 1;
  game.waveNumber = 0;
  game.waveInProgress = false;
  game.queuedEnemies = [];
  game.enemies = [];
  game.projectiles = [];
  game.particles = [];
  game.towers = [];
  game.selectedPadIndex = null;
  game.credits += 120 + currentPlanet().rewardBonus;
  game.lives = Math.min(20, game.lives + 5);
  resetPads();
  addMessage(`Warp complete. ${currentPlanet().name} unlocked.`);
  setStatus(`New planet reached: ${currentPlanet().name}. Rebuild and prepare the next defense line.`);
  updateHud();
}

function damageEnemy(enemy, amount) {
  enemy.hp -= amount;
  if (enemy.hp <= 0) {
    game.credits += enemy.reward;
    for (let i = 0; i < 8; i += 1) {
      game.particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: (Math.random() - 0.5) * 90,
        vy: (Math.random() - 0.5) * 90,
        life: 0.45,
        color: enemy.color
      });
    }
    return true;
  }
  return false;
}

function spawnProjectile(tower, enemy) {
  const towerType = tower.type;
  game.projectiles.push({
    x: tower.x,
    y: tower.y,
    target: enemy,
    speed: towerType.projectileSpeed,
    damage: towerType.damage,
    color: towerType.color,
    splash: towerType.splash || 0,
    chain: towerType.chain || 0
  });
}

function buildTower(padIndex) {
  const pad = towerPads[padIndex];
  if (!pad || pad.tower) return;
  const towerType = towerTypes.find((tower) => tower.id === game.selectedTowerType);
  if (!towerType) return;
  if (game.credits < towerType.cost) {
    addMessage(`Not enough credits for ${towerType.name}.`);
    setStatus(`You need ${towerType.cost} credits to deploy ${towerType.name}.`);
    return;
  }

  game.credits -= towerType.cost;
  const tower = {
    x: pad.x,
    y: pad.y,
    type: towerType,
    cooldown: 0
  };
  pad.tower = tower;
  game.towers.push(tower);
  addMessage(`${towerType.name} deployed.`);
  setStatus(`${towerType.name} online. Select another pad or launch the next wave.`);
  updateHud();
}

function handleCanvasClick(event) {
  if (game.gameOver || game.victory) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  const pad = towerPads.find((candidate) => Math.hypot(candidate.x - x, candidate.y - y) <= 28);
  if (!pad) {
    game.selectedPadIndex = null;
    setStatus("No tower pad selected. Click a glowing pad to build.");
    return;
  }

  game.selectedPadIndex = pad.index;
  if (pad.tower) {
    setStatus("That pad is already occupied. Choose another glowing pad.");
    return;
  }

  buildTower(pad.index);
}

function updateEnemies(dt) {
  game.enemies = game.enemies.filter((enemy) => enemy.hp > 0);
  for (const enemy of game.enemies) {
    const target = route[enemy.waypointIndex];
    if (!target) {
      game.lives -= 1;
      enemy.hp = 0;
      if (game.lives <= 0) {
        game.lives = 0;
        game.gameOver = true;
        addMessage("Defense line collapsed. The colony was overrun.");
        setStatus("Game over. Refresh the page to launch a new campaign.");
      }
      continue;
    }

    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const distance = Math.hypot(dx, dy);
    if (distance < enemy.speed * dt) {
      enemy.x = target.x;
      enemy.y = target.y;
      enemy.waypointIndex += 1;
    } else {
      enemy.x += (dx / distance) * enemy.speed * dt;
      enemy.y += (dy / distance) * enemy.speed * dt;
    }
  }
}

function updateTowers(dt) {
  for (const tower of game.towers) {
    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;

    const target = game.enemies.find((enemy) => Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= tower.type.range);
    if (!target) continue;

    spawnProjectile(tower, target);
    tower.cooldown = tower.type.fireRate;
  }
}

function applyChainDamage(centerEnemy, chainCount, damage) {
  if (chainCount <= 0) return;
  const nearby = game.enemies
    .filter((enemy) => enemy !== centerEnemy && Math.hypot(enemy.x - centerEnemy.x, enemy.y - centerEnemy.y) <= 90)
    .slice(0, chainCount);

  for (const enemy of nearby) {
    damageEnemy(enemy, damage * 0.7);
    game.particles.push({
      x: enemy.x,
      y: enemy.y,
      vx: 0,
      vy: 0,
      life: 0.2,
      color: "#fff0a8"
    });
  }
}

function updateProjectiles(dt) {
  game.projectiles = game.projectiles.filter((projectile) => projectile.target && projectile.target.hp > 0);

  for (const projectile of game.projectiles) {
    const dx = projectile.target.x - projectile.x;
    const dy = projectile.target.y - projectile.y;
    const distance = Math.hypot(dx, dy);

    if (distance <= projectile.speed * dt || distance < projectile.target.radius) {
      const defeated = damageEnemy(projectile.target, projectile.damage);
      if (projectile.splash > 0) {
        const splashTargets = game.enemies.filter((enemy) => Math.hypot(enemy.x - projectile.target.x, enemy.y - projectile.target.y) <= projectile.splash);
        splashTargets.forEach((enemy) => damageEnemy(enemy, projectile.damage * 0.45));
      }
      if (projectile.chain > 0 && !defeated) {
        applyChainDamage(projectile.target, projectile.chain, projectile.damage);
      }
      projectile.done = true;
      continue;
    }

    projectile.x += (dx / distance) * projectile.speed * dt;
    projectile.y += (dy / distance) * projectile.speed * dt;
  }

  game.projectiles = game.projectiles.filter((projectile) => !projectile.done);
}

function updateParticles(dt) {
  for (const particle of game.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }
  game.particles = game.particles.filter((particle) => particle.life > 0);
}

function maybeSpawnEnemy(dt) {
  if (!game.waveInProgress || game.queuedEnemies.length === 0) return;
  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    game.enemies.push(game.queuedEnemies.shift());
    game.spawnTimer = 0.72;
  }
}

function maybeFinishWave() {
  if (!game.waveInProgress) return;
  if (game.queuedEnemies.length > 0 || game.enemies.length > 0) return;

  game.waveInProgress = false;
  const bonus = 35 + currentPlanet().rewardBonus;
  game.credits += bonus;
  addMessage(`Wave ${game.waveNumber} cleared. Bonus +${bonus} credits.`);

  if (game.waveNumber >= currentPlanet().waves) {
    if (game.planetIndex >= planets.length - 1) {
      game.victory = true;
      addMessage("Neptune secured. The full campaign is complete.");
      setStatus("You won the campaign. Every planet route has been defended.");
    } else {
      addMessage(`${currentPlanet().name} secured. Prepare for planetary travel.`);
      setStatus(`${currentPlanet().name} defended. Use Travel To Next Planet when you're ready.`);
    }
  } else {
    setStatus(`Wave ${game.waveNumber} repelled. Rebuild, then start the next attack.`);
  }

  updateHud();
}

function drawBackground() {
  const planet = currentPlanet();
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, planet.skyTop);
  gradient.addColorStop(1, planet.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 70; i += 1) {
    const x = (i * 157) % canvas.width;
    const y = (i * 89) % canvas.height;
    ctx.fillStyle = i % 5 === 0 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)";
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.fillStyle = planet.accent;
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.arc(955, 105, 82, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawRoute() {
  ctx.strokeStyle = "rgba(255, 138, 91, 0.95)";
  ctx.lineWidth = 34;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(route[0].x, route[0].y);
  for (const point of route.slice(1)) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 230, 214, 0.2)";
  ctx.lineWidth = 5;
  ctx.stroke();
}

function drawPads() {
  for (const pad of towerPads) {
    ctx.beginPath();
    ctx.fillStyle = pad.tower ? "rgba(255, 209, 102, 0.25)" : "rgba(124, 240, 255, 0.18)";
    ctx.arc(pad.x, pad.y, 23, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = game.selectedPadIndex === pad.index ? "#ffffff" : "rgba(124, 240, 255, 0.65)";
    ctx.stroke();
  }
}

function drawTowers() {
  for (const tower of game.towers) {
    ctx.beginPath();
    ctx.fillStyle = tower.type.color;
    ctx.arc(tower.x, tower.y, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tower.x, tower.y);
    ctx.lineTo(tower.x + 18, tower.y - 18);
    ctx.stroke();
  }
}

function drawEnemies() {
  for (const enemy of game.enemies) {
    ctx.beginPath();
    ctx.fillStyle = enemy.color;
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(enemy.x - 16, enemy.y - 22, 32, 5);
    ctx.fillStyle = "#8ef7a5";
    ctx.fillRect(enemy.x - 16, enemy.y - 22, 32 * Math.max(enemy.hp, 0) / enemy.maxHp, 5);
  }
}

function drawProjectiles() {
  for (const projectile of game.projectiles) {
    ctx.beginPath();
    ctx.fillStyle = projectile.color;
    ctx.arc(projectile.x, projectile.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles() {
  for (const particle of game.particles) {
    ctx.globalAlpha = Math.max(particle.life, 0);
    ctx.beginPath();
    ctx.fillStyle = particle.color;
    ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawOverlayText() {
  if (!game.gameOver && !game.victory) return;
  ctx.fillStyle = "rgba(2, 7, 18, 0.78)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f6fbff";
  ctx.font = '700 54px "Syne", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(game.victory ? "Campaign Complete" : "Defense Lost", canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = '400 22px "Space Grotesk", sans-serif';
  ctx.fillText(
    game.victory ? "Every unlocked planet survived the invasion." : "Refresh the page to try a new run.",
    canvas.width / 2,
    canvas.height / 2 + 26
  );
}

function loop(timestamp) {
  if (!loop.lastTime) loop.lastTime = timestamp;
  const dt = Math.min((timestamp - loop.lastTime) / 1000, 0.033);
  loop.lastTime = timestamp;

  if (!game.gameOver && !game.victory) {
    maybeSpawnEnemy(dt);
    updateEnemies(dt);
    updateTowers(dt);
    updateProjectiles(dt);
    updateParticles(dt);
    maybeFinishWave();
    updateHud();
  }

  drawBackground();
  drawRoute();
  drawPads();
  drawTowers();
  drawEnemies();
  drawProjectiles();
  drawParticles();
  drawOverlayText();
  requestAnimationFrame(loop);
}

function bindEvents() {
  towerListEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tower-id]");
    if (!button) return;
    game.selectedTowerType = button.dataset.towerId;
    renderTowerCards();
    setStatus(`${towerTypes.find((tower) => tower.id === game.selectedTowerType).name} selected. Click a tower pad to deploy it.`);
  });

  canvas.addEventListener("click", handleCanvasClick);
  startWaveBtn.addEventListener("click", startWave);
  nextPlanetBtn.addEventListener("click", advancePlanet);
}

function init() {
  renderTowerCards();
  bindEvents();
  updateHud();
  addMessage("Mercury approach confirmed. Establish the first orbital defense grid.");
  planetDescriptionEl.textContent = currentPlanet().description;
  requestAnimationFrame(loop);
}

init();
