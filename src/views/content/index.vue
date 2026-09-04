<template>
  <div>
    <el-tabs v-model="activeTab" class="content-tabs" @tab-change="onTabChange">
      <!-- ============ Banner ============ -->
      <el-tab-pane label="Banner 管理" name="banners" lazy>
        <div class="page-header">
          <h2>Banner 管理</h2>
          <el-button type="primary" @click="openBannerDialog()">新增 Banner</el-button>
        </div>
        <div class="page-card">
          <el-table :data="banners" v-loading="bannerLoading" stripe empty-text="暂无 Banner">
            <el-table-column prop="id" label="ID" width="100" show-overflow-tooltip />
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
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click="openBannerDialog(row)">编辑</el-button>
                <el-button
                  :type="row.status === 1 ? 'warning' : 'success'"
                  :loading="bannerActionKey === `status-${row.id}`"
                  link
                  @click="toggleBannerStatus(row)"
                >{{ row.status === 1 ? '禁用' : '启用' }}</el-button>
                <el-button type="danger" :loading="bannerActionKey === `delete-${row.id}`" link @click="deleteBanner(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <el-dialog v-model="bannerVisible" :title="bannerForm.id ? '编辑 Banner' : '新增 Banner'" width="560px">
          <el-form :model="bannerForm" label-width="100px">
            <el-form-item label="标题">
              <el-input v-model="bannerForm.title" maxlength="100" show-word-limit placeholder="Banner 标题" />
            </el-form-item>
            <el-form-item label="图片">
              <el-upload :action="'/api/upload/image'" :headers="uploadHeaders()" :show-file-list="false" :on-success="bannerUploadSuccess" :on-error="uploadError" :before-upload="beforeUpload" accept=".jpg,.jpeg,.png,.gif,.webp">
                <el-button>选择图片</el-button>
              </el-upload>
              <el-image v-if="bannerForm.image" :src="bannerForm.image" :preview-src-list="[bannerForm.image]" style="width: 200px; margin-top: 8px; border-radius: 4px" />
            </el-form-item>
            <el-form-item label="跳转链接">
              <el-input v-model="bannerForm.link" maxlength="500" placeholder="如 /pages/seal-tab/index" />
              <div class="form-tip">可留空；支持小程序页面路径（以 / 开头）或 http(s) 外链</div>
            </el-form-item>
            <el-form-item label="排序">
              <el-input-number v-model="bannerForm.sort" :min="0" :max="9999" :step="1" step-strictly />
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
      <el-tab-pane label="公告管理" name="announcements" lazy>
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
            <el-button @click="resetAnnouncementFilter">重置</el-button>
          </div>
          <el-table :data="announcements" v-loading="annLoading" stripe empty-text="暂无公告">
            <el-table-column prop="id" label="ID" width="100" show-overflow-tooltip />
            <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
            <el-table-column prop="content" label="内容" min-width="300" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="announcementStatus(row).type" size="small">
                  {{ announcementStatus(row).label }}
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
                <el-button v-if="row.status === 0" type="success" :loading="annActionKey === `status-${row.id}`" link @click="toggleAnnStatus(row, 1)">发布</el-button>
                <el-button v-else type="warning" :loading="annActionKey === `status-${row.id}`" link @click="toggleAnnStatus(row, 0)">下架</el-button>
                <el-button type="primary" link @click="openAnnDialog(row)">编辑</el-button>
                <el-button type="danger" :loading="annActionKey === `delete-${row.id}`" link @click="deleteAnnouncement(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <el-dialog v-model="annVisible" :title="annForm.id ? '编辑公告' : '新增公告'" width="560px">
          <el-form :model="annForm" label-width="80px">
            <el-form-item label="标题">
              <el-input v-model="annForm.title" maxlength="100" show-word-limit placeholder="公告标题" />
            </el-form-item>
            <el-form-item label="内容">
              <el-input v-model="annForm.content" type="textarea" :rows="5" maxlength="2000" show-word-limit placeholder="公告内容" />
            </el-form-item>
            <el-form-item label="发布时间">
              <el-date-picker v-model="annForm.publishedAt" type="datetime" placeholder="选择发布时间（选填）" style="width:100%" value-format="YYYY-MM-DDTHH:mm:ss" />
            </el-form-item>
            <el-form-item label="下线时间">
              <el-date-picker v-model="annForm.expiredAt" type="datetime" placeholder="选择下线时间（选填）" style="width:100%" value-format="YYYY-MM-DDTHH:mm:ss" />
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
      <el-tab-pane label="关于我们" name="about" lazy>
        <div class="page-header">
          <h2>关于我们配置</h2>
          <el-button type="primary" :loading="aboutSaving" :disabled="aboutLoading" @click="saveAbout">保存配置</el-button>
        </div>
        <div class="page-card" v-loading="aboutLoading">
          <el-form :model="aboutForm" label-width="120px" style="max-width: 600px">
            <el-form-item label="封面图片">
              <el-upload :action="'/api/upload/image'" :headers="uploadHeaders()" :show-file-list="false" :on-success="aboutUploadSuccess" :on-error="uploadError" :before-upload="beforeUpload" accept=".jpg,.jpeg,.png,.gif,.webp">
                <el-button>选择图片</el-button>
              </el-upload>
              <el-button v-if="aboutForm.image" type="danger" link @click="aboutForm.image = ''">移除图片</el-button>
              <el-image v-if="aboutForm.image" :src="aboutForm.image" style="width: 200px; margin-top: 8px; border-radius: 4px" :preview-src-list="[aboutForm.image]" />
              <div style="color: #909399; font-size: 12px; margin-top: 4px;">展示在小程序「关于我们」页面顶部，建议尺寸 750x400</div>
            </el-form-item>
            <el-form-item label="Logo 图标">
              <el-upload :action="'/api/upload/image'" :headers="uploadHeaders()" :show-file-list="false" :on-success="logoUploadSuccess" :on-error="uploadError" :before-upload="beforeUpload" accept=".jpg,.jpeg,.png,.gif,.webp">
                <el-button>选择图片</el-button>
              </el-upload>
              <el-button v-if="aboutForm.logoUrl" type="danger" link @click="aboutForm.logoUrl = ''">移除 Logo</el-button>
              <el-image v-if="aboutForm.logoUrl" :src="aboutForm.logoUrl" style="width: 80px; height: 80px; margin-top: 8px; border-radius: 8px; object-fit: contain; background: #f5f5f5;" :preview-src-list="[aboutForm.logoUrl]" />
              <div style="color: #909399; font-size: 12px; margin-top: 4px;">展示在「关于我们」顶部 Logo 区域，建议尺寸 120x120，透明背景 PNG</div>
            </el-form-item>
            <el-form-item label="版本号">
              <el-input v-model="aboutForm.version" maxlength="50" placeholder="如：v1.0.0 正式版" />
            </el-form-item>
            <el-form-item label="平台名称">
              <el-input v-model="aboutForm.appName" maxlength="50" placeholder="如：蓉城企服" />
            </el-form-item>
            <el-form-item label="客服热线">
              <el-input v-model="aboutForm.phone" maxlength="30" placeholder="如：400-888-6666" />
            </el-form-item>
            <el-form-item label="微信公众号">
              <el-input v-model="aboutForm.wechat" maxlength="100" placeholder="如：蓉城企服" />
            </el-form-item>
            <el-form-item label="服务时间">
              <el-input v-model="aboutForm.serviceTime" maxlength="100" placeholder="如：周一至周五 9:00-18:00" />
            </el-form-item>
            <el-form-item label="平台介绍">
              <el-input v-model="aboutForm.intro" type="textarea" :rows="4" maxlength="1000" show-word-limit placeholder="关于平台的介绍文案" />
            </el-form-item>
            <el-form-item label="公司地址">
              <el-input v-model="aboutForm.address" maxlength="200" placeholder="如：成都市高新区xxx" />
            </el-form-item>
            <el-form-item label="版权信息">
              <el-input v-model="aboutForm.copyright" maxlength="200" placeholder="如：© 2026 蓉城企服 All Rights Reserved" />
            </el-form-item>
            <el-form-item label="底部公司名">
              <el-input v-model="aboutForm.companyName" maxlength="100" placeholder="如：成都蓉城信息服务有限公司" />
              <div style="color: #909399; font-size: 12px; margin-top: 4px;">展示在「关于我们」页面底部版权下方</div>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>

      <!-- ============ 用户服务协议 ============ -->
      <el-tab-pane label="用户服务协议" name="terms" lazy>
        <div class="page-header">
          <h2>用户服务协议</h2>
          <el-button type="primary" :loading="termsSaving" :disabled="aboutLoading" @click="saveTerms">保存协议</el-button>
        </div>
        <div class="page-card" v-loading="aboutLoading">
          <div class="form-tip" style="margin-bottom: 12px;">保存后由小程序「用户服务协议」页面通过公开接口实时读取；留空时小程序展示内置默认协议。</div>
          <div style="border: 1px solid #dcdfe6; border-radius: 4px; width: 100%; max-width: 960px;">
            <Toolbar :editor="termsEditorRef" :defaultConfig="editorToolbarConfig" mode="default" style="border-bottom: 1px solid #dcdfe6" />
            <Editor v-model="aboutForm.termsContent" :defaultConfig="editorConfig" mode="default" style="height: 560px; overflow-y: hidden" @onCreated="termsCreated" />
          </div>
        </div>
      </el-tab-pane>

      <!-- ============ 隐私政策 ============ -->
      <el-tab-pane label="隐私政策" name="privacy" lazy>
        <div class="page-header">
          <h2>隐私政策</h2>
          <el-button type="primary" :loading="privacySaving" :disabled="aboutLoading" @click="savePrivacy">保存隐私政策</el-button>
        </div>
        <div class="page-card" v-loading="aboutLoading">
          <div class="form-tip" style="margin-bottom: 12px;">保存后由小程序「隐私政策」页面通过公开接口实时读取；留空时小程序展示内置默认政策。</div>
          <div style="border: 1px solid #dcdfe6; border-radius: 4px; width: 100%; max-width: 960px;">
            <Toolbar :editor="privacyEditorRef" :defaultConfig="editorToolbarConfig" mode="default" style="border-bottom: 1px solid #dcdfe6" />
            <Editor v-model="aboutForm.privacyContent" :defaultConfig="editorConfig" mode="default" style="height: 560px; overflow-y: hidden" @onCreated="privacyCreated" />
          </div>
        </div>
      </el-tab-pane>

      <!-- ============ 材料真实性承诺书 ============ -->
      <el-tab-pane label="材料真实性承诺书" name="material-commitment" lazy>
        <div class="page-header">
          <h2>材料真实性承诺书</h2>
          <el-button type="primary" :loading="materialSaving" :disabled="aboutLoading" @click="saveMaterialCommitment">保存承诺书</el-button>
        </div>
        <div class="page-card" v-loading="aboutLoading">
          <div class="form-tip" style="margin-bottom: 12px;">保存后由小程序「材料真实性承诺书」页面通过公开接口实时读取；留空时小程序展示内置默认文案。</div>
          <div style="border: 1px solid #dcdfe6; border-radius: 4px; width: 100%; max-width: 960px;">
            <Toolbar :editor="materialEditorRef" :defaultConfig="editorToolbarConfig" mode="default" style="border-bottom: 1px solid #dcdfe6" />
            <Editor v-model="aboutForm.materialCommitment" :defaultConfig="editorConfig" mode="default" style="height: 560px; overflow-y: hidden" @onCreated="materialCreated" />
          </div>
        </div>
      </el-tab-pane>

      <!-- ============ 业务介绍 ============ -->
      <el-tab-pane label="业务介绍" name="intros" lazy>
        <div class="page-header">
          <h2>业务介绍管理</h2>
          <el-button type="primary" @click="openIntroDialog()">新增介绍</el-button>
        </div>
        <div class="page-card">
          <el-table :data="intros" v-loading="introLoading" stripe empty-text="暂无业务介绍">
            <el-table-column prop="sort" label="排序" width="80" />
            <el-table-column label="图片" width="180">
              <template #default="{ row }">
                <el-image v-if="row.image" :src="row.image" style="width: 160px; height: 90px; border-radius: 4px" :preview-src-list="[row.image]" fit="cover" />
              </template>
            </el-table-column>
            <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
            <el-table-column prop="subtitle" label="副标题" min-width="200" show-overflow-tooltip />
            <el-table-column label="适用业务" width="110">
              <template #default="{ row }">{{ introTypeLabel(row.type) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
                  {{ row.status === 1 ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click="openIntroDialog(row)">编辑</el-button>
                <el-button :type="row.status === 1 ? 'warning' : 'success'" :loading="introActionKey === `status-${row.id}`" link @click="toggleIntroStatus(row)">{{ row.status === 1 ? '禁用' : '启用' }}</el-button>
                <el-button type="danger" :loading="introActionKey === `delete-${row.id}`" link @click="deleteIntro(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <el-dialog v-model="introVisible" :title="introForm.id ? '编辑业务介绍' : '新增业务介绍'" width="560px">
          <el-form :model="introForm" label-width="100px">
            <el-form-item label="标题">
              <el-input v-model="introForm.title" maxlength="100" show-word-limit placeholder="如：官方备案" />
            </el-form-item>
            <el-form-item label="副标题">
              <el-input v-model="introForm.subtitle" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="介绍文案" />
            </el-form-item>
            <el-form-item label="适用业务">
              <el-select v-model="introForm.type" style="width:100%">
                <el-option label="全部业务" value="all" />
                <el-option label="企业刻章" value="company" />
                <el-option label="个人印章" value="personal" />
                <el-option label="电子印章" value="electronic" />
              </el-select>
            </el-form-item>
            <el-form-item label="宣传图片">
              <el-upload :action="'/api/upload/image'" :headers="uploadHeaders()" :show-file-list="false" :on-success="introUploadSuccess" :on-error="uploadError" :before-upload="beforeUpload" accept=".jpg,.jpeg,.png,.gif,.webp">
                <el-button>选择图片</el-button>
              </el-upload>
              <el-image v-if="introForm.image" :src="introForm.image" :preview-src-list="[introForm.image]" style="width: 200px; margin-top: 8px; border-radius: 4px" />
            </el-form-item>
            <el-form-item label="排序">
              <el-input-number v-model="introForm.sort" :min="0" :max="9999" :step="1" step-strictly />
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

      <!-- ============ 页面装修 ============ -->
      <el-tab-pane label="页面装修" name="decorations" lazy>
        <div class="page-header">
          <h2>页面装修管理</h2>
          <el-button type="primary" @click="openDecoDialog()">新增装修</el-button>
        </div>
        <div class="page-card">
          <el-table :data="decorations" v-loading="decoLoading" stripe empty-text="暂无页面装修">
            <el-table-column prop="type" label="适用页面" width="140">
              <template #default="{ row }">{{ decoTypeLabel(row.type) }}</template>
            </el-table-column>
            <el-table-column label="背景图" width="180">
              <template #default="{ row }">
                <el-image v-if="row.image" :src="row.image" style="width: 160px; height: 90px; border-radius: 4px" :preview-src-list="[row.image]" fit="cover" />
              </template>
            </el-table-column>
            <el-table-column prop="title" label="主标题" min-width="160" show-overflow-tooltip />
            <el-table-column prop="subtitle" label="副标题" min-width="200" show-overflow-tooltip />
            <el-table-column prop="sort" label="排序" width="80" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
                  {{ row.status === 1 ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click="openDecoDialog(row)">编辑</el-button>
                <el-button :type="row.status === 1 ? 'warning' : 'success'" :loading="decoActionKey === `status-${row.id}`" link @click="toggleDecoStatus(row)">{{ row.status === 1 ? '禁用' : '启用' }}</el-button>
                <el-button type="danger" :loading="decoActionKey === `delete-${row.id}`" link @click="deleteDeco(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <el-dialog v-model="decoVisible" :title="decoForm.id ? '编辑页面装修' : '新增页面装修'" width="560px">
          <el-form :model="decoForm" label-width="100px">
            <el-form-item label="适用页面">
              <el-select v-model="decoForm.type" style="width:100%">
                <el-option label="刻章页" value="seal" />
                <el-option label="企业刻章申请页" value="seal_application" />
                <el-option label="个人印章申请页" value="seal_personal_application" />
                <el-option label="电子印章申请页" value="seal_electronic_application" />
                <el-option label="刻章备案查询页" value="seal_record_query" />
                <el-option label="登报页" value="newspaper" />
                <el-option label="代理记账页" value="bookkeeping" />
              </el-select>
              <div class="form-tip">刻章首页及企业、个人、电子、备案查询页面的 Hero 配置相互独立</div>
            </el-form-item>
            <el-form-item label="主标题">
              <el-input v-model="decoForm.title" maxlength="100" show-word-limit placeholder="如：专业印章服务" />
            </el-form-item>
            <el-form-item label="副标题">
              <el-input v-model="decoForm.subtitle" maxlength="200" show-word-limit placeholder="如：公安备案 · 正规可靠 · 全国办理（可选）" />
            </el-form-item>
            <el-form-item label="背景图">
              <el-upload :action="'/api/upload/image'" :headers="uploadHeaders()" :show-file-list="false" :on-success="decoUploadSuccess" :on-error="uploadError" :before-upload="beforeUpload" accept=".jpg,.jpeg,.png,.gif,.webp">
                <el-button>选择图片</el-button>
              </el-upload>
              <el-button v-if="decoForm.image" type="danger" link @click="decoForm.image = ''">移除图片</el-button>
              <el-image v-if="decoForm.image" :src="decoForm.image" :preview-src-list="[decoForm.image]" style="width: 200px; margin-top: 8px; border-radius: 4px" />
              <div class="form-tip">Hero 背景图，建议尺寸 750×500；留空则使用页面默认渐变。注意：上传背景图后小程序端只展示图片，主标题/副标题将不再显示</div>
            </el-form-item>
            <el-form-item label="排序">
              <el-input-number v-model="decoForm.sort" :min="0" :max="9999" :step="1" step-strictly />
            </el-form-item>
            <el-form-item label="状态">
              <el-switch v-model="decoForm.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="禁用" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="decoVisible = false">取消</el-button>
            <el-button type="primary" :loading="decoSaving" @click="saveDeco">保存</el-button>
          </template>
        </el-dialog>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, shallowRef, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import request from '@/api'
import { formatDate } from '@/utils/format'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import type { IDomEditor } from '@wangeditor/editor'
import '@wangeditor/editor/dist/css/style.css'

type ContentRow = {
  id: string | number | null
  title: string
  image?: string
  link?: string
  subtitle?: string
  content?: string
  sort: number
  status: number
  [key: string]: any
}
type ContentListResponse = ContentRow[] | { list?: ContentRow[] }
type UploadResponse = { data?: { url?: string }; url?: string }

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function listFromResponse(response: unknown): ContentRow[] {
  if (Array.isArray(response)) return response as ContentRow[]
  if (response && typeof response === 'object') {
    const list = (response as { list?: unknown }).list
    if (Array.isArray(list)) return list as ContentRow[]
  }
  return []
}

function uploadUrlFromResponse(response: UploadResponse) {
  return response?.data?.url ?? response?.url ?? ''
}

function normalizeDateTime(value: unknown) {
  if (typeof value !== 'string' || !value) return null
  return value.replace(' ', 'T').slice(0, 19)
}

// 富文本图片上传走后台接口
async function uploadImageToServer(file: File, insertFn: (url: string, alt: string, href: string) => void) {
  if (!beforeUpload(file)) return
  const token = localStorage.getItem('admin_token')
  const form = new FormData()
  form.append('file', file)
  try {
    const response = await fetch('/api/upload/image', {
      method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form
    })
    const result = await response.json().catch(() => null) as UploadResponse | null
    const url = result ? uploadUrlFromResponse(result) : ''
    if (!response.ok || !url) throw new Error('upload failed')
    insertFn(url, '', '')
  } catch {
    ElMessage.error('图片上传失败，请重试')
  }
}

// 禁用源码编辑（editHtml），避免管理员粘贴恶意 HTML 造成存储型 XSS
const editorToolbarConfig = { excludeKeys: ['editHtml'] }
const editorConfig = {
  placeholder: '请输入内容...',
  MENU_CONF: {
    uploadImage: { customUpload: uploadImageToServer }
  }
}
const termsEditorRef = shallowRef<IDomEditor | null>(null)
const privacyEditorRef = shallowRef<IDomEditor | null>(null)
const materialEditorRef = shallowRef<IDomEditor | null>(null)
function termsCreated(editor: IDomEditor) { termsEditorRef.value = editor }
function privacyCreated(editor: IDomEditor) { privacyEditorRef.value = editor }
function materialCreated(editor: IDomEditor) { materialEditorRef.value = editor }
onBeforeUnmount(() => {
  if (termsEditorRef.value) termsEditorRef.value.destroy()
  if (privacyEditorRef.value) privacyEditorRef.value.destroy()
  if (materialEditorRef.value) materialEditorRef.value.destroy()
})

const activeTab = ref('banners')

function beforeUpload(file: File) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) { ElMessage.error('仅支持 JPG、PNG、GIF、WebP 图片'); return false }
  if (file.size > 2 * 1024 * 1024) { ElMessage.error('图片不能超过 2MB'); return false }
  return true
}
function uploadError() { ElMessage.error('图片上传失败，请重试') }
const uploadHeaders = () => {
  const token = localStorage.getItem('admin_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ==================== Banner ====================
const banners = ref<ContentRow[]>([])
const bannerLoading = ref(false)
const bannerSaving = ref(false)
const bannerActionKey = ref('')
const bannerVisible = ref(false)
const bannerForm = reactive<{
  id: string | number | null
  title: string
  image: string
  link: string
  sort: number
  status: number
}>({ id: null, title: '', image: '', link: '', sort: 0, status: 1 })
const loadedTabs = new Set<string>()

async function loadBanners() {
  bannerLoading.value = true
  try {
    const res = await request.get('/content/banners') as unknown as ContentListResponse
    banners.value = listFromResponse(res)
    loadedTabs.add('banners')
  } catch { /* ignore */ } finally { bannerLoading.value = false }
}
function openBannerDialog(row?: ContentRow) {
  if (row) Object.assign(bannerForm, {
    id: row.id, title: row.title || '', image: row.image || '', link: row.link || '',
    sort: row.sort ?? 0, status: row.status ?? 1
  })
  else Object.assign(bannerForm, { id: null, title: '', image: '', link: '', sort: 0, status: 1 })
  bannerVisible.value = true
}
function bannerUploadSuccess(res: UploadResponse) {
  const imageUrl = uploadUrlFromResponse(res)
  if (imageUrl) bannerForm.image = imageUrl
  else ElMessage.error('上传失败')
}
async function saveBanner() {
  const title = bannerForm.title.trim()
  const image = bannerForm.image.trim()
  const link = bannerForm.link.trim()
  if (!title) { ElMessage.warning('请输入 Banner 标题'); return }
  if (!image) { ElMessage.warning('请上传 Banner 图片'); return }
  if (link && !/^(\/|https?:\/\/)/.test(link)) {
    ElMessage.warning('跳转链接须以 /、http:// 或 https:// 开头')
    return
  }
  bannerSaving.value = true
  try {
    const payload = { title, image, link, sort: bannerForm.sort, status: bannerForm.status }
    if (bannerForm.id) await request.put(`/content/banners/${bannerForm.id}`, payload)
    else await request.post('/content/banners', payload)
    ElMessage.success('保存成功')
    bannerVisible.value = false
    await loadBanners()
  } catch (e) { ElMessage.error(errorMessage(e, '保存失败')) } finally { bannerSaving.value = false }
}
async function toggleBannerStatus(row: ContentRow) {
  const nextStatus = row.status === 1 ? 0 : 1
  const action = nextStatus === 1 ? '启用' : '禁用'
  const confirmed = await ElMessageBox.confirm(
    `确定${action} Banner「${row.title}」吗？`, `${action} Banner`, { type: 'warning' }
  ).then(() => true).catch(() => false)
  if (!confirmed) return
  bannerActionKey.value = `status-${row.id}`
  try {
    await request.put(`/content/banners/${row.id}`, { status: nextStatus })
    ElMessage.success(`${action}成功`)
    await loadBanners()
  } catch (e) { ElMessage.error(errorMessage(e, `${action}失败`)) } finally { bannerActionKey.value = '' }
}
async function deleteBanner(row: ContentRow) {
  const confirmed = await ElMessageBox.confirm(`确定删除 Banner「${row.title}」吗？`, '提示', { type: 'warning' }).then(() => true).catch(() => false)
  if (!confirmed) return
  bannerActionKey.value = `delete-${row.id}`
  try {
    await request.delete(`/content/banners/${row.id}`)
    ElMessage.success('删除成功')
    await loadBanners()
  } catch (e) { ElMessage.error(errorMessage(e, '删除失败')) } finally { bannerActionKey.value = '' }
}

// ==================== 公告 ====================
const announcements = ref<ContentRow[]>([])
const annLoading = ref(false)
const annFilter = reactive<{ status: number | undefined; keyword: string }>({ status: undefined, keyword: '' })
const annSaving = ref(false)
const annActionKey = ref('')
const annVisible = ref(false)
const annForm = reactive<{
  id: string | number | null
  title: string
  content: string
  publishedAt: string | null
  expiredAt: string | null
  status: number
}>({ id: null, title: '', content: '', publishedAt: null, expiredAt: null, status: 1 })

async function loadAnnouncements() {
  annLoading.value = true
  try {
    const params: { status?: number; keyword?: string } = {}
    if (annFilter.status !== undefined) params.status = annFilter.status
    const keyword = annFilter.keyword.trim()
    if (keyword) params.keyword = keyword
    const res = await request.get('/content/announcements', { params })
    announcements.value = listFromResponse(res)
    loadedTabs.add('announcements')
  } catch { /* ignore */ } finally { annLoading.value = false }
}
function resetAnnouncementFilter() {
  annFilter.status = undefined
  annFilter.keyword = ''
  loadAnnouncements()
}
function isAnnouncementExpired(row: ContentRow) {
  if (!row.expiredAt) return false
  const expiredAt = dayjs(row.expiredAt)
  return expiredAt.isValid() && !expiredAt.isAfter(dayjs())
}
function announcementStatus(row: ContentRow): { label: string; type: 'success' | 'info' | 'danger' } {
  if (row.status !== 1) return { label: '禁用', type: 'info' }
  if (isAnnouncementExpired(row)) return { label: '已过期', type: 'danger' }
  return { label: '启用', type: 'success' }
}
function openAnnDialog(row?: ContentRow) {
  if (row) Object.assign(annForm, {
    id: row.id, title: row.title || '', content: row.content || '',
    publishedAt: normalizeDateTime(row.publishedAt), expiredAt: normalizeDateTime(row.expiredAt),
    status: row.status ?? 1
  })
  else Object.assign(annForm, { id: null, title: '', content: '', publishedAt: null, expiredAt: null, status: 1 })
  annVisible.value = true
}
async function saveAnnouncement() {
  const title = annForm.title.trim()
  const content = annForm.content.trim()
  const publishedAt = annForm.status === 1 ? (annForm.publishedAt || dayjs().format('YYYY-MM-DDTHH:mm:ss')) : annForm.publishedAt
  if (!title) { ElMessage.warning('请输入公告标题'); return }
  if (!content) { ElMessage.warning('请输入公告内容'); return }
  if (annForm.status === 1 && publishedAt && dayjs(publishedAt).isAfter(dayjs())) {
    ElMessage.warning('启用公告的发布时间不能晚于当前时间，否则小程序会提前展示')
    return
  }
  if (publishedAt && annForm.expiredAt && annForm.expiredAt <= publishedAt) {
    ElMessage.warning('下线时间必须晚于发布时间')
    return
  }
  annSaving.value = true
  try {
    const payload = { ...annForm, title, content, publishedAt }
    if (annForm.id) await request.put(`/content/announcements/${annForm.id}`, payload)
    else await request.post('/content/announcements', payload)
    ElMessage.success('保存成功')
    annVisible.value = false
    await loadAnnouncements()
  } catch (e) { ElMessage.error(errorMessage(e, '保存失败')) } finally { annSaving.value = false }
}
async function toggleAnnStatus(row: ContentRow, newStatus: number) {
  const action = newStatus === 1 ? '发布' : '下架'
  if (newStatus === 1 && isAnnouncementExpired(row)) {
    ElMessage.warning('该公告的下线时间已过，请先修改下线时间')
    return
  }
  const confirmed = await ElMessageBox.confirm(`确定${action}公告「${row.title}」吗？`, '提示', { type: 'warning' }).then(() => true).catch(() => false)
  if (!confirmed) return
  annActionKey.value = `status-${row.id}`
  try {
    const payload = newStatus === 1
      ? { status: newStatus, publishedAt: dayjs().format('YYYY-MM-DDTHH:mm:ss') }
      : { status: newStatus }
    await request.put(`/content/announcements/${row.id}`, payload)
    ElMessage.success(`${action}成功`)
    await loadAnnouncements()
  } catch (e) { ElMessage.error(errorMessage(e, `${action}失败`)) } finally { annActionKey.value = '' }
}

async function deleteAnnouncement(row: ContentRow) {
  const confirmed = await ElMessageBox.confirm(`确定删除公告「${row.title}」吗？`, '提示', { type: 'warning' }).then(() => true).catch(() => false)
  if (!confirmed) return
  annActionKey.value = `delete-${row.id}`
  try {
    await request.delete(`/content/announcements/${row.id}`)
    ElMessage.success('删除成功')
    await loadAnnouncements()
  } catch (e) { ElMessage.error(errorMessage(e, '删除失败')) } finally { annActionKey.value = '' }
}

// ==================== 业务介绍 ====================
const intros = ref<ContentRow[]>([])
const introLoading = ref(false)
const introSaving = ref(false)
const introActionKey = ref('')
const introVisible = ref(false)
type IntroType = 'all' | 'company' | 'personal' | 'electronic'
const introForm = reactive<{
  id: string | number | null
  title: string
  subtitle: string
  image: string
  type: IntroType
  sort: number
  status: number
}>({ id: null, title: '', subtitle: '', image: '', type: 'all', sort: 0, status: 1 })

function normalizeIntroType(value: unknown): IntroType {
  return value === 'company' || value === 'personal' || value === 'electronic' ? value : 'all'
}
function introTypeLabel(value: unknown) {
  const labels: Record<IntroType, string> = {
    all: '全部业务', company: '企业刻章', personal: '个人印章', electronic: '电子印章'
  }
  return labels[normalizeIntroType(value)]
}

async function loadIntros() {
  introLoading.value = true
  try {
    const res = await request.get('/content/intros')
    intros.value = listFromResponse(res)
    loadedTabs.add('intros')
  } catch { /* ignore */ } finally { introLoading.value = false }
}
function openIntroDialog(row?: ContentRow) {
  if (row) Object.assign(introForm, {
    id: row.id, title: row.title || '', subtitle: row.subtitle || '', image: row.image || '',
    type: normalizeIntroType(row.type), sort: row.sort ?? 0, status: row.status ?? 1
  })
  else Object.assign(introForm, { id: null, title: '', subtitle: '', image: '', type: 'all', sort: 0, status: 1 })
  introVisible.value = true
}
function introUploadSuccess(res: UploadResponse) {
  const imageUrl = uploadUrlFromResponse(res)
  if (imageUrl) introForm.image = imageUrl
  else ElMessage.error('上传失败')
}
async function saveIntro() {
  const title = introForm.title.trim()
  const subtitle = introForm.subtitle.trim()
  const image = introForm.image.trim()
  if (!title) { ElMessage.warning('请输入业务介绍标题'); return }
  if (!image) { ElMessage.warning('请上传宣传图片'); return }
  introSaving.value = true
  try {
    const payload = { title, subtitle, image, type: introForm.type, sort: introForm.sort, status: introForm.status }
    if (introForm.id) await request.put(`/content/intros/${introForm.id}`, payload)
    else await request.post('/content/intros', payload)
    ElMessage.success('保存成功')
    introVisible.value = false
    await loadIntros()
  } catch (e) { ElMessage.error(errorMessage(e, '保存失败')) } finally { introSaving.value = false }
}
async function toggleIntroStatus(row: ContentRow) {
  const nextStatus = row.status === 1 ? 0 : 1
  const action = nextStatus === 1 ? '启用' : '禁用'
  const confirmed = await ElMessageBox.confirm(`确定${action}业务介绍「${row.title}」吗？`, `${action}业务介绍`, { type: 'warning' }).then(() => true).catch(() => false)
  if (!confirmed) return
  introActionKey.value = `status-${row.id}`
  try {
    await request.put(`/content/intros/${row.id}`, { status: nextStatus })
    ElMessage.success(`${action}成功`)
    await loadIntros()
  } catch (e) { ElMessage.error(errorMessage(e, `${action}失败`)) } finally { introActionKey.value = '' }
}
async function deleteIntro(row: ContentRow) {
  const confirmed = await ElMessageBox.confirm(`确定删除「${row.title}」吗？`, '提示', { type: 'warning' }).then(() => true).catch(() => false)
  if (!confirmed) return
  introActionKey.value = `delete-${row.id}`
  try {
    await request.delete(`/content/intros/${row.id}`)
    ElMessage.success('删除成功')
    await loadIntros()
  } catch (e) { ElMessage.error(errorMessage(e, '删除失败')) } finally { introActionKey.value = '' }
}

// ==================== 页面装修 ====================
const decorations = ref<ContentRow[]>([])
const decoLoading = ref(false)
const decoSaving = ref(false)
const decoActionKey = ref('')
const decoVisible = ref(false)
type DecoType = 'seal' | 'seal_application' | 'seal_personal_application' | 'seal_electronic_application' | 'seal_record_query' | 'newspaper' | 'bookkeeping'
const decoForm = reactive<{
  id: string | number | null
  type: DecoType
  title: string
  subtitle: string
  image: string
  sort: number
  status: number
}>({ id: null, type: 'seal', title: '', subtitle: '', image: '', sort: 0, status: 1 })

function normalizeDecoType(value: unknown): DecoType {
  const types: DecoType[] = ['seal', 'seal_application', 'seal_personal_application', 'seal_electronic_application', 'seal_record_query', 'newspaper', 'bookkeeping']
  return types.includes(value as DecoType) ? value as DecoType : 'seal'
}
function decoTypeLabel(value: unknown) {
  const labels: Record<DecoType, string> = {
    seal: '刻章首页',
    seal_application: '企业刻章申请页',
    seal_personal_application: '个人印章申请页',
    seal_electronic_application: '电子印章申请页',
    seal_record_query: '刻章备案查询页',
    newspaper: '登报页',
    bookkeeping: '代理记账页'
  }
  return labels[normalizeDecoType(value)]
}

async function loadDecos() {
  decoLoading.value = true
  try {
    const res = await request.get('/content/page-decorations')
    decorations.value = listFromResponse(res)
    loadedTabs.add('decorations')
  } catch { /* ignore */ } finally { decoLoading.value = false }
}
function openDecoDialog(row?: ContentRow) {
  if (row) Object.assign(decoForm, {
    id: row.id, type: normalizeDecoType(row.type), title: row.title || '', subtitle: row.subtitle || '',
    image: row.image || '', sort: row.sort ?? 0, status: row.status ?? 1
  })
  else Object.assign(decoForm, { id: null, type: 'seal', title: '', subtitle: '', image: '', sort: 0, status: 1 })
  decoVisible.value = true
}
function decoUploadSuccess(res: UploadResponse) {
  const imageUrl = uploadUrlFromResponse(res)
  if (imageUrl) decoForm.image = imageUrl
  else ElMessage.error('上传失败')
}
async function saveDeco() {
  const title = decoForm.title.trim()
  const image = decoForm.image.trim()
  if (!decoForm.type) { ElMessage.warning('请选择适用页面'); return }
  if (!title) { ElMessage.warning('请输入主标题'); return }
  decoSaving.value = true
  try {
    const payload = { type: decoForm.type, title, subtitle: decoForm.subtitle.trim(), image, sort: decoForm.sort, status: decoForm.status }
    if (decoForm.id) await request.put(`/content/page-decorations/${decoForm.id}`, payload)
    else await request.post('/content/page-decorations', payload)
    ElMessage.success('保存成功')
    decoVisible.value = false
    await loadDecos()
  } catch (e) {
    const msg = errorMessage(e, '保存失败')
    // 后端同 type 启用互斥：给出可操作的提示
    ElMessage.error(msg.includes('启用中') ? `${msg}；可先编辑现有记录或将其禁用后再保存` : msg)
  } finally { decoSaving.value = false }
}
async function toggleDecoStatus(row: ContentRow) {
  const nextStatus = row.status === 1 ? 0 : 1
  const action = nextStatus === 1 ? '启用' : '禁用'
  const confirmed = await ElMessageBox.confirm(`确定${action}「${row.title}」吗？`, `${action}页面装修`, { type: 'warning' }).then(() => true).catch(() => false)
  if (!confirmed) return
  decoActionKey.value = `status-${row.id}`
  try {
    await request.put(`/content/page-decorations/${row.id}`, { status: nextStatus })
    ElMessage.success(`${action}成功`)
    await loadDecos()
  } catch (e) { ElMessage.error(errorMessage(e, `${action}失败`)) } finally { decoActionKey.value = '' }
}
async function deleteDeco(row: ContentRow) {
  const confirmed = await ElMessageBox.confirm(`确定删除「${row.title}」吗？`, '提示', { type: 'warning' }).then(() => true).catch(() => false)
  if (!confirmed) return
  decoActionKey.value = `delete-${row.id}`
  try {
    await request.delete(`/content/page-decorations/${row.id}`)
    ElMessage.success('删除成功')
    await loadDecos()
  } catch (e) { ElMessage.error(errorMessage(e, '删除失败')) } finally { decoActionKey.value = '' }
}

// ==================== 关于我们 ====================
type AboutForm = {
  appName: string
  phone: string
  wechat: string
  serviceTime: string
  intro: string
  address: string
  copyright: string
  image: string
  logoUrl: string
  version: string
  companyName: string
  termsContent: string
  privacyContent: string
  materialCommitment: string
}

const aboutDefaults: AboutForm = {
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
}
const aboutForm = reactive<AboutForm>({ ...aboutDefaults })
const aboutLoading = ref(false)
const aboutSaving = ref(false)
const termsSaving = ref(false)
const privacySaving = ref(false)
const materialSaving = ref(false)

function aboutUploadSuccess(res: UploadResponse) {
  const imageUrl = uploadUrlFromResponse(res)
  if (imageUrl) aboutForm.image = imageUrl
  else ElMessage.error('上传失败')
}
function logoUploadSuccess(res: UploadResponse) {
  const imageUrl = uploadUrlFromResponse(res)
  if (imageUrl) aboutForm.logoUrl = imageUrl
  else ElMessage.error('上传失败')
}

async function loadAbout(tabName = 'about') {
  aboutLoading.value = true
  try {
    const res = await request.get('/content/about') as unknown as Partial<AboutForm>
    if (res && typeof res === 'object') {
      for (const key of Object.keys(aboutDefaults) as Array<keyof AboutForm>) {
        const value = res[key]
        aboutForm[key] = typeof value === 'string' ? value : ''
      }
    }
    loadedTabs.add(tabName)
  } catch { /* request interceptor displays the error */ } finally { aboutLoading.value = false }
}
// 富文本白名单净化（防存储型 XSS）：保留常用排版/媒体标签，
// 剥离 script/iframe 等危险标签、全部 on* 事件属性与 javascript: 协议。
const RICH_TEXT_ALLOWED_TAGS = new Set([
  'P', 'BR', 'DIV', 'SPAN', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'A',
  'IMG', 'VIDEO', 'AUDIO', 'SOURCE', 'UL', 'OL', 'LI', 'TABLE', 'THEAD', 'TBODY', 'TFOOT',
  'TR', 'TH', 'TD', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'PRE', 'CODE', 'FIGURE', 'FIGCAPTION',
])
const RICH_TEXT_FORBIDDEN_TAGS = new Set(['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'LINK', 'META', 'BASE', 'STYLE'])
const RICH_TEXT_SAFE_URL = /^(https?:|mailto:|tel:|\/|#)/i

function sanitizeRichText(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const walk = (node: Element) => {
      for (const el of Array.from(node.children)) {
        const tag = el.tagName.toUpperCase()
        if (RICH_TEXT_FORBIDDEN_TAGS.has(tag)) { el.remove(); continue }
        if (!RICH_TEXT_ALLOWED_TAGS.has(tag)) { el.replaceWith(...Array.from(el.childNodes)); continue }
        if (tag === 'A') {
          const href = el.getAttribute('href') || ''
          if (!RICH_TEXT_SAFE_URL.test(href) || /javascript:/i.test(href)) el.removeAttribute('href')
          el.removeAttribute('target')
        }
        if (tag === 'IMG') {
          const src = el.getAttribute('src') || ''
          if (!RICH_TEXT_SAFE_URL.test(src) || /^data:/i.test(src)) { el.remove(); continue }
        }
        if ((tag === 'VIDEO' || tag === 'AUDIO' || tag === 'SOURCE') && el.getAttribute('src')) {
          const src = el.getAttribute('src') || ''
          if (!RICH_TEXT_SAFE_URL.test(src)) { el.remove(); continue }
        }
        // 剥离全部事件属性（onclick/onerror/onload...）
        for (const attr of Array.from(el.attributes)) {
          if (/^on/i.test(attr.name)) el.removeAttribute(attr.name)
        }
        walk(el)
      }
    }
    walk(doc.body)
    return doc.body.innerHTML
  } catch {
    return ''
  }
}

function normalizeRichText(value: string) {
  const html = value.trim()
  if (!html) return ''
  return sanitizeRichText(html)
}
async function saveAbout() {
  if (aboutLoading.value) return
  const payload = {
    appName: aboutForm.appName.trim(),
    phone: aboutForm.phone.trim(),
    wechat: aboutForm.wechat.trim(),
    serviceTime: aboutForm.serviceTime.trim(),
    intro: aboutForm.intro.trim(),
    address: aboutForm.address.trim(),
    copyright: aboutForm.copyright.trim(),
    image: aboutForm.image.trim(),
    logoUrl: aboutForm.logoUrl.trim(),
    version: aboutForm.version.trim(),
    companyName: aboutForm.companyName.trim()
  }
  if (payload.phone && !/^[0-9+()\-\s]{5,30}$/.test(payload.phone)) {
    ElMessage.warning('请输入有效的客服电话')
    return
  }
  aboutSaving.value = true
  try {
    await request.put('/content/about', payload)
    // 保存后以服务端回读结果为准，避免只更新本地表单却误以为已经写入。
    await loadAbout()
    ElMessage.success('保存成功，小程序重新进入“关于我们”后即可看到')
  } catch (e) { ElMessage.error(errorMessage(e, '保存失败')) } finally { aboutSaving.value = false }
}

async function saveTerms() {
  if (termsSaving.value || aboutLoading.value) return
  termsSaving.value = true
  try {
    await request.put('/content/about', {
      termsContent: normalizeRichText(aboutForm.termsContent)
    })
    await loadAbout('terms')
    ElMessage.success('用户服务协议已保存')
  } catch (e) { ElMessage.error(errorMessage(e, '协议保存失败')) } finally { termsSaving.value = false }
}

async function savePrivacy() {
  if (privacySaving.value || aboutLoading.value) return
  privacySaving.value = true
  try {
    await request.put('/content/about', {
      privacyContent: normalizeRichText(aboutForm.privacyContent)
    })
    await loadAbout('privacy')
    ElMessage.success('隐私政策已保存')
  } catch (e) { ElMessage.error(errorMessage(e, '隐私政策保存失败')) } finally { privacySaving.value = false }
}

async function saveMaterialCommitment() {
  if (materialSaving.value || aboutLoading.value) return
  materialSaving.value = true
  try {
    await request.put('/content/material-commitment', {
      content: normalizeRichText(aboutForm.materialCommitment)
    })
    await loadAbout('material-commitment')
    ElMessage.success('材料真实性承诺书已保存')
  } catch (e) { ElMessage.error(errorMessage(e, '承诺书保存失败')) } finally { materialSaving.value = false }
}

// 首次切到某 tab 时才加载（减少无意义请求）
function onTabChange(name: string | number) {
  const tabName = String(name)
  if (loadedTabs.has(tabName)) return
  if (tabName === 'banners') loadBanners()
  else if (tabName === 'announcements') loadAnnouncements()
  else if (tabName === 'intros') loadIntros()
  else if (tabName === 'about') loadAbout()
  else if (tabName === 'terms') loadAbout('terms')
  else if (tabName === 'privacy') loadAbout('privacy')
  else if (tabName === 'material-commitment') loadAbout('material-commitment')
  else if (tabName === 'decorations') loadDecos()
}

onMounted(loadBanners)
</script>

<style scoped>
.content-tabs { background: #fff; border-radius: 12px; padding: 8px 16px 16px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.page-header { display: flex; justify-content: space-between; align-items: center; margin: 24px 0 16px; }
.page-header h2 { margin: 0; font-size: 22px; font-weight: 600; }
.page-card { background: #fff; border-radius: 12px; padding: 20px; }
.form-tip { color: #909399; font-size: 12px; line-height: 18px; margin-top: 4px; }
</style>
