<template>
  <div class="page-container">
    <el-tabs v-model="tab" @tab-change="load">
      <el-tab-pane label="奖品管理" name="rewards">
        <div class="toolbar"><el-button type="primary" @click="openReward()">新增奖品</el-button></div>
        <el-table :data="rewards" v-loading="loading">
          <el-table-column prop="name" label="奖品" min-width="160"/><el-table-column prop="pointsCost" label="所需积分" width="110"/><el-table-column prop="stock" label="库存" width="90"/><el-table-column prop="perUserLimit" label="每人上限" width="100"/>
          <el-table-column label="需地址" width="90"><template #default="{row}">{{ row.requiresAddress ? '是' : '否' }}</template></el-table-column>
          <el-table-column label="状态" width="90"><template #default="{row}"><el-tag :type="row.status===1?'success':'info'">{{row.status===1?'上架':'下架'}}</el-tag></template></el-table-column>
          <el-table-column label="操作" width="160"><template #default="{row}"><el-button link type="primary" @click="openReward(row)">编辑</el-button><el-button v-if="row.status===1" link type="danger" @click="down(row)">下架</el-button></template></el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="兑换订单" name="orders">
        <div class="toolbar"><el-select v-model="status" clearable placeholder="全部状态" @change="loadOrders"><el-option v-for="(v,k) in labels" :key="k" :label="v" :value="k"/></el-select></div>
        <el-table :data="orders" v-loading="loading">
          <el-table-column prop="redemptionNo" label="兑换单号" width="190"/><el-table-column prop="rewardName" label="奖品" min-width="130"/><el-table-column prop="quantity" label="数量" width="70"/><el-table-column prop="pointsCost" label="积分" width="90"/>
          <el-table-column label="收货信息" min-width="250"><template #default="{row}"><span v-if="row.addressSnapshot">{{address(row.addressSnapshot)}}</span><span v-else>无需收货地址</span></template></el-table-column>
          <el-table-column label="状态" width="100"><template #default="{row}"><el-tag>{{labels[row.status]||row.status}}</el-tag></template></el-table-column>
          <el-table-column label="快递" min-width="160"><template #default="{row}">{{row.courierCompany||'-'}} {{row.trackingNo||''}}</template></el-table-column>
          <el-table-column label="操作" width="150"><template #default="{row}"><el-button v-if="row.status==='pending_shipment'" link type="primary" @click="openShip(row)">发货</el-button><el-button v-if="row.status==='shipped'" link type="success" @click="finish(row)">完成</el-button></template></el-table-column>
        </el-table><el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="prev,pager,next,total" @current-change="loadOrders"/>
      </el-tab-pane>
    </el-tabs>
    <el-dialog v-model="rewardVisible" :title="form.id?'编辑奖品':'新增奖品'" width="560px"><el-form label-width="90px"><el-form-item label="奖品名称"><el-input v-model="form.name"/></el-form-item><el-form-item label="说明"><el-input v-model="form.description" type="textarea"/></el-form-item><el-form-item label="图片地址"><el-input v-model="form.image"/></el-form-item><el-form-item label="所需积分"><el-input-number v-model="form.pointsCost" :min="1"/></el-form-item><el-form-item label="库存"><el-input-number v-model="form.stock" :min="0"/></el-form-item><el-form-item label="每人上限"><el-input-number v-model="form.perUserLimit" :min="0"/><span class="hint">0 表示不限</span></el-form-item><el-form-item label="收货地址"><el-switch v-model="form.requiresAddress"/></el-form-item><el-form-item label="状态"><el-switch v-model="form.active" active-text="上架"/></el-form-item></el-form><template #footer><el-button @click="rewardVisible=false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></template></el-dialog>
    <el-dialog v-model="shipVisible" title="兑换订单发货" width="460px"><el-form label-width="90px"><el-form-item label="快递公司"><el-input v-model="shipForm.courierCompany"/></el-form-item><el-form-item label="快递单号"><el-input v-model="shipForm.trackingNo"/></el-form-item></el-form><template #footer><el-button @click="shipVisible=false">取消</el-button><el-button type="primary" @click="ship">确认发货</el-button></template></el-dialog>
  </div>
</template>
<script setup lang="ts">
import {onMounted,reactive,ref} from 'vue';import {ElMessage,ElMessageBox} from 'element-plus';import {getPointsRewards,createPointsReward,updatePointsReward,disablePointsReward,getPointsRedemptions,shipPointsRedemption,completePointsRedemption} from '@/api';
const tab=ref('rewards'),loading=ref(false),rewards=ref<any[]>([]),orders=ref<any[]>([]),status=ref(''),page=ref(1),total=ref(0),rewardVisible=ref(false),shipVisible=ref(false);const labels:any={pending_shipment:'待发货',shipped:'已发货',completed:'已完成',cancelled:'已取消'};const form=reactive<any>({}),shipForm=reactive<any>({});
const reset=()=>Object.assign(form,{id:null,name:'',description:'',image:'',pointsCost:100,stock:0,perUserLimit:0,requiresAddress:true,active:true});const loadRewards=async()=>{loading.value=true;try{rewards.value=await getPointsRewards() as any}catch{}finally{loading.value=false}};const loadOrders=async()=>{loading.value=true;try{const r:any=await getPointsRedemptions({status:status.value||undefined,page:page.value,pageSize:20});orders.value=r?.list??r?.data?.list??[];total.value=r?.pagination?.total??r?.total??0}catch{orders.value=[]}finally{loading.value=false}};const load=()=>tab.value==='rewards'?loadRewards():loadOrders();
const openReward=(r?:any)=>{reset();if(r)Object.assign(form,r,{active:r.status===1});rewardVisible.value=true};const saving=ref(false);const save=async()=>{if(saving.value)return;saving.value=true;try{const data={...form,status:form.active?1:0};form.id?await updatePointsReward(form.id,data):await createPointsReward(data);ElMessage.success('已保存');rewardVisible.value=false;loadRewards()}finally{saving.value=false}};const down=async(r:any)=>{await ElMessageBox.confirm('确定下架该奖品？');await disablePointsReward(r.id);loadRewards()};const openShip=(r:any)=>{Object.assign(shipForm,{id:r.id,courierCompany:'',trackingNo:''});shipVisible.value=true};const ship=async()=>{await shipPointsRedemption(shipForm.id,shipForm);ElMessage.success('已发货');shipVisible.value=false;loadOrders()};const finish=async(r:any)=>{await ElMessageBox.confirm('确认该兑换订单已完成？');await completePointsRedemption(r.id);loadOrders()};const address=(a:any)=>`${a.contact} ${a.phone} ${a.province||''}${a.city||''}${a.district||''}${a.detail||''}`;onMounted(loadRewards);
</script>
<style scoped>.page-container{background:#fff;padding:20px;border-radius:8px}.toolbar{display:flex;justify-content:flex-end;margin-bottom:16px}.hint{margin-left:10px;color:#999}.el-pagination{margin-top:16px;justify-content:flex-end}</style>
