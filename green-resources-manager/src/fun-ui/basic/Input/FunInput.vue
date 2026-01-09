<template>
  <input
    class="fun-input"
    :type="type"
    :value="modelValue"
    @input="handleInput"
    @blur="handleBlur"
    @focus="handleFocus"
    :placeholder="placeholder"
    :readonly="readonly"
    :disabled="disabled"
    :class="{
      'fun-input--readonly': readonly,
      'fun-input--disabled': disabled
    }"
    :style="inputStyle"
  />
</template>

<script setup lang="ts">
interface Props {
  /** 输入框的值（v-model） */
  modelValue: string
  /** 输入框类型 */
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search'
  /** 占位符文本 */
  placeholder?: string
  /** 是否只读 */
  readonly?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义样式 */
  inputStyle?: Record<string, string | number>
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  readonly: false,
  disabled: false,
  inputStyle: () => ({})
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'blur': [event: FocusEvent]
  'focus': [event: FocusEvent]
}>()

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const handleBlur = (event: FocusEvent) => {
  emit('blur', event)
}

const handleFocus = (event: FocusEvent) => {
  emit('focus', event)
}
</script>

<style scoped lang="scss">
.fun-input {
  padding: var(--spacing-sm, 8px) var(--spacing-md, 12px);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: var(--radius-md, 6px);
  background: var(--bg-secondary, #ffffff);
  color: var(--text-primary, #333333);
  font-size: var(--font-size-base, 0.9rem);
  min-width: 200px;
  transition: all var(--transition-base, 0.3s ease);
  outline: none;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    border-color: var(--accent-color, #66c0f4);
    box-shadow: 0 0 0 3px rgba(102, 192, 244, 0.1);
  }

  &::placeholder {
    color: var(--text-tertiary, #999999);
  }

  &--readonly {
    cursor: default;
    background: var(--bg-tertiary, #f5f5f5);
  }

  &--disabled {
    cursor: not-allowed;
    opacity: 0.6;
    background: var(--bg-tertiary, #f5f5f5);
  }

  &:hover:not(:disabled):not(:read-only) {
    border-color: var(--border-color-hover, #b0b0b0);
  }
}
</style>