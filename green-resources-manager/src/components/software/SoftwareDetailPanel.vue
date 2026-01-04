<template>
  <DetailPanel 
    :visible="visible" 
    :item="software" 
    type="software" 
    :is-running="isRunning"
    @close="handleClose"
    @action="handleAction"
    @update-rating="handleUpdateRating"
    @update-comment="handleUpdateComment"
    @toggle-favorite="handleToggleFavorite"
  />
</template>

<script lang="ts">
import DetailPanel from '../DetailPanel.vue'

export default {
  name: 'SoftwareDetailPanel',
  components: {
    DetailPanel
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    software: {
      type: Object,
      default: null
    },
    isRunning: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'action', 'update-rating', 'update-comment', 'toggle-favorite'],
  methods: {
    handleClose() {
      this.$emit('close')
    },
    handleAction(actionKey, software) {
      this.$emit('action', actionKey, software)
    },
    handleUpdateRating(rating, software) {
      this.$emit('update-rating', rating, software)
    },
    handleUpdateComment(comment, software) {
      this.$emit('update-comment', comment, software)
    },
    handleToggleFavorite(software) {
      this.$emit('toggle-favorite', software)
    }
  }
}
</script>

<style scoped>
/* 样式由 DetailPanel 组件提供 */
</style>

