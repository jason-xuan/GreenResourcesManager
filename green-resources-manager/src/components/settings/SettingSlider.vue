<template>
  <div class="setting-item">
    <label class="setting-label">
      <span class="setting-title">{{ title }}</span>
      <span class="setting-desc" v-if="description">{{ description }}</span>
    </label>
    <div class="setting-control">
      <input 
        type="range" 
        :value="modelValue"
        @input="handleInput"
        :min="min"
        :max="max"
        :step="step"
        class="setting-slider"
      >
      <span class="setting-value">{{ formatValue(modelValue) }}</span>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'SettingSlider',
  props: {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    modelValue: {
      type: Number,
      required: true
    },
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 100
    },
    step: {
      type: Number,
      default: 1
    },
    unit: {
      type: String,
      default: ''
    },
    format: {
      type: Function,
      default: null
    }
  },
  emits: ['update:modelValue'],
  methods: {
    handleInput(event: Event) {
      const value = parseFloat((event.target as HTMLInputElement).value)
      this.$emit('update:modelValue', value)
    },
    formatValue(value: number): string {
      if (this.format) {
        return this.format(value)
      }
      return this.unit ? `${value} ${this.unit}` : String(value)
    }
  }
}
</script>

<style scoped>
.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid var(--bg-tertiary);
  transition: border-color 0.3s ease;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.setting-title {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
  transition: color 0.3s ease;
}

.setting-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  transition: color 0.3s ease;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.setting-slider {
  width: 150px;
  margin-right: 10px;
}

.setting-value {
  color: #718096;
  font-size: 0.9rem;
  min-width: 50px;
}
</style>

