<script setup>
import { ref, reactive, watch } from 'vue';
import PhaserCanvas from './components/PhaserCanvas.vue';

// ---------- Fase 1 · Avatar ----------
const nom = ref('Anna');
const mostrarJoc = ref(true);
const color = ref('#10b981');
const estats = ['Disponible', 'Ocupat', 'Absent'];
const estat = ref('Disponible');
const pausat = ref(false);

// ---------- [NOU FASE 2] Mapa ----------
// [REPTE 1] Visibilitat de cada capa (mateixos noms que a Tiled)
const capesVisibles = reactive({ Terra: true, Parets: true, Mobles: true });
// [REPTE 2] Mode debug de col·lisions
const debugColisions = ref(false);
// [REPTE 3] Zoom de la càmera
const zoom = ref(1);

// Dades que arriben DES de Phaser (Phaser → Vue)
const progres = ref(0);
const infoMapa = ref(null);
const zonaActual = ref(null);

// En amagar el llenç, el mapa es destrueix: buidem les dades rebudes
watch(mostrarJoc, (visible) => {
  if (!visible) {
    progres.value = 0;
    infoMapa.value = null;
    zonaActual.value = null;
  }
});
</script>

<template>
  <main class="contenidor-app">
    <h1>PoC Fase 2 · Mapes de Tiled</h1>

    <!-- Controls de l'avatar (Fase 1) -->
    <fieldset class="controls">
      <legend>Avatar</legend>
      <label>
        Nom
        <input v-model="nom" placeholder="Escriu el teu nom d'usuari..." />
      </label>
      <label>
        Color
        <input v-model="color" type="color" />
      </label>
      <label>
        Estat
        <select v-model="estat">
          <option v-for="e in estats" :key="e" :value="e">{{ e }}</option>
        </select>
      </label>
      <button :disabled="!mostrarJoc" @click="pausat = !pausat">
        {{ pausat ? 'Reprèn' : 'Pausa' }}
      </button>
      <button @click="mostrarJoc = !mostrarJoc">
        {{ mostrarJoc ? 'Amaga el llenç' : 'Mostra el llenç' }}
      </button>
    </fieldset>

    <!-- [NOU FASE 2] Controls del mapa -->
    <fieldset class="controls">
      <legend>Mapa</legend>
      <div class="grup">
        <span class="titol">Capes</span>
        <label v-for="(visible, capa) in capesVisibles" :key="capa" class="check">
          <input v-model="capesVisibles[capa]" type="checkbox" />
          {{ capa }}
        </label>
      </div>
      <label class="check">
        <input v-model="debugColisions" type="checkbox" />
        Mostra col·lisions
      </label>
      <label>
        Zoom · {{ zoom.toFixed(1) }}×
        <!-- min 0.7: per sota, el mapa (960 px) ja no omple el llenç (640 px) -->
        <input v-model.number="zoom" type="range" min="0.7" max="2" step="0.1" />
      </label>
    </fieldset>

    <PhaserCanvas
      v-if="mostrarJoc"
      :nomUsuari="nom"
      :colorAvatar="color"
      :estat="estat"
      :pausat="pausat"
      :capesVisibles="capesVisibles"
      :debugColisions="debugColisions"
      :zoom="zoom"
      @carrega-progres="progres = $event"
      @mapa-carregat="infoMapa = $event"
      @canvi-zona="zonaActual = $event"
    />

    <!-- [NOU FASE 2] Informació que Phaser envia cap a Vue -->
    <section v-if="mostrarJoc" class="info">
      <p v-if="!infoMapa">Carregant mapa… {{ Math.round(progres * 100) }}%</p>
      <dl v-else>
        <dt>Mapa</dt>
        <dd>{{ infoMapa.nom }} · {{ infoMapa.amplada }} × {{ infoMapa.alcada }} tiles de {{ infoMapa.midaTile }} px</dd>
        <dt>Capes</dt>
        <dd>{{ infoMapa.capes.join(', ') }}</dd>
        <dt>Zones</dt>
        <dd>{{ infoMapa.zones.join(', ') }}</dd>
        <dt>Tiles sòlids</dt>
        <dd>{{ infoMapa.tilesSolids }}</dd>
        <dt>Zona actual</dt>
        <dd class="zona">{{ zonaActual ?? '—' }}</dd>
      </dl>
    </section>
  </main>
</template>

<style scoped>
.contenidor-app {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem 1rem;
}

h1 {
  margin: 0;
  font-size: 1.5rem;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-end;
  gap: 0.75rem;
  width: 100%;
  max-width: 640px;
  margin: 0;
  padding: 0.6rem 0.9rem 0.8rem;
  border: 1px solid #334155;
  border-radius: 8px;
}

legend {
  padding: 0 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #10b981;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: #94a3b8;
}

.grup {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.titol {
  font-size: 0.8rem;
  color: #94a3b8;
}

label.check {
  flex-direction: row;
  align-items: center;
  gap: 0.35rem;
  color: #f1f5f9;
  font-size: 0.9rem;
}

input,
select,
button {
  font: inherit;
  font-size: 0.95rem;
  padding: 0.45rem 0.7rem;
  border: 1px solid #334155;
  border-radius: 6px;
  background: #1e293b;
  color: #f1f5f9;
}

input[type='color'] {
  width: 3rem;
  height: 2.3rem;
  padding: 0.15rem;
  cursor: pointer;
}

input[type='checkbox'] {
  width: 1rem;
  height: 1rem;
  padding: 0;
  accent-color: #10b981;
}

input[type='range'] {
  padding: 0;
  accent-color: #10b981;
}

button {
  cursor: pointer;
  background: #10b981;
  border-color: #10b981;
  color: #0f172a;
  font-weight: 600;
}

button:hover:not(:disabled) {
  filter: brightness(1.1);
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.info {
  width: 100%;
  max-width: 640px;
  font-size: 0.85rem;
  color: #cbd5e1;
}

.info p {
  margin: 0;
  text-align: center;
}

dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.3rem 1rem;
  margin: 0;
}

dt {
  color: #94a3b8;
}

dd {
  margin: 0;
}

.zona {
  color: #10b981;
  font-weight: 600;
}
</style>
