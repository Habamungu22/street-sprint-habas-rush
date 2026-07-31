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
      debug: false // Met à true pour voir les boîtes de collision
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
let ground; // TileSprite pour le sol défilant
let roadLines; // TileSprite pour les lignes défilantes
let currentLane = 1; // 0 = Gauche, 1 = Milieu, 2 = Droite
const lanes = [80, 180, 280]; // Positions X des 3 voies
let score = 0;
let scoreText;
let isGameOver = false;

function preload() {
  // 1. Chargement des images (Spritesheets pour l'animation)
  // frameWidth et frameHeight sont la taille d'UNE SEULE image de l'animation
  // Nous utilisons des assets par défaut de Phaser pour ce prototype
  this.load.spritesheet('haba_run', 'https://labs.phaser.io/assets/sprites/dude.png', { frameWidth: 32, frameHeight: 48 });
  this.load.spritesheet('thief_run', 'https://labs.phaser.io/assets/sprites/baddie.png', { frameWidth: 32, frameHeight: 32 });
}

function create() {
  const scene = this;

  // 1. Dessin du sol urbain défilant (illusion de vitesse)
  let graphics = this.add.graphics();
  graphics.fillStyle(0x334155, 1);
  graphics.fillRect(0, 0, 360, 640);
  graphics.generateTexture('roadTexture', 360, 640);
  graphics.destroy();
  
  ground = this.add.tileSprite(180, 320, 360, 640, 'roadTexture');

  // Lignes de séparation de voies défilantes
  graphics = this.add.graphics();
  graphics.lineStyle(4, 0xffffff, 0.7);
  graphics.strokeLineShape(new Phaser.Geom.Line(0, 0, 0, 100)); // Une petite ligne
  graphics.generateTexture('lineTexture', 4, 100);
  graphics.destroy();

  roadLines = this.add.tileSprite(130, 320, 4, 640, 'lineTexture');
  this.add.tileSprite(230, 320, 4, 640, 'lineTexture');


  // 2. Création des Animations

  // Animation pour HABA (frames 5 à 8 pour courir à droite dans 'dude.png')
  this.anims.create({
    key: 'haba_run_anim',
    frames: this.anims.generateFrameNumbers('haba_run', { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1
  });

  // Animation pour le VOLEUR (frames 2 à 3 pour baddie.png)
  this.anims.create({
    key: 'thief_run_anim',
    frames: this.anims.generateFrameNumbers('thief_run', { start: 2, end: 3 }),
    frameRate: 8,
    repeat: -1
  });


  // 3. Création du VOLEUR (devant)
  thief = this.physics.add.sprite(lanes[1], 150, 'thief_run');
  thief.setScale(2);
  thief.setTint(0xef4444); // Teinter en rouge pour montrer que c'est le "méchant"
  thief.play('thief_run_anim'); // Lancer l'animation de course


  // 4. Création de notre Héros : HABA
  haba = this.physics.add.sprite(lanes[currentLane], 500, 'haba_run');
  haba.setScale(2); 
  haba.play('haba_run_anim'); // Lancer l'animation de course


  // 5. Interface (Titre, Score)
  this.add.text(180, 30, "STREET SPRINT", { font: "bold 24px Arial", fill: "#ffffff", stroke: "#000000", strokeThickness: 4 }).setOrigin(0.5);
  this.add.text(180, 60, "HABA'S RUSH", { font: "18px Arial", fill: "#60a5fa" }).setOrigin(0.5);

  scoreText = this.add.text(350, 20, 'Score: 0', { fontSize: '20px', fill: '#fff' }).setOrigin(1, 0);


  // 6. Contrôles (Clavier)
  this.input.keyboard.on('keydown-LEFT', () => moveHaba.call(this, -1));
  this.input.keyboard.on('keydown-RIGHT', () => moveHaba.call(this, 1));
}

function moveHaba(direction) {
  if (isGameOver) return;
  // Changer de voie proprement sans sortir de la route
  currentLane = Phaser.Math.Clamp(currentLane + direction, 0, 2);
  // Petite animation de déplacement fluide
  this.tweens.add({
    targets: haba,
    x: lanes[currentLane],
    duration: 120,
    ease: 'Power1'
  });
}

function update() {
  if (isGameOver) return;

  // 1. Illusion de vitesse : Faire défiler le sol et les lignes vers le bas
  // C'est ça qui donne l'impression que les personnages courent vers le haut !
  ground.tilePositionY -= 8;
  roadLines.tilePositionY -= 12;

  // 2. Animation du voleur : il oscille légèrement pour simuler la fuite
  thief.x = lanes[currentLane] + Math.sin(this.time.now / 200) * 15;

  // 3. Mise à jour du score
  score += 1;
  scoreText.setText('Score: ' + Math.floor(score / 10));
}
