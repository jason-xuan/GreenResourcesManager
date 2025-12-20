<template>
  <div class="settings-section">
    <div class="settings-grid">
      <SettingSlider
        title="视频列表每页显示数量"
        description="设置视频列表中每页显示的视频数量"
        :model-value="settings.video.listPageSize"
        :min="5"
        :max="50"
        :step="1"
        unit="个"
        @update:model-value="updateSetting('video.listPageSize', $event)"
      />
      
      <SettingSelect
        title="视频播放方式"
        description="选择视频的播放方式"
        :model-value="settings.videoPlayMode"
        :options="videoPlayModeOptions"
        @update:model-value="updateSetting('videoPlayMode', $event)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import SettingSelect from './SettingSelect.vue'
import SettingSlider from './SettingSlider.vue'

export default {
  name: 'VideoSettings',
  components: {
    SettingSelect,
    SettingSlider
  },
  props: {
    settings: {
      type: Object,
      required: true
    }
  },
  emits: ['update:settings'],
  data() {
    return {
      videoPlayModeOptions: [
        { value: 'external', label: '使用外部默认播放器' },
        { value: 'internal', label: '在本应用新窗口中播放' }
      ]
    }
  },
  methods: {
    updateSetting(key: string, value: any) {
      this.$emit('update:settings', { key, value })
    }
  }
}
</script>

<style scoped>
.settings-section {
  border-bottom: 1px solid var(--border-color);
  padding: 30px;
  transition: border-color 0.3s ease;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
}
</style>

