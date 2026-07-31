// Configuration de la zone de jeu
const config = {
  type: Phaser.AUTO,
  width: 360,
  height: 640,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

const game = new Phaser.Game(config);

let haba;
let thief;
let currentLane = 1; // 0 = Gauche, 1 = Milieu, 2 = Droite
const lanes = [80, 180, 280]; // Positions X des 3 voies

function preload() {
  // Chargement des éléments de base (rendu sous forme de formes géométriques pour le prototype)
}

function create() {
  const scene = this;

  // 1. Dessin des voies de la rue
  const graphics = this.add.graphics();
  graphics.fillStyle(0x334155, 1);
  graphics.fillRect(30, 0, 300, 640);

  // Lignes de séparation de voies
  graphics.lineStyle(2, 0xffffff, 0.5);
  graphics.strokeLineShape(new Phaser.Geom.Line(130, 0, 130, 640));
  graphics.strokeLineShape(new Phaser.Geom.Line(230, 0, 230, 640));

  // 2. Création du Voleur (devant)
  thief = this.add.rectangle(lanes[1], 150, 40, 40, 0xef4444);
  this.physics.add.existing(thief);

  // 3. Création de notre Héros : HABA
  haba = this.add.rectangle(lanes[currentLane], 500, 45, 45, 0x3b82f6);
  this.physics.add.existing(haba);

  // Texte d'identification
  this.add.text(180, 30, "STREET SPRINT", { font: "bold 20px Arial", fill: "#ffffff" }).setOrigin(0.5);
  this.add.text(180, 580, "HABA RUNS!", { font: "16px Arial", fill: "#60a5fa" }).setOrigin(0.5);

  // 4. Contrôles au clavier (Pour tester sur PC)
  this.input.keyboard.on('keydown-LEFT', () => moveHaba(-1));
  this.input.keyboard.on('keydown-RIGHT', () => moveHaba(1));

  // 5. Contrôles tactiles / Swipe (Pour smartphone)
  let touchStartX = 0;
  this.input.on('pointerdown', (pointer) => {
    touchStartX = pointer.x;
  });

  this.input.on('pointerup', (pointer) => {
    let touchEndX = pointer.x;
    let diffX = touchEndX - touchStartX;

    if (Math.abs(diffX) > 30) {
      if (diffX > 0) moveHaba(1);  // Swipe Droite
      else moveHaba(-1);           // Swipe Gauche
    }
  });
}

function moveHaba(direction) {
  // Changer de voie sans sortir de la route
  currentLane = Phaser.Math.Clamp(currentLane + direction, 0, 2);
  haba.x = lanes[currentLane];
}

function update() {
  // Animation du voleur qui oscille pour simuler la fuite
  thief.x = lanes[currentLane] + Math.sin(this.time.now / 200) * 10;
}