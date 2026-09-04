/**
 * 履约状态统一字典（V2.0 单一数据源）
 *
 * 后端状态流（FulfillmentV2Service / OrderV2）：
 * 1. 履约单层 fulfillment_orders.status（网点工作台视角）：
 *    pending_assignment → assigned → accepted → processing → completed
 *    注：网点 deliverOrder 后履约单直接置 completed；delivering/signed 只出现在订单层
 * 2. 订单层 orders.fulfillment_status（供应链管理视角）：
 *    pending_assignment / assigned / accepted / processing / delivering / signed / completed / cancelled
 *
 * 同一状态两种语境文案不同：订单层 assigned = 「已派单」（管理员已派给供应商）；
 * 网点层 assigned = 「待接单」（供应商待接）。tag 同理：订单层已派单为 normal 蓝，
 * 网点层待接单为需行动的橙。各页面禁止再自行硬编码状态 map，统一从这里取。
 */

export type FulfillmentStatus =
  | 'pending_assignment'
  | 'assigned'
  | 'accepted'
  | 'processing'
  | 'delivering'
  | 'signed'
  | 'completed'
  | 'cancelled'

/** 订单层/供应链视角文案（SupplyOrders / SupplyDetail / UnassignedPool / dispatch-rules） */
export const FULFILLMENT_STATUS_TEXT: Record<FulfillmentStatus, string> = {
  pending_assignment: '待派单',
  assigned: '已派单',
  accepted: '已接单',
  processing: '制作中',
  delivering: '发货中',
  signed: '已签收',
  completed: '已完成',
  cancelled: '已取消',
}

/** 网点层/履约工作台视角文案（OutletDashboard） */
export const FULFILLMENT_STATUS_TEXT_OUTLET: Record<FulfillmentStatus, string> = {
  pending_assignment: '待派单',
  assigned: '待接单',
  accepted: '已接单',
  processing: '制作中',
  delivering: '发货中',
  signed: '已签收',
  completed: '已完成',
  cancelled: '已取消',
}

/** 订单层 tag：assigned=已派单 normal 蓝 */
export const FULFILLMENT_STATUS_TAG: Record<FulfillmentStatus, string> = {
  pending_assignment: 'warning',
  assigned: 'primary',
  accepted: 'primary',
  processing: 'primary',
  delivering: 'primary',
  signed: 'success',
  completed: 'success',
  cancelled: 'info',
}

/** 网点层 tag：assigned=待接单需行动 橙 */
export const FULFILLMENT_STATUS_TAG_OUTLET: Record<FulfillmentStatus, string> = {
  pending_assignment: 'warning',
  assigned: 'warning',
  accepted: 'primary',
  processing: 'primary',
  delivering: 'primary',
  signed: 'success',
  completed: 'success',
  cancelled: 'info',
}

/** 订单层文案取值（缺省回退原文） */
export function fulfillmentStatusText(status: string | null | undefined): string {
  return FULFILLMENT_STATUS_TEXT[status as FulfillmentStatus] || String(status ?? '-')
}

/** 网点层文案取值（缺省回退原文） */
export function outletFulfillmentStatusText(status: string | null | undefined): string {
  return FULFILLMENT_STATUS_TEXT_OUTLET[status as FulfillmentStatus] || String(status ?? '-')
}

/** 订单层 tag 取值（缺省 info） */
export function fulfillmentStatusTag(status: string | null | undefined): string {
  return FULFILLMENT_STATUS_TAG[status as FulfillmentStatus] || 'info'
}

/** 网点层 tag 取值（缺省 info） */
export function outletFulfillmentStatusTag(status: string | null | undefined): string {
  return FULFILLMENT_STATUS_TAG_OUTLET[status as FulfillmentStatus] || 'info'
}

/**
 * 网点工作台待办优先级（越小越靠前），用于「待办置顶」排序。
 * 履约单层实际 6 态：assigned(待接单) < accepted(已接单) < processing(制作中) < completed < cancelled
 */
export const FULFILLMENT_TODO_PRIORITY: Record<string, number> = {
  assigned: 0,
  accepted: 1,
  processing: 2,
  completed: 3,
  cancelled: 4,
  delivering: 5,
  signed: 6,
  pending_assignment: 7,
}
