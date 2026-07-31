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
let ground;
let roadLines;
let currentLane = 1; // 0 = Gauche, 1 = Milieu, 2 = Droite
const lanes = [80, 180, 280]; // Positions X des 3 voies
let isGameOver = false;

function preload() {
  // Chargement de tes propres images PNG
  this.load.image('haba_img', 'haba_run.png');
  this.load.image('thief_img', 'thief_run.png');
}

function create() {
  // 1. Décor et route défilante
  let graphics = this.add.graphics();
  graphics.fillStyle(0x334155, 1);
  graphics.fillRect(0, 0, 360, 640);
  graphics.generateTexture('roadTexture', 360, 640);
  graphics.destroy();
  
  ground = this.add.tileSprite(180, 320, 360, 640, 'roadTexture');

  // Lignes de séparation de voies
  graphics = this.add.graphics();
  graphics.lineStyle(4, 0xffffff, 0.7);
  graphics.strokeLineShape(new Phaser.Geom.Line(0, 0, 0, 100));
  graphics.generateTexture('lineTexture', 4, 100);
  graphics.destroy();

  roadLines = this.add.tileSprite(130, 320, 4, 640, 'lineTexture');
  this.add.tileSprite(230, 320, 4, 640, 'lineTexture');

  // 2. Création de HABA (Joueur)
  haba = this.physics.add.sprite(lanes[currentLane], 500, 'haba_img');
  // Ajuster la taille de ton image si elle est trop grande (ex: 0.2 ou 0.5)
  haba.setDisplaySize(60, 80); 

  // 3. Création du VOLEUR
  thief = this.physics.add.sprite(lanes[1], 150, 'thief_img');
  thief.setDisplaySize(60, 80);

  // 4. Titre du jeu
  this.add.text(180, 30, "STREET SPRINT", { font: "bold 24px Arial", fill: "#ffffff", stroke: "#000000", strokeThickness: 4 }).setOrigin(0.5);
  this.add.text(180, 60, "HABA'S RUSH", { font: "18px Arial", fill: "#60a5fa" }).setOrigin(0.5);

  // 5. Contrôles (Clavier et Toucher)
  this.input.keyboard.on('keydown-LEFT', () => moveHaba.call(this, -1));
  this.input.keyboard.on('keydown-RIGHT', () => moveHaba.call(this, 1));

  let touchStartX = 0;
  this.input.on('pointerdown', (pointer) => { touchStartX = pointer.x; });
  this.input.on('pointerup', (pointer) => {
    let diffX = pointer.x - touchStartX;
    if (Math.abs(diffX) > 30) {
      if (diffX > 0) moveHaba.call(this, 1);  // Swipe Droite
      else moveHaba.call(this, -1);           // Swipe Gauche
    }
  });
}

function moveHaba(direction) {
  if (isGameOver) return;
  currentLane = Phaser.Math.Clamp(currentLane + direction, 0, 2);
  this.tweens.add({
    targets: haba,
    x: lanes[currentLane],
    duration: 120,
    ease: 'Power1'
  });
}

function update() {
  if (isGameOver) return;

  // Défilement du sol pour donner la sensation de vitesse !
  ground.tilePositionY -= 8;
  roadLines.tilePositionY -= 12;

  // Le voleur oscille de gauche à droite devant
  thief.x = lanes[currentLane] + Math.sin(this.time.now / 250) * 20;
}
