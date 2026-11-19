# poc-fase2-vue-phaser

Prova de Concepte de la **Fase 2**: carregar un **mapa de Tiled** (JSON + tileset) dins de l'escena de **Phaser 4**, llegir-ne les capes i els objectes, i comunicar Phaser ↔ **Vue 3** en tots dos sentits.

Parteix del codi de la Fase 1 (avatar amb nom, color, estat i pausa), que ara apareix damunt del mapa.

## Execució

```bash
npm install      # instal·la les dependències
npm run dev      # servidor de desenvolupament → http://localhost:5173
npm run build    # versió de producció a dist/
npm run preview  # serveix dist/ en local
```

## Abast

**Dins de l'scope**

- Carregar el tileset (`load.image`) i el mapa (`load.tilemapTiledJSON`) dins de `preload()`.
- Crear el `Tilemap`, vincular el tileset i crear les capes `Terra`, `Parets` i `Mobles`.
- Marcar els tiles sòlids amb la propietat personalitzada de Tiled `collides = true`.
- Llegir la capa d'objectes `Objectes`: el punt `Spawn` i les zones (`type = "zona"`).
- Limitar la càmera a la mida del mapa i centrar-la a l'avatar.
- **Phaser → Vue**: progrés de càrrega, resum del mapa i zona actual de l'avatar.

**Fora de l'scope (fases següents)**

- Moviment amb teclat i col·lisions reals amb físiques (Fase 3).
- Vídeo i WebRTC (Fases 4 i 5).
- Backend Node.js.

## Estructura

| Fitxer | Responsabilitat |
| --- | --- |
| `public/assets/maps/oficina.json` | Mapa en format Tiled JSON (30 × 20 tiles de 32 px), amb el tileset **incrustat**. |
| `public/assets/tilesets/oficina.png` | Tileset de 24 tiles amb les vores extrudides (margin 1, spacing 2). |
| `src/App.vue` | Controls HTML (avatar i mapa) i panell amb la informació que arriba de Phaser. |
| `src/components/PhaserCanvas.vue` | Component pont: crea/destrueix el joc, `watch()` de les props i reenviament d'esdeveniments amb `defineEmits()`. |
| `src/game/MainScene.js` | `preload()`, `create()` amb el mapa, `update()` i mètodes públics. |

## Passos clau

### 1. `preload()`: carregar els fitxers

```js
this.load.image('tiles-oficina', 'assets/tilesets/oficina.png');
this.load.tilemapTiledJSON('mapa-oficina', 'assets/maps/oficina.json');
```

La primera cadena és la **clau** interna de Phaser. Els fitxers de `public/` se serveixen des de l'arrel.

### 2. `create()`: mapa, tileset i capes

```js
this.mapa = this.make.tilemap({ key: 'mapa-oficina' });
const tileset = this.mapa.addTilesetImage('oficina', 'tiles-oficina', 32, 32, 1, 2);
this.capes = {
  Terra: this.mapa.createLayer('Terra', tileset, 0, 0),
  Parets: this.mapa.createLayer('Parets', tileset, 0, 0),
  Mobles: this.mapa.createLayer('Mobles', tileset, 0, 0)
};
Object.values(this.capes).forEach((capa) => capa.setCollisionByProperty({ collides: true }));
```

- `'oficina'` ha de coincidir **exactament** amb el nom del tileset dins de Tiled.
- Els noms de les capes també han de coincidir amb els de Tiled.
- `1, 2` són el *margin* i el *spacing* del PNG.

### 3. Capa d'objectes

```js
const spawn = this.mapa.findObject('Objectes', (obj) => obj.name === 'Spawn');
const zones = this.mapa.getObjectLayer('Objectes').objects.filter((obj) => obj.type === 'zona');
```

### 4. Càmera

```js
this.cameras.main.setBounds(0, 0, this.mapa.widthInPixels, this.mapa.heightInPixels);
this.cameras.main.centerOn(spawn.x, spawn.y);
```

### 5. ⚠️ Sincronitzar Vue quan la càrrega és asíncrona

A la Fase 1 n'hi havia prou amb `game.events.once('ready')`, perquè `create()` s'executava de seguida. Ara, amb `preload()`, la càrrega és asíncrona i **`ready` arriba abans que `create()`**. Si cridéssim `actualitzarNom()` en aquell moment, l'etiqueta encara no existiria.

La solució és esperar l'esdeveniment `create` de l'escena, que Phaser emet quan `create()` ha acabat i l'escena ja està en estat `RUNNING`:

```js
game.events.once('ready', () => {
  obtenirEscena()?.events.once('create', (escena) => {
    sincronitzarEscena();
    emit('mapa-carregat', escena.infoMapa());
  });
});
```

No ho fem des de dins de `create()`, perquè Phaser posa l'escena en `RUNNING` *després* de `create()`. Un `scene.pause()` cridat allà dins quedaria sobreescrit.

### 6. Phaser → Vue

L'escena emet esdeveniments pel bus `this.game.events` (`carrega-progres`, `canvi-zona`). `PhaserCanvas.vue` els reenvia amb `defineEmits()`, i `App.vue` els rep amb `@canvi-zona="..."`.

La zona actual es calcula dins de `update()`, però **només s'emet quan canvia**, no 60 cops per segon.

## Repte d'autonomia

1. **Visibilitat de capes**: checkbox per capa → prop `capesVisibles` (objecte, `watch` amb `deep: true`) → `mostrarCapa(nom, visible)`.
2. **Debug de col·lisions**: checkbox → prop `debugColisions` → `mostrarColisions()` amb `capa.renderDebug(graphics, {...})`. Amagar una capa **no** n'elimina les col·lisions.
3. **Zoom de la càmera**: slider de 0.7× a 2× → prop `zoom` → `camera.setZoom()` + `centerOn()`. Per sota de 0.7× el mapa (960 px) ja no omple el llenç (640 px).

## Editar el mapa amb Tiled

1. Obre `public/assets/maps/oficina.json` amb [Tiled](https://www.mapeditor.org/).
2. Mantén els noms de les capes (`Terra`, `Parets`, `Mobles`, `Objectes`) i el nom del tileset (`oficina`).
3. Perquè un tile sigui sòlid, afegeix-li la propietat booleana `collides = true` a l'editor del tileset.
4. El tileset ha d'estar **incrustat** al mapa (*Embed Tileset*). Phaser no admet tilesets externs (`.tsx`/`.tsj`).
5. Desa en format JSON (*File → Export As… → JSON map files*).

## Proves al navegador

- [ ] El mapa es veu amb les 3 capes i l'avatar oscil·la al Passadís.
- [ ] El panell inferior mostra la mida del mapa, les capes, les zones, els tiles sòlids i «Zona actual: Passadís».
- [ ] Desmarcar `Terra`, `Parets` o `Mobles` amaga la capa a l'instant.
- [ ] «Mostra col·lisions» pinta en vermell parets, mobles, arbres i aigua.
- [ ] El zoom amplia o redueix el mapa i manté l'avatar al centre.
- [ ] Si amagues el llenç, canvies nom, color, estat, zoom o capes i el tornes a mostrar, tot s'aplica en acabar de carregar el mapa.
- [ ] Si està en pausa en amagar-lo, en tornar a mostrar-lo continua en pausa.
- [ ] Amaga/Mostra repetidament: un sol `<canvas>` i cap error a la consola (F12).

## Lliurament

Comprimir la carpeta en un `.zip` **sense `node_modules`** (ni `dist`), o lliurar l'enllaç al repositori Git.
