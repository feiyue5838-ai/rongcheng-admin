<template>
  <div>
    <el-tabs v-model="activeTab" class="content-tabs" @tab-change="onTabChange">
      <!-- ============ Banner ============ -->
      <el-tab-pane label="Banner 管理" name="banners">
        <div class="page-header">
          <h2>Banner 管理</h2>
          <el-button type="primary" @click="openBannerDialog()">新增 Banner</el-button>
        </div>
        <div class="page-card">
          <el-table :data="banners" v-loading="bannerLoading" stripe>
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column label="图片" width="160">
              <template #default="{ row }">
                <el-image v-if="row.image" :src="row.image" style="width: 140px; height: 70px; border-radius: 4px" :preview-src-list="[row.image]" fit="cover" />
              </template>
            </el-table-column>
            <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
            <el-table-column prop="link" label="跳转链接" min-width="200" show-overflow-tooltip />
            <el-table-column prop="sort" label="排序" width="80" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
                  {{ row.status === 1 ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="170">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click="openBannerDialog(row)">编辑</el-button>
                <el-button type="danger" link @click="deleteBanner(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <el-dialog v-model="bannerVisible" :title="bannerForm.id ? '编辑 Banner' : '新增 Banner'" width="560px">
          <el-form :model="bannerForm" label-width="100px">
            <el-form-item label="标题">
              <el-input v-model="bannerForm.title" placeholder="Banner 标题" />
            </el-form-item>
            <el-form-item label="图片">
              <el-upload :action="'/api/upload/image'" :headers="uploadHeaders()" :show-file-list="false" :on-success="bannerUploadSuccess" :before-upload="beforeUpload" accept="image/*">
                <el-button>选择图片</el-button>
              </el-upload>
              <el-image v-if="bannerForm.image" :src="bannerForm.image" style="width: 200px; margin-top: 8px; border-radius: 4px" />
            </el-form-item>
            <el-form-item label="跳转链接">
              <el-input v-model="bannerForm.link" placeholder="如 /pages/seal-tab/index" />
            </el-form-item>
            <el-form-item label="排序">
              <el-input-number v-model="bannerForm.sort" :min="0" />
            </el-form-item>
            <el-form-item label="状态">
              <el-switch v-model="bannerForm.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="禁用" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="bannerVisible = false">取消</el-button>
            <el-button type="primary" :loading="bannerSaving" @click="saveBanner">保存</el-button>
          </template>
        </el-dialog>
      </el-tab-pane>

      <!-- ============ 公告 ============ -->
      <el-tab-pane label="公告管理" name="announcements">
        <div class="page-header">
          <h2>公告管理</h2>
          <el-button type="primary" @click="openAnnDialog()">新增公告</el-button>
        </div>
        <div class="page-card">
          <div class="filter-bar" style="margin-bottom:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <el-select v-model="annFilter.status" placeholder="状态" clearable style="width:120px">
              <el-option label="全部" :value="undefined" />
              <el-option label="启用" :value="1" />
              <el-option label="禁用" :value="0" />
            </el-select>
            <el-input v-model="annFilter.keyword" placeholder="搜索标题/内容" clearable style="width:200px" @keyup.enter="loadAnnouncements" />
            <el-button type="primary" @click="loadAnnouncements">搜索</el-button>
            <el-button @click="annFilter.status=undefined;annFilter.keyword='';loadAnnouncements()">重置</el-button>
          </div>
          <el-table :data="announcements" v-loading="annLoading" stripe>
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
            <el-table-column prop="content" label="内容" min-width="300" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
                  {{ row.status === 1 ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="publishedAt" label="发布时间" width="170">
              <template #default="{ row }">{{ formatDate(row.publishedAt) }}</template>
            </el-table-column>
            <el-table-column prop="expiredAt" label="下线时间" width="170">
              <template #default="{ row }">{{ formatDate(row.expiredAt) }}</template>
            </el-table-column>
            <el-table-column prop="operator" label="操作人" width="120" show-overflow-tooltip />
            <el-table-column prop="createdAt" label="创建时间" width="170">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.status === 0" type="success" link @click="toggleAnnStatus(row, 1)">发布</el-button>
                <el-button v-else type="warning" link @click="toggleAnnStatus(row, 0)">发布下架</el-button>
                <el-button type="primary" link @click="openAnnDialog(row)">编辑</el-button>
                <el-button type="danger" link @click="deleteAnnouncement(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <el-dialog v-model="annVisible" :title="annForm.id ? '编辑公告' : '新增公告'" width="560px">
          <el-form :model="annForm" label-width="80px">
            <el-form-item label="标题">
              <el-input v-model="annForm.title" placeholder="公告标题" />
            </el-form-item>
            <el-form-item label="内容">
              <el-input v-model="annForm.content" type="textarea" :rows="5" placeholder="公告内容" />
            </el-form-item>
            <el-form-item label="发布时间">
              <el-date-picker v-model="annForm.publishedAt" type="datetime" placeholder="选择发布时间（选填）" style="width:100%" value-format="YYYY-MM-DD HH:mm:ss" />
            </el-form-item>
            <el-form-item label="下线时间">
              <el-date-picker v-model="annForm.expiredAt" type="datetime" placeholder="选择下线时间（选填）" style="width:100%" value-format="YYYY-MM-DD HH:mm:ss" />
            </el-form-item>
            <el-form-item label="状态">
              <el-switch v-model="annForm.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="禁用" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="annVisible = false">取消</el-button>
            <el-button type="primary" :loading="annSaving" @click="saveAnnouncement">保存</el-button>
          </template>
        </el-dialog>
      </el-tab-pane>

      <!-- ============ 关于我们 ============ -->
      <el-tab-pane label="关于我们" name="about">
        <div class="page-header">
          <h2>关于我们配置</h2>
          <el-button type="primary" :loading="aboutSaving" @click="saveAbout">保存配置</el-button>
        </div>
        <div class="page-card">
          <el-form :model="aboutForm" label-width="120px" style="max-width: 600px">
            <el-form-item label="封面图片">
              <el-upload :action="'/api/upload/image'" :headers="uploadHeaders()" :show-file-list="false" :on-success="aboutUploadSuccess" :before-upload="beforeUpload" accept="image/*">
                <el-button>选择图片</el-button>
              </el-upload>
              <el-image v-if="aboutForm.image" :src="aboutForm.image" style="width: 200px; margin-top: 8px; border-radius: 4px" :preview-src-list="[aboutForm.image]" />
              <div style="color: #909399; font-size: 12px; margin-top: 4px;">展示在小程序「关于我们」页面顶部，建议尺寸 750x400</div>
            </el-form-item>
            <el-form-item label="Logo 图标">
              <el-upload :action="'/api/upload/image'" :headers="uploadHeaders()" :show-file-list="false" :on-success="logoUploadSuccess" :before-upload="beforeUpload" accept="image/*">
                <el-button>选择图片</el-button>
              </el-upload>
              <el-image v-if="aboutForm.logoUrl" :src="aboutForm.logoUrl" style="width: 80px; height: 80px; margin-top: 8px; border-radius: 8px; object-fit: contain; background: #f5f5f5;" :preview-src-list="[aboutForm.logoUrl]" />
              <div style="color: #909399; font-size: 12px; margin-top: 4px;">展示在「关于我们」顶部 Logo 区域，建议尺寸 120x120，透明背景 PNG</div>
            </el-form-item>
            <el-form-item label="版本号">
              <el-input v-model="aboutForm.version" placeholder="如：v1.0.0 正式版" />
            </el-form-item>
            <el-form-item label="平台名称">
              <el-input v-model="aboutForm.appName" placeholder="如：蓉城企服" />
            </el-form-item>
            <el-form-item label="客服热线">
              <el-input v-model="aboutForm.phone" placeholder="如：400-888-6666" />
            </el-form-item>
            <el-form-item label="微信公众号">
              <el-input v-model="aboutForm.wechat" placeholder="如：蓉城企服" />
            </el-form-item>
            <el-form-item label="服务时间">
              <el-input v-model="aboutForm.serviceTime" placeholder="如：周一至周五 9:00-18:00" />
            </el-form-item>
            <el-form-item label="平台介绍">
              <el-input v-model="aboutForm.intro" type="textarea" :rows="4" placeholder="关于平台的介绍文案" />
            </el-form-item>
            <el-form-item label="公司地址">
              <el-input v-model="aboutForm.address" placeholder="如：成都市高新区xxx" />
            </el-form-item>
            <el-form-item label="版权信息">
              <el-input v-model="aboutForm.copyright" placeholder="如：© 2026 蓉城企服 All Rights Reserved" />
            </el-form-item>
            <el-form-item label="底部公司名">
              <el-input v-model="aboutForm.companyName" placeholder="如：成都蓉城信息服务有限公司" />
              <div style="color: #909399; font-size: 12px; margin-top: 4px;">展示在「关于我们」页面底部版权下方</div>
            </el-form-item>
            <el-form-item label="用户服务协议">
              <div style="border: 1px solid #dcdfe6; border-radius: 4px; width: 100%;">
                <Toolbar :editor="termsEditorRef" :defaultConfig="editorToolbarConfig" mode="default" style="border-bottom: 1px solid #dcdfe6" />
                <Editor v-model="aboutForm.termsContent" :defaultConfig="editorConfig" mode="default" style="height: 360px; overflow-y: hidden" @onCreated="termsCreated" />
              </div>
              <div style="color: #909399; font-size: 12px; margin-top: 4px;">留空则小程序展示默认协议文案</div>
            </el-form-item>
            <el-form-item label="隐私政策">
              <div style="border: 1px solid #dcdfe6; border-radius: 4px; width: 100%;">
                <Toolbar :editor="privacyEditorRef" :defaultConfig="editorToolbarConfig" mode="default" style="border-bottom: 1px solid #dcdfe6" />
                <Editor v-model="aboutForm.privacyContent" :defaultConfig="editorConfig" mode="default" style="height: 360px; overflow-y: hidden" @onCreated="privacyCreated" />
              </div>
              <div style="color: #909399; font-size: 12px; margin-top: 4px;">留空则小程序展示默认隐私文案</div>
            </el-form-item>
            <el-form-item label="材料真实性承诺书">
              <div style="border: 1px solid #dcdfe6; border-radius: 4px; width: 100%;">
                <Toolbar :editor="materialEditorRef" :defaultConfig="editorToolbarConfig" mode="default" style="border-bottom: 1px solid #dcdfe6" />
                <Editor v-model="aboutForm.materialCommitment" :defaultConfig="editorConfig" mode="default" style="height: 360px; overflow-y: hidden" @onCreated="materialCreated" />
              </div>
              <div style="color: #909399; font-size: 12px; margin-top: 4px;">留空则小程序展示默认承诺书文案</div>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>

      <!-- ============ 业务介绍 ============ -->
      <el-tab-pane label="业务介绍" name="intros">
        <div class="page-header">
          <h2>业务介绍管理</h2>
          <el-button type="primary" @click="openIntroDialog()">新增介绍</el-button>
        </div>
        <div class="page-card">
          <el-table :data="intros" v-loading="introLoading" stripe>
            <el-table-column prop="sort" label="排序" width="80" />
            <el-table-column label="图片" width="180">
              <template #default="{ row }">
                <el-image v-if="row.image" :src="row.image" style="width: 160px; height: 90px; border-radius: 4px" :preview-src-list="[row.image]" fit="cover" />
              </template>
            </el-table-column>
            <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
            <el-table-column prop="subtitle" label="副标题" min-width="200" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
                  {{ row.status === 1 ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click="openIntroDialog(row)">编辑</el-button>
                <el-button type="danger" link @click="deleteIntro(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <el-dialog v-model="introVisible" :title="introForm.id ? '编辑业务介绍' : '新增业务介绍'" width="560px">
          <el-form :model="introForm" label-width="100px">
            <el-form-item label="标题">
              <el-input v-model="introForm.title" placeholder="如：官方备案" />
            </el-form-item>
            <el-form-item label="副标题">
              <el-input v-model="introForm.subtitle" type="textarea" :rows="3" placeholder="介绍文案" />
            </el-form-item>
            <el-form-item label="宣传图片">
              <el-upload :action="'/api/upload/image'" :headers="uploadHeaders()" :show-file-list="false" :on-success="introUploadSuccess" :before-upload="beforeUpload" accept="image/*">
                <el-button>选择图片</el-button>
              </el-upload>
              <el-image v-if="introForm.image" :src="introForm.image" style="width: 200px; margin-top: 8px; border-radius: 4px" />
            </el-form-item>
            <el-form-item label="排序">
              <el-input-number v-model="introForm.sort" :min="0" />
            </el-form-item>
            <el-form-item label="状态">
              <el-switch v-model="introForm.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="禁用" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="introVisible = false">取消</el-button>
            <el-button type="primary" :loading="introSaving" @click="saveIntro">保存</el-button>
          </template>
        </el-dialog>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, shallowRef, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/api'
import { formatDate } from '@/utils/format'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'

// 富文本图片上传走后台接口
function uploadImageToServer(file, insertFn) {
  const token = localStorage.getItem('admin_token')
  const form = new FormData()
  form.append('file', file)
  fetch('/api/upload/image', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form })
    .then(r => r.json())
    .then(res => {
      const url = res?.data?.url || res?.url
      if (url) insertFn(url, '', '')
      else ElMessage.error('图片上传失败')
    })
    .catch(() => ElMessage.error('图片上传失败'))
}

const editorToolbarConfig = { excludeKeys: [] }
const editorConfig = {
  placeholder: '请输入内容...',
  MENU_CONF: {
    uploadImage: { customUpload: uploadImageToServer }
  }
}
const termsEditorRef = shallowRef(null)
const privacyEditorRef = shallowRef(null)
const materialEditorRef = shallowRef(null)
function termsCreated(editor) { termsEditorRef.value = editor }
function privacyCreated(editor) { privacyEditorRef.value = editor }
function materialCreated(editor) { materialEditorRef.value = editor }
onBeforeUnmount(() => {
  if (termsEditorRef.value) termsEditorRef.value.destroy()
  if (privacyEditorRef.value) privacyEditorRef.value.destroy()
  if (materialEditorRef.value) materialEditorRef.value.destroy()
})

const activeTab = ref('banners')

function beforeUpload(file) {
  if (file.size > 2 * 1024 * 1024) { ElMessage.error('图片不能超过 2MB'); return false }
  return true
}
const uploadHeaders = () => {
  const token = localStorage.getItem('admin_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ==================== Banner ====================
const banners = ref([])
const bannerLoading = ref(false)
const bannerSaving = ref(false)
const bannerVisible = ref(false)
const bannerForm = reactive({ id: null, title: '', image: '', link: '', sort: 0, status: 1 })

async function loadBanners() {
  bannerLoading.value = true
  try {
    const res = await request.get('/content/banners')
    banners.value = Array.isArray(res) ? res : (res.list || [])
  } catch { /* ignore */ } finally { bannerLoading.value = false }
}
function openBannerDialog(row) {
  if (row) Object.assign(bannerForm, row)
  else Object.assign(bannerForm, { id: null, title: '', image: '', link: '', sort: 0, status: 1 })
  bannerVisible.value = true
}
function bannerUploadSuccess(res) {
  if (res?.data?.url ?? res?.url) bannerForm.image = res?.data?.url ?? res?.url
  else ElMessage.error('上传失败')
}
async function saveBanner() {
  bannerSaving.value = true
  try {
    if (bannerForm.id) await request.put(`/content/banners/${bannerForm.id}`, bannerForm)
    else await request.post('/content/banners', bannerForm)
    ElMessage.success('保存成功')
    bannerVisible.value = false
    loadBanners()
  } catch (e) { ElMessage.error(e.message || '保存失败') } finally { bannerSaving.value = false }
}
async function deleteBanner(row) {
  await ElMessageBox.confirm(`确定删除 Banner「${row.title}」吗？`, '提示', { type: 'warning' })
  try {
    await request.delete(`/content/banners/${row.id}`)
    ElMessage.success('删除成功')
    loadBanners()
  } catch (e) { ElMessage.error(e.message || '删除失败') }
}

// ==================== 公告 ====================
const announcements = ref([])
const annLoading = ref(false)
const annFilter = reactive({ status: undefined, keyword: '' })
const annSaving = ref(false)
const annVisible = ref(false)
const annForm = reactive({ id: null, title: '', content: '', publishedAt: null, expiredAt: null, status: 1 })

async function loadAnnouncements() {
  annLoading.value = true
  try {
    const params = {}
    if (annFilter.status !== undefined) params.status = annFilter.status
    if (annFilter.keyword) params.keyword = annFilter.keyword
    const res = await request.get('/content/announcements', { params })
    announcements.value = (res as any)?.list ?? []
  } catch { /* ignore */ } finally { annLoading.value = false }
}
function openAnnDialog(row) {
  if (row) Object.assign(annForm, row)
  else Object.assign(annForm, { id: null, title: '', content: '', publishedAt: null, expiredAt: null, status: 1 })
  annVisible.value = true
}
async function saveAnnouncement() {
  annSaving.value = true
  try {
    if (annForm.id) await request.put(`/content/announcements/${annForm.id}`, annForm)
    else await request.post('/content/announcements', annForm)
    ElMessage.success('保存成功')
    annVisible.value = false
    loadAnnouncements()
  } catch (e) { ElMessage.error(e.message || '保存失败') } finally { annSaving.value = false }
}
async function toggleAnnStatus(row, newStatus) {
  const action = newStatus === 1 ? '发布' : '下架'
  await ElMessageBox.confirm(`确定${action}公告「${row.title}」吗？`, '提示', { type: 'warning' })
  try {
    await request.put(`/content/announcements/${row.id}`, { status: newStatus })
    ElMessage.success(`${action}成功`)
    loadAnnouncements()
  } catch (e) { ElMessage.error(e.message || `${action}失败`) }
}

async function deleteAnnouncement(row) {
  await ElMessageBox.confirm(`确定删除公告「${row.title}」吗？`, '提示', { type: 'warning' })
  try {
    await request.delete(`/content/announcements/${row.id}`)
    ElMessage.success('删除成功')
    loadAnnouncements()
  } catch (e) { ElMessage.error(e.message || '删除失败') }
}

// ==================== 业务介绍 ====================
const intros = ref([])
const introLoading = ref(false)
const introSaving = ref(false)
const introVisible = ref(false)
const introForm = reactive({ id: null, title: '', subtitle: '', image: '', sort: 0, status: 1 })

async function loadIntros() {
  introLoading.value = true
  try {
    const res = await request.get('/content/intros')
    intros.value = (res as any)?.list ?? []
  } catch { /* ignore */ } finally { introLoading.value = false }
}
function openIntroDialog(row) {
  if (row) Object.assign(introForm, row)
  else Object.assign(introForm, { id: null, title: '', subtitle: '', image: '', sort: 0, status: 1 })
  introVisible.value = true
}
function introUploadSuccess(res) {
  if (res.url) introForm.image = res.url
  else ElMessage.error('上传失败')
}
async function saveIntro() {
  introSaving.value = true
  try {
    if (introForm.id) await request.put(`/content/intros/${introForm.id}`, introForm)
    else await request.post('/content/intros', introForm)
    ElMessage.success('保存成功')
    introVisible.value = false
    loadIntros()
  } catch (e) { ElMessage.error(e.message || '保存失败') } finally { introSaving.value = false }
}
async function deleteIntro(row) {
  await ElMessageBox.confirm(`确定删除「${row.title}」吗？`, '提示', { type: 'warning' })
  try {
    await request.delete(`/content/intros/${row.id}`)
    ElMessage.success('删除成功')
    loadIntros()
  } catch (e) { ElMessage.error(e.message || '删除失败') }
}

// ==================== 关于我们 ====================
const aboutForm = reactive({
  appName: '蓉城企服',
  phone: '',
  wechat: '蓉城企服',
  serviceTime: '周一至周五 9:00-18:00',
  intro: '',
  address: '',
  copyright: '© 2026 蓉城企服 All Rights Reserved',
  image: '',
  logoUrl: '',
  version: 'v1.0.0 正式版',
  companyName: '成都蓉城信息服务有限公司',
  termsContent: '',
  privacyContent: '',
  materialCommitment: ''
})
const aboutSaving = ref(false)

function aboutUploadSuccess(res) {
  if (res.url) aboutForm.image = res.url
  else ElMessage.error('上传失败')
}
function logoUploadSuccess(res) {
  if (res.url) aboutForm.logoUrl = res.url
  else ElMessage.error('上传失败')
}

async function loadAbout() {
  try {
    const res = await request.get('/content/about')
    if (res) Object.assign(aboutForm, res)
    try {
      const mc = await request.get('/content/material-commitment')
      if (mc) aboutForm.materialCommitment = mc.content || ''
    } catch { /* ignore */ }
  } catch { /* ignore */ }
}
async function saveAbout() {
  aboutSaving.value = true
  try {
    await request.put('/content/about', aboutForm)
    try {
      await request.put('/content/material-commitment', { content: aboutForm.materialCommitment || '' })
    } catch (e) { ElMessage.error('承诺书保存失败：' + (e.message || '未知错误')) }
    ElMessage.success('保存成功')
  } catch (e) { ElMessage.error(e.message || '保存失败') } finally { aboutSaving.value = false }
}

// 首次切到某 tab 时才加载（减少无意义请求）
function onTabChange(name) {
  if (name === 'banners' && banners.value.length === 0) loadBanners()
  else if (name === 'announcements' && announcements.value.length === 0) loadAnnouncements()
  else if (name === 'intros' && intros.value.length === 0) loadIntros()
  else if (name === 'about') loadAbout()
}

onMounted(loadBanners)
</script>

<style scoped>
.content-tabs { background: #fff; border-radius: 12px; padding: 8px 16px 16px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.page-header { display: flex; justify-content: space-between; align-items: center; margin: 24px 0 16px; }
.page-header h2 { margin: 0; font-size: 22px; font-weight: 600; }
.page-card { background: #fff; border-radius: 12px; padding: 20px; }
</style>
