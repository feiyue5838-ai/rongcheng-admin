<template>
  <div class="refund-page">
    <div class="page-header">
      <h2>退款管理</h2>
      <el-button type="primary" @click="showApplyDialog = true">发起退款申请</el-button>
    </div>

    <el-card>
      <el-form :inline="true" :model="filterParams" class="filter-form">
        <el-form-item label="状态">
          <el-select v-model="filterParams.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="申请中" :value="1" />
            <el-option label="已通过" :value="2" />
            <el-option label="已退款" :value="3" />
            <el-option label="已拒绝" :value="4" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadList">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="list" v-loading="loading" border>
        <el-table-column prop="order_no" label="订单号" width="180" />
        <el-table-column prop="amount" label="退款金额" width="100">
          <template #default="{ row }">¥{{ Number(row.amount).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="申请原因" show-overflow-tooltip />
        <el-table-column prop="status_text" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="(statusTagType(row.status) as any)">{{ row.status_text }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="review_note" label="审核备注" show-overflow-tooltip />
        <el-table-column prop="created_at" label="申请时间" width="160">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 1">
              <el-button type="success" size="small" @click="reviewRefund(row.id, 2)">通过</el-button>
              <el-button type="danger" size="small" @click="reviewRefund(row.id, 4)">拒绝</el-button>
            </template>
            <el-button v-if="row.status === 2" type="primary" size="small" @click="executeRefund(row.id)">执行退款</el-button>
            <el-button size="small" @click="viewOrder(row.order_id)">查看订单</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10,20,50]"
        layout="total, sizes, prev, pager, next" @size-change="loadList" @current-change="loadList" />
    </el-card>

    <el-dialog v-model="showApplyDialog" title="发起退款申请" width="500px">
      <el-form :model="applyForm" label-width="100px">
        <el-form-item label="订单ID">
          <el-input v-model="applyForm.orderId" placeholder="输入订单ID" />
        </el-form-item>
        <el-form-item label="退款金额">
          <el-input-number v-model="applyForm.amount" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="申请原因">
          <el-input v-model="applyForm.reason" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showApplyDialog = false">取消</el-button>
        <el-button type="primary" @click="submitApply">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox, ElButton, ElCard, ElTable, ElTableColumn, ElTag, ElPagination, ElForm, ElFormItem, ElSelect, ElOption, ElInput, ElInputNumber, ElDialog } from 'element-plus';
import { getRefundList, applyRefund, reviewRefund as reviewRefundAPI, executeRefund as executeRefundAPI } from '@/api';

const router = useRouter();
const loading = ref(false);
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const filterParams = reactive<any>({ status: null });

const showApplyDialog = ref(false);
const applyForm = reactive({ orderId: '', amount: null as number | null, reason: '' });

const statusTagType = (status: number) => {
  const map: Record<number, string> = { 1: 'warning', 2: 'success', 3: 'info', 4: 'danger' };
  return map[status] || '';
};

const formatTime = (t: string) => {
  if (!t) return '—';
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
};

const loadList = async () => {
  loading.value = true;
  try {
    const res = await getRefundList({ ...filterParams, page: page.value, pageSize: pageSize.value });
    list.value = res.data?.items || [];
    total.value = res.data?.total || 0;
  } catch (e: any) {
    ElMessage.error(e.message || '加载失败');
  } finally {
    loading.value = false;
  }
};

const resetFilter = () => {
  filterParams.status = null;
  page.value = 1;
  loadList();
};

const submitApply = async () => {
  if (!applyForm.orderId) { ElMessage.warning('请输入订单ID'); return; }
  try {
    await applyRefund({ orderId: applyForm.orderId, amount: applyForm.amount ?? undefined, reason: applyForm.reason });
    ElMessage.success('申请已提交');
    showApplyDialog.value = false;
    applyForm.orderId = '';
    applyForm.amount = null;
    applyForm.reason = '';
    loadList();
  } catch (e: any) {
    ElMessage.error(e.message || '申请失败');
  }
};

const reviewRefund = async (id: string, status: 2 | 4) => {
  const action = status === 2 ? '通过' : '拒绝';
  try {
    const { value: note } = await ElMessageBox.prompt('审核备注（可选）', '审核', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '输入审核备注',
    });
    await reviewRefundAPI(id, { status, reviewNote: note || undefined });
    ElMessage.success(`已${action}`);
    loadList();
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

const executeRefund = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定执行退款？将发起微信退款', '提示', { type: 'warning' });
    await executeRefundAPI(id);
    ElMessage.success('退款已发起');
    loadList();
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

const viewOrder = (orderId: string) => {
  router.push(`/orders/seal?keyword=${orderId}`);
};

onMounted(loadList);
</script>

<style scoped>
.refund-page { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.filter-form { margin-bottom: 16px; }
.el-pagination { margin-top: 16px; justify-content: flex-end; }
</style>
