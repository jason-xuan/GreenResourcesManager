/**
 * 桌宠好感度等级系统 Composable
 * 负责管理好感度的等级和经验值
 */

import { ref, computed } from 'vue'

export interface AffectionData {
  level: number
  exp: number
}

/**
 * 计算升级所需经验值
 * @param level 当前等级（0级升到1级需要100，1级升到2级需要110，以此类推）
 * @returns 升级所需经验值
 */
function getExpRequiredForLevel(level: number): number {
  // lv0 → lv1: 100
  // lv1 → lv2: 110
  // lv2 → lv3: 120
  // 公式：100 + level * 10
  return 100 + level * 10
}

/**
 * 根据总经验值计算等级和经验值
 * @param totalExp 总经验值
 * @returns { level: number, exp: number } 当前等级和当前等级的经验值
 */
function calculateLevelFromExp(totalExp: number): AffectionData {
  let level = 0
  let remainingExp = totalExp
  
  while (true) {
    const expRequired = getExpRequiredForLevel(level)
    if (remainingExp >= expRequired) {
      remainingExp -= expRequired
      level++
    } else {
      break
    }
  }
  
  return {
    level,
    exp: remainingExp
  }
}

/**
 * 根据等级和经验值计算总经验值
 * @param level 等级
 * @param exp 当前等级的经验值
 * @returns 总经验值
 */
function calculateTotalExp(level: number, exp: number): number {
  let totalExp = exp
  
  for (let i = 0; i < level; i++) {
    totalExp += getExpRequiredForLevel(i)
  }
  
  return totalExp
}

export function usePetAffection() {
  // 存储总经验值（用于保存和加载）
  const totalExp = ref(0)
  
  // 计算当前等级和经验值
  const affectionData = computed<AffectionData>(() => {
    return calculateLevelFromExp(totalExp.value)
  })
  
  // 当前等级
  const level = computed(() => affectionData.value.level)
  
  // 当前等级的经验值
  const exp = computed(() => affectionData.value.exp)
  
  // 升级所需经验值
  const expRequired = computed(() => {
    return getExpRequiredForLevel(level.value)
  })
  
  // 经验值进度百分比
  const expProgress = computed(() => {
    if (expRequired.value === 0) return 100
    return (exp.value / expRequired.value) * 100
  })
  
  // 增加经验值
  function addExp(amount: number) {
    totalExp.value += amount
  }
  
  // 设置总经验值
  function setTotalExp(value: number) {
    totalExp.value = Math.max(0, value)
  }
  
  // 设置等级和经验值（用于从保存的数据加载）
  function setAffectionData(level: number, exp: number) {
    totalExp.value = calculateTotalExp(level, exp)
  }
  
  // 获取总经验值（用于保存）
  function getTotalExp(): number {
    return totalExp.value
  }
  
  return {
    level,
    exp,
    expRequired,
    expProgress,
    totalExp,
    addExp,
    setTotalExp,
    setAffectionData,
    getTotalExp
  }
}

