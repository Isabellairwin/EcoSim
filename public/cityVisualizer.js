/**
 * EcoSim — Dynamic City Canvas Visualizer Engine
 * 
 * Provides an interactive 60-FPS rendering of the miniature smart city.
 * The canvas visually and dynamically reacts to slider inputs:
 * - Sky atmosphere color shifts from pristine blue to smog haze as pollution rises.
 * - Buildings populate according to density and show rooftop solar installations.
 * - Trees populate park corridors and boulevards.
 * - Animated vehicles drive along transit roads; speed decreases with traffic congestion.
 */

class CityVisualizer {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.isHero = options.isHero || false;
    this.isDay = true;
    this.enableAnimation = true;
    
    // Simulation state
    this.state = {
      cityName: 'Neo-Verdant Smart City',
      vehicles: 250,
      buildings: 120,
      trees: 650,
      solarPanels: 400,
      greenSpaceSqKm: 4.5,
      trafficPercentage: 24,
      pollutionIndex: 22,
      sustainabilityScore: 82,
      sustainabilityGrade: 'A'
    };

    // Dynamic animated entities
    this.vehiclesList = [];
    this.clouds = [];
    this.birds = [];
    this.smogParticles = [];
    this.time = 0;
    this.animationFrameId = null;

    this.initCanvasSize();
    this.initEntities();
    this.startLoop();

    window.addEventListener('resize', () => {
      this.initCanvasSize();
    });
  }

  initCanvasSize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width || (this.isHero ? 500 : 800);
    this.height = rect.height || (this.isHero ? 280 : 450);
    
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  initEntities() {
    // Generate initial vehicle traffic
    this.vehiclesList = [];
    const count = Math.min(30, Math.max(3, Math.round(this.state.vehicles / 30)));
    for (let i = 0; i < count; i++) {
      this.vehiclesList.push({
        x: Math.random() * this.width,
        lane: i % 2 === 0 ? 0 : 1, // 0 = eastbound, 1 = westbound
        speed: 1.5 + Math.random() * 1.5,
        type: Math.random() > 0.8 ? 'bus' : (Math.random() > 0.5 ? 'eco-car' : 'compact'),
        color: ['#10b981', '#38bdf8', '#fbbf24', '#f43f5e', '#a855f7'][Math.floor(Math.random() * 5)]
      });
    }

    // Clouds
    this.clouds = [
      { x: 40, y: 35, scale: 0.8, speed: 0.2 },
      { x: 220, y: 55, scale: 1.1, speed: 0.15 },
      { x: 420, y: 25, scale: 0.7, speed: 0.25 }
    ];

    // Flying birds for high eco scores
    this.birds = [
      { x: 100, y: 70, speed: 1.2, wingAngle: 0 },
      { x: 130, y: 80, speed: 1.2, wingAngle: 0.5 },
      { x: 155, y: 65, speed: 1.2, wingAngle: 1.0 }
    ];

    // Smog particulate particles
    this.smogParticles = [];
    for (let i = 0; i < 40; i++) {
      this.smogParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * (this.height * 0.7),
        size: 1 + Math.random() * 2.5,
        opacity: 0.1 + Math.random() * 0.3,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: -0.2 - Math.random() * 0.3
      });
    }
  }

  updateState(newState) {
    this.state = { ...this.state, ...newState };
    
    // Adjust vehicle count
    const targetVehicles = Math.min(35, Math.max(2, Math.round(this.state.vehicles / 40)));
    while (this.vehiclesList.length < targetVehicles) {
      this.vehiclesList.push({
        x: Math.random() * this.width,
        lane: Math.random() > 0.5 ? 0 : 1,
        speed: 1.5 + Math.random() * 1.5,
        type: Math.random() > 0.7 ? 'bus' : 'eco-car',
        color: ['#10b981', '#38bdf8', '#fbbf24', '#f43f5e'][Math.floor(Math.random() * 4)]
      });
    }
    if (this.vehiclesList.length > targetVehicles) {
      this.vehiclesList.length = targetVehicles;
    }
  }

  setDayNight(isDay) {
    this.isDay = isDay;
  }

  setAnimation(enable) {
    this.enableAnimation = enable;
  }

  startLoop() {
    const render = () => {
      this.time += 0.02;
      this.draw();
      this.animationFrameId = requestAnimationFrame(render);
    };
    this.animationFrameId = requestAnimationFrame(render);
  }

  draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw Sky Atmosphere (reacts to day/night & pollution)
    this.drawSky(ctx, w, h);

    // 2. Draw Clouds or Smog Haze
    this.drawAtmosphereEffects(ctx, w, h);

    // 3. Draw Distant Mountains / Horizon
    this.drawHorizon(ctx, w, h);

    // 4. Draw City Ground & Parks
    const groundY = h * 0.72;
    this.drawGroundAndParks(ctx, w, h, groundY);

    // 5. Draw Buildings Grid
    this.drawBuildings(ctx, w, h, groundY);

    // 6. Draw Solar Installations
    this.drawSolarFarms(ctx, w, h, groundY);

    // 7. Draw Urban Trees & Canopy
    this.drawTrees(ctx, w, h, groundY);

    // 8. Draw Roads & Animated Traffic
    this.drawRoadAndVehicles(ctx, w, h, groundY);

    // 9. Birds if clean environment
    if (this.state.pollutionIndex < 35 && this.isDay) {
      this.drawBirds(ctx);
    }
  }

  drawSky(ctx, w, h) {
    const pollutionFactor = Math.min(1, this.state.pollutionIndex / 100);
    const skyGradient = ctx.createLinearGradient(0, 0, 0, h * 0.75);

    if (this.isDay) {
      // Clean sky is bright azure blue, polluted turns yellow-grey smog
      const rTop = Math.round(14 + (180 - 14) * pollutionFactor);
      const gTop = Math.round(165 + (160 - 165) * pollutionFactor);
      const bTop = Math.round(233 + (130 - 233) * pollutionFactor);

      const rBot = Math.round(186 + (210 - 186) * pollutionFactor);
      const gBot = Math.round(230 + (190 - 230) * pollutionFactor);
      const bBot = Math.round(253 + (140 - 253) * pollutionFactor);

      skyGradient.addColorStop(0, `rgb(${rTop}, ${gTop}, ${bTop})`);
      skyGradient.addColorStop(1, `rgb(${rBot}, ${gBot}, ${bBot})`);
    } else {
      // Night sky: deep indigo / navy
      skyGradient.addColorStop(0, '#090d16');
      skyGradient.addColorStop(1, '#1e293b');
    }

    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, w, h);

    // Sun or Moon
    if (this.isDay) {
      const sunX = w * 0.82;
      const sunY = h * 0.2;
      
      // Sun glow
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 45);
      sunGlow.addColorStop(0, 'rgba(255, 230, 120, 0.9)');
      sunGlow.addColorStop(0.4, 'rgba(253, 224, 71, 0.35)');
      sunGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
      
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 45, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 18, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Moon
      const moonX = w * 0.82;
      const moonY = h * 0.2;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(moonX, moonY, 15, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawAtmosphereEffects(ctx, w, h) {
    // If polluted, draw particulate smog particles
    if (this.state.pollutionIndex > 40) {
      const alpha = Math.min(0.5, (this.state.pollutionIndex - 40) / 100);
      ctx.fillStyle = `rgba(168, 140, 100, ${alpha})`;
      ctx.fillRect(0, 0, w, h * 0.72);

      // Particulate dots
      if (this.enableAnimation) {
        ctx.fillStyle = 'rgba(100, 80, 60, 0.3)';
        this.smogParticles.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          p.x += p.speedX;
          p.y += p.speedY;
          if (p.y < 0) p.y = h * 0.7;
          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;
        });
      }
    }

    // Clouds
    if (this.isDay && this.state.pollutionIndex <= 70) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
      this.clouds.forEach(c => {
        if (this.enableAnimation) {
          c.x += c.speed;
          if (c.x > w + 60) c.x = -60;
        }
        ctx.beginPath();
        ctx.arc(c.x, c.y, 16 * c.scale, 0, Math.PI * 2);
        ctx.arc(c.x + 14 * c.scale, c.y - 8 * c.scale, 20 * c.scale, 0, Math.PI * 2);
        ctx.arc(c.x + 32 * c.scale, c.y, 15 * c.scale, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  drawHorizon(ctx, w, h) {
    const groundY = h * 0.72;
    // Distant mountain ridge
    ctx.fillStyle = this.isDay ? 'rgba(74, 114, 94, 0.35)' : 'rgba(30, 41, 59, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w * 0.15, groundY - 45);
    ctx.lineTo(w * 0.35, groundY - 20);
    ctx.lineTo(w * 0.55, groundY - 60);
    ctx.lineTo(w * 0.78, groundY - 25);
    ctx.lineTo(w, groundY - 50);
    ctx.lineTo(w, groundY);
    ctx.closePath();
    ctx.fill();
  }

  drawGroundAndParks(ctx, w, h, groundY) {
    // Ground landscape
    const groundHeight = h - groundY;
    
    // Base green parkland gradient
    const greenFactor = Math.min(1, (this.state.trees / 1000) * 0.5 + (this.state.greenSpaceSqKm / 15) * 0.5);
    const parkGradient = ctx.createLinearGradient(0, groundY, 0, h);
    
    if (this.isDay) {
      parkGradient.addColorStop(0, `rgb(${Math.round(80 - 40 * greenFactor)}, ${Math.round(150 + 40 * greenFactor)}, ${Math.round(90)})`);
      parkGradient.addColorStop(1, '#064e3b');
    } else {
      parkGradient.addColorStop(0, '#0f291e');
      parkGradient.addColorStop(1, '#061a13');
    }

    ctx.fillStyle = parkGradient;
    ctx.fillRect(0, groundY, w, groundHeight);

    // Decorative river / water canal running across park
    const riverY = groundY + groundHeight * 0.45;
    ctx.fillStyle = this.isDay ? '#38bdf8' : '#0369a1';
    ctx.beginPath();
    ctx.ellipse(w * 0.85, riverY + 10, w * 0.12, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBuildings(ctx, w, h, groundY) {
    const buildingCount = Math.min(24, Math.max(4, Math.round(this.state.buildings / 45)));
    const startX = w * 0.08;
    const availableWidth = w * 0.84;
    const spacing = availableWidth / (buildingCount + 1);

    // Deterministic pseudo-random building generator
    for (let i = 0; i < buildingCount; i++) {
      const bx = startX + i * spacing;
      const seed = ((i + 1) * 9301 + 49297) % 233280;
      const norm = seed / 233280;
      
      const bWidth = 22 + norm * 26;
      const bHeight = 45 + norm * 110;
      const by = groundY - bHeight;

      // Building facade
      const bGradient = ctx.createLinearGradient(bx, by, bx + bWidth, groundY);
      if (this.isDay) {
        if (i % 3 === 0) {
          bGradient.addColorStop(0, '#38bdf8'); // Modern Glass Eco-Tower
          bGradient.addColorStop(1, '#0284c7');
        } else if (i % 3 === 1) {
          bGradient.addColorStop(0, '#e2e8f0'); // Modern White Concrete
          bGradient.addColorStop(1, '#94a3b8');
        } else {
          bGradient.addColorStop(0, '#10b981'); // Green Terrace Building
          bGradient.addColorStop(1, '#047857');
        }
      } else {
        bGradient.addColorStop(0, '#1e293b');
        bGradient.addColorStop(1, '#0f172a');
      }

      ctx.fillStyle = bGradient;
      ctx.fillRect(bx, by, bWidth, bHeight);

      // Building outline
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bWidth, bHeight);

      // Windows
      const winCols = Math.max(2, Math.floor(bWidth / 9));
      const winRows = Math.max(3, Math.floor(bHeight / 14));
      
      for (let r = 0; r < winRows; r++) {
        for (let c = 0; c < winCols; c++) {
          const wx = bx + 3 + c * 8;
          const wy = by + 6 + r * 12;
          
          if (this.isDay) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
          } else {
            // Window glow at night
            ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(253, 224, 71, 0.85)' : 'rgba(255, 255, 255, 0.2)';
          }
          ctx.fillRect(wx, wy, 5, 7);
        }
      }

      // Rooftop solar array if solar panels > 100
      if (this.state.solarPanels > 100 && i % 2 === 0) {
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(bx + 2, by - 6, bWidth - 4, 6);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 2, by - 6, bWidth - 4, 6);

        // Sun glint reflection
        if (this.isDay && this.enableAnimation) {
          const glint = (Math.sin(this.time * 2 + i) + 1) / 2;
          ctx.fillStyle = `rgba(255, 255, 255, ${glint * 0.7})`;
          ctx.fillRect(bx + 4 + glint * (bWidth - 12), by - 5, 4, 4);
        }
      }

      // Green rooftop gardens if eco score high
      if (this.state.sustainabilityScore >= 75 && i % 2 === 1) {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(bx, by - 4, bWidth, 4);
        // Small rooftop sapling
        ctx.fillStyle = '#065f46';
        ctx.beginPath();
        ctx.arc(bx + bWidth / 2, by - 7, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawSolarFarms(ctx, w, h, groundY) {
    if (this.state.solarPanels < 50) return;
    
    // Dedicated solar arrays on the east flank of the city
    const farmX = w * 0.02;
    const farmY = groundY - 14;
    const panelCount = Math.min(8, Math.max(2, Math.round(this.state.solarPanels / 250)));

    for (let p = 0; p < panelCount; p++) {
      const px = farmX + p * 14;
      ctx.fillStyle = '#1e40af';
      ctx.beginPath();
      ctx.moveTo(px, farmY + 12);
      ctx.lineTo(px + 10, farmY);
      ctx.lineTo(px + 12, farmY + 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  drawTrees(ctx, w, h, groundY) {
    const treeCount = Math.min(45, Math.max(3, Math.round(this.state.trees / 70)));
    const startX = w * 0.05;
    const availableWidth = w * 0.9;
    const step = availableWidth / (treeCount + 1);

    for (let i = 0; i < treeCount; i++) {
      const tx = startX + i * step + (Math.sin(i * 9) * 8);
      const ty = groundY;
      
      const sway = this.enableAnimation ? Math.sin(this.time * 2 + i) * 1.5 : 0;
      
      // Tree trunk
      ctx.fillStyle = '#78350f';
      ctx.fillRect(tx - 2, ty - 14, 4, 14);

      // Lush leafy crown
      const crownGradient = ctx.createRadialGradient(tx + sway, ty - 20, 2, tx + sway, ty - 20, 14);
      crownGradient.addColorStop(0, '#34d399');
      crownGradient.addColorStop(1, '#065f46');

      ctx.fillStyle = crownGradient;
      ctx.beginPath();
      ctx.arc(tx + sway, ty - 20, 11, 0, Math.PI * 2);
      ctx.arc(tx - 6 + sway, ty - 16, 8, 0, Math.PI * 2);
      ctx.arc(tx + 6 + sway, ty - 16, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawRoadAndVehicles(ctx, w, h, groundY) {
    // Multi-lane transit avenue
    const roadY = groundY + (h - groundY) * 0.55;
    const roadHeight = Math.min(38, (h - groundY) * 0.35);

    // Asphalt surface
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, roadY, w, roadHeight);

    // Curbs
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, roadY, w, 2);
    ctx.fillRect(0, roadY + roadHeight - 2, w, 2);

    // Center divider dashed line
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(0, roadY + roadHeight / 2);
    ctx.lineTo(w, roadY + roadHeight / 2);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // Traffic congestion speed throttling
    // High congestion (e.g. 80%) reduces speed to crawl
    const congestionFactor = Math.max(0.08, 1 - (this.state.trafficPercentage / 100) * 0.88);

    // Draw animated vehicles
    this.vehiclesList.forEach(v => {
      if (this.enableAnimation) {
        if (v.lane === 0) {
          // Eastbound (driving right)
          v.x += v.speed * congestionFactor;
          if (v.x > w + 25) v.x = -25;
        } else {
          // Westbound (driving left)
          v.x -= v.speed * congestionFactor;
          if (v.x < -25) v.x = w + 25;
        }
      }

      const vy = v.lane === 0 
        ? roadY + 4 
        : roadY + roadHeight / 2 + 3;

      const isBus = v.type === 'bus';
      const carW = isBus ? 26 : 16;
      const carH = isBus ? 10 : 8;

      // Car body
      ctx.fillStyle = v.color;
      ctx.beginPath();
      ctx.roundRect(v.x, vy, carW, carH, [3]);
      ctx.fill();

      // Windshield
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      if (v.lane === 0) {
        ctx.fillRect(v.x + carW - 5, vy + 1, 3, carH - 2);
      } else {
        ctx.fillRect(v.x + 2, vy + 1, 3, carH - 2);
      }

      // Headlights / taillights
      if (v.lane === 0) {
        // Headlight front (right)
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(v.x + carW - 1, vy + 2, 2, 2);
        // Brake light back (left)
        ctx.fillStyle = this.state.trafficPercentage > 50 ? '#ef4444' : '#b91c1c';
        ctx.fillRect(v.x - 1, vy + 2, 2, 2);
      } else {
        // Headlight front (left)
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(v.x - 1, vy + 2, 2, 2);
        // Brake light back (right)
        ctx.fillStyle = this.state.trafficPercentage > 50 ? '#ef4444' : '#b91c1c';
        ctx.fillRect(v.x + carW - 1, vy + 2, 2, 2);
      }
    });
  }

  drawBirds(ctx) {
    if (!this.enableAnimation) return;
    ctx.strokeStyle = this.isDay ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;

    this.birds.forEach(b => {
      b.x += b.speed;
      if (b.x > this.width + 20) b.x = -20;
      b.wingAngle += 0.15;

      const flap = Math.sin(b.wingAngle) * 4;
      ctx.beginPath();
      ctx.moveTo(b.x - 6, b.y + flap);
      ctx.quadraticCurveTo(b.x - 3, b.y - 2, b.x, b.y);
      ctx.quadraticCurveTo(b.x + 3, b.y - 2, b.x + 6, b.y + flap);
      ctx.stroke();
    });
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

window.CityVisualizer = CityVisualizer;

