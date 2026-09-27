import { ref } from 'vue'

/**
 * 竞态守卫：快速切换 Tab/筛选时，后发先至的旧请求结果直接丢弃。
 * 用法（列表页 fetch 内）：
 *   const guard = useLatest()
 *   async function fetchData() {
 *     const my = guard.next()
 *     const res = await api(params)
 *     if (!guard.isCurrent(my)) return
 *     ...写回列表
 *   }
 */
export function useLatest() {
  const seq = ref(0)
  function next() {
    seq.value += 1
    return seq.value
  }
  function isCurrent(id: number) {
    return id === seq.value
  }
  return { next, isCurrent }
}
