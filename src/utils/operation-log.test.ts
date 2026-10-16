import { describe, expect, it } from 'vitest'
import {
  formatOperationLogDetail,
  operationLogActionText,
  operationLogModuleText,
  operationLogOperatorText,
  operationLogSummary,
  operationLogTargetText,
  parseOperationLogDetail,
} from './operation-log'

describe('操作日志中文展示', () => {
  it('翻译模块和中英混合操作名称', () => {
    expect(operationLogModuleText('seal')).toBe('刻章')
    expect(operationLogActionText('新增Banner')).toBe('新增轮播图')
    expect(operationLogActionText('绑定OpenID')).toBe('绑定微信账号')
    expect(operationLogActionText('分类')).toBe('分类操作（历史记录）')
  })

  it('为空、未知模块和标准英文动作提供稳定回退', () => {
    expect(operationLogModuleText(null)).toBe('未记录')
    expect(operationLogModuleText('custom')).toBe('custom')
    expect(operationLogActionText('')).toBe('未记录')
    expect(operationLogActionText('create')).toBe('新增')
    expect(operationLogActionText('custom')).toBe('custom')
    expect(operationLogActionText(null)).toBe('未记录')
  })

  it('翻译操作对象并显式提示未解析的占位符', () => {
    expect(operationLogTargetText(':id')).toBe('对象编号未记录')
    expect(operationLogTargetText('admin/scenes/123/seals')).toBe('管理端 · 场景 · 123 · 印章')
    expect(operationLogTargetText('page-decorations/8')).toBe('页面装修 · 8')
    expect(operationLogTargetText('admin-record/seals')).toBe('admin-record · 印章')
  })

  it('规范化 HTTP 动作、未知占位符和多余分隔符', () => {
    expect(operationLogTargetText('')).toBe('未记录')
    expect(operationLogTargetText('/POST/orders/{unknown}/')).toBe('新增 · 订单 · 对象编号未记录')
    expect(operationLogTargetText('PATCH/V2订单')).toBe('更新 · 新版订单')
    expect(operationLogTargetText(null)).toBe('未记录')
    expect(operationLogTargetText('/')).toBe('未记录')
  })

  it('优先展示管理员昵称并区分已删除账号和系统操作', () => {
    expect(operationLogOperatorText({ admin: { nickname: '小王', username: 'wang' } })).toBe('小王')
    expect(operationLogOperatorText({ admin: { username: 'wang' } })).toBe('wang')
    expect(operationLogOperatorText({ adminId: 1 })).toBe('已删除的管理员')
    expect(operationLogOperatorText(null)).toBe('系统或业务端')
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
    expect(formatOperationLogDetail({ status: null, role: null })).toContain('"状态": "未记录"')
  })

  it('明确标识异常和截断详情', () => {
    expect(operationLogSummary('{bad json', '更新')).toBe('详情格式异常')
    expect(operationLogSummary(JSON.stringify({ truncated: true, message: '日志内容过长，以下为截断预览' }), '更新'))
      .toBe('日志内容过长，以下为截断预览')
    expect(operationLogSummary(JSON.stringify({ error: '参数不正确' }), '更新失败'))
      .toBe('操作失败：参数不正确')
  })

  it('覆盖摘要的创建、删除、登录和兜底分支', () => {
    expect(operationLogSummary(null, '更新')).toBe('无详情')
    expect(operationLogSummary({ serializationError: true }, '更新')).toBe('详情生成失败')
    expect(operationLogSummary({ truncated: true }, '更新')).toBe('日志内容已截断')
    expect(operationLogSummary({ result: { id: 1 } }, '删除')).toBe('已删除')
    expect(operationLogSummary({ result: 'ok' }, '更新')).toBe('无结果摘要')
    expect(operationLogSummary({ result: { username: 'root' } }, 'login')).toBe('root')
    expect(operationLogSummary({ result: { title: '公告' } }, 'create')).toBe('公告')
    expect(operationLogSummary({ result: { id: '1234567890' } }, 'create')).toBe('12345678')
    expect(operationLogSummary({ result: {} }, 'create')).toBe('新增成功')
    expect(operationLogSummary({ result: { username: '新增账号' } }, '创建')).toBe('新增账号')
    expect(operationLogSummary({ result: { nickname: '昵称' } }, '添加')).toBe('昵称')
    expect(operationLogSummary({ result: { id: '' } }, '新增')).toBe('新增成功')
    expect(operationLogSummary({ result: { name: '测试' } }, '更新')).toBe('名称：测试')
    expect(operationLogSummary({ result: {} }, '更新')).toBe('无结果摘要')
  })

  it('解析对象或 JSON 详情并拒绝数组与原始值', () => {
    const object = { id: 1 }
    expect(parseOperationLogDetail(object)).toBe(object)
    expect(parseOperationLogDetail('{"id":1}')).toEqual({ id: 1 })
    expect(parseOperationLogDetail('[]')).toBeNull()
    expect(parseOperationLogDetail('1')).toBeNull()
    expect(parseOperationLogDetail('bad')).toBeNull()
  })

  it('格式化嵌套数组、空对象与非法字符串', () => {
    expect(formatOperationLogDetail(null)).toBe('（空）')
    expect(formatOperationLogDetail({})).toBe('（空）')
    expect(formatOperationLogDetail('')).toBe('（空）')
    expect(formatOperationLogDetail('plain')).toBe('plain')
    expect(formatOperationLogDetail('{"module":"seal","action":"create","target":"orders","name":"","role":"unknown"}'))
      .toContain('"业务模块": "刻章"')
    const nested = formatOperationLogDetail({ items: [{ enabled: false, value: null }] })
    expect(nested).toContain('"项目"')
    expect(nested).toContain('"是否启用": "否"')
    expect(nested).toContain('"value": "未记录"')
  })
})
