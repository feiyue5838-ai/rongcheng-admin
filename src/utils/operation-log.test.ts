import { describe, expect, it } from 'vitest'
import {
  formatOperationLogDetail,
  operationLogActionText,
  operationLogModuleText,
  operationLogSummary,
  operationLogTargetText,
} from './operation-log'

describe('操作日志中文展示', () => {
  it('翻译模块和中英混合操作名称', () => {
    expect(operationLogModuleText('seal')).toBe('刻章')
    expect(operationLogActionText('新增Banner')).toBe('新增轮播图')
    expect(operationLogActionText('绑定OpenID')).toBe('绑定微信账号')
    expect(operationLogActionText('分类')).toBe('分类操作（历史记录）')
  })

  it('翻译操作对象并显式提示未解析的占位符', () => {
    expect(operationLogTargetText(':id')).toBe('对象编号未记录')
    expect(operationLogTargetText('admin/scenes/123/seals')).toBe('管理端 · 场景 · 123 · 印章')
    expect(operationLogTargetText('page-decorations/8')).toBe('页面装修 · 8')
    expect(operationLogTargetText('admin-record/seals')).toBe('admin-record · 印章')
  })

  it('不会把未知数字状态误写成禁用', () => {
    const detail = JSON.stringify({ result: { status: 2 } })
    expect(operationLogSummary(detail, '更新')).toBe('状态：2')
  })

  it('兼容数字类型编号', () => {
    const detail = JSON.stringify({ result: { id: 123456789 } })
    expect(operationLogSummary(detail, '更新')).toBe('123456789')
  })

  it('将常用详情字段和值转成中文', () => {
    const text = formatOperationLogDetail({ status: 'approved', role: 'superadmin', enabled: true })
    expect(text).toContain('"状态": "已通过"')
    expect(text).toContain('"角色": "超级管理员"')
    expect(text).toContain('"是否启用": "是"')
  })

  it('明确标识异常和截断详情', () => {
    expect(operationLogSummary('{bad json', '更新')).toBe('详情格式异常')
    expect(operationLogSummary(JSON.stringify({ truncated: true, message: '日志内容过长，以下为截断预览' }), '更新'))
      .toBe('日志内容过长，以下为截断预览')
    expect(operationLogSummary(JSON.stringify({ error: '参数不正确' }), '更新失败'))
      .toBe('操作失败：参数不正确')
  })
})
