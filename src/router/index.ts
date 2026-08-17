import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useOutletStore } from '@/stores/outlet'
import { hasAccess } from '@/constants/roles'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/login/index.vue'),
      meta: { title: '登录' },
    },
    // 网点端独立路由
    {
      path: '/Outlet-login',
      name: 'OutletLogin',
      component: () => import('@/views/outlet/Login.vue'),
      meta: { title: '网点登录' },
    },
    {
      path: '/Outlet',
      component: () => import('@/views/outlet/Layout.vue'),
      redirect: '/Outlet/workspace',
      meta: { requiresOutletAuth: true },
      children: [
        { path: 'workspace', name: 'OutletWorkspace', component: () => import('@/views/outlet/Workspace.vue'), meta: { title: '网点工作台', requiresOutletAuth: true } },
      ],
    },
    {
      path: '/',
      component: () => import('@/layout/index.vue'),
      redirect: '/dashboard',
      children: [
        { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/dashboard/index.vue'), meta: { title: '工作台' } },
        // 订单管理
        // ===== V2.0 供应链视图 =====
        { path: 'v2/orders', name: 'V2SupplyOrders', component: () => import('@/views/v2/SupplyOrders.vue'), meta: { title: '供应链订单' } },
        { path: 'v2/orders/unassigned', name: 'V2UnassignedPool', component: () => import('@/views/v2/UnassignedPool.vue'), meta: { title: '待派单池' } },
        { path: 'v2/orders/detail', name: 'V2SupplyDetail', component: () => import('@/views/v2/SupplyDetail.vue'), meta: { title: '供应链视图' } },
        { path: 'v2/settlements', name: 'V2Settlements', component: () => import('@/views/v2/Settlements.vue'), meta: { title: 'V2.0 结算管理' } },
        { path: 'orders/seal', name: 'SealOrders', component: () => import('@/views/orders/seal.vue'), meta: { title: '刻章订单' } },
        { path: 'orders/newspaper', name: 'NewspaperOrders', component: () => import('@/views/orders/newspaper.vue'), meta: { title: '登报订单' } },
        { path: 'orders/bookkeeping', name: 'BookkeepingOrders', component: () => import('@/views/orders/bookkeeping.vue'), meta: { title: '代理记账订单' } },
        { path: 'orders/:id', name: 'OrderDetail', component: () => import('@/views/orders/detail.vue'), meta: { title: '订单详情' } },
        // 售后管理
        { path: 'after-sales/orders', name: 'AfterSalesOrders', component: () => import('@/views/after-sales/after-sales-orders.vue'), meta: { title: '售后订单' } },
        { path: 'after-sales/refund-records', name: 'RefundRecords', component: () => import('@/views/after-sales/refund-records.vue'), meta: { title: '退款记录' } },
        // 产品管理
        { path: 'products/seals', redirect: '/products/seals/enterprise' },
        { path: 'products/seals/enterprise', name: 'SealProductsEnterprise', component: () => import('@/views/products/seals.vue'), meta: { title: '企业刻章' } },
        { path: 'products/seals/personal', name: 'SealProductsPersonal', component: () => import('@/views/products/seals.vue'), meta: { title: '个人印章' } },
        { path: 'products/seals/electronic', name: 'SealProductsElectronic', component: () => import('@/views/products/seals.vue'), meta: { title: '电子印章' } },
        { path: 'products/record-queries', name: 'RecordQueries', component: () => import('@/views/products/record-queries.vue'), meta: { title: '刻章备案查询' } },
        { path: 'products/scenes', name: 'Scenes', component: () => import('@/views/products/scenes.vue'), meta: { title: '场景管理' } },
        { path: 'products/packages', name: 'SealPackages', component: () => import('@/views/products/packages.vue'), meta: { title: '套餐管理' } },
        // 报纸管理 - 统一入口
        { path: 'products/newspapers', name: 'Newspapers', component: () => import('@/views/products/newspapers.vue'), meta: { title: '报纸仓库' } },
        { path: 'products/newspaper-templates', name: 'NewspaperTemplates', component: () => import('@/views/products/newspaper-templates.vue'), meta: { title: '公告模板管理' } },
        // 代理记账管理
        { path: 'products/bookkeeping-packages', name: 'BookkeepingPackages', component: () => import('@/views/products/bookkeeping-packages.vue'), meta: { title: '代理记账套餐配置' } },
        // 兼容旧分类路由，重定向到统一入口
        { path: 'products/newspapers/:categoryKey', redirect: '/products/newspapers' },
        // 用户管理
        { path: 'users', name: 'Users', component: () => import('@/views/users/index.vue'), meta: { title: '用户管理' } },
        // 评价管理
        { path: 'reviews', name: 'Reviews', component: () => import('@/views/reviews/index.vue'), meta: { title: '评价管理' } },
        // 问答管理
        { path: 'questions', name: 'Questions', component: () => import('@/views/questions/index.vue'), meta: { title: '问答管理' } },
        { path: 'faq', name: 'Faq', component: () => import('@/views/faq/index.vue'), meta: { title: '帮助中心' } },
        // 内容管理
        // 内容管理（Banner/公告/业务介绍 合并）
        { path: 'content', name: 'ContentManage', component: () => import('@/views/content/index.vue'), meta: { title: '内容管理' } },
        // 网点管理
        { path: 'outlets', name: 'Outlets', component: () => import('@/views/outlets/OutletList.vue'), meta: { title: '合作网点' } },
        { path: 'outlets/dashboard', name: 'OutletDashboard', component: () => import('@/views/outlets/OutletDashboard.vue'), meta: { title: '网点控制台' } },
        { path: 'outlets/assign', name: 'OrderAssign', component: () => import('@/views/outlets/OrderAssign.vue'), meta: { title: '订单分配' } },
        { path: 'outlets/receipts', name: 'DeliveryReceipts', component: () => import('@/views/outlets/DeliveryReceipts.vue'), meta: { title: '交付回执' } },
        { path: 'outlets/overview', name: 'OutletOverview', component: () => import('@/views/outlets/OutletOverview.vue'), meta: { title: '全网点总览' } },
  { path: 'finance', name: 'Finance', component: () => import('@/views/finance/index.vue'), meta: { title: '财务总览' } },
        { path: 'finance/rules', name: 'FinanceRules', component: () => import('@/views/finance/rules.vue'), meta: { title: '规则配置' } },
        { path: 'finance/settlement', redirect: to => ({ path: '/finance', query: { tab: 'settlement' } }) },
        { path: 'finance/transaction', redirect: to => ({ path: '/finance', query: { tab: 'transaction' } }) },
        { path: 'finance/refund', redirect: to => ({ path: '/finance', query: { tab: 'refund' } }) },
        { path: 'settlement', redirect: to => ({ path: '/finance', query: { tab: 'settlement' } }) },
        { path: 'rules', redirect: to => ({ path: '/finance', query: { tab: 'rules' } }) },
        { path: 'pricing', redirect: to => ({ path: '/finance', query: { tab: 'rules', sub: 'pricing' } }) },
        { path: 'transaction', redirect: to => ({ path: '/finance', query: { tab: 'transaction' } }) },
        { path: 'refund', redirect: to => ({ path: '/finance', query: { tab: 'refund' } }) },
        // legacy /stores aliases kept for old bookmarks (store->outlet rename)
        { path: 'stores', redirect: '/outlets' },
        { path: 'stores/dashboard', redirect: '/outlets/dashboard' },
        { path: 'stores/assign', redirect: '/outlets/assign' },
        { path: 'stores/receipts', redirect: '/outlets/receipts' },
        // 系统管理
        { path: 'system/admins', name: 'Admins', component: () => import('@/views/system/admins.vue'), meta: { title: '管理员' } },
        { path: 'system/logs', name: 'Logs', component: () => import('@/views/system/logs.vue'), meta: { title: '操作日志' } },
        { path: 'system/configs', name: 'Configs', component: () => import('@/views/system/configs.vue'), meta: { title: '系统配置' } },
        { path: 'system/dispatch-rules', name: 'DispatchRules', component: () => import('@/views/system/dispatch-rules.vue'), meta: { title: '派单规则' } },
        { path: 'system/menu-roles', name: 'MenuRoles', component: () => import('@/views/system/menu-roles.vue'), meta: { title: '菜单权限' } },
        // 403 无权访问
        { path: '/403', name: 'Forbidden', component: () => import('@/views/error/403.vue'), meta: { title: '无权访问' } },
        // 404 兜底：未匹配路由重定向到工作台（防止删路由/旧书签导致白屏）
        { path: ':pathMatch(.*)*', redirect: '/dashboard' },
      ],
    },
  ],
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 网点端独立标题
  if (to.path.startsWith('/Outlet')) {
    document.title = `${to.meta.title || ''} - 蓉城企服网点工作台`
  } else {
    document.title = `${to.meta.title || ''} - 蓉城企服管理后台`
  }

  const authStore = useAuthStore()
  const outletStore = useOutletStore()

  // 网点端鉴权
  if (to.meta.requiresOutletAuth && !outletStore.token) {
    console.warn('ROUTER GUARD: requireOutletAuth redirect, token=', !!outletStore.token, 'path=', to.path);
    next('/Outlet-login')
    return
  }

  // 管理端鉴权（排除网点端路由）
  if (
    !to.path.startsWith('/Outlet') &&
    to.path !== '/login' &&
    to.path !== '/403' &&
    !authStore.token
  ) {
    next('/login')
    return
  }

  // 角色权限检查（排除登录/网点端/403 页面）
  if (
    !to.path.startsWith('/Outlet') &&
    to.path !== '/login' &&
    to.path !== '/403' &&
    authStore.token
  ) {
    const role = authStore.role
    if (!hasAccess(role, to.path)) {
      next('/403')
      return
    }
  }

  next()
})

export default router
