<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import Phaser from 'phaser';
import { MainScene } from '../game/MainScene';

// Props que rebem des d'App.vue (Vue → Phaser)
const props = defineProps({
  // Fase 1
  nomUsuari: { type: String, default: 'Anna' },
  colorAvatar: { type: String, default: '#10b981' },
  estat: { type: String, default: 'Disponible' },
  pausat: { type: Boolean, default: false },
  // [NOU FASE 2]
  capesVisibles: { type: Object, default: () => ({ Terra: true, Parets: true, Mobles: true }) },
  debugColisions: { type: Boolean, default: false },
  zoom: { type: Number, default: 1 }
});

// [NOU FASE 2] Esdeveniments que enviem cap a App.vue (Phaser → Vue)
const emit = defineEmits(['carrega-progres', 'mapa-carregat', 'canvi-zona']);

const contenidor = ref(null);
let game = null;

const obtenirEscena = () => game?.scene.getScene('MainScene');

// Aplica TOTES les props a l'escena (en arrencar o en tornar a muntar amb v-if)
function sincronitzarEscena() {
  const escena = obtenirEscena();
  if (!escena) return;
  escena.actualitzarNom(props.nomUsuari);
  escena.canviarColor(props.colorAvatar);
  escena.actualitzarEstat(props.estat);
  for (const [nom, visible] of Object.entries(props.capesVisibles)) escena.mostrarCapa(nom, visible);
  escena.mostrarColisions(props.debugColisions);
  escena.canviarZoom(props.zoom);
  if (props.pausat) escena.scene.pause();
}

onMounted(() => {
  game = new Phaser.Game({
    type: Phaser.AUTO,
    width: 640, height: 400,
    backgroundColor: '#1e293b',
    smoothPixelArt: true,       // [NOU FASE 2] Píxels nítids en fer zoom, però vores suaus (text llegible)
    parent: contenidor.value,
    scene: [MainScene]
  });

  // Phaser → Vue: reenviem els esdeveniments del motor cap al component pare
  game.events.on('carrega-progres', (valor) => emit('carrega-progres', valor));
  game.events.on('canvi-zona', (zona) => emit('canvi-zona', zona));

  // [NOU FASE 2] Amb preload() la càrrega és ASÍNCRONA: 'ready' arriba ABANS que create().
  // Esperem l'esdeveniment 'create' de l'escena, que Phaser emet quan create() ha acabat
  // i l'escena ja és RUNNING (si la paréssim dins de create(), Phaser ho sobreescriuria).
  game.events.once('ready', () => {
    obtenirEscena()?.events.once('create', (escena) => {
      sincronitzarEscena();
      emit('mapa-carregat', escena.infoMapa());
    });
  });
});

onUnmounted(() => {
  game?.destroy(true);
  game = null;
});

// ---------- Watchers (Vue → Phaser) ----------
watch(() => props.nomUsuari, (nouNom) => obtenirEscena()?.actualitzarNom(nouNom));
watch(() => props.colorAvatar, (nouColor) => obtenirEscena()?.canviarColor(nouColor));
watch(() => props.estat, (nouEstat) => obtenirEscena()?.actualitzarEstat(nouEstat));
watch(() => props.pausat, (pausa) => {
  const escena = obtenirEscena();
  if (!escena) return;
  if (pausa) escena.scene.pause();
  else escena.scene.resume();
});

// [REPTE 1] deep: true perquè canviem propietats DINS de l'objecte, no l'objecte sencer
watch(() => props.capesVisibles, (capes) => {
  const escena = obtenirEscena();
  for (const [nom, visible] of Object.entries(capes)) escena?.mostrarCapa(nom, visible);
}, { deep: true });

// [REPTE 2]
watch(() => props.debugColisions, (visible) => obtenirEscena()?.mostrarColisions(visible));

// [REPTE 3]
watch(() => props.zoom, (zoom) => obtenirEscena()?.canviarZoom(zoom));
</script>

<template>
  <!-- Aquí s'injecta el <canvas> -->
  <div ref="contenidor" class="llenc"></div>
</template>

<style scoped>
.llenc {
  line-height: 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.35);
}
</style>
