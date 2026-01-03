<template>
  <div class="audios-grid" v-if="audios.length > 0" :style="layoutStyles">
    <MediaCard
      v-for="audio in audios" 
      :key="audio.id"
      :item="audio"
      type="audio"
      :isElectronEnvironment="isElectronEnvironment"
      :file-exists="audio.fileExists"
      :scale="scale"
      @click="$emit('audio-click', audio)"
      @contextmenu="$emit('audio-contextmenu', $event, audio)"
      @action="$emit('audio-action', audio)"
    />
  </div>
</template>

<script lang="ts">
import { computed } from 'vue'
import MediaCard from '../MediaCard.vue'
import type { Audio } from '../../types/audio'

export default {
  name: 'AudioGrid',
  components: {
    MediaCard
  },
  props: {
    audios: {
      type: Array as () => Audio[],
      required: true,
      default: () => []
    },
    isElectronEnvironment: {
      type: Boolean,
      default: false
    },
    scale: {
      type: Number,
      default: 100
    }
  },
  emits: ['audio-click', 'audio-contextmenu', 'audio-action'],
  setup(props) {
    const layoutStyles = computed(() => {
      const s = props.scale
      const scaledWidth = Math.max(100, Math.round(280 * (s / 100)))
      return {
        '--card-scale': s / 100,
        '--show-stats': s < 30 ? 'none' : 'flex',
        '--show-icon': s < 20 ? 'none' : 'block',
        'grid-template-columns': `repeat(auto-fill, ${scaledWidth}px)`,
        'justify-content': 'start'
      }
    })
    return { layoutStyles }
  }
}
</script>

<style scoped>
.audios-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  padding: 10px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .audios-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 15px;
    padding: 15px;
  }
}

@media (min-width: 1200px) {
  .audios-grid {
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  }
}
</style>

