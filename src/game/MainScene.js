import Phaser from 'phaser';

// Color del text d'estat segons l'opció triada a Vue (Fase 1)
const COLORS_ESTAT = {
  Disponible: '#34d399',
  Ocupat: '#f87171',
  Absent: '#fbbf24'
};

// Estil comú dels textos que van damunt del mapa (amb contorn per llegir-los sobre qualsevol tile)
const ESTIL_TEXT = { fontFamily: 'sans-serif', color: '#ffffff', stroke: '#0f172a', strokeThickness: 3 };

export class MainScene extends Phaser.Scene {
  constructor() {
    // Registrem l'escena amb la clau 'MainScene' per recuperar-la des de Vue
    super('MainScene');
  }

  // 0. [NOU FASE 2] preload(): carreguem el mapa i el tileset ABANS de create()
  preload() {
    // Informem Vue del progrés de càrrega (valor de 0 a 1)
    this.load.on('progress', (valor) => this.game.events.emit('carrega-progres', valor));

    // Imatge del tileset (la clau 'tiles-oficina' és el nom intern dins de Phaser)
    this.load.image('tiles-oficina', 'assets/tilesets/oficina.png');
    // Mapa exportat des de Tiled en format JSON (amb el tileset INCRUSTAT)
    this.load.tilemapTiledJSON('mapa-oficina', 'assets/maps/oficina.json');
  }

  // 1. S'executa UN SOL COP quan la càrrega ha acabat: muntem el mapa i l'avatar
  create() {
    // 1a. Construïm el Tilemap a partir del JSON de Tiled
    this.mapa = this.make.tilemap({ key: 'mapa-oficina' });

    // 1b. Vinculem el tileset: 1r paràmetre = nom del tileset DINS de Tiled,
    //     2n = clau del preload. Margin 1 i spacing 2 perquè el PNG té les vores extrudides
    //     (evita línies entre tiles quan fem zoom).
    const tileset = this.mapa.addTilesetImage('oficina', 'tiles-oficina', 32, 32, 1, 2);

    // 1c. Creem les capes de tiles en el mateix ordre que a Tiled (la primera queda a sota)
    this.capes = {
      Terra: this.mapa.createLayer('Terra', tileset, 0, 0),
      Parets: this.mapa.createLayer('Parets', tileset, 0, 0),
      Mobles: this.mapa.createLayer('Mobles', tileset, 0, 0)
    };

    // 1d. Marquem com a sòlids els tiles amb la propietat personalitzada collides = true.
    //     A la Fase 3 l'avatar hi xocarà; ara només els podem visualitzar en mode debug.
    Object.values(this.capes).forEach((capa) => capa.setCollisionByProperty({ collides: true }));

    // 2. Capa d'objectes: punt d'aparició (Spawn) i rectangles de zona
    const spawn = this.mapa.findObject('Objectes', (obj) => obj.name === 'Spawn');
    this.spawn = { x: spawn.x, y: spawn.y };

    this.zones = this.mapa.getObjectLayer('Objectes').objects
      .filter((obj) => obj.type === 'zona')
      .map((obj) => ({ nom: obj.name, rect: new Phaser.Geom.Rectangle(obj.x, obj.y, obj.width, obj.height) }));

    // Rètol semitransparent a la part superior de cada zona
    for (const zona of this.zones) {
      this.add.text(zona.rect.centerX, zona.rect.y + 4, zona.nom.toUpperCase(), {
        ...ESTIL_TEXT, fontSize: '11px', strokeThickness: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)', padding: { x: 6, y: 2 }
      }).setOrigin(0.5, 0).setDepth(5);
    }

    // 3. Avatar de la Fase 1, ara col·locat al Spawn i per sobre de totes les capes (depth)
    this.avatar = this.add.circle(spawn.x, spawn.y, 14, 0x10b981)
      .setStrokeStyle(2, 0x0f172a)
      .setDepth(10);

    this.etiqueta = this.add.text(spawn.x, spawn.y - 28, 'Anna', { ...ESTIL_TEXT, fontSize: '14px' })
      .setOrigin(0.5).setDepth(11);

    this.textEstat = this.add.text(spawn.x, spawn.y + 28, 'Disponible', {
      ...ESTIL_TEXT, fontSize: '12px', color: COLORS_ESTAT.Disponible
    }).setOrigin(0.5).setDepth(11);

    // 4. Càmera: limitada a la mida del mapa i centrada a l'avatar
    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.mapa.widthInPixels, this.mapa.heightInPixels);
    camera.centerOn(spawn.x, spawn.y);

    // [REPTE 2] Gràfics on dibuixarem les col·lisions (amagats per defecte)
    this.graficsDebug = this.add.graphics().setDepth(20).setVisible(false);
  }

  // 5. Bucle continu a 60 FPS
  update(time) {
    // L'avatar continua oscil·lant al voltant del Spawn (el moviment amb teclat és a la Fase 3)
    this.avatar.y = this.spawn.y + Math.sin(time * 0.004) * 8;
    this.etiqueta.setPosition(this.avatar.x, this.avatar.y - 28);
    this.textEstat.setPosition(this.avatar.x, this.avatar.y + 28);

    // [NOU FASE 2] En quina zona és l'avatar? Avisem Vue NOMÉS quan canvia (no 60 cops per segon)
    const zona = this.zones.find((z) => z.rect.contains(this.avatar.x, this.avatar.y))?.nom ?? 'Fora de zona';
    if (zona !== this.zonaActual) {
      this.zonaActual = zona;
      this.game.events.emit('canvi-zona', zona);
    }
  }

  // ---------- Mètodes públics (Vue → Phaser) ----------

  // Resum del mapa per mostrar-lo a Vue (Phaser → Vue)
  infoMapa() {
    const propietat = (nom) => this.mapa.properties?.find?.((p) => p.name === nom)?.value;
    const tilesSolids = Object.values(this.capes)
      .reduce((total, capa) => total + capa.filterTiles((tile) => tile.collides).length, 0);

    return {
      nom: propietat('nom') ?? 'Mapa sense nom',
      amplada: this.mapa.width,
      alcada: this.mapa.height,
      midaTile: this.mapa.tileWidth,
      capes: Object.keys(this.capes),
      zones: this.zones.map((z) => z.nom),
      tilesSolids
    };
  }

  actualitzarNom(nouNom) {
    this.etiqueta?.setText(nouNom || 'Anònim');
  }

  canviarColor(hexColor) {
    const color = typeof hexColor === 'string' ? parseInt(hexColor.replace('#', ''), 16) : hexColor;
    if (Number.isNaN(color)) return;
    this.avatar?.setFillStyle(color);
  }

  actualitzarEstat(nouEstat) {
    this.textEstat?.setText(nouEstat).setColor(COLORS_ESTAT[nouEstat] ?? '#ffffff');
  }

  // [REPTE 1] Mostra o amaga una capa de tiles pel seu nom de Tiled
  mostrarCapa(nom, visible) {
    this.capes?.[nom]?.setVisible(visible);
  }

  // [REPTE 2] Pinta en vermell els tiles sòlids de TOTES les capes.
  // Fixa't que amagar una capa NO n'elimina les col·lisions.
  mostrarColisions(visible) {
    if (!this.graficsDebug) return;
    this.graficsDebug.clear().setVisible(visible);
    if (!visible) return;

    for (const capa of Object.values(this.capes)) {
      capa.renderDebug(this.graficsDebug, {
        tileColor: null, // els tiles no sòlids no es pinten
        collidingTileColor: new Phaser.Display.Color(239, 68, 68, 130),
        faceColor: new Phaser.Display.Color(255, 255, 255, 220)
      });
    }
  }

  // [REPTE 3] Zoom de la càmera mantenint l'avatar al centre
  canviarZoom(zoom) {
    if (!this.spawn) return;
    const camera = this.cameras.main;
    camera.setZoom(zoom);
    camera.centerOn(this.spawn.x, this.spawn.y);
  }
} // <-- Clau de tancament de class MainScene
